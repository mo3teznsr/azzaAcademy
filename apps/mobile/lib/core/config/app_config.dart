/// Build-time configuration, injected with `--dart-define`.
///
/// ```bash
/// flutter run \
///   --dart-define=API_BASE_URL=http://10.0.2.2:4000 \
///   --dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_... \
///   --dart-define=STRIPE_MERCHANT_ID=merchant.com.azza \
///   --dart-define=WEB_URL=https://azza.academy
/// ```
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    this.stripePublishableKey = '',
    this.stripeMerchantId = '',
    this.webBaseUrl = 'http://localhost:3005',
  });

  factory AppConfig.fromEnvironment() => const AppConfig(
        // `API_URL` is accepted as an alias (same name as the web app's env).
        apiBaseUrl: String.fromEnvironment('API_BASE_URL', defaultValue: String.fromEnvironment('API_URL', defaultValue: 'http://localhost:4000')),
        stripePublishableKey: String.fromEnvironment('STRIPE_PUBLISHABLE_KEY'),
        stripeMerchantId: String.fromEnvironment('STRIPE_MERCHANT_ID'),
        webBaseUrl: String.fromEnvironment('WEB_URL', defaultValue: 'http://localhost:3005'),
      );

  /// Origin of the Azza API (no trailing slash). Socket.IO uses the same origin.
  final String apiBaseUrl;
  final String stripePublishableKey;
  final String stripeMerchantId;

  /// Origin of the Azza web app (public pages such as certificate verification).
  final String webBaseUrl;

  bool get stripeEnabled => stripePublishableKey.isNotEmpty;

  /// Resolves an API-relative media path (`/media/...`, `/uploads/...`) against [apiBaseUrl];
  /// absolute URLs pass through, empty → null.
  String? resolveMediaUrl(String? path) {
    if (path == null || path.isEmpty) return null;
    return path.startsWith('/') ? '$apiBaseUrl$path' : path;
  }

  /// Public verification page for a certificate: `<web origin>/verify/<code>`.
  String certificateVerifyUrl(String code) {
    final origin = webBaseUrl.endsWith('/') ? webBaseUrl.substring(0, webBaseUrl.length - 1) : webBaseUrl;
    return '$origin/verify/${Uri.encodeComponent(code)}';
  }

  /// Business constants mirrored from the API config (display only — the API is authoritative).
  static const bankTransferHoldHours = 48;
  static const lobbyOpensMinutesBefore = 15;
}
