import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/cover_scroll_view.dart';
import '../../../core/widgets/ui.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../../me/presentation/avatar_picker.dart' show imagePickerProvider;
import '../data/proposals_repository.dart';
import '../domain/proposal_models.dart';
import 'proposal_widgets.dart';

const _coverStyles = ['sun', 'sky', 'sage', 'peach'];

class _ModuleRow {
  _ModuleRow({String en = '', String? ar, String? descEn, String? descAr})
      : en = TextEditingController(text: en),
        ar = TextEditingController(text: ar ?? ''),
        descEn = TextEditingController(text: descEn ?? ''),
        descAr = TextEditingController(text: descAr ?? ''),
        key = UniqueKey();
  final TextEditingController en;
  final TextEditingController ar;
  final TextEditingController descEn;
  final TextEditingController descAr;
  final Key key;

  void dispose() {
    en.dispose();
    ar.dispose();
    descEn.dispose();
    descAr.dispose();
  }
}

/// One editable row of [n] text fields (a bullet: en, ar; an FAQ item: qEn, aEn, qAr, aAr).
class _Row {
  _Row(List<String?> values)
      : c = [for (final v in values) TextEditingController(text: v ?? '')],
        key = UniqueKey();
  final List<TextEditingController> c;
  final Key key;
  bool get isBlank => c.every((x) => x.text.trim().isEmpty);
  void dispose() {
    for (final x in c) {
      x.dispose();
    }
  }
}

/// The three bullet lists on a course, with their en/ar getters.
enum _ListKind { outcomes, requirements, audience }

/// Teacher: propose a new course or edit their own draft. Saving keeps it a DRAFT; "Submit for review"
/// saves first, then hands it to the admins. Read-only once published.
class CourseEditorScreen extends ConsumerStatefulWidget {
  const CourseEditorScreen({super.key, this.courseId});

  /// Null = propose a new course.
  final String? courseId;

  @override
  ConsumerState<CourseEditorScreen> createState() => _CourseEditorScreenState();
}

class _CourseEditorScreenState extends ConsumerState<CourseEditorScreen> {
  final _titleEn = TextEditingController();
  final _titleAr = TextEditingController();
  final _category = TextEditingController();
  final _descEn = TextEditingController();
  final _descAr = TextEditingController();
  final List<_ModuleRow> _modules = [];
  final Map<_ListKind, List<_Row>> _lists = {for (final k in _ListKind.values) k: <_Row>[]};
  final List<_Row> _faq = [];
  CourseLevel _level = CourseLevel.beginner;
  String _coverStyle = 'sun';
  String? _coverUrl;
  String? _introVideoUrl;

  late String? _id = widget.courseId;
  CourseStatus _status = CourseStatus.draft;
  String? _reviewNote;
  bool _loaded = false;
  bool _saving = false;
  bool _submitting = false;
  bool _uploading = false;

  bool get _editable => _status.teacherEditable;

  @override
  void initState() {
    super.initState();
    if (widget.courseId == null) {
      _loaded = true;
      _modules.add(_ModuleRow());
    }
  }

  @override
  void dispose() {
    for (final c in [_titleEn, _titleAr, _category, _descEn, _descAr]) {
      c.dispose();
    }
    for (final m in _modules) {
      m.dispose();
    }
    for (final r in [..._lists.values.expand((e) => e), ..._faq]) {
      r.dispose();
    }
    super.dispose();
  }

  static List<_Row> _pairs(List<String> en, List<String> ar) => [
        for (var i = 0; i < (en.length > ar.length ? en.length : ar.length); i++)
          _Row([i < en.length ? en[i] : '', i < ar.length ? ar[i] : '']),
      ];

  List<String> _column(_ListKind k, int i) => [for (final r in _lists[k]!) r.c[i].text];

  void _fill(Course c) {
    _titleEn.text = c.titleEn;
    _titleAr.text = c.titleAr ?? '';
    _category.text = c.category;
    _descEn.text = c.descriptionEn;
    _descAr.text = c.descriptionAr ?? '';
    _level = c.level;
    _coverStyle = _coverStyles.contains(c.coverStyle) ? c.coverStyle : 'sun';
    _coverUrl = c.coverImageUrl;
    _introVideoUrl = c.introVideoUrl;
    _status = c.status;
    _reviewNote = c.reviewNote;
    for (final m in _modules) {
      m.dispose();
    }
    _modules
      ..clear()
      ..addAll(c.modules.map((m) => _ModuleRow(en: m.titleEn, ar: m.titleAr, descEn: m.descriptionEn, descAr: m.descriptionAr)));
    _lists[_ListKind.outcomes] = _pairs(c.outcomesEn, c.outcomesAr);
    _lists[_ListKind.requirements] = _pairs(c.requirementsEn, c.requirementsAr);
    _lists[_ListKind.audience] = _pairs(c.audienceEn, c.audienceAr);
    _faq
      ..clear()
      ..addAll(c.faq.map((q) => _Row([q.qEn, q.aEn, q.qAr, q.aAr])));
    _loaded = true;
  }

  /// First problem that blocks saving ([forSubmit] adds the review requirements), or null.
  String? _problem({required bool forSubmit}) {
    final l = context.l10n;
    if (_titleEn.text.trim().length < 2) return l.titleRequired;
    if (_category.text.trim().length < 2) return l.categoryRequired;
    if (_modules.any((m) => m.en.text.trim().length < 2)) return l.moduleTitleRequired;
    if (_faq.any((r) => !r.isBlank && (r.c[0].text.trim().length < 2 || r.c[1].text.trim().isEmpty))) return l.faqIncomplete;
    if (forSubmit) {
      if (_descEn.text.trim().length < 20) return l.descriptionTooShort;
      if (_modules.isEmpty) return l.noModulesYet;
    }
    return null;
  }

  CourseDraft _draft() => CourseDraft(
        titleEn: _titleEn.text,
        titleAr: _titleAr.text,
        descriptionEn: _descEn.text,
        descriptionAr: _descAr.text,
        category: _category.text,
        level: _level,
        coverStyle: _coverStyle,
        coverImageUrl: _coverUrl,
        introVideoUrl: _introVideoUrl,
        modules: [
          for (final m in _modules)
            ModuleDraft(titleEn: m.en.text, titleAr: m.ar.text, descriptionEn: m.descEn.text, descriptionAr: m.descAr.text),
        ],
        outcomesEn: _column(_ListKind.outcomes, 0),
        outcomesAr: _column(_ListKind.outcomes, 1),
        requirementsEn: _column(_ListKind.requirements, 0),
        requirementsAr: _column(_ListKind.requirements, 1),
        audienceEn: _column(_ListKind.audience, 0),
        audienceAr: _column(_ListKind.audience, 1),
        faq: [
          for (final r in _faq)
            if (!r.isBlank) CourseFaq(qEn: r.c[0].text, aEn: r.c[1].text, qAr: r.c[2].text, aAr: r.c[3].text),
        ],
      );

  /// Creates or updates the draft; returns false (after telling the user why) when it could not.
  Future<bool> _persist({required bool forSubmit}) async {
    final problem = _problem(forSubmit: forSubmit);
    if (problem != null) {
      showToast(context, problem);
      return false;
    }
    final repo = ref.read(proposalsRepositoryProvider);
    try {
      final saved = _id == null ? await repo.createCourse(_draft()) : await repo.updateCourse(_id!, _draft());
      if (!mounted) return false;
      setState(() {
        _id = saved.id.isEmpty ? _id : saved.id;
        _status = saved.status;
      });
      ref.invalidate(myCoursesProvider);
      return true;
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
      return false;
    }
  }

  Future<void> _saveDraft() async {
    setState(() => _saving = true);
    final ok = await _persist(forSubmit: false);
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) showToast(context, context.l10n.draftSaved);
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      if (!await _persist(forSubmit: true) || !mounted) return;
      final submitted = await ref.read(proposalsRepositoryProvider).submitCourse(_id!);
      ref.invalidate(myCoursesProvider);
      if (!mounted) return;
      setState(() {
        _status = submitted.status == CourseStatus.draft ? CourseStatus.pendingReview : submitted.status;
        _reviewNote = null;
      });
      showToast(context, context.l10n.sentForReview);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickCover() async {
    final l = context.l10n;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            key: const Key('cover-library'),
            leading: const Icon(Icons.photo_library_outlined),
            title: Text(l.chooseFromLibrary),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          ListTile(
            key: const Key('cover-camera'),
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
      final url = await ref.read(proposalsRepositoryProvider).uploadCover(await file.readAsBytes());
      if (mounted && url.isNotEmpty) setState(() => _coverUrl = url);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _moveModule(int i, int delta) {
    final j = i + delta;
    if (j < 0 || j >= _modules.length) return;
    setState(() => _modules.insert(j, _modules.removeAt(i)));
  }

  void _removeModule(int i) {
    final removed = _modules.removeAt(i);
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) => removed.dispose());
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    if (!_loaded) {
      final course = ref.watch(courseProvider(widget.courseId!));
      return Scaffold(
        appBar: AppBar(title: Text(l.editCourse)),
        body: AsyncView<Course>(
          value: course,
          onRetry: () => ref.invalidate(courseProvider(widget.courseId!)),
          data: (c) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && !_loaded) setState(() => _fill(c));
            });
            return const LoadingState();
          },
        ),
      );
    }

    final title = _titleEn.text.trim().isEmpty ? (_id == null ? l.newCourse : l.editCourse) : _titleEn.text.trim();
    final form = _form(context);
    final bottom = _editable
        ? BottomActionBar(children: [
            Row(children: [
              Expanded(
                child: BusyButton(
                  key: const Key('save-draft'),
                  label: l.saveDraft,
                  filled: false,
                  busy: _saving,
                  onPressed: _submitting ? null : _saveDraft,
                ),
              ),
              if (_status == CourseStatus.draft) ...[
                const SizedBox(width: 10),
                Expanded(
                  child: BusyButton(
                    key: const Key('submit-course'),
                    label: l.submitForReview,
                    busy: _submitting,
                    onPressed: _saving ? null : _submit,
                  ),
                ),
              ],
            ]),
          ])
        : null;

    if (_coverUrl != null) {
      return Scaffold(
        bottomNavigationBar: bottom,
        body: CoverScrollView(
          title: title,
          cover: MediaImage(_coverUrl, fallback: ColoredBox(color: coverColor(_coverStyle))),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 18, AzzaSpace.gutter, 32),
              sliver: SliverList.list(children: form),
            ),
          ],
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis)),
      bottomNavigationBar: bottom,
      body: ListView(
        key: const Key('course-editor'),
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: form,
      ),
    );
  }

  List<Widget> _form(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final locale = ref.watch(localeProvider);
    final ro = !_editable;
    final categories = ref.watch(categoriesProvider).value ?? const <CourseCategory>[];
    final knownCategory = categories.any((c) => c.slug == _category.text);

    Widget field(
      TextEditingController c,
      String label,
      IconData icon, {
      Key? key,
      int? maxLines = 1,
      int? minLines,
      String? helper,
      TextInputType? keyboard,
      List<TextInputFormatter>? formatters,
      TextDirection? direction,
    }) =>
        TextField(
          key: key,
          controller: c,
          readOnly: ro,
          maxLines: maxLines,
          minLines: minLines,
          keyboardType: keyboard,
          inputFormatters: formatters,
          textDirection: direction,
          onChanged: (_) => setState(() {}),
          decoration: fieldDecoration(label: label, icon: icon, helper: helper, action: ro ? null : ClearFieldButton(controller: c)),
        );

    Widget section(String title, List<Widget> children, {double top = 12}) => SectionCard(
          title: title,
          margin: EdgeInsets.only(top: top),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        );

    return [
      if (_status == CourseStatus.draft && (_reviewNote?.isNotEmpty ?? false)) ...[
        ProposalNotice.changes(context, _reviewNote!),
        const SizedBox(height: 12),
      ],
      if (_status == CourseStatus.pendingReview) ...[
        ProposalNotice.pending(context, l.waitingForReviewBody),
        const SizedBox(height: 12),
      ],
      if (_status == CourseStatus.published || _status == CourseStatus.archived) ...[
        ProposalNotice.published(context),
        const SizedBox(height: 12),
      ],
      if (_id != null) Align(alignment: AlignmentDirectional.centerStart, child: StatusChip.course(context, _status)),

      section(l.courseBasics, top: 16, [
        field(_titleEn, l.courseTitleEn, Icons.title_rounded, key: const Key('course-title-en'), direction: TextDirection.ltr),
        const SizedBox(height: 12),
        field(_titleAr, l.courseTitleAr, Icons.translate_rounded, key: const Key('course-title-ar'), direction: TextDirection.rtl),
        const SizedBox(height: 12),
        if (categories.isNotEmpty && (knownCategory || _category.text.isEmpty))
          DropdownButtonFormField<String>(
            key: const Key('course-category'),
            initialValue: knownCategory ? _category.text : null,
            isExpanded: true,
            decoration: fieldDecoration(label: l.courseCategory, icon: Icons.category_outlined),
            items: [for (final c in categories) DropdownMenuItem(value: c.slug, child: Text(c.name(locale)))],
            onChanged: ro ? null : (v) => setState(() => _category.text = v ?? ''),
          )
        else
          field(_category, l.courseCategory, Icons.category_outlined, key: const Key('course-category')),
        const SizedBox(height: 12),
        DropdownButtonFormField<CourseLevel>(
          key: const Key('course-level'),
          initialValue: _level,
          isExpanded: true,
          decoration: fieldDecoration(label: l.courseLevel, icon: Icons.signal_cellular_alt_rounded),
          items: [for (final lv in CourseLevel.values) DropdownMenuItem(value: lv, child: Text(levelLabel(l, lv)))],
          onChanged: ro ? null : (v) => setState(() => _level = v ?? _level),
        ),
        const SizedBox(height: 12),
        Row(key: const Key('course-price-note'), crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.sell_outlined, size: 18, color: p.muted),
          const SizedBox(width: 8),
          Expanded(child: Text(l.coursePricedPerBatch, style: t.bodySmall)),
        ]),
      ]),

      section(l.courseDescription, [
        field(_descEn, l.descriptionEn, Icons.notes_rounded,
            key: const Key('course-desc-en'), maxLines: 8, minLines: 3, helper: l.descriptionHint, direction: TextDirection.ltr),
        const SizedBox(height: 12),
        field(_descAr, l.descriptionAr, Icons.notes_rounded, key: const Key('course-desc-ar'), maxLines: 8, minLines: 3, direction: TextDirection.rtl),
      ]),

      section(l.coverPhoto, [
        if (_coverUrl == null) Text(l.coverPhotoHint, style: t.bodySmall),
        if (!ro) ...[
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            OutlinedButton.icon(
              key: const Key('pick-cover'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(44, 48)),
              onPressed: _uploading ? null : _pickCover,
              icon: _uploading
                  ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.add_photo_alternate_outlined, size: 18),
              label: Text(_uploading ? l.uploadingPhoto : (_coverUrl == null ? l.addCoverPhoto : l.changeCoverPhoto)),
            ),
            if (_coverUrl != null)
              TextButton.icon(
                key: const Key('remove-cover'),
                style: TextButton.styleFrom(minimumSize: const Size(44, 48)),
                onPressed: _uploading ? null : () => setState(() => _coverUrl = null),
                icon: const Icon(Icons.hide_image_outlined, size: 18),
                label: Text(l.removeCoverPhoto),
              ),
          ]),
        ],
        const SizedBox(height: 14),
        MonoLabel(l.coverColour),
        const SizedBox(height: 8),
        Wrap(spacing: 10, children: [
          for (final (style, name) in [('sun', l.coverSun), ('sky', l.coverSky), ('sage', l.coverSage), ('peach', l.coverPeach)])
            Semantics(
              button: true,
              selected: _coverStyle == style,
              label: name,
              child: InkWell(
                key: Key('cover-style-$style'),
                customBorder: const CircleBorder(),
                onTap: ro ? null : () => setState(() => _coverStyle = style),
                child: SizedBox.square(
                  dimension: 48,
                  child: Center(
                    child: AnimatedContainer(
                      duration: AzzaMotion.quick,
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: coverColor(style),
                        shape: BoxShape.circle,
                        border: Border.all(color: _coverStyle == style ? p.text : p.line, width: _coverStyle == style ? 2.5 : 1),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ]),
      ]),

      section(l.modulesTitle, [
        if (_modules.isEmpty) Text(l.noModulesYet, style: t.bodySmall),
        for (final (i, m) in _modules.indexed)
          Container(
            key: m.key,
            margin: const EdgeInsets.only(bottom: 14),
            padding: EdgeInsets.only(top: i == 0 ? 0 : 6),
            decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(child: MonoLabel('${i + 1}')),
                if (!ro) ...[
                  IconButton(
                    tooltip: l.moveUp,
                    onPressed: i == 0 ? null : () => _moveModule(i, -1),
                    icon: const Icon(Icons.arrow_upward_rounded, size: 20),
                  ),
                  IconButton(
                    tooltip: l.moveDown,
                    onPressed: i == _modules.length - 1 ? null : () => _moveModule(i, 1),
                    icon: const Icon(Icons.arrow_downward_rounded, size: 20),
                  ),
                  IconButton(
                    key: Key('remove-module-$i'),
                    tooltip: l.removeModule,
                    onPressed: () => _removeModule(i),
                    icon: const Icon(Icons.delete_outline_rounded, size: 20),
                  ),
                ],
              ]),
              field(m.en, l.moduleTitleEn('${i + 1}'), Icons.view_module_outlined, key: Key('module-en-$i'), direction: TextDirection.ltr),
              const SizedBox(height: 8),
              field(m.ar, l.moduleTitleAr('${i + 1}'), Icons.translate_rounded, key: Key('module-ar-$i'), direction: TextDirection.rtl),
              const SizedBox(height: 8),
              field(m.descEn, l.moduleDescriptionEn('${i + 1}'), Icons.notes_rounded,
                  key: Key('module-desc-en-$i'), maxLines: 4, minLines: 1, direction: TextDirection.ltr),
              const SizedBox(height: 8),
              field(m.descAr, l.moduleDescriptionAr('${i + 1}'), Icons.notes_rounded,
                  key: Key('module-desc-ar-$i'), maxLines: 4, minLines: 1, direction: TextDirection.rtl),
            ]),
          ),
        if (!ro)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              key: const Key('add-module'),
              style: TextButton.styleFrom(minimumSize: const Size(44, 48)),
              onPressed: () => setState(() => _modules.add(_ModuleRow())),
              icon: const Icon(Icons.add_rounded),
              label: Text(l.addModule),
            ),
          ),
      ]),

      // ── "What you'll learn", requirements, audience ──
      for (final (kind, title) in [
        (_ListKind.outcomes, l.whatYoullLearn),
        (_ListKind.requirements, l.requirementsTitle),
        (_ListKind.audience, l.audienceTitle),
      ])
        section(title, [
          for (final (i, r) in _lists[kind]!.indexed)
            Padding(
              key: r.key,
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(children: [
                    field(r.c[0], l.bulletEn('${i + 1}'), Icons.check_rounded, key: Key('${kind.name}-en-$i'), direction: TextDirection.ltr),
                    const SizedBox(height: 8),
                    field(r.c[1], l.bulletAr('${i + 1}'), Icons.translate_rounded, key: Key('${kind.name}-ar-$i'), direction: TextDirection.rtl),
                  ]),
                ),
                if (!ro)
                  IconButton(
                    tooltip: l.removePoint,
                    onPressed: () => setState(() => _removeRow(_lists[kind]!, i)),
                    icon: const Icon(Icons.delete_outline_rounded, size: 20),
                  ),
              ]),
            ),
          if (!ro)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: Key('add-${kind.name}'),
                style: TextButton.styleFrom(minimumSize: const Size(44, 48)),
                onPressed: () => setState(() => _lists[kind]!.add(_Row(['', '']))),
                icon: const Icon(Icons.add_rounded),
                label: Text(l.addPoint),
              ),
            ),
        ]),

      // ── FAQ ──
      section(l.faqTitle, [
        for (final (i, r) in _faq.indexed)
          Container(
            key: r.key,
            margin: const EdgeInsets.only(bottom: 16),
            padding: EdgeInsets.only(top: i == 0 ? 0 : 6),
            decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(child: MonoLabel('${i + 1}')),
                if (!ro)
                  IconButton(
                    tooltip: l.removeQuestion,
                    onPressed: () => setState(() => _removeRow(_faq, i)),
                    icon: const Icon(Icons.delete_outline_rounded, size: 20),
                  ),
              ]),
              field(r.c[0], l.faqQuestionEn('${i + 1}'), Icons.help_outline_rounded, key: Key('faq-q-en-$i'), direction: TextDirection.ltr),
              const SizedBox(height: 8),
              field(r.c[1], l.faqAnswerEn('${i + 1}'), Icons.notes_rounded,
                  key: Key('faq-a-en-$i'), maxLines: 5, minLines: 2, direction: TextDirection.ltr),
              const SizedBox(height: 8),
              field(r.c[2], l.faqQuestionAr('${i + 1}'), Icons.help_outline_rounded, key: Key('faq-q-ar-$i'), direction: TextDirection.rtl),
              const SizedBox(height: 8),
              field(r.c[3], l.faqAnswerAr('${i + 1}'), Icons.notes_rounded,
                  key: Key('faq-a-ar-$i'), maxLines: 5, minLines: 2, direction: TextDirection.rtl),
            ]),
          ),
        if (!ro)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              key: const Key('add-faq'),
              style: TextButton.styleFrom(minimumSize: const Size(44, 48)),
              onPressed: () => setState(() => _faq.add(_Row(['', '', '', '']))),
              icon: const Icon(Icons.add_rounded),
              label: Text(l.addQuestion),
            ),
          ),
      ]),
    ];
  }

  void _removeRow(List<_Row> rows, int i) {
    final removed = rows.removeAt(i);
    WidgetsBinding.instance.addPostFrameCallback((_) => removed.dispose());
  }
}
