export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];
/** Same name for the localStorage key and the cookie. */
export const THEME_KEY = 'azza_theme';
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** Routes that always render dark (live room / studio live), matched on the pathname. */
export const FORCED_DARK_PATH = '^/(live|studio/live)/';

export const isThemePreference = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';

/**
 * Runs in <head> before first paint: preference from localStorage, else the cookie, else "system";
 * "system" resolves through prefers-color-scheme. Sets <html data-theme="light|dark">.
 */
export const THEME_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_KEY)},p=null;try{p=localStorage.getItem(k)}catch(e){}if(!p){var m=document.cookie.match(new RegExp("(?:^|; )"+k+"=([^;]*)"));if(m)p=decodeURIComponent(m[1])}if(p!=="light"&&p!=="dark")p="system";var r=p==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;if(new RegExp(${JSON.stringify(FORCED_DARK_PATH)}).test(location.pathname))r="dark";document.documentElement.setAttribute("data-theme",r)}catch(e){}})()`;
