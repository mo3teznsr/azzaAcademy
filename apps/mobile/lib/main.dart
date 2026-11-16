import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/prefs/app_prefs.dart';
import 'core/providers.dart';
import 'core/push/push_service.dart';
import 'features/auth/presentation/session_hooks.dart';
import 'features/learn/presentation/lesson_video_player.dart';
import 'features/learn/presentation/lesson_video_tracker.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();

  await initializeDateFormatting();
  final prefs = await SharedPreferences.getInstance();

  // Card payments use Stripe Checkout's hosted page (opened in an in-app browser), so no Stripe SDK setup here.

  // Firebase is optional: without google-services files push stays disabled.
  final push = await FirebasePushService.init();

  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
        sharedPreferencesProvider.overrideWithValue(prefs),
        pushServiceProvider.overrideWithValue(push),
        ...productionSessionHooks(),
        // Uploaded lesson videos play in the app, resume where the learner stopped and save progress.
        lessonPlayerBuilderProvider.overrideWithValue(
          (context, request) => LessonVideoPlayer(request: request),
        ),
      ],
      child: const AzzaApp(),
    ),
  );
}
