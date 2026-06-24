# Vendor UI Component Guide

## Overview
This guide provides documentation for all vendor dashboard UI components, their usage, props, and examples.

## State Components

### ErrorState
Displays error messages with retry functionality.

**Location**: `src/components/states/ErrorState.tsx`

**Props**:
```typescript
interface ErrorStateProps {
  error?: Error | string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}
```

**Usage**:
```tsx
import { ErrorState } from '@/components/states/ErrorState';

// With error object
<ErrorState 
  error={new Error('Failed to load data')} 
  onRetry={() => refetch()} 
/>

// With custom title and description
<ErrorState
  title="Unable to load products"
  description="Check your internet connection and try again"
  onRetry={() => window.location.reload()}
/>
```

---

### EmptyState
Shows when no data is available with optional action button.

**Location**: `src/components/states/EmptyState.tsx`

**Props**:
```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}
```

**Usage**:
```tsx
import { EmptyState } from '@/components/states/EmptyState';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

<EmptyState
  icon={Package}
  title="No products yet"
  description="Start by adding your first product to your store"
  action={
    <Button onClick={() => router.push('/vendor/products/add')}>
      Add Product
    </Button>
  }
/>
```

---

## Dashboard Components

### QuickActionsPanel
Panel with quick action buttons for common tasks.

**Location**: `src/components/vendor/QuickActionsPanel.tsx`

**Props**: None (self-contained)

**Usage**:
```tsx
import { QuickActionsPanel } from '@/components/vendor/QuickActionsPanel';

<QuickActionsPanel />
```

**Customization**:
Edit the `actions` array in the component to add/remove actions:
```typescript
const actions = [
  {
    icon: PlusCircle,
    label: 'Add Product',
    href: '/vendor/products/add',
    variant: 'default' as const,
  },
  // Add more actions...
];
```

---

### StatCardWithTrend
Metric card with trend indicator.

**Location**: `src/components/vendor/StatCardWithTrend.tsx`

**Props**:
```typescript
interface StatCardWithTrendProps {
  title: string;
  value: string | number;
  trend?: number; // +12 means 12% increase
  icon: LucideIcon;
  urgent?: boolean;
  warning?: boolean;
  className?: string;
}
```

**Usage**:
```tsx
import { StatCardWithTrend } from '@/components/vendor/StatCardWithTrend';
import { DollarSign } from 'lucide-react';

<StatCardWithTrend
  title="Total Revenue"
  value="KSh 125,000"
  trend={12}
  icon={DollarSign}
/>

// With warning state
<StatCardWithTrend
  title="Low Stock Items"
  value={5}
  icon={Package}
  warning={true}
/>
```

---

### RecentActivityFeed
Timeline of recent vendor activities.

**Location**: `src/components/vendor/RecentActivityFeed.tsx`

**Props**:
```typescript
interface Activity {
  id: string;
  type: 'order' | 'product' | 'payment' | 'message' | 'review';
  title: string;
  description: string;
  timestamp: Date | string;
  status?: 'success' | 'warning' | 'info' | 'pending';
}

interface RecentActivityFeedProps {
  activities?: Activity[];
  maxHeight?: string;
}
```

**Usage**:
```tsx
import { RecentActivityFeed } from '@/components/vendor/RecentActivityFeed';

const activities = [
  {
    id: '1',
    type: 'order',
    title: 'New Order Received',
    description: 'Order #12345 - KSh 2,500',
    timestamp: new Date(),
    status: 'pending',
  },
  // More activities...
];

<RecentActivityFeed activities={activities} maxHeight="400px" />
```

---

### NotificationCenter
Bell icon with dropdown showing notifications.

**Location**: `src/components/vendor/NotificationCenter.tsx`

**Props**:
```typescript
interface Notification {
  id: string;
  type: 'order' | 'product' | 'message' | 'payment';
  title: string;
  description: string;
  timestamp: Date | string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
}
```

**Usage**:
```tsx
import { NotificationCenter } from '@/components/vendor/NotificationCenter';

<NotificationCenter
  notifications={notifications}
  onMarkAsRead={(id) => markAsRead(id)}
  onMarkAllAsRead={() => markAllAsRead()}
  onDismiss={(id) => dismissNotification(id)}
/>
```

---

## Product Management Components

### ProductMobileCard
Mobile-optimized product card.

**Location**: `src/components/vendor/ProductMobileCard.tsx`

**Props**:
```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: 'active' | 'draft' | 'archived';
  imageUrl?: string;
  category?: string;
}

interface ProductMobileCardProps {
  product: Product;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}
```

**Usage**:
```tsx
import { ProductMobileCard } from '@/components/vendor/ProductMobileCard';

<ProductMobileCard
  product={product}
  selected={selectedIds.includes(product.id)}
  onSelect={(id, selected) => handleSelect(id, selected)}
  onEdit={(id) => router.push(`/vendor/products/${id}/edit`)}
  onDelete={(id) => handleDelete(id)}
  onView={(id) => router.push(`/products/${id}`)}
/>
```

---

### BulkActionsToolbar
Sticky toolbar for bulk actions on selected items.

**Location**: `src/components/vendor/BulkActionsToolbar.tsx`

**Props**:
```typescript
interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkEdit?: () => void;
  onBulkDelete?: () => void;
  onBulkUpdatePrice?: () => void;
  onBulkChangeCategory?: () => void;
}
```

**Usage**:
```tsx
import { BulkActionsToolbar } from '@/components/vendor/BulkActionsToolbar';

<BulkActionsToolbar
  selectedCount={selectedProducts.length}
  onClearSelection={() => setSelectedProducts([])}
  onBulkEdit={() => openBulkEditDialog()}
  onBulkDelete={() => handleBulkDelete()}
  onBulkUpdatePrice={() => openPriceUpdateDialog()}
  onBulkChangeCategory={() => openCategoryDialog()}
/>
```

---

### ImageUploadZone
Drag-drop image upload with camera support.

**Location**: `src/components/vendor/ImageUploadZone.tsx`

**Props**:
```typescript
interface ImageUploadZoneProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxSize?: number; // in bytes
  className?: string;
}
```

**Usage**:
```tsx
import { ImageUploadZone } from '@/components/vendor/ImageUploadZone';

const [images, setImages] = useState<string[]>([]);

<ImageUploadZone
  images={images}
  onImagesChange={setImages}
  maxImages={5}
  maxSize={5 * 1024 * 1024} // 5MB
/>
```

**Features**:
- Drag & drop multiple images
- Click to browse files
- Camera capture on mobile
- Reorder images via drag & drop
- Remove individual images
- File size validation
- Image preview grid

---

## Hooks

### useVendorNotifications
Hook for real-time vendor notifications.

**Location**: `src/hooks/useVendorNotifications.ts`

**Usage**:
```tsx
import { useVendorNotifications } from '@/hooks/useVendorNotifications';

function VendorDashboard() {
  const { currentUser } = useAuth();
  const { showNotification } = useVendorNotifications(currentUser?.uid || null);

  // Hook automatically sets up Firestore listeners
  // and shows toast notifications for events

  return <div>...</div>;
}
```

**Note**: Requires Firestore setup with proper security rules.

---

### useKeyboardShortcuts
Hook for registering keyboard shortcuts.

**Location**: `src/hooks/useKeyboardShortcuts.ts`

**Usage**:
```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRouter } from 'next/navigation';

function VendorLayout() {
  const router = useRouter();

  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      action: () => router.push('/vendor/products/add'),
      description: 'Add new product',
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => setSearchOpen(true),
      description: 'Open search',
    },
  ]);

  return <div>...</div>;
}
```

---

## Design System Classes

**Location**: `src/styles/vendor-theme.css`

### Typography
```css
.vendor-h1  /* Headings */
.vendor-h2
.vendor-h3
.vendor-h4
.vendor-body
.vendor-small
.vendor-xs
```

### Spacing
```css
.vendor-page-padding      /* Page wrapper */
.vendor-card-padding      /* Card content */
.vendor-section-spacing   /* Between sections */
.vendor-inline-spacing    /* Inline elements */
```

### Status Colors
```css
.vendor-status-success
.vendor-status-warning
.vendor-status-error
.vendor-status-info
```

### Grids
```css
.vendor-grid-2  /* 2 columns */
.vendor-grid-3  /* 3 columns */
.vendor-grid-4  /* 4 columns */
```

### Utilities
```css
.vendor-touch-target     /* Min 44x44px */
.vendor-hover-lift       /* Lift on hover */
.vendor-interactive      /* Scale on interaction */
.vendor-focus-ring       /* Accessible focus */
```

---

## Best Practices

### 1. Loading States
Always show loading states with skeletons:
```tsx
{isLoading && (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
)}
```

### 2. Error Handling
Use ErrorState for all errors:
```tsx
{error && (
  <ErrorState
    error={error}
    onRetry={() => refetch()}
  />
)}
```

### 3. Empty States
Provide guidance when no data:
```tsx
{data.length === 0 && (
  <EmptyState
    icon={Icon}
    title="No items yet"
    description="Get started by adding your first item"
    action={<Button>Add Item</Button>}
  />
)}
```

### 4. Mobile Responsiveness
Use responsive components:
```tsx
{isMobile ? (
  <ProductMobileCard {...props} />
) : (
  <ProductTable {...props} />
)}
```

### 5. Accessibility
- Add ARIA labels
- Ensure keyboard navigation
- Use semantic HTML
- Test with screen readers

---

## Troubleshooting

### Component Not Rendering?
1. Check import path
2. Verify props are correct
3. Check console for errors
4. Ensure parent component is client-side (`'use client'`)

### Styles Not Applying?
1. Import vendor-theme.css in layout
2. Check Tailwind config
3. Verify class names
4. Check for CSS conflicts

### TypeScript Errors?
1. Check prop types
2. Ensure interfaces match
3. Update imports
4. Run `npm run type-check`

---

**Last Updated**: February 2026
**Version**: 1.0