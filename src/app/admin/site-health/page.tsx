
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Server, Database, Activity, Bell, Settings, ExternalLink, BarChartHorizontalBig, ShieldCheck, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label'; // Added for Progress bar labels

const MetricCard = ({ title, value, icon, status, description }: { title: string; value: string | number; icon: React.ReactNode; status?: 'good' | 'warning' | 'critical'; description?: string }) => {
  let statusColor = 'text-primary';
  if (status === 'good') statusColor = 'text-green-400';
  if (status === 'warning') statusColor = 'text-yellow-400';
  if (status === 'critical') statusColor = 'text-red-400';

  return (
    <Card className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-glow-accent">{title}</CardTitle>
          <div className={statusColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${statusColor}`}>{value}{typeof value === 'number' && title.toLowerCase().includes('uptime') ? '%' : ''}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default function SiteHealthPage() {
  // Placeholder data
  const systemStatus = {
    overall: 'All Systems Operational',
    lastChecked: '2 minutes ago',
    uptime: 99.98,
    responseTime: 120, // ms
  };

  const serviceStatuses = [
    { name: 'API Gateway', status: 'Operational', icon: <Server className="h-5 w-5" /> },
    { name: 'Database Cluster', status: 'Operational', icon: <Database className="h-5 w-5" /> },
    { name: 'Payment Processor', status: 'Minor Latency', icon: <Server className="h-5 w-5" /> },
    { name: 'Image Processing Service', status: 'Operational', icon: <Server className="h-5 w-5" /> },
    { name: 'AI Services', status: 'Operational', icon: <Activity className="h-5 w-5" /> },
  ];

  const recentAlerts = [
    { id: 'alert1', severity: 'Warning', message: 'High CPU usage on worker node 3.', timestamp: '15 mins ago', resolved: false },
    { id: 'alert2', severity: 'Info', message: 'Database backup completed successfully.', timestamp: '1 hour ago', resolved: true },
  ];

  const performanceMetrics = {
    cpuUsage: 45, // percentage
    memoryUsage: 60, // percentage
    activeConnections: 1230,
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status.toLowerCase().includes('operational')) return 'bg-green-500/20 text-green-300 border-green-400';
    if (status.toLowerCase().includes('latency') || status.toLowerCase().includes('degraded')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    if (status.toLowerCase().includes('outage') || status.toLowerCase().includes('critical')) return 'bg-red-500/20 text-red-300 border-red-400';
    return 'bg-muted/50 text-muted-foreground border-border';
  };
   const getAlertBadgeVariant = (severity: string) => {
    if (severity.toLowerCase() === 'critical') return 'bg-red-500/20 text-red-300 border-red-400';
    if (severity.toLowerCase() === 'warning') return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    return 'bg-blue-500/20 text-blue-300 border-blue-400'; // Info or others
  };


  return (
    <div className="space-y-8">
      <Card className="bg-card border-primary shadow-xl glow-edge-primary">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
                    <ShieldCheck className="mr-3 h-7 w-7 text-primary"/> Site Health Overview
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Current operational status of ZilaCart services. Last check: {systemStatus.lastChecked}
                </CardDescription>
            </div>
            <Button variant="outline" className="mt-3 sm:mt-0 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <RefreshCw className="mr-2 h-4 w-4"/> Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard title="Overall Status" value={systemStatus.overall} icon={<CheckCircle className="h-6 w-6" />} status="good" />
            <MetricCard title="System Uptime (24h)" value={systemStatus.uptime} icon={<BarChartHorizontalBig className="h-6 w-6" />} status={systemStatus.uptime > 99.9 ? 'good' : 'warning'} description="Target: > 99.95%" />
            <MetricCard title="Avg. Response Time" value={`${systemStatus.responseTime} ms`} icon={<Activity className="h-6 w-6" />} status={systemStatus.responseTime < 200 ? 'good' : 'warning'} description="Target: < 200ms" />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent flex items-center"><Server className="mr-2 h-5 w-5 text-accent"/>Service Status</CardTitle>
            <CardDescription className="text-muted-foreground">Individual status of core ZilaCart services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {serviceStatuses.map(service => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border/50">
                <div className="flex items-center">
                  {service.icon}
                  <span className="ml-3 font-medium text-foreground">{service.name}</span>
                </div>
                <Badge variant="outline" className={getStatusBadgeVariant(service.status)}>{service.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent flex items-center"><Bell className="mr-2 h-5 w-5 text-accent"/>Recent Alerts</CardTitle>
            <CardDescription className="text-muted-foreground">Critical and warning alerts from the last 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length > 0 ? recentAlerts.map(alert => (
              <div key={alert.id} className={`p-3 rounded-md border ${getAlertBadgeVariant(alert.severity)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {alert.severity === 'Critical' && <AlertTriangle className="h-5 w-5 mr-2 text-red-300" />}
                    {alert.severity === 'Warning' && <AlertTriangle className="h-5 w-5 mr-2 text-yellow-300" />}
                    <span className="font-medium">{alert.message}</span>
                  </div>
                  <Badge variant="outline" className={getAlertBadgeVariant(alert.severity)}>{alert.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{alert.timestamp} {alert.resolved && "(Resolved)"}</p>
              </div>
            )) : <p className="text-muted-foreground">No recent critical alerts. System is stable.</p>}
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-glow-accent flex items-center"><Settings className="mr-2 h-5 w-5 text-accent"/>Performance Metrics</CardTitle>
          <CardDescription className="text-muted-foreground">Key performance indicators for server resources.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <div className="flex justify-between mb-1">
                    <Label htmlFor="cpu-usage" className="text-sm">CPU Utilization</Label>
                    <span className="text-sm font-medium text-primary">{performanceMetrics.cpuUsage}%</span>
                </div>
                <Progress value={performanceMetrics.cpuUsage} id="cpu-usage" className="h-2 [&>div]:bg-primary" aria-label={`CPU Usage: ${performanceMetrics.cpuUsage}%`} />
            </div>
             <div>
                <div className="flex justify-between mb-1">
                    <Label htmlFor="memory-usage" className="text-sm">Memory Usage</Label>
                    <span className="text-sm font-medium text-primary">{performanceMetrics.memoryUsage}%</span>
                </div>
                <Progress value={performanceMetrics.memoryUsage} id="memory-usage" className="h-2 [&>div]:bg-accent" aria-label={`Memory Usage: ${performanceMetrics.memoryUsage}%`} />
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md border border-border/50">
              <span className="text-muted-foreground">Active Database Connections:</span>
              <span className="font-semibold text-primary">{performanceMetrics.activeConnections}</span>
            </div>
        </CardContent>
        <CardFooter>
            <Button variant="link" className="text-accent hover:underline p-0 h-auto">
                View Detailed Performance Dashboard <ExternalLink className="ml-1 h-4 w-4"/>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

