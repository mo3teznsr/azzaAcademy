import 'package:flutter/material.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';

/// The first question of a new course: Live or Recorded. It is fixed once the course exists, so it comes before anything else.
class CourseTypeChooser extends StatelessWidget {
  const CourseTypeChooser({super.key, required this.onPick});
  final ValueChanged<CourseType> onPick;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    Widget option(CourseType type, IconData icon, String title, String body) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: RaisedCard(
            key: Key('course-type-${type.name}'),
            onTap: () => onPick(type),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: p.successBg, borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: p.success),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: t.titleSmall),
                  const SizedBox(height: 2),
                  Text(body, style: t.bodySmall),
                ]),
              ),
              Icon(Icons.chevron_right_rounded, color: p.muted),
            ]),
          ),
        );
    return Scaffold(
      appBar: AppBar(title: Text(l.newCourse)),
      body: ListView(
        key: const Key('course-type-chooser'),
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: [
          DisplayText(l.courseTypeTitle, size: 28),
          const SizedBox(height: 16),
          option(CourseType.live, Icons.sensors_rounded, l.courseTypeLive, l.courseTypeLiveBody),
          option(CourseType.recorded, Icons.play_circle_outline_rounded, l.courseTypeRecorded, l.courseTypeRecordedBody),
          Text(l.courseTypeFixed, style: t.bodySmall),
        ],
      ),
    );
  }
}
