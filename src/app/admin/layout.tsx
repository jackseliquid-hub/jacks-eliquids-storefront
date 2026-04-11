import { requireKitchenAccess } from '@/lib/roles.server';
import AdminNav from './AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side role check — redirects to / if not kitchen staff
  const role = await requireKitchenAccess();

  return (
    <AdminNav role={role}>
      {children}
    </AdminNav>
  );
}