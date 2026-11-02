import 'dart:async';

import 'package:azza/core/theme/typography.dart';
import 'package:intl/date_symbol_data_local.dart';

/// Applied to every test file: no network font fetching, date symbols loaded.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  AzzaFonts.useGoogleFonts = false;
  await initializeDateFormatting();
  await testMain();
}
