
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare, Send, Filter, ThumbsUp, ThumbsDown, Loader2, Inbox } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Review as ReviewType } from '@/app/api/vendors/me/reviews/route'; // Import type

const calculateAverageRating = (reviews: ReviewType[]) => {
  if (reviews.length === 0) return 0;
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return parseFloat((totalRating / reviews.length).toFixed(1));
};

export default function VendorReviewsPage() {
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchReviews = useCallback(async () => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendors/me/reviews', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch reviews');
      }
      const data: ReviewType[] = await response.json();
      // Ensure dates are Date objects
      setReviews(data.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt),
        repliedAt: r.repliedAt ? new Date(r.repliedAt) : undefined,
      })));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not load reviews.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const averageRating = calculateAverageRating(reviews);

  const handleReplyToggle = (reviewId: string) => {
    setReplyingTo(replyingTo === reviewId ? null : reviewId);
    setReplyText(reviews.find(r => r.id === reviewId)?.reply || '');
  };

  const handlePostReply = async (reviewId: string) => {
    if (!currentUser || !replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/reviews/${reviewId}`, { // Use PUT for update
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post reply');
      }
      
      const updatedReview: ReviewType = await response.json();
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId ? { ...updatedReview, createdAt: new Date(updatedReview.createdAt), repliedAt: updatedReview.repliedAt ? new Date(updatedReview.repliedAt) : undefined } : review
        )
      );
      toast({ title: 'Reply Posted', description: 'Your reply has been successfully posted.' });
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error(`Error posting reply to review ${reviewId}:`, error);
      toast({ title: 'Reply Error', description: error instanceof Error ? error.message : 'Could not post reply.', variant: 'destructive' });
    } finally {
      setIsSubmittingReply(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
              <Star className="mr-3 h-6 w-6 text-primary" /> Customer Reviews
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage feedback and engage with your customers.
            </CardDescription>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Filter className="mr-2 h-4 w-4" /> Filter Reviews
          </Button>
        </CardHeader>
        <CardContent>
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-glow-accent">Overall Rating</h3>
                <div className="flex items-center mt-1">
                    <Star className="h-7 w-7 text-yellow-400 fill-yellow-400 mr-2" />
                    <span className="text-3xl font-bold text-foreground">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground ml-1.5">/ 5 ({reviews.length} reviews)</span>
                </div>
            </div>

          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <Card key={review.id} className="bg-card border-border/70 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border-2 border-primary/50">
                                <AvatarImage src={review.customerAvatar || `https://placehold.co/40x40/FFFFFF/000000?text=${review.customerInitials || 'U'}`} alt={review.customerName || 'User'} data-ai-hint="user avatar" />
                                <AvatarFallback>{review.customerInitials || (review.customerName ? review.customerName.substring(0,2).toUpperCase() : 'U')}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-md font-semibold text-foreground">{review.customerName || 'Anonymous User'}</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                Reviewed <Link href={`/products/${review.productId}`} className="text-primary hover:underline" target="_blank">{review.productName}</Link> on {new Date(review.createdAt).toLocaleDateString()}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                            ))}
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-foreground/90 leading-relaxed">{review.comment}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start gap-3 pt-3 border-t border-border/50">
                    {review.reply && (
                      <div className="w-full p-3 bg-muted/70 rounded-md border border-primary/30">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold text-primary">Your Reply:</p>
                          {review.repliedAt && <p className="text-xs text-muted-foreground/70">Replied on: {new Date(review.repliedAt).toLocaleDateString()}</p>}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{review.reply}</p>
                      </div>
                    )}
                    {replyingTo !== review.id && (
                      <Button variant="outline" size="sm" onClick={() => handleReplyToggle(review.id)} className="text-accent border-accent hover:bg-accent hover:text-accent-foreground">
                        <MessageSquare className="mr-2 h-4 w-4" /> {review.reply ? 'Edit Reply' : 'Reply to Review'}
                      </Button>
                    )}
                    {replyingTo === review.id && (
                      <div className="w-full space-y-2">
                        <Label htmlFor={`reply-${review.id}`} className="text-sm font-medium text-glow-accent">
                          {review.reply ? 'Edit Your Reply:' : 'Write a Reply:'}
                        </Label>
                        <Textarea
                          id={`reply-${review.id}`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your response..."
                          className="bg-input border-primary focus:ring-accent"
                          rows={3}
                          disabled={isSubmittingReply}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleReplyToggle(review.id)} disabled={isSubmittingReply}>Cancel</Button>
                          <Button size="sm" onClick={() => handlePostReply(review.id)} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmittingReply || !replyText.trim()}>
                            {isSubmittingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {isSubmittingReply ? 'Submitting...' : (review.reply ? 'Update Reply' : 'Post Reply')}
                          </Button>
                        </div>
                      </div>
                    )}
                     <div className="w-full flex justify-end items-center text-xs text-muted-foreground pt-2">
                        {/* Placeholder for helpful votes - not functional yet */}
                        <span>Was this review helpful?</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 hover:text-green-400"><ThumbsUp size={14}/></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-400"><ThumbsDown size={14}/></Button>
                        <span className="ml-1">(0)</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No reviews yet.</p>
              <p className="text-sm text-muted-foreground">Customer reviews for your products will appear here once submitted.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
