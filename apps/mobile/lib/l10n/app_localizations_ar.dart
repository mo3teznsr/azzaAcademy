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
  String get confirmingPayment => 'نتحقق من دفعتك…';

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
  String get sessionAdded => 'أُضيفت الجلسة.';

  @override
  String cancelSessionTitle(String slate) {
    return 'إلغاء $slate؟';
  }

  @override
  String get cancelSessionBody =>
      'سيُبلَّغ الطلاب وتُزال الجلسة من جدولهم. لا يمكن التراجع عن ذلك.';

  @override
  String get keepSession => 'إبقاء الجلسة';

  @override
  String get cancelSession => 'إلغاء الجلسة';

  @override
  String get sessionCancelled => 'أُلغيت الجلسة.';

  @override
  String get upcomingSessions => 'الجلسات القادمة';

  @override
  String get addSession => 'إضافة جلسة';

  @override
  String get noUpcomingSessions => 'لا توجد جلسات قادمة.';

  @override
  String get moveSessionAction => 'نقل الجلسة';

  @override
  String get requestMove => 'طلب نقل';

  @override
  String showAllN(String count) {
    return 'عرض الكل ($count)';
  }

  @override
  String get sessionTitleRequired => 'اكتب عنوانًا للجلسة (حرفان على الأقل).';

  @override
  String get errStartInPast => 'اختر وقتًا في المستقبل.';

  @override
  String addSessionTitle(String code) {
    return 'إضافة جلسة إلى $code';
  }

  @override
  String get addSessionLead =>
      'جلسة مباشرة إضافية خارج الجدول الأسبوعي: تعويض أو جلسة إضافية أو اختبار.';

  @override
  String get sessionTitleLabel => 'عنوان الجلسة';

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
  String get couldNotAddSession => 'تعذّرت إضافة الجلسة';

  @override
  String editSeatsTitle(String code) {
    return 'المقاعد في $code';
  }

  @override
  String editSeatsLead(String count) {
    return 'عدد المسجلين $count. لا يمكن أن تقل المقاعد عن ذلك.';
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
  String get sessionMoved => 'نُقلت الجلسة.';

  @override
  String get moveReasonHint => 'عطلة رسمية';

  @override
  String get moveSessionNow => 'نقل الجلسة';

  @override
  String get errConflict => 'يتعارض ذلك مع موعد مجدول بالفعل.';

  @override
  String get errBatchClosed =>
      'انتهت هذه الدفعة أو أُلغيت، فلا يمكن إضافة جلسات إليها.';

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
  String get navBatches => 'دفعاتي';

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
  String coursesCount(String count) {
    return '$count دورة';
  }

  @override
  String get noCoursesFound => 'لا توجد دورات مطابقة. جرّب بحثًا آخر.';

  @override
  String levelN(String n) {
    return 'المستوى $n';
  }

  @override
  String liveSessionsN(String n) {
    return '$n حصّة مباشرة';
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
  String syllabusN(String n) {
    return 'المنهج · $n وحدات';
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
  String seatsLeft(String n) {
    return 'الأماكن المتبقية: $n';
  }

  @override
  String seatsOf(String taken, String capacity) {
    return '$taken/$capacity';
  }

  @override
  String get noOpenBatches => 'لا صفوف مفتوحة حاليًا. عُد قريبًا.';

  @override
  String joiningLate(String ran, String left) {
    return 'تنضم متأخرًا؟ انعقدت $ran حصص، وتسجيلاتها في مكتبتك لتستدرك ما فاتك. تتبقى $left حصص مباشرة.';
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
  String enrolledBody(String course, String code, String n) {
    return 'تأكّد مكانك في $course · $code. ابدأ بالدروس، وقد أُضيفت $n حصص مباشرة إلى جدولك.';
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
  String syncCalendar(String n) {
    return 'زامن $n حصص مع التقويم';
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
  String get goLive => 'ابدأ الجلسة';

  @override
  String get recordSession => 'سجّل الجلسة';

  @override
  String get recordSessionSub => 'تُحفظ في مكتبة الدفعة بعد المعالجة';

  @override
  String waitingN(String n) {
    return '$n ينتظرون';
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
  String get endConfirmTitle => 'إنهاء الجلسة للجميع؟';

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
  String endedStayed(String time, String min) {
    return 'انتهت $time · بقيت $min دقيقة';
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
  String batchesN(String n) {
    return 'الصفوف: $n';
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
  String get nextTakeLobbyOpen => 'الجلسة التالية · غرفة الانتظار مفتوحة';

  @override
  String nextTakeIn(String time) {
    return 'الجلسة التالية · تبدأ خلال $time';
  }

  @override
  String get enterLobby => 'ادخل غرفة الانتظار';

  @override
  String studentsN(String n) {
    return '$n طالبًا';
  }

  @override
  String get todayStat => 'اليوم';

  @override
  String get weekStat => 'الأسبوع';

  @override
  String get sessionsLabel => 'جلسات';

  @override
  String get attendStat => 'الحضور';

  @override
  String get laterToday => 'لاحقًا اليوم';

  @override
  String get noSessionsToday => 'لا جلسات اليوم. استمتع بالهدوء.';

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
  String get prepTitle => 'تحضير الجلسة';

  @override
  String runOfShow(String min) {
    return 'سير الجلسة · $min دقيقة';
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
  String get moveSession => 'انقل هذه الجلسة';

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
    return 'يُدفع $date';
  }

  @override
  String get displayOnly => 'للعرض فقط: تُدفع المستحقات دائمًا بالدرهم.';

  @override
  String get pendingLabel => 'معلّق';

  @override
  String get scheduledRest => 'مجدولة لبقية الشهر';

  @override
  String get availableLabel => 'متاح';

  @override
  String get lifetimePaid => 'المدفوع حتى الآن';

  @override
  String get byBatch => 'هذه الفترة حسب الدفعة';

  @override
  String get netRevenueNote =>
      'صافي الإيراد = التسجيلات المدفوعة − المبالغ المستردة − رسوم Stripe. يُخصم أي استرداد بعد الدفع من دفعتك التالية.';

  @override
  String get payoutMethod => 'طريقة الدفع';

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
  String get payoutCurrency => 'عملة الدفع';

  @override
  String get changeBank => 'غيّر الحساب البنكي';

  @override
  String get addBank => 'أضف حسابًا بنكيًا';

  @override
  String get changeBankNote =>
      'يُعاد توثيق الحساب الجديد قبل الدفعة التالية. تتوقف المدفوعات حتى تتم الموافقة.';

  @override
  String get history => 'السجل';

  @override
  String get noPayouts => 'لا مدفوعات بعد.';

  @override
  String get noBankDetails => 'أضف حسابًا بنكيًا إماراتيًا لاستلام المستحقات.';

  @override
  String get ibanInvalid => 'آيبان إماراتي: AE + 21 رقمًا';

  @override
  String get swiftInvalid => '8 أو 11 حرفًا/رقمًا';

  @override
  String sessionsDelivered(String n) {
    return '$n جلسات منجزة';
  }

  @override
  String opsGreeting(String name) {
    return 'العمليات، $name';
  }

  @override
  String get onAirLabel => 'مباشر الآن';

  @override
  String roomsPeople(String rooms, String people) {
    return '$rooms غرف · $people شخصًا';
  }

  @override
  String get sessionsToday => 'جلسات اليوم';

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
  String get noLiveRooms => 'لا جلسات مباشرة الآن.';

  @override
  String participantsN(String n) {
    return '$n شخصًا';
  }

  @override
  String get recordingOn => 'يُسجَّل';

  @override
  String get batchesTitle => 'الدفعات';

  @override
  String get seatsLabel => 'مقاعد';

  @override
  String get nextSession => 'الجلسة التالية';

  @override
  String get teacherLabel => 'المعلّم';

  @override
  String sessionsRun(String done, String total) {
    return 'انعقدت $done من $total جلسات';
  }

  @override
  String get transfersToVerify => 'تحويلات للتحقق';

  @override
  String get payoutRuns => 'دفعات المستحقات';

  @override
  String get noTransfers => 'لا تحويلات بانتظار التحقق.';

  @override
  String get noPayoutRuns => 'لا دفعات مستحقات بعد.';

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
    return 'دفعة المستحقات · $period';
  }

  @override
  String get awaitingApproval => 'بانتظار الموافقة';

  @override
  String totalTeachers(String n) {
    return 'الإجمالي · $n معلّمين';
  }

  @override
  String heldNote(String n) {
    return '$n معلّقة: الحساب البنكي غير موثّق أو أقل من الحد الأدنى.';
  }

  @override
  String approvePayouts(String n, String amount) {
    return 'وافق على $n دفعات · $amount';
  }

  @override
  String get downloadFile => 'نزّل ملف التحويل البنكي';

  @override
  String get runApproved => 'تمت الموافقة على الدفعة.';

  @override
  String get held => 'معلّقة';

  @override
  String get ready => 'جاهزة';

  @override
  String get paidLabel => 'مدفوعة';

  @override
  String get carriedOver => 'مُرحّلة';

  @override
  String alertTransfersToVerify(String n) {
    return '$n تحويلات بنكية بانتظار التحقق';
  }

  @override
  String alertSeatHoldsExpiring(String n) {
    return '$n حجوزات مقاعد تنتهي خلال 24 ساعة';
  }

  @override
  String alertTeacherBankUnverified(String n) {
    return '$n بيانات بنكية لمعلمين بانتظار التحقق';
  }

  @override
  String alertPayoutsHeld(String n) {
    return '$n مستحقات معلّقة';
  }

  @override
  String rescheduleRequestTitle(String teacher, String slate) {
    return '$teacher يطلب نقل $slate';
  }

  @override
  String get newPayoutRun => 'دفعة مستحقات جديدة';

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
  String certificateSessionsNeeded(String n) {
    return 'يلزم حضور $n حصص أخرى';
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
  String certificateAttendedOfRequired(String attended, String required) {
    return '$attended من $required حصّة مطلوبة للحصول عليها';
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
  String get certificateTeacher => 'المدرّس';

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
  String certificateCompleteBody(String attended, String total) {
    return 'حضرت $attended من $total حصّة مباشرة.';
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
      'لا يمكن للمعلمين والمشرفين حذف حساباتهم ما دامت لديهم دفعات. تواصل مع الدعم.';

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
      'استخدم صورة واضحة وحديثة لوجهك. لا يراها إلا معلموك وزملاؤك.';

  @override
  String get addPhotoAction => 'أضف صورة';

  @override
  String get watchIntro => 'شاهد المقدمة';

  @override
  String get watchIntroHint => 'لمحة قصيرة عن الدورة والمعلم';

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
  String get sessionLanguage => 'لغة الجلسات';

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
  String get sessionCountLabel => 'عدد الجلسات';

  @override
  String get sessionCountInvalid => 'يجب أن يكون عدد الجلسات بين 1 و200.';

  @override
  String get previewSchedule => 'اعرض الجدول';

  @override
  String lastSessionOn(String date) {
    return 'آخر جلسة $date';
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
  String get sendBackNote => 'ملاحظة للمعلم';

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
      'لا تتسع الجلسات كلها في هذا الجدول. راجع الأيام والتواريخ.';

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
  String ratingSemantics(String avg, String count) {
    return 'التقييم $avg من 5 من $count مراجعة';
  }

  @override
  String get reviewsTitle => 'المراجعات';

  @override
  String reviewsCount(String count) {
    return '$count مراجعة';
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
  String starsN(String n) {
    return '$n نجوم';
  }

  @override
  String get replyAction => 'ردّ';

  @override
  String replyTo(String name) {
    return 'الرد على $name';
  }

  @override
  String get teacherReply => 'رد المعلم';

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
  String get instructorsTitle => 'المدرّبون';

  @override
  String get instructorsLede =>
      'من يدرّسون على عازة. افتح ملفًا لترى دوراته وصفوفه المفتوحة.';

  @override
  String get instructorsEmpty => 'لا يوجد مدرّبون بعد';

  @override
  String get meetInstructors => 'تعرّف على المدرّبين';

  @override
  String get meetInstructorsHint => 'من يدرّس على عازة، وماذا يدرّس';

  @override
  String get allInstructors => 'كل المدرّبين';

  @override
  String instructorCoursesN(String count) {
    return 'الدورات: $count';
  }

  @override
  String instructorOpenBatchesN(String count) {
    return 'الصفوف المفتوحة: $count';
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
      'حساب المدرّب جاهز. حدّث حسابك لتفتح استوديو المدرّب وتقترح دورتك الأولى.';

  @override
  String get applyRefresh => 'حدّث حسابي';

  @override
  String get refresh => 'تحديث';

  @override
  String get errAlreadyInstructor => 'أنت مدرّب على عازة بالفعل.';

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
  String lessonsCountN(String n) {
    return '$n درسًا';
  }

  @override
  String lessonNofM(String n, String m) {
    return 'الدرس $n من $m';
  }

  @override
  String get lessonHasVideo => 'فيديو';

  @override
  String lessonAttachmentsN(String n) {
    return '$n مرفقات';
  }

  @override
  String get lessonAttachments => 'المرفقات';

  @override
  String get noLessons => 'لا توجد دروس بعد';

  @override
  String get noLessonsBody => 'لم يُضف مدرّسك دروسًا لهذه الدورة بعد.';

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
  String get noQuizzesBody => 'ستظهر هنا الاختبارات التي ينشرها مدرّسوك.';

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
  String quizQuestionsN(String n) {
    return '$n أسئلة';
  }

  @override
  String quizMinutesN(String n) {
    return '$n دقيقة';
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
  String quizStartTimedBody(String minutes) {
    return 'سيكون لديك $minutes دقيقة بعد البدء. عند انتهاء الوقت تُسلَّم إجاباتك تلقائيًا.';
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
  String quizAnsweredOf(String answered, String total) {
    return 'أجبت عن $answered من $total سؤالًا.';
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
  String quizStudentsAttempted(String students, String attempts) {
    return '$students طلاب حاولوا · $attempts محاولات';
  }

  @override
  String get studentsLabel => 'الطلاب';

  @override
  String get quizAverage => 'المتوسط';

  @override
  String get quizNoAttemptsYet => 'لا محاولات بعد';

  @override
  String quizAttemptsN(String n) {
    return '$n محاولات';
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
  String chatUnreadN(String n) {
    return '$n غير مقروءة';
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
      'تواجه مشكلة في دفعة أو صفّ أو في حسابك؟ أخبرنا وسنساعدك.';

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
}
