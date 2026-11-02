import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart' hide PaymentMethod, BankAccount;

import '../../../core/money/money.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/providers.dart';
import '../domain/checkout_models.dart';

/// Checkout, orders, bank accounts, FX (`/api/v1/checkout*`, `/orders*`, `/bank-accounts`, `/fx-rates`).
abstract class CheckoutRepository {
  Future<FxRates> fxRates();
  Future<Quote> quote(CheckoutRequest request);
  Future<CheckoutResult> checkout(CheckoutRequest request);
  Future<Order> order(String id);
  Future<List<Order>> myOrders();
  Future<List<BankAccount>> bankAccounts();

  /// Uploads the receipt file to the order (status → VERIFYING).
  Future<Order> submitReceipt(String orderId, PickedFile file);
}

class DioCheckoutRepository extends DioRepository implements CheckoutRepository {
  DioCheckoutRepository(super.dio);

  @override
  Future<FxRates> fxRates() async => FxRates.fromJson(await getJson('/api/v1/fx-rates'));

  @override
  Future<Quote> quote(CheckoutRequest request) async =>
      Quote.fromJson(await postJson('/api/v1/checkout/quote', request.toJson()));

  @override
  Future<CheckoutResult> checkout(CheckoutRequest request) async =>
      CheckoutResult.fromJson(await postJson('/api/v1/checkout', request.toJson()));

  @override
  Future<Order> order(String id) async {
    // Owner/ADMIN: includes the full receiving `bankAccount` (unmasked IBAN) chosen at checkout.
    return Order.fromJson(await getJson('/api/v1/orders/$id'));
  }

  @override
  Future<List<Order>> myOrders() async => (await getItems('/api/v1/me/orders')).map(Order.fromJson).toList();

  @override
  Future<List<BankAccount>> bankAccounts() async =>
      (await getItems('/api/v1/bank-accounts')).map(BankAccount.fromJson).toList();

  /// `POST /orders/:id/receipt/file` (multipart `file`; PDF/PNG/JPG/WEBP/HEIC ≤ 10 MB) → the order (VERIFYING).
  @override
  Future<Order> submitReceipt(String orderId, PickedFile file) => guard(() async {
        final form = FormData.fromMap({
          'file': file.path != null
              ? await MultipartFile.fromFile(file.path!, filename: file.name, contentType: _mediaType(file.name))
              : MultipartFile.fromBytes(file.bytes ?? const [], filename: file.name, contentType: _mediaType(file.name)),
        });
        final res = await dio.post<dynamic>('/api/v1/orders/$orderId/receipt/file', data: form);
        return Order.fromJson(asMap(res.data));
      });

  static DioMediaType? _mediaType(String name) {
    final ext = name.split('.').last.toLowerCase();
    return switch (ext) {
      'pdf' => DioMediaType('application', 'pdf'),
      'png' => DioMediaType('image', 'png'),
      'jpg' || 'jpeg' => DioMediaType('image', 'jpeg'),
      'webp' => DioMediaType('image', 'webp'),
      'heic' => DioMediaType('image', 'heic'),
      _ => null,
    };
  }
}

final checkoutRepositoryProvider = Provider<CheckoutRepository>((ref) => DioCheckoutRepository(ref.watch(dioProvider)));

final fxRatesProvider = FutureProvider<FxRates>((ref) async {
  try {
    return await ref.watch(checkoutRepositoryProvider).fxRates();
  } catch (_) {
    return FxRates.fallback;
  }
});

final orderProvider = FutureProvider.autoDispose.family<Order, String>(
  (ref, id) => ref.watch(checkoutRepositoryProvider).order(id),
);

final myOrdersProvider = FutureProvider.autoDispose<List<Order>>((ref) => ref.watch(checkoutRepositoryProvider).myOrders());

final bankAccountsProvider = FutureProvider.autoDispose<List<BankAccount>>(
  (ref) => ref.watch(checkoutRepositoryProvider).bankAccounts(),
);

// ───────────────────────── Payment sheet port ─────────────────────────

enum PaymentSheetOutcome { completed, cancelled }

/// Port over Stripe's Payment Sheet so screens are testable without the SDK.
abstract class PaymentSheetGateway {
  bool get available;
  Future<PaymentSheetOutcome> present({required String clientSecret, required String merchantName, required bool dark});
}

class StripePaymentSheetGateway implements PaymentSheetGateway {
  StripePaymentSheetGateway({required this.enabled, this.merchantCountry = 'AE'});
  final bool enabled;
  final String merchantCountry;

  @override
  bool get available => enabled;

  @override
  Future<PaymentSheetOutcome> present({required String clientSecret, required String merchantName, required bool dark}) async {
    if (!enabled) throw const AppException('STRIPE_DISABLED', 'Card payments are not configured.');
    try {
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: merchantName,
          style: dark ? ThemeMode.dark : ThemeMode.light,
          applePay: Stripe.merchantIdentifier == null ? null : PaymentSheetApplePay(merchantCountryCode: merchantCountry),
          googlePay: PaymentSheetGooglePay(merchantCountryCode: merchantCountry, currencyCode: 'AED'),
        ),
      );
      await Stripe.instance.presentPaymentSheet();
      return PaymentSheetOutcome.completed;
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) return PaymentSheetOutcome.cancelled;
      throw AppException('STRIPE', e.error.localizedMessage ?? e.error.message ?? 'Payment failed.');
    }
  }
}

final paymentSheetGatewayProvider = Provider<PaymentSheetGateway>(
  (ref) => StripePaymentSheetGateway(enabled: ref.watch(appConfigProvider).stripeEnabled),
);

// ───────────────────────── File picker port ─────────────────────────

abstract class ReceiptPicker {
  Future<PickedFile?> pick();
}

class PlatformReceiptPicker implements ReceiptPicker {
  @override
  Future<PickedFile?> pick() async {
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic']);
    if (files.isEmpty) return null;
    final f = files.first;
    final size = f.lengthSync() ?? await f.length() ?? 0;
    final path = f.path;
    return PickedFile(name: f.name, size: size, path: path, bytes: path == null ? await f.readAsBytes() : null);
  }
}

final receiptPickerProvider = Provider<ReceiptPicker>((ref) => PlatformReceiptPicker());
