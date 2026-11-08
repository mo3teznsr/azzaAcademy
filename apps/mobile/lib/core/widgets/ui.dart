import 'dart:async';

import 'package:flutter/material.dart';

import '../domain/enums.dart';
import '../l10n/l10n.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';
import 'media_image.dart';
import 'signal_mark.dart';

export 'fields.dart';
export 'media_image.dart';
export 'scene_image.dart';
export 'motion.dart';
export 'signal_mark.dart';
export 'states.dart';

extension TextScaleX on BuildContext {
  /// [base] grown with the user's text scale, plus an unscaled [fixed] part (a cover image, say).
  /// For fixed-extent rails and tiles that hold text, so they grow instead of clipping at 1.3–2×.
  double scaled(double base, {double fixed = 0}) => fixed + MediaQuery.textScalerOf(this).scale(base);
}

/// Small heading above content ("eyebrow"), in Almarai 12–13pt bold. Words go here, in any
/// language: Arabic is never uppercased or letter-spaced (that breaks the joins); Latin gets a
/// little tracking and capitals. Use [MonoLabel] only for codes, times and timecodes.
class Kicker extends StatelessWidget {
  const Kicker(this.text, {super.key, this.color, this.size = 12, this.weight = FontWeight.w700, this.maxLines, this.textAlign});
  final String text;
  final Color? color;

  /// Clamped to 12–13.
  final double size;
  final FontWeight weight;
  final int? maxLines;
  final TextAlign? textAlign;

  static final _arabicScript = RegExp(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]');

  @override
  Widget build(BuildContext context) {
    final arabic = context.isArabic || _arabicScript.hasMatch(text);
    final s = size.clamp(12.0, 13.0);
    final style = AzzaFonts.body(arabic: arabic, size: s, weight: weight, color: color ?? AzzaPalette.of(context).textSecondary)
        .copyWith(letterSpacing: arabic ? 0 : 0.06 * s, height: arabic ? 1.5 : 1.35);
    return Text(
      arabic ? text : text.toUpperCase(),
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
      textAlign: textAlign,
      style: style,
    );
  }
}

/// Uppercase mono caption for codes, times and timecodes only (`00:05:12`, `B07 · S05`, `AZ-7Q4K`).
/// Always LTR digits. Words belong in a [Kicker].
class MonoLabel extends StatelessWidget {
  const MonoLabel(this.text, {super.key, this.color, this.size = 12, this.weight = FontWeight.w500});
  final String text;
  final Color? color;
  final double size;
  final FontWeight weight;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: AzzaFonts.mono(size: size < 12 ? 12 : size, weight: weight, color: color ?? AzzaPalette.of(context).textSecondary),
    );
  }
}

/// Large display headline (Almarai, w800).
class DisplayText extends StatelessWidget {
  const DisplayText(this.text, {super.key, this.size = 32, this.color, this.weight = FontWeight.w800, this.maxLines});
  final String text;
  final double size;
  final Color? color;
  final FontWeight weight;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
      style: AzzaFonts.display(
        arabic: context.isArabic,
        size: size,
        weight: weight,
        color: color ?? AzzaPalette.of(context).text,
      ),
    );
  }
}

enum ChipLook { filled, outline, dashed, struck }

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    this.color,
    this.textColor,
    this.look = ChipLook.filled,
    this.live = false,
  });

  final String label;
  final Color? color;
  final Color? textColor;
  final ChipLook look;
  final bool live;

  factory StatusChip.session(BuildContext context, SessionStatus status, {DateTime? startsAt, bool moved = false}) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    if (status == SessionStatus.live) {
      return StatusChip(label: l.statusLive, color: p.live, textColor: p.onLive, live: true);
    }
    if (status == SessionStatus.ended) return StatusChip(label: l.statusEnded, color: p.muted, look: ChipLook.outline);
    if (status == SessionStatus.cancelled) {
      return StatusChip(label: l.statusCancelled, color: p.muted, look: ChipLook.struck);
    }
    if (startsAt != null) {
      final mins = startsAt.difference(DateTime.now()).inMinutes;
      if (mins >= 0 && mins <= 60) {
        return StatusChip(label: l.statusStartsIn('$mins'), color: AzzaColors.green, textColor: AzzaColors.inkDeep);
      }
    }
    if (moved) return StatusChip(label: l.statusRescheduled, color: p.warning, look: ChipLook.dashed);
    return StatusChip(label: l.statusScheduled, color: p.infoBg, textColor: p.info);
  }

  factory StatusChip.batch(BuildContext context, BatchStatus status, {int? taken, int? capacity}) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return switch (status) {
      BatchStatus.draft => StatusChip(label: l.batchDraft, color: p.muted, look: ChipLook.dashed),
      BatchStatus.pendingReview => StatusChip(label: l.statusPendingReview, color: AzzaColors.green, textColor: AzzaColors.inkDeep),
      BatchStatus.enrolling => StatusChip(
          label: taken != null && capacity != null ? '${l.batchEnrolling} · $taken/$capacity' : l.batchEnrolling,
          color: p.successBg,
          textColor: p.success,
        ),
      BatchStatus.full => StatusChip(label: l.batchFull, color: p.warningBg, textColor: p.warning),
      BatchStatus.running => StatusChip(
          label: l.batchRunning,
          color: p.primary,
          textColor: p.onPrimary,
        ),
      BatchStatus.completed => StatusChip(label: l.batchCompleted, color: p.muted, look: ChipLook.outline),
      BatchStatus.cancelled => StatusChip(label: l.batchCancelled, color: p.muted, look: ChipLook.struck),
    };
  }

  /// Course lifecycle (teacher proposals and the admin review queue).
  factory StatusChip.course(BuildContext context, CourseStatus status) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return switch (status) {
      CourseStatus.draft => StatusChip(label: l.batchDraft, color: p.muted, look: ChipLook.dashed),
      CourseStatus.pendingReview => StatusChip(label: l.statusPendingReview, color: AzzaColors.green, textColor: AzzaColors.inkDeep),
      CourseStatus.published => StatusChip(label: l.statusPublished, color: p.successBg, textColor: p.success),
      CourseStatus.archived => StatusChip(label: l.statusArchived, color: p.muted, look: ChipLook.struck),
    };
  }

  factory StatusChip.order(BuildContext context, OrderStatus status) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return switch (status) {
      OrderStatus.awaitingPayment =>
        StatusChip(label: l.orderAwaitingPayment, color: p.infoBg, textColor: p.info),
      OrderStatus.awaitingReceipt =>
        StatusChip(label: l.orderAwaitingReceipt, color: AzzaColors.green, textColor: AzzaColors.inkDeep),
      OrderStatus.verifying => StatusChip(label: l.orderVerifying, color: AzzaColors.green, textColor: AzzaColors.inkDeep),
      OrderStatus.amountMismatch =>
        StatusChip(label: l.orderAmountMismatch, color: p.warning, look: ChipLook.dashed),
      OrderStatus.paid => StatusChip(label: l.orderPaid, color: p.successBg, textColor: p.success),
      OrderStatus.failed => StatusChip(label: l.orderFailed, color: p.danger, look: ChipLook.outline),
      OrderStatus.rejected => StatusChip(label: l.orderRejected, color: p.danger, look: ChipLook.dashed),
      OrderStatus.expired => StatusChip(label: l.orderExpired, color: p.muted, look: ChipLook.struck),
      OrderStatus.refunded => StatusChip(label: l.orderRefunded, color: p.muted, look: ChipLook.outline),
    };
  }

  @override
  Widget build(BuildContext context) {
    final c = color ?? AzzaPalette.of(context).muted;
    final filled = look == ChipLook.filled;
    final fg = filled ? (textColor ?? AzzaColors.inkDeep) : c;
    final arabic = context.isArabic;
    final style = AzzaFonts.body(arabic: arabic, size: 12, weight: FontWeight.w700, color: fg).copyWith(
      letterSpacing: arabic ? 0 : 0.5,
      height: 1.25,
      decoration: look == ChipLook.struck ? TextDecoration.lineThrough : null,
      decorationColor: fg,
    );
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (live) ...[SignalMark(size: 14, color: fg, live: true), const SizedBox(width: 4)],
        Flexible(child: Text(arabic ? label : label.toUpperCase(), style: style)),
      ],
    );
    final decoration = BoxDecoration(
      color: filled ? c : null,
      borderRadius: BorderRadius.circular(999),
      border: filled
          ? null
          : Border.all(color: look == ChipLook.struck ? AzzaPalette.of(context).line : c),
    );
    // Grows with the text scale: a minimum height, never a fixed one.
    final chip = Container(
      constraints: const BoxConstraints(minHeight: 24),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      alignment: Alignment.center,
      decoration: decoration,
      child: content,
    );
    return Semantics(label: label, child: ExcludeSemantics(child: look == ChipLook.dashed ? _Dashed(color: c, child: chip) : chip));
  }
}

class _Dashed extends StatelessWidget {
  const _Dashed({required this.color, required this.child});
  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) => CustomPaint(foregroundPainter: _DashPainter(color), child: child);
}

class _DashPainter extends CustomPainter {
  _DashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final r = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(size.height / 2));
    final path = Path()..addRRect(r);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final m in path.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, d + 4), paint);
        d += 7;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashPainter old) => old.color != color;
}

/// Slate-number tag: `B07 · S05`.
class Slate extends StatelessWidget {
  const Slate(this.text, {super.key, this.color, this.inverted = false});
  final String text;
  final Color? color;
  final bool inverted;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final fg = inverted ? p.ground : (color ?? p.text);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: inverted ? (color ?? p.text) : null,
        border: inverted ? null : Border.all(color: p.line),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text, textDirection: TextDirection.ltr, style: AzzaFonts.mono(size: 12, color: fg, tracking: 0.08)),
    );
  }
}

/// Raised surface ("slate card").
class RaisedCard extends StatelessWidget {
  const RaisedCard({super.key, required this.child, this.onTap, this.padding = const EdgeInsets.all(18), this.color, this.border = true});
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final bool border;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Material(
      color: color ?? p.raised,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AzzaSpace.radius),
        side: border ? BorderSide(color: p.line) : BorderSide.none,
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
    );
  }
}

/// A content section on a card (BRAND.md: white/ink2 surface, 16px radius, soft border).
/// [title] sits inside the card, so a screen reads as a stack of cards rather than loose text on the ground.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, this.title, this.trailing, required this.child, this.padding = const EdgeInsets.all(16), this.margin = const EdgeInsets.only(top: 12)});
  final String? title;
  final Widget? trailing;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: p.raised,
        borderRadius: BorderRadius.circular(AzzaSpace.radius),
        border: Border.all(color: p.line),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        if (title != null) ...[
          Row(children: [
            Expanded(child: Text(title!, style: Theme.of(context).textTheme.titleMedium)),
            if (trailing != null) Flexible(child: trailing!),
          ]),
          const SizedBox(height: 12),
        ],
        child,
      ]),
    );
  }
}

/// A list of tappable rows on one card, divided by hairlines; [title] is the small label above the card.
class CardGroup extends StatelessWidget {
  const CardGroup({super.key, this.title, required this.children});
  final String? title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final rows = children.where((w) => w is! SizedBox || (w.width ?? 1) > 0).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (title != null)
        Padding(
          padding: const EdgeInsetsDirectional.only(start: 4, top: 24, bottom: 8),
          child: Text(title!, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: p.textSecondary)),
        ),
      Material(
        color: p.raised,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AzzaSpace.radius), side: BorderSide(color: p.line)),
        clipBehavior: Clip.antiAlias,
        child: Column(children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: p.line),
            rows[i],
          ],
        ]),
      ),
    ]);
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.action, this.onAction, this.padding = const EdgeInsets.only(top: 28, bottom: 12)});
  final String title;
  final String? action;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Padding(
      padding: padding,
      child: Row(
        children: [
          Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
          if (action != null)
            Flexible(
              child: TextButton(
                onPressed: onAction,
                style: TextButton.styleFrom(foregroundColor: p.textSecondary, minimumSize: const Size(48, 44)),
                child: Text(action!, textAlign: TextAlign.end),
              ),
            ),
        ],
      ),
    );
  }
}

/// Portrait when [imageUrl] is set (falls back to initials while loading or on error), else initials.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar(this.name, {super.key, this.size = 40, this.color, this.speaking = false, this.imageUrl});
  final String name;
  final double size;
  final Color? color;
  final bool speaking;
  final String? imageUrl;

  static String initialsOf(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final initials = Text(
      initialsOf(name),
      style: AzzaFonts.display(arabic: context.isArabic, size: size * 0.38, weight: FontWeight.w700, color: color == null ? p.text : _onFill(color!)),
    );
    return AnimatedContainer(
      duration: AzzaMotion.quick,
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color ?? p.line,
        border: speaking ? Border.all(color: AzzaColors.green, width: 2.5) : null,
      ),
      clipBehavior: imageUrl == null ? Clip.none : Clip.antiAlias,
      child: imageUrl == null ? initials : MediaImage(imageUrl, fallback: Center(child: initials), cacheWidth: size),
    );
  }
}

/// Text colour for initials on a [fill]: inkDeep on light fills, white on dark ones.
Color _onFill(Color fill) => fill.computeLuminance() > 0.18 ? AzzaColors.inkDeep : AzzaColors.ivory;

/// Rebuilds every [interval] — for countdowns and live timecodes.
class Ticker extends StatefulWidget {
  const Ticker({super.key, required this.builder, this.interval = const Duration(seconds: 1)});
  final Widget Function(BuildContext context, DateTime now) builder;
  final Duration interval;

  @override
  State<Ticker> createState() => _TickerState();
}

class _TickerState extends State<Ticker> {
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(widget.interval, (_) => setState(() {}));
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.builder(context, DateTime.now());
}

class KeyValueRow extends StatelessWidget {
  const KeyValueRow(this.label, this.value, {super.key, this.emphasize = false, this.valueColor, this.mono = false});
  final String label;
  final String value;
  final bool emphasize;
  final Color? valueColor;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final vStyle = mono
        ? AzzaFonts.mono(size: 13, color: valueColor ?? p.text, tracking: 0.04)
        : (emphasize ? t.titleMedium : t.bodyMedium)?.copyWith(color: valueColor);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: (emphasize ? t.titleMedium : t.bodyMedium)?.copyWith(color: emphasize ? null : p.textSecondary))),
          const SizedBox(width: 12),
          Flexible(child: Text(value, style: vStyle, textAlign: TextAlign.end)),
        ],
      ),
    );
  }
}

/// Sticky bottom action area used by flows (checkout, enroll, lobby).
class BottomActionBar extends StatelessWidget {
  const BottomActionBar({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(color: p.ground, border: Border(top: BorderSide(color: p.line))),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 12, AzzaSpace.gutter, 12),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        ),
      ),
    );
  }
}

/// Selectable option row (radio-like) used for payment methods, banks, currencies.
class OptionTile extends StatelessWidget {
  const OptionTile({super.key, required this.title, this.subtitle, required this.selected, required this.onTap, this.leading, this.trailing});
  final String title;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;
  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: p.raised,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: selected ? p.accent : p.line, width: selected ? 1.6 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                if (leading != null) ...[leading!, const SizedBox(width: 12)],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: t.titleSmall),
                      if (subtitle != null) Text(subtitle!, style: t.bodySmall),
                    ],
                  ),
                ),
                ?trailing,
                const SizedBox(width: 8),
                Icon(selected ? Icons.radio_button_checked : Icons.radio_button_unchecked, color: selected ? p.accent : p.muted, size: 22),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

void showToast(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
