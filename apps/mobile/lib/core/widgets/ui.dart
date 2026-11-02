import 'dart:async';

import 'package:flutter/material.dart';

import '../domain/enums.dart';
import '../l10n/l10n.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';
import 'media_image.dart';
import 'signal_mark.dart';

export 'media_image.dart';
export 'signal_mark.dart';
export 'states.dart';

/// Uppercase mono caption (`LIVE · 00:05:12`, `B07 · S05`). Always LTR digits.
class MonoLabel extends StatelessWidget {
  const MonoLabel(this.text, {super.key, this.color, this.size = 11, this.weight = FontWeight.w500});
  final String text;
  final Color? color;
  final double size;
  final FontWeight weight;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: AzzaFonts.mono(size: size, weight: weight, color: color ?? AzzaPalette.of(context).muted),
    );
  }
}

/// Large display headline (Bricolage / Readex).
class DisplayText extends StatelessWidget {
  const DisplayText(this.text, {super.key, this.size = 34, this.color, this.weight = FontWeight.w700, this.maxLines});
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
      return StatusChip(label: l.statusLive, color: AzzaColors.onAir, textColor: AzzaColors.ink, live: true);
    }
    if (status == SessionStatus.ended) return StatusChip(label: l.statusEnded, color: p.muted, look: ChipLook.outline);
    if (status == SessionStatus.cancelled) {
      return StatusChip(label: l.statusCancelled, color: p.muted, look: ChipLook.struck);
    }
    if (startsAt != null) {
      final mins = startsAt.difference(DateTime.now()).inMinutes;
      if (mins >= 0 && mins <= 60) {
        return StatusChip(label: l.statusStartsIn('$mins'), color: AzzaColors.sun, textColor: AzzaColors.ink);
      }
    }
    if (moved) return StatusChip(label: l.statusRescheduled, color: AzzaColors.peach, look: ChipLook.dashed);
    return StatusChip(label: l.statusScheduled, color: AzzaColors.sky, textColor: AzzaColors.ink);
  }

  factory StatusChip.batch(BuildContext context, BatchStatus status, {int? taken, int? capacity}) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return switch (status) {
      BatchStatus.draft => StatusChip(label: l.batchDraft, color: p.muted, look: ChipLook.dashed),
      BatchStatus.enrolling => StatusChip(
          label: taken != null && capacity != null ? '${l.batchEnrolling} · $taken/$capacity' : l.batchEnrolling,
          color: AzzaColors.sage,
          textColor: AzzaColors.ink,
        ),
      BatchStatus.full => StatusChip(label: l.batchFull, color: AzzaColors.peach, textColor: AzzaColors.ink),
      BatchStatus.running => StatusChip(
          label: l.batchRunning,
          color: p.isDark ? AzzaColors.ivory : AzzaColors.ink,
          textColor: p.isDark ? AzzaColors.ink : AzzaColors.ivory,
        ),
      BatchStatus.completed => StatusChip(label: l.batchCompleted, color: p.muted, look: ChipLook.outline),
      BatchStatus.cancelled => StatusChip(label: l.batchCancelled, color: p.muted, look: ChipLook.struck),
    };
  }

  factory StatusChip.order(BuildContext context, OrderStatus status) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return switch (status) {
      OrderStatus.awaitingPayment =>
        StatusChip(label: l.orderAwaitingPayment, color: AzzaColors.sky, textColor: AzzaColors.ink),
      OrderStatus.awaitingReceipt =>
        StatusChip(label: l.orderAwaitingReceipt, color: AzzaColors.sun, textColor: AzzaColors.ink),
      OrderStatus.verifying => StatusChip(label: l.orderVerifying, color: AzzaColors.sun, textColor: AzzaColors.ink),
      OrderStatus.amountMismatch =>
        StatusChip(label: l.orderAmountMismatch, color: AzzaColors.peach, look: ChipLook.dashed),
      OrderStatus.paid => StatusChip(label: l.orderPaid, color: AzzaColors.sage, textColor: AzzaColors.ink),
      OrderStatus.failed => StatusChip(label: l.orderFailed, color: AzzaColors.peach, look: ChipLook.outline),
      OrderStatus.rejected => StatusChip(label: l.orderRejected, color: AzzaColors.peach, look: ChipLook.dashed),
      OrderStatus.expired => StatusChip(label: l.orderExpired, color: p.muted, look: ChipLook.struck),
      OrderStatus.refunded => StatusChip(label: l.orderRefunded, color: p.muted, look: ChipLook.outline),
    };
  }

  @override
  Widget build(BuildContext context) {
    final c = color ?? AzzaPalette.of(context).muted;
    final filled = look == ChipLook.filled;
    final fg = filled ? (textColor ?? AzzaColors.ink) : c;
    final style = AzzaFonts.mono(size: 11, color: fg, tracking: 0.06).copyWith(
      decoration: look == ChipLook.struck ? TextDecoration.lineThrough : null,
      decorationColor: fg,
    );
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (live) ...[SignalMark(size: 14, color: fg, live: true), const SizedBox(width: 4)],
        Text(label.toUpperCase(), style: style),
      ],
    );
    final decoration = BoxDecoration(
      color: filled ? c : null,
      borderRadius: BorderRadius.circular(999),
      border: filled
          ? null
          : Border.all(color: look == ChipLook.struck ? AzzaPalette.of(context).line : c),
    );
    final chip = Container(
      height: 24,
      padding: const EdgeInsets.symmetric(horizontal: 10),
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
      child: Text(text, textDirection: TextDirection.ltr, style: AzzaFonts.mono(size: 11, color: fg, tracking: 0.08)),
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
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(foregroundColor: p.muted, minimumSize: const Size(48, 44)),
              child: Text(action!),
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
      style: AzzaFonts.display(arabic: context.isArabic, size: size * 0.38, weight: FontWeight.w700, color: color == null ? p.text : AzzaColors.ink),
    );
    return AnimatedContainer(
      duration: AzzaMotion.quick,
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color ?? p.line,
        border: speaking ? Border.all(color: AzzaColors.sun, width: 2.5) : null,
      ),
      clipBehavior: imageUrl == null ? Clip.none : Clip.antiAlias,
      child: imageUrl == null ? initials : MediaImage(imageUrl, fallback: Center(child: initials), cacheWidth: size),
    );
  }
}

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
          Expanded(child: Text(label, style: (emphasize ? t.titleMedium : t.bodyMedium)?.copyWith(color: emphasize ? null : p.muted))),
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
