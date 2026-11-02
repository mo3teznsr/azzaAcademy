'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/provider';
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
