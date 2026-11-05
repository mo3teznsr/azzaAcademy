import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/error_text.dart';
import '../l10n/l10n.dart';
import '../theme/tokens.dart';
import 'signal_mark.dart';

/// Loading indicator in the brand motif.
class LoadingState extends StatelessWidget {
  const LoadingState({super.key, this.compact = false});
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Center(
      child: Padding(
        padding: EdgeInsets.all(compact ? 16 : 40),
        child: Semantics(
          label: 'Loading',
          child: SignalMark(size: compact ? 28 : 44, color: p.muted, live: true),
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.body, this.action, this.onAction, this.icon});
  final String title;
  final String? body;
  final String? action;
  final VoidCallback? onAction;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) Icon(icon, size: 36, color: p.muted) else SignalMark(size: 36, color: p.line),
            const SizedBox(height: 16),
            Text(title, style: t.headlineSmall, textAlign: TextAlign.center),
            if (body != null) ...[
              const SizedBox(height: 8),
              Text(body!, style: t.bodyMedium?.copyWith(color: p.muted), textAlign: TextAlign.center),
            ],
            if (action != null && onAction != null) ...[
              const SizedBox(height: 20),
              FilledButton(onPressed: onAction, child: Text(action!)),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.error, this.onRetry});
  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final message = errorText(context, error);
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.portable_wifi_off_rounded, size: 36, color: p.muted),
            const SizedBox(height: 16),
            Text(l.errorTitle, style: t.headlineSmall, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(message, style: t.bodyMedium?.copyWith(color: p.muted), textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              OutlinedButton(onPressed: onRetry, child: Text(l.retry)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Renders loading / error / empty / data for an [AsyncValue] consistently.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    super.key,
    required this.value,
    required this.data,
    this.isEmpty,
    this.empty,
    this.onRetry,
    this.compact = false,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final bool Function(T data)? isEmpty;
  final Widget? empty;
  final VoidCallback? onRetry;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    // Keep showing previous data while refreshing.
    if (value.hasValue && !value.hasError) {
      final v = value.requireValue;
      if (isEmpty?.call(v) ?? false) return empty ?? EmptyState(title: context.l10n.emptyGeneric);
      return data(v);
    }
    if (value.hasError) return ErrorState(error: value.error!, onRetry: onRetry);
    return LoadingState(compact: compact);
  }
}

/// Standard pull-to-refresh list wrapper.
class RefreshList extends StatelessWidget {
  const RefreshList({super.key, required this.onRefresh, required this.children, this.padding});
  final Future<void> Function() onRefresh;
  final List<Widget> children;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AzzaPalette.of(context).accent,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: padding ?? const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: children,
      ),
    );
  }
}
