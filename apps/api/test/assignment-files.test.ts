import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { MAX_MATERIAL_FILE_BYTES, MAX_SUBMISSION_FILE_BYTES, submissionInput, updateAssignmentInput } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv, CurrentUser } from '../src/http/types';
import { FixedClock } from '../src/infrastructure/clock';
import { LocalDiskStorage, MemoryFileStorage } from '../src/infrastructure/storage/local-disk-storage';
import { S3FileStorage } from '../src/infrastructure/storage/s3-storage';
import { BatchAccessPolicy, type BatchAccessRepository } from '../src/modules/batches/batch-access';
import type { ContentRepository, SubmissionFileRecord } from '../src/modules/content/content.repository';
import { contentRoutes } from '../src/modules/content/content.routes';
import { cleanFileName, ContentService } from '../src/modules/content/content.service';
import { materialFile } from '../src/modules/content/material-file';
import { submissionFile } from '../src/modules/content/submission-file';
import { RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const reasonOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => (e.details as { reason: string }).reason);

const admin = { id: 'nour', role: 'ADMIN' as const };
const lina = { id: 'lina', role: 'TEACHER' as const }; // teaches b1
const omar = { id: 'omar', role: 'TEACHER' as const };
const sara = { id: 'sara', role: 'STUDENT' as const }; // ACTIVE in b1
const nadia = { id: 'nadia', role: 'STUDENT' as const }; // VERIFYING in b1
const hadi = { id: 'hadi', role: 'STUDENT' as const }; // not enrolled

const HEX = 'b'.repeat(32);
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// ───────── validators ─────────

describe('submissionFile', () => {
  test('accepts pdf, docx, pptx, xlsx, png, jpg, webp, zip, txt, md', () => {
    const types = [
      ['application/pdf', 'pdf'],
      [DOCX, 'docx'],
      ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
      ['image/png', 'png'],
      ['IMAGE/JPEG', 'jpg'],
      ['image/webp', 'webp'],
      ['application/zip', 'zip'],
      ['application/x-zip-compressed', 'zip'],
      ['text/plain; charset=utf-8', 'txt'],
      ['text/markdown', 'md'],
    ] as const;
    for (const [type, extension] of types) expect(submissionFile({ type, size: 10 }).extension).toBe(extension);
    expect(submissionFile({ type: 'image/jpg', size: 10 }).contentType).toBe('image/jpeg');
  });

  test('falls back to the file name only when the browser sends no type', () => {
    expect(submissionFile({ type: '', size: 10, name: 'notes.MD' })).toEqual({ extension: 'md', contentType: 'text/markdown' });
    expect(submissionFile({ type: 'application/octet-stream', size: 10, name: 'work.zip' }).extension).toBe('zip');
    expect(() => submissionFile({ type: '', size: 10, name: 'run.exe' })).toThrow('PDF, DOCX');
    expect(() => submissionFile({ type: 'text/html', size: 10, name: 'page.txt' })).toThrow('PDF, DOCX');
  });

  test('TYPE / EMPTY / TOO_LARGE reasons under SUBMISSION_FILE_INVALID', () => {
    const fail = (f: { type: string; size: number }) => {
      try {
        submissionFile(f);
      } catch (e) {
        const err = e as AppError;
        return [err.code, (err.details as { reason: string }).reason];
      }
      return null;
    };
    expect(fail({ type: 'video/mp4', size: 10 })).toEqual(['SUBMISSION_FILE_INVALID', 'TYPE']);
    expect(fail({ type: 'image/svg+xml', size: 10 })).toEqual(['SUBMISSION_FILE_INVALID', 'TYPE']);
    expect(fail({ type: 'audio/mpeg', size: 10 })).toEqual(['SUBMISSION_FILE_INVALID', 'TYPE']);
    expect(fail({ type: 'application/pdf', size: 0 })).toEqual(['SUBMISSION_FILE_INVALID', 'EMPTY']);
    expect(fail({ type: 'application/pdf', size: MAX_SUBMISSION_FILE_BYTES + 1 })).toEqual(['SUBMISSION_FILE_INVALID', 'TOO_LARGE']);
    expect(submissionFile({ type: 'application/pdf', size: MAX_SUBMISSION_FILE_BYTES }).extension).toBe('pdf');
  });
});

describe('materialFile', () => {
  test('the submission types plus mp3 / m4a, up to 50 MB', () => {
    expect(materialFile({ type: 'audio/mpeg', size: 10 })).toEqual({ extension: 'mp3', contentType: 'audio/mpeg' });
    expect(materialFile({ type: 'audio/x-m4a', size: 10 })).toEqual({ extension: 'm4a', contentType: 'audio/mp4' });
    expect(materialFile({ type: DOCX, size: MAX_MATERIAL_FILE_BYTES }).extension).toBe('docx');
    expect(() => materialFile({ type: 'application/pdf', size: MAX_MATERIAL_FILE_BYTES + 1 })).toThrow('50 MB');
    expect(() => materialFile({ type: 'video/mp4', size: 10 })).toThrow('MP3, M4A');
  });
});

describe('storage keyFromUrl', () => {
  test('only URLs the adapter itself returns', () => {
    const local = new LocalDiskStorage('/tmp/unused', 'http://localhost:4000/uploads/');
    expect(local.keyFromUrl(`http://localhost:4000/uploads/submissions/${HEX}.pdf`)).toBe(`submissions/${HEX}.pdf`);
    const s3 = new S3FileStorage('bucket', 'me-central-1', 'https://cdn.azza.test');
    expect(s3.keyFromUrl(`https://cdn.azza.test/submissions/${HEX}.docx`)).toBe(`submissions/${HEX}.docx`);
    for (const url of [
      `http://evil.test/uploads/submissions/${HEX}.pdf`,
      `http://localhost:4000/uploads/submissions/../${HEX}.pdf`,
      `http://localhost:4000/uploads/submissions/${HEX}.pdf?x=1`,
      `http://localhost:4000/uploads.evil.test/submissions/${HEX}.pdf`,
      `http://localhost:4000/uploads/submissions/short.pdf`,
    ]) {
      expect(local.keyFromUrl(url)).toBeNull();
    }
  });

  test('cleanFileName drops paths and control characters', () => {
    expect(cleanFileName('C:\\Users\\me\\essay.docx', 'docx')).toBe('essay.docx');
    expect(cleanFileName('../../etc/pass\u0000wd', 'txt')).toBe('passwd');
    expect(cleanFileName('   ', 'pdf')).toBe('file.pdf');
  });
});

// ───────── service ─────────

type Sub = { id: string; assignmentId: string; userId: string; url?: string | null; text?: string | null; files: SubmissionFileRecord[]; score: number | null };

function setup() {
  const accessRepo: BatchAccessRepository = {
    teacherOf: async (b) => (b === 'b1' ? 'lina' : b === 'b2' ? 'omar' : null),
    enrollmentStatus: async (u, b) => (b === 'b1' ? ({ sara: 'ACTIVE', nadia: 'VERIFYING' } as const)[u as 'sara'] ?? null : null),
  };
  const assignments = new Map([
    ['a1', { id: 'a1', batchId: 'b1', sessionId: null as string | null, title: 'Essay', description: '', dueAt: new Date('2026-12-01T00:00:00Z'), maxScore: 100, createdAt: new Date() }],
  ]);
  const submissions: Sub[] = [];
  const materials: unknown[] = [];
  const repo = {
    sessionBatch: async () => null,
    findAssignment: async (id: string) => assignments.get(id) ?? null,
    updateAssignment: async (id: string, data: object) => {
      const next = { ...assignments.get(id)!, ...data };
      assignments.set(id, next);
      return next;
    },
    deleteAssignment: async (id: string) => void assignments.delete(id),
    submissionCount: async (id: string) => submissions.filter((s) => s.assignmentId === id).length,
    highestScore: async (id: string) => {
      const scores = submissions.filter((s) => s.assignmentId === id && s.score !== null).map((s) => s.score!);
      return scores.length ? Math.max(...scores) : null;
    },
    upsertSubmission: async (assignmentId: string, userId: string, data: { url?: string; text?: string; files?: SubmissionFileRecord[] }) => {
      let s = submissions.find((x) => x.assignmentId === assignmentId && x.userId === userId);
      if (!s) submissions.push((s = { id: `s${submissions.length + 1}`, assignmentId, userId, files: [], score: null }));
      if (data.url !== undefined) s.url = data.url;
      if (data.text !== undefined) s.text = data.text;
      if (data.files !== undefined) s.files = data.files;
      return s;
    },
    submissions: async (id: string) => submissions.filter((s) => s.assignmentId === id),
    createMaterial: async (data: object) => (materials.push(data), data),
  } as unknown as ContentRepository;
  const storage = new MemoryFileStorage();
  const service = new ContentService(repo, new BatchAccessPolicy(accessRepo), new RecordingNotifier(), new FixedClock(new Date('2026-11-20T00:00:00Z')), storage);
  return { service, storage, submissions, assignments, materials };
}

const upload = (type = 'application/pdf', size = 8, name = 'essay.pdf') => ({ type, size, name, bytes: async () => new Uint8Array(size) });

describe('submission file upload', () => {
  test('ACTIVE students store under submissions/ and get { url, name, size, type }', async () => {
    const { service, storage } = setup();
    const res = await service.uploadSubmissionFile('a1', upload(DOCX, 12, 'My essay.docx'), sara);
    expect(res).toEqual({ url: expect.stringMatching(/^http:\/\/files\.test\/submissions\/[0-9a-f]{32}\.docx$/), name: 'My essay.docx', size: 12, type: DOCX });
    expect([...storage.files.keys()][0]).toStartWith('submissions/');
  });

  test('enrollment gate: not ACTIVE, not enrolled, teachers and admins → 403; unknown assignment → 404', async () => {
    const { service, storage } = setup();
    for (const who of [nadia, hadi, lina, admin]) expect(await codeOf(service.uploadSubmissionFile('a1', upload(), who))).toBe('FORBIDDEN');
    expect(await codeOf(service.uploadSubmissionFile('nope', upload(), sara))).toBe('NOT_FOUND');
    expect(storage.files.size).toBe(0);
  });

  test('a bad file is refused before anything is stored', async () => {
    const { service, storage } = setup();
    expect(await reasonOf(service.uploadSubmissionFile('a1', upload('video/mp4'), sara))).toBe('TYPE');
    expect(await reasonOf(service.uploadSubmissionFile('a1', upload('application/pdf', 0), sara))).toBe('EMPTY');
    expect(await reasonOf(service.uploadSubmissionFile('a1', upload('application/pdf', MAX_SUBMISSION_FILE_BYTES + 1), sara))).toBe('TOO_LARGE');
    expect(storage.files.size).toBe(0);
  });
});

describe('submit with files', () => {
  test('persists uploaded files; the stored type comes from the key', async () => {
    const { service, submissions } = setup();
    const file = await service.uploadSubmissionFile('a1', upload(), sara);
    const sub = await service.submit('a1', { files: [{ ...file, type: 'text/html' }] }, sara);
    expect(sub.files).toEqual([{ url: file.url, name: 'essay.pdf', size: 8, type: 'application/pdf' }]);
    expect(submissions[0]!.files).toHaveLength(1);
    // Teacher listing returns the files.
    expect((await service.submissions('a1', lina)).items[0]!.files).toEqual(sub.files);
    // Re-submitting text alone keeps them; an empty list clears them.
    expect((await service.submit('a1', { text: 'Updated' }, sara)).files).toHaveLength(1);
    expect((await service.submit('a1', { text: 'Updated', files: [] }, sara)).files).toEqual([]);
  });

  test('rejects foreign URLs, other folders and empty submissions', async () => {
    const { service } = setup();
    const own = await service.uploadSubmissionFile('a1', upload(), sara);
    const meta = { name: 'x.pdf', size: 8, type: 'application/pdf' };
    for (const url of [
      `https://evil.test/submissions/${HEX}.pdf`,
      own.url.replace('http://files.test/', 'http://files.test.evil.test/'),
      `http://files.test/receipts/${HEX}.pdf`,
      `http://files.test/materials/${HEX}.pdf`,
      `http://files.test/submissions/${HEX}.mp4`,
      `http://files.test/submissions/../avatars/${HEX}.png`,
    ]) {
      expect(await reasonOf(service.submit('a1', { files: [{ url, ...meta }] }, sara))).toBe('FOREIGN_URL');
    }
    expect(await codeOf(service.submit('a1', { files: [] }, sara))).toBe('EMPTY_SUBMISSION');
  });

  test('the shared schema caps files at 5 and checks their shape', () => {
    const f = { url: `http://files.test/submissions/${HEX}.pdf`, name: 'a.pdf', size: 1, type: 'application/pdf' };
    expect(submissionInput.safeParse({ files: Array(5).fill(f) }).success).toBe(true);
    expect(submissionInput.safeParse({ files: Array(6).fill(f) }).success).toBe(false);
    expect(submissionInput.safeParse({ files: [{ ...f, size: MAX_SUBMISSION_FILE_BYTES + 1 }] }).success).toBe(false);
    expect(submissionInput.safeParse({ files: [{ ...f, name: '' }] }).success).toBe(false);
  });
});

describe('assignment edit and delete', () => {
  test('the batch teacher or an admin edits; others → 403', async () => {
    const { service } = setup();
    const input = updateAssignmentInput.parse({ title: 'Long essay', dueAt: '2026-12-05T00:00:00Z' });
    expect((await service.updateAssignment('a1', input, lina)).title).toBe('Long essay');
    expect((await service.updateAssignment('a1', { maxScore: 50 }, admin)).maxScore).toBe(50);
    for (const who of [omar, sara]) expect(await codeOf(service.updateAssignment('a1', input, who))).toBe('FORBIDDEN');
    expect(await codeOf(service.updateAssignment('nope', input, admin))).toBe('NOT_FOUND');
  });

  test('max score cannot drop below an existing grade', async () => {
    const { service, submissions } = setup();
    await service.submit('a1', { text: 'Done' }, sara);
    submissions[0]!.score = 80;
    expect(await codeOf(service.updateAssignment('a1', { maxScore: 70 }, lina))).toBe('SCORE_TOO_HIGH');
    expect((await service.updateAssignment('a1', { maxScore: 80 }, lina)).maxScore).toBe(80);
  });

  test('delete: teacher or admin, 409 once anyone has submitted', async () => {
    const { service, assignments } = setup();
    expect(await codeOf(service.deleteAssignment('a1', omar))).toBe('FORBIDDEN');
    expect(await codeOf(service.deleteAssignment('a1', sara))).toBe('FORBIDDEN');
    await service.submit('a1', { text: 'Done' }, sara);
    const err = await service.deleteAssignment('a1', lina).catch((e: AppError) => e);
    expect(err).toMatchObject({ status: 409, code: 'ASSIGNMENT_HAS_SUBMISSIONS' });
    expect(assignments.has('a1')).toBe(true);
  });

  test('delete without submissions removes it', async () => {
    const { service, assignments } = setup();
    expect(await service.deleteAssignment('a1', admin)).toEqual({ ok: true });
    expect(assignments.has('a1')).toBe(false);
  });
});

describe('material files', () => {
  test('the batch teacher or an admin uploads under materials/', async () => {
    const { service } = setup();
    const res = await service.uploadMaterialFile('b1', upload('audio/mpeg', 20, 'lecture.mp3'), lina);
    expect(res).toEqual({ url: expect.stringMatching(/\/materials\/[0-9a-f]{32}\.mp3$/), name: 'lecture.mp3', size: 20, type: 'audio/mpeg' });
    expect((await service.uploadMaterialFile('b1', upload(), admin)).type).toBe('application/pdf');
    for (const who of [omar, sara]) expect(await codeOf(service.uploadMaterialFile('b1', upload(), who))).toBe('FORBIDDEN');
  });

  test('FILE materials only take our materials/ URLs; links stay free', async () => {
    const { service, materials } = setup();
    const file = await service.uploadMaterialFile('b1', upload(), lina);
    await service.addMaterial('b1', { title: 'Slides', url: file.url, kind: 'FILE' }, lina);
    expect(await reasonOf(service.addMaterial('b1', { title: 'Bad', url: `https://evil.test/materials/${HEX}.pdf`, kind: 'FILE' }, lina))).toBe('FOREIGN_URL');
    const sub = await service.uploadSubmissionFile('a1', upload(), sara);
    expect(await reasonOf(service.addMaterial('b1', { title: 'Bad', url: sub.url, kind: 'FILE' }, lina))).toBe('FOREIGN_URL');
    await service.addMaterial('b1', { title: 'Docs', url: 'https://example.com/docs', kind: 'LINK' }, lina);
    expect(materials).toHaveLength(2);
  });
});

// ───────── routes ─────────

describe('content upload routes', () => {
  const user = (who: { id: string; role: CurrentUser['role'] }): CurrentUser => ({ ...who, name: 'U', email: 'u@x.test', locale: 'en', timezone: 'Asia/Dubai' });
  const app = (who: { id: string; role: CurrentUser['role'] } | null) => {
    const a = new Hono<AppEnv>();
    a.onError(errorHandler);
    a.use('*', async (c, next) => (c.set('user', who ? user(who) : null), next()));
    a.route('/api/v1', contentRoutes(setup().service));
    return a;
  };
  const form = (type: string, name: string) => {
    const f = new FormData();
    f.set('file', new File([new Uint8Array(16)], name, { type }));
    return { method: 'POST', body: f };
  };
  const errorOf = async (res: Response) => ((await res.json()) as { error: { code: string; details: { reason: string } } }).error;

  test('POST /assignments/:id/submission/file → 201 for an ACTIVE student', async () => {
    const res = await app(sara).request('/api/v1/assignments/a1/submission/file', form('application/pdf', 'essay.pdf'));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: 'essay.pdf', size: 16, type: 'application/pdf', url: expect.stringContaining('/submissions/') });
  });

  test('signed out → 401, teachers → 403, not ACTIVE → 403', async () => {
    expect((await app(null).request('/api/v1/assignments/a1/submission/file', form('application/pdf', 'a.pdf'))).status).toBe(401);
    expect((await app(lina).request('/api/v1/assignments/a1/submission/file', form('application/pdf', 'a.pdf'))).status).toBe(403);
    expect((await app(nadia).request('/api/v1/assignments/a1/submission/file', form('application/pdf', 'a.pdf'))).status).toBe(403);
  });

  test('bad type or missing file → 422 SUBMISSION_FILE_INVALID', async () => {
    const res = await app(sara).request('/api/v1/assignments/a1/submission/file', form('text/html', 'x.html'));
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({ code: 'SUBMISSION_FILE_INVALID', details: { reason: 'TYPE' } });
    const missing = await app(sara).request('/api/v1/assignments/a1/submission/file', { method: 'POST', body: new FormData() });
    expect((await errorOf(missing)).details.reason).toBe('MISSING');
  });

  test('bodies over the limits are refused from Content-Length', async () => {
    const big = (bytes: number) => ({
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=x', 'Content-Length': String(bytes) },
      body: '--x--',
    });
    const sub = await app(sara).request('/api/v1/assignments/a1/submission/file', big(MAX_SUBMISSION_FILE_BYTES * 2));
    expect(sub.status).toBe(422);
    expect(await errorOf(sub)).toMatchObject({ code: 'SUBMISSION_FILE_INVALID', details: { reason: 'TOO_LARGE' } });
    const mat = await app(lina).request('/api/v1/batches/b1/materials/file', big(MAX_MATERIAL_FILE_BYTES * 2));
    expect(await errorOf(mat)).toMatchObject({ code: 'MATERIAL_FILE_INVALID', details: { reason: 'TOO_LARGE' } });
  });

  test('POST /batches/:id/materials/file and PATCH / DELETE /assignments/:id', async () => {
    const teacher = app(lina);
    const up = await teacher.request('/api/v1/batches/b1/materials/file', form('audio/mpeg', 'talk.mp3'));
    expect(up.status).toBe(201);
    expect(((await up.json()) as { url: string }).url).toContain('/materials/');
    const patch = await teacher.request('/api/v1/assignments/a1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Renamed' }) });
    expect(patch.status).toBe(200);
    expect(((await patch.json()) as { title: string }).title).toBe('Renamed');
    expect((await teacher.request('/api/v1/assignments/a1', { method: 'DELETE' })).status).toBe(200);
  });
});
