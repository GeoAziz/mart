import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Admin root usually redirects to a specific dashboard page like overview
  redirect('/admin/overview');
  // return null; // Or a loading state if preferred, but redirect is cleaner
}
