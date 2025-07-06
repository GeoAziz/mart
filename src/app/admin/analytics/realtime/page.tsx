'use client';

import { LiveSalesTracker } from '@/components/analytics/realtime/LiveSalesTracker';
import { RealTimeInventory } from '@/components/analytics/realtime/RealTimeInventory';
import { InstantNotifications } from '@/components/analytics/realtime/InstantNotifications';
import { LiveMetricsDashboard } from '@/components/analytics/realtime/LiveMetricsDashboard';

export default function RealTimeAnalyticsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Main Dashboard */}
      <LiveMetricsDashboard />

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveSalesTracker />
        </div>
        <div>
          <RealTimeInventory />
        </div>
      </div>

      {/* Notifications Section */}
      <div className="w-full">
        <InstantNotifications />
      </div>
    </div>
  );
}
