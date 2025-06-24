
'use client';

import ProductCard from '@/components/ecommerce/ProductCard';
import ProductCardSkeleton from '@/components/ecommerce/ProductCardSkeleton';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Filter, LayoutGrid, LayoutList, PackageSearch, ListFilter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { useParams } from 'next/navigation';

const staticCategories = ["Electronics", "Fashion", "Home Goods", "Accessories", "Books", "Wearables", "AI Assistants", "Bio-Tech", "Cybernetics", "Gadgets", "Apparel", "Neurotech"];
const staticBrands = ["NovaCorp", "CyberGear", "AuraDesigns", "EcoTech", "StellarWear", "Quantum Leap", "BioSynth", "StellarCorp", "FutureTech"];
const ratings = [5, 4, 3, 2, 1];

const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 150000;
const ITEMS_PER_PAGE = 9;

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}

export default function CategoryProductListingPage() {
  const params = useParams();
  const categoryName = params.categoryName as string;

  const decodedCategoryName = useMemo(() => {
    try {
      if (!categoryName) return 'All';
      const decoded = decodeURIComponent(categoryName);
      // "home-goods" -> "Home Goods", "fashion" -> "Fashion"
      return decoded.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    } catch (e) {
      console.error("Failed to decode category name:", e);
      return "All";
    }
  }, [categoryName]);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE]);
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  
  // UI/Control States
  const [sortOption, setSortOption] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Effect to set the initial selected category from the URL param
  useEffect(() => {
    if (decodedCategoryName) {
      setSelectedCategory(decodedCategoryName);
    }
  }, [decodedCategoryName]);


  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
    if (selectedCategory !== 'All') params.append('category', selectedCategory);
    if (selectedBrand !== 'All') params.append('brand', selectedBrand);
    if (priceRange[0] > DEFAULT_MIN_PRICE) params.append('minPrice', String(priceRange[0]));
    if (priceRange[1] < DEFAULT_MAX_PRICE) params.append('maxPrice', String(priceRange[1]));
    if (selectedRating !== null) params.append('rating', String(selectedRating));
    
    params.append('sortBy', sortOption);
    params.append('page', String(currentPage));
    params.append('limit', String(ITEMS_PER_PAGE));

    try {
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotalProducts(data.totalProducts || 0);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedBrand, priceRange, selectedRating, sortOption, currentPage]);
  
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBrand, priceRange, selectedRating, sortOption]);
  
  const debouncedPriceChangeHandler = useCallback(
    debounce((value: [number, number]) => {
      setPriceRange(value);
    }, 300),
    []
  );

  const handlePriceSliderChange = (value: [number, number] | number[]) => {
    debouncedPriceChangeHandler(value as [number, number]);
  };

  const resetFilters = useCallback(() => {
    setSelectedCategory(decodedCategoryName);
    setPriceRange([DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE]);
    setSelectedBrand("All");
    setSelectedRating(null);
    setSortOption("newest");
    setCurrentPage(1);
  }, [decodedCategoryName]);
  
  const getResultsText = () => {
    if (isLoading) return 'Loading products...';
    if (totalProducts === 0) return '0 results found.';
    const startItem = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalProducts);
    return `Showing ${startItem}-${endItem} of ${totalProducts} results`;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-glow-primary">{decodedCategoryName}</h1>
        <p className="text-lg text-muted-foreground mt-2">Browse all products in the {decodedCategoryName} category.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-1/4 lg:w-1/5 space-y-6 p-6 bg-card rounded-lg shadow-lg border border-border self-start sticky top-24">
          <h2 className="text-2xl font-semibold font-headline text-glow-accent flex items-center"><ListFilter className="mr-2"/>Filters</h2>
          <Accordion type="multiple" defaultValue={['category', 'price']} className="w-full">
             <AccordionItem value="category">
              <AccordionTrigger className="text-lg hover:text-primary">Category</AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                  <SelectTrigger className="bg-input border-primary focus:ring-accent" aria-label="Select Category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {staticCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="price">
              <AccordionTrigger className="text-lg hover:text-primary">Price Range</AccordionTrigger>
              <AccordionContent className="pt-4">
                <Slider 
                  value={priceRange}
                  onValueChange={handlePriceSliderChange} 
                  max={DEFAULT_MAX_PRICE} 
                  min={DEFAULT_MIN_PRICE}
                  step={100} 
                  className="[&>span:first-child]:h-1 [&>span:first-child_span]:bg-primary [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-md" 
                  aria-label="Price range"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>KSh {priceRange[0]}</span>
                  <span>KSh {priceRange[1]}{priceRange[1] === DEFAULT_MAX_PRICE ? '+' : ''}</span>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="brand">
              <AccordionTrigger className="text-lg hover:text-primary">Brand</AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                 <Select onValueChange={setSelectedBrand} value={selectedBrand}>
                  <SelectTrigger className="bg-input border-primary focus:ring-accent" aria-label="Select Brand">
                    <SelectValue placeholder="Select Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Brands</SelectItem>
                    {staticBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rating">
              <AccordionTrigger className="text-lg hover:text-primary">Rating</AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {ratings.map(rating => (
                  <div key={rating} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`rating-${rating}`} 
                      checked={selectedRating === rating}
                      onCheckedChange={() => setSelectedRating(prev => (prev === rating ? null : rating))}
                      className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <Label htmlFor={`rating-${rating}`} className="text-sm font-normal text-muted-foreground hover:text-foreground cursor-pointer">{rating} Stars & Up</Label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Button onClick={resetFilters} variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">Reset Filters</Button>
        </aside>

        {/* Products Grid / List */}
        <main className="w-full md:w-3/4 lg:w-4/5">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-card rounded-md shadow-sm border border-border">
            <p className="text-muted-foreground text-sm mb-2 sm:mb-0">{getResultsText()}</p>
            <div className="flex items-center space-x-4">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-[180px] bg-input border-primary focus:ring-accent" aria-label="Sort by"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Average Rating</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border border-border rounded-md">
                <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')} className={cn("text-muted-foreground hover:text-primary rounded-r-none", {'bg-primary text-primary-foreground': viewMode === 'grid'})} data-active={viewMode === 'grid'} aria-label="Grid view"><LayoutGrid /></Button>
                <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} className={cn("text-muted-foreground hover:text-primary rounded-l-none", {'bg-primary text-primary-foreground': viewMode === 'list'})} data-active={viewMode === 'list'} aria-label="List view"><LayoutList /></Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${viewMode === 'grid' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (<ProductCardSkeleton key={index} />))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${viewMode === 'grid' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
                {products.map(product => (<ProductCard key={product.id} {...product} />))}
              </div>
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}/></PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }} isActive={currentPage === i + 1}>{i + 1}</PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}/></PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-lg shadow-md">
                <PackageSearch className="mx-auto h-20 w-20 text-muted-foreground/40 mb-6" />
                <p className="text-2xl font-semibold text-muted-foreground mb-2">No Products Found</p>
                <p className="text-md text-muted-foreground mb-6">Try adjusting your filters or check back later.</p>
                <Button variant="outline" onClick={resetFilters} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"><Filter className="mr-2 h-4 w-4" /> Reset All Filters</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
