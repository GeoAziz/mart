'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/context/AuthContext'
import { Message, Conversation } from '@/lib/types'
import { Send, Search } from 'lucide-react'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function MessagingCenter() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { currentUser } = useAuth()

  useEffect(() => {
    if (!currentUser) return
    
    // Fetch conversations
    const fetchConversations = async () => {
      const token = await currentUser.getIdToken()
      const response = await fetch('/api/messaging/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      setConversations(data.conversations)
    }

    fetchConversations()
  }, [currentUser])

  useEffect(() => {
    if (!selectedConversation || !currentUser) return

    // Fetch messages for selected conversation
    const fetchMessages = async () => {
      const token = await currentUser.getIdToken()
      const response = await fetch(`/api/messaging/conversations/${selectedConversation.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      setMessages(data.messages)
    }

    fetchMessages()

    // Set up real-time updates
    const unsubscribe = listenToMessages(selectedConversation.id!, (newMessages) => {
      setMessages(newMessages)
    })

    return () => unsubscribe()
  }, [selectedConversation, currentUser])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !currentUser) return

    try {
      const token = await currentUser.getIdToken()
      const response = await fetch(`/api/messaging/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: newMessage })
      })

      if (!response.ok) throw new Error('Failed to send message')
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const filteredConversations = conversations.filter(conv => 
    conv.participants.some(id => 
      Object.values(conv.participantNames)
        .some(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  )

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Conversations List */}
      <Card className="w-1/3">
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {filteredConversations.map((conv) => {
                const otherParticipant = conv.participants.find(id => id !== currentUser?.uid)
                const otherParticipantName = otherParticipant ? conv.participantNames[otherParticipant] : 'Unknown'
                const otherParticipantAvatar = otherParticipant ? conv.participantAvatars[otherParticipant] : ''

                return (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted ${
                      selectedConversation?.id === conv.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <Avatar>
                      <AvatarImage src={otherParticipantAvatar} />
                      <AvatarFallback>
                        {otherParticipantName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-medium truncate">{otherParticipantName}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(
                            conv.lastMessage.timestamp instanceof Date
                              ? conv.lastMessage.timestamp
                              : conv.lastMessage.timestamp.toDate(),
                            'HH:mm'
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage.text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1">
        <CardContent className="p-4 h-full flex flex-col">
          {selectedConversation ? (
            <>
              <div className="mb-4 pb-4 border-b">
                <h3 className="font-semibold">
                  {selectedConversation.relatedTo.type === 'order' 
                    ? `Order: ${selectedConversation.relatedTo.text}`
                    : selectedConversation.relatedTo.text}
                </h3>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwnMessage = msg.senderId === currentUser?.uid
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwnMessage 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {format(
                              msg.timestamp instanceof Date
                                ? msg.timestamp
                                : (typeof msg.timestamp === 'object' && msg.timestamp !== null && typeof (msg.timestamp as any).toDate === 'function'
                                    ? (msg.timestamp as any).toDate()
                                    : msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp?.toDate()),
                              'HH:mm'
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button type="submit">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function listenToMessages(conversationId: string, callback: (messages: Message[]) => void) {
  // Here you would implement real-time updates using Firebase or WebSocket
  // For now, we'll just do polling every 5 seconds
  const interval = setInterval(async () => {
    const response = await fetch(`/api/messaging/conversations/${conversationId}/messages`)
    const data = await response.json()
    callback(data.messages)
  }, 5000)

  return () => clearInterval(interval)
}
