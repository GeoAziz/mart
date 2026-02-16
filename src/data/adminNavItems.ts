import { 
  User,
  BarChartBig, 
  Users, 
  HeartPulse, 
  ShoppingBag, 
  Tag, 
  ListOrdered, 
  Star, 
  DollarSign, 
  Shield,
  Palette,
  Ticket,
  Edit
} from 'lucide-react';
import type { NavItem } from '@/components/dashboard/DashboardNav';

export const adminNavItems: NavItem[] = [
  { 
    sectionTitle: "Overview & Site", 
    href: "#", 
    label: "Overview & Site", 
    icon: User 
  },
  { 
    href: "/admin/overview", 
    label: "Dashboard", 
    icon: BarChartBig,
    adminOnly: true 
  },
  { 
    href: "/admin/users", 
    label: "User Management", 
    icon: Users,
    adminOnly: true 
  },
  { 
    href: "/admin/site-health", 
    label: "Site Health", 
    icon: HeartPulse,
    adminOnly: true 
  }, 
  { 
    sectionTitle: "E-Commerce", 
    href: "#", 
    label: "E-Commerce", 
    icon: User 
  },
  { 
    href: "/admin/products", 
    label: "Product Moderation", 
    icon: ShoppingBag,
    adminOnly: true 
  },
  { 
    href: "/admin/categories", 
    label: "Category Management", 
    icon: Tag,
    adminOnly: true 
  },
  { 
    href: "/admin/orders", 
    label: "Order Overview", 
    icon: ListOrdered,
    adminOnly: true 
  }, 
  { 
    href: "/admin/reviews", 
    label: "Review Management", 
    icon: Star,
    adminOnly: true 
  },
  { 
    href: "/admin/payouts", 
    label: "Vendor Payouts", 
    icon: DollarSign,
    adminOnly: true 
  },
  { 
    href: "/admin/refunds", 
    label: "Refund Management", 
    icon: Shield,
    adminOnly: true 
  },
  { 
    sectionTitle: "Content & Marketing", 
    href: "#", 
    label: "Content & Marketing", 
    icon: User 
  },
  { 
    href: "/admin/cms/home", 
    label: "CMS - Home", 
    icon: Palette,
    adminOnly: true 
  },
  { 
    href: "/admin/promotions", 
    label: "Promotions", 
    icon: Ticket,
    adminOnly: true 
  },
  { 
    href: "/admin/cms/content", 
    label: "CMS - Content", 
    icon: Edit,
    adminOnly: true 
  },
];
