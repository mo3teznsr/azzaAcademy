import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../l10n/l10n.dart';
import '../phone/countries.dart';
import '../theme/tokens.dart';
import '../utils/digits.dart';
import 'fields.dart';

/// State behind a [PhoneField]: the chosen country and the national number the user typed.
/// [e164] is what gets sent (`+971501234567`); it validates with the mirror in `core/phone/countries.dart`.
class PhoneController extends ChangeNotifier {
  PhoneController({String? initialE164, String? defaultIso2}) : _iso2 = defaultIso2 ?? defaultCountryIso2 {
    final initial = initialE164?.trim() ?? '';
    if (initial.isEmpty) return;
    final matches = countriesForPhone(initial);
    if (matches.isEmpty) {
      // Not something we can split: show it as typed and let validation say so.
      text.text = initial;
      return;
    }
    final country = matches.firstWhere((c) => c.iso2 == _iso2, orElse: () => matches.first);
    _iso2 = country.iso2;
    text.text = initial.substring(1 + country.dialCode.length);
  }

  final TextEditingController text = TextEditingController();
  String _iso2;

  String get iso2 => _iso2;
  Country get country => countryByIso2(_iso2) ?? countryByIso2(defaultCountryIso2)!;

  set iso2(String value) {
    if (value == _iso2) return;
    _iso2 = value;
    notifyListeners();
  }

  bool get isEmpty => text.text.trim().isEmpty;

  /// The number in E.164, or an empty string when nothing is typed.
  String get e164 => isEmpty ? '' : toE164(_iso2, Digits.toLatin(text.text));

  /// [e164] when something is typed, else null (for optional fields).
  String? get e164OrNull => isEmpty ? null : e164;

  bool get isValid => !isEmpty && isValidPhone(e164);

  /// The message to show, or null when fine. An empty optional field is fine.
  String? error(AppLocalizations l, {required bool required, String languageCode = 'en'}) {
    if (isEmpty) return required ? l.phoneRequired : null;
    return isValid ? null : l.phoneInvalidFor(country.name(languageCode));
  }

  @override
  void dispose() {
    text.dispose();
    super.dispose();
  }
}

/// Mobile-number input: a country button (flag and dial code) that opens a searchable list, and a phone
/// field. Inside a `Form` it validates itself; elsewhere pass [errorText] (from [PhoneController.error]).
class PhoneField extends StatelessWidget {
  const PhoneField({super.key, required this.controller, this.required = false, this.label, this.errorText, this.textInputAction});

  final PhoneController controller;
  final bool required;
  final String? label;
  final String? errorText;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final lang = Localizations.localeOf(context).languageCode;
    final p = AzzaPalette.of(context);
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final c = controller.country;
        return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Semantics(
            button: true,
            label: '${l.phoneCountryPicker}: ${c.name(lang)} +${c.dialCode}',
            child: Material(
              color: p.raised,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AzzaSpace.radius), side: BorderSide(color: p.line)),
              child: InkWell(
                key: const Key('phone-country-button'),
                borderRadius: BorderRadius.circular(AzzaSpace.radius),
                onTap: () async {
                  final picked = await showPhoneCountryPicker(context, selected: controller.iso2);
                  if (picked != null) controller.iso2 = picked.iso2;
                },
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 56, minWidth: 48),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text(c.flag, style: const TextStyle(fontSize: 20)),
                      const SizedBox(width: 6),
                      Text('+${c.dialCode}', key: const Key('phone-dial-code'), textDirection: TextDirection.ltr),
                      const Icon(Icons.arrow_drop_down_rounded),
                    ]),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextFormField(
              key: const Key('phone-input'),
              controller: controller.text,
              keyboardType: TextInputType.phone,
              textInputAction: textInputAction,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.telephoneNumber],
              inputFormatters: [const _LatinDigitsFormatter(), FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s\-().]')), LengthLimitingTextInputFormatter(24)],
              decoration: fieldDecoration(label: label ?? l.phoneLabel, icon: Icons.phone_outlined).copyWith(errorText: errorText),
              validator: (_) => errorText ?? controller.error(l, required: required, languageCode: lang),
            ),
          ),
        ]);
      },
    );
  }
}

/// The country list, GCC first then alphabetical in the app language, with search by name, code or dial code.
Future<Country?> showPhoneCountryPicker(BuildContext context, {required String selected}) => showModalBottomSheet<Country>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (_) => _CountrySheet(selected: selected),
    );

List<Country> _ordered(String lang) {
  final gcc = [for (final iso in gccCountryIso2) countryByIso2(iso)!];
  final rest = countries.where((c) => !gccCountryIso2.contains(c.iso2)).toList()..sort((a, b) => a.name(lang).compareTo(b.name(lang)));
  return [...gcc, ...rest];
}

class _CountrySheet extends StatefulWidget {
  const _CountrySheet({required this.selected});
  final String selected;

  @override
  State<_CountrySheet> createState() => _CountrySheetState();
}

class _CountrySheetState extends State<_CountrySheet> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final lang = Localizations.localeOf(context).languageCode;
    final q = _q.trim().toLowerCase().replaceFirst('+', '');
    final list = [
      for (final c in _ordered(lang))
        if (q.isEmpty || c.nameEn.toLowerCase().contains(q) || c.nameAr.contains(q) || c.iso2.toLowerCase() == q || c.dialCode.startsWith(q)) c,
    ];
    final p = AzzaPalette.of(context);
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.8,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 8),
          child: TextField(
            key: const Key('phone-country-search'),
            autofocus: false,
            onChanged: (v) => setState(() => _q = Digits.toLatin(v)),
            decoration: fieldDecoration(label: l.phoneSearchCountries, icon: Icons.search_rounded, labelIsHint: true),
          ),
        ),
        Expanded(
          child: list.isEmpty
              ? Center(child: Text(l.phoneNoCountries))
              : ListView.builder(
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final c = list[i];
                    return ListTile(
                      key: Key('phone-country-${c.iso2}'),
                      minTileHeight: 56,
                      leading: Text(c.flag, style: const TextStyle(fontSize: 24)),
                      title: Text(c.name(lang)),
                      subtitle: Text('+${c.dialCode}', textDirection: TextDirection.ltr),
                      trailing: c.iso2 == widget.selected ? Icon(Icons.check_rounded, color: p.accent) : null,
                      onTap: () => Navigator.pop(context, c),
                    );
                  },
                ),
        ),
      ]),
    );
  }
}

/// Types Western digits even from an Arabic keyboard (٠١٢ become 012).
class _LatinDigitsFormatter extends TextInputFormatter {
  const _LatinDigitsFormatter();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = Digits.toLatin(newValue.text);
    return text == newValue.text ? newValue : newValue.copyWith(text: text);
  }
}
