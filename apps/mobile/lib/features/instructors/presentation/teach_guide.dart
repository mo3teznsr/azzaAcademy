import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/instructors_repository.dart';
import '../domain/instructor_models.dart';

const _dash = '—';

/// The headline numbers: the teacher's share on live classes and recorded courses, and what Azza keeps.
/// Read from `GET /teaching-terms`, so it always shows the admin's current settings.
class TeachShareGlance extends ConsumerWidget {
  const TeachShareGlance({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final terms = ref.watch(teachingTermsProvider).value;
    return Row(children: [
      Expanded(child: _ShareTile(key: const Key('teach-share-live'), label: l.teachLiveTag, icon: Icons.sensors_rounded, share: terms?.liveCutPercent)),
      const SizedBox(width: 10),
      Expanded(child: _ShareTile(key: const Key('teach-share-recorded'), label: l.teachRecordedTag, icon: Icons.play_circle_outline_rounded, share: terms?.recordedCutPercent)),
    ]);
  }
}

class _ShareTile extends ConsumerWidget {
  const _ShareTile({super.key, required this.label, required this.icon, required this.share});
  final String label;
  final IconData icon;
  final num? share;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return RaisedCard(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 16, color: p.textSecondary),
          const SizedBox(width: 6),
          Flexible(child: Text(label, style: t.bodySmall?.copyWith(color: p.textSecondary))),
        ]),
        const SizedBox(height: 6),
        DisplayText(share == null ? _dash : f.percent(share!), size: 30),
        Text(l.teachYourShare, style: t.bodySmall?.copyWith(color: p.textSecondary)),
        if (share != null) Text(l.teachAzzaKeeps(f.percent(100 - share!)), style: t.labelSmall?.copyWith(color: p.textSecondary)),
      ]),
    );
  }
}

/// Everything a prospective teacher needs below the sign-up: why Azza (the illustrated stories), how it works,
/// live vs recorded, the studio tools, fees and payouts, and the FAQ. Shared by every state of the teach screen.
class TeachGuide extends ConsumerWidget {
  const TeachGuide({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final terms = ref.watch(teachingTermsProvider).value;
    return Column(
      key: const Key('teach-guide'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _Stories(),
        _Heading(l.teachStepsTitle),
        _Steps(l),
        _Heading(l.teachFormatsTitle),
        _Formats(terms: terms),
        _Heading(l.teachToolsTitle),
        _Tools(l),
        _Heading(l.teachFeesTitle),
        _Fees(terms: terms),
        _Heading(l.teachFaqTitle),
        _Faq(l),
      ],
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      Padding(padding: const EdgeInsets.only(top: 32, bottom: 12), child: DisplayText(text, size: 24));
}

/// The benefit illustrations from the teacher deck, as a horizontal strip of story cards with captions.
class _Stories extends StatelessWidget {
  const _Stories();

  static const _cardWidth = 240.0;
  static const _imageAspect = 720 / 1279;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final stories = [
      ('problem', l.teachStory1Title, l.teachStory1Body),
      ('live_room', l.teachStory2Title, l.teachStory2Body),
      ('recording', l.teachStory3Title, l.teachStory3Body),
      ('reach', l.teachStory4Title, l.teachStory4Body),
      ('certificates', l.teachStory5Title, l.teachStory5Body),
    ];
    final captionHeight = MediaQuery.textScalerOf(context).scale(150);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(top: 32, bottom: 4), child: Kicker(l.teachWhyKicker)),
      DisplayText(l.teachWhyTitle, size: 24),
      const SizedBox(height: 14),
      SizedBox(
        height: _cardWidth / _imageAspect + captionHeight,
        child: ListView.separated(
          key: const Key('teach-stories'),
          scrollDirection: Axis.horizontal,
          clipBehavior: Clip.none,
          itemCount: stories.length,
          separatorBuilder: (_, _) => const SizedBox(width: 14),
          itemBuilder: (context, i) {
            final (img, title, body) = stories[i];
            return SizedBox(
              width: _cardWidth,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(AzzaSpace.radius),
                  child: Image.asset(
                    'assets/images/teach_$img.webp',
                    width: _cardWidth,
                    height: _cardWidth / _imageAspect,
                    fit: BoxFit.cover,
                    semanticLabel: title,
                    errorBuilder: (_, _, _) => Container(color: p.raised),
                  ),
                ),
                const SizedBox(height: 10),
                Text(title, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text(body, style: t.bodySmall?.copyWith(color: p.textSecondary), maxLines: 4, overflow: TextOverflow.ellipsis),
              ]),
            );
          },
        ),
      ),
    ]);
  }
}

class _Steps extends StatelessWidget {
  const _Steps(this.l);
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    final steps = [
      (l.teachStep1Title, l.teachStep1Body),
      (l.teachStep2Title, l.teachStep2Body),
      (l.teachStep3Title, l.teachStep3Body),
      (l.teachStep4Title, l.teachStep4Body),
      (l.teachStep5Title, l.teachStep5Body),
    ];
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return SectionCard(
      margin: EdgeInsets.zero,
      child: Column(children: [
        for (var i = 0; i < steps.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 14),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: p.text,
                child: Text('${i + 1}', style: t.labelMedium?.copyWith(color: p.raised, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(steps[i].$1, style: t.titleSmall),
                  const SizedBox(height: 2),
                  Text(steps[i].$2, style: t.bodySmall?.copyWith(color: p.textSecondary)),
                ]),
              ),
            ]),
          ),
      ]),
    );
  }
}

class _Formats extends ConsumerWidget {
  const _Formats({required this.terms});
  final TeachingTerms? terms;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    String pct(num? n) => n == null ? _dash : f.percent(n);
    return Column(children: [
      _FormatCard(
        key: const Key('teach-format-live'),
        dark: true,
        tag: l.teachLiveTag,
        icon: Icons.sensors_rounded,
        title: l.teachLiveTitle,
        body: l.teachLiveBody,
        share: terms?.liveCutPercent,
        bullets: [l.teachLiveBullet1, l.teachLiveBullet2, l.teachLiveBullet3, l.teachLiveBullet4, l.teachLiveBullet5],
        pay: l.teachLivePay(pct(terms?.liveCutPercent)),
      ),
      const SizedBox(height: 12),
      _FormatCard(
        key: const Key('teach-format-recorded'),
        dark: false,
        tag: l.teachRecordedTag,
        icon: Icons.play_circle_outline_rounded,
        title: l.teachRecordedTitle,
        body: l.teachRecordedBody,
        share: terms?.recordedCutPercent,
        bullets: [l.teachRecordedBullet1, l.teachRecordedBullet2, l.teachRecordedBullet3, l.teachRecordedBullet4],
        pay: l.teachRecordedPay(pct(terms?.recordedCutPercent)),
      ),
    ]);
  }
}

class _FormatCard extends ConsumerWidget {
  const _FormatCard({
    super.key,
    required this.dark,
    required this.tag,
    required this.icon,
    required this.title,
    required this.body,
    required this.share,
    required this.bullets,
    required this.pay,
  });
  final bool dark;
  final String tag;
  final IconData icon;
  final String title;
  final String body;
  final num? share;
  final List<String> bullets;
  final String pay;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final fg = dark ? AzzaColors.cream : p.text;
    final soft = dark ? AzzaColors.muted : p.textSecondary;
    final accent = dark ? AzzaColors.mint : AzzaColors.greenDeep;
    return RaisedCard(
      color: dark ? AzzaColors.inkDeep : null,
      border: !dark,
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(icon, size: 16, color: accent),
                const SizedBox(width: 6),
                Flexible(child: Kicker(tag, color: accent)),
              ]),
              const SizedBox(height: 8),
              DisplayText(title, size: 21, color: fg),
            ]),
          ),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            DisplayText(share == null ? _dash : f.percent(share!), size: 34, color: fg),
            Text(l.teachYourShare, style: t.labelSmall?.copyWith(color: soft)),
            if (share != null) Text(l.teachAzzaKeeps(f.percent(100 - share!)), style: t.labelSmall?.copyWith(color: soft)),
          ]),
        ]),
        const SizedBox(height: 12),
        Text(body, style: t.bodyMedium?.copyWith(color: soft)),
        const SizedBox(height: 12),
        for (final b in bullets)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Padding(padding: const EdgeInsets.only(top: 2), child: Icon(Icons.check_rounded, size: 16, color: accent)),
              const SizedBox(width: 8),
              Expanded(child: Text(b, style: t.bodySmall?.copyWith(color: fg))),
            ]),
          ),
        Divider(color: dark ? AzzaColors.line : p.line, height: 20),
        Text(pay, style: t.bodySmall?.copyWith(color: fg, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class _Tools extends StatelessWidget {
  const _Tools(this.l);
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    final tools = [
      (Icons.videocam_outlined, l.teachTool1Title, l.teachTool1Body),
      (Icons.checklist_rounded, l.teachTool2Title, l.teachTool2Body),
      (Icons.assignment_turned_in_outlined, l.teachTool3Title, l.teachTool3Body),
      (Icons.forum_outlined, l.teachTool4Title, l.teachTool4Body),
      (Icons.workspace_premium_outlined, l.teachTool5Title, l.teachTool5Body),
      (Icons.insights_rounded, l.teachTool6Title, l.teachTool6Body),
    ];
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return SectionCard(
      margin: EdgeInsets.zero,
      child: Column(children: [
        for (var i = 0; i < tools.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 14),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(color: AzzaColors.sage, borderRadius: BorderRadius.circular(19)),
                child: Icon(tools[i].$1, size: 20, color: AzzaColors.sageDark),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(tools[i].$2, style: t.titleSmall),
                  const SizedBox(height: 2),
                  Text(tools[i].$3, style: t.bodySmall?.copyWith(color: p.textSecondary)),
                ]),
              ),
            ]),
          ),
      ]),
    );
  }
}

class _Fees extends ConsumerWidget {
  const _Fees({required this.terms});
  final TeachingTerms? terms;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final tt = terms;
    String example(num? cut) => cut == null ? _dash : f.number((10 * cut).round());

    Widget tile(String label, String value, Key key) => Expanded(
          child: RaisedCard(
            key: key,
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: t.bodySmall?.copyWith(color: p.textSecondary)),
              const SizedBox(height: 6),
              DisplayText(value, size: 22),
            ]),
          ),
        );

    return Column(key: const Key('teach-fees'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.teachFeesBody, style: t.bodyMedium?.copyWith(color: p.textSecondary)),
      const SizedBox(height: 14),
      Row(children: [
        tile(l.teachTermHold, tt == null ? _dash : l.teachTermHoldValue(f.number(tt.earningHoldDays)), const Key('teach-term-hold')),
        const SizedBox(width: 10),
        tile(l.teachTermMin, tt == null ? _dash : l.teachTermMinValue(f.number(tt.minPayoutAed)), const Key('teach-term-min')),
      ]),
      SectionCard(
        title: l.teachNetTitle,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final (i, s) in [l.teachNet1(tt == null ? _dash : f.percent(tt.vatPercent)), l.teachNet2, l.teachNet3].indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CircleAvatar(
                  radius: 12,
                  backgroundColor: p.text,
                  child: Text('${i + 1}', style: t.labelSmall?.copyWith(color: p.raised, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 10),
                Expanded(child: Text(s, style: t.bodySmall)),
              ]),
            ),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AzzaColors.green, borderRadius: BorderRadius.circular(AzzaSpace.radius)),
            child: Text(
              l.teachExample(example(tt?.liveCutPercent), example(tt?.recordedCutPercent)),
              style: t.bodySmall?.copyWith(color: AzzaColors.inkDeep, fontWeight: FontWeight.w700),
            ),
          ),
        ]),
      ),
      SectionCard(
        key: const Key('teach-apple'),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(radius: 18, backgroundColor: p.text, child: Icon(Icons.apple, color: p.raised, size: 20)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(l.teachAppleTitle, style: t.titleSmall),
              const SizedBox(height: 4),
              Text(l.teachAppleBody, style: t.bodySmall?.copyWith(color: p.textSecondary)),
            ]),
          ),
        ]),
      ),
      SectionCard(
        title: l.teachPayoutTitle,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(
            l.teachPayoutBody(tt == null ? _dash : f.number(tt.earningHoldDays), tt == null ? _dash : f.number(tt.minPayoutAed)),
            style: t.bodySmall,
          ),
          const SizedBox(height: 8),
          Text(l.teachCustomNote, style: t.labelSmall?.copyWith(color: p.textSecondary)),
        ]),
      ),
    ]);
  }
}

class _Faq extends StatelessWidget {
  const _Faq(this.l);
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    final faq = [
      (l.teachFaq1Q, l.teachFaq1A),
      (l.teachFaq2Q, l.teachFaq2A),
      (l.teachFaq3Q, l.teachFaq3A),
      (l.teachFaq4Q, l.teachFaq4A),
      (l.teachFaq5Q, l.teachFaq5A),
      (l.teachFaq6Q, l.teachFaq6A),
      (l.teachFaq7Q, l.teachFaq7A),
    ];
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return CardGroup(children: [
      for (final (i, (q, a)) in faq.indexed)
        Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            key: Key('teach-faq-$i'),
            initiallyExpanded: i == 0,
            title: Text(q, style: t.titleSmall),
            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
            expandedAlignment: AlignmentDirectional.centerStart,
            children: [Text(a, style: t.bodySmall?.copyWith(color: p.textSecondary))],
          ),
        ),
    ]);
  }
}
