import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/me_repository.dart';

/// Takes or picks a photo (square-ish, ≤1024px JPEG) and uploads it as the profile photo.
/// Returns true when the photo was saved.
Future<bool> pickAndUploadAvatar(BuildContext context, WidgetRef ref) async {
  final l = context.l10n;
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    builder: (context) => SafeArea(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(
          key: const Key('photo-camera'),
          leading: const Icon(Icons.photo_camera_outlined),
          title: Text(l.takePhoto),
          onTap: () => Navigator.pop(context, ImageSource.camera),
        ),
        ListTile(
          key: const Key('photo-library'),
          leading: const Icon(Icons.photo_library_outlined),
          title: Text(l.chooseFromLibrary),
          onTap: () => Navigator.pop(context, ImageSource.gallery),
        ),
      ]),
    ),
  );
  if (source == null) return false;
  final XFile? file;
  try {
    file = await ref.read(imagePickerProvider).pickImage(
          source: source,
          maxWidth: 1024,
          maxHeight: 1024,
          imageQuality: 85,
          preferredCameraDevice: CameraDevice.front,
        );
  } catch (_) {
    if (context.mounted) showToast(context, l.photoPickFailed);
    return false;
  }
  if (file == null) return false;
  try {
    final updated = await ref.read(meRepositoryProvider).uploadAvatar(await file.readAsBytes());
    ref.read(authControllerProvider.notifier).updateUser(updated);
    return true;
  } catch (e) {
    if (context.mounted) showToast(context, errorText(context, e));
    return false;
  }
}

/// Overridable in tests.
final imagePickerProvider = Provider<ImagePicker>((ref) => ImagePicker());

/// Large round photo with a camera badge; tapping changes it.
class AvatarEditor extends ConsumerStatefulWidget {
  const AvatarEditor({super.key, this.size = 112});
  final double size;

  @override
  ConsumerState<AvatarEditor> createState() => _AvatarEditorState();
}

class _AvatarEditorState extends ConsumerState<AvatarEditor> {
  bool _busy = false;

  Future<void> _change() async {
    setState(() => _busy = true);
    await pickAndUploadAvatar(context, ref);
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final user = ref.watch(currentUserProvider);
    return Semantics(
      button: true,
      label: context.l10n.changePhoto,
      child: InkWell(
        key: const Key('avatar-editor'),
        customBorder: const CircleBorder(),
        onTap: _busy ? null : _change,
        child: Stack(clipBehavior: Clip.none, children: [
          InitialsAvatar(user?.name ?? '', size: widget.size, color: p.raised, imageUrl: user?.image),
          if (_busy)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(shape: BoxShape.circle, color: p.ground.withValues(alpha: 0.6)),
                child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
            ),
          PositionedDirectional(
            end: 0,
            bottom: 0,
            child: Container(
              width: widget.size * 0.32,
              height: widget.size * 0.32,
              decoration: BoxDecoration(color: p.accent, shape: BoxShape.circle, border: Border.all(color: p.ground, width: 3)),
              child: Icon(Icons.photo_camera_rounded, size: widget.size * 0.15, color: p.onAccent),
            ),
          ),
        ]),
      ),
    );
  }
}
