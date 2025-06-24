
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Eye, MoreHorizontal, Filter, BadgeCheck, ShieldX, Hourglass, PackageSearch, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { Product, ProductStatus } from '@/lib/types';

const getStatusBadgeVariant = (status?: ProductStatus) => {
  if (!status) return 'bg-muted/50 text-muted-foreground border-border';
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved': // Keep 'approved' for UI display if needed, map to 'active' for API
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'pending_approval':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    case 'rejected':
      return 'bg-red-500/20 text-red-300 border-red-400';
    case 'draft':
      return 'bg-gray-500/20 text-gray-300 border-gray-400'; // Example for draft
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

const getStatusIcon = (status?: ProductStatus) => {
  if (!status) return null;
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
      return <BadgeCheck className="h-4 w-4 text-green-400" />;
    case 'pending_approval':
      return <Hourglass className="h-4 w-4 text-yellow-400 animate-spin" />;
    case 'rejected':
      return <ShieldX className="h-4 w-4 text-red-400" />;
    case 'draft':
       return <Eye className="h-4 w-4 text-gray-400" />; // Example icon for draft
    default:
      return null;
  }
};

export default function ProductModerationPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/products?role=admin', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        const productsArray = Array.isArray(data.products) ? data.products : [];
        setProducts(productsArray.map((p: Product) => ({...p, status: p.status || 'pending_approval'})));
      } catch (error) {
        console.error("Error fetching products for moderation:", error);
        toast({ title: 'Error', description: 'Could not load products for moderation.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [currentUser, toast]);

  const handleProductStatusUpdate = async (productId: string, newStatus: ProductStatus) => {
    if (!currentUser) return;
    setActionLoading(prev => ({...prev, [productId]: true}));
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product status');
      }
      const updatedProduct: Product = await response.json();
      setProducts(prevProducts =>
        prevProducts.map(p => (p.id === productId ? updatedProduct : p))
      );
      toast({ title: 'Product Status Updated', description: `Product ${updatedProduct.name} is now ${newStatus}.` });
    } catch (error) {
      console.error(`Error updating product ${productId} status:`, error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not update product status.', variant: 'destructive' });
    } finally {
      setActionLoading(prev => ({...prev, [productId]: false}));
    }
  };

  if (isLoading && !products.length) { // Show full page loader only if no products loaded yet
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading products for moderation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary">Product Moderation</CardTitle>
            <CardDescription className="text-muted-foreground">Review and manage vendor product submissions.</CardDescription>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Filter className="mr-2 h-4 w-4" /> Filter Products
          </Button>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Seller/Vendor ID</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/50">
                    <TableCell className="hidden sm:table-cell">
                      <Image 
                        src={product.imageUrl || 'https://placehold.co/64x64/cccccc/E0E0E0?text=NoImg'} 
                        alt={product.name} 
                        width={48} height={48} 
                        className="rounded-md object-cover border border-border" 
                        data-ai-hint={product.dataAiHint || product.category?.toLowerCase().split(' ')[0] || "product"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      {product.vendorId ? (
                        <Link href={`/admin/users?userId=${product.vendorId}`} className="hover:text-primary hover:underline text-xs">
                          {product.vendorId.substring(0, 8)}...
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Marketplace</span>
                      )}
                    </TableCell>
                    <TableCell>{product.dateAdded ? new Date(product.dateAdded).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`flex items-center justify-center gap-1.5 ${getStatusBadgeVariant(product.status)}`}>
                        {getStatusIcon(product.status)}
                        {product.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {actionLoading[product.id] ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Product Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-primary shadow-lg">
                          <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                            <Link href={`/products/${product.id}`} target="_blank">
                              <Eye className="mr-2 h-4 w-4" /> View Product Page
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                             <Link href={`/vendor/products/edit/${product.id}`} target="_blank"> {/* Assume admin can edit via vendor flow or dedicated admin edit */}
                              <CheckCircle className="mr-2 h-4 w-4" /> Edit Product
                            </Link>
                          </DropdownMenuItem>
                          {(product.status === 'pending_approval' || product.status === 'rejected' || product.status === 'draft') && (
                            <DropdownMenuItem onClick={() => handleProductStatusUpdate(product.id, 'active')} className="text-green-400 hover:bg-green-500/10 hover:!text-green-300 focus:bg-green-500/20 focus:!text-green-300 cursor-pointer">
                              <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                          )}
                          {(product.status === 'pending_approval' || product.status === 'active' || product.status === 'draft') && (
                            <DropdownMenuItem onClick={() => handleProductStatusUpdate(product.id, 'rejected')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                              <XCircle className="mr-2 h-4 w-4" /> Reject
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <BadgeCheck className="mx-auto h-16 w-16 text-green-400/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">All products are moderated!</p>
              <p className="text-sm text-muted-foreground">No pending product submissions at this time or no products found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
