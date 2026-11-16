'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { captureAttribution, trackPageView } from '@/lib/analytics';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const SNAP_PIXEL_ID = process.env.NEXT_PUBLIC_SNAP_PIXEL_ID;

/** Only ids made of letters, digits, dashes and underscores go into the inline snippets. */
const safe = (id: string | undefined) => (id && /^[A-Za-z0-9_-]+$/.test(id) ? id : undefined);

/**
 * Loads GA4 and the Meta, TikTok and Snap pixels, each only when its id is set, remembers where the visitor came from
 * (UTM tags, click ids, referrer) and reports page views on client-side navigation.
 */
export function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    // The first load is counted by each pixel's own snippet.
    if (first.current) {
      first.current = false;
      return;
    }
    trackPageView(pathname);
  }, [pathname]);

  const ga = safe(GA_ID);
  const meta = safe(META_PIXEL_ID);
  const tiktok = safe(TIKTOK_PIXEL_ID);
  const snap = safe(SNAP_PIXEL_ID);

  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      )}
      {tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=n;ttq._t=ttq._t||{};ttq._t[e]=+new Date;var s=d.createElement("script");s.type="text/javascript";s.async=!0;s.src=n+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(s,a)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}
      {snap && (
        <Script id="snap-pixel" strategy="afterInteractive">
          {`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${snap}');snaptr('track','PAGE_VIEW');`}
        </Script>
      )}
    </>
  );
}
