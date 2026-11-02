import { describe, expect, test } from 'bun:test';
import { createCourseInput } from '@azza/shared';

const base = { slug: 'x', titleEn: 'Course', category: 'Design', level: 'BEGINNER' as const, priceAed: 100 };

describe('course cover image', () => {
  test('accepts bundled /media/ art, https URLs and null', () => {
    expect(createCourseInput.safeParse({ ...base, coverImageUrl: '/media/courses/product-design-foundations.jpg' }).success).toBe(true);
    expect(createCourseInput.safeParse({ ...base, coverImageUrl: 'https://cdn.azza.academy/covers/a.jpg' }).success).toBe(true);
    expect(createCourseInput.safeParse({ ...base, coverImageUrl: null }).success).toBe(true);
    expect(createCourseInput.safeParse(base).success).toBe(true);
  });

  test('rejects other schemes and path traversal', () => {
    for (const coverImageUrl of ['http://evil.test/a.jpg', 'javascript:alert(1)', '/media/../.env', '/uploads/x.jpg', '/media/a.svg']) {
      expect(createCourseInput.safeParse({ ...base, coverImageUrl }).success).toBe(false);
    }
  });
});
