
'use client';

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { authClient, db, isFirebaseConfigured } from '@/lib/firebase-client';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { WishlistItem as WishlistItemApiType } from '@/app/api/users/me/wishlist/route';
import type { AppliedPromotion } from '@/lib/types';


export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string | null;
  role: 'customer' | 'vendor' | 'admin';
  status: 'active' | 'pending_approval' | 'suspended';
  createdAt: Date; 
  updatedAt?: Date;
}

export interface CartItemClient {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
  dataAiHint?: string;
}

interface SaveCartApiItem {
  productId: string;
  quantity: number;
}

export type WishlistItemClient = WishlistItemApiType;

export interface ProductForWishlist {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  rating?: number;
  dataAiHint?: string;
}


interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email_param: string, password_param: string, fullName_param: string) => Promise<void>;
  logIn: (email_param: string, password_param: string) => Promise<void>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email_param: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  cart: CartItemClient[];
  isCartLoading: boolean;
  isCartSaving: boolean;
  addItemToCart: (productDetails: { id: string; name: string; price: number; imageUrl?: string; dataAiHint?: string }, quantity: number) => Promise<void>;
  updateCartItemQuantity: (productId: string, newQuantity: number) => Promise<void>;
  removeCartItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  wishlistItems: WishlistItemClient[];
  isWishlistLoading: boolean;
  isWishlistSaving: boolean;
  toggleWishlistItem: (product: ProductForWishlist) => Promise<void>;
  appliedPromotion: AppliedPromotion | null;
  isPromotionLoading: boolean;
  applyPromotion: (code: string) => Promise<void>;
  removePromotion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Debounce helper function
function debounce<F extends (...args: any[]) => void>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function(this: any, ...args: Parameters<F>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func.apply(this, args), waitFor);
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItemClient[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [isCartSaving, setIsCartSaving] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<WishlistItemClient[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(true);
  const [isWishlistSaving, setIsWishlistSaving] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotion | null>(null);
  const [isPromotionLoading, setIsPromotionLoading] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchAndSetUserProfile = useCallback(async (user: User) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const profileData = userDocSnap.data();
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        fullName: profileData.fullName || user.displayName,
        role: profileData.role || 'customer',
        status: profileData.status || 'active',
        createdAt: profileData.createdAt?.toDate ? profileData.createdAt.toDate() : new Date(profileData.createdAt),
        updatedAt: profileData.updatedAt?.toDate ? profileData.updatedAt.toDate() : (profileData.updatedAt ? new Date(profileData.updatedAt) : undefined),
      };
      setUserProfile(profile);
      return profile;
    } else {
      console.warn(`User profile for ${user.uid} not found in Firestore.`);
      setUserProfile(null);
      return null;
    }
  }, []);

  const fetchCart = useCallback(async (user: User) => {
    setIsCartLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/cart', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch cart');
      const cartData = await response.json();
      setCart(cartData.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart([]);
    } finally {
      setIsCartLoading(false);
    }
  }, []);
  
  const fetchWishlist = useCallback(async (user: User) => {
    setIsWishlistLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/users/me/wishlist', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      const wishlistData: WishlistItemApiType[] = await response.json();
      setWishlistItems(wishlistData.map(item => ({...item, addedAt: new Date(item.addedAt)})));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setWishlistItems([]);
    } finally {
      setIsWishlistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(authClient, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      if (user) {
        await Promise.all([
          fetchAndSetUserProfile(user),
          fetchCart(user),
          fetchWishlist(user)
        ]);
      } else {
        setUserProfile(null);
        setCart([]);
        setWishlistItems([]);
        setAppliedPromotion(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAndSetUserProfile, fetchCart, fetchWishlist]);

  const saveCartToServer = useCallback(debounce(async (itemsToSave: CartItemClient[], user: User | null) => {
    if (!user) return;
    setIsCartSaving(true);
    try {
      const token = await user.getIdToken();
      const apiPayload: SaveCartApiItem[] = itemsToSave.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: apiPayload }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save cart to server.');
      }
    } catch (error) {
      console.error('Error saving cart to server:', error);
      toast({ title: 'Cart Sync Error', description: 'Could not save cart changes.', variant: 'destructive' });
    } finally {
      setIsCartSaving(false);
    }
  }, 1000), [toast]);

  const addItemToCart = async (productDetails: { id: string; name: string; price: number; imageUrl?: string; dataAiHint?: string }, quantity: number) => {
    const user = currentUser;
    if (!user) {
      toast({ title: 'Not Logged In', description: 'Please log in to add items to your cart.', variant: 'destructive' });
      router.push(`/auth/login?redirect=${pathname}`);
      return;
    }
    
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.productId === productDetails.id);
      let newCart: CartItemClient[];
      if (existingItemIndex > -1) {
        newCart = prevCart.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        newCart = [...prevCart, { 
          productId: productDetails.id, name: productDetails.name, price: productDetails.price, quantity, 
          imageUrl: productDetails.imageUrl, dataAiHint: productDetails.dataAiHint
        }];
      }
      saveCartToServer(newCart, user);
      return newCart;
    });
    toast({ title: 'Item Added', description: `${productDetails.name} added to cart.`});
  };

  const updateCartItemQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeCartItem(productId);
      return;
    }
    setCart(prevCart => {
      const newCart = prevCart.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      );
      saveCartToServer(newCart, currentUser);
      return newCart;
    });
  };

  const removeCartItem = async (productId: string) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.productId !== productId);
      saveCartToServer(newCart, currentUser);
      return newCart;
    });
  };

  const clearCart = async () => {
    setCart([]);
    setAppliedPromotion(null);
    await saveCartToServer([], currentUser);
  };

  const applyPromotion = async (code: string) => {
    if (!currentUser) return;
    setIsPromotionLoading(true);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/promotions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to apply promotion.');
      setAppliedPromotion(data.promotion);
      toast({ title: "Promotion Applied!", description: data.message });
    } catch (error) {
      toast({ title: "Apply Failed", description: error instanceof Error ? error.message : "Invalid code.", variant: "destructive" });
      setAppliedPromotion(null);
    } finally {
      setIsPromotionLoading(false);
    }
  };
  
  const removePromotion = () => {
    setAppliedPromotion(null);
    toast({ title: "Promotion Removed" });
  };

  const toggleWishlistItem = async (product: ProductForWishlist) => {
    if (!currentUser) {
      toast({ title: 'Not Logged In', description: 'Please log in to manage your wishlist.', variant: 'destructive' });
      router.push(`/auth/login?redirect=${pathname}`);
      return;
    }

    const originalWishlist = [...wishlistItems];
    const isInWishlist = originalWishlist.some(item => item.productId === product.id);

    setIsWishlistSaving(true);

    // Optimistically update UI for instant feedback
    if (isInWishlist) {
      setWishlistItems(prev => prev.filter(item => item.productId !== product.id));
    } else {
      const optimisticItem: WishlistItemClient = {
        productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl,
        category: product.category, rating: product.rating, dataAiHint: product.dataAiHint,
        addedAt: new Date(),
      };
      setWishlistItems(prev => [...prev, optimisticItem]);
    }

    try {
      const token = await currentUser.getIdToken();
      
      // Perform the actual API call
      if (isInWishlist) {
        const response = await fetch(`/api/users/me/wishlist/${product.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to remove from wishlist.');
        toast({ title: 'Wishlist Updated', description: `${product.name} removed from wishlist.` });
      } else {
        const response = await fetch('/api/users/me/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productId: product.id }),
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to add to wishlist.');
        toast({ title: 'Wishlist Updated', description: `${product.name} added to wishlist!` });
      }
      
      // On success, re-fetch the entire wishlist to ensure consistency with the backend.
      // This is more robust than patching the state manually and handles any backend-generated data.
      await fetchWishlist(currentUser);

    } catch (error) {
      // If the API call fails, revert the optimistic UI update
      setWishlistItems(originalWishlist);
      toast({ title: 'Wishlist Error', description: error instanceof Error ? error.message : 'Could not update wishlist.', variant: 'destructive' });
    } finally {
      setIsWishlistSaving(false);
    }
  };

  const signUp = async (email_param: string, password_param: string, fullName_param: string) => {
    if (!isFirebaseConfigured) {
      toast({ title: 'Application Not Configured', description: 'Please provide the Firebase API keys in the .env file and restart the server.', variant: 'destructive', duration: 10000 });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(authClient, email_param, password_param);
      await updateProfile(userCredential.user, { displayName: fullName_param });
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const initialProfileData: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'uid'> & { createdAt: Date } = { 
        email: userCredential.user.email, 
        fullName: fullName_param,
        role: 'customer', 
        status: 'active', 
        createdAt: new Date(),
      };
      await setDoc(userDocRef, initialProfileData);
      setUserProfile({ uid: userCredential.user.uid, ...initialProfileData });
      toast({ title: 'Signup Successful!', description: `Welcome, ${fullName_param}!` });
      router.push('/');
    } catch (error: any) {
      toast({ title: 'Signup Failed', description: error.message || 'Could not create account.', variant: 'destructive' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logIn = async (email_param: string, password_param: string) => {
    if (!isFirebaseConfigured) {
      toast({ title: 'Application Not Configured', description: 'Please provide the Firebase API keys in the .env file and restart the server.', variant: 'destructive', duration: 10000 });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(authClient, email_param, password_param);
      toast({ title: 'Login Successful!', description: 'Welcome back!' });
      router.push('/');
    } catch (error: any) {
      toast({ title: 'Login Failed', description: error.message || 'Invalid credentials.', variant: 'destructive' });
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    try {
      await signOut(authClient);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth/login');
    } catch (error: any) {
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
    }
  };

  const sendPasswordReset = async (email_param: string) => {
    if (!isFirebaseConfigured) {
      toast({ title: 'Application Not Configured', description: 'Please provide the Firebase API keys in the .env file and restart the server.', variant: 'destructive', duration: 10000 });
      return;
    }
    setLoading(true);
    try {
      await firebaseSendPasswordResetEmail(authClient, email_param);
      toast({ title: 'Password Reset Email Sent', description: 'Check your inbox for instructions.' });
    } catch (error: any) {
      toast({ title: 'Password Reset Failed', description: error.message, variant: 'destructive' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = useCallback(async () => {
    if (currentUser) {
      await fetchAndSetUserProfile(currentUser);
    }
  }, [currentUser, fetchAndSetUserProfile]);

  const value = {
    currentUser, userProfile, loading, signUp, logIn, logOut, sendPasswordReset, refreshUserProfile,
    cart, isCartLoading, isCartSaving, addItemToCart, updateCartItemQuantity, removeCartItem, clearCart,
    wishlistItems, isWishlistLoading, isWishlistSaving, toggleWishlistItem,
    appliedPromotion, isPromotionLoading, applyPromotion, removePromotion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
