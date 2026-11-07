import 'package:flutter/foundation.dart';

import '../utils/json.dart';
import 'enums.dart';

/// The short class (batch) summary the communications endpoints embed: `{ id, code, courseTitle, courseTitleAr }`.
@immutable
class ClassRef {
  const ClassRef({required this.id, required this.code, this.courseTitle = '', this.courseTitleAr});

  factory ClassRef.fromJson(Json j) => ClassRef(
        id: str(j, 'id'),
        code: str(j, 'code'),
        courseTitle: str(j, 'courseTitle'),
        courseTitleAr: strOrNull(j, 'courseTitleAr'),
      );

  static ClassRef? maybe(Json j, String key) {
    final o = objOrNull(j, key);
    return o == null ? null : ClassRef.fromJson(o);
  }

  final String id;
  final String code;
  final String courseTitle;
  final String? courseTitleAr;

  String title(AppLocale l) =>
      l == AppLocale.ar && courseTitleAr != null && courseTitleAr!.trim().isNotEmpty ? courseTitleAr! : (courseTitle.isEmpty ? code : courseTitle);
}

/// A person as the communications endpoints describe them: `{ id, name, image, role? }`.
@immutable
class Person {
  const Person({required this.id, required this.name, this.image, this.role});

  factory Person.fromJson(Json j) => Person(
        id: str(j, 'id'),
        name: str(j, 'name'),
        image: strOrNull(j, 'image'),
        role: j['role'] == null ? null : Role.parse(j['role']),
      );

  final String id;
  final String name;
  final String? image;
  final Role? role;
}
