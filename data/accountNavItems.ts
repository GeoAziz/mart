import { 
  User, 
  ShoppingBag, 
  Heart, 
  MapPin, 
  CreditCard, 
  Settings,
  Home,
  LayoutDashboard
} from 'lucide-react';
import type { NavItem } from '@/components/dashboard/DashboardNav';

export const accountNavItems: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/account',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/account/orders',
    label: 'Orders',
    icon: ShoppingBag,
  },
  {
    href: '/account/wishlist',
    label: 'Wishlist',
    icon: Heart,
  },
  {
    href: '/account/addresses',
    label: 'Addresses',
    icon: MapPin,
  },
  {
    href: '/account/payment-methods',
    label: 'Payment Methods',
    icon: CreditCard,
  },
  {
    href: '/account/settings',
    label: 'Settings',
    icon: Settings,
  },
];