import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// The "signal" motif: a dot with two pairs of arcs. Arcs pulse outward only
/// while [live] is true (and reduced motion is off).
class SignalMark extends StatefulWidget {
  const SignalMark({super.key, this.size = 24, this.color = AzzaColors.onAir, this.live = false});

  final double size;
  final Color color;
  final bool live;

  @override
  State<SignalMark> createState() => _SignalMarkState();
}

class _SignalMarkState extends State<SignalMark> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(covariant SignalMark oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (widget.live && !reduce) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c.stop();
      _c.value = 0;
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
          builder: (context, _) => CustomPaint(painter: _SignalPainter(widget.color, widget.live ? _c.value : 0)),
        ),
      ),
    );
  }
}

class _SignalPainter extends CustomPainter {
  _SignalPainter(this.color, this.t);
  final Color color;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final unit = size.width / 24;
    canvas.drawCircle(c, 3.2 * unit, Paint()..color = color);
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = math.max(1.2, 1.4 * unit);
    for (final (i, r) in [5.0, 9.0].indexed) {
      final phase = (t + i * 0.5) % 1;
      final grow = t == 0 ? 0.0 : phase * 1.2 * unit;
      final alpha = t == 0 ? 1.0 : (1 - phase * 0.6);
      stroke.color = color.withValues(alpha: alpha);
      final rect = Rect.fromCircle(center: c, radius: r * unit + grow);
      canvas.drawArc(rect, math.pi * 0.75, math.pi * 0.5, false, stroke);
      canvas.drawArc(rect, -math.pi * 0.25, math.pi * 0.5, false, stroke);
    }
  }

  @override
  bool shouldRepaint(covariant _SignalPainter old) => old.t != t || old.color != color;
}

/// `azza.` wordmark; the full stop is the on-air lamp.
class AzzaWordmark extends StatelessWidget {
  const AzzaWordmark({super.key, this.size = 28, this.color});
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.displayLarge!.copyWith(fontSize: size, color: color, height: 0.9);
    return Text.rich(
      TextSpan(text: 'azza', children: const [TextSpan(text: '.', style: TextStyle(color: AzzaColors.onAir))]),
      style: style,
      textDirection: TextDirection.ltr,
      semanticsLabel: 'azza',
    );
  }
}
