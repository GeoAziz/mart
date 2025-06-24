
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Send, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function NewMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [context, setContext] = useState<{ type: 'order' | 'product' | 'general'; id: string; text: string; } | null>(null);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const recipient = searchParams.get('recipientId');
    const recipientNameParam = searchParams.get('recipientName');
    const contextType = searchParams.get('contextType') as 'order' | 'product' | 'general' | null;
    const contextId = searchParams.get('contextId');
    const contextName = searchParams.get('contextName');

    if (!recipient || !contextType || !contextId || !contextName) {
      setError("Missing required information to start a conversation.");
      return;
    }

    setRecipientId(recipient);
    setRecipientName(recipientNameParam);
    setContext({ type: contextType, id: contextId, text: contextName });
  }, [searchParams]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser || !recipientId || !context) {
        toast({title: "Error", description: "Message cannot be empty and all context is required.", variant: "destructive"});
        return;
    }
    setIsSending(true);
    
    try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/messaging/conversations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipientId,
                text: messageText.trim(),
                context,
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send message.');
        }
        
        toast({title: "Message Sent!", description: "Your conversation has been started."});
        router.push(`/messaging/${data.conversationId}`);

    } catch (err) {
        toast({title: "Error Sending Message", description: err instanceof Error ? err.message : "An unknown error occurred.", variant: "destructive"});
        setIsSending(false);
    }
  };
  
  if (error) {
     return (
        <Card className="max-w-2xl mx-auto bg-card border-destructive shadow-lg">
            <CardHeader className="text-center">
                 <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4"/>
                <CardTitle className="text-2xl font-headline text-destructive">Could Not Start Conversation</CardTitle>
                <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button variant="outline" asChild className="w-full">
                    <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/> Go Home</Link>
                </Button>
            </CardFooter>
        </Card>
     );
  }

  return (
    <Card className="max-w-2xl mx-auto bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-glow-primary">New Message</CardTitle>
        <CardDescription className="text-muted-foreground">
          Your message to <span className="font-semibold text-primary">{recipientName || 'User'}</span> regarding <span className="font-semibold text-primary">{context?.text || 'an item'}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            <Label htmlFor="message-text">Your Message</Label>
            <Textarea 
                id="message-text"
                placeholder="Type your inquiry here..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                className="bg-input border-primary focus:ring-accent"
                disabled={isSending}
            />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
         <Button variant="ghost" asChild><Link href={context?.type === 'order' ? `/account/orders/${context?.id}` : `/products/${context?.id}`}>Cancel</Link></Button>
         <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
            {isSending ? 'Sending...' : 'Send Message'}
         </Button>
      </CardFooter>
    </Card>
  );
}

