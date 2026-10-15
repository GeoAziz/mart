import { 
  Home,
  LayoutDashboard,
  ShoppingBag, 
  Heart, 
  MapPin, 
  User, 
  Lock, 
  Bell 
} from 'lucide-react';

export interface AccountNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: 'Shopping' | 'Account Settings';
}

export const accountNavItems: AccountNavItem[] = [
  {
    title: 'Storefront',
    href: '/',
    icon: Home,
    section: 'Shopping',
  },
  {
    title: 'Dashboard',
    href: '/account',
    icon: LayoutDashboard,
    section: 'Shopping',
  },
  {
    title: 'My Orders',
    href: '/account/orders',
    icon: ShoppingBag,
    section: 'Shopping',
  },
  {
    title: 'Wishlist',
    href: '/account/wishlist',
    icon: Heart,
    section: 'Shopping',
  },
  {
    title: 'Saved Addresses',
    href: '/account/addresses',
    icon: MapPin,
    section: 'Shopping',
  },
  {
    title: 'Personal Info',
    href: '/account/profile',
    icon: User,
    section: 'Account Settings',
  },
  {
    title: 'Change Password',
    href: '/account/change-password',
    icon: Lock,
    section: 'Account Settings',
  },
  {
    title: 'Notifications',
    href: '/account/notifications',
    icon: Bell,
    section: 'Account Settings',
  },
];
