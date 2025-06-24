'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare } from 'lucide-react';
import AIChatbotDialog from './AIChatbotDialog';

const AIChatbotButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg animate-pulse-glow bg-primary hover:bg-accent focus:ring-accent transition-all duration-300"
        onClick={() => setIsChatOpen(true)}
        aria-label="Open AI Chatbot"
      >
        <Bot className="h-7 w-7 text-primary-foreground" />
      </Button>
      <AIChatbotDialog isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
};

export default AIChatbotButton;
