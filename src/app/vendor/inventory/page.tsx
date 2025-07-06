'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockUpdateModal } from '@/components/inventory/StockUpdateModal';
import { LowStock } from '@/components/inventory/LowStock';
import { AlertCircle, PackageOpen, ArrowUpDown, Package, AlertTriangle, Loader2, RefreshCcw, FileDown, Edit } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

export default function VendorInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' }>({ key: 'stock', direction: 'asc' });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Fetch inventory data
  const fetchInventory = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendors/me/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const getStockStatus = (stock: number = 0, threshold: number = 10) => {
    if (stock <= 0) return { label: 'Out of Stock', variant: 'destructive' };
    if (stock <= threshold) return { label: 'Low Stock', variant: 'secondary' };
    return { label: 'In Stock', variant: 'default' };
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aValue = (a[sortConfig.key] ?? 0) as number | string;
    const bValue = (b[sortConfig.key] ?? 0) as number | string;
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Product) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-headline">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-headline">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {products.filter(p => p.stock && p.stock <= (p.lowStockThreshold || 10)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-headline">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {products.filter(p => !p.stock || p.stock <= 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <PackageOpen className="mr-3 h-6 w-6 text-primary" /> Inventory Management
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Track and manage your product inventory levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => fetchInventory()}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                </Button>
                <Button className="bg-primary hover:bg-primary/90">
                  <FileDown className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('stock')}>
                      <div className="flex items-center">
                        Stock Level
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    return (
                      <TableRow key={product.id} className="group">
                        <TableCell>
                          <div className="h-12 w-12 rounded-md overflow-hidden border border-border">
                            <Image
                              src={product.imageUrl || 'https://placehold.co/200x200/2563eb/ffffff?text=Product'}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.category}</div>
                        </TableCell>
                        <TableCell>{product.stock || 0}</TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant as 'default' | 'destructive' | 'secondary'}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{product.sku || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsUpdateModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit stock</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <PackageOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
              <p className="text-muted-foreground mb-4">You haven't added any products yet.</p>
              <Button asChild>
                <Link href="/vendor/products/add">Add Your First Product</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LowStock products={products.filter(p => p.stock && p.stock <= (p.lowStockThreshold || 10))} />
      </div>
      {selectedProduct && (
        <StockUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onUpdate={fetchInventory}
        />
      )}
    </div>
  );
}