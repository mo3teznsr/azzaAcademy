import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';

@immutable
class CheckoutRequest {
  const CheckoutRequest({
    required this.batchId,
    required this.method,
    this.couponCode,
    this.displayCurrency = DisplayCurrency.aed,
    this.bankAccountId,
  });

  final String batchId;
  final PaymentMethod method;
  final String? couponCode;
  final DisplayCurrency displayCurrency;
  final String? bankAccountId;

  Map<String, dynamic> toJson() => {
        'batchId': batchId,
        'method': method.wire,
        if (couponCode != null && couponCode!.isNotEmpty) 'couponCode': couponCode,
        'displayCurrency': displayCurrency.wire,
        'bankAccountId': ?bankAccountId,
      };
}

@immutable
class Quote {
  const Quote({
    required this.subtotalFils,
    this.discountFils = 0,
    this.vatFils = 0,
    required this.totalFils,
    this.displayCurrency = DisplayCurrency.aed,
    this.displayAmount,
    this.rate = 1,
  });

  factory Quote.fromJson(Json j) {
    final d = obj(j, 'display');
    return Quote(
      subtotalFils: integer(j, 'subtotalFils'),
      discountFils: integer(j, 'discountFils'),
      vatFils: integer(j, 'vatFils'),
      totalFils: integer(j, 'totalFils'),
      displayCurrency: DisplayCurrency.parse(d['currency']),
      displayAmount: d['amount'] == null ? null : dbl(d, 'amount'),
      rate: dbl(d, 'rate', 1),
    );
  }

  final int subtotalFils;
  final int discountFils;
  final int vatFils;
  final int totalFils;
  final DisplayCurrency displayCurrency;
  final double? displayAmount;
  final double rate;
}

@immutable
class BankAccount {
  const BankAccount({
    required this.id,
    required this.bankName,
    required this.accountName,
    required this.iban,
    required this.swift,
    this.branch,
    this.instructions,
  });

  factory BankAccount.fromJson(Json j) => BankAccount(
        id: str(j, 'id'),
        bankName: str(j, 'bankName'),
        accountName: str(j, 'accountName'),
        iban: str(j, 'iban'),
        swift: str(j, 'swift'),
        branch: strOrNull(j, 'branch'),
        instructions: strOrNull(j, 'instructions'),
      );

  final String id;
  final String bankName;
  final String accountName;
  final String iban;
  final String swift;
  final String? branch;
  final String? instructions;

  /// `AE•• •••• 3307` — last 4 only.
  String get maskedIban {
    final digits = iban.replaceAll(RegExp(r'[^0-9A-Za-z•*]'), '');
    final last4 = digits.length >= 4 ? digits.substring(digits.length - 4) : digits;
    return 'AE•• •••• •••• $last4';
  }

  bool get ibanIsMasked => iban.contains('•') || iban.contains('*');
}

@immutable
class Order {
  const Order({
    required this.id,
    required this.reference,
    required this.status,
    required this.method,
    required this.totalFils,
    this.subtotalFils = 0,
    this.discountFils = 0,
    this.vatFils = 0,
    this.receivedFils,
    this.displayCurrency = DisplayCurrency.aed,
    this.fxRate = 1,
    this.expiresAt,
    this.receiptUrl,
    this.receiptUploadedAt,
    this.rejectionReason,
    this.paidAt,
    this.createdAt,
    this.batch,
    this.bankAccount,
    this.student,
    this.appleProductId,
    this.appleAppAccountToken,
  });

  factory Order.fromJson(Json j) {
    final enrollment = obj(j, 'enrollment');
    final batchJson = objOrNull(j, 'batch') ?? objOrNull(enrollment, 'batch');
    final userJson = objOrNull(j, 'user') ?? objOrNull(enrollment, 'user');
    return Order(
      id: str(j, 'id'),
      reference: str(j, 'reference'),
      status: OrderStatus.parse(j['status']),
      method: PaymentMethod.parse(j['method']),
      totalFils: integer(j, 'totalFils'),
      subtotalFils: integer(j, 'subtotalFils'),
      discountFils: integer(j, 'discountFils'),
      vatFils: integer(j, 'vatFils'),
      receivedFils: intOrNull(j, 'receivedFils'),
      displayCurrency: DisplayCurrency.parse(j['displayCurrency']),
      fxRate: dbl(j, 'fxRate', 1),
      expiresAt: date(j, 'expiresAt'),
      receiptUrl: strOrNull(j, 'receiptUrl'),
      receiptUploadedAt: date(j, 'receiptUploadedAt'),
      rejectionReason: strOrNull(j, 'rejectionReason'),
      paidAt: date(j, 'paidAt'),
      createdAt: date(j, 'createdAt'),
      batch: batchJson == null ? null : Batch.fromJson(batchJson),
      bankAccount: objOrNull(j, 'bankAccount') == null ? null : BankAccount.fromJson(obj(j, 'bankAccount')),
      student: userJson == null ? null : PersonRef.fromJson(userJson),
      appleProductId: strOrNull(j, 'appleProductId'),
      appleAppAccountToken: strOrNull(j, 'appleAppAccountToken'),
    );
  }

  final String id;
  final String reference;
  final OrderStatus status;
  final PaymentMethod method;
  final int totalFils;
  final int subtotalFils;
  final int discountFils;
  final int vatFils;
  final int? receivedFils;
  final DisplayCurrency displayCurrency;
  final double fxRate;
  final DateTime? expiresAt;
  final String? receiptUrl;
  final DateTime? receiptUploadedAt;
  final String? rejectionReason;
  final DateTime? paidAt;
  final DateTime? createdAt;
  final Batch? batch;
  final BankAccount? bankAccount;
  final PersonRef? student;

  /// APPLE_IAP orders: the consumable product to buy and the appAccountToken that ties the purchase to this order.
  final String? appleProductId;
  final String? appleAppAccountToken;

  /// An App Store order the student can still pay (a cancelled sheet leaves it AWAITING_PAYMENT).
  bool get awaitsAppStorePurchase =>
      method == PaymentMethod.appleIap &&
      appleProductId != null &&
      (status == OrderStatus.awaitingPayment || status == OrderStatus.failed);

  bool get needsReceipt =>
      method == PaymentMethod.bankTransfer &&
      (status == OrderStatus.awaitingReceipt ||
          status == OrderStatus.awaitingPayment ||
          status == OrderStatus.rejected ||
          status == OrderStatus.amountMismatch);
}

@immutable
class CheckoutResult {
  const CheckoutResult({
    required this.order,
    this.waitlisted = false,
    this.clientSecret,
    this.bankAccount,
    this.reference,
    this.expiresAt,
    this.appleProductId,
    this.appAccountToken,
  });

  /// 201 `{ waitlisted: false, order, enrollment, quote, clientSecret | bankAccount+reference+expiresAt | appleProductId+appAccountToken }`
  /// or 202 `{ waitlisted: true, enrollment }` (no order).
  factory CheckoutResult.fromJson(Json j) => CheckoutResult(
        waitlisted: boolean(j, 'waitlisted'),
        order: Order.fromJson(obj(j, 'order')),
        clientSecret: strOrNull(j, 'clientSecret'),
        bankAccount: objOrNull(j, 'bankAccount') == null ? null : BankAccount.fromJson(obj(j, 'bankAccount')),
        reference: strOrNull(j, 'reference'),
        expiresAt: date(j, 'expiresAt'),
        appleProductId: strOrNull(j, 'appleProductId'),
        appAccountToken: strOrNull(j, 'appAccountToken'),
      );

  final Order order;
  final bool waitlisted;
  final String? clientSecret;
  final BankAccount? bankAccount;
  final String? reference;
  final DateTime? expiresAt;
  final String? appleProductId;
  final String? appAccountToken;
}

/// A file chosen by the user (receipt).
@immutable
class PickedFile {
  const PickedFile({required this.name, required this.size, this.path, this.bytes});
  final String name;
  final int size;
  final String? path;
  final List<int>? bytes;

  static const maxBytes = 10 * 1024 * 1024;
  bool get tooLarge => size > maxBytes;
}
