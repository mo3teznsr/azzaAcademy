import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/domain/enums.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/presentation/catalog_widgets.dart' show categoryIcon;
import '../../me/presentation/avatar_picker.dart' show imagePickerProvider;
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

/// Categories: order, names, visibility; edit in a sheet, hide instead of deleting while courses use one.
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  static void _refresh(WidgetRef ref) => ref
    ..invalidate(adminCategoriesProvider)
    ..invalidate(categoriesProvider);

  Future<void> _delete(BuildContext context, WidgetRef ref, AdminCategory c) async {
    final l = context.l10n;
    final ok = await confirmAction(context, title: l.adminDeleteCategoryTitle(c.nameEn), body: l.adminDeleteCategoryBody, confirm: l.adminDelete);
    if (!ok || !context.mounted) return;
    try {
      await ref.read(backOfficeRepositoryProvider).deleteCategory(c.slug);
      _refresh(ref);
      if (context.mounted) showToast(context, l.adminCategoryDeleted(c.nameEn));
    } catch (e) {
      if (!context.mounted) return;
      final err = AppException.from(e);
      if (err.statusCode == 409 || err.code == 'CONFLICT') {
        await _explainConflict(context, ref, c);
      } else {
        showToast(context, errorText(context, e));
      }
    }
  }

  /// 409: the category still has courses. Offer to hide it instead.
  Future<void> _explainConflict(BuildContext context, WidgetRef ref, AdminCategory c) async {
    final l = context.l10n;
    final hide = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        key: const Key('category-conflict'),
        title: Text(l.adminCategoryInUseTitle),
        content: Text(l.adminCategoryInUseBody(c.nameEn)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.close)),
          if (c.active) FilledButton(key: const Key('hide-instead'), onPressed: () => Navigator.pop(context, true), child: Text(l.adminHideInstead)),
        ],
      ),
    );
    if (hide != true || !context.mounted) return;
    await _setActive(context, ref, c, false);
  }

  Future<void> _setActive(BuildContext context, WidgetRef ref, AdminCategory c, bool active) async {
    final l = context.l10n;
    try {
      await ref.read(backOfficeRepositoryProvider).updateCategory(c.slug, {'active': active});
      _refresh(ref);
      if (context.mounted) showToast(context, active ? l.adminCategoryShown : l.adminCategoryHidden);
    } catch (e) {
      if (context.mounted) showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final cats = ref.watch(adminCategoriesProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    Future<void> edit([AdminCategory? c]) async {
      final saved = await showFormSheet<bool>(context, (_) => _CategorySheet(category: c));
      // The sheet can also change the image without saving the form.
      _refresh(ref);
      if (saved == true && context.mounted) showToast(context, l.adminCategorySaved);
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.adminCategoriesTitle), actions: [
        IconButton(key: const Key('new-category'), tooltip: l.adminNewCategory, icon: const Icon(Icons.add_rounded), onPressed: edit),
      ]),
      body: AsyncView<List<AdminCategory>>(
        value: cats,
        onRetry: () => ref.invalidate(adminCategoriesProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.adminNoCategories, action: l.adminNewCategory, onAction: edit),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(adminCategoriesProvider),
          children: [
            CardGroup(children: [
              for (final c in list)
                InkWell(
                  key: Key('category-${c.slug}'),
                  onTap: () => edit(c),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(16, 6, 4, 6),
                    child: Row(children: [
                      SizedBox(width: 28, child: MonoLabel(f.n(c.order))),
                      Padding(padding: const EdgeInsetsDirectional.only(end: 12), child: _CategoryThumb(key: Key('category-thumb-${c.slug}'), category: c, size: 40)),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(locale == AppLocale.ar && (c.nameAr?.isNotEmpty ?? false) ? c.nameAr! : c.nameEn,
                              style: t.titleSmall?.copyWith(color: c.active ? null : p.muted)),
                          Text([c.slug, f.n(l.adminCourseCount(c.courseCount)), if (!c.active) l.adminHidden].join(' · '), style: t.bodySmall),
                        ]),
                      ),
                      IconButton(
                        key: Key('toggle-category-${c.slug}'),
                        tooltip: c.active ? l.adminHide : l.adminShow,
                        onPressed: () => _setActive(context, ref, c, !c.active),
                        icon: Icon(c.active ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      ),
                      IconButton(
                        key: Key('delete-category-${c.slug}'),
                        tooltip: l.adminDelete,
                        onPressed: () => _delete(context, ref, c),
                        icon: Icon(Icons.delete_outline_rounded, color: p.danger),
                      ),
                    ]),
                  ),
                ),
            ]),
          ],
        ),
      ),
    );
  }
}

/// The category's picture, or its icon when it has none.
class _CategoryThumb extends StatelessWidget {
  const _CategoryThumb({super.key, required this.category, required this.size});
  final AdminCategory category;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final icon = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: p.raised, borderRadius: BorderRadius.circular(10), border: Border.all(color: p.line)),
      child: Icon(categoryIcon(category.icon), size: size * 0.5, color: p.muted),
    );
    if (category.imageUrl == null) return icon;
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox.square(dimension: size, child: MediaImage(category.imageUrl, cacheWidth: size, fallback: icon)),
    );
  }
}

class _CategorySheet extends ConsumerStatefulWidget {
  const _CategorySheet({this.category});
  final AdminCategory? category;

  @override
  ConsumerState<_CategorySheet> createState() => _CategorySheetState();
}

class _CategorySheetState extends ConsumerState<_CategorySheet> {
  late final _slug = TextEditingController(text: widget.category?.slug ?? '');
  late final _nameEn = TextEditingController(text: widget.category?.nameEn ?? '');
  late final _nameAr = TextEditingController(text: widget.category?.nameAr ?? '');
  late final _order = TextEditingController(text: '${widget.category?.order ?? 0}');
  late bool _active = widget.category?.active ?? true;
  late String? _imageUrl = widget.category?.imageUrl;
  bool _uploading = false;
  bool _busy = false;
  String? _error;

  bool get _isNew => widget.category == null;

  @override
  void dispose() {
    for (final c in [_slug, _nameEn, _nameAr, _order]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final l = context.l10n;
    if (_isNew && !RegExp(r'^[a-z0-9-]{2,40}$').hasMatch(_slug.text.trim())) return setState(() => _error = l.adminSlugInvalid);
    if (_nameEn.text.trim().length < 2) return setState(() => _error = l.adminNameRequired);
    final body = {
      'nameEn': _nameEn.text.trim(),
      'nameAr': ?(_nameAr.text.trim().isEmpty ? null : _nameAr.text.trim()),
      'order': int.tryParse(_order.text.trim()) ?? 0,
      'active': _active,
    };
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(backOfficeRepositoryProvider);
    try {
      _isNew ? await repo.createCategory({'slug': _slug.text.trim(), ...body}) : await repo.updateCategory(widget.category!.slug, body);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickImage() async {
    final l = context.l10n;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            key: const Key('category-image-library'),
            leading: const Icon(Icons.photo_library_outlined),
            title: Text(l.chooseFromLibrary),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          ListTile(
            key: const Key('category-image-camera'),
            leading: const Icon(Icons.photo_camera_outlined),
            title: Text(l.takePhoto),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
        ]),
      ),
    );
    if (source == null || !mounted) return;
    final XFile? file;
    try {
      file = await ref.read(imagePickerProvider).pickImage(source: source, maxWidth: 1600, maxHeight: 1600, imageQuality: 85);
    } catch (_) {
      if (mounted) showToast(context, l.photoPickFailed);
      return;
    }
    if (file == null || !mounted) return;
    setState(() => _uploading = true);
    try {
      final updated = await ref.read(backOfficeRepositoryProvider).uploadCategoryImage(widget.category!.slug, await file.readAsBytes(), filename: file.name);
      if (mounted) {
        setState(() => _imageUrl = updated.imageUrl);
        showToast(context, l.adminCategoryImageSaved);
      }
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _removeImage() async {
    final l = context.l10n;
    setState(() => _uploading = true);
    try {
      await ref.read(backOfficeRepositoryProvider).removeCategoryImage(widget.category!.slug);
      if (mounted) {
        setState(() => _imageUrl = null);
        showToast(context, l.adminCategoryImageRemoved);
      }
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    return FormSheet(
      title: _isNew ? l.adminNewCategory : l.adminEditCategory,
      children: [
        if (!_isNew) ...[
          Row(children: [
            _CategoryThumb(
              key: const Key('category-image-preview'),
              category: AdminCategory(slug: widget.category!.slug, nameEn: widget.category!.nameEn, icon: widget.category!.icon, imageUrl: _imageUrl),
              size: 72,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Wrap(spacing: 8, runSpacing: 4, children: [
                OutlinedButton.icon(
                  key: const Key('category-image-pick'),
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 44)),
                  onPressed: _uploading ? null : _pickImage,
                  icon: _uploading
                      ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.add_photo_alternate_outlined),
                  label: Text(_imageUrl == null ? l.adminCategoryImageAdd : l.adminCategoryImageChange),
                ),
                if (_imageUrl != null)
                  TextButton.icon(
                    key: const Key('category-image-remove'),
                    style: TextButton.styleFrom(minimumSize: const Size(0, 44), foregroundColor: AzzaPalette.of(context).danger),
                    onPressed: _uploading ? null : _removeImage,
                    icon: const Icon(Icons.delete_outline_rounded),
                    label: Text(l.remove),
                  ),
              ]),
            ),
          ]),
          const SizedBox(height: 4),
          Text(l.adminCategoryImageHint, style: t.bodySmall),
          const SizedBox(height: 16),
        ] else ...[
          Text(l.adminCategoryImageAfterSave, style: t.bodySmall),
          const SizedBox(height: 12),
        ],
        TextField(
          key: const Key('category-slug'),
          controller: _slug,
          readOnly: !_isNew,
          textDirection: TextDirection.ltr,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-z0-9-]')), LengthLimitingTextInputFormatter(40)],
          decoration: fieldDecoration(label: l.adminSlug, icon: Icons.link_rounded, hint: 'data-science', helper: _isNew ? l.adminSlugHelper : l.adminSlugFixed),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('category-name-en'),
          controller: _nameEn,
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(label: l.adminNameEn, icon: Icons.title_rounded, hint: 'Data science'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('category-name-ar'),
          controller: _nameAr,
          textDirection: TextDirection.rtl,
          decoration: fieldDecoration(label: l.adminNameAr, icon: Icons.translate_rounded, hint: 'علم البيانات'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('category-order'),
          controller: _order,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(label: l.adminOrder, icon: Icons.sort_rounded, hint: '0', helper: l.adminOrderHelper),
        ),
        SwitchListTile(
          key: const Key('category-active'),
          contentPadding: EdgeInsets.zero,
          title: Text(l.adminVisibleInCatalog),
          value: _active,
          onChanged: (v) => setState(() => _active = v),
        ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: AzzaPalette.of(context).danger))],
        const SizedBox(height: 12),
        FilledButton(
          key: const Key('save-category'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _save,
          child: Text(l.save),
        ),
      ],
    );
  }
}
