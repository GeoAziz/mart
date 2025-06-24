
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, Trash2, Filter, MoreHorizontal, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Review as ReviewType } from '@/app/api/vendors/me/reviews/route'; // Using existing Review type

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [reviewToDelete, setReviewToDelete] = useState<ReviewType | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchAllReviews = useCallback(async () => {
    if (!currentUser) {
        setIsLoading(false);
        toast({ title: "Authentication Error", description: "Please log in to manage reviews.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/reviews', { // Fetches all reviews (admin endpoint)
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch reviews');
      }
      const data: ReviewType[] = await response.json();
      setReviews(data.map(r => ({ ...r, createdAt: new Date(r.createdAt) })));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({ title: 'Error Fetching Reviews', description: error instanceof Error ? error.message : 'Could not load reviews.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchAllReviews();
  }, [fetchAllReviews]);

  const handleDeleteReview = async () => {
    if (!reviewToDelete || !currentUser) return;
    setActionLoading(prev => ({ ...prev, [reviewToDelete.id]: true }));
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/reviews/${reviewToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete review');
      }
      toast({ title: 'Review Deleted', description: `Review ID ${reviewToDelete.id.substring(0, 7)}... has been deleted.` });
      setReviews(prevReviews => prevReviews.filter(r => r.id !== reviewToDelete.id));
    } catch (error) {
      console.error(`Error deleting review ${reviewToDelete.id}:`, error);
      toast({ title: 'Error Deleting Review', description: error instanceof Error ? error.message : 'Could not delete the review.', variant: 'destructive' });
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewToDelete.id]: false }));
      setReviewToDelete(null);
    }
  };
  
  const openDeleteDialog = (review: ReviewType) => {
    setReviewToDelete(review);
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading all reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
              <MessageSquare className="mr-3 h-6 w-6 text-primary" /> Review Management
            </CardTitle>
            <CardDescription className="text-muted-foreground">View and moderate all customer reviews on the platform.</CardDescription>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Filter className="mr-2 h-4 w-4" /> Filter Reviews
          </Button>
        </CardHeader>
        <CardContent>
          {reviews.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Review ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center w-[120px]">Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-xs">
                      {review.id.substring(0, 7)}...
                    </TableCell>
                    <TableCell>
                      <Link href={`/products/${review.productId}`} className="hover:text-primary hover:underline text-sm" target="_blank" title="View product">
                        {review.productName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{review.customerName || 'Anonymous'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                        ))}
                         <span className="ml-1.5 text-xs text-muted-foreground">({review.rating})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-xs">{review.comment}</TableCell>
                    <TableCell className="text-xs">{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                     {actionLoading[review.id] ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> : (
                      <AlertDialog open={!!reviewToDelete && reviewToDelete.id === review.id} onOpenChange={(isOpen) => !isOpen && setReviewToDelete(null)}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Review Actions</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-primary shadow-lg">
                                <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                    onClick={() => openDeleteDialog(review)} 
                                    className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Review
                                </DropdownMenuItem>
                                </AlertDialogTrigger>
                                {/* Future actions like "Hide Review" or "Contact Customer" could go here */}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {reviewToDelete && reviewToDelete.id === review.id && (
                            <AlertDialogContent className="bg-card border-destructive shadow-xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-glow-primary">Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the review:
                                <blockquote className="mt-2 p-2 border-l-4 border-destructive bg-destructive/10 rounded-sm text-destructive-foreground/80 text-xs">
                                    "{reviewToDelete.comment.substring(0, 100)}{reviewToDelete.comment.length > 100 ? '...' : ''}"
                                </blockquote>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel asChild><Button variant="ghost" onClick={() => setReviewToDelete(null)}>Cancel</Button></AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteReview} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                Yes, delete review
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        )}
                      </AlertDialog>
                     )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No reviews found.</p>
              <p className="text-sm text-muted-foreground">There are currently no customer reviews on the platform.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
