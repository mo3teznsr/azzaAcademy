import { describe, expect, test } from 'bun:test';
import type { FileStorage } from '../src/core/ports';
import { avatarExtension, MAX_AVATAR_BYTES } from '../src/modules/me/avatar-file';
import { MeService } from '../src/modules/me/me.service';
import type { MeRepository } from '../src/modules/me/me.repository';

const photo = (type = 'image/jpeg', size = 1024) => ({ type, size, bytes: async () => new Uint8Array(size) });

describe('avatarExtension', () => {
  test('accepts common photo types', () => {
    expect(avatarExtension({ type: 'image/jpeg', size: 10 })).toBe('jpg');
    expect(avatarExtension({ type: 'IMAGE/PNG', size: 10 })).toBe('png');
    expect(avatarExtension({ type: 'image/heic', size: 10 })).toBe('heic');
  });

  test('refuses PDFs, empty and oversized files', () => {
    expect(() => avatarExtension({ type: 'application/pdf', size: 10 })).toThrow('PNG, JPG');
    expect(() => avatarExtension({ type: 'image/png', size: 0 })).toThrow('empty');
    expect(() => avatarExtension({ type: 'image/png', size: MAX_AVATAR_BYTES + 1 })).toThrow('5 MB');
  });
});

describe('MeService.uploadAvatar', () => {
  test('stores under avatars/ and sets the user image', async () => {
    const saved: string[] = [];
    const storage: FileStorage = {
      save: async (f) => {
        saved.push(`${f.folder}.${f.extension}`);
        return { key: `${f.folder}/x.${f.extension}`, url: `/media/${f.folder}/x.${f.extension}` };
      },
      read: async () => null,
      keyFromUrl: () => null,
    };
    let image: string | undefined;
    const repo = { setImage: async (_id: string, url: string) => ({ id: 'u1', image: (image = url) }) } as unknown as MeRepository;
    const me = new MeService(repo, { now: () => new Date() }, { release: async () => {} }, storage);

    const user = await me.uploadAvatar('u1', photo());
    expect(saved).toEqual(['avatars.jpg']);
    expect(image).toBe('/media/avatars/x.jpg');
    expect(user).toMatchObject({ image: '/media/avatars/x.jpg' });
  });

  test('rejects a bad file before storing anything', async () => {
    let stored = false;
    const storage: FileStorage = { save: async () => ((stored = true), { key: 'k', url: 'u' }), read: async () => null, keyFromUrl: () => null };
    const me = new MeService({} as MeRepository, { now: () => new Date() }, { release: async () => {} }, storage);
    await expect(me.uploadAvatar('u1', photo('application/pdf'))).rejects.toThrow();
    expect(stored).toBe(false);
  });
});
