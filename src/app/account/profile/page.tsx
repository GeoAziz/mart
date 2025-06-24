
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Edit3, Mail, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function ProfilePage() {
  const { currentUser, userProfile, refreshUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  // Email is typically not directly editable by users due to auth implications
  const [email, setEmail] = useState(''); 
  const [joinDate, setJoinDate] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.fullName || '');
      setEmail(userProfile.email || '');
      setJoinDate(userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A');
    }
  }, [userProfile]);

  const handleSaveChanges = async () => {
    if (!currentUser || !userProfile) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    if (name.trim().length < 2) {
        toast({ title: "Validation Error", description: "Full name must be at least 2 characters.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/users/${currentUser.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile.");
      }
      
      await refreshUserProfile(); // Refresh profile in context
      toast({
        title: 'Profile Updated',
        description: 'Your personal information has been saved.',
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : "Could not save your profile.",
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (userProfile) {
      setName(userProfile.fullName || '');
    }
    setIsEditing(false);
  };
  
  if (authLoading && !userProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading profile...</p>
      </div>
    );
  }


  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <User className="mr-3 h-6 w-6 text-primary" /> Personal Information
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            View and update your personal details. Member since {joinDate}.
          </CardDescription>
        </div>
        {!isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={isSaving}>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="name" className="text-muted-foreground flex items-center mb-1">
            <User className="mr-2 h-4 w-4" /> Full Name
          </Label>
          {isEditing ? (
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="text-lg bg-input border-primary focus:ring-accent"
              disabled={isSaving}
            />
          ) : (
            <p className="text-lg font-medium text-foreground p-2">{name || 'Not set'}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="email" className="text-muted-foreground flex items-center mb-1">
            <Mail className="mr-2 h-4 w-4" /> Email Address
          </Label>
          {/* Email is typically not editable directly by users */}
          <p className="text-lg font-medium text-foreground p-2 bg-muted/30 rounded-md">{email || 'Not available'}</p>
          <p className="text-xs text-muted-foreground mt-1 pl-2">Email address cannot be changed here. Contact support for assistance.</p>
        </div>

        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={handleCancelEdit} className="text-muted-foreground hover:text-destructive" disabled={isSaving}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSaveChanges} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving || name === (userProfile?.fullName || '')}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>
      {!isEditing && (
        <CardFooter className="border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground">
                To ensure the security of your account, some information changes might require additional verification or support assistance.
            </p>
        </CardFooter>
      )}
    </Card>
  );
}
