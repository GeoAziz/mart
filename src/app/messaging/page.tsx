
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Inbox, Loader2, AlertCircle, Edit } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Conversation } from '@/lib/types';

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/messaging/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch conversations.');
      }
      const data: Conversation[] = await response.json();
      setConversations(data);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(err instanceof Error ? err.message : "Could not load your inbox.");
      toast({ title: "Error", description: error, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading your inbox...</p>
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
          <Inbox className="mr-3 h-6 w-6 text-primary" /> Your Inbox
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          All your conversations with customers and vendors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
            <div className="text-center py-12 text-destructive">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p className="text-xl font-semibold">Error Loading Inbox</p>
                <p>{error}</p>
            </div>
        )}
        {!isLoading && !error && conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((convo) => {
              const otherParticipantId = convo.participants.find(p => p !== currentUser?.uid);
              const otherParticipantName = otherParticipantId ? convo.participantNames[otherParticipantId] : 'Unknown User';
              const otherParticipantAvatar = otherParticipantId ? convo.participantAvatars[otherParticipantId] : '';
              const isUnread = !convo.readBy.includes(currentUser?.uid || '');

              return (
                <Link href={`/messaging/${convo.id}`} key={convo.id}>
                  <div className={`flex items-center gap-4 p-3 rounded-md transition-colors hover:bg-muted/80 ${isUnread ? 'bg-primary/10 border border-primary/50' : 'bg-muted/50'}`}>
                    <Avatar className="h-12 w-12 border-2 border-primary/50">
                      <AvatarImage src={otherParticipantAvatar} alt={otherParticipantName} />
                      <AvatarFallback>{otherParticipantName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow overflow-hidden">
                      <div className="flex justify-between items-start">
                        <p className={`font-semibold ${isUnread ? 'text-primary' : 'text-foreground'}`}>{otherParticipantName}</p>
                        <p className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(convo.lastMessage.timestamp).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        <span className="font-medium">{convo.lastMessage.senderId === currentUser?.uid ? "You: " : ""}</span>
                        {convo.lastMessage.text}
                      </p>
                      <p className="text-xs text-accent mt-1">{convo.relatedTo.text}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          !isLoading && !error && (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">Your inbox is empty.</p>
              <p className="text-sm text-muted-foreground">Conversations will appear here once you message a seller or a customer contacts you.</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
