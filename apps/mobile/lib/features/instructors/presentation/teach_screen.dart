import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../teacher/presentation/proposal_widgets.dart';
import '../data/instructors_repository.dart';
import '../domain/instructor_models.dart';

/// Is [url] a full https link?
bool isHttpsUrl(String url) {
  final uri = Uri.tryParse(url.trim());
  return uri != null && uri.scheme == 'https' && uri.host.contains('.');
}

/// "Teach on Azza": the pitch and application form, the pending card, or "You can teach now".
class TeachScreen extends ConsumerStatefulWidget {
  const TeachScreen({super.key});

  @override
  ConsumerState<TeachScreen> createState() => _TeachScreenState();
}

class _TeachScreenState extends ConsumerState<TeachScreen> {
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    // Re-opening the screen picks up an approval made since the session started.
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshSession(silent: true));
  }

  Future<void> _refreshSession({bool silent = false}) async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      final user = await ref.read(authControllerProvider.notifier).refreshSession();
      ref.invalidate(myInstructorApplicationProvider);
      if (!silent && mounted && user != null && user.role != Role.student) context.go(Routes.homeFor(user.role));
    } catch (e) {
      if (!silent && mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final role = ref.watch(currentRoleProvider);
    final application = ref.watch(myInstructorApplicationProvider);
    final canTeach = role == Role.teacher || role == Role.admin;

    Widget approved() => _ApprovedCard(busy: _refreshing, onRefresh: () => _refreshSession());

    return Scaffold(
      appBar: AppBar(
        title: Text(l.teachOnAzza),
        actions: [
          IconButton(
            key: const Key('teach-refresh'),
            tooltip: l.refresh,
            onPressed: _refreshing ? null : () => _refreshSession(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: canTeach
          ? ListView(padding: const EdgeInsets.all(AzzaSpace.gutter), children: [approved()])
          : AsyncView<InstructorApplication?>(
              value: application,
              onRetry: () => ref.invalidate(myInstructorApplicationProvider),
              data: (app) => switch (app?.status) {
                ApplicationStatus.pending => ListView(
                    padding: const EdgeInsets.all(AzzaSpace.gutter),
                    children: [_PendingCard(application: app!)],
                  ),
                ApplicationStatus.approved => ListView(padding: const EdgeInsets.all(AzzaSpace.gutter), children: [approved()]),
                _ => _ApplicationForm(rejected: app),
              },
            ),
    );
  }
}

class _PendingCard extends ConsumerWidget {
  const _PendingCard({required this.application});
  final InstructorApplication application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return SectionCard(
      key: const Key('application-pending'),
      margin: EdgeInsets.zero,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.hourglass_top_rounded, color: p.accent),
          const SizedBox(width: 10),
          StatusChip(label: l.statusPendingReview, color: AzzaColors.green, textColor: AzzaColors.inkDeep),
        ]),
        const SizedBox(height: 14),
        DisplayText(l.applyPendingTitle, size: 24),
        const SizedBox(height: 8),
        Text(l.applyPendingBody, style: t.bodyMedium?.copyWith(color: p.muted)),
        const SizedBox(height: 14),
        Text(application.headline, style: t.titleSmall),
        if (application.createdAt != null) Text(l.submittedOn(f.shortDate(application.createdAt!)), style: t.bodySmall),
      ]),
    );
  }
}

class _ApprovedCard extends StatelessWidget {
  const _ApprovedCard({required this.busy, required this.onRefresh});
  final bool busy;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return SectionCard(
      key: const Key('application-approved'),
      margin: EdgeInsets.zero,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Align(alignment: AlignmentDirectional.centerStart, child: Icon(Icons.verified_rounded, color: p.success, size: 32)),
        const SizedBox(height: 12),
        DisplayText(l.applyApprovedTitle, size: 26),
        const SizedBox(height: 8),
        Text(l.applyApprovedBody, style: t.bodyMedium?.copyWith(color: p.muted)),
        const SizedBox(height: 18),
        BusyButton(
          key: const Key('approved-refresh'),
          label: l.applyRefresh,
          icon: Icons.refresh_rounded,
          busy: busy,
          onPressed: onRefresh,
        ),
      ]),
    );
  }
}

/// The pitch and the application form; [rejected] is the last declined application (its note shows on top).
class _ApplicationForm extends ConsumerStatefulWidget {
  const _ApplicationForm({this.rejected});
  final InstructorApplication? rejected;

  @override
  ConsumerState<_ApplicationForm> createState() => _ApplicationFormState();
}

class _ApplicationFormState extends ConsumerState<_ApplicationForm> {
  final _form = GlobalKey<FormState>();
  late final _headline = TextEditingController(text: widget.rejected?.headline);
  late final _bio = TextEditingController(text: widget.rejected?.bio);
  late final _experience = TextEditingController(text: widget.rejected?.experience);
  late final _sample = TextEditingController(text: widget.rejected?.sampleUrl);
  late final _phone = TextEditingController(text: widget.rejected?.phone);
  late final Set<String> _categories = {...?widget.rejected?.categories};
  late final Set<SessionLanguage> _languages = {...?widget.rejected?.languages};
  bool _busy = false;
  bool _tried = false;

  @override
  void dispose() {
    for (final c in [_headline, _bio, _experience, _sample, _phone]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final l = context.l10n;
    setState(() => _tried = true);
    final fieldsOk = _form.currentState?.validate() ?? false;
    if (!fieldsOk || _categories.isEmpty || _categories.length > 5 || _languages.isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(instructorsRepositoryProvider).apply(InstructorApplicationDraft(
            headline: _headline.text,
            bio: _bio.text,
            categories: _categories.toList(),
            languages: SessionLanguage.values.where(_languages.contains).toList(),
            experience: _experience.text,
            sampleUrl: _sample.text,
            phone: _phone.text,
          ));
      ref.invalidate(myInstructorApplicationProvider);
      if (mounted) showToast(context, l.applySent);
    } catch (e) {
      if (!mounted) return;
      final ex = AppException.from(e);
      showToast(context, ex.code == 'CONFLICT' ? l.errApplicationPending : errorText(context, e));
      if (ex.code == 'CONFLICT' || ex.code == 'ALREADY_INSTRUCTOR') ref.invalidate(myInstructorApplicationProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _length(String? v, int min, int max, String message) {
    final n = (v ?? '').trim().length;
    return n < min || n > max ? message : null;
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final locale = ref.watch(localeProvider);
    final categories = ref.watch(categoriesProvider).value ?? const <CourseCategory>[];
    final note = widget.rejected?.reviewNote;

    Widget error(String message) => Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(message, style: t.bodySmall?.copyWith(color: p.danger)),
        );

    Widget text(
      TextEditingController c,
      String label,
      IconData icon, {
      required Key key,
      String? hint,
      int minLines = 1,
      int maxLines = 1,
      int? maxLength,
      TextInputType? keyboard,
      FormFieldValidator<String>? validator,
      List<String>? autofill,
    }) =>
        TextFormField(
          key: key,
          controller: c,
          minLines: minLines,
          maxLines: maxLines,
          maxLength: maxLength,
          keyboardType: keyboard ?? (maxLines > 1 ? TextInputType.multiline : null),
          textCapitalization: keyboard == null ? TextCapitalization.sentences : TextCapitalization.none,
          autofillHints: autofill,
          maxLengthEnforcement: MaxLengthEnforcement.enforced,
          validator: validator,
          decoration: fieldDecoration(label: label, icon: icon, hint: hint, action: ClearFieldButton(controller: c)),
        );

    return Form(
      key: _form,
      child: ListView(
        key: const Key('apply-form'),
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: [
          if (widget.rejected != null) ...[
            ProposalNotice(
              key: const Key('application-rejected'),
              title: l.applyRejectedTitle,
              body: note == null || note.isEmpty ? l.applyRejectedLead : '${l.applyRejectedLead}\n\n$note',
              icon: Icons.edit_note_rounded,
              tint: p.warning,
            ),
            const SizedBox(height: 16),
          ],
          DisplayText(l.teachPitchTitle, size: 30),
          const SizedBox(height: 8),
          Text(l.teachPitchBody, style: t.bodyMedium?.copyWith(color: p.muted)),
          SectionCard(
            title: l.applySectionAbout,
            margin: const EdgeInsets.only(top: 20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              text(_headline, l.applyHeadline, Icons.badge_outlined,
                  key: const Key('apply-headline'),
                  hint: l.applyHeadlineHint,
                  maxLength: 120,
                  validator: (v) => _length(v, 4, 120, l.applyHeadlineInvalid)),
              const SizedBox(height: 8),
              text(_bio, l.applyBio, Icons.notes_rounded,
                  key: const Key('apply-bio'),
                  hint: l.applyBioHint,
                  minLines: 3,
                  maxLines: 8,
                  maxLength: 2000,
                  validator: (v) => _length(v, 40, 2000, l.applyBioInvalid)),
            ]),
          ),
          SectionCard(
            title: l.applySectionTeach,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(l.applyCategories, style: t.labelLarge),
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final c in categories)
                  FilterChip(
                    key: Key('apply-category-${c.slug}'),
                    label: Text(c.name(locale)),
                    selected: _categories.contains(c.slug),
                    onSelected: (on) => setState(() {
                      if (!on) {
                        _categories.remove(c.slug);
                      } else if (_categories.length < 5) {
                        _categories.add(c.slug);
                      }
                    }),
                  ),
              ]),
              if (_tried && (_categories.isEmpty || _categories.length > 5)) error(l.applyCategoriesInvalid),
              const SizedBox(height: 16),
              Text(l.applyLanguages, style: t.labelLarge),
              const SizedBox(height: 8),
              Wrap(spacing: 8, children: [
                for (final lang in SessionLanguage.values)
                  FilterChip(
                    key: Key('apply-language-${lang.wire}'),
                    label: Text(languageLabel(l, lang)),
                    selected: _languages.contains(lang),
                    onSelected: (on) => setState(() => on ? _languages.add(lang) : _languages.remove(lang)),
                  ),
              ]),
              if (_tried && _languages.isEmpty) error(l.applyLanguagesInvalid),
            ]),
          ),
          SectionCard(
            title: l.applySectionExperience,
            child: text(_experience, l.applyExperience, Icons.school_outlined,
                key: const Key('apply-experience'),
                hint: l.applyExperienceHint,
                minLines: 3,
                maxLines: 8,
                maxLength: 1500,
                validator: (v) => _length(v, 20, 1500, l.applyExperienceInvalid)),
          ),
          SectionCard(
            title: l.applySectionContact,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              text(_sample, l.applySample, Icons.link_rounded,
                  key: const Key('apply-sample'),
                  hint: l.applySampleHint,
                  keyboard: TextInputType.url,
                  autofill: const [AutofillHints.url],
                  validator: (v) => (v ?? '').trim().isEmpty || isHttpsUrl(v!) ? null : l.applyUrlInvalid),
              const SizedBox(height: 12),
              text(_phone, l.applyPhone, Icons.phone_outlined,
                  key: const Key('apply-phone'),
                  hint: l.applyPhoneHint,
                  keyboard: TextInputType.phone,
                  autofill: const [AutofillHints.telephoneNumber]),
            ]),
          ),
          const SizedBox(height: 20),
          BusyButton(key: const Key('apply-submit'), label: l.applySubmit, icon: Icons.send_rounded, busy: _busy, onPressed: _submit),
        ],
      ),
    );
  }
}
