'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Mic, Camera, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { trackSearch } from '@/lib/analytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';

interface SearchInputProps {
  onSearchComplete?: () => void;
  className?: string;
}

const SearchInput = ({ onSearchComplete, className = '' }: SearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isImageSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
            setIsOpen(data.suggestions.length > 0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const executeSearch = (query: string) => {
    const target = query.trim();
    if (!target) return;
    setIsOpen(false);
    onSearchComplete?.();
    trackSearch(true, target.length);
    router.push(`/products?search=${encodeURIComponent(target)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(searchTerm);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    toast({
      title: "Image Search Disabled",
      description: "AI Image search features have been temporarily disabled.",
      variant: "destructive",
    });
    event.target.value = "";
  };

  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = () => {
    type SpeechWindow = Window & typeof globalThis & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: (event: { results?: Array<Array<{ transcript?: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: (event: { results?: Array<Array<{ transcript?: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
      };
    };

    const win = typeof window !== 'undefined' ? (window as SpeechWindow) : undefined;
    const SpeechRecognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Voice Search Unavailable",
        description: "Your browser does not support voice input. Try Google Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-KE';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak into your microphone now.",
      });

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setSearchTerm(transcript);
          executeSearch(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Could not capture voice input. Please try typing.",
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
      console.error('Speech recognition error:', e);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div ref={containerRef} className={`relative w-full ${className}`}>
        <div className="flex items-center bg-card border border-primary/40 focus-within:border-primary rounded-full focus-within:ring-2 focus-within:ring-accent transition-all shadow-sm">
          <div className="relative flex-grow">
            <Input
              type="search"
              placeholder="Search products, brands, categories..."
              className="pl-10 pr-4 py-2.5 w-full rounded-l-full bg-transparent border-0 focus-visible:ring-0 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpen(true);
              }}
              aria-label="Search products"
            />
            {isLoadingSuggestions ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin pointer-events-none" />
            ) : (
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={() => executeSearch(searchTerm)}
              />
            )}
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSuggestions([]);
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button"
                variant="ghost" 
                size="icon" 
                className={`rounded-none ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'}`} 
                onClick={handleVoiceSearch} 
                aria-label="Search by voice"
              >
                <Mic className="h-4 w-4" />
                <span className="sr-only">Search by voice</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isListening ? "Listening..." : "Search by voice"}</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 bg-border/70"/>

          <Tooltip>
            <TooltipTrigger asChild>
              <label 
                htmlFor="image-search-input" 
                className={`cursor-pointer ${isImageSearching ? 'opacity-50 cursor-not-allowed' : ''}`} 
                aria-label="Search by image"
              >
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="rounded-r-full text-muted-foreground hover:text-primary"
                >
                  <div>
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Search by image</span>
                  </div>
                </Button>
              </label>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Search by image</p>
            </TooltipContent>
          </Tooltip>
          <input
            id="image-search-input"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageUpload}
            disabled={isImageSearching}
          />
        </div>

        {isOpen && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1.5 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl max-h-60 overflow-auto py-1">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion}
                className="px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center gap-2 transition-colors"
                onMouseDown={() => {
                  setSearchTerm(suggestion);
                  executeSearch(suggestion);
                }}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SearchInput;
