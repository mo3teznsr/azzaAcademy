import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../live/presentation/live_room_screen.dart';
import '../data/admin_repository.dart';

/// Live monitor: every LiveKit room — people, quality, recording — join silently.
class LiveMonitorScreen extends ConsumerStatefulWidget {
  const LiveMonitorScreen({super.key});

  @override
  ConsumerState<LiveMonitorScreen> createState() => _LiveMonitorScreenState();
}

class _LiveMonitorScreenState extends ConsumerState<LiveMonitorScreen> {
  bool _issuesOnly = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) ref.invalidate(liveRoomsProvider);
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final rooms = ref.watch(liveRoomsProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Builder(
          builder: (context) {
            final now = DateTime.now();
            return AsyncView<List<LiveRoomStat>>(
              value: rooms,
              onRetry: () => ref.invalidate(liveRoomsProvider),
              data: (all) {
                final list = _issuesOnly ? all.where((r) => r.hasIssue).toList() : all;
                return RefreshList(
                  onRefresh: () async => ref.invalidate(liveRoomsProvider),
                  children: [
                    MonoLabel('${f.time(now)} · ${l.autoRefresh('5')}'),
                    Row(children: [
                      Expanded(child: DisplayText(l.liveMonitorTitle, size: 32)),
                      StatusChip(label: l.liveN(f.n(all.length)), color: AzzaColors.onAir, live: all.isNotEmpty),
                    ]),
                    const SizedBox(height: 12),
                    Wrap(spacing: 8, children: [
                      ChoiceChip(
                        label: Text('${l.allFilter} ${f.n(all.length)}'),
                        selected: !_issuesOnly,
                        showCheckmark: false,
                        labelStyle: TextStyle(color: !_issuesOnly ? p.onAccent : p.text),
                        onSelected: (_) => setState(() => _issuesOnly = false),
                      ),
                      ChoiceChip(
                        label: Text('⚠ ${f.n(all.where((r) => r.hasIssue).length)}'),
                        selected: _issuesOnly,
                        showCheckmark: false,
                        labelStyle: TextStyle(color: _issuesOnly ? p.onAccent : p.text),
                        onSelected: (_) => setState(() => _issuesOnly = true),
                      ),
                    ]),
                    const SizedBox(height: 12),
                    if (list.isEmpty) EmptyState(title: l.noLiveRooms),
                    for (final r in list) ...[
                      RaisedCard(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Slate(Fmt.slate(r.batchCode, r.sessionNumber)),
                            const SizedBox(width: 8),
                            if (r.quality != null) MonoLabel(r.quality!, color: r.hasIssue ? AzzaColors.warnDeep : null),
                            const Spacer(),
                            if (r.recording) ...[
                              const PulsingDot(size: 7),
                              const SizedBox(width: 2),
                              MonoLabel(l.recordingOn, color: AzzaColors.onAir),
                            ],
                          ]),
                          const SizedBox(height: 8),
                          Text(r.courseTitle.isEmpty ? r.title : r.courseTitle, style: t.titleSmall),
                          Text(
                            [
                              l.participantsN(f.n(r.participants)),
                              ?r.teacherName,
                              ?r.region,
                              if (r.startedAt != null) Fmt.timecode(now.difference(r.startedAt!)),
                            ].join(' · '),
                            style: t.bodySmall,
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: () => context.push(Routes.liveRoom(r.sessionId), extra: const JoinOptions(micOn: false, camOn: false)),
                            icon: const Icon(Icons.visibility_outlined),
                            label: Text(l.joinSilently),
                          ),
                        ]),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }
}
