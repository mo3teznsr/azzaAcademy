# Landing page: creative direction

Route: `/` in apps/web, `src/app/(public)/(site)/page.tsx`. It must stay a working product page: the catalog with filters, starting-soon batches and sign-in all keep working.

The brand is fixed by `docs/BRAND.md`: green ink, WhatsApp green, one lime moment, Almarai, light and dark, EN and AR (RTL).

## What the page must say
Azza is **live classes in small groups, on a fixed weekly schedule, with a real teacher who knows your name**. It is not a library of pre-recorded videos. The story follows one learner's week:

> pick a course → pick the batch that fits your week → show up live with the same classmates → miss one? the recording waits → finish → certificate.

A second, smaller story speaks to teachers: *propose your course; we review it and fill your batch*. This links to the new studio proposal flow.

Audience: adults in the Gulf (UAE first), learning in Arabic or English after work, comparing Azza with YouTube or self-paced apps. They need two things, trust (real people, small rooms) and fit (it fits my week).

## Anti-brief: clichés to avoid
- A stock "student with a laptop smiling" hero above three icon feature cards
- Purple/blue edtech gradients, floating 3D books and graduation caps, trophy icons
- "Learn anything, anytime, anywhere": we are the opposite, at a fixed time with fixed people
- Fake logo walls ("as seen in"), invented student counts, invented star ratings
- Course thumbnails with text painted over them (house rule: no text over course photos)
- Carousel testimonials with 5 stars

## Reference world
**A theatre or broadcast schedule.** Doors open at 19:00, the house fills seat by seat, the ON AIR light comes on. The page should read like a programme, using `label-mono` kickers and session codes (S01, B07), not like a SaaS site.

## Motif
**The seat.** A small rounded square (the green dot is a lit seat, an outline is an empty one). It recurs as:
- bullets;
- the cohort grid (12–24 seats filling as you scroll);
- the live indicator (a seat that pulses);
- the loader and section dividers;
- the cursor-follow dot on desktop.

## Moment map
No two adjacent sections share a technique.

| # | Section | Technique |
|---|---|---|
| 1 | Hero: "A class that waits for you." | Mask-line headline (each line a different direction); a live-room photo window, ON AIR seat pulsing, on-air strip kept |
| 2 | The house fills | Seat grid fills, scroll-linked; a counter shows seats left and the small cohort size, read from real batch data where possible |
| 3 | Your week | Sticky weekly calendar: sessions slot into Tue/Thu 19:00 as you scroll; the time-zone line updates |
| 4 | Course · Batch · Session (the lime band) | Sticky word sequence: one giant word per step, with a one-line definition |
| 5 | In the room | Scroll clip-path expansion: a small window grows full-bleed into a live-room image; captions about the camera, chat, and the teacher seeing you |
| 6 | Miss one? It waits. | Recording timeline: an SVG path draws S01…S12, ended sessions light up and link to "recordings kept" |
| 7 | Catalog (existing, functional) | Filters, sort and cards stay. Cards rise in with a stagger; the featured rail sits above |
| 8 | Starting soon | Velocity marquee of real batches (existing `StartMarquee`, made bigger, two rows) |
| 9 | Teachers | Hover-image list of real teachers (name, subject, languages); portrait follows the cursor; tap to expand on touch |
| 10 | Finish line | Certificate card: the seal draws (SVG stroke), and the verify-code link types out |
| 11 | Teach on Azza | Split CTA to `/studio/courses/new`: "Propose a course; we review it" |
| 12 | FAQ + final CTA | Accordion, then a magnetic "Find your batch" pill |

## Motion and engineering rules
- Use `framer-motion` only, scoped to the landing feature folder. No Lenis or smooth-scroll hijack and no GSAP: the rest of the app must not change behaviour.
- Animate only transform, opacity, clip-path and CSS variables.
- Use the `prefers-reduced-motion` static branch for every scroll-linked effect, with the final state readable.
- Mobile is designed, not shrunk:
  - sticky sequences become stacked cards;
  - no cursor effects;
  - the 390px width doesn't overflow sideways.
- Copy goes in the i18n dictionaries (en + ar), not hard-coded.
- Real data from the existing hooks and APIs (courses, batches, teachers) wherever it exists. Mark invented copy as editable.
- Imagery is art-directed: new photos come from the manifest at `apps/web/images.manifest.json`, styled to BRAND.md (green-ink grade, warm practical light, Gulf settings, real people mid-moment, no text or logos), as a mix of portraits and scenes.
