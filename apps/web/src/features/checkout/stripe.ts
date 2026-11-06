import { loadStripe, type Stripe } from '@stripe/stripe-js';

const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let promise: Promise<Stripe | null> | null = null;

export const stripeConfigured = !!key;

/** Lazily load Stripe.js once. Returns null when no publishable key is configured. */
export function getStripe(): Promise<Stripe | null> | null {
  if (!key) return null;
  promise ??= loadStripe(key);
  return promise;
}

// The iframe can't load our next/font Almarai, so it falls back to the system face unless Elements gets `fonts`.
const common = { fontFamily: '"Almarai", system-ui, sans-serif', borderRadius: '14px', spacingUnit: '4px' };

/** Payment Element appearance tuned to the site theme (the iframe can't read our CSS variables). */
export function stripeAppearance(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        theme: 'night' as const,
        variables: { ...common, colorPrimary: '#25D366', colorBackground: '#16291F', colorText: '#F1F1E9', colorDanger: '#FF9C9C' },
        rules: { '.Input': { border: '1px solid #33503F', padding: '14px' }, '.Label': { color: '#9DABA3' } },
      }
    : {
        theme: 'stripe' as const,
        variables: { ...common, colorPrimary: '#159454', colorBackground: '#FFFFFF', colorText: '#102018', colorDanger: '#B83232' },
        rules: { '.Input': { border: '1px solid #D8E0D6', padding: '14px' }, '.Label': { color: '#55655C' } },
      };
}
