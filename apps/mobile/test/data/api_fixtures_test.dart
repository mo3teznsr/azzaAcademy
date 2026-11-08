// Repository-level contract tests: every Dio*Repository is run against JSON captured
// from the live API (seed data, `test/fixtures/*.json`). If the API changes a shape,
// these fail before a screen silently renders zeros.
//
// Re-capture: sign in with `POST /api/auth/sign-in/email` (sara / lina / admin @azza.test)
// and save the bearer-authenticated responses under the names used below.
import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/live/data/session_repository.dart';
import 'package:azza/features/live/domain/live_models.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/teacher/data/teacher_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fixture_dio.dart';

const b07 = 'cmvz28lxn001a8vv1yak5nlw5';
const b08 = 'cmvz28lyo001o8vv1zjrdlig9';
const s04 = 'cmvz28lxs001f8vv1vgglmsof';
const s05 = 'cmvz28lxs001g8vv1nps51dgi';
const saraOrder = 'cmvz6o59v0004cvv19xsrl878';
const nadiaOrder = 'cmvz28m1k004p8vv1pgbo6ypt';
const run = 'cmvz6od800005cvv15j7hdkn9';

void main() {
  group('auth + me', () {
    test('sign-in user and /me profile', () async {
      final user = AppUser.fromJson((fixture('signin_user') as Map).cast());
      expect(user.role, Role.student);
      expect(user.firstName, 'Sara');

      final me = await DioMeRepository(fixtureDio({'GET /api/v1/me': 'me'})).me();
      expect(me.email, 'sara@azza.test');
      expect(me.displayCurrency, DisplayCurrency.aed);
    });

    test('enrollments: progress + nextSession (batch has no sessions[])', () async {
      final list = await DioMeRepository(fixtureDio({'GET /api/v1/me/enrollments': 'enrollments'})).enrollments();
      final e = list.single;
      expect(e.isActive, isTrue);
      expect(e.batch.code, 'B07');
      expect(e.batch.course?.titleEn, 'Product Design Foundations');
      expect(e.batch.teacher?.name, 'Lina Haddad');
      expect(e.batch.schedule.weekdays, [2, 4]);
      expect(e.done(DateTime(2026)), 4);
      expect(e.total, 12);
      expect(e.sessionsAttended, 4);
      expect(e.latestOrderStatus, OrderStatus.paid);
      final next = e.batch.nextSession(DateTime.utc(2026, 11, 2));
      expect(next?.number, 5);
      expect(next?.title, 'Information architecture');
    });

    test('schedule envelope { from, to, items } with batch.course', () async {
      final repo = DioMeRepository(fixtureDio({'GET /api/v1/me/schedule': 'schedule_student'}));
      final items = await repo.schedule(from: DateTime(2026, 11, 2), to: DateTime(2026, 12, 2));
      expect(items, hasLength(7));
      expect(items.first.batchCode, 'B07');
      expect(items.first.courseTitle, 'Product Design Foundations');
      expect(items.first.courseTitleAr, isNotNull);
      expect(items.first.status, SessionStatus.ended);
      expect(items.where((s) => s.status == SessionStatus.scheduled).first.number, 5);
    });

    test('notifications page', () async {
      final list = await DioMeRepository(fixtureDio({'GET /api/v1/me/notifications': 'notifications'})).notifications();
      expect(list, hasLength(6));
      expect(list.where((n) => !n.read), hasLength(5));
      expect(list.every((n) => n.title.isNotEmpty), isTrue);
    });
  });

  group('catalog', () {
    test('courses list + detail with modules', () async {
      final repo = DioCatalogRepository(fixtureDio({
        'GET /api/v1/courses': 'courses',
        'GET /api/v1/courses/product-design-foundations': 'course_detail',
      }));
      final courses = await repo.courses();
      expect(courses, hasLength(4));
      expect(courses.every((c) => (c.priceFils ?? 0) > 0), isTrue);
      final c = await repo.course('product-design-foundations');
      expect(c.modules, hasLength(12));
      expect(c.level, CourseLevel.beginner);
    });

    test('batches list (_count) + batch detail (sessions, seatsTaken)', () async {
      final repo = DioCatalogRepository(fixtureDio({
        'GET /api/v1/batches': 'batches_public',
        'GET /api/v1/batches/$b08': 'batch_detail',
      }));
      final list = await repo.batches();
      final b07Batch = list.firstWhere((b) => b.code == 'B07');
      expect(b07Batch.seatsTaken, 23);
      expect(b07Batch.sessionCount, 12);
      expect(b07Batch.effectivePriceFils, 88000);
      expect(b07Batch.language, SessionLanguage.ar);

      final b = await repo.batch(b08);
      expect(b.sessions, hasLength(12));
      expect(b.seatsTaken, 3);
      expect(b.seatsLeft, 21);
      expect(b.status, BatchStatus.enrolling);
      expect(b.sessions.first.batchCode, 'B08');
    });
  });

  group('checkout', () {
    test('fx, quote in SAR, bank list stays masked', () async {
      final repo = DioCheckoutRepository(fixtureDio({
        'GET /api/v1/currencies': 'currencies',
        'POST /api/v1/checkout/quote': 'quote',
        'GET /api/v1/bank-accounts': 'bank_accounts',
      }));
      final fx = await repo.fxRates();
      expect(fx.rateFor(DisplayCurrency('SAR')), closeTo(1.0211, 1e-9));
      final q = await repo.quote(const CheckoutRequest(batchId: b08, method: PaymentMethod.bankTransfer, displayCurrency: DisplayCurrency('SAR')));
      expect(q.totalFils, 92400);
      expect(q.vatFils, 4400);
      expect(q.displayCurrency, DisplayCurrency('SAR'));
      expect(q.displayAmount, 943);
      final banks = await repo.bankAccounts();
      expect(banks, hasLength(3));
      expect(banks.every((b) => b.ibanIsMasked), isTrue);
    });

    test('bank-transfer checkout → full IBAN of the chosen account on the order', () async {
      final repo = DioCheckoutRepository(fixtureDio({
        'POST /api/v1/checkout': ('checkout_bank', 201),
        'GET /api/v1/orders/$saraOrder': 'order_student',
      }));
      final r = await repo.checkout(const CheckoutRequest(batchId: b08, method: PaymentMethod.bankTransfer));
      expect(r.waitlisted, isFalse);
      expect(r.order.id, saraOrder);
      expect(r.order.status, OrderStatus.awaitingReceipt);
      expect(r.reference, startsWith('AZ-B08-'));
      expect(r.bankAccount?.ibanIsMasked, isFalse);

      final o = await repo.order(saraOrder);
      expect(o.needsReceipt, isTrue);
      expect(o.bankAccount?.iban, 'AE070331234567890123456');
      expect(o.bankAccount?.ibanIsMasked, isFalse);
      expect(o.batch?.code, 'B08');
      expect(o.batch?.course?.titleEn, 'Product Design Foundations');
      expect(o.expiresAt, isNotNull);
    });

    test('409 ORDER_IN_PROGRESS keeps details.orderId', () async {
      final repo = DioCheckoutRepository(fixtureDio({'POST /api/v1/checkout': ('checkout_in_progress', 409)}));
      try {
        await repo.checkout(const CheckoutRequest(batchId: b08, method: PaymentMethod.bankTransfer));
        fail('expected 409');
      } on AppException catch (e) {
        expect(e.statusCode, 409);
        expect((e.details as Map)['code'], 'ORDER_IN_PROGRESS');
        expect((e.details as Map)['orderId'], saraOrder);
      }
    });

    test('my orders: enrollment.batch.course', () async {
      final list = await DioCheckoutRepository(fixtureDio({'GET /api/v1/me/orders': 'my_orders'})).myOrders();
      expect(list.single.reference, 'AZ-B07-30101');
      expect(list.single.status, OrderStatus.paid);
      expect(list.single.batch?.code, 'B07');
    });

    test('receipt goes to the multipart endpoint', () async {
      final dio = fixtureDio({'POST /api/v1/orders/$saraOrder/receipt/file': 'order_student'});
      final o = await DioCheckoutRepository(dio).submitReceipt(saraOrder, const PickedFile(name: 'r.png', size: 3, bytes: [1, 2, 3]));
      expect(o.id, saraOrder);
      final req = (dio.httpClientAdapter as FixtureAdapter).requests.single;
      expect(req.path, '/api/v1/orders/$saraOrder/receipt/file');
    });
  });

  group('learn', () {
    test('recordings (session rows), materials, assignments with mySubmission', () async {
      final repo = DioLearnRepository(fixtureDio({
        'GET /api/v1/me/recordings': 'recordings',
        'GET /api/v1/batches/$b07/materials': 'materials',
        'GET /api/v1/batches/$b07/assignments': 'assignments_student',
      }));
      final recs = await repo.recordings();
      expect(recs, hasLength(4));
      expect(recs.first.sessionId, s04);
      expect(recs.first.url, startsWith('https://'));
      expect(recs.first.batchCode, 'B07');
      expect(recs.first.courseTitle, 'Product Design Foundations');

      final mats = await repo.materials(b07);
      expect(mats, hasLength(4));
      expect(mats.first.kind, 'SLIDES');

      final a = (await repo.assignments(b07)).single;
      expect(a.state, AssignmentState.submitted);
      expect(a.sessionNumber, 4);
      expect(a.submissionCount, 1);
    });
  });

  group('live', () {
    test('session detail (student + host)', () async {
      final repo = DioSessionRepository(fixtureDio({'GET /api/v1/sessions/$s05': 'session_detail_student'}));
      final d = await repo.session(s05);
      expect(d.session.number, 5);
      expect(d.slate, 'B07 · S05');
      expect(d.batch?.course?.titleEn, 'Product Design Foundations');
      expect(d.hostId, isNotNull);
    });

    test('attendance: firstJoinedAt / lastLeftAt / attended / saved mark', () async {
      final repo = DioSessionRepository(fixtureDio({'GET /api/v1/sessions/$s04/attendance': 'attendance'}));
      final rows = await repo.attendance(s04, sessionLength: const Duration(minutes: 90), startsAt: DateTime.utc(2026, 11, 19, 15));
      expect(rows, hasLength(23));
      expect(rows.where((r) => r.mark == AttendanceMark.absent), hasLength(2));
      final adam = rows.first;
      expect(adam.name, 'Adam Rahman');
      expect(adam.joinedAt, isNotNull);
      expect(adam.mark, AttendanceMark.present);
      expect(adam.corrected, isFalse);

      final patched = await DioSessionRepository(fixtureDio({'GET /api/v1/sessions/$s04/attendance': 'attendance_patched'}))
          .attendance(s04, sessionLength: const Duration(minutes: 90), startsAt: DateTime.utc(2026, 11, 19, 15));
      expect(patched.first.mark, AttendanceMark.late);
      expect(patched.first.corrected, isTrue);
    });

    test('save attendance sends { items: [{ userId, mark }] }', () async {
      final dio = fixtureDio({'PATCH /api/v1/sessions/$s04/attendance': 'attendance_patched'});
      await DioSessionRepository(dio).saveAttendance(s04, {'u1': AttendanceMark.leftEarly});
      final req = (dio.httpClientAdapter as FixtureAdapter).requests.single;
      expect(req.data, {
        'items': [
          {'userId': 'u1', 'mark': 'LEFT_EARLY'},
        ],
      });
    });

    test('chat history with user.role', () async {
      final msgs = await DioSessionRepository(fixtureDio({'GET /api/v1/sessions/$s04/messages': 'messages'})).messages(s04);
      expect(msgs, hasLength(3));
      expect(msgs.first.fromHost, isTrue);
      expect(msgs.first.userName, 'Lina Haddad');
    });

    test('dev-mode join token is not treated as a LiveKit connection', () {
      const grant = JoinGrant(serverUrl: '', token: 'dev-token:b07-s05:sara', roomName: 'b07-s05', role: LiveRole.student);
      expect(grant.devMode, isTrue);
      expect(grant.videoAvailable, isFalse);
    });

    test('LOBBY_NOT_OPEN error keeps opensAt', () async {
      final repo = DioSessionRepository(fixtureDio({'POST /api/v1/sessions/$s05/join': ('join_student', 422)}));
      try {
        await repo.join(s05);
        fail('expected 422');
      } on AppException catch (e) {
        expect(e.code, 'LOBBY_NOT_OPEN');
        expect((e.details as Map)['opensAt'], isNotNull);
      }
    });
  });

  group('teacher', () {
    test('roster items (user + attendancePercent)', () async {
      final list = await DioTeacherRepository(fixtureDio({'GET /api/v1/batches/$b07/roster': 'roster'})).roster(b07);
      expect(list, hasLength(23));
      expect(list.first.name, 'Adam Rahman');
      expect(list.first.attendancePct, 100);
      expect(list.first.sessionsAttended, 4);
      expect(list.every((s) => !s.waitlisted && s.id.isNotEmpty), isTrue);
    });

    test('earnings: summary, nextPayout object, batches with course', () async {
      final e = await DioTeacherRepository(fixtureDio({'GET /api/v1/teacher/earnings': 'earnings'})).earnings();
      expect(e.earnedThisMonthFils, 394236);
      expect(e.pendingFils, 394236);
      expect(e.nextPayout, DateTime(2026, 12, 5));
      expect(e.nextPayoutEstimateFils, 197118);
      final b = e.batches.firstWhere((b) => b.code == 'B07');
      expect(b.courseTitle, 'Product Design Foundations');
      expect(b.amountFils, 394236);
      expect(b.sessionsDelivered, 4);
      expect(e.ledger, hasLength(4));
      expect(e.ledger.first.status, EarningStatus.pending);
    });

    test('bank details wrapper + own reschedule requests', () async {
      final repo = DioTeacherRepository(fixtureDio({
        'GET /api/v1/teacher/bank-details': 'bank_details',
        'GET /api/v1/reschedule-requests': 'reschedule_requests_teacher',
      }));
      final d = await repo.bankDetails();
      expect(d?.verified, isTrue);
      expect(d?.maskedIban, endsWith('5501'));
      final reqs = await repo.rescheduleRequests();
      expect(reqs.map((r) => r.status), ['PENDING', 'DECLINED']);
      expect(reqs.first.session.batchCode, 'B07');
    });

    test('teacher schedule', () async {
      final items = await DioMeRepository(fixtureDio({'GET /api/v1/me/schedule': 'schedule_teacher'}))
          .schedule(from: DateTime(2026, 11, 2), to: DateTime(2026, 12, 2));
      expect(items, hasLength(13));
    });
  });

  group('admin', () {
    test('dashboard: counts, seats.filledPercent, revenueMonth, alert counts', () async {
      final d = await DioAdminRepository(fixtureDio({'GET /api/v1/admin/dashboard': 'dashboard'})).dashboard();
      expect(d.activeBatches, 6);
      expect(d.seatsFilledPct, 42);
      expect(d.sessionsToday, 0);
      expect(d.alerts.map((a) => a.type), ['TRANSFERS_TO_VERIFY', 'TEACHER_BANK_UNVERIFIED']);
      expect(d.alerts.first.count, 1);
      expect(d.alerts.first.isTransfer, isTrue);
      expect(d.alerts.first.urgent, isTrue);
    });

    test('transfer queue + order detail with full IBAN', () async {
      final repo = DioAdminRepository(fixtureDio({'GET /api/v1/admin/transfers': 'transfers'}));
      final o = (await repo.transfers()).single;
      expect(o.reference, 'AZ-B07-48213');
      expect(o.status, OrderStatus.verifying);
      expect(o.student?.name, 'Nadia Shams');
      expect(o.batch?.code, 'B07');
      expect(o.receiptUrl, isNotNull);

      final detail = await DioCheckoutRepository(fixtureDio({'GET /api/v1/orders/$nadiaOrder': 'order_admin'})).order(nadiaOrder);
      expect(detail.bankAccount?.bankName, 'Emirates NBD');
      expect(detail.bankAccount?.ibanIsMasked, isFalse);
    });

    test('payout runs list (totalFils) + detail (totals)', () async {
      final repo = DioAdminRepository(fixtureDio({
        'GET /api/v1/admin/payout-runs': 'payout_runs',
        'GET /api/v1/admin/payout-runs/$run': 'payout_run_detail',
      }));
      final runs = await repo.payoutRuns();
      expect(runs.single.status, PayoutRunStatus.draft);
      expect(runs.single.totalFils, 0);
      final r = await repo.payoutRun(run);
      expect(r.periodStart.toUtc(), DateTime.utc(2026, 10));
      expect(r.grandTotalFils, 0);
    });

    test('reschedule requests: proposed vs current time, approve/decline routes', () async {
      final dio = fixtureDio({
        'GET /api/v1/reschedule-requests': 'reschedule_requests_admin',
        'POST /api/v1/reschedule-requests/cmvz6gq9w0002cvv1zqggq7r0/approve': 'reschedule_202',
        'POST /api/v1/reschedule-requests/cmvz6gq9w0002cvv1zqggq7r0/decline': 'reschedule_202',
      });
      final repo = DioAdminRepository(dio);
      final r = (await repo.rescheduleRequests()).single;
      expect(r.pending, isTrue);
      expect(r.requestedByName, 'Lina Haddad');
      expect(r.reason, 'Conference travel');
      expect(r.session.number, 5);
      expect(r.session.batchCode, 'B07');
      expect(r.startsAt.toUtc(), DateTime.utc(2026, 11, 25, 15));
      expect(r.session.startsAt.toUtc(), DateTime.utc(2026, 11, 24, 15));
      await repo.approveReschedule(r.id);
      await repo.declineReschedule(r.id, reason: 'No room');
      final reqs = (dio.httpClientAdapter as FixtureAdapter).requests;
      expect(reqs.first.queryParameters, {'status': 'PENDING'});
      expect(reqs.last.data, {'reason': 'No room'});
    });
  });
}
