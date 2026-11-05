import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/presentation/auth_controller.dart';
import 'avatar_picker.dart';

/// Required step for students without a photo (right after sign-up, and once for older accounts):
/// teachers need to recognise who is in the room. The router sends them on once a photo is saved.
class ProfilePhotoScreen extends ConsumerWidget {
  const ProfilePhotoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(actions: [
        TextButton(onPressed: () => ref.read(authControllerProvider.notifier).signOut(), child: Text(l.signOut)),
      ]),
      body: ListView(
        padding: const EdgeInsets.all(AzzaSpace.gutter),
        children: [
          DisplayText(l.addPhotoTitle, size: 40),
          const SizedBox(height: 12),
          Text(l.addPhotoBody, style: t.bodyLarge?.copyWith(color: p.muted)),
          const SizedBox(height: 36),
          const Center(child: AvatarEditor(size: 160)),
          const SizedBox(height: 28),
          RaisedCard(
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(Icons.info_outline_rounded, color: p.muted, size: 20),
              const SizedBox(width: 10),
              Expanded(child: Text(l.addPhotoTips, style: t.bodyMedium)),
            ]),
          ),
        ],
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton.icon(
          key: const Key('add-photo'),
          onPressed: () => pickAndUploadAvatar(context, ref),
          icon: const Icon(Icons.photo_camera_outlined),
          label: Text(l.addPhotoAction),
        ),
      ]),
    );
  }
}
