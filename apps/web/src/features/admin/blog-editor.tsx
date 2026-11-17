'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { BLOG_RELATED_COURSES_MAX, BLOG_SLUG, BLOG_TAGS_MAX, type BlogPostInput, type BlogPostStatus } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Markdown } from '@/components/brand/markdown';
import { PageTitle, Panel } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, categoriesApi, coursesApi, instructorsApi } from '@/lib/api';
import { blogApi, type AdminBlogPost } from '@/lib/api/blog';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { CoverPhotoField } from './course-media-fields';

const NONE = 'none';

type Draft = {
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  bodyAr: string;
  bodyEn: string;
  coverImageUrl: string | null;
  categorySlug: string;
  tags: string;
  authorId: string;
  courseIds: string[];
  /** `datetime-local` value in the admin's own time zone; empty = now. */
  publishAt: string;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function fromPost(p: AdminBlogPost | null): Draft {
  return {
    slug: p?.slug ?? '',
    titleAr: p?.titleAr ?? '',
    titleEn: p?.titleEn ?? '',
    excerptAr: p?.excerptAr ?? '',
    excerptEn: p?.excerptEn ?? '',
    bodyAr: p?.bodyAr ?? '',
    bodyEn: p?.bodyEn ?? '',
    coverImageUrl: p?.coverImageUrl ?? null,
    categorySlug: p?.categorySlug ?? '',
    tags: p?.tags.join(', ') ?? '',
    authorId: p?.authorId ?? '',
    courseIds: p?.courses.map((c) => c.id) ?? [],
    publishAt: toLocalInput(p?.publishedAt ?? null),
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** `/admin/blog/new` and `/admin/blog/[id]`. */
export function BlogEditor({ postId }: { postId?: string }) {
  const q = useQuery({ queryKey: qk.adminBlogPost(postId ?? 'new'), queryFn: () => blogApi.admin.get(postId!), enabled: !!postId });
  if (postId && q.isPending) return <LoadingBlock rows={6} />;
  if (postId && q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <EditorForm key={q.data?.updatedAt ?? 'new'} post={q.data ?? null} />;
}

function EditorForm({ post }: { post: AdminBlogPost | null }) {
  const { t, pick } = useI18n();
  const b = t.adminBlog;
  const id = useId();
  const router = useRouter();
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(() => fromPost(post));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const categories = useQuery({ queryKey: qk.categories(true), queryFn: () => categoriesApi.list(true) });
  const teachers = useQuery({ queryKey: qk.teachersDirectory, queryFn: () => instructorsApi.directory() });
  const courses = useQuery({ queryKey: qk.courses({ pageSize: 100, blogPicker: true }), queryFn: () => coursesApi.list({ pageSize: 100 }) });

  const errorText = (e: unknown) => {
    const code = e instanceof ApiError ? (e.code as keyof typeof b.errors) : undefined;
    return (code && b.errors[code]) || (e instanceof Error ? e.message : String(e));
  };

  const save = useMutation({
    mutationFn: (status: BlogPostStatus) => {
      const input: BlogPostInput = {
        slug: d.slug.trim(),
        titleAr: d.titleAr.trim(),
        titleEn: d.titleEn.trim() || null,
        excerptAr: d.excerptAr.trim(),
        excerptEn: d.excerptEn.trim() || null,
        bodyAr: d.bodyAr.trim(),
        bodyEn: d.bodyEn.trim() || null,
        coverImageUrl: d.coverImageUrl,
        categorySlug: d.categorySlug || null,
        tags: d.tags
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, BLOG_TAGS_MAX),
        authorId: d.authorId || null,
        courseIds: d.courseIds,
        status,
        publishedAt: d.publishAt ? new Date(d.publishAt) : null,
      };
      return post ? blogApi.admin.update(post.id, input) : blogApi.admin.create(input);
    },
    onSuccess: (saved, status) => {
      toast.success(status === 'DRAFT' ? (post?.status === 'PUBLISHED' ? b.unpublishedDone : b.saved) : saved.live ? b.publishedDone : b.scheduledDone);
      void qc.invalidateQueries({ queryKey: ['admin', 'blog'] });
      void qc.invalidateQueries({ queryKey: ['blog'] });
      if (!post) router.replace(`/admin/blog/${saved.id}`);
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const remove = useMutation({
    mutationFn: () => blogApi.admin.remove(post!.id),
    onSuccess: () => {
      toast.success(b.deleted);
      void qc.invalidateQueries({ queryKey: ['admin', 'blog'] });
      router.replace('/admin/blog');
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const submit = (status: BlogPostStatus) => {
    if (!BLOG_SLUG.test(d.slug.trim()) || d.titleAr.trim().length < 3 || !d.bodyAr.trim()) return toast.error(b.required);
    save.mutate(status);
  };

  const published = post?.status === 'PUBLISHED';
  const courseList = courses.data?.items ?? [];
  const picked = d.courseIds.map((cid) => courseList.find((c) => c.id === cid) ?? post?.courses.find((c) => c.id === cid)).filter((c) => !!c);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {b.back}
      </Link>
      <PageTitle
        kicker={b.title}
        title={post ? b.editTitle : b.newTitle}
        aside={
          post?.live ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/ar/blog/${post.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink /> {b.viewLive}
              </a>
            </Button>
          ) : undefined
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <Panel>
          <Tabs defaultValue="ar">
            <TabsList>
              <TabsTrigger value="ar">{b.arabic}</TabsTrigger>
              <TabsTrigger value="en">{b.english}</TabsTrigger>
            </TabsList>
            <TabsContent value="ar" className="flex flex-col gap-5 pt-4">
              <LanguageFields lang="ar" title={d.titleAr} excerpt={d.excerptAr} body={d.bodyAr} onTitle={(v) => set('titleAr', v)} onExcerpt={(v) => set('excerptAr', v)} onBody={(v) => set('bodyAr', v)} />
            </TabsContent>
            <TabsContent value="en" className="flex flex-col gap-5 pt-4">
              <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{b.englishHint}</p>
              <LanguageFields lang="en" title={d.titleEn} excerpt={d.excerptEn} body={d.bodyEn} onTitle={(v) => set('titleEn', v)} onExcerpt={(v) => set('excerptEn', v)} onBody={(v) => set('bodyEn', v)} />
            </TabsContent>
          </Tabs>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel className="gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-slug`}>{b.slug}</Label>
              <Input id={`${id}-slug`} dir="ltr" value={d.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="learn-excel-basics" />
              <span className="text-[13px] text-muted-foreground">{b.slugHint}</span>
              {d.titleEn.trim() && !d.slug && (
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => set('slug', slugify(d.titleEn))}>
                  {b.suggestSlug}
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-publish`}>{b.publishAt}</Label>
              <Input id={`${id}-publish`} type="datetime-local" value={d.publishAt} onChange={(e) => set('publishAt', e.target.value)} />
              <span className="text-[13px] text-muted-foreground">{b.publishAtHint}</span>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="button" variant="ink" disabled={save.isPending} onClick={() => submit('PUBLISHED')}>
                {published ? b.saveChanges : b.publish}
              </Button>
              <Button type="button" variant="outline" disabled={save.isPending} onClick={() => submit('DRAFT')}>
                {published ? b.unpublish : b.saveDraft}
              </Button>
              {post && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" disabled={remove.isPending}>
                      {b.delete}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{b.delete}</AlertDialogTitle>
                      <AlertDialogDescription>{b.deleteConfirm}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{b.cancel}</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => remove.mutate()}>
                        {b.delete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Panel>

          <Panel className="gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{b.cover}</span>
              <CoverPhotoField value={d.coverImageUrl} onChange={(v) => set('coverImageUrl', v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-category`}>{b.category}</Label>
              <Select value={d.categorySlug || NONE} onValueChange={(v) => set('categorySlug', v === NONE ? '' : v)}>
                <SelectTrigger id={`${id}-category`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{b.noCategory}</SelectItem>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {pick(c.nameEn, c.nameAr).text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-tags`}>{b.tags}</Label>
              <Input id={`${id}-tags`} dir="auto" value={d.tags} onChange={(e) => set('tags', e.target.value)} />
              <span className="text-[13px] text-muted-foreground">{b.tagsHint}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-author`}>{b.author}</Label>
              <Select value={d.authorId || NONE} onValueChange={(v) => set('authorId', v === NONE ? '' : v)}>
                <SelectTrigger id={`${id}-author`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{b.authorAzza}</SelectItem>
                  {post?.author && !(teachers.data ?? []).some((x) => x.id === post.author!.id) && <SelectItem value={post.author.id}>{post.author.name}</SelectItem>}
                  {(teachers.data ?? []).map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Panel>

          <Panel className="gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{b.relatedCourses}</span>
              <span className="text-[13px] text-muted-foreground">{b.relatedHint}</span>
            </div>
            {picked.length === 0 ? (
              <span className="text-sm text-muted-foreground">{b.noCourses}</span>
            ) : (
              <ol className="flex flex-col gap-2">
                {picked.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="truncate">{pick(c.titleEn, c.titleAr).text}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.common.remove}
                      onClick={() => set('courseIds', d.courseIds.filter((x) => x !== c.id))}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
            {d.courseIds.length < BLOG_RELATED_COURSES_MAX && (
              <Select value="" onValueChange={(v) => v && set('courseIds', [...d.courseIds, v])}>
                <SelectTrigger aria-label={b.addCourse} className="w-full">
                  <SelectValue placeholder={b.addCourse} />
                </SelectTrigger>
                <SelectContent>
                  {courseList
                    .filter((c) => !d.courseIds.includes(c.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {pick(c.titleEn, c.titleAr).text}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Title, summary and article for one language, with a Write / Preview switch for the Markdown. */
function LanguageFields({
  lang,
  title,
  excerpt,
  body,
  onTitle,
  onExcerpt,
  onBody,
}: {
  lang: 'ar' | 'en';
  title: string;
  excerpt: string;
  body: string;
  onTitle: (v: string) => void;
  onExcerpt: (v: string) => void;
  onBody: (v: string) => void;
}) {
  const { t } = useI18n();
  const b = t.adminBlog;
  const id = useId();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>{b.titleLabel}</Label>
        <Input id={`${id}-title`} lang={lang} dir={dir} maxLength={160} value={title} onChange={(e) => onTitle(e.target.value)} className="text-lg font-bold" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-excerpt`}>{b.excerpt}</Label>
        <Textarea id={`${id}-excerpt`} lang={lang} dir={dir} rows={2} maxLength={300} value={excerpt} onChange={(e) => onExcerpt(e.target.value)} />
        <span className="text-[13px] text-muted-foreground">{b.excerptHint}</span>
      </div>
      <Tabs defaultValue="write" className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-body`}>{b.body}</Label>
          <TabsList>
            <TabsTrigger value="write">{b.write}</TabsTrigger>
            <TabsTrigger value="preview">{b.preview}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write" className="flex flex-col gap-1.5">
          <Textarea id={`${id}-body`} lang={lang} dir={dir} rows={22} value={body} onChange={(e) => onBody(e.target.value)} className="font-mono text-[14px] leading-7" />
          <span className="text-[13px] text-muted-foreground">{b.bodyHint}</span>
        </TabsContent>
        <TabsContent value="preview">
          <div lang={lang} className="min-h-64 rounded-xl border border-border p-6">
            {body.trim() ? <Markdown source={body} dir={dir} className="text-[17px] leading-[1.85]" /> : <span className="text-muted-foreground">{b.previewEmpty}</span>}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
