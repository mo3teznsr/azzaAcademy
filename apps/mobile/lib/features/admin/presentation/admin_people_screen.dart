import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

/// People: every account, filtered by role and searchable by name or email. "+" invites a new one.
class AdminPeopleScreen extends ConsumerStatefulWidget {
  const AdminPeopleScreen({super.key, this.initialRole});
  final Role? initialRole;

  @override
  ConsumerState<AdminPeopleScreen> createState() => _AdminPeopleScreenState();
}

class _AdminPeopleScreenState extends ConsumerState<AdminPeopleScreen> {
  late Role? _role = widget.initialRole;
  String _q = '';
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  UserQuery get _query => (role: _role, q: _q);

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final users = ref.watch(adminUsersProvider(_query));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.adminPeopleTitle), actions: [
        IconButton(
          key: const Key('invite-user'),
          tooltip: l.adminInviteUser,
          icon: const Icon(Icons.person_add_alt_1_rounded),
          onPressed: () async {
            final created = await showFormSheet<AdminUser>(context, (_) => const _InviteSheet());
            if (created == null || !context.mounted) return;
            ref.invalidate(adminUsersProvider);
            showToast(context, l.adminInviteSent(created.email));
          },
        ),
      ]),
      body: Column(children: [
        AdminSearchField(controller: _search, label: l.adminSearchPeople, hint: l.adminSearchPeopleHint, onSubmitted: (v) => setState(() => _q = v.trim())),
        ChoiceChipsRow<Role>(
          keyPrefix: 'role',
          values: const [null, Role.student, Role.teacher, Role.admin],
          selected: _role,
          label: (r) => r == null ? l.allFilter : roleLabel(l, r),
          onSelected: (r) => setState(() => _role = r),
        ),
        Expanded(
          child: AsyncView<List<AdminUser>>(
            value: users,
            onRetry: () => ref.invalidate(adminUsersProvider(_query)),
            isEmpty: (list) => list.isEmpty,
            empty: EmptyState(title: l.adminNoPeople, icon: Icons.group_outlined),
            data: (list) => RefreshList(
              onRefresh: () async => ref.invalidate(adminUsersProvider(_query)),
              children: [
                CardGroup(children: [
                  for (final u in list)
                    InkWell(
                      key: Key('user-${u.id}'),
                      onTap: () => context.push(Routes.adminPerson(u.id), extra: u),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: 64),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          child: Row(children: [
                            InitialsAvatar(u.name, imageUrl: u.image),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(u.name, style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                                Text(u.email, style: t.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis, textDirection: TextDirection.ltr),
                              ]),
                            ),
                            const SizedBox(width: 8),
                            if (u.banned)
                              StatusChip(label: l.adminBanned, color: p.danger, look: ChipLook.outline)
                            else
                              Kicker(roleLabel(l, u.role)),
                          ]),
                        ),
                      ),
                    ),
                ]),
                const SizedBox(height: 8),
                Center(child: Kicker(l.adminPeopleCount(f.n(list.length)))),
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

class _InviteSheet extends ConsumerStatefulWidget {
  const _InviteSheet();

  @override
  ConsumerState<_InviteSheet> createState() => _InviteSheetState();
}

class _InviteSheetState extends ConsumerState<_InviteSheet> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  Role _role = Role.teacher;
  AppLocale _locale = AppLocale.en;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l = context.l10n;
    if (_name.text.trim().length < 2) return setState(() => _error = l.adminNameRequired);
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(_email.text.trim())) return setState(() => _error = l.adminEmailInvalid);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final user = await ref.read(backOfficeRepositoryProvider).createUser(name: _name.text, email: _email.text, role: _role, locale: _locale);
      if (mounted) Navigator.pop(context, user);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return FormSheet(
      title: l.adminInviteUser,
      subtitle: l.adminInviteBody,
      children: [
        TextField(
          key: const Key('invite-name'),
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: fieldDecoration(label: l.fullName, icon: Icons.badge_outlined, hint: l.adminNameHint),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('invite-email'),
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textDirection: TextDirection.ltr,
          autocorrect: false,
          decoration: fieldDecoration(label: l.email, icon: Icons.alternate_email_rounded, hint: 'name@example.com'),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<Role>(
          key: const Key('invite-role'),
          initialValue: _role,
          decoration: fieldDecoration(label: l.adminRole, icon: Icons.verified_user_outlined),
          items: [for (final r in Role.values) DropdownMenuItem(value: r, child: Text(roleLabel(l, r)))],
          onChanged: (v) => setState(() => _role = v ?? _role),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<AppLocale>(
          key: const Key('invite-locale'),
          initialValue: _locale,
          decoration: fieldDecoration(label: l.adminEmailLanguage, icon: Icons.translate_rounded),
          items: [
            DropdownMenuItem(value: AppLocale.en, child: Text(l.adminLanguageEnglish)),
            DropdownMenuItem(value: AppLocale.ar, child: Text(l.adminLanguageArabic)),
          ],
          onChanged: (v) => setState(() => _locale = v ?? _locale),
        ),
        if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: TextStyle(color: AzzaPalette.of(context).danger))],
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('invite-submit'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _submit,
          child: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(l.adminSendInvite),
        ),
      ],
    );
  }
}

/// One account: role, ban, and (teachers) the public headline and bio.
class AdminPersonScreen extends ConsumerStatefulWidget {
  const AdminPersonScreen({super.key, required this.userId, this.user});
  final String userId;

  /// The list row, so the screen opens instantly; refreshed from the list after each change.
  final AdminUser? user;

  @override
  ConsumerState<AdminPersonScreen> createState() => _AdminPersonScreenState();
}

class _AdminPersonScreenState extends ConsumerState<AdminPersonScreen> {
  late AdminUser? _user = widget.user;
  late final _headline = TextEditingController(text: widget.user?.headline ?? '');
  late final _bio = TextEditingController(text: widget.user?.bio ?? '');
  bool _busy = false;

  @override
  void dispose() {
    _headline.dispose();
    _bio.dispose();
    super.dispose();
  }

  Future<bool> _save(Map<String, dynamic> changes, String done) async {
    setState(() => _busy = true);
    try {
      final updated = await ref.read(backOfficeRepositoryProvider).updateUser(widget.userId, changes);
      ref.invalidate(adminUsersProvider);
      if (!mounted) return true;
      setState(() => _user = updated.id.isEmpty ? _user : updated);
      showToast(context, done);
      return true;
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changeRole(Role role) async {
    final l = context.l10n;
    final u = _user!;
    if (role == u.role) return;
    final ok = await confirmAction(
      context,
      title: l.adminChangeRoleTitle(u.name, roleLabel(l, role)),
      body: role == Role.admin ? l.adminChangeRoleAdminBody : l.adminChangeRoleBody,
      confirm: l.adminChangeRole,
      destructive: role == Role.admin || u.role == Role.admin,
    );
    if (ok) await _save({'role': role.wire}, l.adminRoleChanged(roleLabel(l, role)));
  }

  Future<void> _toggleBan() async {
    final l = context.l10n;
    final u = _user!;
    final ban = !u.banned;
    final ok = await confirmAction(
      context,
      title: ban ? l.adminBanTitle(u.name) : l.adminUnbanTitle(u.name),
      body: ban ? l.adminBanBody : l.adminUnbanBody,
      confirm: ban ? l.adminBan : l.adminUnban,
      destructive: ban,
    );
    if (ok) await _save({'banned': ban}, ban ? l.adminBannedDone : l.adminUnbannedDone);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final me = ref.watch(currentUserProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final u = _user;

    if (u == null) {
      // Deep link without the list row: find it through the search endpoint.
      final found = ref.watch(adminUsersProvider((role: null, q: widget.userId)));
      return Scaffold(
        appBar: AppBar(),
        body: AsyncView<List<AdminUser>>(
          value: found,
          onRetry: () => ref.invalidate(adminUsersProvider((role: null, q: widget.userId))),
          data: (list) {
            final match = list.where((x) => x.id == widget.userId).firstOrNull;
            if (match == null) return EmptyState(title: l.emptyGeneric);
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!mounted) return;
              setState(() {
                _user = match;
                _headline.text = match.headline ?? '';
                _bio.text = match.bio ?? '';
              });
            });
            return const LoadingState();
          },
        ),
      );
    }

    final isSelf = me?.id == u.id;
    return Scaffold(
      appBar: AppBar(title: Text(u.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: [
          Row(children: [
            InitialsAvatar(u.name, size: 56, imageUrl: u.image),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(u.name, style: t.titleLarge),
                Text(u.email, style: t.bodySmall, textDirection: TextDirection.ltr),
              ]),
            ),
            if (u.banned) StatusChip(label: l.adminBanned, color: p.danger, look: ChipLook.outline),
          ]),
          SectionCard(
            title: l.adminAccount,
            child: Column(children: [
              KeyValueRow(l.adminRole, roleLabel(l, u.role)),
              KeyValueRow(l.adminEmailVerified, u.emailVerified ? l.adminYes : l.adminNo),
              if (u.createdAt != null) KeyValueRow(l.adminJoined, f.shortDate(u.createdAt!)),
              if (u.activeEnrollments != null) KeyValueRow(l.adminActiveEnrollments, f.n(u.activeEnrollments!)),
              if (u.role == Role.teacher && u.teaching != null) KeyValueRow(l.adminTeachingBatches, f.n(u.teaching!)),
            ]),
          ),
          SectionCard(
            title: l.adminRole,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (isSelf) Text(l.adminCannotEditSelf, style: t.bodySmall),
              SegmentedButton<Role>(
                key: const Key('role-picker'),
                segments: [for (final r in Role.values) ButtonSegment(value: r, label: Text(roleLabel(l, r)))],
                selected: {u.role},
                showSelectedIcon: false,
                style: SegmentedButton.styleFrom(minimumSize: const Size(44, 48)),
                onSelectionChanged: isSelf || _busy ? null : (s) => _changeRole(s.first),
              ),
            ]),
          ),
          if (u.role == Role.teacher) ...[
            SectionCard(
              title: l.adminPublicProfile,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                TextField(
                  key: const Key('teacher-headline'),
                  controller: _headline,
                  maxLength: 120,
                  decoration: fieldDecoration(label: l.adminHeadline, icon: Icons.short_text_rounded, hint: l.adminHeadlineHint),
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const Key('teacher-bio'),
                  controller: _bio,
                  minLines: 3,
                  maxLines: 8,
                  maxLength: 2000,
                  decoration: fieldDecoration(label: l.adminBio, icon: Icons.notes_rounded, hint: l.adminBioHint),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  key: const Key('save-profile'),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                  onPressed: _busy
                      ? null
                      : () => _save({
                            'headline': _headline.text.trim().isEmpty ? null : _headline.text.trim(),
                            'bio': _bio.text.trim().isEmpty ? null : _bio.text.trim(),
                          }, l.adminProfileSaved),
                  child: Text(l.saveChanges),
                ),
              ]),
            ),
          ],
          const SizedBox(height: 20),
          OutlinedButton.icon(
            key: const Key('toggle-ban'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), foregroundColor: u.banned ? null : p.danger),
            onPressed: isSelf || _busy ? null : _toggleBan,
            icon: Icon(u.banned ? Icons.lock_open_rounded : Icons.block_rounded),
            label: Text(u.banned ? l.adminUnban : l.adminBan),
          ),
        ],
      ),
    );
  }
}
