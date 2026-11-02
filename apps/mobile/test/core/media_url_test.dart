import 'package:azza/core/config/app_config.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const config = AppConfig(apiBaseUrl: 'http://localhost:4000');

  test('API-relative media paths resolve against the API origin', () {
    expect(config.resolveMediaUrl('/media/courses/spoken-arabic-a1.jpg'), 'http://localhost:4000/media/courses/spoken-arabic-a1.jpg');
    expect(config.resolveMediaUrl('https://cdn.azza.academy/a.jpg'), 'https://cdn.azza.academy/a.jpg');
    expect(config.resolveMediaUrl(null), isNull);
    expect(config.resolveMediaUrl(''), isNull);
  });

  test('courses parse an optional photo cover', () {
    final withPhoto = Course.fromJson({'id': 'c1', 'slug': 's', 'titleEn': 'T', 'coverImageUrl': '/media/courses/s.jpg'});
    final typographic = Course.fromJson({'id': 'c2', 'slug': 's2', 'titleEn': 'T', 'coverImageUrl': null});
    expect(withPhoto.coverImageUrl, '/media/courses/s.jpg');
    expect(typographic.coverImageUrl, isNull);
  });
}
