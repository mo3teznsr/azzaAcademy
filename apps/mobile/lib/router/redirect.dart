import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/domain/enums.dart';
import '../features/auth/domain/app_user.dart';
import 'routes.dart';

/// Pure routing guard (unit-tested): decides where a [location] should go
/// given the auth state and whether first-run onboarding is done.
String? computeRedirect({
  required AsyncValue<AppUser?> auth,
  required bool onboarded,
  required String location,
}) {
  // Restoring the session (or it failed for network reasons): hold on splash.
  if (!auth.hasValue) {
    return location == Routes.splash ? null : Routes.splash;
  }

  final user = auth.value;
  if (location == Routes.verifyEmail) return null;

  if (user == null) {
    if (!onboarded) return location.startsWith(Routes.welcome) ? null : Routes.welcome;
    if (Routes.publicPaths.contains(location)) return null;
    return Routes.signIn;
  }

  final home = Routes.homeFor(user.role);
  if (location == Routes.splash || location == '/' || Routes.publicPaths.contains(location)) return home;
  for (final role in Role.values) {
    if (role != user.role && Routes.belongsTo(location, role)) return home;
  }
  if (location == user.role.home) return home;
  return null;
}
