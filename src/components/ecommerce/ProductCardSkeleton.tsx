
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ProductCardSkeleton = () => {
  return (
    <Card className="overflow-hidden shadow-lg bg-card border-border">
      <CardHeader className="p-0 relative">
        <Skeleton className="h-48 w-full" />
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-6 w-3/4" /> {/* Title */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-1/3" /> {/* Price */}
          <Skeleton className="h-5 w-1/4" /> {/* Rating */}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full" /> {/* Button */}
      </CardFooter>
    </Card>
  );
};

export default ProductCardSkeleton;
