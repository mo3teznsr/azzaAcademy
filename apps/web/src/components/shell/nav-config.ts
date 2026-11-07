import {
  Award,
  BadgeDollarSign,
  ChartColumn,
  SquareCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  ListChecks,
  Compass,
  Home,
  Landmark,
  Languages,
  LayoutDashboard,
  Library,
  Radio,
  Receipt,
  Settings,
  Tags,
  Users,
  Wallet,
  Coins,
  Layers,
  Heart,
  Shapes,
  ArrowLeftRight,
  GraduationCap,
  LifeBuoy,
  Megaphone,
  type LucideIcon, Clapperboard } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** `live` = rooms on air; `applications` = pending instructor applications; `support` = open tickets. */
  badge?: 'live' | 'count' | 'applications' | 'support';
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const studentNav = (t: Dictionary): NavGroup[] => [
  {
    items: [
      { href: '/learn', label: t.nav.student.home, icon: Home },
      { href: '/', label: t.nav.student.explore, icon: Compass, exact: true },
      { href: '/schedule', label: t.nav.student.schedule, icon: CalendarDays },
      { href: '/library', label: t.nav.student.library, icon: Library },
      { href: '/saved', label: t.nav.student.saved, icon: Heart },
      { href: '/assignments', label: t.nav.student.assignments, icon: ClipboardList },
      { href: '/quizzes', label: t.learning.quizzes.nav, icon: ListChecks },
      { href: '/certificates', label: t.nav.student.certificates, icon: Award },
      { href: '/settings', label: t.nav.student.settings, icon: Settings },
    ],
  },
];

export const teacherNav = (t: Dictionary): NavGroup[] => [
  {
    items: [
      { href: '/studio', label: t.nav.teacher.studio, icon: Radio, exact: true },
      { href: '/studio/courses', label: t.nav.teacher.courses, icon: BookOpen },
      { href: '/studio/recordings', label: t.nav.teacher.recordings, icon: Clapperboard },
      { href: '/studio/grading', label: t.nav.teacher.grading, icon: SquareCheck },
      { href: '/studio/earnings', label: t.nav.teacher.earnings, icon: Wallet },
      { href: '/studio/settings', label: t.nav.teacher.settings, icon: Settings },
    ],
  },
];

export const adminNav = (t: Dictionary): NavGroup[] => [
  {
    items: [
      { href: '/admin', label: t.nav.admin.dashboard, icon: LayoutDashboard, exact: true },
      { href: '/admin/reports', label: t.nav.admin.reports, icon: ChartColumn },
      { href: '/admin/courses', label: t.nav.admin.courses, icon: BookOpen },
      { href: '/admin/batches', label: t.nav.admin.batches, icon: Layers },
      { href: '/admin/categories', label: t.nav.admin.categories, icon: Shapes },
      { href: '/admin/live', label: t.nav.admin.live, icon: Radio, badge: 'live' },
      { href: '/admin/people', label: t.nav.admin.people, icon: Users },
      { href: '/admin/instructors', label: t.nav.admin.instructors, icon: GraduationCap, badge: 'applications' },
      { href: '/admin/announcements', label: t.nav.admin.announcements, icon: Megaphone },
      { href: '/admin/support', label: t.nav.admin.support, icon: LifeBuoy, badge: 'support' },
    ],
  },
  {
    label: t.nav.admin.finance,
    items: [
      { href: '/admin/transfers', label: t.nav.admin.transfers, icon: ArrowLeftRight },
      { href: '/admin/payments', label: t.nav.admin.payments, icon: Receipt },
      { href: '/admin/bank-accounts', label: t.nav.admin.bankAccounts, icon: Landmark },
      { href: '/admin/currencies', label: t.nav.admin.currencies, icon: Coins },
      { href: '/admin/coupons', label: t.nav.admin.coupons, icon: Tags },
      { href: '/admin/payouts', label: t.nav.admin.payouts, icon: BadgeDollarSign },
    ],
  },
  {
    items: [
      { href: '/admin/translations', label: t.nav.admin.translations, icon: Languages },
      { href: '/admin/settings', label: t.nav.admin.settings, icon: Settings },
    ],
  },
];
