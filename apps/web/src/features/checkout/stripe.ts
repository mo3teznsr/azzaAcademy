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

const common = { fontFamily: '"Inter Tight", system-ui, sans-serif', borderRadius: '12px', spacingUnit: '4px' };

/** Payment Element appearance tuned to the site theme (the iframe can't read our CSS variables). */
export function stripeAppearance(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        theme: 'night' as const,
        variables: { ...common, colorPrimary: '#FFD24A', colorBackground: '#1C1A18', colorText: '#FBF8F2', colorDanger: '#FF9C85' },
        rules: { '.Input': { border: '1px solid #3A3631', padding: '14px' }, '.Label': { color: '#A39B90' } },
      }
    : {
        theme: 'stripe' as const,
        variables: { ...common, colorPrimary: '#121110', colorBackground: '#FBF8F2', colorText: '#121110', colorDanger: '#B3361C' },
        rules: { '.Input': { border: '1px solid #D9D0C2', padding: '14px' }, '.Label': { color: '#6B645B' } },
      };
}
