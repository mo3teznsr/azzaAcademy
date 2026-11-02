import { RoleGate } from '@/components/shell/role-gate';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate roles={['TEACHER', 'ADMIN']}>{children}</RoleGate>;
}
