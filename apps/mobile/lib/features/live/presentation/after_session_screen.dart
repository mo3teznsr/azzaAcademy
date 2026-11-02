import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/session_repository.dart';
import '../domain/live_models.dart';

/// "That's a wrap." — rate the take, recording status, what's next.
class AfterSessionScreen extends ConsumerStatefulWidget {
  const AfterSessionScreen({super.key, required this.sessionId});
  final String sessionId;

  @override
  ConsumerState<AfterSessionScreen> createState() => _AfterSessionScreenState();
}

class _AfterSessionScreenState extends ConsumerState<AfterSessionScreen> {
  int _rating = 0;
  final _tags = <String>{};
  bool _busy = false;
  bool _sent = false;

  Future<void> _send() async {
    setState(() => _busy = true);
    try {
      await ref.read(sessionRepositoryProvider).feedback(widget.sessionId, rating: _rating, tags: _tags.toList());
      setState(() => _sent = true);
      if (mounted) showToast(context, context.l10n.thanksFeedback);
    } catch (e) {
      if (mounted) showToast(context, AppException.from(e).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final detail = ref.watch(sessionDetailProvider(widget.sessionId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final tags = {'clear': l.tagClear, 'pace': l.tagPace, 'examples': l.tagExamples, 'too_fast': l.tagTooFast, 'audio': l.tagAudio};

    return Scaffold(
      appBar: AppBar(leading: CloseButton(onPressed: () => context.go(Routes.studentHome))),
      body: AsyncView<SessionDetail>(
        value: detail,
        onRetry: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
        data: (d) {
          final ended = d.endedAt ?? d.session.endsAt;
          final batch = d.session.batchId.isEmpty ? null : ref.watch(batchProvider(d.session.batchId)).value;
          final next = batch?.sessions.where((s) => s.number > d.session.number && s.status == SessionStatus.scheduled).firstOrNull;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
            children: [
              MonoLabel(l.endedStayed(f.time(ended), f.n(d.session.duration.inMinutes))),
              const SizedBox(height: 12),
              DisplayText(l.wrapTitle, size: 60, weight: FontWeight.w800),
              const SizedBox(height: 24),
              Text(l.howWas('S${d.session.number.toString().padLeft(2, '0')}'), style: t.titleLarge),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                for (var i = 1; i <= 5; i++)
                  Semantics(
                    button: true,
                    selected: _rating == i,
                    label: '$i',
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _sent ? null : () => setState(() => _rating = i),
                      child: AnimatedContainer(
                        duration: AzzaMotion.quick,
                        width: 56,
                        height: 56,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i <= _rating ? AzzaColors.sun : p.raised,
                          border: Border.all(color: p.line),
                        ),
                        child: Text(f.n(i), style: t.titleMedium?.copyWith(color: i <= _rating ? AzzaColors.ink : p.text)),
                      ),
                    ),
                  ),
              ]),
              const SizedBox(height: 16),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final e in tags.entries)
                  FilterChip(
                    label: Text(e.value),
                    selected: _tags.contains(e.key),
                    showCheckmark: false,
                    labelStyle: TextStyle(color: _tags.contains(e.key) ? p.onAccent : p.text),
                    onSelected: _sent ? null : (v) => setState(() => v ? _tags.add(e.key) : _tags.remove(e.key)),
                  ),
              ]),
              const SizedBox(height: 24),
              RaisedCard(
                onTap: d.session.recordingUrl == null ? null : () => openExternal(context, d.session.recordingUrl),
                child: Row(children: [
                  Icon(d.session.recordingUrl == null ? Icons.hourglass_top_rounded : Icons.play_circle_rounded, color: p.accent),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(d.session.recordingUrl == null ? l.recordingProcessing : l.recordings, style: t.titleSmall),
                      if (d.session.recordingUrl == null) Text(l.recordingSoon, style: t.bodySmall),
                    ]),
                  ),
                ]),
              ),
              if (next != null) ...[
                const SizedBox(height: 12),
                RaisedCard(
                  onTap: () => context.push(Routes.lobby(next.id)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    MonoLabel('${l.nextLabel} · S${next.number.toString().padLeft(2, '0')} · ${f.weekday(next.startsAt)}'),
                    const SizedBox(height: 6),
                    Text(next.title, style: t.titleMedium),
                    Text('${f.dayTime(next.startsAt)} · ${f.n(next.duration.inMinutes)} min', style: t.bodySmall),
                  ]),
                ),
              ],
            ],
          );
        },
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton(onPressed: _rating == 0 || _busy || _sent ? null : _send, child: Text(_sent ? l.thanksFeedback : l.sendFeedback)),
      ]),
    );
  }
}
