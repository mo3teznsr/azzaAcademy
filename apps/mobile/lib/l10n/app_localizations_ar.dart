// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'azza';

  @override
  String get retry => 'حاول مجددًا';

  @override
  String get errorTitle => 'تعذّر التحميل.';

  @override
  String get emptyGeneric => 'لا شيء هنا بعد.';

  @override
  String get seeAll => 'عرض الكل';

  @override
  String get continueLabel => 'متابعة';

  @override
  String get cancel => 'إلغاء';

  @override
  String get back => 'رجوع';

  @override
  String get noOpenBatchesShort => 'لا صفوف مفتوحة';

  @override
  String chargedAsAed(String amount) {
    return 'يُخصم $amount';
  }

  @override
  String get ratesUnavailableHint =>
      'معروض بالدرهم: أسعار الصرف غير متاحة الآن.';

  @override
  String get decrease => 'إنقاص';

  @override
  String get increase => 'زيادة';

  @override
  String get paymentPageNotOpened =>
      'تعذّر فتح صفحة الدفع. اضغط “فتح صفحة الدفع” للمحاولة مجددًا.';

  @override
  String get payCardCheckoutSub =>
      'بطاقة أو Apple Pay أو Google Pay عبر صفحة Stripe الآمنة · يُخصم بالدرهم';

  @override
  String get confirmingPayment => 'نتحقق من الدفع…';

  @override
  String confirmingPaymentBody(String code, String amount) {
    return 'أكمل دفع $amount على صفحة Stripe الآمنة. مكانك في $code محجوز، وتتحدّث هذه الشاشة فور تأكيد الدفع.';
  }

  @override
  String get checkingPayment => 'نتحقق كل بضع ثوانٍ…';

  @override
  String get openPaymentPage => 'فتح صفحة الدفع';

  @override
  String get coursePricedPerBatch =>
      'لا سعر هنا: تحدد سعر المقعد في كل دفعة. يرى الطلاب أقل سعر بين الدفعات المفتوحة كسعر “ابتداءً من” للدورة.';

  @override
  String get seatPriceRequired => 'أدخل سعر المقعد بالدرهم (أكثر من 0).';

  @override
  String get seatPriceAed => 'سعر المقعد (درهم)';

  @override
  String get seatPriceHint => '450';

  @override
  String get seatPriceHelper => 'ما يدفعه الطالب الواحد لهذه الدفعة، بالدرهم.';

  @override
  String get seatsHelper => 'عدد الطلاب الذين يمكنهم التسجيل (1–500).';

  @override
  String get sessionAdded => 'أُضيفت الحصّة.';

  @override
  String cancelSessionTitle(String slate) {
    return 'إلغاء $slate؟';
  }

  @override
  String get cancelSessionBody =>
      'سيُبلَّغ الطلاب وتُزال الحصّة من جدولهم. لا يمكن التراجع عن ذلك.';

  @override
  String get keepSession => 'إبقاء الحصّة';

  @override
  String get cancelSession => 'إلغاء الحصّة';

  @override
  String get sessionCancelled => 'أُلغيت الحصّة.';

  @override
  String get upcomingSessions => 'الحصص القادمة';

  @override
  String get addSession => 'إضافة حصّة';

  @override
  String get noUpcomingSessions => 'لا توجد حصص قادمة.';

  @override
  String get moveSessionAction => 'نقل الحصّة';

  @override
  String get requestMove => 'طلب نقل';

  @override
  String showAllN(String count) {
    return 'عرض الكل ($count)';
  }

  @override
  String get sessionTitleRequired => 'اكتب عنوانًا للحصّة (حرفان على الأقل).';

  @override
  String get errStartInPast => 'اختر وقتًا في المستقبل.';

  @override
  String addSessionTitle(String code) {
    return 'إضافة حصّة إلى $code';
  }

  @override
  String get addSessionLead =>
      'حصّة مباشرة إضافية خارج الجدول الأسبوعي: تعويض أو حصّة إضافية أو اختبار.';

  @override
  String get sessionTitleLabel => 'عنوان الحصّة';

  @override
  String get sessionTitleHint => 'تعويض: مراجعة وأسئلة';

  @override
  String get sessionDate => 'التاريخ';

  @override
  String sessionTimeOtherZone(String device, String batchZone) {
    return 'الأوقات بتوقيت هاتفك ($device). تعمل هذه الدفعة بتوقيت $batchZone.';
  }

  @override
  String sessionTimeZone(String zone) {
    return 'الأوقات بتوقيت الدفعة، $zone.';
  }

  @override
  String get sessionLengthHelper => 'من 15 إلى 480 دقيقة، بخطوات من 15.';

  @override
  String get notifyStudentsNow => 'إبلاغ الطلاب';

  @override
  String get notifyStudentsNowSub =>
      'أرسل لهم إشعارًا وبريدًا إلكترونيًا الآن.';

  @override
  String get couldNotAddSession => 'تعذّرت إضافة الحصّة';

  @override
  String editSeatsTitle(String code) {
    return 'المقاعد في $code';
  }

  @override
  String editSeatsLead(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'سجّل $count طالب.',
      many: 'سجّل $count طالبًا.',
      few: 'سجّل $count طلاب.',
      two: 'سجّل طالبان.',
      one: 'سجّل طالب واحد.',
      zero: 'لا يوجد طلاب مسجّلون بعد.',
    );
    return '$_temp0 لا يمكن أن يقلّ عدد المقاعد عن عدد المسجّلين.';
  }

  @override
  String get couldNotSaveSeats => 'تعذّر تغيير المقاعد';

  @override
  String get saveSeats => 'حفظ المقاعد';

  @override
  String get seatsSaved => 'حُدّثت المقاعد.';

  @override
  String get editSeats => 'تعديل المقاعد';

  @override
  String get sessionMoved => 'نُقلت الحصّة.';

  @override
  String get moveReasonHint => 'عطلة رسمية';

  @override
  String get moveSessionNow => 'نقل الحصّة';

  @override
  String get errConflict => 'يتعارض ذلك مع موعد مجدول بالفعل.';

  @override
  String get errBatchClosed =>
      'انتهت هذه الدفعة أو أُلغيت، فلا يمكن إضافة حصص إليها.';

  @override
  String get errCapacityTooLow =>
      'لا يمكن أن تقل المقاعد عن عدد الطلاب المسجلين.';

  @override
  String get save => 'حفظ';

  @override
  String get saved => 'تم الحفظ';

  @override
  String get skip => 'تخطٍّ';

  @override
  String get signOut => 'تسجيل الخروج';

  @override
  String get edit => 'تعديل';

  @override
  String get copy => 'نسخ';

  @override
  String get copied => 'تم النسخ';

  @override
  String get close => 'إغلاق';

  @override
  String get send => 'إرسال';

  @override
  String get you => 'أنت';

  @override
  String get navHome => 'الرئيسية';

  @override
  String get navExplore => 'استكشف';

  @override
  String get navSchedule => 'الجدول';

  @override
  String get navLibrary => 'المكتبة';

  @override
  String get navMe => 'حسابي';

  @override
  String get navToday => 'اليوم';

  @override
  String get navBatches => 'الدفعات';

  @override
  String get navCalendar => 'التقويم';

  @override
  String get navEarnings => 'الأرباح';

  @override
  String get navOverview => 'نظرة عامة';

  @override
  String get navLive => 'مباشر';

  @override
  String get navApprovals => 'الموافقات';

  @override
  String get statusScheduled => 'مجدولة';

  @override
  String statusStartsIn(String minutes) {
    return 'تبدأ خلال $minutes د';
  }

  @override
  String fmtInMinutes(String minutes) {
    return 'خلال $minutes د';
  }

  @override
  String fmtInHours(String hours) {
    return 'خلال $hours س';
  }

  @override
  String get statusLive => 'مباشر';

  @override
  String get statusEnded => 'انتهت';

  @override
  String get statusRescheduled => 'أُعيدت جدولتها';

  @override
  String get statusCancelled => 'أُلغيت';

  @override
  String get batchDraft => 'مسودة';

  @override
  String get batchEnrolling => 'التسجيل مفتوح';

  @override
  String get batchFull => 'مكتملة · قائمة انتظار';

  @override
  String get batchRunning => 'جارية';

  @override
  String get batchCompleted => 'مكتملة';

  @override
  String get batchCancelled => 'ملغاة';

  @override
  String get orderAwaitingPayment => 'بانتظار الدفع';

  @override
  String get orderAwaitingReceipt => 'بانتظار الإيصال';

  @override
  String get orderVerifying => 'قيد التحقق';

  @override
  String get orderAmountMismatch => 'المبلغ غير مطابق';

  @override
  String get orderPaid => 'مدفوع';

  @override
  String get orderFailed => 'فشل';

  @override
  String get orderRejected => 'مرفوض';

  @override
  String get orderExpired => 'منتهي';

  @override
  String get orderRefunded => 'مسترد';

  @override
  String get splashTagline => 'دورات بالعربية والإنجليزية';

  @override
  String get splashLine => 'تعلّمها. تدرّب عليها. أتقِنها.';

  @override
  String get chooseLanguage => 'اختر لغتك';

  @override
  String get leftToRight => 'من اليسار إلى اليمين';

  @override
  String get rightToLeft => 'من اليمين إلى اليسار';

  @override
  String get languageHint =>
      'يمكنك تغيير لغة التطبيق في أي وقت من حسابي ← اللغة والمنطقة. ولكل صفّ لغة تدريس خاصة به.';

  @override
  String get onboardingTitle => 'ماذا تريد أن تتعلّم؟';

  @override
  String get onboardingLine =>
      'تتعلّم خطوة بخطوة، وتتدرّب وتتلقّى ملاحظات، ويساعدك معلّمك متى احتجت، ثم تُثبت ما تعلّمته بشهادة.';

  @override
  String get onboardingTimezone =>
      'منطقتك الزمنية — تُحوَّل إليها مواعيد الحصص المباشرة';

  @override
  String get detected => 'تم اكتشافها';

  @override
  String get bestTime => 'أنسب وقت للحصص المباشرة';

  @override
  String get mornings => 'الصباح';

  @override
  String get evenings => 'المساء';

  @override
  String get weekends => 'عطلة الأسبوع';

  @override
  String get interestDesign => 'التصميم';

  @override
  String get interestLanguages => 'اللغات';

  @override
  String get interestCode => 'البرمجة';

  @override
  String get interestBusiness => 'الأعمال';

  @override
  String get interestArt => 'الفن';

  @override
  String get interestMusic => 'الموسيقى';

  @override
  String get signInTitle => 'أهلًا بعودتك.';

  @override
  String get signInSubtitle => 'تابع من حيث توقّفت.';

  @override
  String get signUpTitle => 'ابدأ التعلّم اليوم.';

  @override
  String get signUpSubtitle =>
      'مسار واضح، وتدريب مع ملاحظات، وشهادة تُثبت ما تعلّمته.';

  @override
  String get email => 'البريد الإلكتروني';

  @override
  String get password => 'كلمة المرور';

  @override
  String get fullName => 'الاسم الكامل';

  @override
  String get signIn => 'تسجيل الدخول';

  @override
  String get createAccount => 'إنشاء حساب';

  @override
  String get haveAccount => 'لديّ حساب بالفعل';

  @override
  String get noAccount => 'جديد هنا؟ أنشئ حسابًا';

  @override
  String get orLabel => 'أو';

  @override
  String get continueGoogle => 'المتابعة عبر Google';

  @override
  String get continueApple => 'المتابعة عبر Apple';

  @override
  String get termsNote => 'بالمتابعة فإنك توافق على الشروط وسياسة الخصوصية.';

  @override
  String get invalidEmail => 'أدخل بريدًا إلكترونيًا صالحًا';

  @override
  String get passwordTooShort => '8 أحرف على الأقل';

  @override
  String get nameTooShort => 'حرفان على الأقل';

  @override
  String get verifyTitle => 'تفقّد بريدك.';

  @override
  String verifyBody(String email) {
    return 'أرسلنا رابط تحقق إلى $email.';
  }

  @override
  String resendIn(String time) {
    return 'إعادة الإرسال خلال $time';
  }

  @override
  String get resend => 'إعادة الإرسال';

  @override
  String get changeEmail => 'تغيير البريد';

  @override
  String get verifyPermissions =>
      'بعدها نطلب إذن الكاميرا والميكروفون مرة واحدة، لتنضم إلى الحصص المباشرة بلمسة واحدة.';

  @override
  String get verifyContinue => 'تحقّق وتابع';

  @override
  String greetingMorning(String name) {
    return 'صباح الخير، $name';
  }

  @override
  String greetingAfternoon(String name) {
    return 'مساء الخير، $name';
  }

  @override
  String greetingEvening(String name) {
    return 'مساء الخير، $name';
  }

  @override
  String get liveNow => 'مباشر الآن';

  @override
  String get joinLiveRoom => 'انضم إلى الحصّة';

  @override
  String inRoom(String count) {
    return 'الحاضرون: $count';
  }

  @override
  String get myBatches => 'دوراتك';

  @override
  String nextAt(String when) {
    return 'الحصّة التالية · $when';
  }

  @override
  String get continueWatching => 'استدرك ما فاتك';

  @override
  String get noBatchesTitle => 'لا دورات بعد';

  @override
  String get noBatchesBody =>
      'اعثر على دورة، ثم اختر صفًّا تناسب حصصه المباشرة أسبوعك.';

  @override
  String get exploreCta => 'اعثر على دورتك';

  @override
  String get upNext => 'الحصّة المباشرة التالية';

  @override
  String get practiceDue => 'تدريب بانتظارك';

  @override
  String get exploreTitle => 'اعثر على ما تريد تعلّمه.';

  @override
  String get searchCourses => 'ابحث في الدورات';

  @override
  String get allFilter => 'الكل';

  @override
  String coursesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count دورة',
      many: '$count دورةً',
      few: '$count دورات',
      two: 'دورتان',
      one: 'دورة واحدة',
      zero: 'لا دورات',
    );
    return '$_temp0';
  }

  @override
  String get noCoursesFound => 'لا توجد دورات مطابقة. جرّب بحثًا آخر.';

  @override
  String levelN(String n) {
    return 'المستوى $n';
  }

  @override
  String liveSessionsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n حصّة مباشرة',
      many: '$n حصّةً مباشرة',
      few: '$n حصص مباشرة',
      two: 'حصّتان مباشرتان',
      one: 'حصّة مباشرة واحدة',
      zero: 'لا حصص مباشرة',
    );
    return '$_temp0';
  }

  @override
  String get recordings => 'التسجيلات';

  @override
  String get certificate => 'شهادة';

  @override
  String teaches(String codes) {
    return 'يدرّس $codes';
  }

  @override
  String get outcomesTitle => 'ستخرج قادرًا على';

  @override
  String syllabusN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n وحدة',
      many: '$n وحدةً',
      few: '$n وحدات',
      two: 'وحدتان',
      one: 'وحدة واحدة',
      zero: 'لا وحدات',
    );
    return 'المنهج · $_temp0';
  }

  @override
  String fromPrice(String price) {
    return 'ابتداءً من $price';
  }

  @override
  String chooseBatchN(String n) {
    return 'اختر صفّك · $n';
  }

  @override
  String get pickBatch => 'اختر صفّك.';

  @override
  String timesShownIn(String tz) {
    return 'التوقيت: $tz';
  }

  @override
  String get fullSchedule => 'الجدول الكامل';

  @override
  String enrollIn(String code) {
    return 'انضم إلى الصفّ $code';
  }

  @override
  String seatsLeft(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'بقي $n مكان',
      many: 'بقي $n مكانًا',
      few: 'بقيت $n أماكن',
      two: 'بقي مكانان',
      one: 'بقي مكان واحد',
      zero: 'لم يبقَ أي مكان',
    );
    return '$_temp0';
  }

  @override
  String seatsOf(String taken, String capacity) {
    return '$taken/$capacity';
  }

  @override
  String get noOpenBatches => 'لا صفوف مفتوحة حاليًا. عُد قريبًا.';

  @override
  String joiningLate(int ran, int left) {
    String _temp0 = intl.Intl.pluralLogic(
      ran,
      locale: localeName,
      other: 'انعقدت $ran حصّة',
      many: 'انعقدت $ran حصّةً',
      few: 'انعقدت $ran حصص',
      two: 'انعقدت حصّتان',
      one: 'انعقدت حصّة واحدة',
      zero: 'لم تنعقد أي حصّة بعد',
    );
    String _temp1 = intl.Intl.pluralLogic(
      left,
      locale: localeName,
      other: 'تبقّت $left حصّة مباشرة.',
      many: 'تبقّت $left حصّةً مباشرة.',
      few: 'تبقّت $left حصص مباشرة.',
      two: 'تبقّت حصّتان مباشرتان.',
      one: 'تبقّت حصّة مباشرة واحدة.',
      zero: 'لم تبقَ حصص مباشرة.',
    );
    return 'تنضم متأخرًا؟ $_temp0، وتجد التسجيلات في مكتبتك لتستدرك ما فاتك. $_temp1';
  }

  @override
  String get addToCalendar => 'أضف إلى التقويم';

  @override
  String continueWithPrice(String price) {
    return 'متابعة · $price';
  }

  @override
  String sessionN(String n) {
    return 'الحصّة $n';
  }

  @override
  String get joinWaitlist => 'انضم لقائمة الانتظار';

  @override
  String get checkoutTitle => 'الدفع';

  @override
  String stepOf(String a, String b) {
    return 'الخطوة $a / $b';
  }

  @override
  String get showPricesIn => 'اعرض الأسعار بـ';

  @override
  String get batchPrice => 'سعر الصفّ';

  @override
  String get coupon => 'قسيمة';

  @override
  String get apply => 'تطبيق';

  @override
  String get discount => 'الخصم';

  @override
  String get vat => 'ضريبة القيمة المضافة';

  @override
  String get total => 'الإجمالي';

  @override
  String chargedInAed(String aed, String currency, String rate) {
    return 'يُخصم $aed. يحوّل بنكك العملة. $currency تقدير بسعر 1 درهم = $rate $currency.';
  }

  @override
  String get chargedExact => 'يُخصم بالدرهم. هذا هو المبلغ الدقيق.';

  @override
  String get payWith => 'ادفع عبر';

  @override
  String get payCard => 'بطاقة · Google Pay';

  @override
  String get payCardSub => 'تأكيد فوري · 3-D Secure';

  @override
  String get payBank => 'تحويل بنكي';

  @override
  String get payBankSub => 'نحجز مكانك 48 ساعة أثناء التحويل';

  @override
  String continueAmount(String amount) {
    return 'متابعة · $amount';
  }

  @override
  String get couponInvalid => 'لم تُطبَّق القسيمة.';

  @override
  String get payByCard => 'الدفع بالبطاقة';

  @override
  String payAmount(String amount) {
    return 'ادفع $amount';
  }

  @override
  String cardNote(String amount) {
    return 'قد يطلب بنكك التأكيد عبر 3-D Secure. سيظهر في كشف بطاقتك $amount.';
  }

  @override
  String get securedByStripe => 'مؤمَّن عبر Stripe · لا نخزّن أرقام البطاقات';

  @override
  String get stripeUnavailable =>
      'الدفع بالبطاقة غير مفعّل في هذه النسخة. استخدم التحويل البنكي.';

  @override
  String get paymentCancelled => 'أُلغي الدفع.';

  @override
  String get bankTransfer => 'تحويل بنكي';

  @override
  String seatHeld(String time) {
    return 'مكانك محجوز $time';
  }

  @override
  String get transferExactly => 'حوّل بالضبط';

  @override
  String get reference => 'المرجع';

  @override
  String referenceHint(String amount) {
    return 'ضع المرجع في ملاحظات التحويل. أرسل بالدرهم، أو اطلب من بنكك التحويل ليصل $amount.';
  }

  @override
  String get chooseBank => 'اختر البنك المستلِم';

  @override
  String copyIbanOf(String bank) {
    return 'انسخ رقم الآيبان الكامل لـ $bank';
  }

  @override
  String get uploadReceipt =>
      'ارفع إيصال التحويل (PDF أو JPG أو PNG · حتى 10 م.ب)';

  @override
  String get chooseFile => 'اختر ملفًا';

  @override
  String get fileTooLarge => 'الملف أكبر من 10 م.ب.';

  @override
  String get iSentTransfer => 'أرسلت التحويل';

  @override
  String get holdExpired => 'انتهت مهلة الـ48 ساعة وأُطلق مكانك.';

  @override
  String get noBanks => 'لا توجد بنوك مستلِمة مفعّلة. تواصل مع الدعم.';

  @override
  String orderRef(String ref) {
    return 'الطلب $ref';
  }

  @override
  String get almostOnAir => 'اقتربنا من الانتهاء.';

  @override
  String verifyingBody(String code, String amount) {
    return 'نحجز مكانك في $code بينما يتحقق قسم المالية من تحويل $amount.';
  }

  @override
  String get tlOrderCreated => 'المكان محجوز';

  @override
  String get tlReceiptUploaded => 'رُفع الإيصال';

  @override
  String get tlFinanceVerifying => 'المالية تتحقق';

  @override
  String get tlSeatConfirmed => 'تأكّد مكانك';

  @override
  String get rejectedTitle => 'الإيصال يحتاج إلى مراجعة';

  @override
  String get reupload => 'أعد رفع الإيصال';

  @override
  String get contactSupport => 'تواصل مع دعم المالية';

  @override
  String get orderFailedBody => 'لم يكتمل الدفع. يمكنك المحاولة مجددًا.';

  @override
  String get orderExpiredBody => 'انتهت صلاحية هذا الطلب وأُطلق مكانك.';

  @override
  String get goToSchedule => 'اذهب إلى جدولي';

  @override
  String get youreIn => 'أنت معنا.';

  @override
  String enrolledBody(String course, String code, int count, String n) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'وقد أُضيفت $n حصّة مباشرة إلى جدولك.',
      many: 'وقد أُضيفت $n حصّةً مباشرة إلى جدولك.',
      few: 'وقد أُضيفت $n حصص مباشرة إلى جدولك.',
      two: 'وقد أُضيفت حصّتان مباشرتان إلى جدولك.',
      one: 'وقد أُضيفت حصّة مباشرة واحدة إلى جدولك.',
      zero: 'وستظهر الحصص المباشرة في جدولك.',
    );
    return 'تأكّد مكانك في $course · $code. ابدأ بالدروس، $_temp0';
  }

  @override
  String get nextTake => 'الحصّة المباشرة التالية';

  @override
  String get days => 'أيام';

  @override
  String get hrs => 'ساعات';

  @override
  String get mins => 'دقائق';

  @override
  String lobbyOpensAt(String time) {
    return 'يمكنك الانضمام من $time';
  }

  @override
  String syncCalendar(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'زامن $n حصّة مع التقويم',
      many: 'زامن $n حصّةً مع التقويم',
      few: 'زامن $n حصص مع التقويم',
      two: 'زامن الحصّتين مع التقويم',
      one: 'زامن حصّة واحدة مع التقويم',
      zero: 'زامن الحصص مع التقويم',
    );
    return '$_temp0';
  }

  @override
  String get watchRecordings => 'شاهد التسجيلات';

  @override
  String get myOrders => 'طلباتي';

  @override
  String get noOrders => 'لا طلبات بعد.';

  @override
  String get thisWeek => 'هذا الأسبوع';

  @override
  String get noSessionsWeek => 'لا حصص مباشرة هذا الأسبوع.';

  @override
  String get prevWeek => 'الأسبوع السابق';

  @override
  String get nextWeek => 'الأسبوع التالي';

  @override
  String lobbyOpenStarts(String time) {
    return 'غرفة الانتظار مفتوحة · تبدأ $time';
  }

  @override
  String lobbyStarts(String time) {
    return 'غرفة الانتظار · تبدأ $time';
  }

  @override
  String get cameraPreview => 'أنت · معاينة الكاميرا';

  @override
  String get microphone => 'الميكروفون';

  @override
  String get camera => 'الكاميرا';

  @override
  String joinAs(String name) {
    return 'انضم باسم $name';
  }

  @override
  String get lobbyClosed => 'يمكنك الانضمام قبل 15 دقيقة من بدء الحصّة.';

  @override
  String get goLive => 'ابدأ الحصّة';

  @override
  String get recordSession => 'سجّل الحصّة';

  @override
  String get recordSessionSub => 'تُحفظ في مكتبة الدفعة بعد المعالجة';

  @override
  String waitingN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n شخص ينتظرون',
      many: '$n شخصًا ينتظرون',
      few: '$n أشخاص ينتظرون',
      two: 'شخصان ينتظران',
      one: 'شخص واحد ينتظر',
      zero: 'لا أحد ينتظر',
    );
    return '$_temp0';
  }

  @override
  String get networkCheck => 'يُفحص الاتصال عند الانضمام';

  @override
  String get connecting => 'جارٍ الاتصال…';

  @override
  String get rec => 'تسجيل';

  @override
  String get reconnecting => 'جارٍ إعادة الاتصال…';

  @override
  String get reconnectingBody => 'إشارة ضعيفة. أُوقف الفيديو للحفاظ على الصوت.';

  @override
  String get hostLabel => 'المضيف';

  @override
  String get chat => 'الدردشة';

  @override
  String peopleN(String n) {
    return 'المشاركون ($n)';
  }

  @override
  String handsN(String n) {
    return 'الأيدي المرفوعة · $n';
  }

  @override
  String get messageHint => 'رسالة';

  @override
  String get leave => 'مغادرة';

  @override
  String get raiseHand => 'رفع اليد';

  @override
  String get muteAll => 'كتم الجميع';

  @override
  String get record => 'تسجيل';

  @override
  String get endForAll => 'إنهاء للجميع';

  @override
  String get endConfirmTitle => 'إنهاء الحصّة للجميع؟';

  @override
  String get endConfirmBody => 'تُغلق الغرفة ويتوقف التسجيل ويُحفظ الحضور.';

  @override
  String get allowSpeak => 'السماح بالتحدث';

  @override
  String get mute => 'كتم';

  @override
  String get remove => 'إزالة';

  @override
  String get noMessages => 'لا رسائل بعد. ألقِ التحية.';

  @override
  String get noHands => 'لا أيدي مرفوعة.';

  @override
  String get onlyYou => 'أنت الوحيد هنا حتى الآن.';

  @override
  String get liveUnavailable => 'الفيديو غير متاح لهذه الحصّة بعد.';

  @override
  String edgeWaitingTitle(String host) {
    return 'لم يبدأ $host الحصّة بعد';
  }

  @override
  String get edgeWaitingSub => 'تبدأ عادةً خلال 5 دقائق · ستنضم تلقائيًا';

  @override
  String get edgeLiveNow => 'مباشر الآن';

  @override
  String get edgePermTitle => 'الكاميرا أو الميكروفون محظوران';

  @override
  String get edgePermBody =>
      'لا يستطيع تطبيق عازة استخدام الكاميرا أو الميكروفون، لذا لا يراك الصف ولا يسمعك.';

  @override
  String get edgePermStepsIos =>
      'افتح الإعدادات ← عازة ← فعّل الكاميرا والميكروفون، ثم عُد.';

  @override
  String get edgePermStepsAndroid =>
      'افتح الإعدادات ← التطبيقات ← عازة ← الأذونات ← اسمح بالكاميرا والميكروفون، ثم عُد.';

  @override
  String get edgePermMissing => 'لم نجد كاميرا أو ميكروفونًا على هذا الجهاز.';

  @override
  String get edgePermBusy =>
      'تطبيق آخر يستخدم الكاميرا أو الميكروفون. أغلقه وحاول مجددًا.';

  @override
  String get edgeOpenSettings => 'افتح الإعدادات';

  @override
  String get edgeTryAgain => 'حاول مجددًا';

  @override
  String get edgeJoinAudioOnly => 'انضم بالصوت فقط';

  @override
  String get edgeJoinListenOnly => 'انضم للاستماع فقط';

  @override
  String get edgeReconnecting =>
      'جارٍ إعادة الاتصال… توقف الفيديو مؤقتًا وبقي الصوت';

  @override
  String get edgeLostTitle => 'انقطع الاتصال';

  @override
  String get edgeLostBody => 'تعذّرت إعادتك تلقائيًا. مكانك في الصفّ محفوظ.';

  @override
  String get edgeRejoin => 'أعد الانضمام';

  @override
  String edgeRoomFullTitle(String n, String max) {
    return 'الغرفة ممتلئة $n/$max';
  }

  @override
  String get edgeRoomFullGeneric => 'هذه الغرفة ممتلئة';

  @override
  String get edgeRoomFullBody =>
      'يتوفر مكان بمجرد مغادرة أحدهم. حاول بعد دقيقة، أو شاهد التسجيل بعد الحصّة.';

  @override
  String edgeCancelledTitle(String s, String teacher) {
    return 'أُلغيت $s من قِبل $teacher';
  }

  @override
  String get edgeCancelledBody => 'لن تُحتسب ضد حضورك. يعرض جدولك ما التالي.';

  @override
  String edgeMovedTitle(String s, String when) {
    return 'نُقلت $s إلى $when';
  }

  @override
  String edgeMovedBody(String was, String tz) {
    return 'كانت $was. الأوقات بتوقيتك المحلي ($tz).';
  }

  @override
  String get edgeEndedTitle => 'انتهت هذه الحصّة';

  @override
  String get edgeEndedBody => 'يظهر التسجيل في مكتبتك عندما يصبح جاهزًا.';

  @override
  String get edgeNotEnrolledTitle => 'لست مسجّلًا في هذا الصفّ';

  @override
  String get edgeNotEnrolledBody =>
      'تحتاج إلى تسجيل نشط في هذا الصفّ للانضمام.';

  @override
  String get edgeBackToSchedule => 'العودة إلى الجدول';

  @override
  String get edgeWaitingButton => 'بانتظار المضيف…';

  @override
  String get wrapTitle => 'انتهت الحصّة.';

  @override
  String endedStayed(String time, int min) {
    String _temp0 = intl.Intl.pluralLogic(
      min,
      locale: localeName,
      other: 'بقيت $min دقيقة',
      many: 'بقيت $min دقيقةً',
      few: 'بقيت $min دقائق',
      two: 'بقيت دقيقتين',
      one: 'بقيت دقيقة واحدة',
      zero: 'بقيت أقل من دقيقة',
    );
    return 'انتهت $time · $_temp0';
  }

  @override
  String howWas(String slate) {
    return 'كيف كانت $slate؟';
  }

  @override
  String get tagClear => 'واضحة';

  @override
  String get tagPace => 'إيقاع جيد';

  @override
  String get tagExamples => 'أمثلة رائعة';

  @override
  String get tagAudio => 'مشاكل صوت';

  @override
  String get tagTooFast => 'سريعة جدًا';

  @override
  String get recordingProcessing => 'التسجيل قيد المعالجة';

  @override
  String get recordingSoon => 'جاهز خلال 20 دقيقة تقريبًا · سنُعلمك';

  @override
  String get nextLabel => 'التالي';

  @override
  String get sendFeedback => 'أرسل التقييم';

  @override
  String get thanksFeedback => 'شكرًا — أُرسل التقييم.';

  @override
  String get libraryTitle => 'المكتبة';

  @override
  String get libraryEmptyTitle => 'تعلّم بإيقاعك';

  @override
  String continueAt(String at) {
    return 'تابع · $at';
  }

  @override
  String allRecordingsN(String n) {
    return 'كل التسجيلات · $n';
  }

  @override
  String get materials => 'المواد';

  @override
  String get noRecordings =>
      'تظهر التسجيلات هنا بعد كل حصّة، لتعيد المشاهدة أو تستدرك ما فاتك.';

  @override
  String get noMaterials => 'لم تُشارك مواد بعد.';

  @override
  String get assignments => 'الواجبات';

  @override
  String get dueTab => 'مستحقة';

  @override
  String get submittedTab => 'مُسلّمة';

  @override
  String get gradedTab => 'مُقيّمة';

  @override
  String dueAt(String when) {
    return 'موعد التسليم $when';
  }

  @override
  String get submitAssignment => 'سلّم الواجب';

  @override
  String get linkLabel => 'رابط';

  @override
  String get textLabel => 'ملاحظات';

  @override
  String get noAssignments => 'لا واجبات هنا.';

  @override
  String get submittedOk => 'تم التسليم.';

  @override
  String scoreOf(String score, String max) {
    return '$score / $max';
  }

  @override
  String get enrollFirst => 'انضم إلى صفّ لتفتح دروسه وتسجيلاته وموادّه.';

  @override
  String get inbox => 'الوارد';

  @override
  String get markAllRead => 'تعليم الكل كمقروء';

  @override
  String get today => 'اليوم';

  @override
  String get earlier => 'سابقًا';

  @override
  String get noNotifications => 'لا جديد لديك.';

  @override
  String get timezone => 'المنطقة الزمنية';

  @override
  String get language => 'اللغة';

  @override
  String get notifications => 'الإشعارات';

  @override
  String get account => 'الحساب';

  @override
  String batchesN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n صفّ',
      many: '$n صفًّا',
      few: '$n صفوف',
      two: 'صفّان',
      one: 'صفّ واحد',
      zero: 'لا صفوف',
    );
    return '$_temp0';
  }

  @override
  String get languageRegion => 'اللغة والمنطقة';

  @override
  String get appLanguage => 'لغة التطبيق';

  @override
  String get numerals => 'الأرقام';

  @override
  String get numeralsArabic => 'أرقام هندية ٠١٢٣٤٥٦٧٨٩';

  @override
  String get numeralsWestern => 'أرقام غربية 0123456789';

  @override
  String get preview => 'معاينة';

  @override
  String get displayCurrency => 'عملة العرض';

  @override
  String get editProfile => 'تعديل الملف';

  @override
  String get nextTakeLobbyOpen => 'الحصّة التالية · غرفة الانتظار مفتوحة';

  @override
  String nextTakeIn(String time) {
    return 'الحصّة التالية · تبدأ خلال $time';
  }

  @override
  String get enterLobby => 'ادخل غرفة الانتظار';

  @override
  String studentsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n طالب',
      many: '$n طالبًا',
      few: '$n طلاب',
      two: 'طالبان',
      one: 'طالب واحد',
      zero: 'لا طلاب',
    );
    return '$_temp0';
  }

  @override
  String get todayStat => 'اليوم';

  @override
  String get weekStat => 'الأسبوع';

  @override
  String get sessionsLabel => 'حصص';

  @override
  String get attendStat => 'الحضور';

  @override
  String get laterToday => 'لاحقًا اليوم';

  @override
  String teacherHubTitle(String course, String code) {
    return '$course · $code';
  }

  @override
  String get teacherHubSessions => 'الحصص';

  @override
  String get teacherHubStudents => 'الطلاب';

  @override
  String get teacherHubPractice => 'التدريب';

  @override
  String get teacherNewAssignment => 'واجب جديد';

  @override
  String get teacherNoAssignments =>
      'لا واجبات بعد. أضف واجبًا ليتدرّب الطلاب بعد الحصّة.';

  @override
  String teacherSubmittedCount(String count) {
    return 'سلّمه $count';
  }

  @override
  String get teacherNewQuiz => 'اختبار جديد';

  @override
  String get teacherEditQuiz => 'تعديل الاختبار';

  @override
  String get teacherQuizResults => 'النتائج';

  @override
  String get teacherNoQuizzesBody =>
      'اكتب اختبارًا قصيرًا لتعرف ما تعلّمه طلابك.';

  @override
  String get teacherMaterialSlides => 'شرائح';

  @override
  String get teacherMaterialFile => 'ملف';

  @override
  String get teacherMaterialVideo => 'فيديو';

  @override
  String get teacherAddMaterial => 'إضافة مادة';

  @override
  String get teacherAddMaterialLede =>
      'ارفع ملفًا أو فيديو من هاتفك، أو شارك رابط شرائح أو صفحة ويب أو فيديو. يفتحه الطلاب من مكتبتهم.';

  @override
  String get teacherMaterialAdded => 'أُضيفت المادة. يستطيع طلابك فتحها الآن.';

  @override
  String get teacherNoMaterials =>
      'لا مواد بعد. أضف شرائح أو ملفات أو روابط لهذا الصفّ.';

  @override
  String get teacherNoClassRecordings =>
      'لا تسجيلات بعد. تُسجَّل كل حصّة عند بدئها.';

  @override
  String teacherMinutesShort(String count) {
    return '$count د';
  }

  @override
  String get teacherVideoTooLarge =>
      'حجم الفيديو أكبر من 200 ميغابايت. شاركه كرابط بدلًا من ذلك.';

  @override
  String get teacherUploading => 'جارٍ الرفع…';

  @override
  String get teacherUploadVideo => 'رفع فيديو';

  @override
  String teacherUploadedFile(String name) {
    return 'تم الرفع: $name';
  }

  @override
  String get teacherUploadVideoHint => 'MP4 أو MOV أو WEBM حتى 200 ميغابايت.';

  @override
  String get teacherMaterialTitleHint => 'مثال: شرائح الأسبوع 2';

  @override
  String get teacherTitleRequired => 'أضف عنوانًا من حرفين على الأقل.';

  @override
  String get teacherMaterialUrlHelper =>
      'رابط يستطيع الطلاب فتحه، يبدأ بـ https://';

  @override
  String get filesAttach => 'أرفق ملفات';

  @override
  String filesAttachHint(int count, String n, String types, String mb) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'حتى $n ملف',
      many: 'حتى $n ملفًا',
      few: 'حتى $n ملفات',
      two: 'ملفان كحدّ أقصى',
      one: 'ملف واحد',
    );
    return '$_temp0 · $types · $mb ميغابايت للملف';
  }

  @override
  String filesUploadingPercent(String percent) {
    return 'جارٍ الرفع $percent%';
  }

  @override
  String filesRemove(String name) {
    return 'إزالة $name';
  }

  @override
  String filesOpen(String name) {
    return 'افتح $name';
  }

  @override
  String get filesYourFiles => 'ملفاتك';

  @override
  String get filesSubmitted => 'الملفات';

  @override
  String filesTooMany(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'يمكنك إرفاق $count ملف كحدّ أقصى.',
      many: 'يمكنك إرفاق $count ملفًا كحدّ أقصى.',
      few: 'يمكنك إرفاق $count ملفات كحدّ أقصى.',
      two: 'يمكنك إرفاق ملفين كحدّ أقصى.',
      one: 'يمكنك إرفاق ملف واحد فقط.',
    );
    return '$_temp0';
  }

  @override
  String get filesWaitForUpload => 'انتظر حتى يكتمل رفع ملفاتك.';

  @override
  String filesTypeRefused(String name, String types) {
    return 'لا يمكن إرفاق $name. الأنواع المقبولة: $types.';
  }

  @override
  String filesTooLargeRefused(String name, String mb) {
    return 'حجم $name أكبر من $mb ميغابايت.';
  }

  @override
  String filesEmptyRefused(String name) {
    return 'الملف $name فارغ.';
  }

  @override
  String get filesErrType =>
      'نوع هذا الملف غير مدعوم. جرّب PDF أو Word أو PowerPoint أو Excel أو صورة أو ZIP أو نصًّا.';

  @override
  String get filesErrEmpty => 'هذا الملف فارغ. اختر ملفًا آخر.';

  @override
  String get filesErrTooLarge => 'هذا الملف أكبر من الحجم المسموح.';

  @override
  String get filesErrMissing => 'اختر ملفًا لرفعه.';

  @override
  String get filesErrForeignUrl => 'ارفع الملف هنا أولًا، ثم أضِفه.';

  @override
  String get filesErrEmptySubmission => 'أضِف رابطًا أو نصًّا أو ملفًا.';

  @override
  String get filesUploadMaterial => 'ارفع ملفًا';

  @override
  String filesUploadMaterialHint(String types, String mb) {
    return '$types، حتى $mb ميغابايت. يفتحه الطلاب من مكتبتهم.';
  }

  @override
  String get filesLinkKindsNote =>
      'لمشاركة مستند، ارفعه. الروابط مخصّصة للشرائح وصفحات الويب والفيديو.';

  @override
  String get filesEditAssignment => 'تعديل الواجب';

  @override
  String get filesSaveChanges => 'احفظ التعديلات';

  @override
  String get filesAssignmentSaved => 'تم تحديث الواجب.';

  @override
  String get filesAssignmentActions => 'خيارات الواجب';

  @override
  String get filesDeleteAssignment => 'حذف الواجب';

  @override
  String filesDeleteAssignmentTitle(String title) {
    return 'حذف «$title»؟';
  }

  @override
  String get filesDeleteAssignmentBody =>
      'لا يمكن التراجع عن الحذف. بعد أن يسلّم أي طالب لا يمكن حذف الواجب، لكن يمكنك تعديله.';

  @override
  String get filesDelete => 'احذف';

  @override
  String get filesAssignmentDeleted => 'تم حذف الواجب.';

  @override
  String get filesErrHasSubmissions =>
      'سلّم بعض الطلاب هذا الواجب، لذا لا يمكن حذفه. ما زال بإمكانك تعديله.';

  @override
  String filesErrScoreTooHigh(String score) {
    return 'حصل أحد التسليمات على $score، لذا لا يمكن أن تقلّ الدرجة القصوى عن ذلك.';
  }

  @override
  String get teacherUrlInvalid => 'أدخل رابطًا كاملًا، مثل https://example.com';

  @override
  String get teacherLinkSession => 'الحصّة';

  @override
  String get teacherOptional => 'اختياري';

  @override
  String get teacherNoSessionLink => 'غير مرتبط بحصّة';

  @override
  String get teacherAssignmentCreated =>
      'أُنشئ الواجب. يستطيع الطلاب رؤيته الآن.';

  @override
  String get teacherAssignmentLede =>
      'يسلّم الطلاب نصًا أو رابطًا قبل الموعد. يُقبل التسليم المتأخر ويُعلَّم بأنه متأخر.';

  @override
  String get teacherAssignmentTitleHint => 'مثال: أنشئ جدول ميزانية';

  @override
  String get teacherInstructions => 'التعليمات';

  @override
  String get teacherInstructionsHint =>
      'ماذا يفعل الطلاب، وكيف يبدو العمل الجيد؟';

  @override
  String get teacherDueHelper => 'اضغط لاختيار التاريخ والوقت.';

  @override
  String get teacherChangeDue => 'اختر موعد التسليم';

  @override
  String get teacherDueInPast => 'اختر وقتًا في المستقبل.';

  @override
  String get teacherMaxScore => 'الدرجة القصوى';

  @override
  String get teacherMaxScoreHelper => 'أعلى درجة لهذا الواجب.';

  @override
  String get teacherMaxScoreInvalid => 'أدخل عددًا صحيحًا من 1 إلى 1000.';

  @override
  String get teacherCreateAssignment => 'إنشاء الواجب';

  @override
  String teacherGradedScore(String score, String max) {
    return 'مُصحَّح $score/$max';
  }

  @override
  String get teacherToGrade => 'للتصحيح';

  @override
  String get teacherSubmissionsTitle => 'التسليمات';

  @override
  String teacherOutOf(String max) {
    return 'من $max';
  }

  @override
  String get teacherNoSubmissions => 'لم يُسلَّم شيء بعد.';

  @override
  String teacherHandedIn(String when) {
    return 'سُلِّم $when';
  }

  @override
  String get teacherGradeSaved => 'حُفظت الدرجة وأُبلغ الطالب.';

  @override
  String get teacherTheirWork => 'عمل الطالب';

  @override
  String get teacherScore => 'الدرجة';

  @override
  String teacherScoreHint(String max) {
    return 'من 0 إلى $max';
  }

  @override
  String teacherScoreInvalid(String max) {
    return 'أدخل عددًا صحيحًا من 0 إلى $max.';
  }

  @override
  String get teacherFeedback => 'الملاحظات';

  @override
  String get teacherFeedbackHint => 'ما الذي أحسن فيه، وشيء واحد يحسّنه.';

  @override
  String get teacherSaveGrade => 'حفظ الدرجة';

  @override
  String get teacherGradingTitle => 'التصحيح';

  @override
  String get teacherGradingLede =>
      'الأعمال المسلَّمة في كل صفوفك، الأقدم أولًا.';

  @override
  String get teacherAllGraded => 'لا شيء للتصحيح. أنجزت كل شيء.';

  @override
  String get teacherQuizSaved => 'حُفظ الاختبار.';

  @override
  String get teacherQuizNeedsQuestion =>
      'أضف سؤالًا واحدًا على الأقل قبل النشر.';

  @override
  String get teacherPublishQuizTitle => 'هل تنشر هذا الاختبار؟';

  @override
  String get teacherPublishQuizBody =>
      'سيُبلَّغ طلابك ويمكنهم البدء. بعد أن يبدأ أحدهم لا يمكن تغيير الأسئلة.';

  @override
  String get teacherPublish => 'نشر';

  @override
  String get teacherQuizPublished => 'نُشر الاختبار وأُبلغ الطلاب.';

  @override
  String get teacherQuizUnpublished => 'أُعيد الاختبار إلى مسودة.';

  @override
  String get teacherDeleteQuizTitle => 'هل تحذف هذا الاختبار؟';

  @override
  String get teacherDeleteQuizBody =>
      'سيُحذف الاختبار وأسئلته. لا يمكن التراجع عن ذلك.';

  @override
  String get teacherDelete => 'حذف';

  @override
  String get teacherQuizDeleted => 'حُذف الاختبار.';

  @override
  String get teacherTrue => 'صح';

  @override
  String get teacherFalse => 'خطأ';

  @override
  String get teacherSingleChoice => 'اختيار واحد';

  @override
  String get teacherChooseAll => 'اختر كل ما ينطبق';

  @override
  String get teacherTrueFalse => 'صح / خطأ';

  @override
  String teacherQuizTotals(int questions, int points) {
    String _temp0 = intl.Intl.pluralLogic(
      questions,
      locale: localeName,
      other: '$questions سؤال',
      many: '$questions سؤالًا',
      few: '$questions أسئلة',
      two: 'سؤالان',
      one: 'سؤال واحد',
      zero: 'لا أسئلة',
    );
    String _temp1 = intl.Intl.pluralLogic(
      points,
      locale: localeName,
      other: '$points نقطة',
      many: '$points نقطةً',
      few: '$points نقاط',
      two: 'نقطتان',
      one: 'نقطة واحدة',
      zero: 'لا نقاط',
    );
    return '$_temp0 · $_temp1';
  }

  @override
  String get teacherQuizLocked =>
      'بدأ الطلاب هذا الاختبار، لذا الأسئلة مقفلة. يمكنك تعديل التفاصيل.';

  @override
  String get teacherQuizDetails => 'التفاصيل';

  @override
  String get teacherQuizTitleHint => 'مثال: مراجعة الوحدة 1';

  @override
  String get teacherQuizInstructionsHint => 'ما يحتاج الطلاب معرفته قبل البدء.';

  @override
  String get teacherQuizModule => 'الوحدة';

  @override
  String get teacherQuizModuleHelper =>
      'يرى الطلاب الاختبار مع دروس هذه الوحدة.';

  @override
  String get teacherNoModule => 'بلا وحدة';

  @override
  String get teacherNoDueDate => 'بلا موعد نهائي';

  @override
  String get teacherTimeLimit => 'المدة (بالدقائق)';

  @override
  String get teacherUntimed => 'بلا وقت محدد';

  @override
  String get teacherTimeLimitHelper => 'اتركه فارغًا لاختبار بلا وقت محدد.';

  @override
  String get teacherTimeLimitInvalid =>
      'أدخل من 1 إلى 600 دقيقة، أو اتركه فارغًا.';

  @override
  String get teacherAttempts => 'المحاولات';

  @override
  String get teacherAttemptsHelper =>
      'عدد المرات التي يستطيع كل طالب أداءه فيها.';

  @override
  String get teacherAddQuestion => 'إضافة سؤال';

  @override
  String get teacherSaveDraft => 'حفظ كمسودة';

  @override
  String get teacherUnpublish => 'إلغاء النشر';

  @override
  String teacherQuestionN(String n) {
    return 'السؤال $n';
  }

  @override
  String get teacherRemoveQuestion => 'حذف السؤال';

  @override
  String get teacherQuestionPrompt => 'السؤال';

  @override
  String get teacherQuestionPromptHint => 'اكتب السؤال الذي سيجيب عنه الطلاب.';

  @override
  String get teacherQuestionRequired => 'اكتب السؤال.';

  @override
  String get teacherMarkAllCorrect => 'حدّد كل الإجابات الصحيحة.';

  @override
  String get teacherMarkOneCorrect => 'حدّد الإجابة الصحيحة الوحيدة.';

  @override
  String get teacherCorrectAnswer => 'إجابة صحيحة';

  @override
  String get teacherMarkCorrect => 'تحديد كإجابة صحيحة';

  @override
  String teacherOptionN(String n) {
    return 'الخيار $n';
  }

  @override
  String get teacherOptionRequired => 'املأ هذا الخيار أو احذفه.';

  @override
  String get teacherRemoveOption => 'حذف الخيار';

  @override
  String get teacherAddOption => 'إضافة خيار';

  @override
  String get teacherPoints => 'النقاط';

  @override
  String get teacherAttendanceBreakdown => 'التفصيل';

  @override
  String teacherAttendanceRate(String rate) {
    return 'حضر $rate';
  }

  @override
  String teacherAttendanceFiltered(String mark) {
    return 'يُعرض «$mark» فقط. اضغط مرة أخرى لعرض الجميع.';
  }

  @override
  String teacherTodayAt(String time) {
    return 'اليوم $time';
  }

  @override
  String teacherTomorrowAt(String time) {
    return 'غدًا $time';
  }

  @override
  String get teacherNoUpcomingSessions =>
      'لا حصص قادمة هذا الأسبوع. أضف حصّة من صفّك.';

  @override
  String get teacherNextSession => 'الحصّة القادمة';

  @override
  String get teacherReschedule => 'نقل';

  @override
  String get teacherNeedsAtRisk => 'طلاب يتأخرون';

  @override
  String get teacherNeedsYou => 'بانتظارك';

  @override
  String get teacherNeedsGrade => 'أعمال للتصحيح';

  @override
  String get teacherNeedsReschedule => 'ردود على طلبات النقل';

  @override
  String get teacherNeedsProposals => 'مقترحات عليها ملاحظات';

  @override
  String get teacherNeedClassFirst => 'أنشئ صفًّا أولًا.';

  @override
  String get teacherProposeCourse => 'اقترح دورة';

  @override
  String get teacherPostAnnouncement => 'انشر إعلانًا';

  @override
  String get teacherUploadMaterial => 'رفع مادة';

  @override
  String get teacherQuickActions => 'إجراءات سريعة';

  @override
  String get teacherMyClasses => 'صفوفي';

  @override
  String get teacherSeeAll => 'عرض الكل';

  @override
  String teacherStudentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count طالب',
      many: '$count طالبًا',
      few: '$count طلاب',
      two: 'طالبان',
      one: 'طالب واحد',
      zero: 'لا طلاب',
    );
    return '$_temp0';
  }

  @override
  String get teacherEarningsSnapshot => 'الأرباح';

  @override
  String get teacherEarningsUnavailable => 'تعذّر تحميل الأرباح. اسحب للتحديث.';

  @override
  String get teacherThisPeriod => 'هذا الشهر';

  @override
  String get teacherNextPayout => 'المستحقات القادمة';

  @override
  String get teacherPayoutMissing =>
      'أضف طريقة لاستلام مستحقاتك حتى نتمكن من تحويلها إليك.';

  @override
  String get teacherAddPayoutMethod => 'إضافة';

  @override
  String get teacherFirstClassBody => 'اختر دورة وحدّد الموعد وأرسله للمراجعة.';

  @override
  String get teacherCreateFirstClass => 'أنشئ صفّك الأول';

  @override
  String get noSessionsToday => 'لا حصص اليوم. استمتع بالهدوء.';

  @override
  String rosterTitle(String code) {
    return 'قائمة $code';
  }

  @override
  String get enrolledLabel => 'المسجّلون';

  @override
  String get avgAttendance => 'متوسط الحضور';

  @override
  String get doneLabel => 'منجزة';

  @override
  String get searchStudents => 'ابحث عن طالب';

  @override
  String get atRisk => 'معرّضون للتعثر';

  @override
  String get waitlist => 'قائمة الانتظار';

  @override
  String messageAll(String code) {
    return 'راسل كل $code';
  }

  @override
  String get noStudents => 'لا طلاب بعد.';

  @override
  String get noTeacherBatches => 'لم تُسند إليك دفعات بعد.';

  @override
  String get prepTitle => 'تحضير الحصّة';

  @override
  String runOfShow(int min) {
    String _temp0 = intl.Intl.pluralLogic(
      min,
      locale: localeName,
      other: '$min دقيقة',
      many: '$min دقيقةً',
      few: '$min دقائق',
      two: 'دقيقتان',
      one: 'دقيقة واحدة',
      zero: '0 دقيقة',
    );
    return 'سير الحصّة · $_temp0';
  }

  @override
  String get addBlock => '+ أضف فقرة';

  @override
  String get blockLabel => 'عنوان الفقرة';

  @override
  String get atMinute => 'عند الدقيقة';

  @override
  String get filesForStudents => 'ملفات للطلاب';

  @override
  String get privateNotes => 'ملاحظات خاصة';

  @override
  String get reschedule => 'إعادة جدولة';

  @override
  String get openLobby => 'افتح غرفة الانتظار';

  @override
  String get moveSession => 'انقل هذه الحصّة';

  @override
  String get newDay => 'اليوم الجديد';

  @override
  String get startTime => 'وقت البدء';

  @override
  String get reason => 'السبب';

  @override
  String get notifyStudents => 'أبلغ الطلاب عند الموافقة';

  @override
  String get sendToAdmin => 'أرسل للإدارة للموافقة';

  @override
  String get adminReviews => 'تراجع الإدارة الطلبات خلال 24 ساعة.';

  @override
  String get requestSent => 'أُرسل الطلب إلى الإدارة.';

  @override
  String get attendanceSummary => 'ملخص الحضور';

  @override
  String get present => 'حاضر';

  @override
  String get late => 'متأخر';

  @override
  String get leftEarly => 'غادر مبكرًا';

  @override
  String get absent => 'غائب';

  @override
  String get attendanceRule =>
      'احتُسب الحضور من سجلات الانضمام والمغادرة في LiveKit. الحضور الكامل = 75% من مدة الحصّة على الأقل.';

  @override
  String publishRecording(String code) {
    return 'انشر التسجيل في $code';
  }

  @override
  String ranFor(String duration) {
    return 'استمرت $duration';
  }

  @override
  String get earningsTitle => 'الأرباح';

  @override
  String get earnedSoFar => 'المكتسب هذا الشهر حتى الآن';

  @override
  String nextPayoutOn(String date) {
    return 'تُصرف $date';
  }

  @override
  String get displayOnly => 'للعرض فقط: تُصرف المستحقات دائمًا بالدرهم.';

  @override
  String get pendingLabel => 'معلّق';

  @override
  String get scheduledRest => 'مجدولة لبقية الشهر';

  @override
  String get availableLabel => 'متاح';

  @override
  String get lifetimePaid => 'ما صُرف لك حتى الآن';

  @override
  String get byBatch => 'هذه الفترة حسب الدفعة';

  @override
  String get netRevenueNote =>
      'صافي الإيراد = التسجيلات المدفوعة − المبالغ المستردة − رسوم Stripe. أي استرداد بعد صرف المستحقات يُخصم من مستحقاتك التالية.';

  @override
  String get payoutMethod => 'طريقة استلام المستحقات';

  @override
  String get verified => 'موثّق';

  @override
  String get unverified => 'بانتظار التوثيق';

  @override
  String get bankName => 'البنك';

  @override
  String get accountHolder => 'صاحب الحساب';

  @override
  String get iban => 'الآيبان';

  @override
  String get swift => 'سويفت';

  @override
  String get payoutCurrency => 'عملة المستحقات';

  @override
  String get changeBank => 'غيّر الحساب البنكي';

  @override
  String get addBank => 'أضف حسابًا بنكيًا';

  @override
  String get changeBankNote =>
      'يُعاد توثيق الحساب الجديد قبل صرف المستحقات التالية، ويتوقف الصرف حتى تتم الموافقة.';

  @override
  String get history => 'السجل';

  @override
  String get noPayouts => 'لا مستحقات بعد.';

  @override
  String get noBankDetails => 'أضف حسابًا بنكيًا إماراتيًا لاستلام المستحقات.';

  @override
  String get ibanInvalid => 'آيبان إماراتي: AE + 21 رقمًا';

  @override
  String get swiftInvalid => '8 أو 11 حرفًا/رقمًا';

  @override
  String sessionsDelivered(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n حصّة منجزة',
      many: '$n حصّةً منجزة',
      few: '$n حصص منجزة',
      two: 'حصّتان منجزتان',
      one: 'حصّة واحدة منجزة',
      zero: 'لا حصص منجزة',
    );
    return '$_temp0';
  }

  @override
  String opsGreeting(String name) {
    return 'العمليات، $name';
  }

  @override
  String get onAirLabel => 'مباشر الآن';

  @override
  String roomsPeople(int rooms, int people) {
    String _temp0 = intl.Intl.pluralLogic(
      rooms,
      locale: localeName,
      other: '$rooms غرفة',
      many: '$rooms غرفةً',
      few: '$rooms غرف',
      two: 'غرفتان',
      one: 'غرفة واحدة',
      zero: 'لا غرف',
    );
    String _temp1 = intl.Intl.pluralLogic(
      people,
      locale: localeName,
      other: '$people شخص',
      many: '$people شخصًا',
      few: '$people أشخاص',
      two: 'شخصان',
      one: 'شخص واحد',
      zero: 'لا أحد',
    );
    return '$_temp0 · $_temp1';
  }

  @override
  String get sessionsToday => 'حصص اليوم';

  @override
  String get activeBatches => 'دفعات نشطة';

  @override
  String get revenueMonth => 'إيراد الشهر';

  @override
  String get seatsFilled => 'المقاعد المشغولة';

  @override
  String get needsYou => 'بانتظارك';

  @override
  String get noAlerts => 'لا شيء يحتاج قرارًا الآن.';

  @override
  String get liveMonitorTitle => 'مباشر الآن';

  @override
  String autoRefresh(String s) {
    return 'تحديث تلقائي $s ث';
  }

  @override
  String liveN(String n) {
    return '$n مباشر';
  }

  @override
  String get joinSilently => 'انضم بصمت';

  @override
  String get noLiveRooms => 'لا حصص مباشرة الآن.';

  @override
  String participantsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n شخص',
      many: '$n شخصًا',
      few: '$n أشخاص',
      two: 'شخصان',
      one: 'شخص واحد',
      zero: 'لا أحد',
    );
    return '$_temp0';
  }

  @override
  String get recordingOn => 'يُسجَّل';

  @override
  String get batchesTitle => 'الدفعات';

  @override
  String get seatsLabel => 'مقاعد';

  @override
  String get nextSession => 'الحصّة التالية';

  @override
  String get teacherLabel => 'المعلّم';

  @override
  String sessionsRun(int done, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total حصّة',
      many: '$total حصّةً',
      few: '$total حصص',
      two: 'حصّتين',
      one: 'حصّة واحدة',
    );
    return 'انعقدت $done من $_temp0';
  }

  @override
  String get transfersToVerify => 'تحويلات للتحقق';

  @override
  String get payoutRuns => 'صرف المستحقات';

  @override
  String get noTransfers => 'لا تحويلات بانتظار التحقق.';

  @override
  String get noPayoutRuns => 'لا عمليات صرف بعد.';

  @override
  String transferTitle(String ref) {
    return 'التحويل $ref';
  }

  @override
  String get receiptPreview => 'معاينة الإيصال';

  @override
  String get openFullSize => 'افتح بالحجم الكامل';

  @override
  String get noReceipt => 'لم يُرفع إيصال بعد.';

  @override
  String get studentLabel => 'الطالب';

  @override
  String get batchLabel => 'الدفعة';

  @override
  String get expected => 'المتوقع';

  @override
  String get receivedStatement => 'المستلم (كشف البنك، درهم)';

  @override
  String get rejectReason => 'سبب الرفض (عند الرفض)';

  @override
  String get reasonShort => 'المبلغ ناقص';

  @override
  String get reasonReference => 'المرجع مفقود';

  @override
  String get reasonUnreadable => 'الإيصال غير مقروء';

  @override
  String get reasonNotReceived => 'لم يصل بعد';

  @override
  String get reject => 'رفض';

  @override
  String get approve => 'موافقة';

  @override
  String get decline => 'رفض الطلب';

  @override
  String get approveEnroll => 'وافق وسجّل';

  @override
  String get requestNewReceipt => 'اطلب إيصالًا جديدًا';

  @override
  String get reviewDone => 'حُفظ القرار.';

  @override
  String payoutRunTitle(String period) {
    return 'صرف المستحقات · $period';
  }

  @override
  String get awaitingApproval => 'بانتظار الموافقة';

  @override
  String totalTeachers(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n معلّم',
      many: '$n معلّمًا',
      few: '$n معلّمين',
      two: 'معلّمان',
      one: 'معلّم واحد',
      zero: 'لا معلّمين',
    );
    return 'الإجمالي · $_temp0';
  }

  @override
  String heldNote(String n) {
    return '$n معلّقة: الحساب البنكي غير موثّق أو أقل من الحد الأدنى.';
  }

  @override
  String approvePayouts(int n, String amount) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'اعتمد مستحقات $n معلّم · $amount',
      many: 'اعتمد مستحقات $n معلّمًا · $amount',
      few: 'اعتمد مستحقات $n معلّمين · $amount',
      two: 'اعتمد مستحقات معلّمَين · $amount',
      one: 'اعتمد مستحقات معلّم واحد · $amount',
      zero: 'لا مستحقات للاعتماد',
    );
    return '$_temp0';
  }

  @override
  String get downloadFile => 'نزّل ملف التحويل البنكي';

  @override
  String get runApproved => 'اعتُمدت عملية الصرف.';

  @override
  String get held => 'معلّقة';

  @override
  String get ready => 'جاهزة';

  @override
  String get paidLabel => 'مدفوعة';

  @override
  String get carriedOver => 'مُرحّلة';

  @override
  String alertTransfersToVerify(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n تحويل بنكي بانتظار التحقق',
      many: '$n تحويلًا بنكيًا بانتظار التحقق',
      few: '$n تحويلات بنكية بانتظار التحقق',
      two: 'تحويلان بنكيان بانتظار التحقق',
      one: 'تحويل بنكي واحد بانتظار التحقق',
      zero: 'لا تحويلات بانتظار التحقق',
    );
    return '$_temp0';
  }

  @override
  String alertSeatHoldsExpiring(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'ينتهي $n حجز خلال 24 ساعة',
      many: 'ينتهي $n حجزًا خلال 24 ساعة',
      few: 'تنتهي $n حجوزات مقاعد خلال 24 ساعة',
      two: 'ينتهي حجزا مقعدين خلال 24 ساعة',
      one: 'ينتهي حجز مقعد واحد خلال 24 ساعة',
      zero: 'لا حجوزات تنتهي خلال 24 ساعة',
    );
    return '$_temp0';
  }

  @override
  String alertTeacherBankUnverified(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'حسابات $n معلّم البنكية بانتظار التحقق',
      many: 'حسابات $n معلّمًا البنكية بانتظار التحقق',
      few: 'حسابات $n معلّمين البنكية بانتظار التحقق',
      two: 'الحسابان البنكيان لمعلّمَين بانتظار التحقق',
      one: 'الحساب البنكي لمعلّم واحد بانتظار التحقق',
      zero: 'لا حسابات بنكية بانتظار التحقق',
    );
    return '$_temp0';
  }

  @override
  String alertPayoutsHeld(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'مستحقات $n معلّم معلّقة',
      many: 'مستحقات $n معلّمًا معلّقة',
      few: 'مستحقات $n معلّمين معلّقة',
      two: 'مستحقات معلّمَين معلّقة',
      one: 'مستحقات معلّم واحد معلّقة',
      zero: 'لا مستحقات معلّقة',
    );
    return '$_temp0';
  }

  @override
  String rescheduleRequestTitle(String teacher, String slate) {
    return '$teacher يطلب نقل $slate';
  }

  @override
  String get newPayoutRun => 'عملية صرف جديدة';

  @override
  String get myRescheduleRequests => 'طلباتي';

  @override
  String get requestPending => 'قيد المراجعة';

  @override
  String get requestApproved => 'تمت الموافقة';

  @override
  String get requestDeclined => 'مرفوض';

  @override
  String get videoDevMode =>
      'الفيديو متوقف في هذه البيئة (LiveKit غير مُعدّ). الدردشة ورفع اليد ما زالا يعملان.';

  @override
  String get certificatesTitle => 'الشهادات';

  @override
  String get certificatesEmptyTitle => 'دليل على ما تعلّمته';

  @override
  String get certificatesEmptyBody =>
      'احضر 80% على الأقل من حصص صفّك المباشرة، وستظهر شهادتك هنا عند انتهاء الصفّ. ويمكن لأي شخص التحقق منها.';

  @override
  String get certificatesEarned => 'المكتسبة';

  @override
  String get certificatesInProgress => 'قيد التقدّم';

  @override
  String certificateAttended(String attended, String total) {
    return 'الحضور $attended/$total';
  }

  @override
  String certificateWithTeacher(String name) {
    return 'مع $name';
  }

  @override
  String certificateSessionsNeeded(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'يلزم حضور $n حصّة أخرى',
      many: 'يلزم حضور $n حصّةً أخرى',
      few: 'يلزم حضور $n حصص أخرى',
      two: 'يلزم حضور حصّتين أخريين',
      one: 'يلزم حضور حصّة واحدة أخرى',
      zero: 'لا يلزم حضور حصص أخرى',
    );
    return '$_temp0';
  }

  @override
  String get certificateOneSessionNeeded => 'يلزم حضور حصّة واحدة أخرى';

  @override
  String get certificateRequirementMet =>
      'اكتمل الحضور المطلوب — تصدر شهادتك عند انتهاء الصفّ.';

  @override
  String get certificateUnreachable =>
      'لم تعد الحصص المتبقية كافية لبلوغ 80% في هذا الصفّ.';

  @override
  String certificateAttendedOfRequired(int attended, int required) {
    String _temp0 = intl.Intl.pluralLogic(
      required,
      locale: localeName,
      other: '$required حصّة مطلوبة للحصول عليها',
      many: '$required حصّةً مطلوبة للحصول عليها',
      few: '$required حصص مطلوبة للحصول عليها',
      two: 'حصّتين مطلوبتين للحصول عليها',
      one: 'حصّة واحدة مطلوبة للحصول عليها',
    );
    return 'حضرت $attended من $_temp0';
  }

  @override
  String get certificateNew => 'جديدة';

  @override
  String get certificateOfCompletion => 'شهادة إتمام';

  @override
  String get certificateAwardedTo => 'تُمنح إلى';

  @override
  String get certificateForCompleting => 'لإتمام دورة';

  @override
  String get certificateBatch => 'الصفّ';

  @override
  String get certificateTeacher => 'المعلّم';

  @override
  String get certificateIssued => 'تاريخ الإصدار';

  @override
  String get certificateDates => 'المدة';

  @override
  String get certificateVerifyCode => 'رمز التحقق';

  @override
  String get certificateShare => 'مشاركة';

  @override
  String get certificateLinkCopied => 'تم نسخ رابط التحقق';

  @override
  String get certificateCompleteTitle => 'اكتملت الدورة.';

  @override
  String certificateCompleteBody(int attended, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total حصّة مباشرة.',
      many: '$total حصّةً مباشرة.',
      few: '$total حصص مباشرة.',
      two: 'حصّتين مباشرتين.',
      one: 'حصّة مباشرة واحدة.',
    );
    return 'حضرت $attended من $_temp0';
  }

  @override
  String certificateVerifyHint(String url) {
    return 'دليل على المهارة. يمكن لأي شخص التحقق منها عبر $url';
  }

  @override
  String waitlistPosition(String position, String total) {
    return 'رقم $position في الدور · من $total';
  }

  @override
  String get waitlistNextInLine => 'أنت التالي في الدور';

  @override
  String startsOnDate(String date) {
    return 'تبدأ $date';
  }

  @override
  String waitlistJoinedOn(String date) {
    return 'انضممت في $date';
  }

  @override
  String get waitlistWhatNext => 'ماذا يحدث بعد ذلك';

  @override
  String get waitlistStepSeat =>
      'عندما يتوفر مكان، يُعرض على أول شخص في الدور.';

  @override
  String get waitlistStepNotify =>
      'سنرسل لك إشعارًا وبريدًا إلكترونيًا فور أن يصبح المكان لك.';

  @override
  String get waitlistStepHold =>
      'سيكون أمامك 24 ساعة لإتمام الدفع قبل أن ينتقل المكان إلى التالي.';

  @override
  String get waitlistNoCharge => 'لا يُخصم أي مبلغ أثناء الانتظار.';

  @override
  String get waitlistLeave => 'مغادرة قائمة الانتظار';

  @override
  String get waitlistLeaveConfirmTitle => 'مغادرة قائمة الانتظار؟';

  @override
  String waitlistLeaveConfirmBody(String batch) {
    return 'ستفقد مكانك في $batch. وإذا انضممت لاحقًا فستبدأ من آخر الدور.';
  }

  @override
  String get waitlistStay => 'البقاء في الدور';

  @override
  String get waitlistLeft => 'غادرت قائمة الانتظار';

  @override
  String get waitlistSeatOpen => 'توفّر مكان لك';

  @override
  String waitlistHeldFor(String time) {
    return 'محجوز لك · $time';
  }

  @override
  String get waitlistHoldExpired => 'انتهت مدة الحجز';

  @override
  String get waitlistClaimSeat => 'احجز مكانك';

  @override
  String get teacherAbout => 'نبذة';

  @override
  String get teacherTeachesIn => 'يدرّس باللغة';

  @override
  String get teacherCourses => 'الدورات';

  @override
  String get teacherUpcomingBatches => 'الصفوف القادمة';

  @override
  String get teacherViewProfile => 'عرض الملف الشخصي';

  @override
  String get teacherBatchFull => 'مكتملة';

  @override
  String get certificateAttendance => 'الحضور';

  @override
  String waitlistOfTotal(String total) {
    return 'من $total';
  }

  @override
  String get deleteAccount => 'حذف الحساب';

  @override
  String get deleteAccountTitle => 'هل تريد حذف حسابك؟';

  @override
  String get deleteAccountBody =>
      'سيُحذف ملفك الشخصي وتسجيلاتك وشهاداتك ورسائلك نهائيًا. تُحفظ سجلات الدفع دون اسمك لأغراض المحاسبة. لا يمكن التراجع عن ذلك.';

  @override
  String get deleteAccountTypeHint => 'اكتب DELETE للتأكيد';

  @override
  String get deleteAccountConfirm => 'حذف نهائيًا';

  @override
  String get deleteAccountFailed =>
      'تعذّر حذف الحساب. حاول مجددًا أو تواصل مع الدعم.';

  @override
  String get deleteAccountTeacher =>
      'لا يمكن للمعلّمين والمشرفين حذف حساباتهم ما دامت لديهم دفعات. تواصل مع الدعم.';

  @override
  String get privacyPolicy => 'سياسة الخصوصية';

  @override
  String get termsOfService => 'شروط الخدمة';

  @override
  String get legal => 'قانوني';

  @override
  String get termsLead => 'بالمتابعة فإنك توافق على';

  @override
  String get andLabel => 'و';

  @override
  String get deleteAccountOrderPending =>
      'يجري التحقق من تحويل بنكي لأحد طلباتك. حاول مجددًا بعد تسويته.';

  @override
  String get appearance => 'المظهر';

  @override
  String get themeSystem => 'النظام';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get themeSystemHint => 'مطابقة إعداد هاتفك';

  @override
  String get pushNotifications => 'الإشعارات';

  @override
  String get pushOn => 'مفعّلة';

  @override
  String get pushOff => 'متوقفة';

  @override
  String get pushSettingsHint =>
      'غيّر الإشعارات من إعدادات هاتفك ← التطبيقات ← عازة.';

  @override
  String get forgotPassword => 'نسيت كلمة المرور؟';

  @override
  String get forgotPasswordBody =>
      'أدخل بريد حسابك وسنرسل لك رابطًا لاختيار كلمة مرور جديدة.';

  @override
  String get sendResetLink => 'إرسال رابط إعادة التعيين';

  @override
  String get resetLinkSent =>
      'إن كان لهذا البريد حساب، فرابط إعادة التعيين في طريقه إليك.';

  @override
  String get showPassword => 'إظهار كلمة المرور';

  @override
  String get hidePassword => 'إخفاء كلمة المرور';

  @override
  String get errNetwork => 'لا يوجد اتصال بعازة. تحقّق من الشبكة وحاول مجددًا.';

  @override
  String get errTimeout => 'استغرقت عازة وقتًا طويلًا للرد. حاول مجددًا.';

  @override
  String get errCancelled => 'أُلغي.';

  @override
  String get errSignedOut => 'انتهت جلستك. سجّل الدخول مجددًا.';

  @override
  String get errForbidden => 'لا تملك صلاحية الوصول إلى هذا.';

  @override
  String get errNotFound => 'لم نعثر على ذلك. ربما أُزيل.';

  @override
  String get errBadCredentials => 'البريد وكلمة المرور غير متطابقين.';

  @override
  String get errEmailTaken => 'يوجد حساب بهذا البريد. جرّب تسجيل الدخول.';

  @override
  String get errTooMany => 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.';

  @override
  String get errServer => 'حدث خطأ من جهتنا. حاول بعد قليل.';

  @override
  String get errGeneric => 'حدث خطأ ما. حاول مجددًا.';

  @override
  String get profileSaved => 'حُفظ الملف الشخصي.';

  @override
  String get timezoneHint =>
      'تُعرض مواعيد الحصص المباشرة بهذه المنطقة الزمنية.';

  @override
  String useDeviceTimezone(String zone) {
    return 'استخدم المنطقة الزمنية لهذا الهاتف: $zone';
  }

  @override
  String get changePassword => 'تغيير كلمة المرور';

  @override
  String get currentPassword => 'كلمة المرور الحالية';

  @override
  String get newPassword => 'كلمة المرور الجديدة';

  @override
  String get passwordChanged =>
      'تغيّرت كلمة المرور. سُجّل الخروج من الأجهزة الأخرى.';

  @override
  String get changePasswordNote =>
      'تغيير كلمة المرور يسجّل خروجك من أجهزتك الأخرى.';

  @override
  String get payAppStore => 'App Store';

  @override
  String get payAppStoreSub => 'شراء داخل التطبيق، يُخصم من حساب Apple';

  @override
  String get payWithAppStore => 'الدفع عبر App Store';

  @override
  String get appStoreNote =>
      'تتولى Apple عملية الدفع. يُؤكَّد مكانك فور اكتمال الشراء.';

  @override
  String appStoreBuy(String price) {
    return 'شراء · $price';
  }

  @override
  String get appStoreConfirming => 'جارٍ تأكيد عملية الشراء…';

  @override
  String get appStorePending =>
      'بانتظار الموافقة. سنسجّلك فور تأكيد App Store لعملية الشراء.';

  @override
  String get appStoreFailed => 'لم تكتمل عملية الشراء.';

  @override
  String get appStoreUnavailable =>
      'المشتريات داخل التطبيق غير متاحة على هذا الجهاز.';

  @override
  String get appStoreRetryLater =>
      'تعذّر تأكيد عملية الشراء الآن. لا تقلق — سنعيد المحاولة تلقائيًا عند فتح التطبيق مرة أخرى.';

  @override
  String get appStoreRejected =>
      'تعذّر تطبيق عملية الشراء على طلبك. تواصل مع الدعم — يمكن لـ Apple استرداد المبلغ.';

  @override
  String get enrolOnWebsite => 'التسجيل عبر موقعنا الإلكتروني';

  @override
  String get enrolOnWebsiteBody => 'هذا الصفّ غير متاح للشراء داخل التطبيق.';

  @override
  String get clear => 'مسح';

  @override
  String get accountTitle => 'الحساب';

  @override
  String get accountRowHint => 'الصورة، كلمة المرور، الحذف';

  @override
  String get profileSection => 'الملف الشخصي';

  @override
  String get changePhoto => 'تغيير الصورة';

  @override
  String get emailLockedNote => 'بريد تسجيل الدخول. تواصل مع الدعم لتغييره.';

  @override
  String get useThisPhone => 'منطقة هذا الهاتف';

  @override
  String get saveChanges => 'حفظ التغييرات';

  @override
  String get currentPasswordRequired => 'أدخل كلمة المرور الحالية.';

  @override
  String get dangerZone => 'منطقة الخطر';

  @override
  String get deleteAccountSummary =>
      'احذف حسابك وتسجيلاتك وشهاداتك نهائيًا. لا يمكن التراجع عن ذلك.';

  @override
  String get takePhoto => 'التقط صورة';

  @override
  String get chooseFromLibrary => 'اختر من الصور';

  @override
  String get photoPickFailed =>
      'تعذّر فتح الكاميرا أو الصور. تحقّق من أذونات عازة في الإعدادات.';

  @override
  String get addPhotoTitle => 'أضف صورتك';

  @override
  String get addPhotoBody =>
      'يرى معلّمك صورتك في قائمة الصف وفي الحصص المباشرة ليعرف من في الصفّ.';

  @override
  String get addPhotoTips =>
      'استخدم صورة واضحة وحديثة لوجهك. لا يراها إلا معلّموك وزملاؤك.';

  @override
  String get addPhotoAction => 'أضف صورة';

  @override
  String get watchIntro => 'شاهد المقدمة';

  @override
  String get watchIntroHint => 'لمحة قصيرة عن الدورة والمعلّم';

  @override
  String get statusPendingReview => 'بانتظار المراجعة';

  @override
  String get statusPublished => 'منشورة';

  @override
  String get statusArchived => 'مؤرشفة';

  @override
  String get myCoursesTitle => 'دوراتي';

  @override
  String get proposeCourse => 'اقترح دورة';

  @override
  String get noProposedCourses => 'لم تقترح أي دورة بعد.';

  @override
  String get noProposedCoursesBody =>
      'اقترح دورة وسيراجعها أحد المشرفين قبل نشرها.';

  @override
  String get changesRequested => 'مطلوب تعديلات';

  @override
  String get waitingForReviewBody =>
      'يراجع أحد المشرفين هذا الآن، ولا يزال بإمكانك إجراء تعديلات.';

  @override
  String get publishedLockedBody =>
      'هذه الدورة منشورة. اطلب من أحد المشرفين إن احتاجت إلى تعديل.';

  @override
  String get editCourse => 'تعديل الدورة';

  @override
  String get newCourse => 'دورة جديدة';

  @override
  String get courseBasics => 'الأساسيات';

  @override
  String get courseTitleEn => 'العنوان (بالإنجليزية)';

  @override
  String get courseTitleAr => 'العنوان (بالعربية)';

  @override
  String get courseCategory => 'التصنيف';

  @override
  String get courseLevel => 'المستوى';

  @override
  String get levelBeginner => 'مبتدئ';

  @override
  String get levelIntermediate => 'متوسط';

  @override
  String get levelAdvanced => 'متقدم';

  @override
  String get coursePriceAed => 'السعر (بالدرهم)';

  @override
  String get courseDescription => 'الوصف';

  @override
  String get descriptionEn => 'الوصف (بالإنجليزية)';

  @override
  String get descriptionAr => 'الوصف (بالعربية)';

  @override
  String get descriptionHint => '20 حرفًا على الأقل.';

  @override
  String get coverPhoto => 'صورة الغلاف';

  @override
  String get addCoverPhoto => 'أضف صورة غلاف';

  @override
  String get changeCoverPhoto => 'غيّر الصورة';

  @override
  String get removeCoverPhoto => 'أزل الصورة';

  @override
  String get coverPhotoHint =>
      'من دون صورة، يظهر عنوان الدورة على اللون أدناه.';

  @override
  String get coverColour => 'لون الغلاف';

  @override
  String get coverSun => 'شمسي';

  @override
  String get coverSky => 'سماوي';

  @override
  String get coverSage => 'أخضر هادئ';

  @override
  String get coverPeach => 'خوخي';

  @override
  String get modulesTitle => 'الوحدات';

  @override
  String moduleTitleEn(String n) {
    return 'الوحدة $n (بالإنجليزية)';
  }

  @override
  String moduleTitleAr(String n) {
    return 'الوحدة $n (بالعربية)';
  }

  @override
  String get addModule => 'أضف وحدة';

  @override
  String get removeModule => 'احذف الوحدة';

  @override
  String get moveUp => 'انقل لأعلى';

  @override
  String get moveDown => 'انقل لأسفل';

  @override
  String get noModulesYet => 'أضف وحدة واحدة على الأقل قبل الإرسال.';

  @override
  String get saveDraft => 'احفظ المسودة';

  @override
  String get submitForReview => 'أرسل للمراجعة';

  @override
  String get draftSaved => 'حُفظت المسودة.';

  @override
  String get sentForReview => 'أُرسلت للمراجعة.';

  @override
  String get titleRequired => 'أضف عنوانًا بالإنجليزية.';

  @override
  String get descriptionTooShort =>
      'اكتب 20 حرفًا على الأقل في الوصف الإنجليزي.';

  @override
  String get categoryRequired => 'أضف تصنيفًا.';

  @override
  String get priceInvalid => 'أدخل السعر بالدرهم.';

  @override
  String get moduleTitleRequired => 'تحتاج كل وحدة إلى عنوان بالإنجليزية.';

  @override
  String get uploadingPhoto => 'جارٍ الرفع…';

  @override
  String get newBatch => 'دفعة جديدة';

  @override
  String get batchCourse => 'الدورة';

  @override
  String get pickCourse => 'اختر دورة';

  @override
  String get noBatchableCourses => 'لا توجد دورات بعد. اقترح دورة أولًا.';

  @override
  String get batchCode => 'رمز الدفعة';

  @override
  String get batchCodeHint => 'حرف B ثم 2–4 أرقام، مثل B07';

  @override
  String get batchCodeInvalid => 'استخدم حرف B ثم 2–4 أرقام، مثل B07.';

  @override
  String get batchSeats => 'المقاعد';

  @override
  String get seatsInvalid => 'يجب أن يكون عدد المقاعد بين 1 و500.';

  @override
  String get sessionLanguage => 'لغة الحصص';

  @override
  String get languageEnglish => 'الإنجليزية';

  @override
  String get languageArabic => 'العربية';

  @override
  String get firstDay => 'اليوم الأول';

  @override
  String get weekdaysLabel => 'الأيام';

  @override
  String get pickWeekdays => 'اختر يومًا واحدًا على الأقل.';

  @override
  String get sessionLength => 'المدة (بالدقائق)';

  @override
  String get lengthInvalid => 'يجب أن تكون المدة بين 15 و480 دقيقة.';

  @override
  String get sessionCountLabel => 'عدد الحصص';

  @override
  String get sessionCountInvalid => 'يجب أن يكون عدد الحصص بين 1 و200.';

  @override
  String get previewSchedule => 'اعرض الجدول';

  @override
  String lastSessionOn(String date) {
    return 'آخر حصّة $date';
  }

  @override
  String conflictCount(String count) {
    return 'تعارضات مع دفعاتك الأخرى: $count';
  }

  @override
  String conflictWith(String batch) {
    return 'تتعارض مع $batch';
  }

  @override
  String get noConflicts => 'لا تعارض مع دفعاتك الأخرى.';

  @override
  String get createBatch => 'أنشئ الدفعة';

  @override
  String get batchCreated => 'حُفظت الدفعة كمسودة.';

  @override
  String get batchDraftBody =>
      'هذه الدفعة مسودة. أرسلها ليفتح أحد المشرفين باب التسجيل.';

  @override
  String get batchPendingBody => 'يراجع أحد المشرفين هذه الدفعة.';

  @override
  String get toReviewTab => 'للمراجعة';

  @override
  String get coursesSection => 'الدورات';

  @override
  String get batchesSection => 'الدفعات';

  @override
  String get noPendingReviews => 'لا شيء بانتظار المراجعة.';

  @override
  String get sendBack => 'أعِد للتعديل';

  @override
  String get sendBackTitle => 'ما الذي يحتاج إلى تعديل؟';

  @override
  String get sendBackNote => 'ملاحظة للمعلّم';

  @override
  String get sendBackNoteTooShort => 'اكتب 3 أحرف على الأقل.';

  @override
  String submittedOn(String date) {
    return 'أُرسلت في $date';
  }

  @override
  String modulesCount(String count) {
    return 'الوحدات: $count';
  }

  @override
  String proposedBy(String name) {
    return 'من $name';
  }

  @override
  String get errCourseLocked => 'هذه الدورة منشورة، لذا لا يعدّلها إلا مشرف.';

  @override
  String get errCourseIncomplete =>
      'أضف وصفًا من 20 حرفًا على الأقل ووحدة واحدة قبل الإرسال.';

  @override
  String get errAlreadySubmitted => 'هذا بانتظار المراجعة بالفعل.';

  @override
  String get errCourseNotPublished => 'وافق على الدورة قبل دفعاتها.';

  @override
  String get errBatchLocked => 'هذه الدفعة معتمدة، لذا لا يعدّلها إلا مشرف.';

  @override
  String get errNotPendingReview => 'لم يعد هذا بانتظار المراجعة.';

  @override
  String get errScheduleConflict => 'لديك حصص في بعض هذه الأوقات.';

  @override
  String get errScheduleIncomplete =>
      'لا تتسع الحصص كلها في هذا الجدول. راجع الأيام والتواريخ.';

  @override
  String get errCourseArchived => 'هذه الدورة مؤرشفة.';

  @override
  String get whatYoullLearn => 'ماذا ستتعلم';

  @override
  String get requirementsTitle => 'المتطلبات';

  @override
  String get audienceTitle => 'لمن هذه الدورة';

  @override
  String get faqTitle => 'الأسئلة الشائعة';

  @override
  String totalHoursLive(String hours) {
    return '$hours ساعة مباشرة';
  }

  @override
  String ratingSemantics(String avg, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مراجعة',
      many: '$count مراجعةً',
      few: '$count مراجعات',
      two: 'مراجعتين',
      one: 'مراجعة واحدة',
      zero: 'لا مراجعات',
    );
    return 'التقييم $avg من 5 بحسب $_temp0';
  }

  @override
  String get reviewsTitle => 'المراجعات';

  @override
  String reviewsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مراجعة',
      many: '$count مراجعةً',
      few: '$count مراجعات',
      two: 'مراجعتان',
      one: 'مراجعة واحدة',
      zero: 'لا مراجعات',
    );
    return '$_temp0';
  }

  @override
  String get noReviewsYet => 'لا توجد مراجعات بعد.';

  @override
  String get loadMore => 'تحميل المزيد';

  @override
  String get writeReview => 'اكتب مراجعة';

  @override
  String get editReview => 'عدّل مراجعتك';

  @override
  String get yourReview => 'مراجعتك';

  @override
  String get reviewBodyLabel => 'ما الذي لفت انتباهك؟';

  @override
  String get ratingRequired => 'اختر تقييمًا بالنجوم.';

  @override
  String get postReview => 'انشر المراجعة';

  @override
  String get reviewSaved => 'شكرًا على مراجعتك.';

  @override
  String get deleteReview => 'احذف المراجعة';

  @override
  String get deleteReviewConfirm => 'هل تريد حذف مراجعتك؟';

  @override
  String get reviewDeleted => 'حُذفت المراجعة.';

  @override
  String starsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n نجمة',
      many: '$n نجمةً',
      few: '$n نجوم',
      two: 'نجمتان',
      one: 'نجمة واحدة',
      zero: 'بلا نجوم',
    );
    return '$_temp0';
  }

  @override
  String get replyAction => 'ردّ';

  @override
  String replyTo(String name) {
    return 'الرد على $name';
  }

  @override
  String get teacherReply => 'رد المعلّم';

  @override
  String get replyTooShort => 'اكتب حرفين على الأقل.';

  @override
  String get replySent => 'نُشر الرد.';

  @override
  String get hideReview => 'إخفاء';

  @override
  String get unhideReview => 'إظهار';

  @override
  String get hiddenLabel => 'مخفية';

  @override
  String get relatedTitle => 'قد يعجبك أيضًا';

  @override
  String get shareCourse => 'مشاركة';

  @override
  String get saveCourse => 'احفظ';

  @override
  String get unsaveCourse => 'أزل من المحفوظات';

  @override
  String get savedToast => 'حُفظت.';

  @override
  String get unsavedToast => 'أُزيلت من المحفوظات.';

  @override
  String get filters => 'التصفية';

  @override
  String get sortLabel => 'الترتيب حسب';

  @override
  String get sortNewest => 'الأحدث';

  @override
  String get sortRating => 'الأعلى تقييمًا';

  @override
  String get sortPriceAsc => 'السعر: من الأقل إلى الأعلى';

  @override
  String get sortPriceDesc => 'السعر: من الأعلى إلى الأقل';

  @override
  String get sortPopular => 'الأكثر رواجًا';

  @override
  String get anyOption => 'الكل';

  @override
  String get minRatingLabel => 'التقييم';

  @override
  String ratingAtLeast(String n) {
    return '$n+ نجوم';
  }

  @override
  String get priceRangeAed => 'نطاق السعر (بالدرهم)';

  @override
  String get minPrice => 'الأدنى';

  @override
  String get maxPrice => 'الأعلى';

  @override
  String get priceRangeInvalid => 'السعر الأدنى أعلى من السعر الأعلى.';

  @override
  String get applyFilters => 'اعرض النتائج';

  @override
  String get resetFilters => 'إعادة ضبط';

  @override
  String get featuredTitle => 'مختارة لك';

  @override
  String get savedCoursesTitle => 'الدورات المحفوظة';

  @override
  String get noSavedTitle => 'لا شيء محفوظ بعد.';

  @override
  String get noSavedBody => 'اضغط على القلب في أي دورة لتحتفظ بها هنا.';

  @override
  String bulletEn(String n) {
    return 'النقطة $n (بالإنجليزية)';
  }

  @override
  String bulletAr(String n) {
    return 'النقطة $n (بالعربية)';
  }

  @override
  String get addPoint => 'أضف نقطة';

  @override
  String get removePoint => 'احذف النقطة';

  @override
  String faqQuestionEn(String n) {
    return 'السؤال $n (بالإنجليزية)';
  }

  @override
  String faqAnswerEn(String n) {
    return 'الجواب $n (بالإنجليزية)';
  }

  @override
  String faqQuestionAr(String n) {
    return 'السؤال $n (بالعربية)';
  }

  @override
  String faqAnswerAr(String n) {
    return 'الجواب $n (بالعربية)';
  }

  @override
  String get addQuestion => 'أضف سؤالًا';

  @override
  String get removeQuestion => 'احذف السؤال';

  @override
  String get faqIncomplete => 'يحتاج كل سؤال إلى سؤال وجواب بالإنجليزية.';

  @override
  String moduleDescriptionEn(String n) {
    return 'وصف الوحدة $n (بالإنجليزية)';
  }

  @override
  String moduleDescriptionAr(String n) {
    return 'وصف الوحدة $n (بالعربية)';
  }

  @override
  String get errReviewNotEligible =>
      'يمكنك تقييم هذه الدورة بعد حضور إحدى حصصها المباشرة.';

  @override
  String get teacherRecordingsTitle => 'تسجيلاتك';

  @override
  String get teacherRecordingsLede =>
      'تُسجَّل كل حصّة تقدّمها تلقائيًا عند الضغط على «ابدأ». تظهر التسجيلات هنا بعد معالجتها، عادةً خلال ساعة.';

  @override
  String get teacherRecordingsEmpty => 'لا توجد تسجيلات بعد';

  @override
  String get shareRecording => 'شارك التسجيل أو احفظه';

  @override
  String get playRecording => 'شغّل التسجيل';

  @override
  String get instructorsTitle => 'المعلّمون';

  @override
  String get instructorsLede =>
      'من يدرّسون على عازة. افتح ملفًا لترى دوراته وصفوفه المفتوحة.';

  @override
  String get instructorsEmpty => 'لا يوجد معلّمون بعد';

  @override
  String get meetInstructors => 'تعرّف على المعلّمين';

  @override
  String get meetInstructorsHint => 'من يدرّس على عازة، وماذا يدرّس';

  @override
  String get allInstructors => 'كل المعلّمين';

  @override
  String instructorCoursesN(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count دورة',
      many: '$count دورةً',
      few: '$count دورات',
      two: 'دورتان',
      one: 'دورة واحدة',
      zero: 'لا دورات',
    );
    return '$_temp0';
  }

  @override
  String instructorOpenBatchesN(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count صفّ مفتوح',
      many: '$count صفًّا مفتوحًا',
      few: '$count صفوف مفتوحة',
      two: 'صفّان مفتوحان',
      one: 'صفّ واحد مفتوح',
      zero: 'لا صفوف مفتوحة',
    );
    return '$_temp0';
  }

  @override
  String get teachOnAzza => 'درّس على عازة';

  @override
  String get teachRowHint => 'قدّم طلبك';

  @override
  String get teachSignUpLink => 'تريد أن تدرّس على عازة؟';

  @override
  String get teachSignUpHint =>
      'أنشئ حسابك أولًا، ثم افتح «حسابي» ← «درّس على عازة» لتقديم طلبك.';

  @override
  String get teachPitchTitle => 'علّم ما تعرفه.';

  @override
  String get teachPitchBody =>
      'أرشد صفوفًا صغيرة من المتعلّمين في أنحاء المنطقة، بالعربية أو الإنجليزية، عبر الدروس والتدريب والحصص المباشرة. أخبرنا من أنت وماذا ستدرّس، ويراجع فريقنا كل طلب عادةً خلال أيام قليلة.';

  @override
  String get applySectionAbout => 'عنك';

  @override
  String get applySectionTeach => 'ما ستدرّسه';

  @override
  String get applySectionExperience => 'خبرتك';

  @override
  String get applySectionContact => 'روابط وتواصل';

  @override
  String get applyHeadline => 'العنوان التعريفي';

  @override
  String get applyHeadlineHint => 'مصممة منتجات · 8 سنوات في الوكالات';

  @override
  String get applyBio => 'نبذة قصيرة';

  @override
  String get applyBioHint =>
      'من أنت، وكيف تدرّس، ومن تساعد. 40 حرفًا على الأقل.';

  @override
  String get applyCategories => 'الفئات (من 1 إلى 5)';

  @override
  String get applyLanguages => 'لغات التدريس';

  @override
  String get applyExperience => 'خبرة التدريس';

  @override
  String get applyExperienceHint =>
      '3 سنوات من ورش نهاية الأسبوع لمجموعات من 20 بالغًا';

  @override
  String get applySample => 'رابط نموذج أو معرض أعمال (اختياري)';

  @override
  String get applySampleHint => 'https://example.com/portfolio';

  @override
  String get applyPhone => 'الهاتف (اختياري)';

  @override
  String get applyPhoneHint => '+971 50 123 4567';

  @override
  String get applySubmit => 'أرسل الطلب';

  @override
  String get applySent => 'أُرسل الطلب. سنخبرك بالقرار.';

  @override
  String get applyHeadlineInvalid => 'اكتب من 4 إلى 120 حرفًا.';

  @override
  String get applyBioInvalid => 'اكتب من 40 إلى 2000 حرف.';

  @override
  String get applyExperienceInvalid => 'اكتب من 20 إلى 1500 حرف.';

  @override
  String get applyCategoriesInvalid => 'اختر من فئة إلى 5 فئات.';

  @override
  String get applyLanguagesInvalid => 'اختر لغة واحدة على الأقل.';

  @override
  String get applyUrlInvalid => 'استخدم رابطًا كاملًا يبدأ بـ https://.';

  @override
  String get applyPendingTitle => 'طلبك قيد المراجعة';

  @override
  String get applyPendingBody =>
      'سنُعلمك فور صدور القرار. وفي الأثناء، تابع تعلّمك كالمعتاد.';

  @override
  String get applyRejectedTitle => 'لم تتم الموافقة على طلبك السابق';

  @override
  String get applyRejectedLead =>
      'ملاحظة المراجع أدناه، ويمكنك التقديم مجددًا.';

  @override
  String get applyApprovedTitle => 'يمكنك التدريس الآن';

  @override
  String get applyApprovedBody =>
      'حساب المعلّم جاهز. حدّث حسابك لتفتح استوديو المعلّم وتقترح دورتك الأولى.';

  @override
  String get applyRefresh => 'حدّث حسابي';

  @override
  String get refresh => 'تحديث';

  @override
  String get errAlreadyInstructor => 'أنت معلّم على عازة بالفعل.';

  @override
  String get errApplicationPending => 'طلبك قيد المراجعة بالفعل.';

  @override
  String get errApplicationDecided => 'صدر قرار بشأن هذا الطلب بالفعل.';

  @override
  String get instructorApplicationsSection => 'طلبات التدريس';

  @override
  String get applicantExperience => 'الخبرة';

  @override
  String get openSample => 'افتح النموذج';

  @override
  String get declineApplicationTitle => 'لماذا ترفض الطلب؟';

  @override
  String get declineNoteLabel => 'ملاحظة لمقدّم الطلب';

  @override
  String get declineNoteHint => 'يرجى إضافة نموذج تدريس قصير.';

  @override
  String get sendBackNoteHint => 'أضف وحدة عن الفُرش والورق.';

  @override
  String get nameHint => 'سارة كمال';

  @override
  String get emailHint => 'name@example.com';

  @override
  String get passwordHint => 'كلمة المرور';

  @override
  String get newPasswordHint => '8 أحرف على الأقل';

  @override
  String get errQuizTimeUp => 'انتهى وقت هذه المحاولة، فسُجّلت بدرجة 0.';

  @override
  String get errQuizClosed => 'هذا الاختبار مغلق.';

  @override
  String get errNoAttemptsLeft => 'لم تتبقَّ لديك محاولات في هذا الاختبار.';

  @override
  String get errAttemptNotStarted => 'ابدأ الاختبار قبل التسليم.';

  @override
  String get lessonsTitle => 'الدروس';

  @override
  String lessonsCountN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n درس',
      many: '$n درسًا',
      few: '$n دروس',
      two: 'درسان',
      one: 'درس واحد',
      zero: 'لا دروس',
    );
    return '$_temp0';
  }

  @override
  String lessonNofM(String n, String m) {
    return 'الدرس $n من $m';
  }

  @override
  String get lessonHasVideo => 'فيديو';

  @override
  String lessonAttachmentsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n مرفق',
      many: '$n مرفقًا',
      few: '$n مرفقات',
      two: 'مرفقان',
      one: 'مرفق واحد',
      zero: 'لا مرفقات',
    );
    return '$_temp0';
  }

  @override
  String get lessonAttachments => 'المرفقات';

  @override
  String get noLessons => 'لا توجد دروس بعد';

  @override
  String get noLessonsBody => 'لم يُضف معلّمك دروسًا لهذه الدورة بعد.';

  @override
  String get previousLesson => 'السابق';

  @override
  String get nextLesson => 'الدرس التالي';

  @override
  String get watchLessonVideo => 'شاهد فيديو الدرس';

  @override
  String get watchLessonVideoHint => 'يفتح في مشغّل الفيديو';

  @override
  String get videoOnYoutube => 'يفتح على YouTube';

  @override
  String get videoOnVimeo => 'يفتح على Vimeo';

  @override
  String get myQuizzesTitle => 'اختباراتي';

  @override
  String get quizzesTitle => 'الاختبارات';

  @override
  String get noQuizzes => 'لا توجد اختبارات بعد';

  @override
  String get noQuizzesBody => 'ستظهر هنا الاختبارات التي ينشرها معلّموك.';

  @override
  String get noQuestions => 'لا يحتوي هذا الاختبار على أسئلة.';

  @override
  String get quizzesToDo => 'للإنجاز';

  @override
  String get quizzesDone => 'منجزة';

  @override
  String get quizzesWebOnly =>
      'تُنشأ الاختبارات وتُعدَّل على الويب. هنا تتابع نتائج طلابك.';

  @override
  String get quizLabel => 'اختبار';

  @override
  String get quizOpen => 'متاح';

  @override
  String get quizInProgress => 'قيد الحل';

  @override
  String get quizSubmitted => 'مُسلَّم';

  @override
  String get quizMissed => 'فائت';

  @override
  String quizQuestionsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n سؤال',
      many: '$n سؤالًا',
      few: '$n أسئلة',
      two: 'سؤالان',
      one: 'سؤال واحد',
      zero: 'لا أسئلة',
    );
    return '$_temp0';
  }

  @override
  String quizMinutesN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n دقيقة',
      many: '$n دقيقةً',
      few: '$n دقائق',
      two: 'دقيقتان',
      one: 'دقيقة واحدة',
      zero: '0 دقيقة',
    );
    return '$_temp0';
  }

  @override
  String quizPointsN(String n) {
    return '$n نقاط';
  }

  @override
  String quizBest(String score) {
    return 'الأفضل $score';
  }

  @override
  String quizAttemptsUsed(String used, String max) {
    return 'المحاولات $used/$max';
  }

  @override
  String get quizQuestionsLabel => 'الأسئلة';

  @override
  String get quizPointsLabel => 'النقاط';

  @override
  String get quizTimeLimitLabel => 'المدة';

  @override
  String get quizNoTimeLimit => 'بلا حدّ زمني';

  @override
  String get quizAttemptsLabel => 'المحاولات';

  @override
  String get quizDueLabel => 'الموعد النهائي';

  @override
  String get quizBestScore => 'أفضل درجة لك';

  @override
  String get quizYourAttempts => 'محاولاتك';

  @override
  String get quizTimedOut => 'انتهى الوقت';

  @override
  String get quizStart => 'ابدأ الاختبار';

  @override
  String get quizTryAgain => 'حاول مرة أخرى';

  @override
  String get quizResume => 'تابع المحاولة';

  @override
  String get quizClosedNote => 'هذا الاختبار مغلق.';

  @override
  String get quizNoAttemptsNote => 'استخدمت كل محاولاتك.';

  @override
  String get quizUnavailableNote => 'لا يمكن بدء هذا الاختبار الآن.';

  @override
  String get quizStartTimedTitle => 'هل تبدأ المؤقّت؟';

  @override
  String quizStartTimedBody(int minutes) {
    String _temp0 = intl.Intl.pluralLogic(
      minutes,
      locale: localeName,
      other: '$minutes دقيقة',
      many: '$minutes دقيقةً',
      few: '$minutes دقائق',
      two: 'دقيقتان',
      one: 'دقيقة واحدة',
    );
    return 'سيكون لديك $_temp0 بعد البدء. عند انتهاء الوقت تُسلَّم إجاباتك تلقائيًا.';
  }

  @override
  String quizQuestionNofM(String n, String m) {
    return 'السؤال $n من $m';
  }

  @override
  String quizQuestionN(String n) {
    return 'السؤال $n';
  }

  @override
  String quizAnsweredN(String n) {
    return '$n مُجاب';
  }

  @override
  String get quizChooseOne => 'اختر إجابة واحدة';

  @override
  String get quizChooseAll => 'اختر كل ما ينطبق';

  @override
  String get quizPrevious => 'السابق';

  @override
  String get quizNext => 'التالي';

  @override
  String get quizSubmit => 'سلِّم';

  @override
  String get quizSubmitTitle => 'هل تسلّم إجاباتك؟';

  @override
  String quizAnsweredOf(int answered, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total سؤال.',
      many: '$total سؤالًا.',
      few: '$total أسئلة.',
      two: 'سؤالين.',
      one: 'سؤال واحد.',
    );
    return 'أجبت عن $answered من $_temp0';
  }

  @override
  String get quizUnansweredWarning => 'الأسئلة غير المُجابة درجتها 0.';

  @override
  String get quizAutoSubmitted => 'انتهى الوقت. سُلّمت إجاباتك.';

  @override
  String get quizLeaveTitle => 'هل تغادر الاختبار؟';

  @override
  String get quizLeaveBody => 'لن تُحفظ إجاباتك في هذه الشاشة.';

  @override
  String get quizLeaveTimedBody =>
      'لن تُحفظ إجاباتك في هذه الشاشة، ويستمر المؤقّت في العدّ.';

  @override
  String get quizKeepGoing => 'تابع';

  @override
  String get quizLeave => 'غادر';

  @override
  String quizTimeLeft(String time) {
    return 'الوقت المتبقي $time';
  }

  @override
  String get quizResultTitle => 'النتيجة';

  @override
  String quizAttemptN(String n) {
    return 'المحاولة $n';
  }

  @override
  String get quizYourScore => 'درجتك';

  @override
  String quizPointsOf(String score, String max) {
    return '$score من $max نقاط';
  }

  @override
  String get quizAnswersHidden =>
      'تظهر الإجابات الصحيحة بعد الموعد النهائي، أو بعد استخدام كل محاولاتك.';

  @override
  String get quizReviewAnswers => 'راجع إجاباتك';

  @override
  String get quizCorrect => 'صحيح';

  @override
  String get quizIncorrect => 'خطأ';

  @override
  String get quizPartial => 'صحيح جزئيًا';

  @override
  String get quizNotAnswered => 'بلا إجابة';

  @override
  String get quizBackToQuiz => 'العودة إلى الاختبار';

  @override
  String get quizResultsTitle => 'نتائج الاختبار';

  @override
  String quizStudentsAttempted(int students, int attempts) {
    String _temp0 = intl.Intl.pluralLogic(
      students,
      locale: localeName,
      other: 'حاول $students طالب',
      many: 'حاول $students طالبًا',
      few: 'حاول $students طلاب',
      two: 'حاول طالبان',
      one: 'حاول طالب واحد',
      zero: 'لم يحاول أي طالب',
    );
    String _temp1 = intl.Intl.pluralLogic(
      attempts,
      locale: localeName,
      other: '$attempts محاولة',
      many: '$attempts محاولةً',
      few: '$attempts محاولات',
      two: 'محاولتان',
      one: 'محاولة واحدة',
      zero: 'لا محاولات',
    );
    return '$_temp0 · $_temp1';
  }

  @override
  String get studentsLabel => 'الطلاب';

  @override
  String get quizAverage => 'المتوسط';

  @override
  String get quizNoAttemptsYet => 'لا محاولات بعد';

  @override
  String quizAttemptsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n محاولة',
      many: '$n محاولةً',
      few: '$n محاولات',
      two: 'محاولتان',
      one: 'محاولة واحدة',
      zero: 'لا محاولات',
    );
    return '$_temp0';
  }

  @override
  String get quizPerQuestion => 'حسب السؤال';

  @override
  String quizCorrectOfAnswered(String correct, String answered) {
    return '$correct من $answered صحيحة';
  }

  @override
  String get messagesTitle => 'الرسائل';

  @override
  String get messagesEmptyTitle => 'لا رسائل بعد';

  @override
  String get messagesEmptyBody => 'تظهر هنا محادثات صفوفك ورسائلك مع معلّمك.';

  @override
  String get classChat => 'محادثة الصفّ';

  @override
  String get messageYourTeacher => 'راسِل معلّمك';

  @override
  String get chatPrivateLabel => 'محادثة خاصة';

  @override
  String get chatNoMessagesYet => 'لا رسائل بعد. ابدأ المحادثة بتحيّة.';

  @override
  String get chatComposerLabel => 'رسالة';

  @override
  String get chatComposerHint => 'اكتب رسالة';

  @override
  String get chatClosedNote =>
      'انتهى هذا الصفّ، لذا أصبحت محادثته للقراءة فقط.';

  @override
  String get chatAdminReadOnly =>
      'يمكنك قراءة هذه المحادثة الخاصة، لكن لا يمكنك الردّ فيها.';

  @override
  String get chatLoadEarlier => 'عرض الرسائل الأقدم';

  @override
  String get chatMessageDeleted => 'حُذفت هذه الرسالة';

  @override
  String get chatDeleteMessage => 'احذف الرسالة';

  @override
  String get chatDeleteConfirmTitle => 'هل تريد حذف هذه الرسالة؟';

  @override
  String get chatDeleteConfirmBody => 'ستُحذف لدى كل من في المحادثة.';

  @override
  String get chatSendFailed => 'لم تُرسَل. اضغط لإعادة المحاولة.';

  @override
  String get chatSending => 'جارٍ الإرسال…';

  @override
  String chatUnreadN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n رسالة غير مقروءة',
      many: '$n رسالةً غير مقروءة',
      few: '$n رسائل غير مقروءة',
      two: 'رسالتان غير مقروءتين',
      one: 'رسالة واحدة غير مقروءة',
      zero: 'لا رسائل غير مقروءة',
    );
    return '$_temp0';
  }

  @override
  String get announcementsTitle => 'الإعلانات';

  @override
  String get announcementsEmpty => 'لا إعلانات بعد';

  @override
  String get announcementsEmptyBody => 'ستظهر هنا أخبار معلّميك وفريق عازة.';

  @override
  String get latestFromClasses => 'آخر أخبار صفوفك';

  @override
  String get pinnedLabel => 'مثبّت';

  @override
  String get fromAzzaTeam => 'فريق عازة';

  @override
  String get newAnnouncement => 'إعلان جديد';

  @override
  String get platformAnnouncement => 'إعلان للمنصّة';

  @override
  String get announcementTitleLabel => 'العنوان';

  @override
  String get announcementTitleRequired => 'أضِف عنوانًا للإعلان.';

  @override
  String get announcementBodyLabel => 'النص';

  @override
  String get announcementBodyHint =>
      'يمكنك استخدام Markdown: **خط عريض** وقوائم وروابط';

  @override
  String get announcementBodyRequired => 'اكتب نص الإعلان.';

  @override
  String get announcementAudience => 'مَن يراه';

  @override
  String get audienceAll => 'الجميع';

  @override
  String get audienceStudents => 'الطلاب';

  @override
  String get audienceTeachers => 'المعلّمون';

  @override
  String get announcementPin => 'ثبّته في الأعلى';

  @override
  String get announcementNotify => 'أرسِل إشعارًا';

  @override
  String get announcementNotifyClassHint =>
      'يصل طلابك إشعار داخل التطبيق وعلى الهاتف.';

  @override
  String get announcementNotifyPlatformHint =>
      'داخل التطبيق وعلى الهاتف وبالبريد الإلكتروني.';

  @override
  String get announcementPost => 'انشر';

  @override
  String get announcementPosted => 'نُشر الإعلان.';

  @override
  String get announcementDelete => 'احذف الإعلان';

  @override
  String get announcementDeleteConfirm => 'هل تريد حذف هذا الإعلان؟';

  @override
  String get helpSupport => 'المساعدة والدعم';

  @override
  String get helpSupportHint => 'اسأل فريق عازة';

  @override
  String get supportEmptyTitle => 'لا طلبات بعد';

  @override
  String get supportEmptyBody =>
      'تواجه مشكلة في الدفع أو في صفّك أو في حسابك؟ أخبرنا وسنساعدك.';

  @override
  String get newTicket => 'طلب جديد';

  @override
  String get newTicketIntro =>
      'أخبرنا بما يحدث، وسنردّ عليك هنا وبالبريد الإلكتروني.';

  @override
  String get ticketSubject => 'الموضوع';

  @override
  String get ticketSubjectHint => 'باختصار، ما المشكلة؟';

  @override
  String get ticketSubjectRequired => 'أضِف موضوعًا مختصرًا.';

  @override
  String get ticketCategory => 'النوع';

  @override
  String get supportCatPayment => 'الدفع';

  @override
  String get supportCatClass => 'الصفّ';

  @override
  String get supportCatAccount => 'الحساب';

  @override
  String get supportCatTechnical => 'مشكلة تقنية';

  @override
  String get supportCatOther => 'أخرى';

  @override
  String get ticketOrder => 'الطلب (اختياري)';

  @override
  String get ticketClass => 'الصفّ (اختياري)';

  @override
  String get ticketNone => 'بدون';

  @override
  String get ticketThisOrder => 'هذا الطلب';

  @override
  String get ticketThisClass => 'هذا الصفّ';

  @override
  String get ticketMessage => 'ماذا حدث؟';

  @override
  String get ticketMessageHint => 'ما الذي جرّبته، وما الذي ظهر لك';

  @override
  String get ticketMessageRequired => 'أخبرنا بما حدث.';

  @override
  String get ticketSubmit => 'أرسِل إلى الدعم';

  @override
  String get ticketCreated => 'وصلنا طلبك. سنردّ عليك هنا وبالبريد الإلكتروني.';

  @override
  String get ticketStatusOpen => 'مفتوح';

  @override
  String get ticketStatusAwaitingYou => 'بانتظار ردّك';

  @override
  String get ticketStatusAwaitingUser => 'بانتظار المستخدم';

  @override
  String get ticketStatusResolved => 'تمّ الحلّ';

  @override
  String get ticketNewReply => 'ردّ جديد';

  @override
  String get ticketReplyLabel => 'الردّ';

  @override
  String get ticketReplyHint => 'اكتب ردًّا';

  @override
  String get ticketMarkResolved => 'تمّ الحلّ';

  @override
  String get ticketResolvedNote => 'سُجّل الطلب على أنه محلول. شكرًا لإخبارنا.';

  @override
  String get ticketResolvedReopenHint =>
      'هذا الطلب محلول. اكتب ردًّا في أي وقت لإعادة فتحه.';

  @override
  String get ticketStaffLabel => 'دعم عازة';

  @override
  String get ticketSetStatus => 'غيّر الحالة';

  @override
  String get ticketStatusChanged => 'حُدّثت الحالة.';

  @override
  String get ticketFrom => 'من';

  @override
  String get ticketLinkedOrder => 'الطلب';

  @override
  String get ticketLinkedClass => 'الصفّ';

  @override
  String get supportInbox => 'صندوق الدعم';

  @override
  String get supportInboxEmpty => 'لا شيء هنا. أنجزت كل شيء.';

  @override
  String get supportFilterAll => 'الكل';

  @override
  String get ticketAllCategories => 'كل الأنواع';

  @override
  String get needHelp => 'تحتاج مساعدة؟';

  @override
  String get errChatTooFast =>
      'ترسل الرسائل بسرعة كبيرة. انتظر قليلًا ثم حاول مجددًا.';

  @override
  String get errDmNotAllowed => 'الرسائل الخاصة متاحة بين الطالب ومعلّمه فقط.';

  @override
  String get errNotClassMember => 'هذا متاح لأعضاء الصفّ فقط.';

  @override
  String get errInvalidAssignee => 'لا يمكن إسناد هذا الطلب إلى هذا الشخص.';

  @override
  String get studentContinueLearning => 'تابع التعلّم';

  @override
  String studentModulesN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n وحدة',
      many: '$n وحدةً',
      few: '$n وحدات',
      two: 'وحدتان',
      one: 'وحدة واحدة',
      zero: 'لا وحدات',
    );
    return '$_temp0';
  }

  @override
  String get studentOpenLessons => 'افتح الدروس';

  @override
  String get studentPracticeQuiz => 'اختبار';

  @override
  String get studentPracticeAssignment => 'واجب';

  @override
  String get studentOverdue => 'متأخّر';

  @override
  String studentWasDue(String when) {
    return 'كان موعده $when';
  }

  @override
  String get studentNoDueDate => 'بلا موعد محدّد';

  @override
  String studentSessionN(String n) {
    return 'الحصّة $n';
  }

  @override
  String get studentCertificateReadyTitle => 'شهادتك جاهزة';

  @override
  String studentCertificateReadyBody(String course) {
    return '$course: دليل على ما أتقنته. افتحها لتعرضها وتشاركها.';
  }

  @override
  String get studentHowWasToday => 'كيف كانت حصّة اليوم؟';

  @override
  String get studentSessionPractice => 'تدرّب على ما تعلّمته اليوم';

  @override
  String get studentPractiseNow => 'تدرّب الآن';

  @override
  String get studentNextModule => 'الوحدة التالية';

  @override
  String studentModuleDone(String module) {
    return 'وصلت إلى نهاية «$module».';
  }

  @override
  String studentModuleQuizHint(String quiz) {
    return 'اختبر ما تعلّمته في «$quiz».';
  }

  @override
  String get studentModuleNextHint => 'تابع مع الوحدة التالية.';

  @override
  String get studentClassLabel => 'الصفّ';

  @override
  String get studentAddToCalendar => 'أضف إلى تقويمي';

  @override
  String get studentCalendarCopied =>
      'نسخنا رابط التقويم. الصقه في تطبيق التقويم لديك لتشترك فيه.';

  @override
  String studentSubmittedOn(String when) {
    return 'سُلّم $when';
  }

  @override
  String get studentSubmittedLate => 'سُلّم متأخرًا';

  @override
  String get studentOverdueHint => 'ما زال بإمكانك تسليمه، وسيُسجَّل متأخرًا.';

  @override
  String get adminNavManage => 'الإدارة';

  @override
  String get adminManageTitle => 'الإدارة';

  @override
  String get adminHubPeopleSection => 'الأشخاص والدعم';

  @override
  String get adminHubMoneySection => 'المال';

  @override
  String get adminHubCatalogSection => 'الكتالوج';

  @override
  String get adminHubInsightSection => 'المؤشرات والمنصّة';

  @override
  String get adminHubSupportSub => 'تذاكر الطلاب والمعلّمين';

  @override
  String get adminHubPeopleSub => 'الحسابات والأدوار والحظر وملفات المعلّمين';

  @override
  String get adminHubPaymentsSub => 'كل الطلبات، مع الاسترداد';

  @override
  String get adminHubPayoutsSub => 'المستحقات الشهرية للمعلّمين';

  @override
  String get adminHubCouponsSub => 'رموز الخصم ومن استخدمها';

  @override
  String get adminHubBankSub => 'الحسابات التي يحوّل إليها الطلاب';

  @override
  String get adminHubCurrenciesSub => 'إضافة العملات وتعديلها وترتيبها';

  @override
  String get adminHubCoursesSub => 'إنشاء وتعديل ونشر وإبراز';

  @override
  String get adminHubBatchesSub => 'الصفوف والجداول والتسجيلات';

  @override
  String get adminHubCategoriesSub => 'الترتيب والأسماء والظهور';

  @override
  String get adminHubReportsSub => 'الإيراد والإشغال والحضور والإتمام';

  @override
  String get adminHubLiveSub => 'كل الغرف المباشرة الآن';

  @override
  String get adminHubSettingsSub => 'قواعد العمل والتواصل والتكاملات';

  @override
  String get adminHubNoSettings =>
      'يُحرَّر النص العربي للدورة داخل الدورة نفسها، ولا يوجد قسم ترجمات منفصل.';

  @override
  String get adminSettingsTitle => 'الإعدادات';

  @override
  String get adminSettingsBody =>
      'يمكن تعديل قواعد العمل وبيانات التواصل من هنا، أما المفاتيح والأسرار فتبقى في بيئة الخادم.';

  @override
  String get adminRules => 'قواعد العمل';

  @override
  String get adminIntegrations => 'التكاملات';

  @override
  String get adminConfigured => 'مُفعَّل';

  @override
  String get adminNotConfigured => 'غير مُفعَّل';

  @override
  String get adminRuleTeacherShare => 'حصّة المعلّم';

  @override
  String get adminRuleEarningHold => 'مدة تعليق الأرباح';

  @override
  String get adminRuleMinPayout => 'الحد الأدنى لصرف المستحقات';

  @override
  String get adminRuleTransferHold => 'مدة حجز التحويل البنكي';

  @override
  String get adminRuleVat => 'ضريبة القيمة المضافة';

  @override
  String adminDaysValue(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n يوم',
      many: '$n يومًا',
      few: '$n أيام',
      two: 'يومان',
      one: 'يوم واحد',
      zero: '0 يوم',
    );
    return '$_temp0';
  }

  @override
  String adminHoursValue(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n ساعة',
      many: '$n ساعةً',
      few: '$n ساعات',
      two: 'ساعتان',
      one: 'ساعة واحدة',
      zero: '0 ساعة',
    );
    return '$_temp0';
  }

  @override
  String get adminRoleStudent => 'طالب';

  @override
  String get adminRoleTeacher => 'معلّم';

  @override
  String get adminRoleAdmin => 'مشرف';

  @override
  String adminNeedsYouCount(String n) {
    return 'بانتظارك · $n';
  }

  @override
  String get adminAllClear => 'لا شيء بانتظارك الآن.';

  @override
  String get adminQueueProposals => 'مقترحات للمراجعة';

  @override
  String get adminQueueProposalsSub => 'دورات وصفوف من المعلّمين';

  @override
  String get adminQueueTransfers => 'تحويلات للتحقق';

  @override
  String get adminQueueTransfersSub =>
      'إيصالات بانتظار التحقق، والمقاعد محجوزة';

  @override
  String get adminQueuePayouts => 'صرف المستحقات';

  @override
  String get adminQueuePayoutsSub => 'للاعتماد أو لتأكيد الدفع';

  @override
  String get adminQueueReschedules => 'طلبات تغيير الموعد';

  @override
  String get adminQueueReschedulesSub => 'معلّمون يطلبون نقل حصّة';

  @override
  String get adminQueueTickets => 'تذاكر دعم مفتوحة';

  @override
  String get adminQueueTicketsSub => 'أشخاص ينتظرون ردًّا';

  @override
  String get adminQueueApplications => 'طلبات الانضمام كمعلّم';

  @override
  String get adminQueueApplicationsSub => 'أشخاص يريدون التدريس';

  @override
  String get adminQueueAlerts => 'تنبيهات أخرى';

  @override
  String get adminQueueAlertsSub =>
      'مستحقات معلّقة وحسابات بنكية للتحقق وحجوزات تنتهي';

  @override
  String get adminLiveNow => 'مباشر الآن';

  @override
  String adminRoomIssues(String n) {
    return '$n بمشكلات';
  }

  @override
  String adminPeopleInRoom(String n) {
    return '$n في الغرفة';
  }

  @override
  String adminQualityIssue(String quality) {
    return 'الجودة: $quality';
  }

  @override
  String get adminHealth => 'مؤشرات الأداء';

  @override
  String get adminPaymentsTitle => 'المدفوعات';

  @override
  String get adminSearchOrders => 'ابحث في الطلبات';

  @override
  String get adminSearchOrdersHint => 'المرجع أو اسم الطالب أو بريده';

  @override
  String get adminAnyMethod => 'كل الطرق';

  @override
  String get adminNoOrders => 'لا طلبات هنا';

  @override
  String get adminNoOrdersBody => 'جرّب حالة أو طريقة أخرى، أو امسح البحث.';

  @override
  String get adminOrderTitle => 'الطلب';

  @override
  String adminRefundedSoFar(String amount) {
    return 'تم استرداد $amount حتى الآن';
  }

  @override
  String get adminOrderAmounts => 'المبالغ';

  @override
  String get adminSubtotal => 'المجموع الفرعي';

  @override
  String get adminDiscount => 'الخصم';

  @override
  String get adminVat => 'ضريبة القيمة المضافة';

  @override
  String get adminProcessorFee => 'رسوم البطاقة';

  @override
  String get adminReceived => 'المبلغ المستلَم';

  @override
  String get adminTotal => 'الإجمالي';

  @override
  String get adminOrderPeople => 'الطالب والصف';

  @override
  String get adminClass => 'الصف';

  @override
  String get adminOrderTrail => 'الدفع';

  @override
  String get adminMethod => 'الطريقة';

  @override
  String get adminCreated => 'أُنشئ';

  @override
  String get adminPaidAt => 'دُفع';

  @override
  String get adminVerifiedBy => 'تحقّق منه';

  @override
  String get adminAppleRefundNote =>
      'تسترد Apple مبالغ مشتريات App Store، ويُسجَّل الاسترداد هنا عندما تُبلغنا Apple.';

  @override
  String get adminRefund => 'استرداد';

  @override
  String get adminRefundTitle => 'استرداد هذا الطلب';

  @override
  String adminRefundSubtitle(String reference, String amount) {
    return '$reference · حتى $amount';
  }

  @override
  String get adminRefundAmount => 'المبلغ المسترد';

  @override
  String get adminRefundAmountHelper =>
      'الاسترداد الجزئي يُبقي الطالب مسجّلًا.';

  @override
  String get adminRefundReasonHint => 'مثال: طلب الطالب الإلغاء قبل بدء الصف';

  @override
  String get adminRefundBankNote =>
      'هذا الطلب دُفع بتحويل بنكي، وسيعيد قسم المالية المبلغ يدويًّا بعد التأكيد.';

  @override
  String get adminAmountInvalid => 'أدخل مبلغًا أكبر من صفر.';

  @override
  String adminRefundTooLarge(String amount) {
    return 'يمكنك استرداد $amount كحد أقصى.';
  }

  @override
  String get adminReasonRequired => 'أضف سببًا مختصرًا (3 أحرف على الأقل).';

  @override
  String adminRefundConfirmTitle(String amount) {
    return 'استرداد $amount؟';
  }

  @override
  String get adminRefundConfirmFull =>
      'سيُسترد الطلب بالكامل، ويفقد الطالب مقعده، وتُعدَّل أرباح المعلّم. لا يمكن التراجع عن ذلك.';

  @override
  String get adminRefundConfirmPartial =>
      'يحتفظ الطالب بمقعده، وتُعدَّل أرباح المعلّم. لا يمكن التراجع عن ذلك.';

  @override
  String adminRefundDone(String amount) {
    return 'تم استرداد $amount.';
  }

  @override
  String adminRefundManualDone(String amount) {
    return 'سُجّل استرداد $amount، وسيرسل قسم المالية التحويل.';
  }

  @override
  String get adminPeopleTitle => 'الأشخاص';

  @override
  String get adminSearchPeople => 'ابحث عن شخص';

  @override
  String get adminSearchPeopleHint => 'الاسم أو البريد الإلكتروني';

  @override
  String get adminNoPeople => 'لا يوجد من يطابق البحث';

  @override
  String adminPeopleCount(String n) {
    return 'المعروض: $n';
  }

  @override
  String get adminBanned => 'محظور';

  @override
  String get adminInviteUser => 'دعوة شخص';

  @override
  String get adminInviteBody => 'سيصله بريد فيه رابط لتعيين كلمة المرور.';

  @override
  String adminInviteSent(String email) {
    return 'أُرسلت الدعوة إلى $email.';
  }

  @override
  String get adminSendInvite => 'إرسال الدعوة';

  @override
  String get adminNameHint => 'مثال: لينا حداد';

  @override
  String get adminNameRequired => 'أضف اسمًا (حرفان على الأقل).';

  @override
  String get adminEmailInvalid => 'أدخل بريدًا إلكترونيًا صحيحًا.';

  @override
  String get adminRole => 'الدور';

  @override
  String get adminEmailLanguage => 'لغة البريد';

  @override
  String get adminLanguageEnglish => 'الإنجليزية';

  @override
  String get adminLanguageArabic => 'العربية';

  @override
  String get adminAccount => 'الحساب';

  @override
  String get adminEmailVerified => 'البريد مؤكَّد';

  @override
  String get adminYes => 'نعم';

  @override
  String get adminNo => 'لا';

  @override
  String get adminJoined => 'تاريخ الانضمام';

  @override
  String get adminActiveEnrollments => 'تسجيلات نشطة';

  @override
  String get adminTeachingBatches => 'الصفوف التي يدرّسها';

  @override
  String get adminCannotEditSelf => 'لا يمكنك تغيير دورك أو حظر نفسك.';

  @override
  String get adminChangeRole => 'تغيير الدور';

  @override
  String adminChangeRoleTitle(String name, String role) {
    return 'تغيير دور $name إلى $role؟';
  }

  @override
  String get adminChangeRoleBody =>
      'تتغيّر تبويباته وصلاحياته عند فتحه التطبيق في المرة القادمة.';

  @override
  String get adminChangeRoleAdminBody =>
      'يرى المشرف كل المدفوعات والحسابات ويمكنه تعديلها. امنح هذا الدور لمن يدير عازة فقط.';

  @override
  String adminRoleChanged(String role) {
    return 'تغيّر الدور إلى $role.';
  }

  @override
  String get adminBan => 'حظر الحساب';

  @override
  String get adminUnban => 'رفع الحظر';

  @override
  String adminBanTitle(String name) {
    return 'حظر $name؟';
  }

  @override
  String adminUnbanTitle(String name) {
    return 'رفع الحظر عن $name؟';
  }

  @override
  String get adminBanBody =>
      'سيُسجَّل خروجه من كل الأجهزة، ولن يتمكن من الدخول حتى ترفع الحظر.';

  @override
  String get adminUnbanBody => 'سيتمكن من تسجيل الدخول فورًا.';

  @override
  String get adminBannedDone => 'تم حظر الحساب.';

  @override
  String get adminUnbannedDone => 'تم رفع الحظر.';

  @override
  String get adminPublicProfile => 'الملف العام للمعلّم';

  @override
  String get adminHeadline => 'العنوان التعريفي';

  @override
  String get adminHeadlineHint => 'مثال: محلّل بيانات يدرّس Excel وSQL';

  @override
  String get adminBio => 'نبذة';

  @override
  String get adminBioHint => 'ماذا يعمل، ومن يساعد، وكيف يدرّس';

  @override
  String get adminProfileSaved => 'تم حفظ الملف.';

  @override
  String get adminMarkPaid => 'تأكيد الدفع';

  @override
  String adminMarkPaidBody(int count, String total) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count معلّم',
      many: '$count معلّمًا',
      few: '$count معلّمين',
      two: 'معلّمان',
      one: 'معلّم واحد',
      zero: 'لا معلّمين',
    );
    return '$_temp0 · $total. أضف مرجع البنك للتحويل.';
  }

  @override
  String get adminTransferRef => 'مرجع التحويل';

  @override
  String get adminTransferRefHint => 'مثال: ENBD-2026-11-05';

  @override
  String get adminTransferRefRequired => 'أضف مرجع التحويل (3 أحرف على الأقل).';

  @override
  String adminMarkPaidConfirmTitle(String total) {
    return 'تأكيد دفع $total؟';
  }

  @override
  String get adminMarkPaidConfirmBody =>
      'سيصل المعلّمين بريد بأن مستحقاتهم في الطريق، وتنتقل المبالغ المعلّقة والمرحّلة إلى الشهر القادم.';

  @override
  String get adminRunMarkedPaid => 'تم تأكيد صرف المستحقات.';

  @override
  String get adminAdjustHint =>
      'اضغط على معلّم لإضافة مكافأة أو خصم قبل الاعتماد.';

  @override
  String adminAdjustTitle(String name) {
    return 'تعديل مستحقات $name';
  }

  @override
  String adminAdjustSubtitle(String amount) {
    return 'الحالي: $amount';
  }

  @override
  String get adminBonus => 'مكافأة';

  @override
  String get adminDeduction => 'خصم';

  @override
  String get adminAdjustAmount => 'المبلغ';

  @override
  String get adminAdjustReasonHint => 'مثال: حصّة تعويضية إضافية في 12 نوفمبر';

  @override
  String get adminSaveAdjustment => 'حفظ التعديل';

  @override
  String get adminAdjustmentSaved => 'تم حفظ التعديل.';

  @override
  String get adminVerifyBank => 'التحقق من الحساب البنكي';

  @override
  String adminVerifyBankTitle(String name) {
    return 'التحقق من الحساب البنكي لـ$name؟';
  }

  @override
  String adminVerifyBankBody(String bank, String holder, String iban) {
    return '$bank\n$holder\n$iban\n\nتأكّد من مطابقتها لمستندات المعلّم، وبعدها تُصرف مستحقاته المعلّقة.';
  }

  @override
  String adminBankVerified(String name) {
    return 'تم التحقق من الحساب البنكي لـ$name.';
  }

  @override
  String get adminCoursesTitle => 'الدورات';

  @override
  String get adminNoCourses => 'لا دورات هنا';

  @override
  String adminFromPrice(String price) {
    return 'من $price';
  }

  @override
  String adminFeaturedAt(String rank) {
    return 'مُبرزة #$rank';
  }

  @override
  String get adminCourseVisibility => 'الحالة والظهور';

  @override
  String get adminCourseStatus => 'الحالة';

  @override
  String get adminCourseStatusHelper =>
      'تظهر الدورات المنشورة في الكتالوج، وتُخفى المؤرشفة.';

  @override
  String get adminFeaturedRank => 'ترتيب الإبراز';

  @override
  String get adminFeaturedRankHint => 'اتركه فارغًا لإبقائها خارج الشريط';

  @override
  String get adminFeaturedRankHelper =>
      'من 0 إلى 999. الأرقام الأصغر تظهر أولًا في الشريط الرئيسي.';

  @override
  String get adminFeaturedRankInvalid =>
      'يجب أن يكون ترتيب الإبراز رقمًا صحيحًا من 0 إلى 999.';

  @override
  String adminLastReviewNote(String note) {
    return 'آخر ملاحظة مراجعة: $note';
  }

  @override
  String get adminPublish => 'نشر';

  @override
  String get adminCoursePublished => 'نُشرت الدورة، وهي الآن في الكتالوج.';

  @override
  String get adminCourseSaved => 'تم حفظ الدورة.';

  @override
  String get adminPickTeacher => 'اختر المعلّم';

  @override
  String get adminBatchDraftBody =>
      'حُفظ كمسودة. افتح التسجيل عندما يصبح جاهزًا للطلاب.';

  @override
  String get adminBatchOpenBody => 'التسجيل مفتوح، ويمكن للطلاب حجز مقعد.';

  @override
  String get adminOpenEnrolment => 'فتح التسجيل';

  @override
  String get adminEnrolmentOpened => 'تم فتح التسجيل.';

  @override
  String get adminBatchTools => 'أدوات المشرف';

  @override
  String get adminShiftSchedule => 'إزاحة الجدول';

  @override
  String get adminShiftBody =>
      'تُنقل كل الحصص المجدولة بدءًا من الحصّة التي تختارها مع الإبقاء على الوقت نفسه، ويُبلَّغ الطلاب.';

  @override
  String get adminShiftFrom => 'بدءًا من الحصّة';

  @override
  String get adminShiftDays => 'عدد الأيام';

  @override
  String get adminShiftDaysHelper =>
      'القيمة السالبة تُقدّم والموجبة تؤخّر (من −60 إلى 60).';

  @override
  String get adminShiftZero => 'اختر عددًا من الأيام غير الصفر.';

  @override
  String adminShiftConfirmTitle(String code) {
    return 'إزاحة جدول $code؟';
  }

  @override
  String adminShiftConfirmBody(int sessions, String days) {
    String _temp0 = intl.Intl.pluralLogic(
      sessions,
      locale: localeName,
      other: 'ستُنقل $sessions حصّة',
      many: 'ستُنقل $sessions حصّةً',
      few: 'ستُنقل $sessions حصص',
      two: 'ستُنقل حصّتان',
      one: 'ستُنقل حصّة واحدة',
    );
    return '$_temp0 بمقدار $days يوم، ويصل الطلاب إشعار.';
  }

  @override
  String get adminScheduleShifted => 'تمت إزاحة الجدول وإبلاغ الطلاب.';

  @override
  String get adminAttendance => 'الحضور';

  @override
  String get adminEnrollments => 'التسجيلات';

  @override
  String get adminNoEnrollments => 'لم يسجّل أحد بعد.';

  @override
  String adminEnrollmentSummary(String active, String total) {
    return '$active نشط من $total';
  }

  @override
  String get adminEnrolPending => 'بانتظار الدفع';

  @override
  String get adminEnrolAwaitingTransfer => 'بانتظار التحويل';

  @override
  String get adminEnrolActive => 'نشط';

  @override
  String get adminEnrolCancelled => 'ملغى';

  @override
  String get adminCouponsTitle => 'القسائم';

  @override
  String get adminNewCoupon => 'قسيمة جديدة';

  @override
  String get adminNoCoupons => 'لا قسائم بعد';

  @override
  String get adminNoCouponsBody => 'أنشئ رمزًا لإطلاق أو شريك أو موسم.';

  @override
  String get adminCouponActive => 'فعّالة';

  @override
  String get adminCouponScheduled => 'مجدولة';

  @override
  String get adminCouponExpired => 'منتهية';

  @override
  String get adminCouponPaused => 'متوقفة';

  @override
  String get adminCouponExhausted => 'مستنفدة';

  @override
  String adminPercentOff(String n) {
    return 'خصم $n%';
  }

  @override
  String adminAmountOff(String amount) {
    return 'خصم $amount';
  }

  @override
  String get adminAllCourses => 'كل الدورات';

  @override
  String adminUntil(String date) {
    return 'حتى $date';
  }

  @override
  String adminUsedCount(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'استُخدم $n مرة',
      many: 'استُخدم $n مرةً',
      few: 'استُخدم $n مرات',
      two: 'استُخدم مرتين',
      one: 'استُخدم مرة واحدة',
      zero: 'لم يُستخدم بعد',
    );
    return '$_temp0';
  }

  @override
  String adminUsedOf(String n, String max) {
    return 'استُخدم $n من $max';
  }

  @override
  String get adminUsage => 'الاستخدام';

  @override
  String get adminCouponCodeSection => 'الرمز والخصم';

  @override
  String get adminCouponCode => 'الرمز';

  @override
  String get adminCouponCodeHelper =>
      'من 3 إلى 20 حرفًا كبيرًا أو رقمًا أو شرطة، ولا يمكن تغييره لاحقًا.';

  @override
  String get adminCouponCodeFixed => 'لا يمكن تغيير الرمز بعد إنشائه.';

  @override
  String get adminCouponCodeInvalid =>
      'استخدم من 3 إلى 20 حرفًا كبيرًا أو رقمًا أو شرطة.';

  @override
  String get adminPercent => 'نسبة';

  @override
  String get adminFixedAmount => 'مبلغ ثابت';

  @override
  String get adminPercentOffLabel => 'نسبة الخصم';

  @override
  String get adminAmountOffLabel => 'مبلغ الخصم';

  @override
  String get adminPercentInvalid => 'أدخل نسبة من 1 إلى 100.';

  @override
  String get adminCouponLimits => 'الحدود';

  @override
  String get adminMaxRedemptions => 'إجمالي مرات الاستخدام';

  @override
  String get adminPerUserLimit => 'مرات الاستخدام لكل طالب';

  @override
  String get adminMinOrder => 'الحد الأدنى للطلب';

  @override
  String get adminUnlimited => 'غير محدود';

  @override
  String get adminNoMinimum => 'بلا حد أدنى';

  @override
  String get adminCouponWhen => 'متى وأين';

  @override
  String get adminStartsOn => 'صالحة من';

  @override
  String get adminExpiresOn => 'صالحة حتى';

  @override
  String get adminNoDate => 'بلا تاريخ';

  @override
  String get adminDatesInvalid =>
      'يجب أن يكون تاريخ الانتهاء في يوم البدء أو بعده.';

  @override
  String get adminCouponScope => 'تنطبق على';

  @override
  String get adminCouponScopeHelper => 'دورة واحدة أو كل الدورات.';

  @override
  String get adminCouponActiveSwitch => 'فعّالة';

  @override
  String get adminCouponActiveHelper => 'أوقفها لتعليق الرمز عند الدفع.';

  @override
  String get adminCreateCoupon => 'إنشاء القسيمة';

  @override
  String adminCouponCreated(String code) {
    return 'الرمز $code جاهز للاستخدام.';
  }

  @override
  String get adminCouponSaved => 'تم حفظ القسيمة.';

  @override
  String get adminTotalDiscount => 'إجمالي الخصم الممنوح';

  @override
  String get adminNoRedemptions => 'لم يستخدم أحد هذا الرمز بعد.';

  @override
  String get adminCategoriesTitle => 'التصنيفات';

  @override
  String get adminNewCategory => 'تصنيف جديد';

  @override
  String get adminEditCategory => 'تعديل التصنيف';

  @override
  String get adminNoCategories => 'لا تصنيفات بعد';

  @override
  String adminCourseCount(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n دورة',
      many: '$n دورةً',
      few: '$n دورات',
      two: 'دورتان',
      one: 'دورة واحدة',
      zero: 'لا دورات',
    );
    return '$_temp0';
  }

  @override
  String get adminHidden => 'مخفي';

  @override
  String get adminHide => 'إخفاء من الكتالوج';

  @override
  String get adminShow => 'إظهار في الكتالوج';

  @override
  String get adminDelete => 'حذف';

  @override
  String adminDeleteCategoryTitle(String name) {
    return 'حذف $name؟';
  }

  @override
  String get adminDeleteCategoryBody =>
      'سيُحذف التصنيف نهائيًّا، ولا يمكن التراجع عن ذلك.';

  @override
  String adminCategoryDeleted(String name) {
    return 'تم حذف $name.';
  }

  @override
  String get adminCategoryInUseTitle => 'ما زالت في هذا التصنيف دورات';

  @override
  String adminCategoryInUseBody(String name) {
    return 'انقل دورات $name إلى تصنيف آخر أولًا، أو أخفِه حتى لا يراه الطلاب.';
  }

  @override
  String get adminHideInstead => 'إخفاؤه بدلًا من ذلك';

  @override
  String get adminCategoryHidden => 'تم إخفاء التصنيف.';

  @override
  String get adminCategoryShown => 'التصنيف ظاهر من جديد.';

  @override
  String get adminCategorySaved => 'تم حفظ التصنيف.';

  @override
  String get adminSlug => 'المعرّف';

  @override
  String get adminSlugHelper =>
      'أحرف صغيرة وأرقام وشرطات، ويُستخدم في الروابط ولا يمكن تغييره لاحقًا.';

  @override
  String get adminSlugFixed => 'لا يمكن تغيير المعرّف بعد إنشائه.';

  @override
  String get adminSlugInvalid =>
      'استخدم من 2 إلى 40 حرفًا صغيرًا أو رقمًا أو شرطة.';

  @override
  String get adminNameEn => 'الاسم بالإنجليزية';

  @override
  String get adminNameAr => 'الاسم بالعربية';

  @override
  String get adminOrder => 'الترتيب';

  @override
  String get adminOrderHelper => 'الأرقام الأصغر تظهر أولًا.';

  @override
  String get adminVisibleInCatalog => 'ظاهر في الكتالوج';

  @override
  String get adminReportsTitle => 'التقارير';

  @override
  String adminLastDays(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'آخر $n يوم',
      many: 'آخر $n يومًا',
      few: 'آخر $n أيام',
      two: 'آخر يومين',
      one: 'آخر يوم',
    );
    return '$_temp0';
  }

  @override
  String get adminVsPrevious => 'مقارنةً بالفترة السابقة';

  @override
  String get adminRevenue => 'الإيراد';

  @override
  String get adminNewEnrollments => 'تسجيلات جديدة';

  @override
  String get adminCompletion => 'الإتمام';

  @override
  String get adminRefunds => 'المبالغ المستردة';

  @override
  String get adminRevenueByCourse => 'الإيراد حسب الدورة';

  @override
  String get adminTeachersReport => 'المعلّمون';

  @override
  String adminTeacherStats(int sessions, String attendance, String onTime) {
    String _temp0 = intl.Intl.pluralLogic(
      sessions,
      locale: localeName,
      other: '$sessions حصّة',
      many: '$sessions حصّةً',
      few: '$sessions حصص',
      two: 'حصّتان',
      one: 'حصّة واحدة',
      zero: 'لا حصص',
    );
    return '$_temp0 · حضور $attendance · في الموعد $onTime';
  }

  @override
  String get adminBankAccountsTitle => 'الحسابات البنكية';

  @override
  String get adminNewBankAccount => 'حساب بنكي جديد';

  @override
  String get adminEditBankAccount => 'تعديل الحساب البنكي';

  @override
  String get adminNoBankAccounts => 'لا حسابات بنكية بعد';

  @override
  String get adminBankAccountSaved => 'تم حفظ الحساب البنكي.';

  @override
  String get adminActive => 'نشط';

  @override
  String get adminInactive => 'مخفي';

  @override
  String get adminBankName => 'البنك';

  @override
  String get adminAccountName => 'اسم الحساب';

  @override
  String get adminBranch => 'الفرع';

  @override
  String get adminOptional => 'اختياري';

  @override
  String get adminInstructions => 'تعليمات للطلاب';

  @override
  String get adminInstructionsHint => 'مثال: اكتب مرجع الطلب في ملاحظة التحويل';

  @override
  String get adminShowAtCheckout => 'إظهاره عند الدفع';

  @override
  String get adminIbanInvalid =>
      'رقم الآيبان الإماراتي يبدأ بـAE ويليه 21 رقمًا.';

  @override
  String get adminSwiftInvalid => 'رمز SWIFT من 8 أو 11 حرفًا ورقمًا.';

  @override
  String get adminCurrenciesTitle => 'العملات';

  @override
  String get adminCurrenciesBody =>
      'تتم المدفوعات بالدرهم دائمًا، وتغيّر العملات الأخرى فقط الأسعار التقريبية التي يراها الطلاب.';

  @override
  String adminRateLabel(String currency) {
    return '$currency لكل درهم';
  }

  @override
  String get adminRateInvalid => 'أدخل سعرًا أكبر من صفر.';

  @override
  String adminRateSaved(String currency) {
    return 'تم حفظ سعر $currency.';
  }

  @override
  String get progressMarkComplete => 'أنهيتُ هذا الدرس';

  @override
  String get progressCompleted => 'مكتمل';

  @override
  String get progressUndoHint => 'اضغط لإلغاء الإكمال';

  @override
  String progressLessonsOf(int done, int total) {
    return 'الدروس: $done من $total';
  }

  @override
  String progressResume(String lesson) {
    return 'تابِع: $lesson';
  }

  @override
  String progressStart(String lesson) {
    return 'ابدأ: $lesson';
  }

  @override
  String get progressAllDone => 'أنهيت كل الدروس';

  @override
  String get progressAllDoneBody =>
      'راجع أي درس متى شئت، أو تدرّب على ما تعلّمته.';

  @override
  String get progressSaveFailed => 'لم يُحفظ تقدّمك. حاول مجددًا.';

  @override
  String get guestBrowseCourses => 'تصفّح الدورات';

  @override
  String get guestResumeNotice => 'سجّل الدخول وسنعيدك إلى حيث كنت.';

  @override
  String get guestPromptTitle => 'سجّل الدخول للمتابعة';

  @override
  String get guestPromptBody => 'سجّل الدخول أو أنشئ حسابًا لتتمكّن من ذلك.';

  @override
  String get guestHomeTitle => 'تعلّمك في مكان واحد';

  @override
  String get guestHomeBody =>
      'سجّل الدخول لترى درسك التالي وتدريباتك المستحقة وحصصك المباشرة.';

  @override
  String get guestScheduleTitle => 'أسبوعك التعليمي';

  @override
  String get guestScheduleBody =>
      'سجّل الدخول لترى حصصك المباشرة وتضيفها إلى تقويمك.';

  @override
  String get guestLibraryTitle => 'دروسك وتسجيلاتك';

  @override
  String get guestLibraryBody =>
      'سجّل الدخول لتفتح دروسك وتسجيلات الحصص ومواد صفّك.';

  @override
  String get guestMeTitle => 'اجعلها تجربتك';

  @override
  String get guestMeBody =>
      'أنشئ حسابًا لتحفظ الدورات وتنضمّ إلى صفّ وتحصل على شهادة.';

  @override
  String get guestReviewCta => 'سجّل الدخول لتكتب مراجعة';

  @override
  String get guestTeachCta => 'أنشئ حسابًا لتتقدّم بطلبك';

  @override
  String get guestTeachBody =>
      'يرتبط الطلب بحسابك، حتى نتواصل معك ونجهّز أدوات التدريس لك بعد الموافقة.';

  @override
  String get guestVerifyTitle => 'التحقق من شهادة';

  @override
  String get guestVerifyValid => 'شهادة موثّقة';

  @override
  String guestVerifyValidBody(String name, String course) {
    return 'أصدرت عازة هذه الشهادة إلى $name لإتمام دورة «$course».';
  }

  @override
  String get guestVerifyInvalid => 'تعذّر التحقق من هذه الشهادة';

  @override
  String get guestVerifyInvalidBody =>
      'تأكّد من الرمز وحاول مجددًا. تبدو الرموز هكذا: AZ-CERT-7Q4K.';

  @override
  String get guestVerifyLearnCta => 'تعلّم مع عازة';

  @override
  String get courseTypeRecorded => 'مسجّلة';

  @override
  String get filterFormat => 'نوع الدورة';

  @override
  String get formatLive => 'صفوف مباشرة';

  @override
  String get formatRecorded => 'دروس مسجّلة';

  @override
  String pricePerMonth(String price) {
    return '$price / شهر';
  }

  @override
  String pricePerYear(String price) {
    return '$price / سنة';
  }

  @override
  String fromPricePerMonth(String price) {
    return 'من $price / شهر';
  }

  @override
  String get planTitle => 'اختر خطتك';

  @override
  String get planIntro => 'ابدأ متى شئت، وتعلّم على راحتك.';

  @override
  String get planMonthly => 'شهري';

  @override
  String get planYearly => 'سنوي';

  @override
  String planYearlyDetail(String price) {
    return '$price / شهر، تُدفع سنويًا';
  }

  @override
  String planSaveMonths(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n شهر',
      many: '$n شهرًا',
      few: '$n أشهر',
      two: 'شهرين',
      one: 'شهرًا واحدًا',
      zero: '',
    );
    return 'وفّر $_temp0';
  }

  @override
  String get planYouGet => 'ما تحصل عليه';

  @override
  String get planGetLessons => 'كل الدروس والاختبارات';

  @override
  String get planGetCertificate => 'شهادة عند إتمامك الدورة';

  @override
  String get planGetCancel => 'إلغاء في أي وقت';

  @override
  String get planCancelLine =>
      'يمكنك الإلغاء في أي وقت، ويبقى وصولك حتى نهاية المدة المدفوعة.';

  @override
  String planNextCharge(String date) {
    return 'الدفعة التالية في $date';
  }

  @override
  String planPaidUntil(String date) {
    return 'أنت مغطّى حتى $date، ولا تتجدّد هذه الخطة تلقائيًا.';
  }

  @override
  String planPaidUntilShort(String date) {
    return 'مدفوعة حتى $date';
  }

  @override
  String planRenews(String date) {
    return 'تتجدّد في $date';
  }

  @override
  String planEnds(String date) {
    return 'تنتهي في $date';
  }

  @override
  String get planYourPlan => 'خطتك';

  @override
  String get planEnded => 'انتهى اشتراكك، وتقدّمك محفوظ.';

  @override
  String get planTransferNote =>
      'ادفع بتحويل بنكي. يبدأ وصولك بعد تأكيدنا للتحويل، عادةً خلال يوم عمل واحد.';

  @override
  String get planStart => 'ابدأ التعلّم';

  @override
  String get planWebsiteOnly => 'متاحة على موقعنا حاليًا';

  @override
  String get planWebsiteOnlyBody => 'افتح موقعنا في المتصفح لتبدأ هذه الخطة.';

  @override
  String get planAppleNote =>
      'تتولى Apple عملية الدفع. أدِر اشتراكك أو ألغِه من اشتراكات App Store.';

  @override
  String get planWatchFree => 'شاهد الدرس المجاني';

  @override
  String get planVatNote =>
      'الأسعار قبل ضريبة القيمة المضافة، وتُضاف الضريبة عند الدفع إن وُجدت.';

  @override
  String get planFreeLesson => 'درس مجاني';

  @override
  String planTransferBefore(String date) {
    return 'أرسل التحويل قبل $date.';
  }

  @override
  String get planReceiptSent => 'استلمنا إيصالك';

  @override
  String get planReceiptSentBody =>
      'سنؤكّد التحويل عادةً خلال يوم عمل واحد، وتبدأ خطتك بعدها.';

  @override
  String get planBackToCourse => 'العودة إلى الدورة';

  @override
  String get returnSettingUp => 'نجهّز وصولك…';

  @override
  String get returnSettingUpBody => 'يستغرق هذا عادةً بضع ثوانٍ.';

  @override
  String get returnSlowTitle => 'نحتاج وقتًا أطول من المعتاد';

  @override
  String get returnSlowBody => 'دفعتك بأمان، وسيظهر وصولك فور تأكيدها.';

  @override
  String get returnCheckAgain => 'تحقّق مجددًا';

  @override
  String get returnHome => 'إلى الرئيسية';

  @override
  String get lessonLocked => 'مغلق';

  @override
  String get lessonLockedBody => 'هذا الدرس ضمن الخطة.';

  @override
  String get lessonsLockedTitle => 'ابدأ خطة لتفتح كل الدروس';

  @override
  String get lessonsSeePlans => 'اطّلع على الخطط';

  @override
  String get errAlreadySubscribed => 'لديك خطة لهذه الدورة بالفعل.';

  @override
  String get errPlanRequired => 'تحتاج إلى خطة لفتح هذا.';

  @override
  String get errAppleProductMissing => 'هذه الخطة غير متاحة في التطبيق بعد.';

  @override
  String get plansTitle => 'خططك';

  @override
  String get plansRowHint => 'جدّد أو ألغِ أو غيّر خطة';

  @override
  String get plansEmptyTitle => 'لا توجد خطط بعد';

  @override
  String get plansEmptyBody => 'اختر دورة مسجّلة وابدأ متى شئت.';

  @override
  String get plansFind => 'اعثر على دورة';

  @override
  String get plansOpenCourse => 'افتح الدورة';

  @override
  String get planProviderCard => 'بطاقة';

  @override
  String get planProviderApple => 'App Store';

  @override
  String get planCancel => 'إلغاء الخطة';

  @override
  String get planCancelTitle => 'هل تريد إلغاء هذه الخطة؟';

  @override
  String planCancelBody(String date) {
    return 'يمكنك مواصلة التعلّم حتى $date. يبقى تقدّمك وشهادتك لك.';
  }

  @override
  String get planCancelStep2Title => 'هل أنت متأكد؟';

  @override
  String planCancelStep2Body(String date) {
    return 'تنتهي خطتك في $date ولن تتجدّد.';
  }

  @override
  String get planCancelConfirm => 'نعم، ألغِ خطتي';

  @override
  String get planKeep => 'أبقِ خطتي';

  @override
  String planCancelledToast(String date) {
    return 'تم. يمكنك مواصلة التعلّم حتى $date.';
  }

  @override
  String get planResume => 'استئناف الخطة';

  @override
  String get planResumedToast => 'ستتجدّد خطتك كما كانت.';

  @override
  String get planSwitchToYearly => 'التحويل إلى السنوي';

  @override
  String get planSwitchToMonthly => 'التحويل إلى الشهري';

  @override
  String get planSwitchNote =>
      'يحتسب Stripe الوقت غير المستخدم من خطتك الحالية.';

  @override
  String get planSwitchedToast => 'تم تغيير الخطة.';

  @override
  String get planUpdateCard => 'تحديث البطاقة';

  @override
  String get planManageAppStore => 'أدِرها من App Store';

  @override
  String get planRenewTransfer => 'جدّد بتحويل بنكي';

  @override
  String get planSwitchToCard => 'التحويل إلى البطاقة';

  @override
  String get planUploadReceipt => 'ارفع الإيصال';

  @override
  String get planPendingReceipt => 'بانتظار إيصالك';

  @override
  String get planPendingReview =>
      'نراجع تحويلك. يستغرق ذلك عادةً يوم عمل واحد.';

  @override
  String planPendingRejected(String note) {
    return 'لم نتمكّن من تأكيد تحويلك: $note';
  }

  @override
  String get planPendingRejectedPlain =>
      'لم نتمكّن من تأكيد تحويلك. يمكنك المحاولة مجددًا.';

  @override
  String get planPastDue => 'لم تتم آخر عملية دفع. حدّث بطاقتك لتواصل التعلّم.';

  @override
  String planCancellingBanner(String date) {
    return 'تنتهي خطتك في $date. يبقى تقدّمك وشهادتك لك.';
  }

  @override
  String get returnSeePlans => 'اطّلع على خططك';

  @override
  String get recordedRenew => 'جدّد لتواصل التعلّم';

  @override
  String get recordedCourses => 'الدورات المسجّلة';

  @override
  String recordedNext(String title) {
    return 'التالي: $title';
  }

  @override
  String get courseTypeTitle => 'ما نوع الدورة؟';

  @override
  String get courseTypeLive => 'مباشرة';

  @override
  String get courseTypeLiveBody =>
      'صفوف بمواعيد محدّدة ومعلّم في الغرفة. ينضمّ المتعلّمون إلى صفّ.';

  @override
  String get courseTypeRecordedBody =>
      'دروس يشاهدها المتعلّمون متى شاؤوا بخطة شهرية أو سنوية. لا صفوف لتحديد مواعيدها.';

  @override
  String get courseTypeFixed => 'لا يمكن تغيير النوع بعد إنشاء الدورة.';

  @override
  String get hubTitle => 'دورة مسجّلة';

  @override
  String get hubSubscribers => 'المشتركون';

  @override
  String get hubEarnings => 'مستحقاتك';

  @override
  String get hubEarningsNote => 'حصتك من مدفوعات خطط هذه الدورة.';

  @override
  String get hubEarningsUnknown => 'تظهر هنا مستحقات الخطط عند وصول المدفوعات.';

  @override
  String get hubQuizzes => 'اختبارات الدورة';

  @override
  String get hubNoQuizzes =>
      'لا اختبارات بعد. على المتعلّم اجتياز كل اختبار منشور لينال الشهادة.';

  @override
  String get hubAddQuiz => 'أضف اختبارًا';

  @override
  String hubPassMark(String percent) {
    return 'درجة النجاح $percent%';
  }

  @override
  String get hubPreview => 'درس المعاينة المجانية';

  @override
  String get hubPreviewBody => 'يمكن لأي شخص مشاهدة هذا الدرس، حتى بلا حساب.';

  @override
  String get hubPreviewNone => 'بلا درس معاينة';

  @override
  String get hubPreviewSaved => 'تم حفظ درس المعاينة.';

  @override
  String get hubNoLessons => 'أضف دروسًا من الويب لاختيار درس المعاينة.';

  @override
  String get hubEditDetails => 'عدّل تفاصيل الدورة';

  @override
  String get quizPassPercent => 'درجة النجاح (%)';

  @override
  String get quizPassHelper => 'نسبة الدرجات اللازمة للنجاح.';

  @override
  String get quizPassInvalid => 'أدخل رقمًا من 0 إلى 100.';

  @override
  String get quizCourseNote => 'يمكن للمتعلّم إعادة الاختبار كما يشاء.';

  @override
  String get adminCutsTitle => 'حصة المعلّم';

  @override
  String get adminCutsBody =>
      'حصة المعلّم من كل دفعة بعد الضريبة والرسوم. تُحتسب لحظة الدفع ولا تتغيّر بعدها.';

  @override
  String get adminCutLive => 'الدورات المباشرة (%)';

  @override
  String get adminCutRecorded => 'الدورات المسجّلة (%)';

  @override
  String get adminCutsSave => 'احفظ النسب';

  @override
  String get adminCutsSaved => 'تم حفظ النسب.';

  @override
  String get adminCutInvalid => 'أدخل عددًا صحيحًا من 0 إلى 100.';

  @override
  String get adminCourseCut => 'حصة المعلّم في هذه الدورة (%)';

  @override
  String adminCourseCutHelp(String percent) {
    return 'للحالات النادرة فقط. اتركه فارغًا لاعتماد النسبة الافتراضية، $percent%.';
  }

  @override
  String get adminCourseCutSaved => 'تم حفظ حصة الدورة.';

  @override
  String get adminRecordedPrices => 'أسعار الدورة المسجّلة';

  @override
  String get adminMonthlyPrice => 'السعر الشهري (درهم، قبل الضريبة)';

  @override
  String get adminYearlyPrice => 'السعر السنوي (درهم، قبل الضريبة)';

  @override
  String get adminPricesInvalid => 'يجب أن يقلّ السعر السنوي عن 12 دفعة شهرية.';

  @override
  String get adminPricesSaved => 'تم حفظ الأسعار.';

  @override
  String get adminAppleIds => 'معرّفات منتجات App Store';

  @override
  String get adminAppleMonthly => 'معرّف المنتج الشهري';

  @override
  String get adminAppleYearly => 'معرّف المنتج السنوي';

  @override
  String get adminAppleSaved => 'تم حفظ المعرّفات.';

  @override
  String get adminSubsTitle => 'الاشتراكات';

  @override
  String get adminHubSubsSub => 'خطط الدورات المسجّلة';

  @override
  String get adminSubsEmpty => 'لا اشتراكات مطابقة.';

  @override
  String get adminSubsAll => 'الكل';

  @override
  String get adminSubCancel => 'إلغاء الخطة';

  @override
  String get adminSubCancelTitle => 'هل تريد إلغاء هذه الخطة الآن؟';

  @override
  String get adminSubCancelBody =>
      'يفقد المتعلّم وصوله فورًا. يبقى تقدّمه وشهادته.';

  @override
  String get adminRefundNone => 'إلغاء فقط';

  @override
  String get adminRefundFull => 'إلغاء مع استرداد آخر دفعة';

  @override
  String get adminSubCancelled => 'تم إلغاء الخطة.';

  @override
  String get adminSubApple => 'تُدار عبر Apple';

  @override
  String adminSubLastPayment(String amount) {
    return 'آخر دفعة $amount';
  }

  @override
  String get adminTransferPlan => 'الخطة';

  @override
  String get adminTransferCourse => 'الدورة';

  @override
  String get adminTransferPlanChip => 'تحويل خطة';

  @override
  String get planPastDueChip => 'فشلت الدفعة';

  @override
  String get planCancellingChip => 'تنتهي قريبًا';

  @override
  String get planExpiredChip => 'انتهت';

  @override
  String get planSettingUpChip => 'قيد الإعداد';

  @override
  String get planActiveChip => 'نشطة';

  @override
  String get certificateRecordedCompletion =>
      'أتمّ جميع الدروس واجتاز جميع الاختبارات';

  @override
  String get certificateCompletion => 'الإنجاز';

  @override
  String get earningsRecordedCourses => 'الدورات المسجّلة';

  @override
  String get hubSubscribersUnavailable => 'أعداد المشتركين غير متاحة الآن.';

  @override
  String get adminSubReceiptReturnByHand =>
      'كان إيصال تحويل قيد المراجعة؛ أعد ذلك المبلغ يدويًا.';

  @override
  String get appStoreTitle => 'App Store';

  @override
  String get appStoreSyncNow => 'زامن الآن';

  @override
  String get appStoreSyncStarted => 'بدأت المزامنة. تتحدّث القائمة بعد ثوانٍ.';

  @override
  String get appStoreNotConfigured =>
      'أضف مفتاح App Store Connect API لتفعيل إعداد المنتجات تلقائيًا.';

  @override
  String get appStoreNothingYet => 'لا منتجات بعد. زامن لإنشائها.';

  @override
  String get appStoreSeats => 'أسعار المقاعد';

  @override
  String get appStoreCourses => 'الدورات المسجّلة';

  @override
  String get appleSyncSynced => 'تمت المزامنة';

  @override
  String get appleSyncSkipped => 'تم التخطي';

  @override
  String get appleSyncFailed => 'فشلت';

  @override
  String get appleSyncNever => 'لم تتم المزامنة بعد';

  @override
  String get adminPricesRequired => 'أدخل سعرًا شهريًا وسعرًا سنويًا.';

  @override
  String get planTransferNotOnIos =>
      'التحويل البنكي غير متاح على iPhone. أدِر خطتك من App Store.';

  @override
  String get reportsRecordedTitle => 'الدورات المسجّلة';

  @override
  String get reportsRecordedNone => 'لا دفعات للدورات المسجّلة في هذه الفترة.';

  @override
  String get reportsGross => 'الإجمالي';

  @override
  String get reportsFees => 'الرسوم';

  @override
  String get reportsVat => 'ضريبة القيمة المضافة';

  @override
  String get reportsNet => 'الصافي';

  @override
  String get transferNotFound => 'لم نجد هذا التحويل. ربما روجع بالفعل.';

  @override
  String get transferBackToQueue => 'العودة إلى التحويلات';

  @override
  String get whatsappChat => 'تواصل عبر واتساب';

  @override
  String get whatsappOpenFailed => 'تعذّر فتح واتساب.';

  @override
  String whatsappCourseMessage(String course) {
    return 'مرحبًا عازة، لديّ سؤال عن $course.';
  }

  @override
  String whatsappBatchMessage(String course, String batchCode) {
    return 'مرحبًا عازة، لديّ سؤال عن $course ($batchCode).';
  }

  @override
  String get whatsappGeneralMessage => 'مرحبًا عازة، أحتاج إلى مساعدة.';

  @override
  String get contactUs => 'تواصل معنا';

  @override
  String get contactEmail => 'البريد الإلكتروني';

  @override
  String get contactPhone => 'الهاتف';

  @override
  String get contactAddress => 'العنوان';

  @override
  String get followUs => 'تابعنا';

  @override
  String get adminRulesBody =>
      'تسري هذه القواعد على المنصّة كلها. اترك القاعدة على قيمتها الافتراضية لتتبع إعداد الخادم.';

  @override
  String adminRuleRange(int min, int max) {
    return 'أدخل عددًا صحيحًا من $min إلى $max.';
  }

  @override
  String get adminRulesSaved => 'تم حفظ القواعد.';

  @override
  String get adminRulesSave => 'حفظ القواعد';

  @override
  String adminRuleResetDone(String rule) {
    return 'أُعيدت قاعدة $rule إلى قيمتها الافتراضية.';
  }

  @override
  String adminRuleDefault(String value) {
    return 'الافتراضي: $value';
  }

  @override
  String get adminRuleReset => 'إعادة إلى الافتراضي';

  @override
  String get adminIntegrationsNote => 'تُضبط من بيئة الخادم.';

  @override
  String get adminContactTitle => 'التواصل والمنصّات الاجتماعية';

  @override
  String get adminContactBody =>
      'تظهر في المساعدة والدعم وتستخدمها أزرار واتساب. اترك الحقل فارغًا لإخفائه.';

  @override
  String get adminContactSave => 'حفظ بيانات التواصل';

  @override
  String get adminContactSaved => 'تم حفظ بيانات التواصل.';

  @override
  String get adminWhatsappInvalid =>
      'استخدم من 8 إلى 15 رقمًا مع رمز الدولة، دون + أو مسافات.';

  @override
  String get adminWhatsappHelper => 'أرقام مع رمز الدولة، مثل 971501234567';

  @override
  String get adminAddressEn => 'العنوان (بالإنجليزية)';

  @override
  String get adminAddressAr => 'العنوان (بالعربية)';

  @override
  String get adminAddressTooLong => 'اجعل العنوان أقل من 300 حرف.';

  @override
  String get adminSocialInvalid => 'أدخل رابطًا كاملًا يبدأ بـ https://';

  @override
  String get adminCurrencySaved => 'تم حفظ العملة.';

  @override
  String adminCurrencyDeleteTitle(String code) {
    return 'حذف $code؟';
  }

  @override
  String adminCurrencyDeleteBody(String code) {
    return 'كل من اختار $code سيرى الأسعار بالدرهم بدلًا منها. تحتفظ الطلبات السابقة بالعملة والسعر الذي تمّت به.';
  }

  @override
  String adminCurrencyDeleted(String code) {
    return 'تم حذف $code.';
  }

  @override
  String get adminNewCurrency => 'إضافة عملة';

  @override
  String adminEditCurrency(String code) {
    return 'تعديل $code';
  }

  @override
  String get adminNoCurrencies => 'لا توجد عملات بعد.';

  @override
  String get adminCurrencyBase => 'الأساسية';

  @override
  String get adminCurrencyBaseHint =>
      'تتم المدفوعات والتحويلات بالدرهم دائمًا، وسعره 1 دائمًا.';

  @override
  String get adminCurrencyLocked => 'مفعّلة دائمًا';

  @override
  String get adminMoveUp => 'تحريك للأعلى';

  @override
  String get adminMoveDown => 'تحريك للأسفل';

  @override
  String get adminCurrencyCode => 'الرمز';

  @override
  String get adminCurrencyCodeHelper =>
      'ثلاثة أحرف مثل EUR، ولا يمكن تغييره لاحقًا.';

  @override
  String get adminCurrencyCodeInvalid => 'أدخل رمز عملة من ثلاثة أحرف.';

  @override
  String get adminCurrencyDecimalsInvalid => 'الخانات العشرية من 0 إلى 3.';

  @override
  String get adminCurrencySymbol => 'الرمز المختصر (اختياري)';

  @override
  String get adminCurrencyDecimals => 'الخانات العشرية';

  @override
  String get adminCurrencyDecimalsHelper =>
      'عدد الخانات العشرية في الأسعار، من 0 إلى 3';

  @override
  String get adminRatePerAed => 'السعر مقابل 1 درهم';

  @override
  String get adminRatePerAedHelper => 'كم وحدة يشتريها درهم واحد';

  @override
  String get adminCurrencyEnabled => 'إظهارها للطلاب';

  @override
  String get adminCategoryImageAdd => 'إضافة صورة';

  @override
  String get adminCategoryImageChange => 'تغيير الصورة';

  @override
  String get adminCategoryImageSaved => 'تم حفظ صورة التصنيف.';

  @override
  String get adminCategoryImageRemoved => 'تمت إزالة صورة التصنيف.';

  @override
  String get adminCategoryImageHint =>
      'JPG أو PNG أو WebP. يراها الطلاب بدلًا من الأيقونة.';

  @override
  String get adminCategoryImageAfterSave => 'احفظ التصنيف أولًا ثم أضف صورة.';

  @override
  String get phoneLabel => 'رقم الجوال';

  @override
  String get phoneRequired => 'أدخل رقم جوالك';

  @override
  String phoneInvalidFor(String country) {
    return 'يبدو أن الرقم غير صحيح لدولة $country';
  }

  @override
  String get phoneSearchCountries => 'ابحث عن دولة أو رمز الاتصال';

  @override
  String get phoneCountryPicker => 'اختر الدولة';

  @override
  String get phoneNoCountries => 'لا توجد دولة مطابقة للبحث.';

  @override
  String adminCurrencyRateLine(String rate, String code) {
    return '1 درهم = $rate $code';
  }

  @override
  String adminCurrencyDecimalsCount(int decimals) {
    String _temp0 = intl.Intl.pluralLogic(
      decimals,
      locale: localeName,
      other: '$decimals خانة عشرية',
      many: '$decimals خانة عشرية',
      few: '$decimals خانات عشرية',
      two: 'خانتان عشريتان',
      one: 'خانة عشرية واحدة',
      zero: 'بلا خانات عشرية',
    );
    return '$_temp0';
  }

  @override
  String get adminCurrencyNameArRequired => 'أدخل الاسم بالعربية.';

  @override
  String get adminCurrencyNameTooLong => 'يصل الاسم إلى 60 حرفًا.';

  @override
  String get adminCurrencySymbolTooLong => 'يصل الرمز المختصر إلى 8 أحرف.';

  @override
  String get errPhoneInvalid => 'يبدو أن رقم الهاتف غير صحيح.';

  @override
  String get errCurrencyUnavailable => 'هذه العملة لم تعد متاحة.';

  @override
  String get errBaseCurrencyLocked =>
      'الدرهم هو العملة الأساسية ولا يمكن تغييرها بهذه الطريقة.';
}
