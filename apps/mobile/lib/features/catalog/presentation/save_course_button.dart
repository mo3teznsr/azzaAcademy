import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/widgets/cover_scroll_view.dart';
import '../../../core/widgets/ui.dart';
import '../data/reviews_repository.dart';

/// Heart toggle on the course cover. Saved state comes from `GET /me/saved-courses`; the tap flips it at once
/// and rolls back if the server refuses.
class SaveCourseButton extends ConsumerStatefulWidget {
  const SaveCourseButton({super.key, required this.courseId});
  final String courseId;

  @override
  ConsumerState<SaveCourseButton> createState() => _SaveCourseButtonState();
}

class _SaveCourseButtonState extends ConsumerState<SaveCourseButton> {
  bool? _optimistic;
  bool _busy = false;

  Future<void> _toggle(bool saved) async {
    final l = context.l10n;
    setState(() {
      _optimistic = !saved;
      _busy = true;
    });
    try {
      await ref.read(reviewsRepositoryProvider).setSaved(widget.courseId, !saved);
      ref.invalidate(savedCoursesProvider);
      if (mounted) showToast(context, saved ? l.unsavedToast : l.savedToast);
    } catch (e) {
      if (mounted) {
        setState(() => _optimistic = saved);
        showToast(context, errorText(context, e));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final fromServer = ref.watch(savedCoursesProvider).value?.any((c) => c.id == widget.courseId) ?? false;
    final saved = _optimistic ?? fromServer;
    return Semantics(
      toggled: saved,
      child: CoverButton(
        key: const Key('save-course'),
        icon: saved ? Icons.favorite_rounded : Icons.favorite_border_rounded,
        tooltip: saved ? l.unsaveCourse : l.saveCourse,
        onPressed: _busy ? () {} : () => _toggle(saved),
      ),
    );
  }
}
