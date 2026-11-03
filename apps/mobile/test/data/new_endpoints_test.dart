// Parsing + repository contract for the certificate, waitlist and teacher endpoints.
// Fixtures follow the shapes documented in docs/API.md (Me · Certificates · Teachers);
// re-capture from the live API like the others once the seed issues certificates.
import 'package:azza/core/config/app_config.dart';
import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/utils/formatters.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/teachers/data/teachers_repository.dart';
import 'package:azza/features/teachers/domain/teacher_models.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/features/waitlist/domain/waitlist_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fixture_dio.dart';

void main() {
  group('certificates', () {
    test('GET /me/certificates → earned (newest first) + in progress', () async {
      final o = await DioCertificatesRepository(fixtureDio({'GET /api/v1/me/certificates': 'my_certificates'})).mine();
      expect(o.items, hasLength(2));
      final c = o.items.first;
      expect(c.code, 'AZ-CERT-7Q4K');
      expect(c.batchCode, 'B05');
      expect(c.attended, 11);
      expect(c.total, 12);
      expect(c.teacherName, 'Lina Haddad');
      expect(c.course.coverImageUrl, '/media/courses/product-design-foundations.jpg');
      expect(c.courseName(AppLocale.ar), 'أساسيات تصميم المنتجات');
      expect(c.courseName(AppLocale.en), 'Product Design Foundations');
      expect(c.issuedAt!.isAfter(o.items.last.issuedAt!), isTrue);
      expect(c.holderName, isNull);

      // No titleAr → English title in Arabic too.
      expect(o.items.last.courseName(AppLocale.ar), 'Spoken Arabic A1');

      final pr = o.inProgress.first;
      expect(pr.batchCode, 'B07');
      expect(pr.required, 10);
      expect(pr.needed, 6);
      expect(pr.fraction, closeTo(0.4, 1e-9));
      expect(pr.reachable, isTrue);
      expect(o.inProgress.last.reachable, isFalse);
    });

    test('public verify adds holderName; code is URL-encoded', () async {
      final dio = fixtureDio({'GET /api/v1/certificates/AZ-CERT-7Q4K': 'certificate_verify'});
      final c = await DioCertificatesRepository(dio).verify('AZ-CERT-7Q4K');
      expect(c.holderName, 'Sara Kamal');
      expect(c.code, 'AZ-CERT-7Q4K');
    });

    test('tolerates a sparse payload', () {
      final c = Certificate.fromJson({'code': 'AZ-CERT-0000', 'courseTitle': 'Flat title'});
      expect(c.courseName(AppLocale.en), 'Flat title');
      expect(c.attended, 0);
      expect(c.issuedAt, isNull);
      expect(const CertificateProgress(batchId: 'b', batchCode: 'B', course: Course(id: '', slug: '', titleEn: '')).fraction, 0);
      expect(CertificatesOverview.fromJson(const {}).isEmpty, isTrue);
    });

    test('verify link uses the web origin', () {
      expect(const AppConfig(apiBaseUrl: 'http://localhost:4000').certificateVerifyUrl('AZ-CERT-7Q4K'),
          'http://localhost:3005/verify/AZ-CERT-7Q4K');
      expect(const AppConfig(apiBaseUrl: 'x', webBaseUrl: 'https://azza.academy/').certificateVerifyUrl('AZ-CERT-7Q4K'),
          'https://azza.academy/verify/AZ-CERT-7Q4K');
    });

    test('seen certificates: new until opened', () async {
      SharedPreferences.setMockInitialValues({});
      final seen = SeenCertificates(await SharedPreferences.getInstance());
      expect(seen.isNew('AZ-CERT-7Q4K'), isTrue);
      await seen.markSeen('AZ-CERT-7Q4K');
      expect(seen.isNew('AZ-CERT-7Q4K'), isFalse);
      expect(seen.isNew('AZ-CERT-M2XR'), isTrue);
    });
  });

  group('waitlist', () {
    test('GET /me/waitlist → waiting + promoted', () async {
      final w = await DioWaitlistRepository(fixtureDio({'GET /api/v1/me/waitlist': 'my_waitlist'})).mine();
      expect(w.items, hasLength(2));
      final e = w.items.first;
      expect(e.batchId, 'b_b08');
      expect(e.batchStatus, BatchStatus.full);
      expect(e.position, 3);
      expect(e.total, 7);
      expect(e.ahead, 2);
      expect(e.isNext, isFalse);
      expect(w.items.last.isNext, isTrue);
      expect(e.courseName(AppLocale.ar), 'أساسيات تصميم المنتجات');

      final s = w.promoted.single;
      expect(s.batchCode, 'C02');
      expect(s.remaining(DateTime.utc(2026, 11, 3, 18)), const Duration(hours: 12));
      expect(s.expired(DateTime.utc(2026, 11, 3, 18)), isFalse);
      expect(s.remaining(DateTime.utc(2026, 11, 5)), Duration.zero);
      expect(s.expired(DateTime.utc(2026, 11, 5)), isTrue);

      final after = w.without('b_b08');
      expect(after.items.map((e) => e.batchId), ['b_d02']);
      expect(after.promoted, hasLength(1));
    });

    test('leave → DELETE /batches/:id/waitlist', () async {
      final dio = fixtureDio({'DELETE /api/v1/batches/b_b08/waitlist': 'my_waitlist'});
      await DioWaitlistRepository(dio).leave('b_b08');
      final adapter = dio.httpClientAdapter as FixtureAdapter;
      expect(adapter.requests.single.method, 'DELETE');
      expect(adapter.requests.single.path, '/api/v1/batches/b_b08/waitlist');
    });

    test('promoted seat without a deadline has no countdown', () {
      final s = PromotedSeat.fromJson(const {'batchId': 'b', 'batchCode': 'B'});
      expect(s.remaining(DateTime.now()), isNull);
      expect(s.expired(DateTime.now()), isFalse);
    });

    test('queue ordinals', () {
      expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(Fmt.ordinalEn),
          ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
      expect(const Fmt().ordinal(3), '3rd');
      expect(const Fmt(locale: AppLocale.ar, arabicDigits: true).ordinal(3), '٣');
    });
  });

  group('teachers', () {
    test('GET /teachers/:id → profile with courses and upcoming batches', () async {
      final t = await DioTeachersRepository(fixtureDio({'GET /api/v1/teachers/u_lina': 'teacher_profile'})).teacher('u_lina');
      expect(t.name, 'Lina Haddad');
      expect(t.image, '/media/teachers/lina.jpg');
      expect(t.headline, startsWith('Product designer'));
      expect(t.bio, isNotNull);
      expect(t.languages, [SessionLanguage.en, SessionLanguage.ar]);
      expect(t.courses.single.slug, 'product-design-foundations');
      expect(t.courses.single.category, 'Design');

      // Sorted by start date.
      expect(t.upcomingBatches.map((b) => b.code), ['B08', 'B09']);
      final full = t.upcomingBatches.first;
      expect(full.isFull, isTrue);
      expect(full.priceFils, 92000);
      final open = t.upcomingBatches.last;
      expect(open.isFull, isFalse);
      expect(open.seatsLeft, 9);
      expect(open.language, SessionLanguage.ar);
      expect(open.scheduleSummary, 'Tue & Thu · 19:00 · 12 sessions');
      expect(open.course(AppLocale.ar), 'أساسيات تصميم المنتجات');
    });

    test('missing optional fields stay null / empty', () {
      final t = TeacherProfile.fromJson(const {'id': 'u', 'name': 'N', 'headline': null, 'bio': ''});
      expect(t.headline, isNull);
      expect(t.bio, isNull);
      expect(t.languages, isEmpty);
      expect(t.upcomingBatches, isEmpty);
      expect(const TeacherBatch(id: 'b', code: 'B', courseId: 'c').isFull, isTrue);
    });
  });
}
