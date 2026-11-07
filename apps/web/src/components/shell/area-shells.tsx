'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/use-auth';
import { AppShell } from './app-shell';
import { adminNav, studentNav, teacherNav } from './nav-config';

export function StudentShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <AppShell variant="student" groups={studentNav(t)} settingsHref="/settings">
      {children}
    </AppShell>
  );
}

export function TeacherShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <AppShell variant="teacher" groups={teacherNav(t)} settingsHref="/studio/settings">
      {children}
    </AppShell>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <AppShell variant="admin" groups={adminNav(t)} settingsHref="/admin/settings">
      {children}
    </AppShell>
  );
}

/** Picks the shell of the signed-in role (shared pages like /messages and /support). */
export function RoleShell({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role === 'ADMIN') return <AdminShell>{children}</AdminShell>;
  if (role === 'TEACHER') return <TeacherShell>{children}</TeacherShell>;
  return <StudentShell>{children}</StudentShell>;
}
