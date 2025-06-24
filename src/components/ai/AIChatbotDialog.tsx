
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Removed AvatarImage as it's not used
import { Bot, User, Send, Loader2, AlertCircle } from 'lucide-react'; // Added AlertCircle for error messages
import { aiChatbot, type AIChatbotInput, type AIChatbotOutput } from '@/ai/flows/ai-chatbot';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isError?: boolean;
}

interface AIChatbotDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const AIChatbotDialog: React.FC<AIChatbotDialogProps> = ({ isOpen, onOpenChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setMessages([
        { id: 'greeting', text: "Hello! I'm ZilaCart Support Bot. How can I assist you today regarding products or orders?", sender: 'bot', timestamp: new Date() }
      ]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setMessages([]); 
      setInputValue('');
    }
  }, [isOpen]);
  

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const chatbotInput: AIChatbotInput = { question: currentInput }; // Use currentInput
      const response: AIChatbotOutput = await aiChatbot(chatbotInput);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('AI Chatbot error:', error);
      const errorMessageText = error instanceof Error ? error.message : "An unexpected error occurred.";
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${errorMessageText}. Please try again later.`,
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: 'Chatbot Error',
        description: 'Could not connect to the AI assistant.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };
  
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] md:max-w-[550px] lg:max-w-[600px] h-[70vh] flex flex-col p-0 gap-0 bg-card border-primary shadow-2xl glow-edge-primary">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center text-xl font-headline text-glow-primary">
            <Bot className="mr-2 h-6 w-6 text-primary" /> ZilaCart AI Support
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ask about products, orders, or anything ZilaCart!
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea ref={scrollAreaRef} className="flex-grow p-4 bg-background/50">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end space-x-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'bot' && (
                  <Avatar className="h-8 w-8 self-start">
                    <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={18}/></AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] p-3 rounded-lg shadow-md ${
                    msg.isError 
                      ? 'bg-destructive/20 text-destructive-foreground border border-destructive' 
                      : msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                        : 'bg-muted text-muted-foreground rounded-bl-none'
                  }`}>
                  {msg.isError && <AlertCircle className="inline-block h-4 w-4 mr-1 mb-0.5 text-destructive-foreground" />}
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/70'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.sender === 'user' && (
                  <Avatar className="h-8 w-8 self-start">
                     <AvatarFallback className="bg-accent text-accent-foreground"><User size={18}/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end space-x-2">
                <Avatar className="h-8 w-8 self-start">
                   <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={18}/></AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] p-3 rounded-lg bg-muted text-muted-foreground rounded-bl-none shadow-md">
                  {/* Typing indicator */}
                  <div className="flex space-x-1 items-center">
                    <span className="text-sm">ZilaBot is typing</span>
                    <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border bg-card">
          <div className="flex w-full items-center space-x-2">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow bg-input border-primary focus:ring-accent"
              disabled={isLoading}
              aria-label="Chat message input"
            />
            <Button onClick={handleSendMessage} disabled={isLoading || inputValue.trim() === ''} className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIChatbotDialog;
