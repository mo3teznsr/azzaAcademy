# Azza brand: green theme

Reference: the Clinic web theme (`Clinic/apps/web/src/app/globals.css`). Azza takes its palette, type and shape language. Light and dark are both required; the user switches between them.

## Rules

- **Deep green ink carries text and the primary action.** The bright green (`green`) is the brand accent.
- **The bright green never takes white text** (about 1.9:1). It fills tints, highlights, focus rings and accent buttons with **ink-deep text**.
- **Lime is the one loud colour.** Use it for a whole section or band (a landing feature band, a hero strip), never for a small element.
- **Western digits everywhere**, even inside Arabic runs.
- **Contrast:** text must stay at or above 4.5:1 on its ground. The `*-fg` values below are already darkened (light theme) or lightened (dark theme) to meet that.

## Raw palette

| Token | Hex | Use |
|---|---|---|
| ink | `#102018` | text, primary button fill (light), logo on light |
| inkDeep | `#07110D` | dark ground, auth panel, app icon ground |
| ink2 | `#16291F` | dark card |
| ink3 | `#1D3328` | dark raised / hover |
| line | `#26402F` | dark border |
| line2 | `#33503F` | dark strong border / input |
| green | `#25D366` | brand accent (fills, rings, accent buttons with inkDeep text) |
| greenDeep | `#159454` | hover / links on light |
| greenDarker | `#117443` | green as text on light (≥ 4.5:1 on cream and white) |
| mint | `#57ED99` | accent hover; green as text on dark |
| lime | `#DFFF69` | the loud section colour (inkDeep text) |
| cream | `#F1F1E9` | text on dark, light raised alt |
| page | `#F5F7F3` | light ground |
| surface | `#FFFFFF` | light card |
| raised | `#F8F8F2` | light raised / popover / site surface |
| border | `#E6EBE4` | light border |
| borderStrong | `#D8E0D6` | light strong border / input |
| borderSoft | `#EFF3ED` | light divider |
| text2 | `#55655C` | secondary text (light) |
| text3 | `#7D8C84` | tertiary text (light; large text only) |
| textMuted | `#9DABA3` | placeholder (light); secondary text on dark |
| successBg / success | `#E7F8EE` / `#117443` | |
| warningBg / warning | `#FDF3DF` / `#8A5A12` (text) · `#B4741F` (icon) | |
| dangerBg / danger | `#FBE9E9` / `#B83232` (text) · `#D64545` (fill) | |
| infoBg / info | `#E8EDFB` / `#2F5BD6` | |
| onAir (live) | `#D64545` | live badge fill (white text) |

## Mapping Azza's existing tokens

The token names stay the same in both apps. Only the values change.

| Azza token | Light theme | Dark theme |
|---|---|---|
| background / ground | page `#F5F7F3` | inkDeep `#07110D` |
| card / surface | surface `#FFFFFF` | ink2 `#16291F` |
| popover / raised | raised `#F8F8F2` | ink3 `#1D3328` |
| foreground / text | ink `#102018` | cream `#F1F1E9` |
| muted-foreground / textSecondary | text2 `#55655C` | textMuted `#9DABA3` |
| border / line | border `#E6EBE4` | line `#26402F` |
| input / fieldLine | borderStrong `#D8E0D6` | line2 `#33503F` |
| primary (main action) | ink fill, white text; hover greenDeep | green fill, inkDeep text; hover mint |
| accent (selection, focus ring, active nav) | green | green |
| link | greenDeep, hover greenDarker, underline green | mint |
| **sun** (old yellow accent) | → green `#25D366` fill (inkDeep text); sun-fg greenDarker | → green; sun-fg mint |
| **sage** | → successBg `#E7F8EE`; sage-fg `#117443` | → `#123A27` fill; sage-fg mint |
| **sky** | → infoBg `#E8EDFB`; sky-fg `#2F5BD6` | → `#17254A` fill; sky-fg `#9DB4FF` |
| **peach** | → warningBg `#FDF3DF`; peach-fg `#8A5A12` | → `#3A2A10` fill; peach-fg `#F2C46B` |
| **onair** | `#D64545` | `#FF6B6B` |
| danger | bg `#FBE9E9`, fg `#B83232` | bg `#2A1212`, fg `#FF9C9C` |
| stone / muted | `#9DABA3` | `#9DABA3` |
| stone-2 / mutedDeep | `#55655C` | `#7D8C84` |
| teacher variant accent | same green system | |
| admin variant | same; admin's cream ground → page | |

## Type

**Almarai** for display and body, in Arabic and English, with weights 300, 400, 700 and 800.
- Headings use 800 and body text 400. Line height is 1.7 for Arabic and 1.55 for English.
- Keep JetBrains Mono for timecodes and code only.
- Size scale (from the reference), size / line height in px:

| Style | Size | Line height |
|---|---|---|
| display | 32 | 40 |
| h1 | 24 | 32 |
| h2 | 20 | 28 |
| h3 | 16 | 24 |
| body | 14–15 | 22 |
| small | 13 | 20 |
| caption | 12 | 16 |

Marketing headlines can scale up from these.

## Shape and motion

**Radius**

| Element | Radius |
|---|---|
| controls and buttons | pill (999px) |
| inputs | 14px input groups; the field and its icons share one rounded box, and the focus ring is greenDeep plus a 3px `rgba(21,148,84,.12)` halo |
| cards | 16px |
| site cards | 18px |
| media | 24px |
| auth frame | 28px |

**Shadow**

| Use | Value |
|---|---|
| overlay | `0 8px 24px rgba(13,32,21,.12)` |
| card (site) | `0 12px 38px rgba(13,32,21,.10)` |
| media | `0 24px 70px rgba(13,32,21,.16)` |

**Motion**
- **Entrances** use `cubic-bezier(0.23, 1, 0.32, 1)`. They start at 0.35 opacity, never 0, rise 14px, and stagger 80ms per step.
- **Hover** lifts buttons by `translateY(-1px)` over 160ms.
- **Reduced motion** collapses all of it.

**Images**
- No text on top of photos stays the rule for course covers and listings.
- The hero and auth panel may use the dark green wash over a photo (inkDeep gradients), as in the reference, because they carry their own copy.

## Logo and icons

**Logo mask**
- On light: tinted ink `#102018`.
- On dark: tinted cream `#F1F1E9`.

**App icon:** cream logo on an inkDeep `#07110D` ground. The launch screen is inkDeep too.
