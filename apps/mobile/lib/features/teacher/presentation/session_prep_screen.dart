import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../live/data/session_repository.dart';
import '../../live/domain/live_models.dart';

/// Session prep: run of show (agenda), files for students, private notes.
class SessionPrepScreen extends ConsumerStatefulWidget {
  const SessionPrepScreen({super.key, required this.sessionId});
  final String sessionId;

  @override
  ConsumerState<SessionPrepScreen> createState() => _SessionPrepScreenState();
}

class _SessionPrepScreenState extends ConsumerState<SessionPrepScreen> {
  List<AgendaBlock>? _agenda;
  final _notes = TextEditingController();
  bool _dirty = false;
  bool _busy = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  void _hydrate(SessionDetail d) {
    if (_agenda != null) return;
    _agenda = [...d.agenda]..sort((a, b) => a.minute.compareTo(b.minute));
    _notes.text = d.notes ?? '';
  }

  Future<void> _addBlock(int maxMinute) async {
    final l = context.l10n;
    final label = TextEditingController();
    final minute = TextEditingController(text: '${_agenda!.isEmpty ? 0 : (_agenda!.last.minute + 10).clamp(0, maxMinute)}');
    final added = await showModalBottomSheet<AgendaBlock>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(controller: label, autofocus: true, decoration: fieldDecoration(label: l.blockLabel, icon: Icons.view_agenda_outlined)),
          const SizedBox(height: 10),
          TextField(controller: minute, keyboardType: TextInputType.number, decoration: fieldDecoration(label: l.atMinute, icon: Icons.timer_outlined)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              if (label.text.trim().isEmpty) return;
              Navigator.pop(context, AgendaBlock(minute: int.tryParse(minute.text) ?? 0, label: label.text.trim()));
            },
            child: Text(l.save),
          ),
        ]),
      ),
    );
    label.dispose();
    minute.dispose();
    if (added == null) return;
    setState(() {
      _agenda = [..._agenda!, added]..sort((a, b) => a.minute.compareTo(b.minute));
      _dirty = true;
    });
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await ref.read(sessionRepositoryProvider).updateAgenda(widget.sessionId, agenda: _agenda, notes: _notes.text);
      setState(() => _dirty = false);
      if (mounted) showToast(context, context.l10n.saved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final detail = ref.watch(sessionDetailProvider(widget.sessionId));
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(l.prepTitle),
        actions: [if (_dirty) TextButton(onPressed: _busy ? null : _save, child: Text(l.save))],
      ),
      body: AsyncView<SessionDetail>(
        value: detail,
        onRetry: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
        data: (d) {
          _hydrate(d);
          final agenda = _agenda!;
          final total = d.session.duration.inMinutes;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
            children: [
              MonoLabel('${d.slate} · ${f.dayTime(d.session.startsAt)}'),
              DisplayText(d.session.title, size: 30),
              SectionHeader(l.runOfShow(f.n(total))),
              for (final (i, b) in agenda.indexed)
                Dismissible(
                  key: ValueKey('${b.minute}-${b.label}-$i'),
                  direction: DismissDirection.endToStart,
                  onDismissed: (_) => setState(() {
                    _agenda = [...agenda]..removeAt(i);
                    _dirty = true;
                  }),
                  background: Container(alignment: AlignmentDirectional.centerEnd, color: AzzaPalette.of(context).dangerBg, child: Icon(Icons.delete_outline, color: AzzaPalette.of(context).danger)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(border: Border(top: BorderSide(color: p.line))),
                    child: Row(children: [
                      SizedBox(width: 64, child: Text(Fmt.timecode(Duration(minutes: b.minute)).substring(0, 5), style: AzzaFonts.mono(size: 14, color: p.accent, tracking: 0))),
                      Expanded(child: Text(b.label, style: t.titleSmall)),
                      MonoLabel('${f.n((i + 1 < agenda.length ? agenda[i + 1].minute : total) - b.minute)} min'),
                    ]),
                  ),
                ),
              TextButton(onPressed: () => _addBlock(total), child: Text(l.addBlock)),
              SectionHeader(l.filesForStudents),
              if (d.materials.isEmpty) Text(l.noMaterials, style: t.bodySmall),
              for (final m in d.materials)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Slate(m.kind),
                  title: Text(m.title),
                  trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                  onTap: () => openExternal(context, m.url),
                ),
              SectionHeader(l.privateNotes),
              TextField(
                controller: _notes,
                maxLines: 5,
                minLines: 3,
                decoration: fieldDecoration(label: l.privateNotes, icon: Icons.sticky_note_2_outlined, labelIsHint: true),
                onChanged: (_) => setState(() => _dirty = true),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: BottomActionBar(children: [
        Row(children: [
          Expanded(child: OutlinedButton(onPressed: () => context.push(Routes.reschedule(widget.sessionId)), child: Text(l.reschedule))),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton(
              onPressed: () async {
                if (_dirty) await _save();
                if (context.mounted) await context.push(Routes.lobby(widget.sessionId));
              },
              child: Text(l.openLobby),
            ),
          ),
        ]),
      ]),
    );
  }
}
