import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/widgets/ui.dart';
import '../../teacher/presentation/proposal_widgets.dart' show BusyButton;
import '../data/back_office_repository.dart';

/// Settings: the default share of each payment that goes to the teacher, for live and for recorded courses.
/// A payment reads the cut when it is made; changing it never touches payments already taken.
class TeacherCutsCard extends ConsumerStatefulWidget {
  const TeacherCutsCard({super.key});

  @override
  ConsumerState<TeacherCutsCard> createState() => _TeacherCutsCardState();
}

class _TeacherCutsCardState extends ConsumerState<TeacherCutsCard> {
  final _live = TextEditingController();
  final _recorded = TextEditingController();
  bool _filled = false;
  bool _busy = false;

  @override
  void dispose() {
    _live.dispose();
    _recorded.dispose();
    super.dispose();
  }

  int? _percent(TextEditingController c) {
    final n = int.tryParse(c.text.trim());
    return n == null || n < 0 || n > 100 ? null : n;
  }

  Future<void> _save() async {
    final l = context.l10n;
    final live = _percent(_live);
    final recorded = _percent(_recorded);
    if (live == null || recorded == null) return showToast(context, l.adminCutInvalid);
    setState(() => _busy = true);
    try {
      await ref.read(backOfficeRepositoryProvider).saveCuts(liveCutPercent: live, recordedCutPercent: recorded);
      ref.invalidate(teacherCutsProvider);
      if (mounted) showToast(context, l.adminCutsSaved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final cuts = ref.watch(teacherCutsProvider);
    final loaded = cuts.value;
    if (loaded != null && !_filled) {
      _filled = true;
      _live.text = '${loaded.liveCutPercent}';
      _recorded.text = '${loaded.recordedCutPercent}';
    }
    InputDecoration deco(String label) => fieldDecoration(label: label, icon: Icons.percent_rounded);
    final formatters = [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)];
    return SectionCard(
      key: const Key('teacher-cuts'),
      title: l.adminCutsTitle,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.adminCutsBody, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 12),
        TextField(key: const Key('cut-live'), controller: _live, keyboardType: TextInputType.number, inputFormatters: formatters, textDirection: TextDirection.ltr, decoration: deco(l.adminCutLive)),
        const SizedBox(height: 12),
        TextField(
            key: const Key('cut-recorded'), controller: _recorded, keyboardType: TextInputType.number, inputFormatters: formatters, textDirection: TextDirection.ltr, decoration: deco(l.adminCutRecorded)),
        const SizedBox(height: 12),
        BusyButton(key: const Key('cuts-save'), label: l.adminCutsSave, busy: _busy, onPressed: loaded == null ? null : _save),
      ]),
    );
  }
}
