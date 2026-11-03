import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

bool _reduceMotion(BuildContext context) => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

/// On-air lamp: a small dot with a soft halo that breathes while [active].
/// Static (no halo) when reduced motion is on.
class PulsingDot extends StatefulWidget {
  const PulsingDot({super.key, this.size = 8, this.color = AzzaColors.onAir, this.active = true});
  final double size;
  final Color color;
  final bool active;

  @override
  State<PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<PulsingDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(covariant PulsingDot oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    if (widget.active && !_reduceMotion(context)) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final box = widget.size * 2.2;
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: box,
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) {
            final t = _c.value;
            final halo = _c.isAnimating;
            return CustomPaint(painter: _DotPainter(widget.color, widget.size / 2, halo ? t : null));
          },
        ),
      ),
    );
  }
}

class _DotPainter extends CustomPainter {
  _DotPainter(this.color, this.radius, this.t);
  final Color color;
  final double radius;
  final double? t;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    if (t != null) {
      final eased = Curves.easeOut.transform(t!);
      final r = radius + (size.width / 2 - radius) * eased;
      canvas.drawCircle(c, r, Paint()..color = color.withValues(alpha: 0.45 * (1 - eased)));
    }
    canvas.drawCircle(c, radius, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _DotPainter old) => old.t != t || old.color != color || old.radius != radius;
}

/// Subtle one-time entrance (fade + short rise), staggered by [index].
/// Plays once when first built; renders in place when reduced motion is on.
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({super.key, required this.child, this.index = 0, this.offset = 12});
  final Widget child;
  final int index;
  final double offset;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn> with SingleTickerProviderStateMixin {
  static const _base = 420;
  static const _step = 40;
  late final int _delay = _step * math.min(widget.index, 6);
  late final AnimationController _c = AnimationController(vsync: this, duration: Duration(milliseconds: _base + _delay));
  late final Animation<double> _curve = CurvedAnimation(
    parent: _c,
    // The stagger is the leading part of the timeline — no timers involved.
    curve: Interval(_delay / (_base + _delay), 1, curve: AzzaMotion.ease),
  );
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (_reduceMotion(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curve,
      child: widget.child,
      builder: (context, child) {
        final v = _curve.value;
        return Opacity(
          opacity: v,
          child: Transform.translate(offset: Offset(0, widget.offset * (1 - v)), child: child),
        );
      },
    );
  }
}

/// "Course complete": the signal mark lights up once — dot first, then each pair of arcs,
/// with a single soft glow. Reduced motion shows the lit mark immediately.
class SignalLightUp extends StatefulWidget {
  const SignalLightUp({super.key, this.size = 56, this.color = AzzaColors.onAir, this.play = true});
  final double size;
  final Color color;

  /// false = draw the mark already lit (no animation).
  final bool play;

  @override
  State<SignalLightUp> createState() => _SignalLightUpState();
}

class _SignalLightUpState extends State<SignalLightUp> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (!widget.play || _reduceMotion(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: widget.size,
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) => CustomPaint(painter: _LightUpPainter(widget.color, _c.value)),
        ),
      ),
    );
  }
}

class _LightUpPainter extends CustomPainter {
  _LightUpPainter(this.color, this.t);
  final Color color;
  final double t;

  /// 0→1 progress of a phase that runs between [from] and [to] of the whole timeline.
  double _phase(double from, double to) => ((t - from) / (to - from)).clamp(0.0, 1.0);

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final unit = size.width / 24;
    final dim = color.withValues(alpha: 0.18);

    // Glow: a single swell after the arcs are lit, settling to a faint halo.
    final glow = _phase(0.55, 1);
    if (glow > 0) {
      final swell = math.sin(glow * math.pi) * 0.35 + glow * 0.08;
      canvas.drawCircle(
        c,
        11.5 * unit,
        Paint()
          ..color = color.withValues(alpha: swell * 0.5)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, 4 * unit),
      );
    }

    final dot = Curves.easeOutBack.transform(_phase(0, 0.25));
    canvas.drawCircle(c, 3.2 * unit, Paint()..color = dim);
    if (dot > 0) canvas.drawCircle(c, 3.2 * unit * dot, Paint()..color = color);

    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = math.max(1.2, 1.4 * unit);
    for (final (i, r) in [5.0, 9.0].indexed) {
      final lit = Curves.easeOut.transform(_phase(0.2 + i * 0.18, 0.45 + i * 0.18));
      final rect = Rect.fromCircle(center: c, radius: r * unit);
      stroke.color = Color.lerp(dim, color, lit)!;
      canvas.drawArc(rect, math.pi * 0.75, math.pi * 0.5, false, stroke);
      canvas.drawArc(rect, -math.pi * 0.25, math.pi * 0.5, false, stroke);
    }
  }

  @override
  bool shouldRepaint(covariant _LightUpPainter old) => old.t != t || old.color != color;
}
