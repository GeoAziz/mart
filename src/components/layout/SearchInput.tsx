
'use client';

import { useState } from 'react';
import { Search, X, Mic, Camera } from 'lucide-react'; // Added Mic and Camera
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { imageSearch } from '@/ai/flows/image-search';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';

const SearchInput = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isImageSearching, setIsImageSearching] = useState(false);
  const { toast } = useToast();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value) {
      setSuggestions(
        ['Quantum CPU', 'Neon Jacket', 'Smart Grow Pot', 'Anti-Gravity Boots', 'Holographic Projector']
          .filter(s => s.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 5)
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsImageSearching(true);
      toast({
        title: "Processing Image...",
        description: "Please wait while we analyze your image.",
      });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        try {
          const result = await imageSearch({ photoDataUri: dataUri });
          if (result.products && result.products.length > 0) {
            // In a real app, you'd navigate to a search results page
            // For now, just showing the first product name in a toast
            toast({
              title: "Image Search Successful!",
              description: `Found: ${result.products[0].name}. ${result.products.length > 1 ? `And ${result.products.length -1} more.` : ''}`,
            });
          } else {
            toast({
              title: "Image Search",
              description: "No products found matching the image.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Image search failed:", error);
          toast({
            title: "Image Search Failed",
            description: "Could not process the image. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsImageSearching(false);
        }
      };
      reader.readAsDataURL(file);
       // Reset file input to allow selecting the same file again if removed
      event.target.value = "";
    }
  };

  const handleVoiceSearch = () => {
    // Placeholder for voice search functionality
    toast({
      title: "Voice Search",
      description: "Voice search functionality coming soon!",
    });
  };

  return (
    <TooltipProvider delayDuration={100}>
    <div className="relative w-full max-w-lg"> {/* Increased max-width slightly */}
      <div className="flex items-center bg-card border border-primary rounded-full focus-within:ring-2 focus-within:ring-accent transition-all shadow-sm">
        <div className="relative flex-grow">
          <Input
            type="search"
            placeholder="Search ZilaCart..."
            className="pl-10 pr-4 py-2.5 w-full rounded-l-full bg-transparent border-0 focus:ring-0 text-sm" // Adjusted padding & text size
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label="Search products"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-none text-muted-foreground hover:text-primary" onClick={handleVoiceSearch} aria-label="Search by voice">
              <Mic className="h-5 w-5" />
              <span className="sr-only">Search by voice</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Search by voice (coming soon)</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-border/70"/>

        <Tooltip>
          <TooltipTrigger asChild>
            <label htmlFor="image-search-input" className={`cursor-pointer ${isImageSearching ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="Search by image">
              <Button variant="ghost" size="icon" asChild className="rounded-r-full text-muted-foreground hover:text-primary">
                <div>
                  <Camera className="h-5 w-5" />
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
      {isImageSearching && <p className="text-xs text-primary mt-1 pl-3 animate-pulse">Searching by image...</p>}
      {suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map(suggestion => (
            <li
              key={suggestion}
              className="px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => {
                setSearchTerm(suggestion);
                setSuggestions([]);
                // TODO: Perform search action, e.g., router.push(`/search?q=${suggestion}`);
                toast({title: "Search", description: `Searching for: ${suggestion}`})
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
    </TooltipProvider>
  );
};

export default SearchInput;
