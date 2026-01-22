import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusBadgeVariant(status: string): "success" | "warning" | "info" | "pending" | "destructive" | "default" {
  const statusMap: Record<string, "success" | "warning" | "info" | "pending" | "destructive" | "default"> = {
    delivered: "success",
    completed: "success",
    active: "success",
    pending: "pending",
    processing: "info",
    shipped: "info",
    cancelled: "destructive",
    rejected: "destructive",
    draft: "warning",
  };
  return statusMap[status.toLowerCase()] || "default";
}
