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

export const accountNavItems = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
  },
  {
    title: 'Dashboard',
    href: '/account',
    icon: LayoutDashboard,
  },
  {
    title: 'Orders',
    href: '/account/orders',
    icon: ShoppingBag,
  },
  {
    title: 'Wishlist',
    href: '/account/wishlist',
    icon: Heart,
  },
  {
    title: 'Addresses',
    href: '/account/addresses',
    icon: MapPin,
  },
  {
    title: 'Payment Methods',
    href: '/account/payment-methods',
    icon: CreditCard,
  },
  {
    title: 'Settings',
    href: '/account/settings',
    icon: Settings,
  },
];
