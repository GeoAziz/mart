import type { NavItem } from '@/components/dashboard/DashboardNav';
import {
  BarChartBig,
  DollarSign,
  Edit,
  HeartPulse,
  ListOrdered,
  Palette,
  Shield,
  ShoppingBag,
  Star,
  Tag,
  Ticket,
  Users,
} from 'lucide-react';

export const adminNavItems: NavItem[] = [
  { sectionTitle: 'Overview & Site', href: '#', label: 'Overview & Site', icon: Users },
  { href: '/admin/overview', label: 'Dashboard', icon: BarChartBig },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/site-health', label: 'Site Health', icon: HeartPulse },
  { sectionTitle: 'E-Commerce', href: '#', label: 'E-Commerce', icon: ShoppingBag },
  { href: '/admin/products', label: 'Product Moderation', icon: ShoppingBag },
  { href: '/admin/categories', label: 'Category Management', icon: Tag },
  { href: '/admin/orders', label: 'Order Overview', icon: ListOrdered },
  { href: '/admin/reviews', label: 'Review Management', icon: Star },
  { href: '/admin/payouts', label: 'Vendor Payouts', icon: DollarSign },
  { href: '/admin/refunds', label: 'Refund Management', icon: Shield },
  { sectionTitle: 'Content & Marketing', href: '#', label: 'Content & Marketing', icon: Edit },
  { href: '/admin/cms/home', label: 'CMS - Home', icon: Palette },
  { href: '/admin/promotions', label: 'Promotions', icon: Ticket },
  { href: '/admin/cms/content', label: 'CMS - Content', icon: Edit },
];
