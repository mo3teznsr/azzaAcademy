import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/prefs/app_prefs.dart';
import 'core/providers.dart';
import 'core/push/push_service.dart';
import 'features/auth/presentation/session_hooks.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();

  await initializeDateFormatting();
  final prefs = await SharedPreferences.getInstance();

  // Stripe is optional: without a publishable key the card option is disabled.
  if (config.stripeEnabled) {
    Stripe.publishableKey = config.stripePublishableKey;
    if (config.stripeMerchantId.isNotEmpty) {
      Stripe.merchantIdentifier = config.stripeMerchantId;
    }
    try {
      await Stripe.instance.applySettings();
    } catch (e) {
      debugPrint('[stripe] init failed: $e');
    }
  }

  // Firebase is optional: without google-services files push stays disabled.
  final push = await FirebasePushService.init();

  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
        sharedPreferencesProvider.overrideWithValue(prefs),
        pushServiceProvider.overrideWithValue(push),
        ...productionSessionHooks(),
      ],
      child: const AzzaApp(),
    ),
  );
}
