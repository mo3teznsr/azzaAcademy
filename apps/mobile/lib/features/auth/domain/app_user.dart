import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

@immutable
class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.locale = AppLocale.en,
    this.timezone = 'Asia/Dubai',
    this.displayCurrency = DisplayCurrency.aed,
    this.phone,
    this.image,
    this.emailVerified = true,
  });

  factory AppUser.fromJson(Json j) => AppUser(
        id: str(j, 'id'),
        name: str(j, 'name'),
        email: str(j, 'email'),
        role: Role.parse(j['role']),
        locale: AppLocale.parse(j['locale']),
        timezone: str(j, 'timezone', 'Asia/Dubai'),
        displayCurrency: DisplayCurrency.parse(j['displayCurrency']),
        phone: strOrNull(j, 'phone'),
        image: strOrNull(j, 'image'),
        emailVerified: boolean(j, 'emailVerified', true),
      );

  final String id;
  final String name;
  final String email;
  final Role role;
  final AppLocale locale;
  final String timezone;
  final DisplayCurrency displayCurrency;
  final String? phone;
  final String? image;
  final bool emailVerified;

  String get firstName => name.trim().split(RegExp(r'\s+')).first;

  AppUser copyWith({String? name, AppLocale? locale, String? timezone, DisplayCurrency? displayCurrency}) => AppUser(
        id: id,
        name: name ?? this.name,
        email: email,
        role: role,
        locale: locale ?? this.locale,
        timezone: timezone ?? this.timezone,
        displayCurrency: displayCurrency ?? this.displayCurrency,
        phone: phone,
        image: image,
        emailVerified: emailVerified,
      );
}
