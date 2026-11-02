import { PublicFooter, PublicHeader } from '@/components/shell/public-header';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="main" className="flex-1 pt-4">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
