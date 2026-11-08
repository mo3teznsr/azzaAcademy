#!/usr/bin/env node
// One-off generator (no runtime dependency): writes packages/shared/src/countries.ts and its Dart mirror
// apps/mobile/lib/core/phone/countries.dart. Names and flags come from Node's Intl (en, ar).
// Re-run after editing the tables below:  node packages/shared/scripts/gen-countries.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

// ISO 3166-1 alpha-2 → ITU calling code (without +). NANP members all share "1".
const DIAL = `AD:376 AE:971 AF:93 AG:1 AI:1 AL:355 AM:374 AO:244 AQ:672 AR:54 AS:1 AT:43 AU:61 AW:297 AX:358 AZ:994
BA:387 BB:1 BD:880 BE:32 BF:226 BG:359 BH:973 BI:257 BJ:229 BL:590 BM:1 BN:673 BO:591 BQ:599 BR:55 BS:1 BT:975 BV:47 BW:267 BY:375 BZ:501
CA:1 CC:61 CD:243 CF:236 CG:242 CH:41 CI:225 CK:682 CL:56 CM:237 CN:86 CO:57 CR:506 CU:53 CV:238 CW:599 CX:61 CY:357 CZ:420
DE:49 DJ:253 DK:45 DM:1 DO:1 DZ:213 EC:593 EE:372 EG:20 EH:212 ER:291 ES:34 ET:251 FI:358 FJ:679 FK:500 FM:691 FO:298 FR:33
GA:241 GB:44 GD:1 GE:995 GF:594 GG:44 GH:233 GI:350 GL:299 GM:220 GN:224 GP:590 GQ:240 GR:30 GS:500 GT:502 GU:1 GW:245 GY:592
HK:852 HM:672 HN:504 HR:385 HT:509 HU:36 ID:62 IE:353 IL:972 IM:44 IN:91 IO:246 IQ:964 IR:98 IS:354 IT:39 JE:44 JM:1 JO:962 JP:81
KE:254 KG:996 KH:855 KI:686 KM:269 KN:1 KP:850 KR:82 KW:965 KY:1 KZ:7 LA:856 LB:961 LC:1 LI:423 LK:94 LR:231 LS:266 LT:370 LU:352 LV:371 LY:218
MA:212 MC:377 MD:373 ME:382 MF:590 MG:261 MH:692 MK:389 ML:223 MM:95 MN:976 MO:853 MP:1 MQ:596 MR:222 MS:1 MT:356 MU:230 MV:960 MW:265 MX:52 MY:60 MZ:258
NA:264 NC:687 NE:227 NF:672 NG:234 NI:505 NL:31 NO:47 NP:977 NR:674 NU:683 NZ:64 OM:968 PA:507 PE:51 PF:689 PG:675 PH:63 PK:92 PL:48 PM:508 PN:64 PR:1 PS:970 PT:351 PW:680 PY:595
QA:974 RE:262 RO:40 RS:381 RU:7 RW:250 SA:966 SB:677 SC:248 SD:249 SE:46 SG:65 SH:290 SI:386 SJ:47 SK:421 SL:232 SM:378 SN:221 SO:252 SR:597 SS:211 ST:239 SV:503 SX:1 SY:963 SZ:268
TC:1 TD:235 TF:262 TG:228 TH:66 TJ:992 TK:690 TL:670 TM:993 TN:216 TO:676 TR:90 TT:1 TV:688 TW:886 TZ:255 UA:380 UG:256 UM:1 US:1 UY:598 UZ:998
VA:39 VC:1 VE:58 VG:1 VI:1 VN:84 VU:678 WF:681 WS:685 YE:967 YT:262 ZA:27 ZM:260 ZW:263`;

// National-number digit counts (after the calling code, no trunk 0). Everything else: 4–14.
const LENGTHS = {
  AE: [8, 9], SA: [8, 9], QA: [8, 8], KW: [8, 8], BH: [8, 8], OM: [8, 8],
  EG: [9, 10], JO: [8, 9], LB: [7, 8], IQ: [8, 10], SY: [8, 9], PS: [8, 9], YE: [7, 9], LY: [8, 9], TN: [8, 8], DZ: [8, 9], MA: [9, 9], EH: [9, 9],
  SD: [9, 9], SS: [9, 9], MR: [8, 8], SO: [7, 9], DJ: [8, 8], KM: [7, 7], IR: [10, 10], TR: [10, 10], IL: [8, 9], CY: [8, 8],
  US: [10, 10], CA: [10, 10], GB: [9, 10], IE: [7, 9], FR: [9, 9], DE: [6, 13], IT: [6, 11], ES: [9, 9], PT: [9, 9], NL: [9, 9], BE: [8, 9], CH: [9, 9],
  AT: [4, 13], SE: [7, 13], NO: [8, 8], DK: [8, 8], FI: [5, 12], PL: [9, 9], GR: [10, 10], UA: [9, 9], RU: [10, 10], KZ: [10, 10],
  IN: [10, 10], PK: [9, 10], BD: [10, 10], LK: [9, 9], NP: [8, 10], AF: [9, 9], PH: [10, 10], ID: [9, 12], MY: [9, 10], SG: [8, 8], TH: [8, 9], VN: [9, 10],
  CN: [11, 11], HK: [8, 8], JP: [9, 10], KR: [9, 10], AU: [9, 9], NZ: [8, 10],
  NG: [8, 10], KE: [9, 9], ZA: [9, 9], ET: [9, 9], GH: [9, 9], UG: [9, 9], TZ: [9, 9], BR: [10, 11], MX: [10, 10], AR: [10, 10],
};
const DEFAULT_LEN = [4, 14];
const GCC = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];

const en = new Intl.DisplayNames(['en'], { type: 'region' });
const ar = new Intl.DisplayNames(['ar'], { type: 'region' });
const flag = (iso2) => String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

const countries = DIAL.split(/\s+/)
  .filter(Boolean)
  .map((pair) => {
    const [iso2, dialCode] = pair.split(':');
    const [minLen, maxLen] = LENGTHS[iso2] ?? DEFAULT_LEN;
    // NANP: every member is 10 national digits.
    const [min, max] = dialCode === '1' ? [10, 10] : dialCode === '7' ? [10, 10] : [minLen, maxLen];
    return { iso2, dialCode, nameEn: en.of(iso2), nameAr: ar.of(iso2), flag: flag(iso2), minLen: min, maxLen: max };
  });

for (const c of countries) {
  if (!c.nameEn || c.nameEn === c.iso2) throw new Error(`No English name for ${c.iso2}`);
  if (!/^[1-9]\d{0,2}$/.test(c.dialCode)) throw new Error(`Bad dial code for ${c.iso2}`);
}
// ITU calling codes are prefix-free: one code must never be a proper prefix of another.
const codes = [...new Set(countries.map((c) => c.dialCode))];
for (const a of codes) for (const b of codes) if (a !== b && b.startsWith(a)) throw new Error(`Dial code ${a} is a prefix of ${b}`);
if (new Set(countries.map((c) => c.iso2)).size !== countries.length) throw new Error('Duplicate iso2');

// GCC first (fixed order), then the rest by English name; clients re-sort the rest by the current language.
countries.sort((a, b) => {
  const ga = GCC.indexOf(a.iso2);
  const gb = GCC.indexOf(b.iso2);
  if (ga !== -1 || gb !== -1) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb);
  return a.nameEn.localeCompare(b.nameEn, 'en');
});

const header = 'GENERATED by packages/shared/scripts/gen-countries.mjs (Intl.DisplayNames). Do not edit by hand.';
const q = (s) => JSON.stringify(s);

const ts = `// ${header}

/** A country for phone input: ISO 3166-1 alpha-2, ITU calling code (no +), names, flag, national-number digit range. */
export interface Country {
  iso2: string;
  dialCode: string;
  nameEn: string;
  nameAr: string;
  flag: string;
  minLen: number;
  maxLen: number;
}

export const DEFAULT_COUNTRY_ISO2 = 'AE';
/** Listed first, in this order; the rest follow alphabetically by name in the current language. */
export const GCC_COUNTRY_ISO2 = ${q(GCC)} as const;

export const COUNTRIES: readonly Country[] = [
${countries.map((c) => `  { iso2: ${q(c.iso2)}, dialCode: ${q(c.dialCode)}, nameEn: ${q(c.nameEn)}, nameAr: ${q(c.nameAr)}, flag: ${q(c.flag)}, minLen: ${c.minLen}, maxLen: ${c.maxLen} },`).join('\n')}
];
`;
writeFileSync(resolve(root, 'packages/shared/src/countries.ts'), ts);

const dq = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$')}'`;
const dart = `// ${header}
// Mirror of packages/shared/src/countries.ts (same data and the same validation rules as phone.ts).

class Country {
  const Country({
    required this.iso2,
    required this.dialCode,
    required this.nameEn,
    required this.nameAr,
    required this.flag,
    required this.minLen,
    required this.maxLen,
  });

  /// ISO 3166-1 alpha-2.
  final String iso2;

  /// ITU calling code, without the +.
  final String dialCode;
  final String nameEn;
  final String nameAr;
  final String flag;

  /// National-number digit range (after the calling code, without a trunk 0).
  final int minLen;
  final int maxLen;

  String name(String languageCode) => languageCode == 'ar' ? nameAr : nameEn;
}

const String defaultCountryIso2 = 'AE';

/// Listed first, in this order; the rest follow alphabetically by name in the current language.
const List<String> gccCountryIso2 = [${GCC.map(dq).join(', ')}];

const List<Country> countries = [
${countries.map((c) => `  Country(iso2: ${dq(c.iso2)}, dialCode: ${dq(c.dialCode)}, nameEn: ${dq(c.nameEn)}, nameAr: ${dq(c.nameAr)}, flag: ${dq(c.flag)}, minLen: ${c.minLen}, maxLen: ${c.maxLen}),`).join('\n')}
];

final RegExp _e164 = RegExp(r'^\\+[1-9]\\d{6,14}$');

Country? countryByIso2(String iso2) {
  final code = iso2.toUpperCase();
  for (final c in countries) {
    if (c.iso2 == code) return c;
  }
  return null;
}

/// The countries whose calling code starts the E.164 number (calling codes are prefix-free, so they share one code).
List<Country> countriesForPhone(String e164) {
  if (!_e164.hasMatch(e164)) return const [];
  final digits = e164.substring(1);
  for (var len = 3; len >= 1; len--) {
    if (digits.length <= len) continue;
    final code = digits.substring(0, len);
    final matches = countries.where((c) => c.dialCode == code).toList();
    if (matches.isNotEmpty) return matches;
  }
  return const [];
}

/// Matches ^\\+[1-9]\\d{6,14}$, a known calling code, and that country's national digit range.
bool isValidPhone(String e164) {
  final matches = countriesForPhone(e164);
  if (matches.isEmpty) return false;
  final national = e164.length - 1 - matches.first.dialCode.length;
  return matches.any((c) => national >= c.minLen && national <= c.maxLen);
}

/// The national input as E.164 for [iso2]: strips spaces, dashes, dots, parentheses and one leading 0.
/// An input that already starts with + (or 00) is taken as international.
String toE164(String iso2, String nationalInput) {
  final raw = nationalInput.trim();
  final digits = raw.replaceAll(RegExp(r'[\\s\\-().]'), '').replaceAll(RegExp(r'[^0-9+]'), '');
  if (digits.startsWith('+')) return '+\${digits.substring(1).replaceAll('+', '')}';
  if (digits.startsWith('00')) return '+\${digits.substring(2).replaceAll('+', '')}';
  final country = countryByIso2(iso2);
  final national = digits.replaceAll('+', '').replaceFirst(RegExp(r'^0'), '');
  return '+\${country?.dialCode ?? ''}\$national';
}
`;
mkdirSync(resolve(root, 'apps/mobile/lib/core/phone'), { recursive: true });
writeFileSync(resolve(root, 'apps/mobile/lib/core/phone/countries.dart'), dart);
console.log(`Wrote ${countries.length} countries.`);
