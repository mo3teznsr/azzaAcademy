import { TeacherShell } from '@/components/shell/area-shells';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TeacherShell>{children}</TeacherShell>;
}
