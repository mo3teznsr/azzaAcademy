import 'package:azza/core/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'release builds never point at a dev server (would freeze on the launch screen)',
    () {
      expect(
        AppConfig.storeSafeApiUrl('http://localhost:4000', release: true),
        AppConfig.productionApiUrl,
      );
      expect(
        AppConfig.storeSafeApiUrl(
          'https://staging.azza.academy',
          release: true,
        ),
        'https://staging.azza.academy',
      );
      expect(
        AppConfig.storeSafeApiUrl('http://localhost:4000', release: false),
        'http://localhost:4000',
      );
    },
  );
}
