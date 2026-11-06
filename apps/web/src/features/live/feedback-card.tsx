'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { sessionFeedbackInput } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { sessionsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

export function FeedbackCard({ sessionId }: { sessionId: string }) {
  const { t, f } = useI18n();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const m = useMutation({ mutationFn: () => sessionsApi.feedback(sessionId, sessionFeedbackInput.parse({ rating, tags, comment: comment || undefined })) });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-[28px] border border-border bg-card p-8">
      <span className="label-mono text-muted-foreground">{t.live.ended}</span>
      <h1 className="font-display text-4xl font-extrabold">{t.live.feedbackTitle}</h1>
      {m.isSuccess ? (
        <p className="rounded-xl bg-sage p-4 text-ink">{t.live.feedbackThanks}</p>
      ) : (
        <>
          <div className="flex gap-1" role="radiogroup" aria-label={t.live.feedbackTitle} dir="ltr">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={f.number(n)} onClick={() => setRating(n)} className="p-1">
                <Star className={cn('size-8', n <= rating ? 'fill-sun text-sun' : 'text-line-2')} />
              </button>
            ))}
          </div>
          <ToggleGroup type="multiple" value={tags} onValueChange={setTags} className="flex flex-wrap justify-start gap-2">
            {t.live.tags.map((tag) => (
              <ToggleGroupItem key={tag} value={tag} className="h-9 rounded-full border border-line px-4 text-sm data-[state=on]:bg-ivory data-[state=on]:text-ink">
                {tag}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.live.comment} rows={3} />
          {m.isError && <p className="text-sm text-danger-fg">{(m.error as Error).message}</p>}
          <Button disabled={!rating || m.isPending} onClick={() => m.mutate()}>
            {t.live.feedbackSend}
          </Button>
        </>
      )}
      <Link href="/learn" className="link-sun text-sm">
        {t.live.backToLearning}
      </Link>
    </div>
  );
}
