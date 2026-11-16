import { describe, expect, test } from 'bun:test';
// The web app has no test runner; its auth redirect helpers are pure and import nothing but types.
import { landingFor, safeNext } from '../../web/src/lib/auth/roles';
import { socialCallbackURLs, socialErrorKind } from '../../web/src/lib/auth/social-redirects';

describe('web: redirects after Google / Apple sign-in', () => {
  test('safeNext refuses other origins, including the /\\ form browsers read as //', () => {
    expect(safeNext('/learn')).toBe('/learn');
    expect(safeNext('//evil.test')).toBeNull();
    expect(safeNext('/\\evil.test')).toBeNull();
    expect(safeNext('https://evil.test')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });

  test('landingFor: next when the role may open it, else the role home', () => {
    expect(landingFor('/checkout/b1?coupon=X', 'STUDENT')).toBe('/checkout/b1?coupon=X');
    expect(landingFor('/courses/abc', 'TEACHER')).toBe('/courses/abc'); // public
    expect(landingFor('/admin/people', 'STUDENT')).toBe('/learn');
    expect(landingFor('/checkout/b1', 'TEACHER')).toBe('/studio');
    expect(landingFor(null, 'ADMIN')).toBe('/admin');
    expect(landingFor('//evil.test', 'STUDENT')).toBe('/learn');
    expect(landingFor(undefined, undefined)).toBe('/learn');
  });

  test('callback URLs are absolute on the web origin and carry only a safe next', () => {
    expect(socialCallbackURLs('https://azza.academy', '/checkout/b1', '/sign-in')).toEqual({
      callbackURL: 'https://azza.academy/auth/continue?next=%2Fcheckout%2Fb1',
      errorCallbackURL: 'https://azza.academy/sign-in?next=%2Fcheckout%2Fb1',
    });
    expect(socialCallbackURLs('http://localhost:3000', '//evil.test', '/sign-up')).toEqual({
      callbackURL: 'http://localhost:3000/auth/continue',
      errorCallbackURL: 'http://localhost:3000/sign-up',
    });
  });

  test('provider error codes map to the two messages', () => {
    expect(socialErrorKind(null)).toBeNull();
    expect(socialErrorKind('')).toBeNull();
    expect(socialErrorKind('account_not_linked')).toBe('linkRefused');
    expect(socialErrorKind('account not linked')).toBe('linkRefused');
    expect(socialErrorKind('unable_to_get_user_info')).toBe('failed');
    expect(socialErrorKind('no_session')).toBe('failed');
  });
});
