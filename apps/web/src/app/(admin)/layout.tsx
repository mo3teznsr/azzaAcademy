import { RoleGate } from '@/components/shell/role-gate';
import { AdminShell } from '@/components/shell/area-shells';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate roles={['ADMIN']}>
      <AdminShell>{children}</AdminShell>
    </RoleGate>
  );
}
