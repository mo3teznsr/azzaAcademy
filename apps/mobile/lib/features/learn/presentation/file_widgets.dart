import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart' show appConfigProvider;
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/links.dart';
import '../data/file_uploads.dart';

IconData fileIcon(String name) => switch (fileExtension(name)) {
      'png' || 'jpg' || 'jpeg' || 'webp' => Icons.image_outlined,
      'zip' => Icons.folder_zip_outlined,
      'mp3' || 'm4a' => Icons.audiotrack_outlined,
      'pptx' => Icons.slideshow_outlined,
      'xlsx' => Icons.table_chart_outlined,
      _ => Icons.description_outlined,
    };

/// A file row: type icon, name, size, and an optional trailing control. Grows with the text.
class FileRow extends StatelessWidget {
  const FileRow({super.key, required this.name, required this.size, this.trailing, this.onTap, this.progress});
  final String name;
  final int size;
  final Widget? trailing;
  final VoidCallback? onTap;

  /// Upload progress (0–1) shown under the name; null when not uploading.
  final double? progress;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(children: [
            Icon(fileIcon(name), size: 22, color: p.muted),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, style: t.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                if (progress != null) ...[
                  const SizedBox(height: 6),
                  Semantics(
                    label: context.l10n.filesUploadingPercent('${(progress! * 100).round()}'),
                    child: LinearProgressIndicator(value: progress, minHeight: 4, borderRadius: BorderRadius.circular(2)),
                  ),
                ] else
                  Text(fileSizeLabel(size), style: t.bodySmall),
              ]),
            ),
            ?trailing,
          ]),
        ),
      ),
    );
  }
}

/// Stored files with name and size; tapping one opens it in the system viewer.
class AttachedFilesList extends ConsumerWidget {
  const AttachedFilesList({super.key, required this.files});
  final List<AttachedFile> files;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    void open(AttachedFile f) => openExternal(context, ref.read(appConfigProvider).resolveMediaUrl(f.url));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final f in files)
        FileRow(
          key: Key('file-${f.name}'),
          name: f.name,
          size: f.size,
          onTap: () => open(f),
          trailing: IconButton(
            tooltip: l.filesOpen(f.name),
            icon: const Icon(Icons.open_in_new_rounded, size: 20),
            onPressed: () => open(f),
          ),
        ),
    ]);
  }
}
