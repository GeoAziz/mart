
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface HeroSlide {
  title: string;
  description: string;
  imageUrl: string;
  dataAiHint?: string;
  buttonText: string;
  link: string;
}

const HeroCarousel = () => {
  const addToRefs = useScrollReveal();
  const [promos, setPromos] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchCmsData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/cms/homepage');
        if (!response.ok) throw new Error("Failed to fetch homepage content");
        const data = await response.json();
        // Fallback to a default promo if CMS is empty
        if (!data.heroSlides || data.heroSlides.length === 0) {
           setPromos([
             { title: "Welcome to ZilaCart", description: "Your adventure in futuristic shopping begins here.", imageUrl: "https://placehold.co/1200x600/2A0B3D/E0E0E0?text=ZilaCart+Welcome", dataAiHint: "welcome banner", buttonText: "Shop Now", link: "/products" },
           ]);
        } else {
           setPromos(data.heroSlides);
        }
      } catch (error) {
        console.error("Error fetching hero slides:", error);
        setPromos([]); // Set to empty on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchCmsData();
  }, []);

  const nextSlide = useCallback(() => {
    if (promos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % promos.length);
  }, [promos.length]);

  const prevSlide = () => {
    if (promos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + promos.length) % promos.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (promos.length > 1) {
      const intervalId = setInterval(nextSlide, 5000); // Auto-play every 5 seconds
      return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }
  }, [nextSlide, promos.length]);

  if (isLoading) {
    return (
        <section className="mb-12 md:mb-16 relative">
            <Skeleton className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-lg" />
        </section>
    )
  }

  if (promos.length === 0) {
    return null; // Don't render if no promos and not loading
  }

  const currentPromo = promos[currentIndex];

  return (
    <section ref={addToRefs} className="scroll-reveal mb-12 md:mb-16 relative">
      <Card className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-lg shadow-2xl glow-edge-primary">
        {promos.map((promo, index) => (
          <div
            key={promo.title + index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            {promo.imageUrl && (
              <Image
                src={promo.imageUrl}
                alt={promo.title}
                fill
                style={{objectFit: 'cover'}}
                className={`transition-transform duration-5000 ease-linear ${index === currentIndex ? 'scale-105' : 'scale-100'}`}
                data-ai-hint={promo.dataAiHint || 'hero image'}
                priority={index === 0} // Only priority load the first image
              />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent z-20"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-30">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline mb-4 text-glow-primary animate-pulse">
            {currentPromo.title}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-foreground/90 mb-8 max-w-2xl">
            {currentPromo.description}
          </p>
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-lg px-8 py-3 glow-edge-primary animate-pulse-glow" asChild>
            <a href={currentPromo.link}>{currentPromo.buttonText}</a>
          </Button>
        </div>
      </Card>

      {promos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 bg-background/50 hover:bg-primary hover:text-primary-foreground rounded-full"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 bg-background/50 hover:bg-primary hover:text-primary-foreground rounded-full"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex space-x-2">
            {promos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`w-3 h-3 rounded-full ${index === currentIndex ? 'bg-primary scale-125' : 'bg-muted hover:bg-primary/50'} transition-all duration-300`}
              ></button>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroCarousel;
