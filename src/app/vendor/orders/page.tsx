import { redirect } from 'next/navigation';

export default function VendorOrdersRedirect() {
  redirect('/vendor/orders/all');
}

