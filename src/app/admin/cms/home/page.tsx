
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Edit3, Trash2, Image as ImageIcon, Link as LinkIcon, Save, Eye, Palette, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image'; // For image previews
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from '@/context/AuthContext'; 

interface HeroSlide {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dataAiHint?: string;
  link: string;
  buttonText: string;
}

interface FeaturedItem {
  id: string;
  type: 'product' | 'category' | 'vendor';
  itemId: string; 
  displayName: string; 
  imageUrl?: string;
  dataAiHint?: string;
}

interface PromoBanner {
    id: string;
    name: string;
    imageUrl: string;
    dataAiHint?: string;
    link: string;
    isActive: boolean;
    displayArea: 'homepage_top' | 'sidebar' | 'category_page';
}

interface HomepageCmsData {
  heroSlides: HeroSlide[];
  featuredItems: FeaturedItem[];
  promoBanners: PromoBanner[];
  updatedAt?: Date;
}

const initialCmsData: HomepageCmsData = {
    heroSlides: [],
    featuredItems: [],
    promoBanners: [],
};


export default function CmsHomePage() {
  const [cmsData, setCmsData] = useState<HomepageCmsData>(initialCmsData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [isSlideDialogOpen, setIsSlideDialogOpen] = useState(false);

  const [editingFeaturedItem, setEditingFeaturedItem] = useState<FeaturedItem | null>(null);
  const [isFeaturedItemDialogOpen, setIsFeaturedItemDialogOpen] = useState(false);

  const [editingPromoBanner, setEditingPromoBanner] = useState<PromoBanner | null>(null);
  const [isPromoBannerDialogOpen, setIsPromoBannerDialogOpen] = useState(false);

  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchCmsData = async () => {
      if (!currentUser) {
        setIsLoading(false);
        setError("Authentication required to load CMS data.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/cms/homepage', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch CMS data");
        }
        const data: HomepageCmsData = await response.json();
        setCmsData({
            ...data,
            heroSlides: data.heroSlides || [],
            featuredItems: data.featuredItems || [],
            promoBanners: data.promoBanners || [],
        });
      } catch (err) {
        console.error("Error fetching CMS data:", err);
        setError(err instanceof Error ? err.message : "Could not load homepage CMS data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCmsData();
  }, [currentUser]);

  // Hero Slide Logic
  const handleSaveHeroSlide = () => {
    if (!editingSlide) return;
    setCmsData(prevCmsData => {
        const existingSlideIndex = prevCmsData.heroSlides.findIndex(s => s.id === editingSlide.id);
        let newHeroSlides;
        if (existingSlideIndex > -1) {
            newHeroSlides = prevCmsData.heroSlides.map((s, index) => index === existingSlideIndex ? editingSlide : s);
            toast({ title: 'Hero Slide Updated', description: `Slide "${editingSlide.title}" has been updated locally.` });
        } else {
            newHeroSlides = [editingSlide, ...prevCmsData.heroSlides];
            toast({ title: 'Hero Slide Added', description: `Slide "${editingSlide.title}" has been added locally.` });
        }
        return { ...prevCmsData, heroSlides: newHeroSlides };
    });
    setEditingSlide(null);
    setIsSlideDialogOpen(false);
  };

  const handleAddNewHeroSlide = () => {
    const newSlide: HeroSlide = {
        id: `slide-${Date.now()}`,
        title: 'New Slide Title',
        description: 'Compelling description here.',
        imageUrl: 'https://placehold.co/1200x600/cccccc/E0E0E0?text=New+Slide',
        dataAiHint: 'placeholder image',
        link: '#',
        buttonText: 'Learn More',
    };
    setEditingSlide(newSlide);
    setIsSlideDialogOpen(true);
  };
  
  const handleEditHeroSlide = (slide: HeroSlide) => {
    setEditingSlide({...slide});
    setIsSlideDialogOpen(true);
  }

  const handleDeleteHeroSlide = (slideId: string) => {
    if(confirm('Are you sure you want to delete this hero slide? This change is local until published.')) {
        setCmsData(prev => ({
            ...prev,
            heroSlides: prev.heroSlides.filter(s => s.id !== slideId)
        }));
        toast({ title: 'Hero Slide Deleted Locally', variant: 'destructive' });
    }
  }

  // Featured Item Logic
  const handleAddNewFeaturedItem = () => {
    const newItem: FeaturedItem = {
      id: `featured-${Date.now()}`,
      type: 'product',
      itemId: '',
      displayName: 'New Featured Item',
      imageUrl: 'https://placehold.co/300x200/cccccc/E0E0E0?text=Feature',
      dataAiHint: 'feature placeholder',
    };
    setEditingFeaturedItem(newItem);
    setIsFeaturedItemDialogOpen(true);
  };

  const handleEditFeaturedItem = (item: FeaturedItem) => {
    setEditingFeaturedItem({ ...item });
    setIsFeaturedItemDialogOpen(true);
  };

  const handleSaveFeaturedItem = () => {
    if (!editingFeaturedItem) return;
    setCmsData(prev => {
      const existingIndex = prev.featuredItems.findIndex(fi => fi.id === editingFeaturedItem.id);
      let newFeaturedItems;
      if (existingIndex > -1) {
        newFeaturedItems = prev.featuredItems.map((fi, index) => index === existingIndex ? editingFeaturedItem : fi);
        toast({ title: 'Featured Item Updated', description: `"${editingFeaturedItem.displayName}" updated locally.` });
      } else {
        newFeaturedItems = [editingFeaturedItem, ...prev.featuredItems];
        toast({ title: 'Featured Item Added', description: `"${editingFeaturedItem.displayName}" added locally.` });
      }
      return { ...prev, featuredItems: newFeaturedItems };
    });
    setEditingFeaturedItem(null);
    setIsFeaturedItemDialogOpen(false);
  };

  const handleDeleteFeaturedItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this featured item? This change is local until published.')) {
      setCmsData(prev => ({
        ...prev,
        featuredItems: prev.featuredItems.filter(fi => fi.id !== itemId)
      }));
      toast({ title: 'Featured Item Deleted Locally', variant: 'destructive' });
    }
  };

  // Promo Banner Logic
  const handleAddNewPromoBanner = () => {
    const newBanner: PromoBanner = {
      id: `banner-${Date.now()}`,
      name: 'New Promo Banner',
      imageUrl: 'https://placehold.co/600x150/cccccc/E0E0E0?text=Promo+Banner',
      dataAiHint: 'banner placeholder',
      link: '#',
      isActive: true,
      displayArea: 'homepage_top',
    };
    setEditingPromoBanner(newBanner);
    setIsPromoBannerDialogOpen(true);
  };

  const handleEditPromoBanner = (banner: PromoBanner) => {
    setEditingPromoBanner({ ...banner });
    setIsPromoBannerDialogOpen(true);
  };

  const handleSavePromoBanner = () => {
    if (!editingPromoBanner) return;
    setCmsData(prev => {
      const existingIndex = prev.promoBanners.findIndex(pb => pb.id === editingPromoBanner.id);
      let newPromoBanners;
      if (existingIndex > -1) {
        newPromoBanners = prev.promoBanners.map((pb, index) => index === existingIndex ? editingPromoBanner : pb);
        toast({ title: 'Promo Banner Updated', description: `"${editingPromoBanner.name}" updated locally.` });
      } else {
        newPromoBanners = [editingPromoBanner, ...prev.promoBanners];
        toast({ title: 'Promo Banner Added', description: `"${editingPromoBanner.name}" added locally.` });
      }
      return { ...prev, promoBanners: newPromoBanners };
    });
    setEditingPromoBanner(null);
    setIsPromoBannerDialogOpen(false);
  };

  const handleDeletePromoBanner = (bannerId: string) => {
    if (confirm('Are you sure you want to delete this promotional banner? This change is local until published.')) {
      setCmsData(prev => ({
        ...prev,
        promoBanners: prev.promoBanners.filter(pb => pb.id !== bannerId)
      }));
      toast({ title: 'Promo Banner Deleted Locally', variant: 'destructive' });
    }
  };


  const handlePublishChanges = async () => {
    if (!currentUser) {
        toast({ title: "Not Authenticated", description: "Please log in to publish changes.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/cms/homepage', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(cmsData), 
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to publish CMS changes");
        }
        const updatedData: HomepageCmsData = await response.json();
         setCmsData({ 
            ...updatedData,
            heroSlides: updatedData.heroSlides || [],
            featuredItems: updatedData.featuredItems || [],
            promoBanners: updatedData.promoBanners || [],
        });
        toast({
            title: "Homepage Published!",
            description: "Your homepage content updates have been successfully published.",
        });
    } catch (err) {
        console.error("Error publishing CMS changes:", err);
        toast({ title: "Publish Failed", description: err instanceof Error ? err.message : "Could not publish changes.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading CMS data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="m-auto mt-10 max-w-lg bg-card border-destructive shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center"><AlertCircle className="mr-2"/>Error Loading CMS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-8">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <Palette className="mr-3 h-6 w-6 text-primary" /> Homepage Content Management
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Customize the content displayed on your ZilaCart homepage.
            {cmsData.updatedAt && <span className="block text-xs mt-1">Last published: {new Date(cmsData.updatedAt).toLocaleString()}</span>}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Hero Carousel Management */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-xl font-semibold text-glow-accent">Hero Carousel Slides</CardTitle>
                <CardDescription className="text-muted-foreground">Manage the main promotional slides.</CardDescription>
            </div>
            <Button onClick={handleAddNewHeroSlide} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Slide
            </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {cmsData.heroSlides.map((slide) => (
            <Card key={slide.id} className="p-4 bg-muted/30 border border-border/50">
              <div className="flex flex-col md:flex-row gap-4">
                <NextImage src={slide.imageUrl} alt={slide.title} width={200} height={100} className="rounded-md object-cover md:w-1/4" data-ai-hint={slide.dataAiHint || 'slide image'} unoptimized/>
                <div className="flex-grow space-y-1">
                  <h4 className="font-semibold text-foreground">{slide.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{slide.description}</p>
                  <p className="text-xs text-muted-foreground">Link: <a href={slide.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{slide.link}</a></p>
                  <p className="text-xs text-muted-foreground">Button Text: {slide.buttonText}</p>
                </div>
                <div className="flex md:flex-col gap-2 items-start md:items-end shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleEditHeroSlide(slide)} className="text-accent border-accent hover:bg-accent hover:text-accent-foreground">
                        <Edit3 className="mr-1 h-3 w-3" /> Edit
                    </Button>
                     <Button variant="outline" size="sm" onClick={() => handleDeleteHeroSlide(slide.id)} className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                </div>
              </div>
            </Card>
          ))}
          {cmsData.heroSlides.length === 0 && <p className="text-muted-foreground text-center py-4">No hero slides configured yet.</p>}
        </CardContent>
      </Card>

      <Dialog open={isSlideDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingSlide(null); setIsSlideDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-lg bg-card border-primary shadow-xl">
            <DialogHeader>
                <DialogTitle className="text-glow-accent">{editingSlide && cmsData.heroSlides.find(s => s.id === editingSlide.id) ? 'Edit Hero Slide' : 'Add New Hero Slide'}</DialogTitle>
                <DialogDescription> Update the details for this hero carousel slide. </DialogDescription>
            </DialogHeader>
            {editingSlide && (
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-1"> <Label htmlFor="slide-title">Title</Label> <Input id="slide-title" value={editingSlide.title} onChange={(e) => setEditingSlide({...editingSlide, title: e.target.value})} className="bg-input border-primary focus:ring-accent" /> </div>
                    <div className="space-y-1"> <Label htmlFor="slide-description">Description</Label> <Textarea id="slide-description" value={editingSlide.description} onChange={(e) => setEditingSlide({...editingSlide, description: e.target.value})} className="bg-input border-primary focus:ring-accent" /> </div>
                    <div className="space-y-1"> <Label htmlFor="slide-imageUrl">Image URL</Label> <Input id="slide-imageUrl" value={editingSlide.imageUrl} onChange={(e) => setEditingSlide({...editingSlide, imageUrl: e.target.value})} className="bg-input border-primary focus:ring-accent" /> {editingSlide.imageUrl && <NextImage src={editingSlide.imageUrl} alt="Preview" width={150} height={75} className="mt-2 rounded object-cover border border-border" data-ai-hint={editingSlide.dataAiHint || 'custom image'} unoptimized/>} </div>
                    <div className="space-y-1"> <Label htmlFor="slide-dataAiHint">Image AI Hint (for placeholders)</Label> <Input id="slide-dataAiHint" value={editingSlide.dataAiHint || ''} onChange={(e) => setEditingSlide({...editingSlide, dataAiHint: e.target.value})} placeholder="e.g. futuristic city" className="bg-input border-primary focus:ring-accent" /> </div>
                    <div className="space-y-1"> <Label htmlFor="slide-link">Link URL</Label> <Input id="slide-link" value={editingSlide.link} onChange={(e) => setEditingSlide({...editingSlide, link: e.target.value})} className="bg-input border-primary focus:ring-accent" /> </div>
                    <div className="space-y-1"> <Label htmlFor="slide-buttonText">Button Text</Label> <Input id="slide-buttonText" value={editingSlide.buttonText} onChange={(e) => setEditingSlide({...editingSlide, buttonText: e.target.value})} className="bg-input border-primary focus:ring-accent" /> </div>
                </div>
            )}
            <DialogFooter> <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose> <Button onClick={handleSaveHeroSlide} className="bg-primary hover:bg-primary/90">Save Changes</Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Featured Items/Categories Management */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-glow-accent">Featured Content</CardTitle>
            <CardDescription className="text-muted-foreground">Select products, categories, or vendors to highlight.</CardDescription>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={handleAddNewFeaturedItem}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Featured Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {cmsData.featuredItems.map(item => (
            <Card key={item.id} className="p-3 bg-muted/30 border border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {item.imageUrl && <NextImage src={item.imageUrl} alt={item.displayName} width={80} height={50} className="rounded object-cover" data-ai-hint={item.dataAiHint || 'featured image'} unoptimized/>}
                    <div>
                        <p className="font-medium text-foreground">{item.displayName}</p>
                        <p className="text-xs text-muted-foreground capitalize">Type: {item.type} (ID: {item.itemId})</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 text-accent border-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleEditFeaturedItem(item)}><Edit3 size={16}/></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteFeaturedItem(item.id)}><Trash2 size={16}/></Button>
                </div>
            </Card>
          ))}
          {cmsData.featuredItems.length === 0 && <p className="text-muted-foreground text-center py-4">No featured items configured yet.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={isFeaturedItemDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingFeaturedItem(null); setIsFeaturedItemDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-md bg-card border-primary shadow-xl">
              <DialogHeader>
                  <DialogTitle className="text-glow-accent">{editingFeaturedItem && cmsData.featuredItems.find(fi => fi.id === editingFeaturedItem.id) ? 'Edit Featured Item' : 'Add New Featured Item'}</DialogTitle>
                  <DialogDescription>Configure the featured item details.</DialogDescription>
              </DialogHeader>
              {editingFeaturedItem && (
                  <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                      <div className="space-y-1"> <Label htmlFor="fi-displayName">Display Name</Label> <Input id="fi-displayName" value={editingFeaturedItem.displayName} onChange={(e) => setEditingFeaturedItem({...editingFeaturedItem, displayName: e.target.value})} className="bg-input border-primary focus:ring-accent" /> </div>
                      <div className="space-y-1"> <Label htmlFor="fi-type">Type</Label> <Select value={editingFeaturedItem.type} onValueChange={(value: 'product' | 'category' | 'vendor') => setEditingFeaturedItem({...editingFeaturedItem, type: value})}> <SelectTrigger className="bg-input border-primary focus:ring-accent"> <SelectValue placeholder="Select type" /> </SelectTrigger> <SelectContent className="bg-popover border-primary"> <SelectItem value="product">Product</SelectItem> <SelectItem value="category">Category</SelectItem> <SelectItem value="vendor">Vendor</SelectItem> </SelectContent> </Select> </div>
                      <div className="space-y-1"> <Label htmlFor="fi-itemId">Item ID</Label> <Input id="fi-itemId" value={editingFeaturedItem.itemId} onChange={(e) => setEditingFeaturedItem({...editingFeaturedItem, itemId: e.target.value})} className="bg-input border-primary focus:ring-accent" placeholder="Product/Category/Vendor ID"/> </div>
                      <div className="space-y-1"> <Label htmlFor="fi-imageUrl">Image URL (Optional)</Label> <Input id="fi-imageUrl" value={editingFeaturedItem.imageUrl || ''} onChange={(e) => setEditingFeaturedItem({...editingFeaturedItem, imageUrl: e.target.value})} className="bg-input border-primary focus:ring-accent" /> {editingFeaturedItem.imageUrl && <NextImage src={editingFeaturedItem.imageUrl} alt="Preview" width={100} height={60} className="mt-2 rounded object-cover border border-border" data-ai-hint={editingFeaturedItem.dataAiHint || 'custom image'} unoptimized/>} </div>
                      <div className="space-y-1"> <Label htmlFor="fi-dataAiHint">Image AI Hint</Label> <Input id="fi-dataAiHint" value={editingFeaturedItem.dataAiHint || ''} onChange={(e) => setEditingFeaturedItem({...editingFeaturedItem, dataAiHint: e.target.value})} placeholder="e.g. tech gadget" className="bg-input border-primary focus:ring-accent" /> </div>
                  </div>
              )}
              <DialogFooter> <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose> <Button onClick={handleSaveFeaturedItem} className="bg-primary hover:bg-primary/90">Save Item</Button> </DialogFooter>
          </DialogContent>
      </Dialog>


      {/* Promotional Banners Management */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-glow-accent">Promotional Banners</CardTitle>
            <CardDescription className="text-muted-foreground">Manage site-wide or page-specific banners.</CardDescription>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={handleAddNewPromoBanner}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Banner
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {cmsData.promoBanners.map(banner => (
             <Card key={banner.id} className="p-3 bg-muted/30 border border-border/50">
                <div className="flex flex-col md:flex-row gap-4">
                    <NextImage src={banner.imageUrl} alt={banner.name} width={250} height={60} className="rounded-md object-contain md:w-1/3 bg-black/20" data-ai-hint={banner.dataAiHint || 'promo banner'} unoptimized/>
                    <div className="flex-grow space-y-1">
                        <h4 className="font-semibold text-foreground">{banner.name}</h4>
                        <p className="text-xs text-muted-foreground">Link: <a href={banner.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{banner.link}</a></p>
                        <p className="text-xs text-muted-foreground">Display Area: {banner.displayArea}</p>
                         <p className="text-xs text-muted-foreground">Status: <span className={banner.isActive ? 'text-green-400' : 'text-red-400'}>{banner.isActive ? 'Active' : 'Inactive'}</span></p>
                    </div>
                    <div className="flex md:flex-col gap-2 items-start md:items-end shrink-0">
                        <Button variant="outline" size="sm" className="text-accent border-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleEditPromoBanner(banner)}><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeletePromoBanner(banner.id)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                    </div>
                </div>
             </Card>
          ))}
          {cmsData.promoBanners.length === 0 && <p className="text-muted-foreground text-center py-4">No promotional banners configured yet.</p>}
        </CardContent>
      </Card>

      <Dialog open={isPromoBannerDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingPromoBanner(null); setIsPromoBannerDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-lg bg-card border-primary shadow-xl">
              <DialogHeader>
                  <DialogTitle className="text-glow-accent">{editingPromoBanner && cmsData.promoBanners.find(pb => pb.id === editingPromoBanner.id) ? 'Edit Promo Banner' : 'Add New Promo Banner'}</DialogTitle>
                  <DialogDescription>Set up your promotional banner.</DialogDescription>
              </DialogHeader>
              {editingPromoBanner && (
                  <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                      <div className="space-y-1"> <Label htmlFor="pb-name">Banner Name</Label> <Input id="pb-name" value={editingPromoBanner.name} onChange={(e) => setEditingPromoBanner({...editingPromoBanner, name: e.target.value})} className="bg-input border-primary focus:ring-accent" /> </div>
                      <div className="space-y-1"> <Label htmlFor="pb-imageUrl">Image URL</Label> <Input id="pb-imageUrl" value={editingPromoBanner.imageUrl} onChange={(e) => setEditingPromoBanner({...editingPromoBanner, imageUrl: e.target.value})} className="bg-input border-primary focus:ring-accent" /> {editingPromoBanner.imageUrl && <NextImage src={editingPromoBanner.imageUrl} alt="Preview" width={200} height={50} className="mt-2 rounded object-contain border border-border bg-black/10" data-ai-hint={editingPromoBanner.dataAiHint || 'custom image'} unoptimized/>} </div>
                      <div className="space-y-1"> <Label htmlFor="pb-dataAiHint">Image AI Hint</Label> <Input id="pb-dataAiHint" value={editingPromoBanner.dataAiHint || ''} onChange={(e) => setEditingPromoBanner({...editingPromoBanner, dataAiHint: e.target.value})} placeholder="e.g. sale fashion" className="bg-input border-primary focus:ring-accent" /> </div>
                      <div className="space-y-1"> <Label htmlFor="pb-link">Link URL</Label> <Input id="pb-link" value={editingPromoBanner.link} onChange={(e) => setEditingPromoBanner({...editingPromoBanner, link: e.target.value})} className="bg-input border-primary focus:ring-accent" /> </div>
                      <div className="space-y-1"> <Label htmlFor="pb-displayArea">Display Area</Label> <Select value={editingPromoBanner.displayArea} onValueChange={(value: 'homepage_top' | 'sidebar' | 'category_page') => setEditingPromoBanner({...editingPromoBanner, displayArea: value})}> <SelectTrigger className="bg-input border-primary focus:ring-accent"> <SelectValue placeholder="Select display area" /> </SelectTrigger> <SelectContent className="bg-popover border-primary"> <SelectItem value="homepage_top">Homepage Top</SelectItem> <SelectItem value="sidebar">Sidebar</SelectItem> <SelectItem value="category_page">Category Page</SelectItem> </SelectContent> </Select> </div>
                      <div className="flex items-center space-x-2 pt-2"> <Checkbox id="pb-isActive" checked={editingPromoBanner.isActive} onCheckedChange={(checked) => setEditingPromoBanner({...editingPromoBanner, isActive: Boolean(checked)})} className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"/> <Label htmlFor="pb-isActive" className="text-sm font-normal">Active</Label> </div>
                  </div>
              )}
              <DialogFooter> <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose> <Button onClick={handleSavePromoBanner} className="bg-primary hover:bg-primary/90">Save Banner</Button> </DialogFooter>
          </DialogContent>
      </Dialog>

      <CardFooter className="pt-6 border-t border-border/50 flex justify-end">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" onClick={handlePublishChanges} disabled={isSaving || isLoading}>
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5" />}
          {isSaving ? 'Publishing...' : 'Publish Homepage Changes'}
        </Button>
      </CardFooter>
    </div>
  );
}

