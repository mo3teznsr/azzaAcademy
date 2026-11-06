import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/reviews_repository.dart';
import '../domain/catalog_models.dart';
import '../domain/review_models.dart';
import 'catalog_widgets.dart';

/// Rating summary, the student's own review (write / edit / delete), and the paged list with teacher replies.
/// [canReply] = the viewer teaches this course; [isAdmin] adds Hide / Unhide.
class CourseReviewsSection extends ConsumerStatefulWidget {
  const CourseReviewsSection({super.key, required this.course, this.canReply = false, this.isAdmin = false});
  final Course course;
  final bool canReply;
  final bool isAdmin;

  @override
  ConsumerState<CourseReviewsSection> createState() => _CourseReviewsSectionState();
}

class _CourseReviewsSectionState extends ConsumerState<CourseReviewsSection> {
  /// Pages after the first, loaded with "Load more".
  final List<CourseReview> _more = [];
  int _page = 1;
  bool _loadingMore = false;

  String get _id => widget.course.id;

  void _reload() {
    setState(() {
      _more.clear();
      _page = 1;
    });
    ref.invalidate(courseReviewsProvider(_id));
  }

  Future<void> _loadMore() async {
    setState(() => _loadingMore = true);
    try {
      final next = await ref.read(reviewsRepositoryProvider).reviews(_id, page: _page + 1);
      if (!mounted) return;
      setState(() {
        _page = next.page;
        _more.addAll(next.items);
      });
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _write(CourseReview? mine) async {
    final l = context.l10n;
    final result = await showModalBottomSheet<_ReviewEdit>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _ReviewSheet(initial: mine),
    );
    if (result == null || !mounted) return;
    final repo = ref.read(reviewsRepositoryProvider);
    try {
      if (result.delete) {
        await repo.deleteMine(_id);
      } else {
        await repo.saveMine(_id, rating: result.rating, body: result.body);
      }
      _reload();
      if (mounted) showToast(context, result.delete ? l.reviewDeleted : l.reviewSaved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  Future<void> _reply(CourseReview r) async {
    final l = context.l10n;
    final text = await showDialog<String>(context: context, builder: (_) => _ReplyDialog(review: r));
    if (text == null || !mounted) return;
    try {
      await ref.read(reviewsRepositoryProvider).reply(r.id, text);
      _reload();
      if (mounted) showToast(context, l.replySent);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  Future<void> _toggleHidden(CourseReview r) async {
    try {
      await ref.read(reviewsRepositoryProvider).setHidden(r.id, !r.hidden);
      _reload();
      if (mounted) showToast(context, context.l10n.reviewDone);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final page = ref.watch(courseReviewsProvider(_id));
    final data = page.value;
    if (data == null) {
      return SectionCard(
        title: l.reviewsTitle,
        margin: const EdgeInsets.only(top: 24),
        child: page.hasError ? ErrorState(error: page.error!, onRetry: _reload) : const LoadingState(),
      );
    }
    final items = [...data.items, ..._more];
    final hasMore = items.length < data.total;
    return Column(key: const Key('course-reviews'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionCard(
        title: l.reviewsTitle,
        margin: const EdgeInsets.only(top: 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (data.ratingCount > 0) _Summary(page: data) else Text(l.noReviewsYet, style: Theme.of(context).textTheme.bodyMedium),
          if (data.canReview && data.mine == null) ...[
            const SizedBox(height: 14),
            OutlinedButton.icon(
              key: const Key('write-review'),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              onPressed: () => _write(null),
              icon: const Icon(Icons.rate_review_outlined, size: 18),
              label: Text(l.writeReview),
            ),
          ],
        ]),
      ),
      if (data.mine != null)
        _ReviewTile(
          review: data.mine!,
          mine: true,
          onEdit: () => _write(data.mine),
        ),
      for (final r in items)
        if (r.id != data.mine?.id)
          _ReviewTile(
            review: r,
            onReply: widget.canReply || widget.isAdmin ? () => _reply(r) : null,
            onToggleHidden: widget.isAdmin ? () => _toggleHidden(r) : null,
          ),
      if (hasMore)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: TextButton(
            key: const Key('load-more-reviews'),
            style: TextButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            onPressed: _loadingMore ? null : _loadMore,
            child: _loadingMore
                ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : Text('${l.loadMore} · ${f.n(data.total - items.length)}'),
          ),
        ),
    ]);
  }
}

/// Big average, stars, count and one bar per star.
class _Summary extends ConsumerWidget {
  const _Summary({required this.page});
  final ReviewsPage page;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final bar = p.isDark ? AzzaColors.sun : AzzaColors.sunDeep;
    return Row(key: const Key('rating-summary'), crossAxisAlignment: CrossAxisAlignment.start, children: [
      Semantics(
        label: l.ratingSemantics(f.n(page.ratingAvg.toStringAsFixed(1)), f.n(page.ratingCount)),
        child: ExcludeSemantics(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            DisplayText(f.n(page.ratingAvg.toStringAsFixed(1)), size: 44),
            RatingStars(page.ratingAvg, size: 16),
            const SizedBox(height: 4),
            Text(l.reviewsCount(f.n(page.ratingCount)), style: t.bodySmall),
          ]),
        ),
      ),
      const SizedBox(width: 20),
      Expanded(
        child: Column(children: [
          for (var star = 5; star >= 1; star--)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(children: [
                SizedBox(width: 16, child: MonoLabel(f.n(star))),
                Expanded(
                  child: LinearProgressIndicator(
                    key: Key('rating-bar-$star'),
                    value: page.ratingCount == 0 ? 0 : (page.distribution[star] ?? 0) / page.ratingCount,
                    minHeight: 6,
                    color: bar,
                    backgroundColor: p.line,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                SizedBox(width: 32, child: Text(f.n(page.distribution[star] ?? 0), style: t.bodySmall, textAlign: TextAlign.end)),
              ]),
            ),
        ]),
      ),
    ]);
  }
}

class _ReviewTile extends ConsumerWidget {
  const _ReviewTile({required this.review, this.mine = false, this.onEdit, this.onReply, this.onToggleHidden});
  final CourseReview review;
  final bool mine;
  final VoidCallback? onEdit;
  final VoidCallback? onReply;
  final VoidCallback? onToggleHidden;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final r = review;
    return SectionCard(
      key: Key('review-${r.id}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          InitialsAvatar(r.userName, size: 36, imageUrl: r.userImage),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(mine ? l.yourReview : r.userName, style: t.titleSmall),
              Row(children: [
                RatingStars(r.rating.toDouble(), size: 13),
                if (r.createdAt != null) ...[const SizedBox(width: 8), MonoLabel(f.shortDate(r.createdAt!))],
              ]),
            ]),
          ),
          if (r.hidden) StatusChip(label: l.hiddenLabel, color: p.muted, look: ChipLook.dashed),
          if (onEdit != null)
            IconButton(key: const Key('edit-my-review'), tooltip: l.editReview, onPressed: onEdit, icon: const Icon(Icons.edit_outlined, size: 20)),
        ]),
        if (r.body.isNotEmpty) ...[const SizedBox(height: 8), Text(r.body, style: t.bodyMedium)],
        if (r.teacherReply != null && r.teacherReply!.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: p.ground, borderRadius: BorderRadius.circular(AzzaSpace.radiusSm)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              MonoLabel(l.teacherReply),
              const SizedBox(height: 4),
              Text(r.teacherReply!, style: t.bodyMedium),
            ]),
          ),
        if (onReply != null || onToggleHidden != null)
          Wrap(spacing: 4, children: [
            if (onReply != null)
              TextButton.icon(
                key: Key('reply-${r.id}'),
                style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                onPressed: onReply,
                icon: const Icon(Icons.reply_rounded, size: 18),
                label: Text(l.replyAction),
              ),
            if (onToggleHidden != null)
              TextButton.icon(
                key: Key('hide-${r.id}'),
                style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                onPressed: onToggleHidden,
                icon: Icon(r.hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18),
                label: Text(r.hidden ? l.unhideReview : l.hideReview),
              ),
          ]),
      ]),
    );
  }
}

class _ReviewEdit {
  const _ReviewEdit({this.rating = 0, this.body = '', this.delete = false});
  final int rating;
  final String body;
  final bool delete;
}

/// Star picker + text, in a bottom sheet. Returns the edit, a delete, or null.
class _ReviewSheet extends StatefulWidget {
  const _ReviewSheet({this.initial});
  final CourseReview? initial;

  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  late int _rating = widget.initial?.rating ?? 0;
  late final _body = TextEditingController(text: widget.initial?.body ?? '');
  String? _error;

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.deleteReviewConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
          FilledButton(key: const Key('confirm-delete-review'), onPressed: () => Navigator.pop(context, true), child: Text(l.deleteReview)),
        ],
      ),
    );
    if (ok == true && mounted) Navigator.pop(context, const _ReviewEdit(delete: true));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final star = p.isDark ? AzzaColors.sun : AzzaColors.sunDeep;
    return Padding(
      padding: EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, MediaQuery.viewInsetsOf(context).bottom + 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(widget.initial == null ? l.writeReview : l.editReview, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 1; i <= 5; i++)
            IconButton(
              key: Key('star-$i'),
              tooltip: l.starsN('$i'),
              iconSize: 34,
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              onPressed: () => setState(() {
                _rating = i;
                _error = null;
              }),
              icon: Icon(i <= _rating ? Icons.star_rounded : Icons.star_outline_rounded, color: i <= _rating ? star : p.muted),
            ),
        ]),
        if (_error != null) Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        const SizedBox(height: 8),
        TextField(
          key: const Key('review-body'),
          controller: _body,
          minLines: 3,
          maxLines: 6,
          maxLength: 2000,
          textCapitalization: TextCapitalization.sentences,
          decoration: fieldDecoration(label: l.reviewBodyLabel, icon: Icons.notes_rounded, action: ClearFieldButton(controller: _body)),
        ),
        const SizedBox(height: 8),
        FilledButton(
          key: const Key('post-review'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: () {
            if (_rating < 1) return setState(() => _error = l.ratingRequired);
            Navigator.pop(context, _ReviewEdit(rating: _rating, body: _body.text));
          },
          child: Text(l.postReview),
        ),
        if (widget.initial != null)
          TextButton.icon(
            key: const Key('delete-review'),
            style: TextButton.styleFrom(minimumSize: const Size.fromHeight(48), foregroundColor: p.danger),
            onPressed: _delete,
            icon: const Icon(Icons.delete_outline_rounded, size: 18),
            label: Text(l.deleteReview),
          ),
      ]),
    );
  }
}

class _ReplyDialog extends StatefulWidget {
  const _ReplyDialog({required this.review});
  final CourseReview review;

  @override
  State<_ReplyDialog> createState() => _ReplyDialogState();
}

class _ReplyDialogState extends State<_ReplyDialog> {
  late final _text = TextEditingController(text: widget.review.teacherReply ?? '');
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AlertDialog(
      title: Text(l.replyTo(widget.review.userName)),
      content: TextField(
        key: const Key('reply-text'),
        controller: _text,
        autofocus: true,
        minLines: 2,
        maxLines: 5,
        maxLength: 2000,
        decoration: fieldDecoration(label: l.replyAction, icon: Icons.reply_rounded, action: ClearFieldButton(controller: _text))
            .copyWith(errorText: _error),
      ),
      actions: [
        TextButton(style: TextButton.styleFrom(minimumSize: const Size(64, 44)), onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
        FilledButton(
          key: const Key('send-reply'),
          style: FilledButton.styleFrom(minimumSize: const Size(64, 44)),
          onPressed: () {
            final v = _text.text.trim();
            if (v.length < 2) return setState(() => _error = l.replyTooShort);
            Navigator.pop(context, v);
          },
          child: Text(l.send),
        ),
      ],
    );
  }
}
