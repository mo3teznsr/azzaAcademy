import { RoleGate } from '@/components/shell/role-gate';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate roles={['STUDENT', 'ADMIN']}>{children}</RoleGate>;
}
