import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../learn/presentation/lesson_screen.dart' show lessonMarkdownStyle;
import '../data/announcements_repository.dart';
import '../domain/announcement_models.dart';

/// Markdown reduced to one plain line for previews (strips headings, emphasis, links and list marks).
String plainPreview(String markdown) => markdown
    .replaceAllMapped(RegExp(r'\[([^\]]*)\]\([^)]*\)'), (m) => m[1] ?? '')
    .replaceAll(RegExp(r'^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+', multiLine: true), '')
    .replaceAll(RegExp(r'[*_`~]'), '')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

/// Where an announcement comes from: its class, or the Azza team.
String announcementSource(AppLocalizations l, AppLocale locale, Announcement a) =>
    a.isPlatform || a.batch == null ? l.fromAzzaTeam : '${a.batch!.code} · ${a.batch!.title(locale)}';

/// A full announcement: pinned tag, title, markdown body, author and date.
class AnnouncementCard extends ConsumerWidget {
  const AnnouncementCard({super.key, required this.announcement, this.onDelete, this.showSource = true});
  final Announcement announcement;
  final VoidCallback? onDelete;
  final bool showSource;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final a = announcement;
    return SectionCard(
      key: Key('announcement-${a.id}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if (a.pinned) ...[
            Icon(Icons.push_pin_rounded, size: 16, color: p.accent),
            const SizedBox(width: 4),
            Text(l.pinnedLabel, style: t.labelMedium?.copyWith(color: p.accent)),
            const SizedBox(width: 10),
          ],
          if (showSource) Expanded(child: Text(announcementSource(l, locale, a), maxLines: 1, overflow: TextOverflow.ellipsis, style: t.labelMedium?.copyWith(color: p.muted))) else const Spacer(),
          if (onDelete != null)
            IconButton(
              key: Key('announcement-delete-${a.id}'),
              tooltip: l.announcementDelete,
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              onPressed: onDelete,
              icon: Icon(Icons.delete_outline_rounded, size: 20, color: p.muted),
            ),
        ]),
        const SizedBox(height: 6),
        Text(a.title, style: t.titleMedium),
        const SizedBox(height: 8),
        MarkdownBody(
          data: a.body,
          styleSheet: lessonMarkdownStyle(context).copyWith(p: t.bodyMedium),
          onTapLink: (_, href, _) => openExternal(context, href),
        ),
        const SizedBox(height: 12),
        Row(children: [
          if (a.author != null) ...[
            InitialsAvatar(a.author!.name, size: 24, imageUrl: a.author!.image),
            const SizedBox(width: 8),
            Flexible(child: Text(a.author!.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.bodySmall)),
            Text('  ·  ', style: t.bodySmall?.copyWith(color: p.muted)),
          ],
          Text(f.shortDate(a.createdAt), style: t.bodySmall?.copyWith(color: p.muted)),
        ]),
      ]),
    );
  }
}

/// A compact announcement for strips and the class hub: title and a one-line preview.
class AnnouncementPreview extends ConsumerWidget {
  const AnnouncementPreview({super.key, required this.announcement, this.onTap, this.showSource = true});
  final Announcement announcement;
  final VoidCallback? onTap;
  final bool showSource;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final a = announcement;
    return InkWell(
      key: Key('announcement-preview-${a.id}'),
      onTap: onTap,
      borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            if (a.pinned) ...[Icon(Icons.push_pin_rounded, size: 14, color: p.accent), const SizedBox(width: 4)],
            Expanded(
              child: Text(
                showSource ? announcementSource(l, locale, a) : f.shortDate(a.createdAt),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: t.labelSmall?.copyWith(color: p.muted),
              ),
            ),
            if (showSource) Text(f.shortDate(a.createdAt), style: t.labelSmall?.copyWith(color: p.muted)),
          ]),
          const SizedBox(height: 4),
          Text(a.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.titleSmall),
          const SizedBox(height: 2),
          Text(plainPreview(a.body), maxLines: 2, overflow: TextOverflow.ellipsis, style: t.bodySmall?.copyWith(color: p.muted)),
        ]),
      ),
    );
  }
}

/// Student home: "Latest from your classes". Hidden while loading, on error, or with nothing to show.
class LatestAnnouncementsStrip extends ConsumerWidget {
  const LatestAnnouncementsStrip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(myAnnouncementsProvider).value?.items ?? const <Announcement>[];
    if (items.isEmpty) return const SizedBox.shrink();
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return Column(
      key: const Key('home-announcements'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.latestFromClasses, action: l.seeAll, onAction: () => context.push(Routes.announcements)),
        SizedBox(
          height: context.scaled(132),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length.clamp(0, 5),
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) => SizedBox(
              width: 260,
              child: Material(
                color: p.raised,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AzzaSpace.radius), side: BorderSide(color: p.line)),
                clipBehavior: Clip.antiAlias,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: AnnouncementPreview(
                    announcement: items[i],
                    onTap: () => context.push(
                      items[i].batch != null && !items[i].isPlatform ? Routes.batchAnnouncements(items[i].batch!.id) : Routes.announcements,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// "New announcement": a class announcement when [batchId] is set (teacher or admin), otherwise a platform one (admin).
/// Resolves to true when something was posted.
Future<bool> showAnnouncementSheet(BuildContext context, {String? batchId}) async {
  final posted = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => AnnouncementComposeSheet(batchId: batchId),
  );
  return posted ?? false;
}

class AnnouncementComposeSheet extends ConsumerStatefulWidget {
  const AnnouncementComposeSheet({super.key, this.batchId});
  final String? batchId;

  @override
  ConsumerState<AnnouncementComposeSheet> createState() => _AnnouncementComposeSheetState();
}

class _AnnouncementComposeSheetState extends ConsumerState<AnnouncementComposeSheet> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _body = TextEditingController();
  var _audience = AnnouncementAudience.all;
  var _pinned = false;
  var _notify = true;
  var _busy = false;

  bool get _platform => widget.batchId == null;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _post() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final draft = AnnouncementDraft(
      title: _title.text.trim(),
      body: _body.text.trim(),
      pinned: _pinned,
      notify: _notify,
      audience: _platform ? _audience : null,
    );
    final repo = ref.read(announcementsRepositoryProvider);
    try {
      if (_platform) {
        await repo.postPlatform(draft);
      } else {
        await repo.postToBatch(widget.batchId!, draft);
      }
      ref.invalidate(myAnnouncementsProvider);
      if (!_platform) ref.invalidate(batchAnnouncementsProvider(widget.batchId!));
      if (!mounted) return;
      showToast(context, context.l10n.announcementPosted);
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Form(
        key: _form,
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 20),
          children: [
            Text(_platform ? l.platformAnnouncement : l.newAnnouncement, style: t.titleLarge),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('announcement-title'),
              controller: _title,
              maxLength: 120,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              decoration: fieldDecoration(label: l.announcementTitleLabel, icon: Icons.campaign_outlined, action: ClearFieldButton(controller: _title)),
              validator: (v) => (v ?? '').trim().isEmpty ? l.announcementTitleRequired : null,
            ),
            const SizedBox(height: 8),
            TextFormField(
              key: const Key('announcement-body'),
              controller: _body,
              minLines: 4,
              maxLines: 10,
              maxLength: 4000,
              textCapitalization: TextCapitalization.sentences,
              keyboardType: TextInputType.multiline,
              decoration: fieldDecoration(label: l.announcementBodyLabel, icon: Icons.notes_rounded, hint: l.announcementBodyHint),
              validator: (v) => (v ?? '').trim().isEmpty ? l.announcementBodyRequired : null,
            ),
            if (_platform) ...[
              const SizedBox(height: 8),
              Text(l.announcementAudience, style: t.titleSmall?.copyWith(color: p.muted)),
              const SizedBox(height: 8),
              SegmentedButton<AnnouncementAudience>(
                key: const Key('announcement-audience'),
                segments: [
                  ButtonSegment(value: AnnouncementAudience.all, label: Text(l.audienceAll)),
                  ButtonSegment(value: AnnouncementAudience.students, label: Text(l.audienceStudents)),
                  ButtonSegment(value: AnnouncementAudience.teachers, label: Text(l.audienceTeachers)),
                ],
                selected: {_audience},
                onSelectionChanged: (s) => setState(() => _audience = s.first),
              ),
            ],
            const SizedBox(height: 8),
            SwitchListTile(
              key: const Key('announcement-pin'),
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.push_pin_outlined),
              title: Text(l.announcementPin),
              value: _pinned,
              onChanged: (v) => setState(() => _pinned = v),
            ),
            SwitchListTile(
              key: const Key('announcement-notify'),
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.notifications_active_outlined),
              title: Text(l.announcementNotify),
              subtitle: Text(_platform ? l.announcementNotifyPlatformHint : l.announcementNotifyClassHint),
              value: _notify,
              onChanged: (v) => setState(() => _notify = v),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              key: const Key('announcement-post'),
              onPressed: _busy ? null : _post,
              icon: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_rounded),
              label: Text(l.announcementPost),
            ),
          ],
        ),
      ),
    );
  }
}
