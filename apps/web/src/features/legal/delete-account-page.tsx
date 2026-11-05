'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingBlock } from '@/components/brand/states';
import { FormBanner } from '@/features/auth/auth-shell';
import { ApiError, meApi } from '@/lib/api';
import { authClient } from '@/lib/auth/client';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';

/** Public `/account/delete` (the URL Google Play asks for): how-to for app + web, and the web action when signed in. */
export function DeleteAccountPage() {
  const { t } = useI18n();
  const d = t.legal.deletion;
  return (
    <article className="mx-auto flex w-full max-w-[1360px] flex-col gap-12 px-4 sm:px-6 lg:px-10">
      <header className="flex max-w-3xl flex-col gap-5">
        <span className="label-mono text-muted-foreground">{d.kicker}</span>
        <h1 className="font-display text-[clamp(44px,7vw,96px)] leading-[0.9] font-extrabold">{d.title}</h1>
        <p className="text-lg text-soft-foreground">{d.intro}</p>
      </header>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-20">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="in-app" className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 id="in-app" className="font-display text-[28px] leading-[1] font-extrabold">
              {d.inAppTitle}
            </h2>
            <ol className="flex flex-col gap-3">
              {d.inAppSteps.map((step, i) => (
                <li key={step} className="flex items-baseline gap-4 text-soft-foreground">
                  <span className="font-mono text-sm text-onair-fg" dir="ltr">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="on-web" className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 id="on-web" className="font-display text-[28px] leading-[1] font-extrabold">
              {d.webTitle}
            </h2>
            <p className="text-soft-foreground">{d.webBody}</p>
          </section>
          <div className="grid gap-10 border-t border-border pt-6 sm:grid-cols-2">
            <Bullets title={d.removedTitle} items={d.removed} />
            <Bullets title={d.keptTitle} items={d.kept} />
          </div>
          <p className="text-sm text-muted-foreground">{d.blockedNote}</p>
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
          <DeletePanel />
        </div>
      </div>
    </article>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="label-mono text-muted-foreground">{title}</h3>
      <ul className="flex flex-col gap-3">
        {items.map((p) => (
          <li key={p} className="relative ps-5 leading-relaxed text-soft-foreground before:absolute before:start-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-sun">
            {p}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeletePanel() {
  const { t, fill } = useI18n();
  const d = t.legal.deletion;
  const { user, isPending } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [typed, setTyped] = useState('');
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const remove = useMutation({
    mutationFn: meApi.deleteAccount,
    onSuccess: async () => {
      setOpen(false);
      setDone(true);
      // Server sessions are already gone; this clears the local cookie and cached session.
      await authClient.signOut().catch(() => undefined);
      qc.clear();
      router.refresh();
    },
    onError: () => setOpen(false),
  });
  const errorCode = remove.error instanceof ApiError ? remove.error.code : null;
  const errorText = remove.error ? (errorCode && errorCode in d.errors ? d.errors[errorCode as keyof typeof d.errors] : d.errors.generic) : null;

  const shell = 'flex flex-col gap-5 rounded-[24px] border border-line-strong p-[clamp(1.25rem,3vw,2rem)]';
  if (done) {
    return (
      <div className={shell}>
        <FormBanner tone="success">{d.done}</FormBanner>
      </div>
    );
  }
  if (isPending) return <LoadingBlock rows={1} height={220} />;
  if (!user) {
    return (
      <section aria-labelledby="signed-out" className={shell}>
        <h2 id="signed-out" className="font-display text-2xl font-extrabold">
          {d.signedOutTitle}
        </h2>
        <p className="text-soft-foreground">{d.signedOutBody}</p>
        <Button asChild size="lg" className="self-start">
          <Link href="/sign-in?next=/account/delete">{d.signIn}</Link>
        </Button>
      </section>
    );
  }
  const confirmed = typed.trim() === d.confirmWord;
  return (
    <section aria-labelledby="delete-now" className={shell}>
      <h2 id="delete-now" className="font-display text-2xl font-extrabold">
        {d.button}
      </h2>
      <p className="text-sm text-muted-foreground">{fill(d.signedInAs, { email: user.email })}</p>
      {errorText && <FormBanner tone="error">{errorText}</FormBanner>}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (confirmed) setOpen(true);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-delete" className="text-[13px] text-muted-foreground">
            {d.confirmLabel}
          </Label>
          <Input id="confirm-delete" dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        <Button type="submit" variant="destructive" size="lg" disabled={!confirmed || remove.isPending}>
          {remove.isPending ? d.deleting : d.button}
        </Button>
      </form>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">{d.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{d.dialogBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
            >
              {remove.isPending ? d.deleting : d.dialogConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
