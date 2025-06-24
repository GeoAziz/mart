'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Wand2 } from 'lucide-react';
import { getRelatedProducts, type RelatedProductInput, type RelatedProductOutput } from '@/ai/flows/product-recommendations';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface RelatedProductsAIProps {
  product: RelatedProductInput;
}

const RecommendationCard = ({ name, reason }: { name: string; reason: string }) => {
  return (
    <Card className="bg-card border-border hover:border-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300 ease-in-out">
      <CardHeader>
        <CardTitle className="text-lg font-headline text-glow-accent flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-accent shrink-0 mt-1"/>
            <span>{name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{reason}</CardDescription>
      </CardContent>
    </Card>
  );
};

const RecommendationSkeleton = () => (
    <div className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
    </div>
);

const RelatedProductsAI: React.FC<RelatedProductsAIProps> = ({ product }) => {
  const [recommendations, setRecommendations] = useState<RelatedProductOutput['recommendations']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToRefs = useScrollReveal();

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!product) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await getRelatedProducts(product);
        setRecommendations(result.recommendations || []);
      } catch (err) {
        console.error("Failed to fetch AI recommendations:", err);
        setError("Could not load recommendations at this time.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [product]);
  
  if (error && !isLoading) {
    return (
        <section ref={addToRefs} className="scroll-reveal">
            <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-primary flex items-center justify-center gap-2">
                <Wand2/> AI Recommendations
            </h2>
            <p className="text-center text-destructive">{error}</p>
        </section>
    );
  }

  if (isLoading && recommendations.length === 0) {
      return (
        <section>
            <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-primary flex items-center justify-center gap-2">
                <Wand2/> AI Recommendations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <RecommendationSkeleton />
                <RecommendationSkeleton />
                <RecommendationSkeleton />
            </div>
        </section>
      );
  }

  if (!isLoading && recommendations.length === 0) {
      return null; // Don't show the section if there are no recommendations
  }

  return (
    <section ref={addToRefs} className="scroll-reveal">
        <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-primary flex items-center justify-center gap-2">
            <Wand2 className="text-primary"/> AI Recommendations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => (
            <RecommendationCard key={index} name={rec.name} reason={rec.reason} />
        ))}
        </div>
    </section>
  );
};

export default RelatedProductsAI;
