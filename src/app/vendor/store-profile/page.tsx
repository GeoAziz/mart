'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import * as Icons from '../../../components/icons';
import { Loader2, Upload } from 'lucide-react';

interface StoreProfile {
  id: string;
  name: string;
  description: string;
  logo: string;
  banner: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  businessHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

const defaultProfile: StoreProfile = {
  id: '',
  name: '',
  description: '',
  logo: '',
  banner: '',
  address: '',
  city: '',
  country: '',
  postalCode: '',
  phone: '',
  email: '',
  website: '',
  socialLinks: {},
  businessHours: {
    monday: '9:00 AM - 5:00 PM',
    tuesday: '9:00 AM - 5:00 PM',
    wednesday: '9:00 AM - 5:00 PM',
    thursday: '9:00 AM - 5:00 PM',
    friday: '9:00 AM - 5:00 PM',
    saturday: '10:00 AM - 2:00 PM',
    sunday: 'Closed'
  }
};

export default function StoreProfilePage() {
  const [profile, setProfile] = useState<StoreProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendor/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch profile');
        
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load store profile',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, toast]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialLinkChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value
      }
    }));
  };

  const handleBusinessHourChange = (
    day: keyof StoreProfile['businessHours'],
    value: string
  ) => {
    setProfile(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: value
      }
    }));
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'banner'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size should be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    if (type === 'logo') {
      setLogoFile(file);
    } else {
      setBannerFile(file);
    }
  };

  const uploadFile = async (file: File, type: 'logo' | 'banner') => {
    if (!currentUser) return null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const token = await currentUser.getIdToken();
    const response = await fetch('/api/vendor/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    const { url } = await response.json();
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    try {
      // Upload new files if any
      if (logoFile) {
        const logoUrl = await uploadFile(logoFile, 'logo');
        if (logoUrl) profile.logo = logoUrl;
      }

      if (bannerFile) {
        const bannerUrl = await uploadFile(bannerFile, 'banner');
        if (bannerUrl) profile.banner = bannerUrl;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) throw new Error('Failed to update profile');

      toast({
        title: 'Success',
        description: 'Store profile updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update store profile',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Store Profile</h2>
          <p className="text-muted-foreground">
            Manage your store's public profile and information
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Store Description</Label>
              <Textarea
                id="description"
                name="description"
                value={profile.description}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
          </div>

          {/* Store Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Store Media</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Store Logo</Label>
                <div className="flex items-center gap-4">
                  {profile.logo && (
                    <img
                      src={profile.logo}
                      alt="Store Logo"
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner">Store Banner</Label>
                <div className="flex items-center gap-4">
                  {profile.banner && (
                    <img
                      src={profile.banner}
                      alt="Store Banner"
                      className="h-16 w-32 object-cover rounded-lg"
                    />
                  )}
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'banner')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={profile.website}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Social Media</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  name="facebook"
                  value={profile.socialLinks.facebook || ''}
                  onChange={handleSocialLinkChange}
                  placeholder="Facebook URL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  name="twitter"
                  value={profile.socialLinks.twitter || ''}
                  onChange={handleSocialLinkChange}
                  placeholder="Twitter URL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  value={profile.socialLinks.instagram || ''}
                  onChange={handleSocialLinkChange}
                  placeholder="Instagram URL"
                />
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Business Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(profile.businessHours).map(([day, hours]) => (
                <div key={day} className="space-y-2">
                  <Label htmlFor={day}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Label>
                  <Input
                    id={day}
                    value={hours}
                    onChange={(e) => 
                      handleBusinessHourChange(
                        day as keyof StoreProfile['businessHours'],
                        e.target.value
                      )
                    }
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
