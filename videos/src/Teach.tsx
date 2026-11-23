// Reel template (Remotion, 1080x1920, 30fps). Copy to <project>/src/<Name>.tsx and replace teach (folder under public/).
// Everything is driven by public/teach/reel.config.json (brand) and timeline.json (built by reel.py from scenes.json).
// All meaningful content stays inside the Reels safe zone (y 270–1250); below it is a decorative footer the app UI covers.
import {
  AbsoluteFill, Audio, cancelRender, Composition, continueRender, delayRender, Easing,
  Img, interpolate, registerRoot, Sequence, spring, staticFile, useCurrentFrame,
} from 'remotion';
import timeline from '../public/teach/timeline.json';
import config from '../public/teach/reel.config.json';

const DIR = 'teach';
const FPS = 30;
type Cfg = {
  id?: string; rtl?: boolean; font?: string; endHold?: number; musicVolume?: number; footerText?: string; steps?: string[];
  brand: {name: string; logo?: string; partnerLogo?: string; partnerName?: string; url?: string; cta?: string; secondary?: string; stamp?: string;
    colors?: Partial<typeof DEFAULT_COLORS>};
};
const DEFAULT_COLORS = {paper: '#f3efe4', ink: '#0d1712', dark: '#0f2a1d', accent: '#3fd37e', accentSoft: '#d9f6e5', highlight: '#3fd37e', bad: '#e2412b', warn: '#ffc91f', white: '#ffffff'};
const cfg = config as unknown as Cfg;
const C = {...DEFAULT_COLORS, ...(cfg.brand.colors || {})};
const DIRN = cfg.rtl === false ? 'ltr' : 'rtl';
const FONT = cfg.font || 'Almarai';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(.2, .8, .2, 1);
const asset = (n: string) => staticFile(`${DIR}/${n}`);
const num = (n: number) => DIRN === 'rtl' ? n.toLocaleString('ar-EG', {useGrouping: false}) : n.toLocaleString('en-US');
const LEAD: number = (config as any).audio?.lead ?? 2; // must match reel.py audio.lead
const pop = (f: number, at: number, damping = 12) => spring({frame: f - at, fps: FPS, config: {damping}});

// Scenes are free-form JSON (fields depend on layout), so keep them loosely typed.
type S = Record<string, any> & {layout: string; title: string; frames: number; start: number};
const scenes: S[] = (timeline as unknown as S[]).map((s, i, a) => i === a.length - 1 ? {...s, frames: s.frames + (cfg.endHold ?? 30)} : s);
const total = scenes.reduce((n, s) => n + s.frames, 0);

const fontHandle = delayRender('fonts');
Promise.all(([['Regular', '400'], ['Bold', '700'], ['ExtraBold', '800']] as const).map(([n, w]) =>
  new FontFace(FONT, `url('${asset(`${FONT}-${n}.ttf`)}')`, {weight: w}).load()))
  .then((faces) => { faces.forEach((f) => document.fonts.add(f)); continueRender(fontHandle); })
  .catch((e) => cancelRender(e));

// ---------- shared pieces ----------
const Paper = ({f}: {f: number}) => <AbsoluteFill style={{background: C.paper}}>
  <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(0,0,0,.045) 2px,transparent 2px),linear-gradient(90deg,rgba(0,0,0,.045) 2px,transparent 2px)', backgroundSize: '90px 90px'}} />
  <svg width="1080" height="1920" style={{position: 'absolute', opacity: .18, mixBlendMode: 'multiply'}}>
    <filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed={Math.floor(f / 2) % 6} /><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .28  0 0 0 0 .25  0 0 0 .9 0" /></filter>
    <rect width="1080" height="1920" filter="url(#g)" />
  </svg>
</AbsoluteFill>;

const Footer = ({f}: {f: number}) => <div style={{position: 'absolute', top: 1310, left: 0, width: 1080, height: 610, background: C.dark, overflow: 'hidden'}}>
  <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.07) 2px,transparent 2px)', backgroundSize: '90px 90px', backgroundPosition: `${-f * 1.5}px 0`}} />
  <svg width="1080" height="40" style={{position: 'absolute', top: -1, left: 0}}><path d="M0 0 H1080 V14 L1020 30 L960 12 L880 34 L800 16 L720 30 L640 10 L560 32 L480 14 L400 30 L320 12 L240 34 L160 16 L80 30 L0 14 Z" fill={C.paper} /></svg>
  <div dir={DIRN} style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontSize: 150, fontWeight: 800, color: 'rgba(255,255,255,.07)', whiteSpace: 'nowrap', transform: `translateX(${(f * 2) % 400 - 200}px)`}}>{cfg.footerText || cfg.brand.name}</div>
</div>;

// Headline slams in at frame 0 (no fade-in: the first frame must already read) with a highlighter sweep on `hl`.
const Headline = ({title, hl, f, light = false, size = 92, top = 290}: {title: string; hl?: string; f: number; light?: boolean; size?: number; top?: number}) => {
  const [a, b] = hl && title.includes(hl) ? title.split(hl) : [title, ''];
  const sweep = interpolate(f, [4, 16], [0, 100], {...clamp, easing: ease});
  return <div dir={DIRN} style={{position: 'absolute', top, left: 60, right: 60, fontSize: size, fontWeight: 800, lineHeight: 1.3, color: light ? C.white : C.ink, textAlign: 'center',
    transform: `scale(${interpolate(f, [0, 6], [1.25, 1], {...clamp, easing: ease})})`, textShadow: light ? '0 4px 24px rgba(0,0,0,.6)' : 'none'}}>
    {a}{hl && title.includes(hl) && <span style={{backgroundImage: `linear-gradient(${C.highlight},${C.highlight})`, backgroundRepeat: 'no-repeat', backgroundPosition: `${DIRN === 'rtl' ? 'right' : 'left'} 78%`, backgroundSize: `${sweep}% 40%`, padding: '0 8px'}}>{hl}</span>}{b}
  </div>;
};

const Chip = ({text, f, at, bg = C.ink, color = C.white, rot = 0, size = 44}: {text: string; f: number; at: number; bg?: string; color?: string; rot?: number; size?: number}) => {
  const k = pop(f, at, 9);
  return <div dir={DIRN} style={{display: 'inline-block', background: bg, color, fontSize: size, fontWeight: 800, padding: '14px 28px', borderRadius: 14, transform: `scale(${k}) rotate(${rot}deg)`, opacity: Math.min(1, k * 1.5), boxShadow: '0 8px 0 rgba(0,0,0,.18)'}}>{text}</div>;
};
const chipColors = (tone?: string) => tone === 'bad' ? [C.bad, C.white] : tone === 'good' ? [C.accent, C.ink] : tone === 'warn' ? [C.warn, C.ink] : [C.ink, C.white];

const ChipRow = ({s, f, top = 990, startFrac = .45}: {s: S; f: number; top?: number; startFrac?: number}) => !s.chips?.length ? null :
  <div dir={DIRN} style={{position: 'absolute', top, left: 50, right: 50, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20}}>
    {s.chips.map((c: string, i: number) => { const [bg, fg] = chipColors(s.chipTone); return <Chip key={c} text={c} f={f} at={Math.round(s.frames * startFrac) + i * 14} bg={bg} color={fg} rot={i % 2 ? 3 : -3} />; })}
  </div>;

const FullPhoto = ({src, f, frames, gray = 0}: {src: string; f: number; frames: number; gray?: number}) => <AbsoluteFill style={{overflow: 'hidden'}}>
  <Img src={asset(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: `grayscale(${gray}) contrast(${1 + .15 * gray})`, transform: `scale(${interpolate(f, [0, frames], [1.14, 1.02], clamp)})`}} />
  <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,.1) 36%, rgba(0,0,0,.05) 58%, rgba(0,0,0,.58) 100%)'}} />
</AbsoluteFill>;

const Card = ({src, f, x, y, w, ratio, rot, at = 0, from = 0}: {src: string; f: number; x: number; y: number; w: number; ratio: number; rot: number; at?: number; from?: number}) => {
  const k = from ? pop(f, at, 15) : 1;
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: w / ratio, padding: 14, background: 'white', boxShadow: '0 22px 50px rgba(0,0,0,.28)', transform: `translateX(${(1 - k) * from}px) rotate(${rot}deg)`}}>
    <div style={{width: '100%', height: '100%', overflow: 'hidden'}}><Img src={asset(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${interpolate(f, [0, 150], [1.04, 1.15], clamp)})`}} /></div>
    <div style={{position: 'absolute', top: -22, left: '50%', width: 170, height: 44, marginLeft: -85, background: 'rgba(255,214,90,.8)', transform: `rotate(${-rot * 1.5 - 2}deg)`}} />
  </div>;
};

const Logo = ({src, size = 230}: {src: string; size?: number}) => <Img src={asset(src)} style={{height: size, maxWidth: 700, objectFit: 'contain', borderRadius: 24, background: 'white', padding: 10, boxShadow: '0 14px 40px rgba(0,0,0,.2)'}} />;

// Step bar (orientation + retention): needs cfg.steps labels and scene.step (1-based).
const Stepper = ({step, f}: {step: number; f: number}) => <div dir={DIRN} style={{position: 'absolute', top: 420, left: 60, right: 60, display: 'flex', justifyContent: 'space-between'}}>
  {(cfg.steps || []).map((l, i) => {
    const n = i + 1, on = n === step, done = n < step, k = on ? pop(f, 4, 9) : 1;
    return <div key={l} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1}}>
      <div style={{width: 76, height: 76, borderRadius: 38, background: on ? C.accent : done ? C.dark : 'white', color: on ? C.ink : done ? C.accent : '#9aa59f', fontSize: 40, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${on || done ? C.dark : '#d6d2c6'}`, transform: `scale(${.65 + .35 * k})`}}>{done ? '✓' : num(n)}</div>
      <div style={{fontSize: 28, fontWeight: 800, marginTop: 8, color: on ? C.ink : '#8d968f'}}>{l}</div>
    </div>;
  })}
</div>;

// ---------- layouts ----------
// photo-hook: full-bleed face photo + headline + stamp chips. Fields: photo, title, hl, chips[], chipTone.
const PhotoHook = ({s, f, first}: {s: S; f: number; first: boolean}) => {
  const shake = first && f < 10 ? Math.sin(f * 2.4) * (10 - f) * .8 : 0;
  return <AbsoluteFill style={{transform: `translateX(${shake}px)`}}>
    <FullPhoto src={s.photo} f={f} frames={s.frames} />
    <Headline title={s.title} hl={s.hl} f={f} light size={s.size || 100} />
    <ChipRow s={s} f={f} startFrac={s.chipsAt ?? .15} />
  </AbsoluteFill>;
};

// contrarian: "X? No! It's Y" — B&W photo, strike `hl` at noAt, colour burst + title2/hl2 at revealAt (seconds into the clip).
const Contrarian = ({s, f}: {s: S; f: number}) => {
  const lead = LEAD, noF = lead + Math.round((s.noAt ?? 3) * FPS), revF = lead + Math.round((s.revealAt ?? 3.8) * FPS);
  const color = interpolate(f, [revF - 4, revF + 8], [0, 1], clamp);
  const strike = interpolate(f, [noF, noF + 6], [0, 1], {...clamp, easing: ease});
  const stamp = spring({frame: f - noF, fps: FPS, config: {damping: 7}});
  const after = f >= revF;
  const [p1] = s.title.split(s.hl);
  return <AbsoluteFill style={{transform: `translateX(${f < 10 ? Math.sin(f * 2.4) * (10 - f) * .8 : 0}px)`}}>
    <FullPhoto src={s.photo} f={f} frames={s.frames} gray={1 - color} />
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${C.accent}${after ? '33' : '00'} 0%, transparent 60%)`}} />
    {!after ? <div dir={DIRN} style={{position: 'absolute', top: 290, left: 60, right: 60, textAlign: 'center', fontSize: s.size || 110, fontWeight: 800, color: 'white', lineHeight: 1.3, textShadow: '0 4px 24px rgba(0,0,0,.6)', transform: `scale(${interpolate(f, [0, 6], [1.25, 1], {...clamp, easing: ease})})`}}>
      {p1}<span style={{position: 'relative', display: 'inline-block', opacity: strike > 0 ? .65 : 1}}>{s.hl}
        <span style={{position: 'absolute', left: -10, right: -10, top: '52%', height: 16, background: C.bad, borderRadius: 8, transform: `scaleX(${strike}) rotate(-6deg)`, transformOrigin: DIRN === 'rtl' ? 'right' : 'left'}} /></span>
    </div> : <Headline title={s.title2} hl={s.hl2} f={f - revF} light size={s.size2 || 104} />}
    {f >= noF && f < revF + 10 && <div style={{position: 'absolute', top: 640, left: 0, right: 0, textAlign: 'center'}}>
      <span dir={DIRN} style={{display: 'inline-block', background: C.bad, color: 'white', fontSize: 130, fontWeight: 800, padding: '6px 60px', border: '8px solid white', transform: `rotate(-8deg) scale(${stamp * (1 + .5 * (1 - stamp))})`, opacity: interpolate(f, [revF + 2, revF + 10], [1, 0], clamp)}}>{s.noText || 'لا!'}</span>
    </div>}
    <ChipRow s={{...s, chipTone: s.chipTone || 'good'}} f={f} startFrac={s.chipsAt ?? .7} />
  </AbsoluteFill>;
};

// logos: brand logo (+ optional partner logo) with names. Fields: chips[] (optional).
const Logos = ({s, f}: {s: S; f: number}) => <>
  <div dir={DIRN} style={{position: 'absolute', top: 600, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40}}>
    {cfg.brand.logo && <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${pop(f, 4, 10)})`}}><Logo src={cfg.brand.logo} /><div style={{fontSize: 40, fontWeight: 800, marginTop: 14}}>{cfg.brand.name}</div></div>}
    {cfg.brand.partnerLogo && <><div style={{fontSize: 120, fontWeight: 800, color: C.accent, transform: `scale(${pop(f, 14, 8)})`}}>+</div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${pop(f, 22, 10)})`}}><Logo src={cfg.brand.partnerLogo} /><div style={{fontSize: 36, fontWeight: 700, marginTop: 14, color: '#4b5a52'}}>{cfg.brand.partnerName}</div></div></>}
  </div>
  <ChipRow s={s} f={f} top={1000} startFrac={.55} />
</>;

// cards: 1–2 taped photos. Fields: images[], ratios[] (w/h, default 1.5), chips[].
const Cards = ({s, f, i}: {s: S; f: number; i: number}) => {
  const im: string[] = s.images || []; const r: number[] = s.ratios || [];
  if (im.length === 1) { const ratio = r[0] || 1.5; const w = Math.min(880, 520 * ratio); return <><Card src={im[0]} f={f} x={(1080 - w) / 2} y={575} w={w} ratio={ratio} rot={i % 2 ? 2 : -2} from={i % 2 ? 900 : -900} /><ChipRow s={s} f={f} top={1020} /></>; }
  return <><Card src={im[0]} f={f} x={50} y={570} w={600} ratio={r[0] || 1.5} rot={-3} from={-900} />
    <Card src={im[1]} f={f} x={430} y={760} w={600} ratio={r[1] || 1.5} rot={3} at={Math.round(s.frames * .4)} from={900} /></>;
};

// demo: real page screenshot (capture.js --full --boxes) scrolling inside a screen card, highlight + tap per target.
// Fields: demo: {image, boxes (inlined by you from <prefix>-boxes.json: {scale,width,boxes}), targets: [{key,label}], badge?}
const Demo = ({s, f}: {s: S; f: number}) => {
  const d = s.demo; const W = 900, H = 540, top = 600, left = 90;
  const k = (W - 28) / (d.boxes.width * d.boxes.scale); // inner width: 14px border each side
  const T = d.targets as {key: string; label: string}[];
  const span = (s.frames - 40) / T.length, idx = Math.min(T.length - 1, Math.max(0, Math.floor((f - 14) / span))), local = f - 14 - idx * span;
  const bx = (key: string) => d.boxes.boxes[key];
  const cy = (key: string) => (bx(key).y + bx(key).h / 2) * d.boxes.scale * k;
  const scrollY = interpolate(local, [0, 12], [cy(T[Math.max(0, idx - 1)].key), cy(T[idx].key)], {...clamp, easing: ease}) - H / 2;
  const b = bx(T[idx].key), X = b.x * d.boxes.scale * k, Y = b.y * d.boxes.scale * k - scrollY, BW = b.w * d.boxes.scale * k, BH = b.h * d.boxes.scale * k;
  const tap = interpolate(local, [14, 26], [0, 1], clamp);
  return <>
    <div style={{position: 'absolute', top, left, width: W, height: H, borderRadius: 44, overflow: 'hidden', border: `14px solid ${C.ink}`, boxShadow: '0 30px 60px rgba(0,0,0,.3)', background: 'white', transform: `translateY(${(1 - pop(f, 0, 14)) * 400}px)`}}>
      <Img src={asset(d.image)} style={{position: 'absolute', top: -scrollY, left: 0, width: W - 28}} />
      <div style={{position: 'absolute', left: X - 10, top: Y - 10, width: BW + 20, height: BH + 20, borderRadius: 18, border: `6px solid ${C.accent}`, boxShadow: '0 0 0 9999px rgba(0,0,0,.35)', opacity: interpolate(local, [8, 14], [0, 1], clamp)}} />
      <div style={{position: 'absolute', left: X + BW * .7 - 50, top: Y + BH / 2 - 50, width: 100, height: 100, borderRadius: 50, border: `6px solid ${C.accent}`, transform: `scale(${.4 + tap * 1.2})`, opacity: tap > 0 ? 1 - tap : 0}} />
      <div style={{position: 'absolute', left: X + BW * .7 - 4, top: Y + BH / 2 - 10, fontSize: 70, opacity: interpolate(local, [6, 12], [0, 1], clamp), transform: `translateY(${interpolate(local, [6, 16], [40, 0], clamp)}px)`}}>👆</div>
    </div>
    <div dir={DIRN} style={{position: 'absolute', top: top - 30, [DIRN === 'rtl' ? 'right' : 'left']: left + 30, zIndex: 2, background: C.accent, color: C.ink, fontSize: 38, fontWeight: 800, padding: '8px 22px', borderRadius: 999}}>{T[idx].label}</div>
    {d.badge && <div dir={DIRN} style={{position: 'absolute', top: top - 30, [DIRN === 'rtl' ? 'left' : 'right']: left + 30, zIndex: 2, background: C.ink, color: C.accent, fontSize: 34, fontWeight: 800, padding: '8px 22px', borderRadius: 999}}>{d.badge}</div>}
  </>;
};

// tiles: 2–3 big icon tiles + chips + optional bottom note. Fields: tiles: [{icon,label}], chips[], note.
const Tiles = ({s, f}: {s: S; f: number}) => {
  const t = s.tiles as {icon: string; label: string}[]; const note = interpolate(f, [s.frames * .55, s.frames * .7], [0, 1], clamp);
  return <>
    <div dir={DIRN} style={{position: 'absolute', top: 570, left: 60, right: 60, display: 'flex', justifyContent: 'space-around'}}>
      {t.map((x, i) => <div key={x.label} style={{width: 290, height: 250, background: i === 1 ? C.dark : 'white', color: i === 1 ? C.accent : C.ink, borderRadius: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${pop(f, 10 + i * 12, 10)}) rotate(${[-3, 2, -2][i % 3]}deg)`, boxShadow: '0 14px 0 rgba(0,0,0,.12)'}}>
        <div style={{fontSize: 100, fontWeight: 800, lineHeight: 1}}>{x.icon}</div><div style={{fontSize: 40, fontWeight: 800, marginTop: 12}}>{x.label}</div></div>)}
    </div>
    <ChipRow s={s} f={f} top={870} startFrac={.18} />
    {s.note && <div dir={DIRN} style={{position: 'absolute', top: 1000, left: 140, right: 140, background: 'white', borderRadius: 24, padding: '24px 30px', fontSize: 36, fontWeight: 800, textAlign: 'center', opacity: note, transform: `translateY(${(1 - note) * 40}px)`, boxShadow: '0 10px 30px rgba(0,0,0,.12)'}}>{s.note}</div>}
  </>;
};

// notify: phone-style notification / message card dropping in. Fields: notify: {icon, from, title, body?, chips?}, confetti?
const Notify = ({s, f}: {s: S; f: number}) => {
  const n = s.notify; const k = pop(f, 10, 11);
  return <>
    {s.confetti && Array.from({length: 26}).map((_, i) => { const x = (i * 137) % 1000 + 40, dl = (i * 7) % 30; return <div key={i} style={{position: 'absolute', left: x + Math.sin((f + i * 10) / 8) * 20, top: interpolate(f - dl, [0, 90], [480, 1150], clamp), width: 18, height: 30, background: [C.accent, C.warn, C.bad, C.dark][i % 4], transform: `rotate(${f * 6 + i * 40}deg)`, opacity: f > dl && f < dl + 95 ? 1 : 0}} />; })}
    <div dir={DIRN} style={{position: 'absolute', top: 640, left: 90, right: 90, background: 'white', borderRadius: 34, padding: '30px 34px', boxShadow: '0 24px 50px rgba(0,0,0,.22)', transform: `translateY(${(1 - k) * -200}px) scale(${.9 + .1 * k})`, opacity: Math.min(1, k * 2)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        <div style={{width: 100, height: 100, borderRadius: 24, background: C.accent, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{n.icon}</div>
        <div style={{flex: 1}}><div style={{fontSize: 30, fontWeight: 700, color: '#6b766f'}}>{n.from}</div><div style={{fontSize: 46, fontWeight: 800, color: C.ink}}>{n.title}</div></div>
      </div>
      {n.body && <div style={{fontSize: 36, fontWeight: 700, color: '#4b5a52', marginTop: 20}}>{n.body}</div>}
      {n.chips && <div style={{display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap'}}>{n.chips.map((c: string) => <div key={c} style={{background: C.accentSoft, color: C.dark, fontSize: 34, fontWeight: 800, padding: '12px 22px', borderRadius: 14}}>{c}</div>)}</div>}
    </div>
    <ChipRow s={s} f={f} top={1030} startFrac={.6} />
  </>;
};

// stats: 1–2 animated counters. Fields: stats: [{value, label, prefix?, suffix?}]
const Stats = ({s, f}: {s: S; f: number}) => <>{(s.stats as {value: number; label: string; prefix?: string; suffix?: string}[]).map((x, i) => {
  const at = 4 + i * 30, v = Math.round(interpolate(f, [at, at + 40], [0, x.value], {...clamp, easing: ease}));
  return <div key={x.label} dir={DIRN} style={{position: 'absolute', top: 580 + i * 300, left: 80, right: 80, height: 270, background: i ? C.accent : C.dark, color: i ? C.ink : C.white, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${pop(f, at)}) rotate(${i ? 1.5 : -1.5}deg)`}}>
    <div style={{fontSize: 150, fontWeight: 800, color: i ? C.ink : C.accent, lineHeight: 1}}>{x.prefix ?? '+'}{num(v)}{x.suffix ?? ''}</div><div style={{fontSize: 50, fontWeight: 800, marginTop: 10}}>{x.label}</div></div>;
})}</>;

// cta: logo, url, pulsing button (brand.cta), secondary pill (brand.secondary), stamp (brand.stamp).
const Cta = ({f}: {f: number}) => {
  const beat = 1 + .05 * Math.max(0, Math.sin(f / 4.5));
  return <>
    <div style={{position: 'absolute', top: 460, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${pop(f, 2, 11)})`}}>
      {cfg.brand.logo && <Logo src={cfg.brand.partnerLogo || cfg.brand.logo} size={200} />}
      {cfg.brand.url && <div style={{fontSize: 52, fontWeight: 800, color: C.dark, marginTop: 24}}>{cfg.brand.url}</div>}
      <div dir={DIRN} style={{marginTop: 30, background: C.ink, color: 'white', fontSize: 58, fontWeight: 800, padding: '24px 60px', borderRadius: 999, transform: `scale(${beat})`, boxShadow: `0 0 0 ${12 + 9 * Math.sin(f / 4.5)}px ${C.accent}55`}}>{cfg.brand.cta || 'سجّل هسي'} {DIRN === 'rtl' ? '←' : '→'}</div>
      <div style={{fontSize: 80, transform: `translateY(${Math.abs(Math.sin(f / 6)) * 22}px)`}}>👆</div>
      {cfg.brand.secondary && <div dir={DIRN} style={{background: '#25d366', color: 'white', fontSize: 40, fontWeight: 800, padding: '14px 30px', borderRadius: 999, transform: `scale(${pop(f, 60)})`}}>{cfg.brand.secondary}</div>}
    </div>
    {cfg.brand.stamp && <div dir={DIRN} style={{position: 'absolute', top: 480, right: 60, background: C.warn, color: C.ink, fontSize: 38, fontWeight: 800, padding: '12px 22px', transform: `rotate(10deg) scale(${pop(f, 120, 8)})`, border: '5px solid white'}}>{cfg.brand.stamp}</div>}
  </>;
};

const Caption = ({s, f}: {s: S; f: number}) => {
  const t = f / FPS; const cur = (s.subtitles as {start: number; end: number; text: string}[]).find((c) => t >= c.start && t < c.end + .1);
  if (!cur) return null;
  return <div style={{position: 'absolute', top: 1160, left: 40, right: 40, display: 'flex', justifyContent: 'center'}}>
    <div dir={DIRN} style={{background: C.ink, color: 'white', fontSize: 54, fontWeight: 800, lineHeight: 1.45, padding: '10px 30px', textAlign: 'center', transform: `scale(${interpolate((t - cur.start) * FPS, [0, 4], [.8, 1], clamp)})`, boxShadow: `0 6px 0 ${C.accent}`}}>{cur.text}</div>
  </div>;
};

const Scene = ({s, i}: {s: S; i: number}) => {
  const f = useCurrentFrame();
  const photo = s.layout === 'photo-hook' || s.layout === 'contrarian';
  const step: number | undefined = s.step;
  return <AbsoluteFill style={{transform: `scale(${i === 0 ? 1 : interpolate(f, [0, 6], [1.08, 1], {...clamp, easing: ease})})`}}>
    {!photo && <><Paper f={f} /><Footer f={f} /><Headline title={step ? `${num(step)}. ${s.title}` : s.title} hl={s.hl} f={f} size={s.size || (step ? 84 : 92)} top={step ? 280 : 290} /></>}
    {step && <Stepper step={step} f={f} />}
    {s.layout === 'photo-hook' && <PhotoHook s={s} f={f} first={i === 0} />}
    {s.layout === 'contrarian' && <Contrarian s={s} f={f} />}
    {s.layout === 'logos' && <Logos s={s} f={f} />}
    {s.layout === 'cards' && <Cards s={s} f={f} i={i} />}
    {s.layout === 'demo' && <Demo s={s} f={f} />}
    {s.layout === 'tiles' && <Tiles s={s} f={f} />}
    {s.layout === 'notify' && <Notify s={s} f={f} />}
    {s.layout === 'stats' && <Stats s={s} f={f} />}
    {s.layout === 'cta' && <Cta f={f} />}
    {s.captions !== false && <Caption s={s} f={f} />}
    {i > 0 && <AbsoluteFill style={{background: 'white', opacity: interpolate(f, [0, 3], [.6, 0], clamp)}} />}
  </AbsoluteFill>;
};

const Film = () => <AbsoluteFill style={{background: C.paper, fontFamily: FONT}}>
  {scenes.map((s, i) => <Sequence key={i} from={s.start} durationInFrames={s.frames}>
    <Scene s={s} i={i} />
    {s.audio && <Sequence from={LEAD}><Audio src={staticFile(s.audio)} /></Sequence>}
  </Sequence>)}
  {cfg.musicVolume !== 0 && <Audio src={asset('score.wav')} volume={cfg.musicVolume ?? .12} />}
</AbsoluteFill>;

registerRoot(() => <Composition id={cfg.id || 'Reel'} component={Film} width={1080} height={1920} fps={FPS} durationInFrames={total} />);
