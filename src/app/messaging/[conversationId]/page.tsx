
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Conversation, Message } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(scrollToBottom, [messages]);

  const fetchConversation = useCallback(async () => {
    if (!currentUser || !conversationId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/messaging/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch conversation.');
      }
      const data = await response.json();
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (err) {
      console.error("Error fetching conversation:", err);
      setError(err instanceof Error ? err.message : "Could not load conversation.");
      if ((err as Error).message.includes('Forbidden')) {
          router.push('/messaging');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, conversationId, router]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !conversation) return;
    setIsSending(true);

    const tempMessageId = `temp-${Date.now()}`;
    const messageToSend: Message = {
      id: tempMessageId,
      conversationId: conversationId,
      senderId: currentUser.uid,
      text: newMessage.trim(),
      timestamp: new Date(),
    };
    // Optimistic UI update
    setMessages(prev => [...prev, messageToSend]);
    setNewMessage('');
    
    try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/messaging/conversations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipientId: conversation.participants.find(p => p !== currentUser.uid),
                text: messageToSend.text,
                context: conversation.relatedTo,
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message.');
        }
        
        // On success, refetch to get the real message from the server
        // This confirms the message and replaces the temporary one.
        await fetchConversation();

    } catch (err) {
        toast({title: "Error Sending", description: "Message failed to send. Please try again.", variant: "destructive"});
        // Revert optimistic update on failure
        setMessages(prev => prev.filter(m => m.id !== tempMessageId));
        setNewMessage(messageToSend.text); // Put text back in input
    } finally {
        setIsSending(false);
    }
  };
  
  const otherParticipantId = conversation?.participants.find(p => p !== currentUser?.uid);
  const otherParticipantName = otherParticipantId ? conversation?.participantNames[otherParticipantId] : 'User';
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (error) {
    return <div className="text-center py-12 text-destructive"><AlertCircle className="mx-auto h-12 w-12 mb-4" /><p className="text-xl font-semibold">{error}</p></div>;
  }


  return (
    <Card className="max-w-4xl mx-auto h-[80vh] flex flex-col bg-card border-border shadow-lg">
      <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/messaging"><ArrowLeft className="h-5 w-5"/></Link>
        </Button>
        <Avatar className="h-10 w-10 border-2 border-primary/50">
            <AvatarImage src={otherParticipantId ? conversation?.participantAvatars[otherParticipantId] : ''} alt={otherParticipantName}/>
            <AvatarFallback>{otherParticipantName?.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <CardTitle className="text-lg font-headline text-glow-primary">{otherParticipantName}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground hover:text-primary">
                <Link href={conversation?.relatedTo.type === 'order' ? `/account/orders/${conversation?.relatedTo.id}` : `/products/${conversation?.relatedTo.id}`} target="_blank">
                    Regarding: {conversation?.relatedTo.text}
                </Link>
            </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow p-4 overflow-y-auto bg-background/50">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === currentUser?.uid ? "justify-end" : "justify-start")}>
              {msg.senderId !== currentUser?.uid && (
                <Avatar className="h-8 w-8 self-start">
                  <AvatarImage src={otherParticipantId ? conversation?.participantAvatars[otherParticipantId] : ''} alt={otherParticipantName}/>
                  <AvatarFallback>{otherParticipantName?.substring(0,1)}</AvatarFallback>
                </Avatar>
              )}
              <div className={cn("max-w-[70%] p-3 rounded-lg shadow-md text-sm",
                msg.senderId === currentUser?.uid 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-muted text-muted-foreground rounded-bl-none"
              )}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className={cn("text-xs mt-1", msg.senderId === currentUser?.uid ? "text-primary-foreground/70 text-right" : "text-muted-foreground/70")}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t border-border">
        <div className="flex w-full items-center gap-2">
            <Textarea 
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                className="bg-input border-primary focus:ring-accent resize-none"
                rows={1}
                disabled={isSending}
            />
            <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()} className="bg-primary hover:bg-primary/90">
                {isSending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
