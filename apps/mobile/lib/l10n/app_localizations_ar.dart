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
  String get errorTitle => 'حدث خلل في البث.';

  @override
  String get emptyGeneric => 'لا شيء هنا بعد.';

  @override
  String get seeAll => 'عرض الكل';

  @override
  String get continueLabel => 'متابعة';

  @override
  String get cancel => 'إلغاء';

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
  String get splashTagline => 'دفعات مباشرة · منذ ٢٠٢٦';

  @override
  String get splashLine => 'تعلّم مباشرةً، مع دفعة تحضر فعلًا.';

  @override
  String get chooseLanguage => 'اختر لغتك';

  @override
  String get leftToRight => 'من اليسار إلى اليمين';

  @override
  String get rightToLeft => 'من اليمين إلى اليسار';

  @override
  String get languageHint =>
      'يمكنك تغيير اللغة في أي وقت من حسابي ← اللغة والمنطقة. لغة الجلسات تحدّدها كل دفعة على حدة.';

  @override
  String get onboardingTitle => 'ماذا تريد أن تتعلّم مباشرةً؟';

  @override
  String get onboardingTimezone =>
      'منطقتك الزمنية — تُحوَّل مواعيد الدفعات إليها';

  @override
  String get detected => 'تم اكتشافها';

  @override
  String get bestTime => 'أنسب وقت لك';

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
  String get signInTitle => 'احجز مقعدك.';

  @override
  String get signInSubtitle =>
      'حساب واحد لكل دفعة تنضم إليها — على هاتفك أو على الويب.';

  @override
  String get signUpTitle => 'أنشئ حسابك.';

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
  String get passwordTooShort => '٨ أحرف على الأقل';

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
      'بعد ذلك سنطلب الكاميرا والميكروفون مرة واحدة، لتنضم إلى الجلسات بلمسة واحدة.';

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
  String get joinLiveRoom => 'انضم الآن';

  @override
  String inRoom(String count) {
    return '$count في الغرفة';
  }

  @override
  String get myBatches => 'دفعاتي';

  @override
  String nextAt(String when) {
    return 'التالية · $when';
  }

  @override
  String get continueWatching => 'تابع المشاهدة';

  @override
  String get noBatchesTitle => 'لا دفعات بعد';

  @override
  String get noBatchesBody => 'اختر دورة ودفعة يناسب جدولها أسبوعك.';

  @override
  String get exploreCta => 'استكشف الدورات';

  @override
  String get upNext => 'التالي';

  @override
  String get exploreTitle => 'اعثر على دفعة تناسب أسبوعك.';

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
    return '$n جلسة مباشرة';
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
    return 'اختر دفعة · $n';
  }

  @override
  String get pickBatch => 'اختر دفعة';

  @override
  String timesShownIn(String tz) {
    return 'التوقيت: $tz';
  }

  @override
  String get fullSchedule => 'الجدول الكامل';

  @override
  String enrollIn(String code) {
    return 'سجّل في $code';
  }

  @override
  String seatsLeft(String n) {
    return '$n مقاعد متبقية';
  }

  @override
  String seatsOf(String taken, String capacity) {
    return '$taken/$capacity';
  }

  @override
  String get noOpenBatches => 'لا دفعات مفتوحة حاليًا. عُد قريبًا.';

  @override
  String joiningLate(String ran, String left) {
    return 'تنضم متأخرًا؟ انعقدت $ran جلسات — تجدها في المكتبة كتسجيلات. تتبقى $left جلسات مباشرة.';
  }

  @override
  String get addToCalendar => 'أضف إلى التقويم';

  @override
  String continueWithPrice(String price) {
    return 'متابعة · $price';
  }

  @override
  String sessionN(String n) {
    return 'الجلسة $n';
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
  String get batchPrice => 'سعر الدفعة';

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
  String get payCardSub => 'مقعد فوري · 3-D Secure';

  @override
  String get payBank => 'تحويل بنكي';

  @override
  String get payBankSub => 'يُحجز المقعد ٤٨ ساعة أثناء التحويل';

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
    return 'المقعد محجوز $time';
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
      'ارفع إيصال التحويل (PDF أو JPG أو PNG · حتى ١٠ م.ب)';

  @override
  String get chooseFile => 'اختر ملفًا';

  @override
  String get fileTooLarge => 'الملف أكبر من ١٠ م.ب.';

  @override
  String get iSentTransfer => 'أرسلت التحويل';

  @override
  String get holdExpired => 'انتهت مهلة الـ٤٨ ساعة وأُطلق المقعد.';

  @override
  String get noBanks => 'لا توجد بنوك مستلِمة مفعّلة. تواصل مع الدعم.';

  @override
  String orderRef(String ref) {
    return 'الطلب $ref';
  }

  @override
  String get almostOnAir => 'على وشك البث.';

  @override
  String verifyingBody(String code, String amount) {
    return 'نحجز مقعدك في $code بينما يتحقق قسم المالية من تحويل $amount.';
  }

  @override
  String get tlOrderCreated => 'المقعد محجوز';

  @override
  String get tlReceiptUploaded => 'رُفع الإيصال';

  @override
  String get tlFinanceVerifying => 'المالية تتحقق';

  @override
  String get tlSeatConfirmed => 'تأكد المقعد';

  @override
  String get rejectedTitle => 'الإيصال يحتاج إلى مراجعة';

  @override
  String get reupload => 'أعد رفع الإيصال';

  @override
  String get contactSupport => 'تواصل مع دعم المالية';

  @override
  String get orderFailedBody => 'لم يكتمل الدفع. يمكنك المحاولة مجددًا.';

  @override
  String get orderExpiredBody => 'انتهت صلاحية هذا الطلب وأُطلق المقعد.';

  @override
  String get goToSchedule => 'اذهب إلى جدولي';

  @override
  String get youreIn => 'أنت معنا.';

  @override
  String enrolledBody(String course, String code, String n) {
    return 'مقعدك في $course · $code محجوز لك. أُضيفت $n جلسات مباشرة إلى جدولك.';
  }

  @override
  String get nextTake => 'الجلسة التالية';

  @override
  String get days => 'أيام';

  @override
  String get hrs => 'ساعات';

  @override
  String get mins => 'دقائق';

  @override
  String lobbyOpensAt(String time) {
    return 'تُفتح الردهة $time';
  }

  @override
  String syncCalendar(String n) {
    return 'زامن $n جلسات مع التقويم';
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
  String get noSessionsWeek => 'لا جلسات هذا الأسبوع.';

  @override
  String get prevWeek => 'الأسبوع السابق';

  @override
  String get nextWeek => 'الأسبوع التالي';

  @override
  String lobbyOpenStarts(String time) {
    return 'الردهة مفتوحة · تبدأ $time';
  }

  @override
  String lobbyStarts(String time) {
    return 'الردهة · تبدأ $time';
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
  String get lobbyClosed => 'تُفتح الردهة قبل ١٥ دقيقة من بدء الجلسة.';

  @override
  String get goLive => 'ابدأ البث';

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
  String get liveUnavailable => 'الفيديو غير متاح لهذه الجلسة بعد.';

  @override
  String edgeWaitingTitle(String host) {
    return 'لم تبدأ الجلسة بعد مع $host';
  }

  @override
  String get edgeWaitingSub => 'تبدأ عادةً خلال ٥ دقائق · ستنضم تلقائيًا';

  @override
  String get edgeLiveNow => 'مباشر الآن';

  @override
  String get edgePermTitle => 'الكاميرا أو الميكروفون محظوران';

  @override
  String get edgePermBody =>
      'لا يستطيع عازة استخدام الكاميرا أو الميكروفون، لذا لا يراك الصف ولا يسمعك.';

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
  String get edgeLostBody => 'تعذّرت إعادتك تلقائيًا. مقعدك ما زال محجوزًا.';

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
      'يتوفر مقعد بمجرد مغادرة أحدهم. حاول بعد دقيقة، أو شاهد التسجيل بعد الحصة.';

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
  String get edgeEndedTitle => 'انتهت هذه الجلسة';

  @override
  String get edgeEndedBody => 'يظهر التسجيل في صفحة تعلّمك عندما يصبح جاهزًا.';

  @override
  String get edgeNotEnrolledTitle => 'لست مسجّلًا في هذه الدفعة';

  @override
  String get edgeNotEnrolledBody =>
      'تحتاج إلى تسجيل نشط في هذه الدفعة للانضمام.';

  @override
  String get edgeBackToSchedule => 'العودة إلى الجدول';

  @override
  String get edgeWaitingButton => 'بانتظار المضيف…';

  @override
  String get wrapTitle => 'انتهى التصوير.';

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
  String get recordingSoon => 'جاهز خلال ٢٠ دقيقة تقريبًا · سنُعلمك';

  @override
  String get nextLabel => 'التالي';

  @override
  String get sendFeedback => 'أرسل التقييم';

  @override
  String get thanksFeedback => 'شكرًا — أُرسل التقييم.';

  @override
  String get libraryTitle => 'المكتبة';

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
  String get noRecordings => 'تظهر التسجيلات هنا بعد كل جلسة.';

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
  String get enrollFirst => 'سجّل في دفعة لتفتح التسجيلات والمواد.';

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
    return '$n دفعات';
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
  String get nextTakeLobbyOpen => 'الجلسة التالية · الردهة مفتوحة';

  @override
  String nextTakeIn(String time) {
    return 'الجلسة التالية · تبدأ خلال $time';
  }

  @override
  String get enterLobby => 'افتح الردهة';

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
  String get openLobby => 'افتح الردهة';

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
  String get adminReviews => 'تراجع الإدارة الطلبات خلال ٢٤ ساعة.';

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
      'احتُسب الحضور من سجلات الانضمام والمغادرة في LiveKit. الحضور الكامل = ٧٥٪ من مدة الجلسة على الأقل.';

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
  String get ibanInvalid => 'آيبان إماراتي: AE + ٢١ رقمًا';

  @override
  String get swiftInvalid => '٨ أو ١١ حرفًا/رقمًا';

  @override
  String sessionsDelivered(String n) {
    return '$n جلسات منجزة';
  }

  @override
  String opsGreeting(String name) {
    return 'العمليات، $name';
  }

  @override
  String get onAirLabel => 'على الهواء';

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
  String get liveMonitorTitle => 'على الهواء الآن';

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
  String get noLiveRooms => 'لا غرف على الهواء.';

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
  String get certificatesEmptyTitle => 'لا شهادات بعد';

  @override
  String get certificatesEmptyBody =>
      'احضر 80٪ على الأقل من جلسات الدفعة، وستظهر شهادتك هنا عند انتهائها.';

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
    return 'يلزم حضور $n جلسات أخرى';
  }

  @override
  String get certificateOneSessionNeeded => 'يلزم حضور جلسة واحدة أخرى';

  @override
  String get certificateRequirementMet =>
      'اكتمل الحضور المطلوب — تصدر شهادتك عند انتهاء الدفعة.';

  @override
  String get certificateUnreachable =>
      'لم تعد الجلسات المتبقية كافية لبلوغ 80٪ في هذه الدفعة.';

  @override
  String certificateAttendedOfRequired(String attended, String required) {
    return '$attended من $required جلسة مطلوبة للحصول عليها';
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
  String get certificateBatch => 'الدفعة';

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
    return 'حضرت $attended من $total جلسة مباشرة.';
  }

  @override
  String certificateVerifyHint(String url) {
    return 'يمكن لأي شخص التحقق منها عبر $url';
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
      'عندما يتوفر مقعد، يُعرض على أول شخص في الدور.';

  @override
  String get waitlistStepNotify =>
      'سنرسل لك إشعارًا وبريدًا إلكترونيًا فور أن يصبح المقعد لك.';

  @override
  String get waitlistStepHold =>
      'سيكون أمامك 24 ساعة لإتمام الدفع قبل أن ينتقل المقعد إلى التالي.';

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
  String get waitlistSeatOpen => 'توفّر مقعد لك';

  @override
  String waitlistHeldFor(String time) {
    return 'محجوز لك · $time';
  }

  @override
  String get waitlistHoldExpired => 'انتهت مدة الحجز';

  @override
  String get waitlistClaimSeat => 'احجز المقعد';

  @override
  String get teacherAbout => 'نبذة';

  @override
  String get teacherTeachesIn => 'يدرّس باللغة';

  @override
  String get teacherCourses => 'الدورات';

  @override
  String get teacherUpcomingBatches => 'الدفعات القادمة';

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
      'غيّر الإشعارات من إعدادات هاتفك ← التطبيقات ← Azza.';

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
  String get errNetwork =>
      'لا يوجد اتصال بـ Azza. تحقّق من الشبكة وحاول مجددًا.';

  @override
  String get errTimeout => 'استغرقت Azza وقتًا طويلًا للرد. حاول مجددًا.';

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
  String get timezoneHint => 'تُعرض مواعيد الجلسات بهذه المنطقة الزمنية.';

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
      'تتولى Apple عملية الدفع. يُؤكَّد مقعدك فور اكتمال الشراء.';

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
  String get enrolOnWebsiteBody => 'هذا المقعد غير متاح للشراء داخل التطبيق.';

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
      'تعذّر فتح الكاميرا أو الصور. تحقّق من أذونات Azza في الإعدادات.';

  @override
  String get addPhotoTitle => 'أضف صورتك';

  @override
  String get addPhotoBody =>
      'يرى معلمك صورتك في قائمة الصف وفي الجلسات المباشرة ليعرف من في القاعة.';

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
      'يمكنك تقييم هذه الدورة بعد حضور إحدى جلساتها.';
}
