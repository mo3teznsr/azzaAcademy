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
import '../../../core/widgets/phone_field.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../teacher/presentation/proposal_widgets.dart';
import '../data/instructors_repository.dart';
import '../domain/instructor_models.dart';
import 'teach_guide.dart';

/// Is [url] a full https link?
bool isHttpsUrl(String url) {
  final uri = Uri.tryParse(url.trim());
  return uri != null && uri.scheme == 'https' && uri.host.contains('.');
}

/// "Teach on Azza": the teacher profile that opens a teacher account at once (no review), or "Your studio is open",
/// followed in every state by the full guide (shares, stories, formats, tools, fees, FAQ) from `GET /teaching-terms`.
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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !ref.read(isGuestProvider)) _refreshSession(silent: true);
    });
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
    if (ref.watch(isGuestProvider)) {
      return Scaffold(
        appBar: AppBar(title: Text(l.teachOnAzza)),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, AzzaSpace.gutter, AzzaSpace.gutter, 32),
          children: const [_GuestApply(), SizedBox(height: 14), TeachShareGlance(), TeachGuide()],
        ),
      );
    }
    final role = ref.watch(currentRoleProvider);
    final application = ref.watch(myInstructorApplicationProvider);
    final canTeach = role == Role.teacher || role == Role.admin;

    Widget approved() => ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, AzzaSpace.gutter, AzzaSpace.gutter, 32),
          children: [
            _ApprovedCard(busy: _refreshing, onRefresh: () => _refreshSession()),
            const SizedBox(height: 14),
            const TeachShareGlance(),
            const TeachGuide(),
          ],
        );

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
          ? approved()
          : AsyncView<InstructorApplication?>(
              value: application,
              onRetry: () => ref.invalidate(myInstructorApplicationProvider),
              data: (app) => app?.status == ApplicationStatus.approved
                  ? approved()
                  // No application, or an older pending or declined one: saving the profile opens the account now.
                  : _ApplicationForm(previous: app, onJoined: () => _refreshSession()),
            ),
    );
  }
}

/// Signed out: the pitch, and "create a free account" (sign-up brings the guest back here to the profile form).
class _GuestApply extends StatelessWidget {
  const _GuestApply();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return SectionCard(
      key: const Key('teach-guest'),
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Align(alignment: AlignmentDirectional.centerStart, child: Icon(Icons.co_present_outlined, color: p.success, size: 32)),
        const SizedBox(height: 12),
        DisplayText(l.teachPitchTitle, size: 26),
        const SizedBox(height: 8),
        Text(l.teachPitchBody, style: t.bodyMedium?.copyWith(color: p.muted)),
        const SizedBox(height: 12),
        Text(l.guestTeachBody, style: t.bodySmall),
        const SizedBox(height: 20),
        FilledButton(
          key: const Key('teach-guest-sign-up'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: () => context.go(Routes.signUpFrom(Routes.teachOnAzza)),
          child: Text(l.guestTeachCta),
        ),
        const SizedBox(height: 4),
        TextButton(
          key: const Key('teach-guest-sign-in'),
          style: TextButton.styleFrom(minimumSize: const Size.fromHeight(44)),
          onPressed: () => context.go(Routes.signInFrom(Routes.teachOnAzza)),
          child: Text(l.haveAccount),
        ),
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

/// The pitch and the teacher profile; [previous] (an older application) prefills it. [onJoined] runs once the
/// account is a teacher, to refresh the session into the teacher app.
class _ApplicationForm extends ConsumerStatefulWidget {
  const _ApplicationForm({this.previous, required this.onJoined});
  final InstructorApplication? previous;
  final VoidCallback onJoined;

  @override
  ConsumerState<_ApplicationForm> createState() => _ApplicationFormState();
}

class _ApplicationFormState extends ConsumerState<_ApplicationForm> {
  final _form = GlobalKey<FormState>();
  late final _headline = TextEditingController(text: widget.previous?.headline);
  late final _bio = TextEditingController(text: widget.previous?.bio);
  late final _experience = TextEditingController(text: widget.previous?.experience);
  late final _sample = TextEditingController(text: widget.previous?.sampleUrl);
  late final _phone = PhoneController(initialE164: widget.previous?.phone);
  late final Set<String> _categories = {...?widget.previous?.categories};
  late final Set<SessionLanguage> _languages = {...?widget.previous?.languages};
  bool _busy = false;
  bool _tried = false;

  @override
  void dispose() {
    for (final c in [_headline, _bio, _experience, _sample]) {
      c.dispose();
    }
    _phone.dispose();
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
            phone: _phone.e164OrNull,
          ));
      ref.invalidate(myInstructorApplicationProvider);
      if (mounted) showToast(context, l.applySent);
      widget.onJoined();
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
          DisplayText(l.teachPitchTitle, size: 30),
          const SizedBox(height: 8),
          Text(l.teachPitchBody, style: t.bodyMedium?.copyWith(color: p.muted)),
          const SizedBox(height: 12),
          const _Badges(),
          const SizedBox(height: 14),
          const TeachShareGlance(),
          const SizedBox(height: 24),
          DisplayText(l.teachFormTitle, size: 22),
          const SizedBox(height: 4),
          Text(l.teachFormSub, style: t.bodySmall?.copyWith(color: p.muted)),
          SectionCard(
            title: l.applySectionAbout,
            margin: const EdgeInsets.only(top: 14),
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
              PhoneField(key: const Key('apply-phone'), controller: _phone, label: l.applyPhone),
            ]),
          ),
          const SizedBox(height: 20),
          BusyButton(key: const Key('apply-submit'), label: l.applySubmit, icon: Icons.school_rounded, busy: _busy, onPressed: _submit),
          const TeachGuide(),
        ],
      ),
    );
  }
}

/// The three promises under the pitch.
class _Badges extends StatelessWidget {
  const _Badges();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    return Wrap(spacing: 8, runSpacing: 8, children: [
      for (final b in [l.teachBadge1, l.teachBadge2, l.teachBadge3])
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: AzzaColors.sage, borderRadius: BorderRadius.circular(999)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.check_rounded, size: 14, color: AzzaColors.sageDark),
            const SizedBox(width: 4),
            Flexible(child: Text(b, style: t.labelMedium?.copyWith(color: AzzaColors.sageDark, fontWeight: FontWeight.w700))),
          ]),
        ),
    ]);
  }
}
