/**
 * Landing imagery (generated from apps/web/images.manifest.json).
 *
 * PLACEHOLDER: every person in these photos is fictional and AI-generated. Replace them with real
 * photos of Azza teachers and learners (with their consent) before launch, keeping the paths and
 * aspect ratios, and update the matching `landing.*.alt` strings in the dictionaries.
 * Copy lives in src/lib/i18n/dictionaries/{en,ar}.ts under `landing`; numbers come from the API.
 */
export const LANDING_IMAGES = {
  /** Hero window — 4:5 source, cropped wide on desktop. */
  onAir: '/images/landing/on-air.jpg',
  /** "In the room" clip-path expansion — 16:9. */
  room: '/images/landing/room.jpg',
  /** "Miss one? It waits." — 3:2. */
  evening: '/images/landing/evening.jpg',
  /** "The house fills" inset — 4:3. */
  gallery: '/images/landing/gallery.jpg',
  /** Finish line — 4:5. */
  finish: '/images/landing/finish.jpg',
  /** Teach on Azza — 4:5. */
  teach: '/images/landing/teach.jpg',
} as const;

/** Sample code shown on the sample certificate (the format the verify page expects). */
export const SAMPLE_CERT_CODE = 'AZ-CERT-7Q4K';
