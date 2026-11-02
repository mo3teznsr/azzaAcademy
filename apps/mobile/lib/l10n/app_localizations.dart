import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'azza'**
  String get appName;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @errorTitle.
  ///
  /// In en, this message translates to:
  /// **'Something went off-air.'**
  String get errorTitle;

  /// No description provided for @emptyGeneric.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet.'**
  String get emptyGeneric;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get seeAll;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @skip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get skip;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @copy.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get copy;

  /// No description provided for @copied.
  ///
  /// In en, this message translates to:
  /// **'Copied'**
  String get copied;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @send.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get send;

  /// No description provided for @you.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get you;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming soon on mobile.'**
  String get comingSoon;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navExplore.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get navExplore;

  /// No description provided for @navSchedule.
  ///
  /// In en, this message translates to:
  /// **'Schedule'**
  String get navSchedule;

  /// No description provided for @navLibrary.
  ///
  /// In en, this message translates to:
  /// **'Library'**
  String get navLibrary;

  /// No description provided for @navMe.
  ///
  /// In en, this message translates to:
  /// **'Me'**
  String get navMe;

  /// No description provided for @navToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get navToday;

  /// No description provided for @navBatches.
  ///
  /// In en, this message translates to:
  /// **'Batches'**
  String get navBatches;

  /// No description provided for @navCalendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get navCalendar;

  /// No description provided for @navEarnings.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get navEarnings;

  /// No description provided for @navOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get navOverview;

  /// No description provided for @navLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get navLive;

  /// No description provided for @navApprovals.
  ///
  /// In en, this message translates to:
  /// **'Approvals'**
  String get navApprovals;

  /// No description provided for @statusScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get statusScheduled;

  /// No description provided for @statusStartsIn.
  ///
  /// In en, this message translates to:
  /// **'Starts in {minutes}m'**
  String statusStartsIn(String minutes);

  /// No description provided for @statusLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get statusLive;

  /// No description provided for @statusEnded.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get statusEnded;

  /// No description provided for @statusRescheduled.
  ///
  /// In en, this message translates to:
  /// **'Rescheduled'**
  String get statusRescheduled;

  /// No description provided for @statusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get statusCancelled;

  /// No description provided for @batchDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get batchDraft;

  /// No description provided for @batchEnrolling.
  ///
  /// In en, this message translates to:
  /// **'Enrolling'**
  String get batchEnrolling;

  /// No description provided for @batchFull.
  ///
  /// In en, this message translates to:
  /// **'Full · waitlist'**
  String get batchFull;

  /// No description provided for @batchRunning.
  ///
  /// In en, this message translates to:
  /// **'Running'**
  String get batchRunning;

  /// No description provided for @batchCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get batchCompleted;

  /// No description provided for @batchCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get batchCancelled;

  /// No description provided for @orderAwaitingPayment.
  ///
  /// In en, this message translates to:
  /// **'Awaiting payment'**
  String get orderAwaitingPayment;

  /// No description provided for @orderAwaitingReceipt.
  ///
  /// In en, this message translates to:
  /// **'Awaiting receipt'**
  String get orderAwaitingReceipt;

  /// No description provided for @orderVerifying.
  ///
  /// In en, this message translates to:
  /// **'Verifying'**
  String get orderVerifying;

  /// No description provided for @orderAmountMismatch.
  ///
  /// In en, this message translates to:
  /// **'Amount mismatch'**
  String get orderAmountMismatch;

  /// No description provided for @orderPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get orderPaid;

  /// No description provided for @orderFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get orderFailed;

  /// No description provided for @orderRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get orderRejected;

  /// No description provided for @orderExpired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get orderExpired;

  /// No description provided for @orderRefunded.
  ///
  /// In en, this message translates to:
  /// **'Refunded'**
  String get orderRefunded;

  /// No description provided for @splashTagline.
  ///
  /// In en, this message translates to:
  /// **'Live cohorts · since 2026'**
  String get splashTagline;

  /// No description provided for @splashLine.
  ///
  /// In en, this message translates to:
  /// **'Learn live, with a batch that shows up.'**
  String get splashLine;

  /// No description provided for @chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose your language'**
  String get chooseLanguage;

  /// No description provided for @leftToRight.
  ///
  /// In en, this message translates to:
  /// **'Left to right'**
  String get leftToRight;

  /// No description provided for @rightToLeft.
  ///
  /// In en, this message translates to:
  /// **'Right to left'**
  String get rightToLeft;

  /// No description provided for @languageHint.
  ///
  /// In en, this message translates to:
  /// **'You can change the language any time from Me → Language & region. Each batch sets its own session language.'**
  String get languageHint;

  /// No description provided for @onboardingTitle.
  ///
  /// In en, this message translates to:
  /// **'What do you want to learn live?'**
  String get onboardingTitle;

  /// No description provided for @onboardingTimezone.
  ///
  /// In en, this message translates to:
  /// **'Your timezone — batch times convert to it'**
  String get onboardingTimezone;

  /// No description provided for @detected.
  ///
  /// In en, this message translates to:
  /// **'detected'**
  String get detected;

  /// No description provided for @bestTime.
  ///
  /// In en, this message translates to:
  /// **'Best time for you'**
  String get bestTime;

  /// No description provided for @mornings.
  ///
  /// In en, this message translates to:
  /// **'Mornings'**
  String get mornings;

  /// No description provided for @evenings.
  ///
  /// In en, this message translates to:
  /// **'Evenings'**
  String get evenings;

  /// No description provided for @weekends.
  ///
  /// In en, this message translates to:
  /// **'Weekends'**
  String get weekends;

  /// No description provided for @interestDesign.
  ///
  /// In en, this message translates to:
  /// **'Design'**
  String get interestDesign;

  /// No description provided for @interestLanguages.
  ///
  /// In en, this message translates to:
  /// **'Languages'**
  String get interestLanguages;

  /// No description provided for @interestCode.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get interestCode;

  /// No description provided for @interestBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get interestBusiness;

  /// No description provided for @interestArt.
  ///
  /// In en, this message translates to:
  /// **'Art'**
  String get interestArt;

  /// No description provided for @interestMusic.
  ///
  /// In en, this message translates to:
  /// **'Music'**
  String get interestMusic;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Take your seat.'**
  String get signInTitle;

  /// No description provided for @signInSubtitle.
  ///
  /// In en, this message translates to:
  /// **'One account for every batch you join — on your phone or the web.'**
  String get signInSubtitle;

  /// No description provided for @signUpTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your account.'**
  String get signUpTitle;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get fullName;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get createAccount;

  /// No description provided for @haveAccount.
  ///
  /// In en, this message translates to:
  /// **'I already have an account'**
  String get haveAccount;

  /// No description provided for @noAccount.
  ///
  /// In en, this message translates to:
  /// **'New here? Create an account'**
  String get noAccount;

  /// No description provided for @orLabel.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get orLabel;

  /// No description provided for @continueGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get continueGoogle;

  /// No description provided for @continueApple.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get continueApple;

  /// No description provided for @termsNote.
  ///
  /// In en, this message translates to:
  /// **'By continuing you agree to the Terms and Privacy policy.'**
  String get termsNote;

  /// No description provided for @invalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email'**
  String get invalidEmail;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'At least 8 characters'**
  String get passwordTooShort;

  /// No description provided for @nameTooShort.
  ///
  /// In en, this message translates to:
  /// **'At least 2 characters'**
  String get nameTooShort;

  /// No description provided for @verifyTitle.
  ///
  /// In en, this message translates to:
  /// **'Check your inbox.'**
  String get verifyTitle;

  /// No description provided for @verifyBody.
  ///
  /// In en, this message translates to:
  /// **'We sent a verification link to {email}.'**
  String verifyBody(String email);

  /// No description provided for @resendIn.
  ///
  /// In en, this message translates to:
  /// **'Resend in {time}'**
  String resendIn(String time);

  /// No description provided for @resend.
  ///
  /// In en, this message translates to:
  /// **'Resend'**
  String get resend;

  /// No description provided for @changeEmail.
  ///
  /// In en, this message translates to:
  /// **'Change email'**
  String get changeEmail;

  /// No description provided for @verifyPermissions.
  ///
  /// In en, this message translates to:
  /// **'After this we\'ll ask for camera and mic once, so you can join sessions in one tap.'**
  String get verifyPermissions;

  /// No description provided for @verifyContinue.
  ///
  /// In en, this message translates to:
  /// **'Verify & continue'**
  String get verifyContinue;

  /// No description provided for @greetingMorning.
  ///
  /// In en, this message translates to:
  /// **'Morning, {name}'**
  String greetingMorning(String name);

  /// No description provided for @greetingAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Afternoon, {name}'**
  String greetingAfternoon(String name);

  /// No description provided for @greetingEvening.
  ///
  /// In en, this message translates to:
  /// **'Evening, {name}'**
  String greetingEvening(String name);

  /// No description provided for @liveNow.
  ///
  /// In en, this message translates to:
  /// **'Live now'**
  String get liveNow;

  /// No description provided for @joinLiveRoom.
  ///
  /// In en, this message translates to:
  /// **'Join live room'**
  String get joinLiveRoom;

  /// No description provided for @inRoom.
  ///
  /// In en, this message translates to:
  /// **'{count} in room'**
  String inRoom(String count);

  /// No description provided for @myBatches.
  ///
  /// In en, this message translates to:
  /// **'My batches'**
  String get myBatches;

  /// No description provided for @nextAt.
  ///
  /// In en, this message translates to:
  /// **'Next · {when}'**
  String nextAt(String when);

  /// No description provided for @continueWatching.
  ///
  /// In en, this message translates to:
  /// **'Continue watching'**
  String get continueWatching;

  /// No description provided for @noBatchesTitle.
  ///
  /// In en, this message translates to:
  /// **'No batches yet'**
  String get noBatchesTitle;

  /// No description provided for @noBatchesBody.
  ///
  /// In en, this message translates to:
  /// **'Pick a course and a batch whose schedule fits your week.'**
  String get noBatchesBody;

  /// No description provided for @exploreCta.
  ///
  /// In en, this message translates to:
  /// **'Explore courses'**
  String get exploreCta;

  /// No description provided for @upNext.
  ///
  /// In en, this message translates to:
  /// **'Up next'**
  String get upNext;

  /// No description provided for @exploreTitle.
  ///
  /// In en, this message translates to:
  /// **'Find a batch that fits your week.'**
  String get exploreTitle;

  /// No description provided for @searchCourses.
  ///
  /// In en, this message translates to:
  /// **'Search courses'**
  String get searchCourses;

  /// No description provided for @allFilter.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allFilter;

  /// No description provided for @coursesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} courses'**
  String coursesCount(String count);

  /// No description provided for @noCoursesFound.
  ///
  /// In en, this message translates to:
  /// **'No courses match. Try another search.'**
  String get noCoursesFound;

  /// No description provided for @levelN.
  ///
  /// In en, this message translates to:
  /// **'Level {n}'**
  String levelN(String n);

  /// No description provided for @liveSessionsN.
  ///
  /// In en, this message translates to:
  /// **'{n} live sessions'**
  String liveSessionsN(String n);

  /// No description provided for @recordings.
  ///
  /// In en, this message translates to:
  /// **'Recordings'**
  String get recordings;

  /// No description provided for @certificate.
  ///
  /// In en, this message translates to:
  /// **'Certificate'**
  String get certificate;

  /// No description provided for @teaches.
  ///
  /// In en, this message translates to:
  /// **'Teaches {codes}'**
  String teaches(String codes);

  /// No description provided for @outcomesTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'ll leave able to'**
  String get outcomesTitle;

  /// No description provided for @syllabusN.
  ///
  /// In en, this message translates to:
  /// **'Syllabus · {n} modules'**
  String syllabusN(String n);

  /// No description provided for @fromPrice.
  ///
  /// In en, this message translates to:
  /// **'From {price}'**
  String fromPrice(String price);

  /// No description provided for @chooseBatchN.
  ///
  /// In en, this message translates to:
  /// **'Choose a batch · {n}'**
  String chooseBatchN(String n);

  /// No description provided for @pickBatch.
  ///
  /// In en, this message translates to:
  /// **'Pick your batch.'**
  String get pickBatch;

  /// No description provided for @timesShownIn.
  ///
  /// In en, this message translates to:
  /// **'Times shown in {tz}'**
  String timesShownIn(String tz);

  /// No description provided for @fullSchedule.
  ///
  /// In en, this message translates to:
  /// **'Full schedule'**
  String get fullSchedule;

  /// No description provided for @enrollIn.
  ///
  /// In en, this message translates to:
  /// **'Enroll in {code}'**
  String enrollIn(String code);

  /// No description provided for @seatsLeft.
  ///
  /// In en, this message translates to:
  /// **'{n} seats left'**
  String seatsLeft(String n);

  /// No description provided for @seatsOf.
  ///
  /// In en, this message translates to:
  /// **'{taken}/{capacity}'**
  String seatsOf(String taken, String capacity);

  /// No description provided for @noOpenBatches.
  ///
  /// In en, this message translates to:
  /// **'No open batches right now. Check back soon.'**
  String get noOpenBatches;

  /// No description provided for @joiningLate.
  ///
  /// In en, this message translates to:
  /// **'Joining late? {ran} sessions already ran — they\'re in the library as recordings. {left} live sessions left.'**
  String joiningLate(String ran, String left);

  /// No description provided for @addToCalendar.
  ///
  /// In en, this message translates to:
  /// **'Add to calendar'**
  String get addToCalendar;

  /// No description provided for @continueWithPrice.
  ///
  /// In en, this message translates to:
  /// **'Continue · {price}'**
  String continueWithPrice(String price);

  /// No description provided for @sessionN.
  ///
  /// In en, this message translates to:
  /// **'Session {n}'**
  String sessionN(String n);

  /// No description provided for @joinWaitlist.
  ///
  /// In en, this message translates to:
  /// **'Join waitlist'**
  String get joinWaitlist;

  /// No description provided for @checkoutTitle.
  ///
  /// In en, this message translates to:
  /// **'Checkout'**
  String get checkoutTitle;

  /// No description provided for @stepOf.
  ///
  /// In en, this message translates to:
  /// **'Step {a} / {b}'**
  String stepOf(String a, String b);

  /// No description provided for @showPricesIn.
  ///
  /// In en, this message translates to:
  /// **'Show prices in'**
  String get showPricesIn;

  /// No description provided for @batchPrice.
  ///
  /// In en, this message translates to:
  /// **'Batch price'**
  String get batchPrice;

  /// No description provided for @coupon.
  ///
  /// In en, this message translates to:
  /// **'Coupon'**
  String get coupon;

  /// No description provided for @apply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get apply;

  /// No description provided for @discount.
  ///
  /// In en, this message translates to:
  /// **'Discount'**
  String get discount;

  /// No description provided for @vat.
  ///
  /// In en, this message translates to:
  /// **'VAT'**
  String get vat;

  /// No description provided for @total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @chargedInAed.
  ///
  /// In en, this message translates to:
  /// **'Charged in {aed}. Your bank converts. {currency} is an estimate at 1 AED = {rate} {currency}.'**
  String chargedInAed(String aed, String currency, String rate);

  /// No description provided for @chargedExact.
  ///
  /// In en, this message translates to:
  /// **'Charged in AED. This is the exact amount.'**
  String get chargedExact;

  /// No description provided for @payWith.
  ///
  /// In en, this message translates to:
  /// **'Pay with'**
  String get payWith;

  /// No description provided for @payCard.
  ///
  /// In en, this message translates to:
  /// **'Card · Apple Pay · Google Pay'**
  String get payCard;

  /// No description provided for @payCardSub.
  ///
  /// In en, this message translates to:
  /// **'Instant seat · 3-D Secure'**
  String get payCardSub;

  /// No description provided for @payBank.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer'**
  String get payBank;

  /// No description provided for @payBankSub.
  ///
  /// In en, this message translates to:
  /// **'Seat held 48 h while you transfer'**
  String get payBankSub;

  /// No description provided for @continueAmount.
  ///
  /// In en, this message translates to:
  /// **'Continue · {amount}'**
  String continueAmount(String amount);

  /// No description provided for @couponInvalid.
  ///
  /// In en, this message translates to:
  /// **'That coupon didn\'t apply.'**
  String get couponInvalid;

  /// No description provided for @payByCard.
  ///
  /// In en, this message translates to:
  /// **'Pay by card'**
  String get payByCard;

  /// No description provided for @payAmount.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount}'**
  String payAmount(String amount);

  /// No description provided for @cardNote.
  ///
  /// In en, this message translates to:
  /// **'Your bank may ask you to confirm with 3-D Secure. Your card statement will show {amount}.'**
  String cardNote(String amount);

  /// No description provided for @securedByStripe.
  ///
  /// In en, this message translates to:
  /// **'Secured by Stripe · we never store card numbers'**
  String get securedByStripe;

  /// No description provided for @stripeUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Card payments aren\'t configured in this build. Use bank transfer.'**
  String get stripeUnavailable;

  /// No description provided for @paymentCancelled.
  ///
  /// In en, this message translates to:
  /// **'Payment cancelled.'**
  String get paymentCancelled;

  /// No description provided for @bankTransfer.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer'**
  String get bankTransfer;

  /// No description provided for @seatHeld.
  ///
  /// In en, this message translates to:
  /// **'Seat held {time}'**
  String seatHeld(String time);

  /// No description provided for @transferExactly.
  ///
  /// In en, this message translates to:
  /// **'Transfer exactly'**
  String get transferExactly;

  /// No description provided for @reference.
  ///
  /// In en, this message translates to:
  /// **'Reference'**
  String get reference;

  /// No description provided for @referenceHint.
  ///
  /// In en, this message translates to:
  /// **'Put the reference in the transfer notes. Send AED, or ask your bank to convert so {amount} arrives.'**
  String referenceHint(String amount);

  /// No description provided for @chooseBank.
  ///
  /// In en, this message translates to:
  /// **'Choose a receiving bank'**
  String get chooseBank;

  /// No description provided for @copyIbanOf.
  ///
  /// In en, this message translates to:
  /// **'Copy full IBAN of {bank}'**
  String copyIbanOf(String bank);

  /// No description provided for @uploadReceipt.
  ///
  /// In en, this message translates to:
  /// **'Upload transfer receipt (PDF, JPG, PNG · max 10 MB)'**
  String get uploadReceipt;

  /// No description provided for @chooseFile.
  ///
  /// In en, this message translates to:
  /// **'Choose file'**
  String get chooseFile;

  /// No description provided for @fileTooLarge.
  ///
  /// In en, this message translates to:
  /// **'File is larger than 10 MB.'**
  String get fileTooLarge;

  /// No description provided for @iSentTransfer.
  ///
  /// In en, this message translates to:
  /// **'I\'ve sent the transfer'**
  String get iSentTransfer;

  /// No description provided for @holdExpired.
  ///
  /// In en, this message translates to:
  /// **'The 48 h hold expired and the seat was released.'**
  String get holdExpired;

  /// No description provided for @noBanks.
  ///
  /// In en, this message translates to:
  /// **'No receiving banks are active. Contact support.'**
  String get noBanks;

  /// No description provided for @orderRef.
  ///
  /// In en, this message translates to:
  /// **'Order {ref}'**
  String orderRef(String ref);

  /// No description provided for @almostOnAir.
  ///
  /// In en, this message translates to:
  /// **'Almost on air.'**
  String get almostOnAir;

  /// No description provided for @verifyingBody.
  ///
  /// In en, this message translates to:
  /// **'We hold your seat in {code} while finance checks the transfer of {amount}.'**
  String verifyingBody(String code, String amount);

  /// No description provided for @tlOrderCreated.
  ///
  /// In en, this message translates to:
  /// **'Seat held'**
  String get tlOrderCreated;

  /// No description provided for @tlReceiptUploaded.
  ///
  /// In en, this message translates to:
  /// **'Receipt uploaded'**
  String get tlReceiptUploaded;

  /// No description provided for @tlFinanceVerifying.
  ///
  /// In en, this message translates to:
  /// **'Finance verifying'**
  String get tlFinanceVerifying;

  /// No description provided for @tlSeatConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Seat confirmed'**
  String get tlSeatConfirmed;

  /// No description provided for @rejectedTitle.
  ///
  /// In en, this message translates to:
  /// **'Receipt needs attention'**
  String get rejectedTitle;

  /// No description provided for @reupload.
  ///
  /// In en, this message translates to:
  /// **'Re-upload receipt'**
  String get reupload;

  /// No description provided for @contactSupport.
  ///
  /// In en, this message translates to:
  /// **'Contact finance support'**
  String get contactSupport;

  /// No description provided for @orderFailedBody.
  ///
  /// In en, this message translates to:
  /// **'The payment didn\'t go through. You can try again.'**
  String get orderFailedBody;

  /// No description provided for @orderExpiredBody.
  ///
  /// In en, this message translates to:
  /// **'This order expired and the seat was released.'**
  String get orderExpiredBody;

  /// No description provided for @goToSchedule.
  ///
  /// In en, this message translates to:
  /// **'Go to my schedule'**
  String get goToSchedule;

  /// No description provided for @youreIn.
  ///
  /// In en, this message translates to:
  /// **'You\'re in.'**
  String get youreIn;

  /// No description provided for @enrolledBody.
  ///
  /// In en, this message translates to:
  /// **'Your seat in {course} · {code} is yours. {n} live sessions are now in your schedule.'**
  String enrolledBody(String course, String code, String n);

  /// No description provided for @nextTake.
  ///
  /// In en, this message translates to:
  /// **'Next take'**
  String get nextTake;

  /// No description provided for @days.
  ///
  /// In en, this message translates to:
  /// **'days'**
  String get days;

  /// No description provided for @hrs.
  ///
  /// In en, this message translates to:
  /// **'hrs'**
  String get hrs;

  /// No description provided for @mins.
  ///
  /// In en, this message translates to:
  /// **'min'**
  String get mins;

  /// No description provided for @lobbyOpensAt.
  ///
  /// In en, this message translates to:
  /// **'lobby opens {time}'**
  String lobbyOpensAt(String time);

  /// No description provided for @syncCalendar.
  ///
  /// In en, this message translates to:
  /// **'Sync {n} sessions to calendar'**
  String syncCalendar(String n);

  /// No description provided for @watchRecordings.
  ///
  /// In en, this message translates to:
  /// **'Watch recordings'**
  String get watchRecordings;

  /// No description provided for @myOrders.
  ///
  /// In en, this message translates to:
  /// **'My orders'**
  String get myOrders;

  /// No description provided for @noOrders.
  ///
  /// In en, this message translates to:
  /// **'No orders yet.'**
  String get noOrders;

  /// No description provided for @thisWeek.
  ///
  /// In en, this message translates to:
  /// **'This week'**
  String get thisWeek;

  /// No description provided for @noSessionsWeek.
  ///
  /// In en, this message translates to:
  /// **'No sessions this week.'**
  String get noSessionsWeek;

  /// No description provided for @prevWeek.
  ///
  /// In en, this message translates to:
  /// **'Previous week'**
  String get prevWeek;

  /// No description provided for @nextWeek.
  ///
  /// In en, this message translates to:
  /// **'Next week'**
  String get nextWeek;

  /// No description provided for @lobbyOpenStarts.
  ///
  /// In en, this message translates to:
  /// **'Lobby open · starts {time}'**
  String lobbyOpenStarts(String time);

  /// No description provided for @lobbyStarts.
  ///
  /// In en, this message translates to:
  /// **'Lobby · starts {time}'**
  String lobbyStarts(String time);

  /// No description provided for @cameraPreview.
  ///
  /// In en, this message translates to:
  /// **'You · camera preview'**
  String get cameraPreview;

  /// No description provided for @microphone.
  ///
  /// In en, this message translates to:
  /// **'Microphone'**
  String get microphone;

  /// No description provided for @camera.
  ///
  /// In en, this message translates to:
  /// **'Camera'**
  String get camera;

  /// No description provided for @joinAs.
  ///
  /// In en, this message translates to:
  /// **'Join as {name}'**
  String joinAs(String name);

  /// No description provided for @lobbyClosed.
  ///
  /// In en, this message translates to:
  /// **'The lobby opens 15 min before the session starts.'**
  String get lobbyClosed;

  /// No description provided for @goLive.
  ///
  /// In en, this message translates to:
  /// **'Go live'**
  String get goLive;

  /// No description provided for @recordSession.
  ///
  /// In en, this message translates to:
  /// **'Record session'**
  String get recordSession;

  /// No description provided for @recordSessionSub.
  ///
  /// In en, this message translates to:
  /// **'Saved to the batch library after processing'**
  String get recordSessionSub;

  /// No description provided for @waitingN.
  ///
  /// In en, this message translates to:
  /// **'{n} waiting'**
  String waitingN(String n);

  /// No description provided for @networkCheck.
  ///
  /// In en, this message translates to:
  /// **'Network check runs when you join'**
  String get networkCheck;

  /// No description provided for @connecting.
  ///
  /// In en, this message translates to:
  /// **'Connecting…'**
  String get connecting;

  /// No description provided for @rec.
  ///
  /// In en, this message translates to:
  /// **'Rec'**
  String get rec;

  /// No description provided for @reconnecting.
  ///
  /// In en, this message translates to:
  /// **'Reconnecting…'**
  String get reconnecting;

  /// No description provided for @reconnectingBody.
  ///
  /// In en, this message translates to:
  /// **'Weak signal. Video paused to keep audio.'**
  String get reconnectingBody;

  /// No description provided for @hostLabel.
  ///
  /// In en, this message translates to:
  /// **'host'**
  String get hostLabel;

  /// No description provided for @chat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get chat;

  /// No description provided for @peopleN.
  ///
  /// In en, this message translates to:
  /// **'People ({n})'**
  String peopleN(String n);

  /// No description provided for @handsN.
  ///
  /// In en, this message translates to:
  /// **'Hands raised · {n}'**
  String handsN(String n);

  /// No description provided for @messageHint.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get messageHint;

  /// No description provided for @leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get leave;

  /// No description provided for @raiseHand.
  ///
  /// In en, this message translates to:
  /// **'Hand'**
  String get raiseHand;

  /// No description provided for @muteAll.
  ///
  /// In en, this message translates to:
  /// **'Mute all'**
  String get muteAll;

  /// No description provided for @record.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get record;

  /// No description provided for @endForAll.
  ///
  /// In en, this message translates to:
  /// **'End for all'**
  String get endForAll;

  /// No description provided for @endConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'End the session for everyone?'**
  String get endConfirmTitle;

  /// No description provided for @endConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'The room closes, recording stops and attendance is saved.'**
  String get endConfirmBody;

  /// No description provided for @allowSpeak.
  ///
  /// In en, this message translates to:
  /// **'Allow to speak'**
  String get allowSpeak;

  /// No description provided for @mute.
  ///
  /// In en, this message translates to:
  /// **'Mute'**
  String get mute;

  /// No description provided for @remove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get remove;

  /// No description provided for @noMessages.
  ///
  /// In en, this message translates to:
  /// **'No messages yet. Say hi.'**
  String get noMessages;

  /// No description provided for @noHands.
  ///
  /// In en, this message translates to:
  /// **'No hands raised.'**
  String get noHands;

  /// No description provided for @onlyYou.
  ///
  /// In en, this message translates to:
  /// **'Only you are here so far.'**
  String get onlyYou;

  /// No description provided for @liveUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Video isn\'t available for this session yet.'**
  String get liveUnavailable;

  /// No description provided for @wrapTitle.
  ///
  /// In en, this message translates to:
  /// **'That\'s a wrap.'**
  String get wrapTitle;

  /// No description provided for @endedStayed.
  ///
  /// In en, this message translates to:
  /// **'Ended {time} · you stayed {min} min'**
  String endedStayed(String time, String min);

  /// No description provided for @howWas.
  ///
  /// In en, this message translates to:
  /// **'How was {slate}?'**
  String howWas(String slate);

  /// No description provided for @tagClear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get tagClear;

  /// No description provided for @tagPace.
  ///
  /// In en, this message translates to:
  /// **'Good pace'**
  String get tagPace;

  /// No description provided for @tagExamples.
  ///
  /// In en, this message translates to:
  /// **'Great examples'**
  String get tagExamples;

  /// No description provided for @tagAudio.
  ///
  /// In en, this message translates to:
  /// **'Audio issues'**
  String get tagAudio;

  /// No description provided for @tagTooFast.
  ///
  /// In en, this message translates to:
  /// **'Too fast'**
  String get tagTooFast;

  /// No description provided for @recordingProcessing.
  ///
  /// In en, this message translates to:
  /// **'Recording processing'**
  String get recordingProcessing;

  /// No description provided for @recordingSoon.
  ///
  /// In en, this message translates to:
  /// **'Ready in about 20 min · we\'ll notify you'**
  String get recordingSoon;

  /// No description provided for @nextLabel.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get nextLabel;

  /// No description provided for @sendFeedback.
  ///
  /// In en, this message translates to:
  /// **'Send feedback'**
  String get sendFeedback;

  /// No description provided for @thanksFeedback.
  ///
  /// In en, this message translates to:
  /// **'Thanks — Feedback sent.'**
  String get thanksFeedback;

  /// No description provided for @libraryTitle.
  ///
  /// In en, this message translates to:
  /// **'Library'**
  String get libraryTitle;

  /// No description provided for @continueAt.
  ///
  /// In en, this message translates to:
  /// **'Continue · {at}'**
  String continueAt(String at);

  /// No description provided for @allRecordingsN.
  ///
  /// In en, this message translates to:
  /// **'All recordings · {n}'**
  String allRecordingsN(String n);

  /// No description provided for @materials.
  ///
  /// In en, this message translates to:
  /// **'Materials'**
  String get materials;

  /// No description provided for @noRecordings.
  ///
  /// In en, this message translates to:
  /// **'Recordings land here after each session.'**
  String get noRecordings;

  /// No description provided for @noMaterials.
  ///
  /// In en, this message translates to:
  /// **'No materials shared yet.'**
  String get noMaterials;

  /// No description provided for @assignments.
  ///
  /// In en, this message translates to:
  /// **'Assignments'**
  String get assignments;

  /// No description provided for @dueTab.
  ///
  /// In en, this message translates to:
  /// **'Due'**
  String get dueTab;

  /// No description provided for @submittedTab.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get submittedTab;

  /// No description provided for @gradedTab.
  ///
  /// In en, this message translates to:
  /// **'Graded'**
  String get gradedTab;

  /// No description provided for @dueAt.
  ///
  /// In en, this message translates to:
  /// **'Due {when}'**
  String dueAt(String when);

  /// No description provided for @submitAssignment.
  ///
  /// In en, this message translates to:
  /// **'Submit assignment'**
  String get submitAssignment;

  /// No description provided for @linkLabel.
  ///
  /// In en, this message translates to:
  /// **'Link'**
  String get linkLabel;

  /// No description provided for @textLabel.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get textLabel;

  /// No description provided for @noAssignments.
  ///
  /// In en, this message translates to:
  /// **'No assignments here.'**
  String get noAssignments;

  /// No description provided for @submittedOk.
  ///
  /// In en, this message translates to:
  /// **'Submitted.'**
  String get submittedOk;

  /// No description provided for @scoreOf.
  ///
  /// In en, this message translates to:
  /// **'{score} / {max}'**
  String scoreOf(String score, String max);

  /// No description provided for @enrollFirst.
  ///
  /// In en, this message translates to:
  /// **'Enroll in a batch to unlock recordings and materials.'**
  String get enrollFirst;

  /// No description provided for @inbox.
  ///
  /// In en, this message translates to:
  /// **'Inbox'**
  String get inbox;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get markAllRead;

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @earlier.
  ///
  /// In en, this message translates to:
  /// **'Earlier'**
  String get earlier;

  /// No description provided for @noNotifications.
  ///
  /// In en, this message translates to:
  /// **'You\'re all caught up.'**
  String get noNotifications;

  /// No description provided for @timezone.
  ///
  /// In en, this message translates to:
  /// **'Timezone'**
  String get timezone;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @batchesN.
  ///
  /// In en, this message translates to:
  /// **'{n} batches'**
  String batchesN(String n);

  /// No description provided for @languageRegion.
  ///
  /// In en, this message translates to:
  /// **'Language & region'**
  String get languageRegion;

  /// No description provided for @appLanguage.
  ///
  /// In en, this message translates to:
  /// **'App language'**
  String get appLanguage;

  /// No description provided for @numerals.
  ///
  /// In en, this message translates to:
  /// **'Numerals'**
  String get numerals;

  /// No description provided for @numeralsArabic.
  ///
  /// In en, this message translates to:
  /// **'Arabic-Indic ٠١٢٣٤٥٦٧٨٩'**
  String get numeralsArabic;

  /// No description provided for @numeralsWestern.
  ///
  /// In en, this message translates to:
  /// **'Western 0123456789'**
  String get numeralsWestern;

  /// No description provided for @preview.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get preview;

  /// No description provided for @displayCurrency.
  ///
  /// In en, this message translates to:
  /// **'Display currency'**
  String get displayCurrency;

  /// No description provided for @pushLobby.
  ///
  /// In en, this message translates to:
  /// **'Lobby open'**
  String get pushLobby;

  /// No description provided for @pushChanges.
  ///
  /// In en, this message translates to:
  /// **'Schedule changes'**
  String get pushChanges;

  /// No description provided for @pushRecordings.
  ///
  /// In en, this message translates to:
  /// **'Recordings & grades'**
  String get pushRecordings;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get editProfile;

  /// No description provided for @nextTakeLobbyOpen.
  ///
  /// In en, this message translates to:
  /// **'Next take · lobby open'**
  String get nextTakeLobbyOpen;

  /// No description provided for @nextTakeIn.
  ///
  /// In en, this message translates to:
  /// **'Next take · starts in {time}'**
  String nextTakeIn(String time);

  /// No description provided for @enterLobby.
  ///
  /// In en, this message translates to:
  /// **'Enter lobby'**
  String get enterLobby;

  /// No description provided for @studentsN.
  ///
  /// In en, this message translates to:
  /// **'{n} students'**
  String studentsN(String n);

  /// No description provided for @todayStat.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get todayStat;

  /// No description provided for @weekStat.
  ///
  /// In en, this message translates to:
  /// **'Week'**
  String get weekStat;

  /// No description provided for @sessionsLabel.
  ///
  /// In en, this message translates to:
  /// **'sessions'**
  String get sessionsLabel;

  /// No description provided for @attendStat.
  ///
  /// In en, this message translates to:
  /// **'Attend.'**
  String get attendStat;

  /// No description provided for @laterToday.
  ///
  /// In en, this message translates to:
  /// **'Later today'**
  String get laterToday;

  /// No description provided for @noSessionsToday.
  ///
  /// In en, this message translates to:
  /// **'No sessions today. Enjoy the quiet.'**
  String get noSessionsToday;

  /// No description provided for @rosterTitle.
  ///
  /// In en, this message translates to:
  /// **'{code} roster'**
  String rosterTitle(String code);

  /// No description provided for @enrolledLabel.
  ///
  /// In en, this message translates to:
  /// **'Enrolled'**
  String get enrolledLabel;

  /// No description provided for @avgAttendance.
  ///
  /// In en, this message translates to:
  /// **'Avg attend.'**
  String get avgAttendance;

  /// No description provided for @doneLabel.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get doneLabel;

  /// No description provided for @searchStudents.
  ///
  /// In en, this message translates to:
  /// **'Search students'**
  String get searchStudents;

  /// No description provided for @atRisk.
  ///
  /// In en, this message translates to:
  /// **'At risk'**
  String get atRisk;

  /// No description provided for @waitlist.
  ///
  /// In en, this message translates to:
  /// **'Waitlist'**
  String get waitlist;

  /// No description provided for @messageAll.
  ///
  /// In en, this message translates to:
  /// **'Message all of {code}'**
  String messageAll(String code);

  /// No description provided for @noStudents.
  ///
  /// In en, this message translates to:
  /// **'No students yet.'**
  String get noStudents;

  /// No description provided for @noTeacherBatches.
  ///
  /// In en, this message translates to:
  /// **'No batches assigned to you yet.'**
  String get noTeacherBatches;

  /// No description provided for @prepTitle.
  ///
  /// In en, this message translates to:
  /// **'Session prep'**
  String get prepTitle;

  /// No description provided for @runOfShow.
  ///
  /// In en, this message translates to:
  /// **'Run of show · {min} min'**
  String runOfShow(String min);

  /// No description provided for @addBlock.
  ///
  /// In en, this message translates to:
  /// **'+ Add block'**
  String get addBlock;

  /// No description provided for @blockLabel.
  ///
  /// In en, this message translates to:
  /// **'Block label'**
  String get blockLabel;

  /// No description provided for @atMinute.
  ///
  /// In en, this message translates to:
  /// **'At minute'**
  String get atMinute;

  /// No description provided for @filesForStudents.
  ///
  /// In en, this message translates to:
  /// **'Files for students'**
  String get filesForStudents;

  /// No description provided for @privateNotes.
  ///
  /// In en, this message translates to:
  /// **'Private notes'**
  String get privateNotes;

  /// No description provided for @reschedule.
  ///
  /// In en, this message translates to:
  /// **'Reschedule'**
  String get reschedule;

  /// No description provided for @openLobby.
  ///
  /// In en, this message translates to:
  /// **'Open lobby'**
  String get openLobby;

  /// No description provided for @moveSession.
  ///
  /// In en, this message translates to:
  /// **'Move this session'**
  String get moveSession;

  /// No description provided for @newDay.
  ///
  /// In en, this message translates to:
  /// **'New day'**
  String get newDay;

  /// No description provided for @startTime.
  ///
  /// In en, this message translates to:
  /// **'Start time'**
  String get startTime;

  /// No description provided for @reason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get reason;

  /// No description provided for @notifyStudents.
  ///
  /// In en, this message translates to:
  /// **'Notify students when approved'**
  String get notifyStudents;

  /// No description provided for @sendToAdmin.
  ///
  /// In en, this message translates to:
  /// **'Send to admin for approval'**
  String get sendToAdmin;

  /// No description provided for @adminReviews.
  ///
  /// In en, this message translates to:
  /// **'Admins review requests within 24 h.'**
  String get adminReviews;

  /// No description provided for @requestSent.
  ///
  /// In en, this message translates to:
  /// **'Request sent to admin.'**
  String get requestSent;

  /// No description provided for @attendanceSummary.
  ///
  /// In en, this message translates to:
  /// **'Attendance summary'**
  String get attendanceSummary;

  /// No description provided for @present.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get present;

  /// No description provided for @late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get late;

  /// No description provided for @leftEarly.
  ///
  /// In en, this message translates to:
  /// **'Left early'**
  String get leftEarly;

  /// No description provided for @absent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get absent;

  /// No description provided for @attendanceRule.
  ///
  /// In en, this message translates to:
  /// **'Filled from LiveKit join/leave events. Full attendance = at least 75% of the session.'**
  String get attendanceRule;

  /// No description provided for @publishRecording.
  ///
  /// In en, this message translates to:
  /// **'Publish recording to {code}'**
  String publishRecording(String code);

  /// No description provided for @ranFor.
  ///
  /// In en, this message translates to:
  /// **'ran {duration}'**
  String ranFor(String duration);

  /// No description provided for @earningsTitle.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get earningsTitle;

  /// No description provided for @earnedSoFar.
  ///
  /// In en, this message translates to:
  /// **'Earned this month so far'**
  String get earnedSoFar;

  /// No description provided for @nextPayoutOn.
  ///
  /// In en, this message translates to:
  /// **'pays {date}'**
  String nextPayoutOn(String date);

  /// No description provided for @displayOnly.
  ///
  /// In en, this message translates to:
  /// **'Display only: payouts are always made in AED.'**
  String get displayOnly;

  /// No description provided for @pendingLabel.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pendingLabel;

  /// No description provided for @scheduledRest.
  ///
  /// In en, this message translates to:
  /// **'still scheduled this month'**
  String get scheduledRest;

  /// No description provided for @availableLabel.
  ///
  /// In en, this message translates to:
  /// **'Available'**
  String get availableLabel;

  /// No description provided for @lifetimePaid.
  ///
  /// In en, this message translates to:
  /// **'Paid to date'**
  String get lifetimePaid;

  /// No description provided for @byBatch.
  ///
  /// In en, this message translates to:
  /// **'This period by batch'**
  String get byBatch;

  /// No description provided for @netRevenueNote.
  ///
  /// In en, this message translates to:
  /// **'Net revenue = paid enrollments − refunds − Stripe fees. A refund after a payout is deducted from your next payout.'**
  String get netRevenueNote;

  /// No description provided for @payoutMethod.
  ///
  /// In en, this message translates to:
  /// **'Payout method'**
  String get payoutMethod;

  /// No description provided for @verified.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get verified;

  /// No description provided for @unverified.
  ///
  /// In en, this message translates to:
  /// **'Pending verification'**
  String get unverified;

  /// No description provided for @bankName.
  ///
  /// In en, this message translates to:
  /// **'Bank'**
  String get bankName;

  /// No description provided for @accountHolder.
  ///
  /// In en, this message translates to:
  /// **'Account holder'**
  String get accountHolder;

  /// No description provided for @iban.
  ///
  /// In en, this message translates to:
  /// **'IBAN'**
  String get iban;

  /// No description provided for @swift.
  ///
  /// In en, this message translates to:
  /// **'SWIFT'**
  String get swift;

  /// No description provided for @payoutCurrency.
  ///
  /// In en, this message translates to:
  /// **'Payout currency'**
  String get payoutCurrency;

  /// No description provided for @changeBank.
  ///
  /// In en, this message translates to:
  /// **'Change bank account'**
  String get changeBank;

  /// No description provided for @addBank.
  ///
  /// In en, this message translates to:
  /// **'Add bank account'**
  String get addBank;

  /// No description provided for @changeBankNote.
  ///
  /// In en, this message translates to:
  /// **'A new account is re-verified by finance before the next run. Payouts pause until it is approved.'**
  String get changeBankNote;

  /// No description provided for @history.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get history;

  /// No description provided for @noPayouts.
  ///
  /// In en, this message translates to:
  /// **'No payouts yet.'**
  String get noPayouts;

  /// No description provided for @noBankDetails.
  ///
  /// In en, this message translates to:
  /// **'Add a UAE bank account to receive payouts.'**
  String get noBankDetails;

  /// No description provided for @ibanInvalid.
  ///
  /// In en, this message translates to:
  /// **'UAE IBAN: AE + 21 digits'**
  String get ibanInvalid;

  /// No description provided for @swiftInvalid.
  ///
  /// In en, this message translates to:
  /// **'8 or 11 letters/digits'**
  String get swiftInvalid;

  /// No description provided for @sessionsDelivered.
  ///
  /// In en, this message translates to:
  /// **'{n} sessions delivered'**
  String sessionsDelivered(String n);

  /// No description provided for @opsGreeting.
  ///
  /// In en, this message translates to:
  /// **'Ops, {name}'**
  String opsGreeting(String name);

  /// No description provided for @onAirLabel.
  ///
  /// In en, this message translates to:
  /// **'On air'**
  String get onAirLabel;

  /// No description provided for @roomsPeople.
  ///
  /// In en, this message translates to:
  /// **'{rooms} rooms · {people} people'**
  String roomsPeople(String rooms, String people);

  /// No description provided for @sessionsToday.
  ///
  /// In en, this message translates to:
  /// **'Sessions today'**
  String get sessionsToday;

  /// No description provided for @activeBatches.
  ///
  /// In en, this message translates to:
  /// **'Active batches'**
  String get activeBatches;

  /// No description provided for @revenueMonth.
  ///
  /// In en, this message translates to:
  /// **'Revenue this month'**
  String get revenueMonth;

  /// No description provided for @seatsFilled.
  ///
  /// In en, this message translates to:
  /// **'Seats filled'**
  String get seatsFilled;

  /// No description provided for @needsYou.
  ///
  /// In en, this message translates to:
  /// **'Needs you'**
  String get needsYou;

  /// No description provided for @noAlerts.
  ///
  /// In en, this message translates to:
  /// **'Nothing needs a decision right now.'**
  String get noAlerts;

  /// No description provided for @liveMonitorTitle.
  ///
  /// In en, this message translates to:
  /// **'On air now'**
  String get liveMonitorTitle;

  /// No description provided for @autoRefresh.
  ///
  /// In en, this message translates to:
  /// **'auto-refresh {s}s'**
  String autoRefresh(String s);

  /// No description provided for @liveN.
  ///
  /// In en, this message translates to:
  /// **'{n} live'**
  String liveN(String n);

  /// No description provided for @joinSilently.
  ///
  /// In en, this message translates to:
  /// **'Join silently'**
  String get joinSilently;

  /// No description provided for @noLiveRooms.
  ///
  /// In en, this message translates to:
  /// **'No rooms are on air.'**
  String get noLiveRooms;

  /// No description provided for @participantsN.
  ///
  /// In en, this message translates to:
  /// **'{n} people'**
  String participantsN(String n);

  /// No description provided for @recordingOn.
  ///
  /// In en, this message translates to:
  /// **'recording'**
  String get recordingOn;

  /// No description provided for @batchesTitle.
  ///
  /// In en, this message translates to:
  /// **'Batches'**
  String get batchesTitle;

  /// No description provided for @seatsLabel.
  ///
  /// In en, this message translates to:
  /// **'seats'**
  String get seatsLabel;

  /// No description provided for @nextSession.
  ///
  /// In en, this message translates to:
  /// **'Next session'**
  String get nextSession;

  /// No description provided for @teacherLabel.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get teacherLabel;

  /// No description provided for @sessionsRun.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} sessions run'**
  String sessionsRun(String done, String total);

  /// No description provided for @transfersToVerify.
  ///
  /// In en, this message translates to:
  /// **'Transfers to verify'**
  String get transfersToVerify;

  /// No description provided for @payoutRuns.
  ///
  /// In en, this message translates to:
  /// **'Payout runs'**
  String get payoutRuns;

  /// No description provided for @noTransfers.
  ///
  /// In en, this message translates to:
  /// **'No transfers waiting.'**
  String get noTransfers;

  /// No description provided for @noPayoutRuns.
  ///
  /// In en, this message translates to:
  /// **'No payout runs yet.'**
  String get noPayoutRuns;

  /// No description provided for @transferTitle.
  ///
  /// In en, this message translates to:
  /// **'Transfer {ref}'**
  String transferTitle(String ref);

  /// No description provided for @receiptPreview.
  ///
  /// In en, this message translates to:
  /// **'Receipt preview'**
  String get receiptPreview;

  /// No description provided for @openFullSize.
  ///
  /// In en, this message translates to:
  /// **'Open full size'**
  String get openFullSize;

  /// No description provided for @noReceipt.
  ///
  /// In en, this message translates to:
  /// **'No receipt uploaded yet.'**
  String get noReceipt;

  /// No description provided for @studentLabel.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get studentLabel;

  /// No description provided for @batchLabel.
  ///
  /// In en, this message translates to:
  /// **'Batch'**
  String get batchLabel;

  /// No description provided for @expected.
  ///
  /// In en, this message translates to:
  /// **'Expected'**
  String get expected;

  /// No description provided for @receivedStatement.
  ///
  /// In en, this message translates to:
  /// **'Received (bank statement, AED)'**
  String get receivedStatement;

  /// No description provided for @rejectReason.
  ///
  /// In en, this message translates to:
  /// **'Reject reason (if rejecting)'**
  String get rejectReason;

  /// No description provided for @reasonShort.
  ///
  /// In en, this message translates to:
  /// **'Amount short'**
  String get reasonShort;

  /// No description provided for @reasonReference.
  ///
  /// In en, this message translates to:
  /// **'Reference missing'**
  String get reasonReference;

  /// No description provided for @reasonUnreadable.
  ///
  /// In en, this message translates to:
  /// **'Receipt unreadable'**
  String get reasonUnreadable;

  /// No description provided for @reasonNotReceived.
  ///
  /// In en, this message translates to:
  /// **'Not received yet'**
  String get reasonNotReceived;

  /// No description provided for @reject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get reject;

  /// No description provided for @approve.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get approve;

  /// No description provided for @decline.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get decline;

  /// No description provided for @approveEnroll.
  ///
  /// In en, this message translates to:
  /// **'Approve & enroll'**
  String get approveEnroll;

  /// No description provided for @requestNewReceipt.
  ///
  /// In en, this message translates to:
  /// **'Ask for a new receipt'**
  String get requestNewReceipt;

  /// No description provided for @reviewDone.
  ///
  /// In en, this message translates to:
  /// **'Decision saved.'**
  String get reviewDone;

  /// No description provided for @payoutRunTitle.
  ///
  /// In en, this message translates to:
  /// **'Payout run · {period}'**
  String payoutRunTitle(String period);

  /// No description provided for @awaitingApproval.
  ///
  /// In en, this message translates to:
  /// **'Awaiting approval'**
  String get awaitingApproval;

  /// No description provided for @totalTeachers.
  ///
  /// In en, this message translates to:
  /// **'Total · {n} teachers'**
  String totalTeachers(String n);

  /// No description provided for @heldNote.
  ///
  /// In en, this message translates to:
  /// **'{n} held: bank account not verified or below the minimum.'**
  String heldNote(String n);

  /// No description provided for @approvePayouts.
  ///
  /// In en, this message translates to:
  /// **'Approve {n} payouts · {amount}'**
  String approvePayouts(String n, String amount);

  /// No description provided for @downloadFile.
  ///
  /// In en, this message translates to:
  /// **'Download bank transfer file'**
  String get downloadFile;

  /// No description provided for @runApproved.
  ///
  /// In en, this message translates to:
  /// **'Run approved.'**
  String get runApproved;

  /// No description provided for @held.
  ///
  /// In en, this message translates to:
  /// **'Held'**
  String get held;

  /// No description provided for @ready.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get ready;

  /// No description provided for @paidLabel.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get paidLabel;

  /// No description provided for @carriedOver.
  ///
  /// In en, this message translates to:
  /// **'Carried over'**
  String get carriedOver;

  /// No description provided for @alertTransfersToVerify.
  ///
  /// In en, this message translates to:
  /// **'{n} bank transfers to verify'**
  String alertTransfersToVerify(String n);

  /// No description provided for @alertSeatHoldsExpiring.
  ///
  /// In en, this message translates to:
  /// **'{n} seat holds expire within 24 h'**
  String alertSeatHoldsExpiring(String n);

  /// No description provided for @alertTeacherBankUnverified.
  ///
  /// In en, this message translates to:
  /// **'{n} teacher bank details to verify'**
  String alertTeacherBankUnverified(String n);

  /// No description provided for @alertPayoutsHeld.
  ///
  /// In en, this message translates to:
  /// **'{n} payouts on hold'**
  String alertPayoutsHeld(String n);

  /// No description provided for @rescheduleRequestTitle.
  ///
  /// In en, this message translates to:
  /// **'{teacher} asks to move {slate}'**
  String rescheduleRequestTitle(String teacher, String slate);

  /// No description provided for @newPayoutRun.
  ///
  /// In en, this message translates to:
  /// **'New payout run'**
  String get newPayoutRun;

  /// No description provided for @myRescheduleRequests.
  ///
  /// In en, this message translates to:
  /// **'My requests'**
  String get myRescheduleRequests;

  /// No description provided for @requestPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get requestPending;

  /// No description provided for @requestApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get requestApproved;

  /// No description provided for @requestDeclined.
  ///
  /// In en, this message translates to:
  /// **'Declined'**
  String get requestDeclined;

  /// No description provided for @videoDevMode.
  ///
  /// In en, this message translates to:
  /// **'Video is off in this environment (LiveKit isn\'t configured). Chat and raised hands still work.'**
  String get videoDevMode;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
