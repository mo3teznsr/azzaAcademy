import {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  ClipboardList,
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
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: 'live' | 'count';
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
      { href: '/assignments', label: t.nav.student.assignments, icon: ClipboardList },
      { href: '/settings', label: t.nav.student.settings, icon: Settings },
    ],
  },
];

export const teacherNav = (t: Dictionary): NavGroup[] => [
  {
    items: [
      { href: '/studio', label: t.nav.teacher.studio, icon: Radio, exact: true },
      { href: '/studio/earnings', label: t.nav.teacher.earnings, icon: Wallet },
      { href: '/studio/settings', label: t.nav.teacher.settings, icon: Settings },
    ],
  },
];

export const adminNav = (t: Dictionary): NavGroup[] => [
  {
    items: [
      { href: '/admin', label: t.nav.admin.dashboard, icon: LayoutDashboard, exact: true },
      { href: '/admin/courses', label: t.nav.admin.courses, icon: BookOpen },
      { href: '/admin/batches', label: t.nav.admin.batches, icon: Layers },
      { href: '/admin/live', label: t.nav.admin.live, icon: Radio, badge: 'live' },
      { href: '/admin/people', label: t.nav.admin.people, icon: Users },
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
