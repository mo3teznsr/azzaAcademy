import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../theme/tokens.dart';
import '../utils/digits.dart';
import 'fields.dart';

/// A whole number in a field-styled box with − / + on its trailing edge (seats, minutes).
/// Same input group as every other field ([fieldDecoration]), so forms stay one visual system.
class CountStepper extends StatelessWidget {
  const CountStepper({
    super.key,
    required this.label,
    required this.icon,
    required this.value,
    required this.onChanged,
    this.min = 1,
    this.max = 500,
    this.step = 1,
    this.hint,
    this.helper,
    this.arabicDigits = false,
    this.enabled = true,
  });

  final String label;
  final IconData icon;
  final int value;
  final ValueChanged<int> onChanged;
  final int min;
  final int max;
  final int step;
  final String? hint;
  final String? helper;
  final bool arabicDigits;
  final bool enabled;

  void _set(int v) => onChanged(v.clamp(min, max));

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final key = this.key is ValueKey<String> ? (this.key! as ValueKey<String>).value : 'stepper';
    return Semantics(
      label: label,
      value: '$value',
      increasedValue: '${(value + step).clamp(min, max)}',
      decreasedValue: '${(value - step).clamp(min, max)}',
      onIncrease: enabled && value < max ? () => _set(value + step) : null,
      onDecrease: enabled && value > min ? () => _set(value - step) : null,
      child: InputDecorator(
        decoration: fieldDecoration(
          label: label,
          icon: icon,
          hint: hint,
          helper: helper,
          action: Row(mainAxisSize: MainAxisSize.min, children: [
            IconButton(
              key: Key('$key-minus'),
              tooltip: l.decrease,
              onPressed: enabled && value > min ? () => _set(value - step) : null,
              icon: const Icon(Icons.remove_rounded, size: 20),
            ),
            IconButton(
              key: Key('$key-plus'),
              tooltip: l.increase,
              color: p.text,
              onPressed: enabled && value < max ? () => _set(value + step) : null,
              icon: const Icon(Icons.add_rounded, size: 20),
            ),
            const SizedBox(width: 4),
          ]),
        ),
        child: Text('$value'.digits(arabicDigits), key: Key('$key-value'), style: Theme.of(context).textTheme.bodyLarge),
      ),
    );
  }
}
