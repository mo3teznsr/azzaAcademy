import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/domain/enums.dart';
import '../features/auth/domain/app_user.dart';
import 'routes.dart';

/// Pure routing guard (unit-tested): decides where a [location] (path and query) should go
/// given the auth state and whether first-run onboarding is done.
///
/// Signed out, a visitor browses as a guest ([Routes.isGuestPath]); anything that needs an account sends them to
/// sign-in with `?from=<location>`, and once signed in (or signed up, past the profile-photo step) they land back there.
///
/// A shared detail path (`/courses/ux`, `/messages/c1`…) opens inside the reader's current tab, so the tab bar stays:
/// [current] is the location being left (null when unknown). See [Routes.inTab].
String? computeRedirect({
  required AsyncValue<AppUser?> auth,
  required bool onboarded,
  required String location,
  String? current,
}) {
  final uri = Uri.tryParse(location) ?? Uri(path: location);
  final path = uri.path;

  // Restoring the session (or it failed for network reasons): hold on splash.
  if (!auth.hasValue) {
    return path == Routes.splash ? null : Routes.splash;
  }

  final user = auth.value;
  if (path == Routes.verifyEmail) return null;
  final from = Routes.safeFrom(uri.queryParameters['from']);
  final atEntry = path == Routes.splash || path == '/';

  String? inTab(Role role) {
    final nested = Routes.inTab(path, role, current);
    return nested == null || !uri.hasQuery ? nested : '$nested?${uri.query}';
  }

  if (user == null) {
    // Guests browse inside the student shell.
    if (Routes.isGuestPath(path)) return inTab(Role.student);
    final resume = atEntry ? null : Routes.safeFrom(location);
    if (!onboarded) return path.startsWith(Routes.welcome) ? null : Routes.withFrom(Routes.welcome, resume);
    if (Routes.publicPaths.contains(path)) return null;
    if (atEntry) return Routes.welcome;
    return Routes.signInFrom(resume);
  }

  final home = Routes.homeFor(user.role);
  // Students add a photo before anything else (sign-up step, and once for older accounts); the way back rides along.
  if (user.needsPhoto) {
    if (path == Routes.profilePhoto) return null;
    final resume = from ?? (path == home ? null : Routes.safeFrom(location));
    return Routes.withFrom(Routes.profilePhoto, resume);
  }
  if (path == Routes.profilePhoto) return from ?? home;

  if (Routes.publicPaths.contains(path)) return from ?? home;
  if (atEntry) return home;
  for (final role in Role.values) {
    if (role != user.role && Routes.belongsTo(path, role)) return home;
  }
  if (path == user.role.home) return home;
  return inTab(user.role);
}
