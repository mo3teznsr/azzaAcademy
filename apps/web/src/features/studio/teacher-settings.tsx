'use client';

import { PageTitle } from '@/components/brand/section';
import { useI18n } from '@/lib/i18n/provider';
import { ProfileForm } from '../settings/profile-form';
import { BankDetailsPanel } from './bank-details-panel';

export function TeacherSettings() {
  const { t } = useI18n();
  return (
    <>
      <PageTitle title={t.studio.settings.title} />
      <ProfileForm />
      <BankDetailsPanel />
    </>
  );
}
