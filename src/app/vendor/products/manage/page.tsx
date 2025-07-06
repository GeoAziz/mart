'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, PackageOpen, PackageSearch, MoreVertical, Edit, Eye, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock?: number;
  price: number;
  status?: string; // Assuming status might come from product data, e.g. 'Active', 'Draft'
  imageUrl?: string;
  dataAiHint?: string;
  category?: string; // Added category for consistency if needed
}

const getStatusBadgeVariant = (status?: string) => {
  if (!status) return 'bg-muted/50 text-muted-foreground border-border';
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'out of stock': // This could be derived from stock level too
      return 'bg-red-500/20 text-red-300 border-red-400';
    case 'draft':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendors/me/products', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error Fetching Products',
          description: error instanceof Error ? error.message : 'Could not load your products.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [currentUser, toast]);

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!currentUser) return;
    if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete product');
        }
        setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
        toast({
          title: 'Product Deleted',
          description: `"${productName}" has been successfully deleted.`,
        });
      } catch (error) {
        console.error(`Error deleting product ${productId}:`, error);
        toast({
          title: 'Error Deleting Product',
          description: error instanceof Error ? error.message : 'Could not delete the product.',
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading your products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary">Manage Products</CardTitle>
            <CardDescription className="text-muted-foreground">View, add, edit, or remove your product listings.</CardDescription>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
            <Link href="/vendor/products/add">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Product
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Price (KSh)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
                      <Image 
                        src={product.imageUrl || 'https://placehold.co/80x80/cccccc/E0E0E0?text=No+Image'} 
                        alt={product.name}
                        width={40}
                        height={40}
                        className="rounded object-cover"
                        data-ai-hint={product.dataAiHint || product.category}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-muted-foreground">KSh {product.price.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.sku || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={!product.stock ? 'bg-red-500/20 text-red-300 border-red-400' : product.stock < 5 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400' : 'bg-green-500/20 text-green-300 border-green-400'}>
                        {product.stock ?? 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/vendor/products/edit/${product.id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${product.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProduct(product.id, product.name)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <PackageOpen className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No products listed yet.</p>
              <p className="text-sm text-muted-foreground">Get started by adding your first product.</p>
              <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
                <Link href="/vendor/products/add">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add New Product
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {products.length > 0 && (
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent flex items-center"><PackageSearch className="mr-2 h-5 w-5 text-accent" /> Product Management Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Keep your stock levels accurate to avoid overselling.</p>
            <p>• Use high-quality images and detailed descriptions for better customer engagement.</p>
            <p>• Regularly review product performance and pricing strategies.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
