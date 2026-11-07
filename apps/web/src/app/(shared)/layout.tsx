import { RoleGate } from '@/components/shell/role-gate';
import { RoleShell } from '@/components/shell/area-shells';

/** Signed-in pages every role shares (messages, support, announcements), inside that role's own shell. */
export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate roles={['STUDENT', 'TEACHER', 'ADMIN']}>
      <RoleShell>{children}</RoleShell>
    </RoleGate>
  );
}
