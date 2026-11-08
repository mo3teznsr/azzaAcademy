import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../checkout/domain/checkout_models.dart' show BankAccount;

export '../../../core/domain/enums.dart' show SubscriptionPlan;

/// How the learner pays (`method` on `POST /courses/:id/subscribe`).
enum SubscribeMethod implements WireEnum {
  stripe('STRIPE'),
  appleIap('APPLE_IAP'),
  bankTransfer('BANK_TRANSFER');

  const SubscribeMethod(this.wire);
  @override
  final String wire;
}

enum SubscriptionProvider implements WireEnum {
  stripe('STRIPE'),
  apple('APPLE'),
  bankTransfer('BANK_TRANSFER');

  const SubscriptionProvider(this.wire);
  @override
  final String wire;
  static SubscriptionProvider parse(Object? raw) {
    for (final v in values) {
      if (v.wire == '$raw') return v;
    }
    return SubscriptionProvider.stripe;
  }
}

enum SubscriptionStatus implements WireEnum {
  incomplete('INCOMPLETE'),
  active('ACTIVE'),
  pastDue('PAST_DUE'),
  cancelling('CANCELLING'),
  expired('EXPIRED');

  const SubscriptionStatus(this.wire);
  @override
  final String wire;

  /// An unknown status is treated as still being set up: the screens wait instead of showing a failure.
  static SubscriptionStatus parse(Object? raw) {
    for (final v in values) {
      if (v.wire == '$raw') return v;
    }
    return SubscriptionStatus.incomplete;
  }

  /// The plan opens its lessons (ACTIVE, CANCELLING, or PAST_DUE during the provider's retry period).
  bool get opensLessons => this == active || this == cancelling || this == pastDue;
}

/// Whole months free on the yearly plan versus twelve monthly payments, rounded down.
/// Mirrors `yearlySavingMonths` in packages/shared/src/subscriptions.ts.
int yearlySavingMonths(int monthlyFils, int yearlyFils) {
  if (monthlyFils <= 0) return 0;
  final saved = (monthlyFils * 12 - yearlyFils) ~/ monthlyFils;
  return saved < 0 ? 0 : saved;
}

/// What `POST /courses/:id/subscribe` hands back; the shape depends on the method.
@immutable
sealed class SubscribeStart {
  const SubscribeStart();

  factory SubscribeStart.parse(SubscribeMethod method, Json j) => switch (method) {
        SubscribeMethod.stripe => StripeStart(checkoutUrl: str(j, 'checkoutUrl'), reference: str(j, 'reference')),
        SubscribeMethod.appleIap => AppleStart(productId: str(j, 'productId'), appAccountToken: str(j, 'appAccountToken'), reference: str(j, 'reference')),
        SubscribeMethod.bankTransfer => TransferStart(
            bankAccount: BankAccount.fromJson(obj(j, 'bankAccount')),
            reference: str(j, 'reference'),
            amountFils: integer(j, 'amountFils'),
            expiresAt: date(j, 'expiresAt'),
            paymentId: str(j, 'paymentId'),
          ),
      };
}

/// Card: Stripe Checkout's hosted page; [reference] is polled on return.
class StripeStart extends SubscribeStart {
  const StripeStart({required this.checkoutUrl, required this.reference});
  final String checkoutUrl;
  final String reference;
}

/// iOS: buy [productId] with `applicationUserName = appAccountToken`.
class AppleStart extends SubscribeStart {
  const AppleStart({required this.productId, required this.appAccountToken, required this.reference});
  final String productId;
  final String appAccountToken;
  final String reference;
}

/// Bank transfer: pay [amountFils] (VAT included) to [bankAccount] quoting [reference], then upload the receipt to [paymentId].
class TransferStart extends SubscribeStart {
  const TransferStart({required this.bankAccount, required this.reference, required this.amountFils, this.expiresAt, required this.paymentId});
  final BankAccount bankAccount;
  final String reference;
  final int amountFils;
  final DateTime? expiresAt;
  final String paymentId;
}

/// `GET /subscriptions/by-reference/:ref`.
@immutable
class SubscriptionLookup {
  const SubscriptionLookup({required this.status, this.courseSlug, this.nextLessonId});
  factory SubscriptionLookup.fromJson(Json j) => SubscriptionLookup(
        status: SubscriptionStatus.parse(j['status']),
        courseSlug: strOrNull(j, 'courseSlug'),
        nextLessonId: strOrNull(j, 'nextLessonId'),
      );
  final SubscriptionStatus status;
  final String? courseSlug;
  final String? nextLessonId;
}

enum PendingPaymentStatus implements WireEnum {
  awaitingReceipt('AWAITING_RECEIPT'),
  awaitingReview('AWAITING_REVIEW'),
  rejected('REJECTED');

  const PendingPaymentStatus(this.wire);
  @override
  final String wire;

  static PendingPaymentStatus parse(Object? raw) {
    for (final v in values) {
      if (v.wire == '$raw') return v;
    }
    return PendingPaymentStatus.awaitingReceipt;
  }
}

/// A transfer payment still being settled (`pendingPayment` on a `GET /me/subscriptions` row).
@immutable
class PendingPayment {
  const PendingPayment({
    required this.id,
    required this.reference,
    required this.amountFils,
    required this.status,
    this.expiresAt,
    this.reviewNote,
    this.bankAccount,
  });

  factory PendingPayment.fromJson(Json j) => PendingPayment(
        id: str(j, 'id'),
        reference: str(j, 'reference'),
        amountFils: integer(j, 'amountFils'),
        status: PendingPaymentStatus.parse(j['status']),
        expiresAt: date(j, 'expiresAt'),
        reviewNote: strOrNull(j, 'reviewNote'),
        bankAccount: objOrNull(j, 'bankAccount') == null ? null : BankAccount.fromJson(obj(j, 'bankAccount')),
      );

  final String id;
  final String reference;
  final int amountFils;
  final PendingPaymentStatus status;
  final DateTime? expiresAt;
  final String? reviewNote;

  /// The account to pay into; absent means the learner picks up the current default.
  final BankAccount? bankAccount;
}

/// One row of `GET /me/subscriptions`.
@immutable
class MySubscription {
  const MySubscription({
    required this.id,
    required this.courseId,
    this.courseSlug = '',
    this.courseTitleEn = '',
    this.courseTitleAr,
    this.coverImageUrl,
    required this.plan,
    required this.provider,
    required this.status,
    this.currentPeriodEnd,
    this.cancelAtPeriodEnd = false,
    this.priceFils,
    this.hasAccess = false,
    this.pendingPayment,
  });

  factory MySubscription.fromJson(Json j) {
    final c = obj(j, 'course');
    return MySubscription(
      id: str(j, 'id'),
      courseId: str(c, 'id', str(j, 'courseId')),
      courseSlug: str(c, 'slug'),
      courseTitleEn: str(c, 'titleEn'),
      courseTitleAr: strOrNull(c, 'titleAr'),
      coverImageUrl: strOrNull(c, 'coverImageUrl'),
      plan: SubscriptionPlan.parse(j['plan']),
      provider: SubscriptionProvider.parse(j['provider']),
      status: SubscriptionStatus.parse(j['status']),
      currentPeriodEnd: date(j, 'currentPeriodEnd'),
      cancelAtPeriodEnd: boolean(j, 'cancelAtPeriodEnd'),
      priceFils: intOrNull(j, 'priceFils'),
      hasAccess: boolean(j, 'hasAccess'),
      pendingPayment: objOrNull(j, 'pendingPayment') == null ? null : PendingPayment.fromJson(obj(j, 'pendingPayment')),
    );
  }

  final String id;
  final String courseId;
  final String courseSlug;
  final String courseTitleEn;
  final String? courseTitleAr;
  final String? coverImageUrl;
  final SubscriptionPlan plan;
  final SubscriptionProvider provider;
  final SubscriptionStatus status;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final int? priceFils;
  final bool hasAccess;
  final PendingPayment? pendingPayment;

  /// Ending on [currentPeriodEnd]: cancelled, or a prepaid transfer that doesn't renew.
  bool get ends => status == SubscriptionStatus.cancelling || cancelAtPeriodEnd || provider == SubscriptionProvider.bankTransfer;
}
