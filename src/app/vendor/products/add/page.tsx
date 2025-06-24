
'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PackagePlus, UploadCloud, X, DollarSign, ListOrdered, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { generateProductDescription } from '@/ai/flows/content-generation';

const productCategories = ["Electronics", "Fashion", "Home Goods", "Books", "Toys", "Sports", "Automotive", "Beauty & Personal Care", "Cybernetics", "Gadgets", "Apparel", "Neurotech"];
const MAX_IMAGES = 5;

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  sku: string;
  dataAiHint?: string;
}

export default function AddProductPage() {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    sku: '',
    dataAiHint: '',
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value, dataAiHint: value.toLowerCase().split(' ')[0] || "product" }));
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const combinedFiles = [...imageFiles, ...newFiles].slice(0, MAX_IMAGES);
      
      setImageFiles(combinedFiles);

      const newPreviews: string[] = [];
      combinedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === combinedFiles.length) {
            setImagePreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
      if (combinedFiles.length === 0) setImagePreviews([]);
    }
    e.target.value = "";
  };

  const removeImage = (indexToRemove: number) => {
    setImageFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove));
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
    setIsSubmitting(true);
    setIsUploadingImages(true);

    if (!formData.name || !formData.price || !formData.category || !formData.stock) {
      toast({ title: 'Missing Fields', description: 'Please fill in all required product details.', variant: 'destructive' });
      setIsSubmitting(false);
      setIsUploadingImages(false);
      return;
    }
    if (!currentUser) {
        toast({ title: "Not Authenticated", description: "Please log in to add products.", variant: "destructive"});
        setIsSubmitting(false);
        setIsUploadingImages(false);
        return;
    }

    const uploadedImageUrls: string[] = [];
    for (const file of imageFiles) {
        try {
            const url = await uploadImageFile(file);
            if (url) {
                uploadedImageUrls.push(url);
            } else {
                toast({ title: "Image Upload Issue", description: `Failed to upload ${file.name}. Skipping this image.`, variant: "default" });
            }
        } catch (error) {
            toast({ title: "Image Upload Failed", description: `Error uploading ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}. Skipping.`, variant: "destructive" });
        }
    }
    setIsUploadingImages(false);

    const primaryImageUrl = uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : 'https://placehold.co/400x300/cccccc/E0E0E0?text=No+Image';
    const additionalImages = uploadedImageUrls.slice(1);

    const productDataPayload = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      imageUrl: primaryImageUrl,
      additionalImageUrls: additionalImages,
      dataAiHint: formData.dataAiHint || formData.category.toLowerCase().split(' ')[0] || "product",
    };

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(productDataPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const newProduct = await response.json();
      toast({
        title: 'Product Added Successfully!',
        description: `${newProduct.name} has been added with ${uploadedImageUrls.length} image(s).`,
      });
      setFormData({ name: '', description: '', price: '', stock: '', category: '', sku: '', dataAiHint: '' });
      setImageFiles([]);
      setImagePreviews([]);
    } catch (error) {
      console.error('Failed to add product:', error);
      toast({
        title: 'Failed to Add Product',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <PackagePlus className="mr-3 h-6 w-6 text-primary" /> Add New Product
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Fill in the details below to list a new product in your store.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-base">Product Name <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" placeholder="e.g., Cybernetic Arm Attachment" value={formData.name} onChange={handleInputChange} required className="bg-input border-primary focus:ring-accent" disabled={isSubmitting}/>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="description" className="text-base">Description</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name || !formData.category} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs">
                  {isGeneratingDesc ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : <Sparkles className="mr-1 h-3 w-3"/>}
                  {isGeneratingDesc ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
              <Textarea id="description" name="description" placeholder="Detailed description of your futuristic product..." value={formData.description} onChange={handleInputChange} rows={5} className="bg-input border-primary focus:ring-accent" disabled={isSubmitting}/>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-base">Price (KSh) <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="price" name="price" type="number" placeholder="0.00" value={formData.price} onChange={handleInputChange} required className="pl-10 bg-input border-primary focus:ring-accent" min="0" step="0.01" disabled={isSubmitting}/>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-base">Stock Quantity <span className="text-destructive">*</span></Label>
                 <div className="relative">
                  <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="stock" name="stock" type="number" placeholder="0" value={formData.stock} onChange={handleInputChange} required className="pl-10 bg-input border-primary focus:ring-accent" min="0" disabled={isSubmitting}/>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-base">Category <span className="text-destructive">*</span></Label>
                <Select onValueChange={handleCategoryChange} value={formData.category} required disabled={isSubmitting}>
                  <SelectTrigger id="category" className="bg-input border-primary focus:ring-accent">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-primary">
                    {productCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-base">SKU (Stock Keeping Unit)</Label>
                <Input id="sku" name="sku" placeholder="e.g., CYBER-ARM-V2-RED" value={formData.sku} onChange={handleInputChange} className="bg-input border-primary focus:ring-accent" disabled={isSubmitting}/>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="images" className="text-base">Product Images (First image is primary, max {MAX_IMAGES})</Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md bg-input/50 hover:border-primary transition-colors">
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="flex text-sm text-muted-foreground">
                    <Label htmlFor="file-upload" className={`relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring ${isSubmitting || imageFiles.length >= MAX_IMAGES ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <span>Upload files</span>
                      <input id="file-upload" name="images" type="file" className="sr-only" multiple accept="image/png, image/jpeg, image/webp" onChange={handleImageFileChange} disabled={isSubmitting || imageFiles.length >= MAX_IMAGES}/>
                    </Label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10MB each. Max {MAX_IMAGES} images.</p>
                </div>
              </div>
              {isUploadingImages && <div className="flex items-center text-primary mt-2"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading selected images...</div>}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {imagePreviews.map((src, index) => (
                    <div key={index} className={`relative group aspect-square ${index === 0 ? 'border-2 border-primary p-0.5' : 'border border-border'}`}>
                      <img src={src} alt={`Preview ${index + 1}`} className="h-full w-full object-cover rounded-md shadow-sm" />
                      {index === 0 && <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-br-md">Primary</div>}
                      {!isSubmitting && (
                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/70 hover:bg-destructive" onClick={() => removeImage(index)}>
                          <X size={14} /> <span className="sr-only">Remove image</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6 flex justify-end gap-3">
             <Button variant="outline" asChild className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={isSubmitting}>
               <Link href="/vendor/products/manage">Cancel</Link>
             </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" disabled={isSubmitting}>
              {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {isUploadingImages ? 'Uploading Images...' : 'Adding Product...'}</>) : (<><PackagePlus className="mr-2 h-5 w-5" /> Add Product</>)}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
