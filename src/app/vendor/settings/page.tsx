'use client';

import { useState, type ChangeEvent, type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, UploadCloud, Image as ImageIconLucide, Phone, Mail, Link as LinkIcon, DollarSign, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image'; // Next.js Image component
import { useAuth } from '@/context/AuthContext';
import type { VendorSettings } from '@/app/api/vendors/me/settings/route';
import { Switch } from '@/components/ui/switch';

const DEFAULT_VENDOR_SETTINGS_FRONTEND: VendorSettings = {
  storeName: '',
  storeDescription: '',
  contactEmail: '',
  contactPhone: '',
  logoUrl: 'https://placehold.co/150x150/7777FF/FFFFFF?text=Logo',
  bannerUrl: 'https://placehold.co/600x200/77DDFF/FFFFFF?text=Banner',
  socialFacebook: '',
  socialTwitter: '',
  socialInstagram: '',
  payoutMpesaNumber: '',
  reviewNotifications: false,
  useAutoReply: false,
};


export default function StoreSettingsPage() {
  const [settings, setSettings] = useState<VendorSettings>(DEFAULT_VENDOR_SETTINGS_FRONTEND);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  
  // Local previews for immediate feedback before actual upload completes and URL is set
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser) {
        setIsLoading(false);
        toast({title: "Not Authenticated", description: "Please log in to view store settings.", variant: "destructive"});
        return;
      }
      setIsLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendors/me/settings', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch store settings.");
        }
        const data: VendorSettings = await response.json();
        setSettings(prev => ({...DEFAULT_VENDOR_SETTINGS_FRONTEND, ...data})); 
        if (data.logoUrl) setLogoPreview(data.logoUrl);
        if (data.bannerUrl) setBannerPreview(data.bannerUrl);
      } catch (error) {
        console.error("Error fetching store settings:", error);
        toast({ title: "Error", description: error instanceof Error ? error.message : "Could not load store settings.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [currentUser, toast]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingChange = (name: keyof VendorSettings, value: any) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>, imageType: 'logo' | 'banner') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image Too Large", description: "Please upload an image smaller than 5MB.", variant: "destructive" });
        e.target.value = ""; // Reset file input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageDataUri = reader.result as string;
        
        // Show local preview immediately
        if (imageType === 'logo') setLogoPreview(imageDataUri);
        else setBannerPreview(imageDataUri);

        // Set uploading state
        if (imageType === 'logo') setIsUploadingLogo(true);
        else setIsUploadingBanner(true);

        if (!currentUser) {
          toast({ title: "Not Authenticated", description: "Please log in to upload images.", variant: "destructive" });
          if (imageType === 'logo') setIsUploadingLogo(false); else setIsUploadingBanner(false);
          return;
        }

        try {
          const token = await currentUser.getIdToken();
          const uploadResponse = await fetch('/api/images/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ imageDataUri, filename: file.name }),
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.message || `Image upload failed for ${imageType}`);
          }

          const { imageUrl } = await uploadResponse.json();
          setSettings(prev => ({ ...prev, [imageType === 'logo' ? 'logoUrl' : 'bannerUrl']: imageUrl }));
          toast({ title: `${imageType === 'logo' ? 'Logo' : 'Banner'} Uploaded`, description: `Your new ${imageType} has been uploaded. Save settings to make it permanent.` });
        } catch (error) {
          console.error(`Error uploading ${imageType}:`, error);
          toast({ title: `${imageType === 'logo' ? 'Logo' : 'Banner'} Upload Failed`, description: error instanceof Error ? error.message : "Could not upload image.", variant: "destructive" });
          // Revert preview if upload fails and there was an existing image
          if (imageType === 'logo') setLogoPreview(settings.logoUrl || DEFAULT_VENDOR_SETTINGS_FRONTEND.logoUrl!);
          else setBannerPreview(settings.bannerUrl || DEFAULT_VENDOR_SETTINGS_FRONTEND.bannerUrl!);
        } finally {
          if (imageType === 'logo') setIsUploadingLogo(false);
          else setIsUploadingBanner(false);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = ""; // Reset file input
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        toast({title: "Not Authenticated", description: "Please log in to save settings.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    try {
      const token = await currentUser.getIdToken();
      // Ensure current preview URLs are what's being saved if they weren't from direct settings state
      const payload = {
          ...settings,
          logoUrl: logoPreview || settings.logoUrl || DEFAULT_VENDOR_SETTINGS_FRONTEND.logoUrl,
          bannerUrl: bannerPreview || settings.bannerUrl || DEFAULT_VENDOR_SETTINGS_FRONTEND.bannerUrl,
      };

      const response = await fetch('/api/vendors/me/settings', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save store settings.");
      }
      const updatedSettings = await response.json();
      setSettings(prev => ({...DEFAULT_VENDOR_SETTINGS_FRONTEND, ...updatedSettings}));
      if (updatedSettings.logoUrl) setLogoPreview(updatedSettings.logoUrl);
      if (updatedSettings.bannerUrl) setBannerPreview(updatedSettings.bannerUrl);
      toast({
        title: 'Settings Saved!',
        description: 'Your store settings have been successfully updated.',
      });
    } catch (error) {
        console.error('Failed to save settings:', error);
        toast({ title: 'Save Failed', description: error instanceof Error ? error.message : 'Could not save settings.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading store settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <Settings className="mr-3 h-6 w-6 text-primary" /> Store Settings
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your store's appearance, contact information, and payout details.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-glow-accent">Store Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="storeName" className="text-base">Store Name</Label>
            <Input id="storeName" name="storeName" value={settings.storeName || ''} onChange={handleInputChange} className="bg-input border-primary focus:ring-accent" placeholder="Your Awesome Store" disabled={isSaving || isUploadingLogo || isUploadingBanner} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="storeDescription" className="text-base">Store Description</Label>
            <Textarea id="storeDescription" name="storeDescription" value={settings.storeDescription || ''} onChange={handleInputChange} rows={4} className="bg-input border-primary focus:ring-accent" placeholder="Tell customers about your store..." disabled={isSaving || isUploadingLogo || isUploadingBanner} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-glow-accent">Store Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-base">Store Logo (Recommended: Square, min 150x150px)</Label>
            <div className="flex items-center gap-4">
              {(logoPreview || settings.logoUrl) && (
                <div className="w-24 h-24 relative border border-border rounded-md overflow-hidden shadow-sm bg-muted/30">
                  <Image src={logoPreview || settings.logoUrl!} alt="Logo Preview" layout="fill" objectFit="contain" data-ai-hint="store logo" onError={(e) => e.currentTarget.src = DEFAULT_VENDOR_SETTINGS_FRONTEND.logoUrl!} />
                </div>
              )}
              <div className="flex-grow p-4 border-2 border-dashed border-border rounded-md bg-input/30 hover:border-primary transition-colors">
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                  <Label htmlFor="logo-upload" className={`relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring ${(isSaving || isUploadingLogo) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span>{isUploadingLogo ? 'Uploading...' : (logoPreview || settings.logoUrl ? 'Change Logo' : 'Upload Logo')}</span>
                    <input id="logo-upload" name="logo" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageFileChange(e, 'logo')} disabled={isSaving || isUploadingLogo} title="Upload store logo" />
                  </Label>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB.</p>
                </div>
              </div>
            </div>
            {isUploadingLogo && <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />}
          </div>

          {/* Banner Upload */}
          <div className="space-y-2">
            <Label className="text-base">Store Banner (Recommended: 1200x400px or similar ratio)</Label>
             {(bannerPreview || settings.bannerUrl) && (
                <div className="w-full aspect-[3/1] max-w-xl relative border border-border rounded-md overflow-hidden shadow-sm bg-muted/30 mb-2">
                  <Image src={bannerPreview || settings.bannerUrl!} alt="Banner Preview" layout="fill" objectFit="cover" data-ai-hint="store banner" onError={(e) => e.currentTarget.src = DEFAULT_VENDOR_SETTINGS_FRONTEND.bannerUrl!} />
                </div>
              )}
            <div className="flex-grow p-4 border-2 border-dashed border-border rounded-md bg-input/30 hover:border-primary transition-colors">
                <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                    <Label htmlFor="banner-upload" className={`relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring ${(isSaving || isUploadingBanner) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span>{isUploadingBanner ? 'Uploading...' : (bannerPreview || settings.bannerUrl ? 'Change Banner' : 'Upload Banner')}</span>
                    <input id="banner-upload" name="banner" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageFileChange(e, 'banner')} disabled={isSaving || isUploadingBanner} title="Upload store banner" />
                    </Label>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB.</p>
                </div>
            </div>
            {isUploadingBanner && <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-md">
        <CardHeader><CardTitle className="text-xl font-semibold text-glow-accent">Contact & Socials</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5"> <Label htmlFor="contactEmail" className="text-base">Contact Email</Label> <div className="relative"> <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="contactEmail" name="contactEmail" type="email" value={settings.contactEmail || ''} onChange={handleInputChange} className="pl-10 bg-input border-primary focus:ring-accent" placeholder="your.store@example.com" disabled={isSaving}/> </div> </div>
            <div className="space-y-1.5"> <Label htmlFor="contactPhone" className="text-base">Contact Phone</Label> <div className="relative"> <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="contactPhone" name="contactPhone" type="tel" value={settings.contactPhone || ''} onChange={handleInputChange} className="pl-10 bg-input border-primary focus:ring-accent" placeholder="+254 700 000 000" disabled={isSaving}/> </div> </div>
          </div>
          <div className="space-y-1.5"> <Label htmlFor="socialFacebook" className="text-base">Facebook URL</Label> <div className="relative"> <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="socialFacebook" name="socialFacebook" type="url" value={settings.socialFacebook || ''} onChange={handleInputChange} className="pl-10 bg-input border-primary focus:ring-accent" placeholder="https://facebook.com/yourstore" disabled={isSaving}/> </div> </div>
          <div className="space-y-1.5"> <Label htmlFor="socialTwitter" className="text-base">Twitter/X URL</Label> <div className="relative"> <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="socialTwitter" name="socialTwitter" type="url" value={settings.socialTwitter || ''} onChange={handleInputChange} className="pl-10 bg-input border-primary focus:ring-accent" placeholder="https://twitter.com/yourstore" disabled={isSaving}/> </div> </div>
          <div className="space-y-1.5"> <Label htmlFor="socialInstagram" className="text-base">Instagram URL</Label> <div className="relative"> <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="socialInstagram" name="socialInstagram" type="url" value={settings.socialInstagram || ''} onChange={handleInputChange} className="pl-10 bg-input border-primary focus:ring-accent" placeholder="https://instagram.com/yourstore" disabled={isSaving}/> </div> </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card border-border shadow-md">
        <CardHeader><CardTitle className="text-xl font-semibold text-glow-accent">Payout Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-1.5"> <Label htmlFor="payoutMpesaNumber" className="text-base">M-Pesa Payout Number</Label> <div className="relative"> <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input id="payoutMpesaNumber" name="payoutMpesaNumber" type="tel" value={settings.payoutMpesaNumber || ''} onChange={handleInputChange} className="pl-10 bg-input border-primary focus:ring-accent" placeholder="07XX XXX XXX" title="M-Pesa payout number" disabled={isSaving}/> </div> <p className="text-xs text-muted-foreground">Ensure this number is registered for M-Pesa.</p> </div>
            <Button type="button" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={isSaving}> Verify Payout Details (Coming Soon) </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-glow-accent">Review Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-base">Review Notifications</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="reviewNotifications" 
                  checked={settings.reviewNotifications} 
                  onCheckedChange={(checked) => handleSettingChange('reviewNotifications', checked)}
                  disabled={isSaving}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="reviewNotifications" className="text-sm text-muted-foreground">Get notified when you receive new reviews</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Auto-Reply Templates</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="useAutoReply" 
                  checked={settings.useAutoReply} 
                  onCheckedChange={(checked) => handleSettingChange('useAutoReply', checked)}
                  disabled={isSaving}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="useAutoReply" className="text-sm text-muted-foreground">Use AI-powered response templates</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CardFooter className="border-t border-border/50 pt-6 flex justify-end">
        <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" disabled={isSaving || isLoading || isUploadingLogo || isUploadingBanner}>
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </CardFooter>
    </form>
  );
}

