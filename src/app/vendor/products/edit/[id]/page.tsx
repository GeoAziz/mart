'use client';

import { useState, type ChangeEvent, type FormEvent, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, X, DollarSign, ListOrdered, Edit3, Save, AlertCircle, Loader2, Image as ImageIconLucide, GripVertical, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import NextImage from 'next/image';
import { generateProductDescription } from '@/ai/flows/content-generation';

const productCategories = ["Electronics", "Fashion", "Home Goods", "Books", "Toys", "Sports", "Automotive", "Beauty & Personal Care", "Cybernetics", "Gadgets", "Apparel", "Neurotech"];
const MAX_IMAGES = 5;

interface ProductDataForForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  sku: string;
  dataAiHint?: string;
}

interface ImageObject {
  id: string;
  url: string;
  file?: File;
  isNew: boolean;
}


export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState<ProductDataForForm>({
    name: '', description: '', price: '', stock: '', category: '', sku: '', dataAiHint: ''
  });
  const [images, setImages] = useState<ImageObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [productFound, setProductFound] = useState(true);

  useEffect(() => {
    const fetchProductDetails = async (id: string) => {
      if (!currentUser) {
        setIsLoading(false);
        toast({ title: "Authentication Error", description: "Please log in to edit products.", variant: "destructive" });
        router.push('/auth/login');
        return;
      }
      setIsLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/products/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          if (response.status === 404) setProductFound(false);
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch product details');
        }
        const product = await response.json();

        if (currentUser.uid !== product.vendorId && userProfile?.role !== 'admin') {
          toast({ title: "Unauthorized", description: "You do not have permission to edit this product.", variant: "destructive"});
          setProductFound(false);
          router.push('/vendor/products/manage');
          return;
        }

        setFormData({
          name: product.name,
          description: product.description || '',
          price: product.price.toString(),
          stock: product.stock?.toString() || '0',
          category: product.category,
          sku: product.sku || '',
          dataAiHint: product.dataAiHint,
        });
        
        const initialImages: ImageObject[] = [];
        if (product.imageUrl) {
          initialImages.push({ id: product.imageUrl, url: product.imageUrl, isNew: false });
        }
        if (product.additionalImageUrls && Array.isArray(product.additionalImageUrls)) {
          product.additionalImageUrls.forEach((url: string) => {
            initialImages.push({ id: url, url: url, isNew: false });
          });
        }
        setImages(initialImages);
        setProductFound(true);

      } catch (error) {
        console.error('Error fetching product:', error);
        setProductFound(false);
        toast({
          title: 'Error Fetching Product',
          description: error instanceof Error ? error.message : 'Could not load product data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProductDetails(productId);
    }
  }, [productId, currentUser, userProfile, toast, router]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value, dataAiHint: value.toLowerCase().split(' ')[0] || formData.dataAiHint || "product" }));
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFilesArray = Array.from(e.target.files);
      const remainingSlots = MAX_IMAGES - images.filter(img => !img.isNew || (img.isNew && img.file)).length;
      
      if (newFilesArray.length > remainingSlots) {
          toast({title: "Image Limit Reached", description: `You can upload a maximum of ${MAX_IMAGES} images in total. You can add ${remainingSlots} more.`, variant: "default"});
      }

      const filesToAdd = newFilesArray.slice(0, remainingSlots);

      filesToAdd.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast({ title: "Image Too Large", description: `${file.name} is too large (max 10MB).`, variant: "destructive"});
          return; 
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const newImageObj: ImageObject = {
            id: Date.now().toString() + Math.random(), // Unique key
            url: reader.result as string, // This is the Data URI preview
            file: file,
            isNew: true,
          };
          setImages(prevImages => [...prevImages, newImageObj]);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = ""; // Reset file input
    }
  };

  const removeImage = (idToRemove: string) => {
    setImages(prevImages => prevImages.filter(img => img.id !== idToRemove));
  };
  
  const handleGenerateDescription = async () => {
    if (!formData.name || !formData.category) {
        toast({ title: "Name and Category Required", description: "Please enter a product name and select a category before generating a description.", variant: "destructive" });
        return;
    }
    setIsGeneratingDesc(true);
    try {
        const description = await generateProductDescription({ productName: formData.name, category: formData.category });
        setFormData(prev => ({ ...prev, description }));
        toast({ title: "Description Generated!", description: "The AI-generated description has been added." });
    } catch (error) {
        console.error("Error generating description:", error);
        toast({ title: "Generation Failed", description: "Could not generate a description at this time.", variant: "destructive" });
    } finally {
        setIsGeneratingDesc(false);
    }
  };


  const uploadImageFile = async (file: File): Promise<string | null> => {
    if (!currentUser) return null;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageDataUri = reader.result as string;
            try {
                const token = await currentUser.getIdToken();
                const response = await fetch('/api/images/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ imageDataUri, filename: file.name }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Image upload failed');
                }
                const { imageUrl } = await response.json();
                resolve(imageUrl);
            } catch (error) {
                console.error("Image upload error:", error);
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!formData.name || !formData.price || !formData.category || !formData.stock) {
      toast({ title: 'Missing Fields', description: 'Please fill in all required product details.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const finalImageUrls: string[] = [];
    let uploadErrorOccurred = false;

    for (const img of images) {
      if (img.isNew && img.file) {
        try {
          const uploadedUrl = await uploadImageFile(img.file);
          if (uploadedUrl) {
            finalImageUrls.push(uploadedUrl);
          } else {
            uploadErrorOccurred = true;
            toast({title: "Image Upload Issue", description: `Failed to upload ${img.file.name}.`, variant: "default"});
          }
        } catch (error) {
          uploadErrorOccurred = true;
          toast({title: "Image Upload Failed", description: `Error uploading ${img.file.name}: ${error instanceof Error ? error.message : "Unknown"}.`, variant: "destructive"});
        }
      } else if (!img.isNew) { // Existing image
        finalImageUrls.push(img.url);
      }
    }
    
    if (uploadErrorOccurred && finalImageUrls.length === 0 && images.some(img => img.isNew && img.file)) {
        toast({title: "Image Upload Critical Failure", description: "No images could be uploaded or kept. Please try again.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }


    const primaryImageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : 'https://placehold.co/400x300/cccccc/E0E0E0?text=No+Image';
    const additionalImages = finalImageUrls.slice(1);

    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      imageUrl: primaryImageUrl,
      additionalImageUrls: additionalImages,
      dataAiHint: formData.dataAiHint || formData.category.toLowerCase().split(' ')[0] || "product",
    };

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }
      toast({ title: 'Product Updated', description: `${formData.name} has been successfully updated.` });
      router.push('/vendor/products/manage');
    } catch (error) {
      console.error('Error updating product:', error);
      toast({ title: 'Update Failed', description: error instanceof Error ? error.message : 'Could not update product.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return ( <div className="flex justify-center items-center h-64"> <Loader2 className="h-16 w-16 animate-spin text-primary" /> <p className="ml-4 text-xl text-muted-foreground">Loading product details...</p> </div> );
  }
  if (!productFound) {
     return ( <Card className="bg-card border-destructive shadow-lg"> <CardHeader> <CardTitle className="text-2xl font-headline text-destructive flex items-center"> <AlertCircle className="mr-3 h-6 w-6" /> Product Not Found </CardTitle> </CardHeader> <CardContent> <p className="text-muted-foreground">The product could not be found or you don't have permission to edit it.</p> </CardContent> <CardFooter> <Button variant="outline" asChild className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"> <Link href="/vendor/products/manage">Back to Manage Products</Link> </Button> </CardFooter> </Card> );
  }
  
  const currentTotalImages = images.length;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <Edit3 className="mr-3 h-6 w-6 text-primary" /> Edit Product: {formData.name || "Loading..."}
          </CardTitle>
          <CardDescription className="text-muted-foreground"> Modify the details for your product. SKU: {formData.sku || 'N/A'} </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-1.5"> <Label htmlFor="name" className="text-base">Product Name <span className="text-destructive">*</span></Label> <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="bg-input border-primary focus:ring-accent" disabled={isSubmitting}/> </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="description" className="text-base">Description</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name || !formData.category} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs">
                  {isGeneratingDesc ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : <Sparkles className="mr-1 h-3 w-3"/>}
                  {isGeneratingDesc ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={5} className="bg-input border-primary focus:ring-accent" disabled={isSubmitting}/>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5"> <Label htmlFor="price" className="text-base">Price (KSh) <span className="text-destructive">*</span></Label> <div className="relative"> <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} required className="pl-10 bg-input border-primary focus:ring-accent" min="0" step="0.01" disabled={isSubmitting}/> </div> </div>
              <div className="space-y-1.5"> <Label htmlFor="stock" className="text-base">Stock Quantity <span className="text-destructive">*</span></Label> <div className="relative"> <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleInputChange} required className="pl-10 bg-input border-primary focus:ring-accent" min="0" disabled={isSubmitting}/> </div> </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5"> <Label htmlFor="category" className="text-base">Category <span className="text-destructive">*</span></Label> <Select onValueChange={handleCategoryChange} value={formData.category} required disabled={isSubmitting}> <SelectTrigger id="category" className="bg-input border-primary focus:ring-accent"> <SelectValue placeholder="Select a category" /> </SelectTrigger> <SelectContent className="bg-popover border-primary"> {productCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))} </SelectContent> </Select> </div>
              <div className="space-y-1.5"> <Label htmlFor="sku" className="text-base">SKU</Label> <Input id="sku" name="sku" value={formData.sku} onChange={handleInputChange} className="bg-input border-primary focus:ring-accent" disabled={isSubmitting || !!formData.sku} /> {formData.sku && <p className="text-xs text-muted-foreground">SKU is typically not editable.</p>} </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-base">Product Images (First is primary, max {MAX_IMAGES})</Label>
              {images.length > 0 && (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {images.map((img, index) => (
                    <div key={img.id} className={`relative group aspect-square ${index === 0 ? 'border-2 border-primary p-0.5' : 'border border-border'}`}>
                      <NextImage src={img.url} alt={`Product image ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md shadow-sm" data-ai-hint={formData.dataAiHint || "product"} />
                      {index === 0 && <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-br-md z-10">Primary</div>}
                      {!isSubmitting && (
                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/70 hover:bg-destructive z-20" onClick={() => removeImage(img.id)}>
                          <X size={14} /> <span className="sr-only">Remove image</span>
                        </Button>
                      )}
                       <div className="absolute bottom-1 left-1 bg-black/40 p-1 rounded-full text-white z-10 cursor-grab" title="Drag to reorder (feature coming soon)">
                         <GripVertical size={12}/>
                       </div>
                    </div>
                  ))}
                </div>
              )}
               {currentTotalImages < MAX_IMAGES && (
                <div className="mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md bg-input/30 hover:border-primary transition-colors">
                  <div className="space-y-1 text-center">
                    <ImageIconLucide className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <Label htmlFor="file-upload" className={`relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <span>Upload Images ({MAX_IMAGES - currentTotalImages} left)</span>
                        <input id="file-upload" name="images" type="file" className="sr-only" multiple accept="image/png, image/jpeg, image/webp" onChange={handleImageFileChange} disabled={isSubmitting || currentTotalImages >= MAX_IMAGES} title="Upload product images"/>
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10MB each.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6 flex justify-end gap-3">
             <Button variant="outline" asChild className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={isSubmitting}> <Link href="/vendor/products/manage">Cancel</Link> </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
