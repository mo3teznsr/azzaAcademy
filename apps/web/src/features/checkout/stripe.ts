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

/** Payment Element appearance tuned to the ink theme. */
export const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#FFD24A',
    colorBackground: '#1C1A18',
    colorText: '#FBF8F2',
    colorDanger: '#FF9C85',
    fontFamily: '"Inter Tight", system-ui, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #3A3631', padding: '14px' },
    '.Label': { color: '#A39B90' },
  },
};
