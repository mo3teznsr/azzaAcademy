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
  /// **'That didn\'t load.'**
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

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @noOpenBatchesShort.
  ///
  /// In en, this message translates to:
  /// **'No open classes'**
  String get noOpenBatchesShort;

  /// No description provided for @chargedAsAed.
  ///
  /// In en, this message translates to:
  /// **'Charged as {amount}'**
  String chargedAsAed(String amount);

  /// No description provided for @ratesUnavailableHint.
  ///
  /// In en, this message translates to:
  /// **'Shown in AED: exchange rates are unavailable right now.'**
  String get ratesUnavailableHint;

  /// No description provided for @decrease.
  ///
  /// In en, this message translates to:
  /// **'Decrease'**
  String get decrease;

  /// No description provided for @increase.
  ///
  /// In en, this message translates to:
  /// **'Increase'**
  String get increase;

  /// No description provided for @paymentPageNotOpened.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t open the payment page. Tap “Open payment page” to try again.'**
  String get paymentPageNotOpened;

  /// No description provided for @payCardCheckoutSub.
  ///
  /// In en, this message translates to:
  /// **'Card, Apple Pay or Google Pay on Stripe\'s secure page · charged in AED'**
  String get payCardCheckoutSub;

  /// No description provided for @confirmingPayment.
  ///
  /// In en, this message translates to:
  /// **'Confirming your payment…'**
  String get confirmingPayment;

  /// No description provided for @confirmingPaymentBody.
  ///
  /// In en, this message translates to:
  /// **'Finish paying {amount} on Stripe\'s secure page. Your place in {code} is held, and this screen updates as soon as the payment is confirmed.'**
  String confirmingPaymentBody(String code, String amount);

  /// No description provided for @checkingPayment.
  ///
  /// In en, this message translates to:
  /// **'Checking every few seconds…'**
  String get checkingPayment;

  /// No description provided for @openPaymentPage.
  ///
  /// In en, this message translates to:
  /// **'Open payment page'**
  String get openPaymentPage;

  /// No description provided for @coursePricedPerBatch.
  ///
  /// In en, this message translates to:
  /// **'No price here: you set the seat price on each batch. Students see the lowest open batch as the course\'s “from” price.'**
  String get coursePricedPerBatch;

  /// No description provided for @seatPriceRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a seat price in AED (more than 0).'**
  String get seatPriceRequired;

  /// No description provided for @seatPriceAed.
  ///
  /// In en, this message translates to:
  /// **'Seat price (AED)'**
  String get seatPriceAed;

  /// No description provided for @seatPriceHint.
  ///
  /// In en, this message translates to:
  /// **'450'**
  String get seatPriceHint;

  /// No description provided for @seatPriceHelper.
  ///
  /// In en, this message translates to:
  /// **'What one student pays for this batch. Charged in AED.'**
  String get seatPriceHelper;

  /// No description provided for @seatsHelper.
  ///
  /// In en, this message translates to:
  /// **'How many students can enrol (1–500).'**
  String get seatsHelper;

  /// No description provided for @sessionAdded.
  ///
  /// In en, this message translates to:
  /// **'Session added.'**
  String get sessionAdded;

  /// No description provided for @cancelSessionTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel {slate}?'**
  String cancelSessionTitle(String slate);

  /// No description provided for @cancelSessionBody.
  ///
  /// In en, this message translates to:
  /// **'Students are notified and the session leaves their schedule. This can\'t be undone.'**
  String get cancelSessionBody;

  /// No description provided for @keepSession.
  ///
  /// In en, this message translates to:
  /// **'Keep session'**
  String get keepSession;

  /// No description provided for @cancelSession.
  ///
  /// In en, this message translates to:
  /// **'Cancel session'**
  String get cancelSession;

  /// No description provided for @sessionCancelled.
  ///
  /// In en, this message translates to:
  /// **'Session cancelled.'**
  String get sessionCancelled;

  /// No description provided for @upcomingSessions.
  ///
  /// In en, this message translates to:
  /// **'Upcoming sessions'**
  String get upcomingSessions;

  /// No description provided for @addSession.
  ///
  /// In en, this message translates to:
  /// **'Add session'**
  String get addSession;

  /// No description provided for @noUpcomingSessions.
  ///
  /// In en, this message translates to:
  /// **'No upcoming sessions.'**
  String get noUpcomingSessions;

  /// No description provided for @moveSessionAction.
  ///
  /// In en, this message translates to:
  /// **'Move session'**
  String get moveSessionAction;

  /// No description provided for @requestMove.
  ///
  /// In en, this message translates to:
  /// **'Request a move'**
  String get requestMove;

  /// No description provided for @showAllN.
  ///
  /// In en, this message translates to:
  /// **'Show all {count}'**
  String showAllN(String count);

  /// No description provided for @sessionTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'Give the session a title (at least 2 characters).'**
  String get sessionTitleRequired;

  /// No description provided for @errStartInPast.
  ///
  /// In en, this message translates to:
  /// **'Pick a time in the future.'**
  String get errStartInPast;

  /// No description provided for @addSessionTitle.
  ///
  /// In en, this message translates to:
  /// **'Add a session to {code}'**
  String addSessionTitle(String code);

  /// No description provided for @addSessionLead.
  ///
  /// In en, this message translates to:
  /// **'An extra live session outside the weekly schedule: a catch-up, a bonus or an exam.'**
  String get addSessionLead;

  /// No description provided for @sessionTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Session title'**
  String get sessionTitleLabel;

  /// No description provided for @sessionTitleHint.
  ///
  /// In en, this message translates to:
  /// **'Catch-up: review and Q&A'**
  String get sessionTitleHint;

  /// No description provided for @sessionDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get sessionDate;

  /// No description provided for @sessionTimeOtherZone.
  ///
  /// In en, this message translates to:
  /// **'Times are in your phone\'s timezone ({device}). This batch runs in {batchZone}.'**
  String sessionTimeOtherZone(String device, String batchZone);

  /// No description provided for @sessionTimeZone.
  ///
  /// In en, this message translates to:
  /// **'Times are in the batch timezone, {zone}.'**
  String sessionTimeZone(String zone);

  /// No description provided for @sessionLengthHelper.
  ///
  /// In en, this message translates to:
  /// **'15 to 480 minutes, in steps of 15.'**
  String get sessionLengthHelper;

  /// No description provided for @notifyStudentsNow.
  ///
  /// In en, this message translates to:
  /// **'Notify students'**
  String get notifyStudentsNow;

  /// No description provided for @notifyStudentsNowSub.
  ///
  /// In en, this message translates to:
  /// **'Send them a notification and an email now.'**
  String get notifyStudentsNowSub;

  /// No description provided for @couldNotAddSession.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t add the session'**
  String get couldNotAddSession;

  /// No description provided for @editSeatsTitle.
  ///
  /// In en, this message translates to:
  /// **'Seats in {code}'**
  String editSeatsTitle(String code);

  /// No description provided for @editSeatsLead.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} student is enrolled.} other{{count} students are enrolled.}} Seats can\'t go below that.'**
  String editSeatsLead(int count);

  /// No description provided for @couldNotSaveSeats.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t change the seats'**
  String get couldNotSaveSeats;

  /// No description provided for @saveSeats.
  ///
  /// In en, this message translates to:
  /// **'Save seats'**
  String get saveSeats;

  /// No description provided for @seatsSaved.
  ///
  /// In en, this message translates to:
  /// **'Seats updated.'**
  String get seatsSaved;

  /// No description provided for @editSeats.
  ///
  /// In en, this message translates to:
  /// **'Edit seats'**
  String get editSeats;

  /// No description provided for @sessionMoved.
  ///
  /// In en, this message translates to:
  /// **'Session moved.'**
  String get sessionMoved;

  /// No description provided for @moveReasonHint.
  ///
  /// In en, this message translates to:
  /// **'Public holiday'**
  String get moveReasonHint;

  /// No description provided for @moveSessionNow.
  ///
  /// In en, this message translates to:
  /// **'Move session'**
  String get moveSessionNow;

  /// No description provided for @errConflict.
  ///
  /// In en, this message translates to:
  /// **'That clashes with something already scheduled.'**
  String get errConflict;

  /// No description provided for @errBatchClosed.
  ///
  /// In en, this message translates to:
  /// **'This batch has ended or was cancelled, so it can\'t take new sessions.'**
  String get errBatchClosed;

  /// No description provided for @errCapacityTooLow.
  ///
  /// In en, this message translates to:
  /// **'Seats can\'t go below the number of enrolled students.'**
  String get errCapacityTooLow;

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

  /// No description provided for @fmtInMinutes.
  ///
  /// In en, this message translates to:
  /// **'in {minutes} min'**
  String fmtInMinutes(String minutes);

  /// No description provided for @fmtInHours.
  ///
  /// In en, this message translates to:
  /// **'in {hours} h'**
  String fmtInHours(String hours);

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
  /// **'Courses in Arabic & English'**
  String get splashTagline;

  /// No description provided for @splashLine.
  ///
  /// In en, this message translates to:
  /// **'Learn it. Practise it. Make it yours.'**
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
  /// **'You can change the language any time from Me → Language & region. Each class is taught in its own language.'**
  String get languageHint;

  /// No description provided for @onboardingTitle.
  ///
  /// In en, this message translates to:
  /// **'What do you want to learn?'**
  String get onboardingTitle;

  /// No description provided for @onboardingLine.
  ///
  /// In en, this message translates to:
  /// **'Learn step by step, practise with feedback, get help from your teacher, and prove it with a certificate.'**
  String get onboardingLine;

  /// No description provided for @onboardingTimezone.
  ///
  /// In en, this message translates to:
  /// **'Your timezone — live session times convert to it'**
  String get onboardingTimezone;

  /// No description provided for @detected.
  ///
  /// In en, this message translates to:
  /// **'detected'**
  String get detected;

  /// No description provided for @bestTime.
  ///
  /// In en, this message translates to:
  /// **'Best time for live sessions'**
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
  /// **'Welcome back.'**
  String get signInTitle;

  /// No description provided for @signInSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Pick up where you left off.'**
  String get signInSubtitle;

  /// No description provided for @signUpTitle.
  ///
  /// In en, this message translates to:
  /// **'Start learning today.'**
  String get signUpTitle;

  /// No description provided for @signUpSubtitle.
  ///
  /// In en, this message translates to:
  /// **'A clear path, practice with feedback, and a certificate that proves it.'**
  String get signUpSubtitle;

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
  /// **'After this we\'ll ask for camera and mic once, so you can join live sessions in one tap.'**
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
  /// **'Join session'**
  String get joinLiveRoom;

  /// No description provided for @inRoom.
  ///
  /// In en, this message translates to:
  /// **'{count} joined'**
  String inRoom(String count);

  /// No description provided for @myBatches.
  ///
  /// In en, this message translates to:
  /// **'Your courses'**
  String get myBatches;

  /// No description provided for @nextAt.
  ///
  /// In en, this message translates to:
  /// **'Next session · {when}'**
  String nextAt(String when);

  /// No description provided for @continueWatching.
  ///
  /// In en, this message translates to:
  /// **'Catch up'**
  String get continueWatching;

  /// No description provided for @noBatchesTitle.
  ///
  /// In en, this message translates to:
  /// **'No courses yet'**
  String get noBatchesTitle;

  /// No description provided for @noBatchesBody.
  ///
  /// In en, this message translates to:
  /// **'Find a course, then choose a class whose live sessions fit your week.'**
  String get noBatchesBody;

  /// No description provided for @exploreCta.
  ///
  /// In en, this message translates to:
  /// **'Find your course'**
  String get exploreCta;

  /// No description provided for @upNext.
  ///
  /// In en, this message translates to:
  /// **'Next live session'**
  String get upNext;

  /// No description provided for @practiceDue.
  ///
  /// In en, this message translates to:
  /// **'Practice due'**
  String get practiceDue;

  /// No description provided for @exploreTitle.
  ///
  /// In en, this message translates to:
  /// **'Find what you want to learn.'**
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
  /// **'{count, plural, one{{count} course} other{{count} courses}}'**
  String coursesCount(int count);

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
  /// **'{n, plural, one{{n} live session} other{{n} live sessions}}'**
  String liveSessionsN(int n);

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
  /// **'Syllabus · {n, plural, one{{n} module} other{{n} modules}}'**
  String syllabusN(int n);

  /// No description provided for @fromPrice.
  ///
  /// In en, this message translates to:
  /// **'From {price}'**
  String fromPrice(String price);

  /// No description provided for @chooseBatchN.
  ///
  /// In en, this message translates to:
  /// **'Choose your class · {n}'**
  String chooseBatchN(String n);

  /// No description provided for @pickBatch.
  ///
  /// In en, this message translates to:
  /// **'Choose your class.'**
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
  /// **'Join class {code}'**
  String enrollIn(String code);

  /// No description provided for @seatsLeft.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} place left} other{{n} places left}}'**
  String seatsLeft(int n);

  /// No description provided for @seatsOf.
  ///
  /// In en, this message translates to:
  /// **'{taken}/{capacity}'**
  String seatsOf(String taken, String capacity);

  /// No description provided for @noOpenBatches.
  ///
  /// In en, this message translates to:
  /// **'No classes are open right now. Check back soon.'**
  String get noOpenBatches;

  /// No description provided for @joiningLate.
  ///
  /// In en, this message translates to:
  /// **'Joining late? {ran, plural, one{{ran} session already ran} other{{ran} sessions already ran}} — catch up on the recordings in your library. {left, plural, one{{left} live session left.} other{{left} live sessions left.}}'**
  String joiningLate(int ran, int left);

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
  /// **'Class price'**
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
  /// **'Card · Google Pay'**
  String get payCard;

  /// No description provided for @payCardSub.
  ///
  /// In en, this message translates to:
  /// **'Confirmed instantly · 3-D Secure'**
  String get payCardSub;

  /// No description provided for @payBank.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer'**
  String get payBank;

  /// No description provided for @payBankSub.
  ///
  /// In en, this message translates to:
  /// **'Your place is held for 48 h while you transfer'**
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
  /// **'Place held {time}'**
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
  /// **'The 48 h hold expired and your place was released.'**
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
  /// **'Nearly done.'**
  String get almostOnAir;

  /// No description provided for @verifyingBody.
  ///
  /// In en, this message translates to:
  /// **'We\'re holding your place in {code} while finance checks the transfer of {amount}.'**
  String verifyingBody(String code, String amount);

  /// No description provided for @tlOrderCreated.
  ///
  /// In en, this message translates to:
  /// **'Place held'**
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
  /// **'Place confirmed'**
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
  /// **'This order expired and your place was released.'**
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
  /// **'Your place in {course} · {code} is confirmed. Start with the lessons; {count, plural, =0{your live sessions will appear in your schedule.} one{your {n} live session is in your schedule.} other{your {n} live sessions are in your schedule.}}'**
  String enrolledBody(String course, String code, int count, String n);

  /// No description provided for @nextTake.
  ///
  /// In en, this message translates to:
  /// **'Next live session'**
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
  /// **'you can join from {time}'**
  String lobbyOpensAt(String time);

  /// No description provided for @syncCalendar.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{Sync {n} session to calendar} other{Sync {n} sessions to calendar}}'**
  String syncCalendar(int n);

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
  /// **'No live sessions this week.'**
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
  /// **'You can join 15 min before the session starts.'**
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
  /// **'{n, plural, other{{n} waiting}}'**
  String waitingN(int n);

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

  /// No description provided for @edgeWaitingTitle.
  ///
  /// In en, this message translates to:
  /// **'{host} hasn\'t started yet'**
  String edgeWaitingTitle(String host);

  /// No description provided for @edgeWaitingSub.
  ///
  /// In en, this message translates to:
  /// **'Usually starts within 5 min · you\'ll join automatically'**
  String get edgeWaitingSub;

  /// No description provided for @edgeLiveNow.
  ///
  /// In en, this message translates to:
  /// **'Live now'**
  String get edgeLiveNow;

  /// No description provided for @edgePermTitle.
  ///
  /// In en, this message translates to:
  /// **'Camera or microphone blocked'**
  String get edgePermTitle;

  /// No description provided for @edgePermBody.
  ///
  /// In en, this message translates to:
  /// **'Azza can\'t use your camera or microphone, so the class can\'t see or hear you.'**
  String get edgePermBody;

  /// No description provided for @edgePermStepsIos.
  ///
  /// In en, this message translates to:
  /// **'Open Settings → Azza → turn on Camera and Microphone, then come back.'**
  String get edgePermStepsIos;

  /// No description provided for @edgePermStepsAndroid.
  ///
  /// In en, this message translates to:
  /// **'Open Settings → Apps → Azza → Permissions → allow Camera and Microphone, then come back.'**
  String get edgePermStepsAndroid;

  /// No description provided for @edgePermMissing.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find a camera or microphone on this device.'**
  String get edgePermMissing;

  /// No description provided for @edgePermBusy.
  ///
  /// In en, this message translates to:
  /// **'Another app is using your camera or microphone. Close it and try again.'**
  String get edgePermBusy;

  /// No description provided for @edgeOpenSettings.
  ///
  /// In en, this message translates to:
  /// **'Open Settings'**
  String get edgeOpenSettings;

  /// No description provided for @edgeTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get edgeTryAgain;

  /// No description provided for @edgeJoinAudioOnly.
  ///
  /// In en, this message translates to:
  /// **'Join with audio only'**
  String get edgeJoinAudioOnly;

  /// No description provided for @edgeJoinListenOnly.
  ///
  /// In en, this message translates to:
  /// **'Join to listen only'**
  String get edgeJoinListenOnly;

  /// No description provided for @edgeReconnecting.
  ///
  /// In en, this message translates to:
  /// **'Reconnecting… your video paused, audio kept'**
  String get edgeReconnecting;

  /// No description provided for @edgeLostTitle.
  ///
  /// In en, this message translates to:
  /// **'Connection lost'**
  String get edgeLostTitle;

  /// No description provided for @edgeLostBody.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t get you back in automatically. Your place in the class is safe.'**
  String get edgeLostBody;

  /// No description provided for @edgeRejoin.
  ///
  /// In en, this message translates to:
  /// **'Rejoin'**
  String get edgeRejoin;

  /// No description provided for @edgeRoomFullTitle.
  ///
  /// In en, this message translates to:
  /// **'Room is at {n}/{max}'**
  String edgeRoomFullTitle(String n, String max);

  /// No description provided for @edgeRoomFullGeneric.
  ///
  /// In en, this message translates to:
  /// **'This room is full'**
  String get edgeRoomFullGeneric;

  /// No description provided for @edgeRoomFullBody.
  ///
  /// In en, this message translates to:
  /// **'A place frees up as soon as someone leaves. Try again in a minute, or watch the recording after the session.'**
  String get edgeRoomFullBody;

  /// No description provided for @edgeCancelledTitle.
  ///
  /// In en, this message translates to:
  /// **'{s} cancelled by {teacher}'**
  String edgeCancelledTitle(String s, String teacher);

  /// No description provided for @edgeCancelledBody.
  ///
  /// In en, this message translates to:
  /// **'It won\'t count against your attendance. Your schedule shows what\'s next.'**
  String get edgeCancelledBody;

  /// No description provided for @edgeMovedTitle.
  ///
  /// In en, this message translates to:
  /// **'{s} moved to {when}'**
  String edgeMovedTitle(String s, String when);

  /// No description provided for @edgeMovedBody.
  ///
  /// In en, this message translates to:
  /// **'It was {was}. Times are in your time zone ({tz}).'**
  String edgeMovedBody(String was, String tz);

  /// No description provided for @edgeEndedTitle.
  ///
  /// In en, this message translates to:
  /// **'This session has ended'**
  String get edgeEndedTitle;

  /// No description provided for @edgeEndedBody.
  ///
  /// In en, this message translates to:
  /// **'The recording appears in your library once it\'s ready.'**
  String get edgeEndedBody;

  /// No description provided for @edgeNotEnrolledTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'re not in this class'**
  String get edgeNotEnrolledTitle;

  /// No description provided for @edgeNotEnrolledBody.
  ///
  /// In en, this message translates to:
  /// **'You need an active enrolment in this class to join.'**
  String get edgeNotEnrolledBody;

  /// No description provided for @edgeBackToSchedule.
  ///
  /// In en, this message translates to:
  /// **'Back to schedule'**
  String get edgeBackToSchedule;

  /// No description provided for @edgeWaitingButton.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the host…'**
  String get edgeWaitingButton;

  /// No description provided for @wrapTitle.
  ///
  /// In en, this message translates to:
  /// **'Session complete.'**
  String get wrapTitle;

  /// No description provided for @endedStayed.
  ///
  /// In en, this message translates to:
  /// **'Ended {time} · you stayed {min, plural, other{{min} min}}'**
  String endedStayed(String time, int min);

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

  /// No description provided for @libraryEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Learn at your pace'**
  String get libraryEmptyTitle;

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
  /// **'Recordings appear here after each session, so you can rewatch or catch up.'**
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
  /// **'Join a class to unlock its lessons, recordings and materials.'**
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
  /// **'{n, plural, one{{n} class} other{{n} classes}}'**
  String batchesN(int n);

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

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get editProfile;

  /// No description provided for @nextTakeLobbyOpen.
  ///
  /// In en, this message translates to:
  /// **'Next session · lobby open'**
  String get nextTakeLobbyOpen;

  /// No description provided for @nextTakeIn.
  ///
  /// In en, this message translates to:
  /// **'Next session · starts in {time}'**
  String nextTakeIn(String time);

  /// No description provided for @enterLobby.
  ///
  /// In en, this message translates to:
  /// **'Enter lobby'**
  String get enterLobby;

  /// No description provided for @studentsN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} student} other{{n} students}}'**
  String studentsN(int n);

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

  /// No description provided for @teacherHubTitle.
  ///
  /// In en, this message translates to:
  /// **'{course} · {code}'**
  String teacherHubTitle(String course, String code);

  /// No description provided for @teacherHubSessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get teacherHubSessions;

  /// No description provided for @teacherHubStudents.
  ///
  /// In en, this message translates to:
  /// **'Students'**
  String get teacherHubStudents;

  /// No description provided for @teacherHubPractice.
  ///
  /// In en, this message translates to:
  /// **'Practice'**
  String get teacherHubPractice;

  /// No description provided for @teacherNewAssignment.
  ///
  /// In en, this message translates to:
  /// **'New assignment'**
  String get teacherNewAssignment;

  /// No description provided for @teacherNoAssignments.
  ///
  /// In en, this message translates to:
  /// **'No assignments yet. Add one so students can practise after a session.'**
  String get teacherNoAssignments;

  /// No description provided for @teacherSubmittedCount.
  ///
  /// In en, this message translates to:
  /// **'{count} handed in'**
  String teacherSubmittedCount(String count);

  /// No description provided for @teacherNewQuiz.
  ///
  /// In en, this message translates to:
  /// **'New quiz'**
  String get teacherNewQuiz;

  /// No description provided for @teacherEditQuiz.
  ///
  /// In en, this message translates to:
  /// **'Edit quiz'**
  String get teacherEditQuiz;

  /// No description provided for @teacherQuizResults.
  ///
  /// In en, this message translates to:
  /// **'Results'**
  String get teacherQuizResults;

  /// No description provided for @teacherNoQuizzesBody.
  ///
  /// In en, this message translates to:
  /// **'Write a short quiz to check what your students learned.'**
  String get teacherNoQuizzesBody;

  /// No description provided for @teacherMaterialSlides.
  ///
  /// In en, this message translates to:
  /// **'Slides'**
  String get teacherMaterialSlides;

  /// No description provided for @teacherMaterialFile.
  ///
  /// In en, this message translates to:
  /// **'File'**
  String get teacherMaterialFile;

  /// No description provided for @teacherMaterialVideo.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get teacherMaterialVideo;

  /// No description provided for @teacherAddMaterial.
  ///
  /// In en, this message translates to:
  /// **'Add material'**
  String get teacherAddMaterial;

  /// No description provided for @teacherAddMaterialLede.
  ///
  /// In en, this message translates to:
  /// **'Upload a file or a video from your phone, or share a link to slides, a web page or a video. Students open it from their library.'**
  String get teacherAddMaterialLede;

  /// No description provided for @teacherMaterialAdded.
  ///
  /// In en, this message translates to:
  /// **'Material added. Your students can open it now.'**
  String get teacherMaterialAdded;

  /// No description provided for @teacherNoMaterials.
  ///
  /// In en, this message translates to:
  /// **'No materials yet. Add slides, files or links for this class.'**
  String get teacherNoMaterials;

  /// No description provided for @teacherNoClassRecordings.
  ///
  /// In en, this message translates to:
  /// **'No recordings yet. Each session is recorded when you start it.'**
  String get teacherNoClassRecordings;

  /// No description provided for @teacherMinutesShort.
  ///
  /// In en, this message translates to:
  /// **'{count} min'**
  String teacherMinutesShort(String count);

  /// No description provided for @teacherVideoTooLarge.
  ///
  /// In en, this message translates to:
  /// **'That video is over 200 MB. Share it as a link instead.'**
  String get teacherVideoTooLarge;

  /// No description provided for @teacherUploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading…'**
  String get teacherUploading;

  /// No description provided for @teacherUploadVideo.
  ///
  /// In en, this message translates to:
  /// **'Upload a video'**
  String get teacherUploadVideo;

  /// No description provided for @teacherUploadedFile.
  ///
  /// In en, this message translates to:
  /// **'Uploaded: {name}'**
  String teacherUploadedFile(String name);

  /// No description provided for @teacherUploadVideoHint.
  ///
  /// In en, this message translates to:
  /// **'MP4, MOV or WEBM, up to 200 MB.'**
  String get teacherUploadVideoHint;

  /// No description provided for @teacherMaterialTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Week 2 slides'**
  String get teacherMaterialTitleHint;

  /// No description provided for @teacherTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'Add a title of at least 2 characters.'**
  String get teacherTitleRequired;

  /// No description provided for @teacherMaterialUrlHelper.
  ///
  /// In en, this message translates to:
  /// **'A link students can open, starting with https://'**
  String get teacherMaterialUrlHelper;

  /// No description provided for @filesAttach.
  ///
  /// In en, this message translates to:
  /// **'Attach files'**
  String get filesAttach;

  /// No description provided for @filesAttachHint.
  ///
  /// In en, this message translates to:
  /// **'Up to {count, plural, one{{n} file} other{{n} files}} · {types} · {mb} MB each'**
  String filesAttachHint(int count, String n, String types, String mb);

  /// No description provided for @filesUploadingPercent.
  ///
  /// In en, this message translates to:
  /// **'Uploading {percent}%'**
  String filesUploadingPercent(String percent);

  /// No description provided for @filesRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove {name}'**
  String filesRemove(String name);

  /// No description provided for @filesOpen.
  ///
  /// In en, this message translates to:
  /// **'Open {name}'**
  String filesOpen(String name);

  /// No description provided for @filesYourFiles.
  ///
  /// In en, this message translates to:
  /// **'Your files'**
  String get filesYourFiles;

  /// No description provided for @filesSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Files'**
  String get filesSubmitted;

  /// No description provided for @filesTooMany.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{You can attach up to {count} file.} other{You can attach up to {count} files.}}'**
  String filesTooMany(int count);

  /// No description provided for @filesWaitForUpload.
  ///
  /// In en, this message translates to:
  /// **'Wait for your files to finish uploading.'**
  String get filesWaitForUpload;

  /// No description provided for @filesTypeRefused.
  ///
  /// In en, this message translates to:
  /// **'{name} can\'t be attached. Use {types}.'**
  String filesTypeRefused(String name, String types);

  /// No description provided for @filesTooLargeRefused.
  ///
  /// In en, this message translates to:
  /// **'{name} is larger than {mb} MB.'**
  String filesTooLargeRefused(String name, String mb);

  /// No description provided for @filesEmptyRefused.
  ///
  /// In en, this message translates to:
  /// **'{name} is empty.'**
  String filesEmptyRefused(String name);

  /// No description provided for @filesErrType.
  ///
  /// In en, this message translates to:
  /// **'This file type isn\'t supported. Try PDF, Word, PowerPoint, Excel, an image, ZIP or text.'**
  String get filesErrType;

  /// No description provided for @filesErrEmpty.
  ///
  /// In en, this message translates to:
  /// **'This file is empty. Choose another one.'**
  String get filesErrEmpty;

  /// No description provided for @filesErrTooLarge.
  ///
  /// In en, this message translates to:
  /// **'This file is too large to upload.'**
  String get filesErrTooLarge;

  /// No description provided for @filesErrMissing.
  ///
  /// In en, this message translates to:
  /// **'Choose a file to upload.'**
  String get filesErrMissing;

  /// No description provided for @filesErrForeignUrl.
  ///
  /// In en, this message translates to:
  /// **'Upload the file here first, then add it.'**
  String get filesErrForeignUrl;

  /// No description provided for @filesErrEmptySubmission.
  ///
  /// In en, this message translates to:
  /// **'Add a link, some text or a file.'**
  String get filesErrEmptySubmission;

  /// No description provided for @filesUploadMaterial.
  ///
  /// In en, this message translates to:
  /// **'Upload file'**
  String get filesUploadMaterial;

  /// No description provided for @filesUploadMaterialHint.
  ///
  /// In en, this message translates to:
  /// **'{types}, up to {mb} MB. Students open it from their library.'**
  String filesUploadMaterialHint(String types, String mb);

  /// No description provided for @filesLinkKindsNote.
  ///
  /// In en, this message translates to:
  /// **'To share a document, upload it. Links are for slides, web pages and videos.'**
  String get filesLinkKindsNote;

  /// No description provided for @filesEditAssignment.
  ///
  /// In en, this message translates to:
  /// **'Edit assignment'**
  String get filesEditAssignment;

  /// No description provided for @filesSaveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get filesSaveChanges;

  /// No description provided for @filesAssignmentSaved.
  ///
  /// In en, this message translates to:
  /// **'Assignment updated.'**
  String get filesAssignmentSaved;

  /// No description provided for @filesAssignmentActions.
  ///
  /// In en, this message translates to:
  /// **'Assignment options'**
  String get filesAssignmentActions;

  /// No description provided for @filesDeleteAssignment.
  ///
  /// In en, this message translates to:
  /// **'Delete assignment'**
  String get filesDeleteAssignment;

  /// No description provided for @filesDeleteAssignmentTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete “{title}”?'**
  String filesDeleteAssignmentTitle(String title);

  /// No description provided for @filesDeleteAssignmentBody.
  ///
  /// In en, this message translates to:
  /// **'This can\'t be undone. Once a student has submitted, the assignment can\'t be deleted, but you can still edit it.'**
  String get filesDeleteAssignmentBody;

  /// No description provided for @filesDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get filesDelete;

  /// No description provided for @filesAssignmentDeleted.
  ///
  /// In en, this message translates to:
  /// **'Assignment deleted.'**
  String get filesAssignmentDeleted;

  /// No description provided for @filesErrHasSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Students have already submitted this assignment, so it can\'t be deleted. You can still edit it.'**
  String get filesErrHasSubmissions;

  /// No description provided for @filesErrScoreTooHigh.
  ///
  /// In en, this message translates to:
  /// **'A submission is already graded {score}, so the max score can\'t go below that.'**
  String filesErrScoreTooHigh(String score);

  /// No description provided for @teacherUrlInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a full link, like https://example.com'**
  String get teacherUrlInvalid;

  /// No description provided for @teacherLinkSession.
  ///
  /// In en, this message translates to:
  /// **'Session'**
  String get teacherLinkSession;

  /// No description provided for @teacherOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get teacherOptional;

  /// No description provided for @teacherNoSessionLink.
  ///
  /// In en, this message translates to:
  /// **'Not linked to a session'**
  String get teacherNoSessionLink;

  /// No description provided for @teacherAssignmentCreated.
  ///
  /// In en, this message translates to:
  /// **'Assignment created. Students can see it now.'**
  String get teacherAssignmentCreated;

  /// No description provided for @teacherAssignmentLede.
  ///
  /// In en, this message translates to:
  /// **'Students hand in text or a link before the due time. Late work is still accepted and marked late.'**
  String get teacherAssignmentLede;

  /// No description provided for @teacherAssignmentTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Build a budget spreadsheet'**
  String get teacherAssignmentTitleHint;

  /// No description provided for @teacherInstructions.
  ///
  /// In en, this message translates to:
  /// **'Instructions'**
  String get teacherInstructions;

  /// No description provided for @teacherInstructionsHint.
  ///
  /// In en, this message translates to:
  /// **'What should students do, and what does good work look like?'**
  String get teacherInstructionsHint;

  /// No description provided for @teacherDueHelper.
  ///
  /// In en, this message translates to:
  /// **'Tap to choose the date and time.'**
  String get teacherDueHelper;

  /// No description provided for @teacherChangeDue.
  ///
  /// In en, this message translates to:
  /// **'Choose due date'**
  String get teacherChangeDue;

  /// No description provided for @teacherDueInPast.
  ///
  /// In en, this message translates to:
  /// **'Pick a time in the future.'**
  String get teacherDueInPast;

  /// No description provided for @teacherMaxScore.
  ///
  /// In en, this message translates to:
  /// **'Max score'**
  String get teacherMaxScore;

  /// No description provided for @teacherMaxScoreHelper.
  ///
  /// In en, this message translates to:
  /// **'The top score for this assignment.'**
  String get teacherMaxScoreHelper;

  /// No description provided for @teacherMaxScoreInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number from 1 to 1000.'**
  String get teacherMaxScoreInvalid;

  /// No description provided for @teacherCreateAssignment.
  ///
  /// In en, this message translates to:
  /// **'Create assignment'**
  String get teacherCreateAssignment;

  /// No description provided for @teacherGradedScore.
  ///
  /// In en, this message translates to:
  /// **'Graded {score}/{max}'**
  String teacherGradedScore(String score, String max);

  /// No description provided for @teacherToGrade.
  ///
  /// In en, this message translates to:
  /// **'To grade'**
  String get teacherToGrade;

  /// No description provided for @teacherSubmissionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Submissions'**
  String get teacherSubmissionsTitle;

  /// No description provided for @teacherOutOf.
  ///
  /// In en, this message translates to:
  /// **'Out of {max}'**
  String teacherOutOf(String max);

  /// No description provided for @teacherNoSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Nothing handed in yet.'**
  String get teacherNoSubmissions;

  /// No description provided for @teacherHandedIn.
  ///
  /// In en, this message translates to:
  /// **'Handed in {when}'**
  String teacherHandedIn(String when);

  /// No description provided for @teacherGradeSaved.
  ///
  /// In en, this message translates to:
  /// **'Grade saved. The student has been told.'**
  String get teacherGradeSaved;

  /// No description provided for @teacherTheirWork.
  ///
  /// In en, this message translates to:
  /// **'Their work'**
  String get teacherTheirWork;

  /// No description provided for @teacherScore.
  ///
  /// In en, this message translates to:
  /// **'Score'**
  String get teacherScore;

  /// No description provided for @teacherScoreHint.
  ///
  /// In en, this message translates to:
  /// **'0 to {max}'**
  String teacherScoreHint(String max);

  /// No description provided for @teacherScoreInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number from 0 to {max}.'**
  String teacherScoreInvalid(String max);

  /// No description provided for @teacherFeedback.
  ///
  /// In en, this message translates to:
  /// **'Feedback'**
  String get teacherFeedback;

  /// No description provided for @teacherFeedbackHint.
  ///
  /// In en, this message translates to:
  /// **'What went well, and one thing to improve.'**
  String get teacherFeedbackHint;

  /// No description provided for @teacherSaveGrade.
  ///
  /// In en, this message translates to:
  /// **'Save grade'**
  String get teacherSaveGrade;

  /// No description provided for @teacherGradingTitle.
  ///
  /// In en, this message translates to:
  /// **'Grading'**
  String get teacherGradingTitle;

  /// No description provided for @teacherGradingLede.
  ///
  /// In en, this message translates to:
  /// **'Work handed in across your classes, oldest first.'**
  String get teacherGradingLede;

  /// No description provided for @teacherAllGraded.
  ///
  /// In en, this message translates to:
  /// **'All caught up. Nothing to grade.'**
  String get teacherAllGraded;

  /// No description provided for @teacherQuizSaved.
  ///
  /// In en, this message translates to:
  /// **'Quiz saved.'**
  String get teacherQuizSaved;

  /// No description provided for @teacherQuizNeedsQuestion.
  ///
  /// In en, this message translates to:
  /// **'Add at least one question before publishing.'**
  String get teacherQuizNeedsQuestion;

  /// No description provided for @teacherPublishQuizTitle.
  ///
  /// In en, this message translates to:
  /// **'Publish this quiz?'**
  String get teacherPublishQuizTitle;

  /// No description provided for @teacherPublishQuizBody.
  ///
  /// In en, this message translates to:
  /// **'Your students will be notified and can start it. Once someone starts, the questions can\'t change.'**
  String get teacherPublishQuizBody;

  /// No description provided for @teacherPublish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get teacherPublish;

  /// No description provided for @teacherQuizPublished.
  ///
  /// In en, this message translates to:
  /// **'Quiz published. Students have been notified.'**
  String get teacherQuizPublished;

  /// No description provided for @teacherQuizUnpublished.
  ///
  /// In en, this message translates to:
  /// **'Quiz moved back to draft.'**
  String get teacherQuizUnpublished;

  /// No description provided for @teacherDeleteQuizTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this quiz?'**
  String get teacherDeleteQuizTitle;

  /// No description provided for @teacherDeleteQuizBody.
  ///
  /// In en, this message translates to:
  /// **'The quiz and its questions will be removed. This can\'t be undone.'**
  String get teacherDeleteQuizBody;

  /// No description provided for @teacherDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get teacherDelete;

  /// No description provided for @teacherQuizDeleted.
  ///
  /// In en, this message translates to:
  /// **'Quiz deleted.'**
  String get teacherQuizDeleted;

  /// No description provided for @teacherTrue.
  ///
  /// In en, this message translates to:
  /// **'True'**
  String get teacherTrue;

  /// No description provided for @teacherFalse.
  ///
  /// In en, this message translates to:
  /// **'False'**
  String get teacherFalse;

  /// No description provided for @teacherSingleChoice.
  ///
  /// In en, this message translates to:
  /// **'Single choice'**
  String get teacherSingleChoice;

  /// No description provided for @teacherChooseAll.
  ///
  /// In en, this message translates to:
  /// **'Choose all'**
  String get teacherChooseAll;

  /// No description provided for @teacherTrueFalse.
  ///
  /// In en, this message translates to:
  /// **'True / false'**
  String get teacherTrueFalse;

  /// No description provided for @teacherQuizTotals.
  ///
  /// In en, this message translates to:
  /// **'{questions, plural, one{{questions} question} other{{questions} questions}} · {points, plural, one{{points} pt} other{{points} pts}}'**
  String teacherQuizTotals(int questions, int points);

  /// No description provided for @teacherQuizLocked.
  ///
  /// In en, this message translates to:
  /// **'Students have started this quiz, so its questions are locked. You can still change the details.'**
  String get teacherQuizLocked;

  /// No description provided for @teacherQuizDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get teacherQuizDetails;

  /// No description provided for @teacherQuizTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Module 1 check'**
  String get teacherQuizTitleHint;

  /// No description provided for @teacherQuizInstructionsHint.
  ///
  /// In en, this message translates to:
  /// **'Anything students should know before they start.'**
  String get teacherQuizInstructionsHint;

  /// No description provided for @teacherQuizModule.
  ///
  /// In en, this message translates to:
  /// **'Module'**
  String get teacherQuizModule;

  /// No description provided for @teacherQuizModuleHelper.
  ///
  /// In en, this message translates to:
  /// **'Students see the quiz with this module\'s lessons.'**
  String get teacherQuizModuleHelper;

  /// No description provided for @teacherNoModule.
  ///
  /// In en, this message translates to:
  /// **'No module'**
  String get teacherNoModule;

  /// No description provided for @teacherNoDueDate.
  ///
  /// In en, this message translates to:
  /// **'No due date'**
  String get teacherNoDueDate;

  /// No description provided for @teacherTimeLimit.
  ///
  /// In en, this message translates to:
  /// **'Time limit (minutes)'**
  String get teacherTimeLimit;

  /// No description provided for @teacherUntimed.
  ///
  /// In en, this message translates to:
  /// **'Untimed'**
  String get teacherUntimed;

  /// No description provided for @teacherTimeLimitHelper.
  ///
  /// In en, this message translates to:
  /// **'Leave empty for no time limit.'**
  String get teacherTimeLimitHelper;

  /// No description provided for @teacherTimeLimitInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter 1 to 600 minutes, or leave it empty.'**
  String get teacherTimeLimitInvalid;

  /// No description provided for @teacherAttempts.
  ///
  /// In en, this message translates to:
  /// **'Attempts'**
  String get teacherAttempts;

  /// No description provided for @teacherAttemptsHelper.
  ///
  /// In en, this message translates to:
  /// **'How many times each student can take it.'**
  String get teacherAttemptsHelper;

  /// No description provided for @teacherAddQuestion.
  ///
  /// In en, this message translates to:
  /// **'Add question'**
  String get teacherAddQuestion;

  /// No description provided for @teacherSaveDraft.
  ///
  /// In en, this message translates to:
  /// **'Save draft'**
  String get teacherSaveDraft;

  /// No description provided for @teacherUnpublish.
  ///
  /// In en, this message translates to:
  /// **'Unpublish'**
  String get teacherUnpublish;

  /// No description provided for @teacherQuestionN.
  ///
  /// In en, this message translates to:
  /// **'Question {n}'**
  String teacherQuestionN(String n);

  /// No description provided for @teacherRemoveQuestion.
  ///
  /// In en, this message translates to:
  /// **'Remove question'**
  String get teacherRemoveQuestion;

  /// No description provided for @teacherQuestionPrompt.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get teacherQuestionPrompt;

  /// No description provided for @teacherQuestionPromptHint.
  ///
  /// In en, this message translates to:
  /// **'Write the question students will answer.'**
  String get teacherQuestionPromptHint;

  /// No description provided for @teacherQuestionRequired.
  ///
  /// In en, this message translates to:
  /// **'Write the question.'**
  String get teacherQuestionRequired;

  /// No description provided for @teacherMarkAllCorrect.
  ///
  /// In en, this message translates to:
  /// **'Mark every correct answer.'**
  String get teacherMarkAllCorrect;

  /// No description provided for @teacherMarkOneCorrect.
  ///
  /// In en, this message translates to:
  /// **'Mark the one correct answer.'**
  String get teacherMarkOneCorrect;

  /// No description provided for @teacherCorrectAnswer.
  ///
  /// In en, this message translates to:
  /// **'Correct answer'**
  String get teacherCorrectAnswer;

  /// No description provided for @teacherMarkCorrect.
  ///
  /// In en, this message translates to:
  /// **'Mark as correct'**
  String get teacherMarkCorrect;

  /// No description provided for @teacherOptionN.
  ///
  /// In en, this message translates to:
  /// **'Option {n}'**
  String teacherOptionN(String n);

  /// No description provided for @teacherOptionRequired.
  ///
  /// In en, this message translates to:
  /// **'Fill in this option or remove it.'**
  String get teacherOptionRequired;

  /// No description provided for @teacherRemoveOption.
  ///
  /// In en, this message translates to:
  /// **'Remove option'**
  String get teacherRemoveOption;

  /// No description provided for @teacherAddOption.
  ///
  /// In en, this message translates to:
  /// **'Add option'**
  String get teacherAddOption;

  /// No description provided for @teacherPoints.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get teacherPoints;

  /// No description provided for @teacherAttendanceBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Breakdown'**
  String get teacherAttendanceBreakdown;

  /// No description provided for @teacherAttendanceRate.
  ///
  /// In en, this message translates to:
  /// **'{rate} attended'**
  String teacherAttendanceRate(String rate);

  /// No description provided for @teacherAttendanceFiltered.
  ///
  /// In en, this message translates to:
  /// **'Showing {mark} only. Tap again to show everyone.'**
  String teacherAttendanceFiltered(String mark);

  /// No description provided for @teacherTodayAt.
  ///
  /// In en, this message translates to:
  /// **'Today {time}'**
  String teacherTodayAt(String time);

  /// No description provided for @teacherTomorrowAt.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow {time}'**
  String teacherTomorrowAt(String time);

  /// No description provided for @teacherNoUpcomingSessions.
  ///
  /// In en, this message translates to:
  /// **'No sessions coming up this week. Add one from your class.'**
  String get teacherNoUpcomingSessions;

  /// No description provided for @teacherNextSession.
  ///
  /// In en, this message translates to:
  /// **'Next session'**
  String get teacherNextSession;

  /// No description provided for @teacherReschedule.
  ///
  /// In en, this message translates to:
  /// **'Move'**
  String get teacherReschedule;

  /// No description provided for @teacherNeedsAtRisk.
  ///
  /// In en, this message translates to:
  /// **'Students falling behind'**
  String get teacherNeedsAtRisk;

  /// No description provided for @teacherNeedsYou.
  ///
  /// In en, this message translates to:
  /// **'Needs you'**
  String get teacherNeedsYou;

  /// No description provided for @teacherNeedsGrade.
  ///
  /// In en, this message translates to:
  /// **'Work to grade'**
  String get teacherNeedsGrade;

  /// No description provided for @teacherNeedsReschedule.
  ///
  /// In en, this message translates to:
  /// **'Replies to your move requests'**
  String get teacherNeedsReschedule;

  /// No description provided for @teacherNeedsProposals.
  ///
  /// In en, this message translates to:
  /// **'Proposals with review notes'**
  String get teacherNeedsProposals;

  /// No description provided for @teacherNeedClassFirst.
  ///
  /// In en, this message translates to:
  /// **'Create a class first.'**
  String get teacherNeedClassFirst;

  /// No description provided for @teacherProposeCourse.
  ///
  /// In en, this message translates to:
  /// **'Propose a course'**
  String get teacherProposeCourse;

  /// No description provided for @teacherPostAnnouncement.
  ///
  /// In en, this message translates to:
  /// **'Post an announcement'**
  String get teacherPostAnnouncement;

  /// No description provided for @teacherUploadMaterial.
  ///
  /// In en, this message translates to:
  /// **'Upload material'**
  String get teacherUploadMaterial;

  /// No description provided for @teacherQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get teacherQuickActions;

  /// No description provided for @teacherMyClasses.
  ///
  /// In en, this message translates to:
  /// **'My classes'**
  String get teacherMyClasses;

  /// No description provided for @teacherSeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get teacherSeeAll;

  /// No description provided for @teacherStudentsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} student} other{{count} students}}'**
  String teacherStudentsCount(int count);

  /// No description provided for @teacherEarningsSnapshot.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get teacherEarningsSnapshot;

  /// No description provided for @teacherEarningsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Earnings couldn\'t load. Pull to refresh.'**
  String get teacherEarningsUnavailable;

  /// No description provided for @teacherThisPeriod.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get teacherThisPeriod;

  /// No description provided for @teacherNextPayout.
  ///
  /// In en, this message translates to:
  /// **'Next payout'**
  String get teacherNextPayout;

  /// No description provided for @teacherPayoutMissing.
  ///
  /// In en, this message translates to:
  /// **'Add a payout method so we can pay you.'**
  String get teacherPayoutMissing;

  /// No description provided for @teacherAddPayoutMethod.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get teacherAddPayoutMethod;

  /// No description provided for @teacherFirstClassBody.
  ///
  /// In en, this message translates to:
  /// **'Pick a course, set the schedule and send it for review.'**
  String get teacherFirstClassBody;

  /// No description provided for @teacherCreateFirstClass.
  ///
  /// In en, this message translates to:
  /// **'Create your first class'**
  String get teacherCreateFirstClass;

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
  /// **'Run of show · {min, plural, other{{min} min}}'**
  String runOfShow(int min);

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
  /// **'{n, plural, one{{n} session delivered} other{{n} sessions delivered}}'**
  String sessionsDelivered(int n);

  /// No description provided for @opsGreeting.
  ///
  /// In en, this message translates to:
  /// **'Ops, {name}'**
  String opsGreeting(String name);

  /// No description provided for @onAirLabel.
  ///
  /// In en, this message translates to:
  /// **'Live now'**
  String get onAirLabel;

  /// No description provided for @roomsPeople.
  ///
  /// In en, this message translates to:
  /// **'{rooms, plural, one{{rooms} room} other{{rooms} rooms}} · {people, plural, one{{people} person} other{{people} people}}'**
  String roomsPeople(int rooms, int people);

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
  /// **'Live now'**
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
  /// **'No sessions are live right now.'**
  String get noLiveRooms;

  /// No description provided for @participantsN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} person} other{{n} people}}'**
  String participantsN(int n);

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
  /// **'{done} of {total, plural, one{{total} session run} other{{total} sessions run}}'**
  String sessionsRun(int done, int total);

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
  /// **'Total · {n, plural, one{{n} teacher} other{{n} teachers}}'**
  String totalTeachers(int n);

  /// No description provided for @heldNote.
  ///
  /// In en, this message translates to:
  /// **'{n} held: bank account not verified or below the minimum.'**
  String heldNote(String n);

  /// No description provided for @approvePayouts.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{Approve {n} payout · {amount}} other{Approve {n} payouts · {amount}}}'**
  String approvePayouts(int n, String amount);

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
  /// **'{n, plural, one{{n} bank transfer to verify} other{{n} bank transfers to verify}}'**
  String alertTransfersToVerify(int n);

  /// No description provided for @alertSeatHoldsExpiring.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} seat hold expires within 24 h} other{{n} seat holds expire within 24 h}}'**
  String alertSeatHoldsExpiring(int n);

  /// No description provided for @alertTeacherBankUnverified.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} teacher\'s bank details to verify} other{{n} teachers\' bank details to verify}}'**
  String alertTeacherBankUnverified(int n);

  /// No description provided for @alertPayoutsHeld.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} payout on hold} other{{n} payouts on hold}}'**
  String alertPayoutsHeld(int n);

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

  /// No description provided for @certificatesTitle.
  ///
  /// In en, this message translates to:
  /// **'Certificates'**
  String get certificatesTitle;

  /// No description provided for @certificatesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Proof you learned it'**
  String get certificatesEmptyTitle;

  /// No description provided for @certificatesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Attend at least 80% of your class\'s live sessions and your certificate appears here when the class ends. Anyone can verify it.'**
  String get certificatesEmptyBody;

  /// No description provided for @certificatesEarned.
  ///
  /// In en, this message translates to:
  /// **'Earned'**
  String get certificatesEarned;

  /// No description provided for @certificatesInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get certificatesInProgress;

  /// No description provided for @certificateAttended.
  ///
  /// In en, this message translates to:
  /// **'Attended {attended}/{total}'**
  String certificateAttended(String attended, String total);

  /// No description provided for @certificateWithTeacher.
  ///
  /// In en, this message translates to:
  /// **'with {name}'**
  String certificateWithTeacher(String name);

  /// No description provided for @certificateSessionsNeeded.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} more session needed} other{{n} more sessions needed}}'**
  String certificateSessionsNeeded(int n);

  /// No description provided for @certificateOneSessionNeeded.
  ///
  /// In en, this message translates to:
  /// **'1 more session needed'**
  String get certificateOneSessionNeeded;

  /// No description provided for @certificateRequirementMet.
  ///
  /// In en, this message translates to:
  /// **'Attendance met — your certificate is issued when the class ends.'**
  String get certificateRequirementMet;

  /// No description provided for @certificateUnreachable.
  ///
  /// In en, this message translates to:
  /// **'Not enough sessions left to reach 80% in this class.'**
  String get certificateUnreachable;

  /// No description provided for @certificateAttendedOfRequired.
  ///
  /// In en, this message translates to:
  /// **'{attended} of {required, plural, one{{required} session to earn it} other{{required} sessions to earn it}}'**
  String certificateAttendedOfRequired(int attended, int required);

  /// No description provided for @certificateNew.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get certificateNew;

  /// No description provided for @certificateOfCompletion.
  ///
  /// In en, this message translates to:
  /// **'Certificate of completion'**
  String get certificateOfCompletion;

  /// No description provided for @certificateAwardedTo.
  ///
  /// In en, this message translates to:
  /// **'Awarded to'**
  String get certificateAwardedTo;

  /// No description provided for @certificateForCompleting.
  ///
  /// In en, this message translates to:
  /// **'for completing'**
  String get certificateForCompleting;

  /// No description provided for @certificateBatch.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get certificateBatch;

  /// No description provided for @certificateTeacher.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get certificateTeacher;

  /// No description provided for @certificateIssued.
  ///
  /// In en, this message translates to:
  /// **'Issued'**
  String get certificateIssued;

  /// No description provided for @certificateDates.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get certificateDates;

  /// No description provided for @certificateVerifyCode.
  ///
  /// In en, this message translates to:
  /// **'Verify code'**
  String get certificateVerifyCode;

  /// No description provided for @certificateShare.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get certificateShare;

  /// No description provided for @certificateLinkCopied.
  ///
  /// In en, this message translates to:
  /// **'Verification link copied'**
  String get certificateLinkCopied;

  /// No description provided for @certificateCompleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Course complete.'**
  String get certificateCompleteTitle;

  /// No description provided for @certificateCompleteBody.
  ///
  /// In en, this message translates to:
  /// **'You attended {attended} of {total, plural, one{{total} live session.} other{{total} live sessions.}}'**
  String certificateCompleteBody(int attended, int total);

  /// No description provided for @certificateVerifyHint.
  ///
  /// In en, this message translates to:
  /// **'Proof of the skill. Anyone can check it at {url}'**
  String certificateVerifyHint(String url);

  /// No description provided for @waitlistPosition.
  ///
  /// In en, this message translates to:
  /// **'{position} in line · of {total}'**
  String waitlistPosition(String position, String total);

  /// No description provided for @waitlistNextInLine.
  ///
  /// In en, this message translates to:
  /// **'You\'re next in line'**
  String get waitlistNextInLine;

  /// No description provided for @startsOnDate.
  ///
  /// In en, this message translates to:
  /// **'Starts {date}'**
  String startsOnDate(String date);

  /// No description provided for @waitlistJoinedOn.
  ///
  /// In en, this message translates to:
  /// **'Joined {date}'**
  String waitlistJoinedOn(String date);

  /// No description provided for @waitlistWhatNext.
  ///
  /// In en, this message translates to:
  /// **'What happens next'**
  String get waitlistWhatNext;

  /// No description provided for @waitlistStepSeat.
  ///
  /// In en, this message translates to:
  /// **'When a place frees up, it goes to the first person in line.'**
  String get waitlistStepSeat;

  /// No description provided for @waitlistStepNotify.
  ///
  /// In en, this message translates to:
  /// **'We\'ll notify and email you the moment it\'s yours.'**
  String get waitlistStepNotify;

  /// No description provided for @waitlistStepHold.
  ///
  /// In en, this message translates to:
  /// **'You then have 24 hours to check out before the place moves on.'**
  String get waitlistStepHold;

  /// No description provided for @waitlistNoCharge.
  ///
  /// In en, this message translates to:
  /// **'Nothing is charged while you wait.'**
  String get waitlistNoCharge;

  /// No description provided for @waitlistLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave waitlist'**
  String get waitlistLeave;

  /// No description provided for @waitlistLeaveConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Leave the waitlist?'**
  String get waitlistLeaveConfirmTitle;

  /// No description provided for @waitlistLeaveConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll lose your place for {batch}. If you rejoin later, you\'ll start at the back of the line.'**
  String waitlistLeaveConfirmBody(String batch);

  /// No description provided for @waitlistStay.
  ///
  /// In en, this message translates to:
  /// **'Stay in line'**
  String get waitlistStay;

  /// No description provided for @waitlistLeft.
  ///
  /// In en, this message translates to:
  /// **'You left the waitlist'**
  String get waitlistLeft;

  /// No description provided for @waitlistSeatOpen.
  ///
  /// In en, this message translates to:
  /// **'A place opened for you'**
  String get waitlistSeatOpen;

  /// No description provided for @waitlistHeldFor.
  ///
  /// In en, this message translates to:
  /// **'Held for you · {time}'**
  String waitlistHeldFor(String time);

  /// No description provided for @waitlistHoldExpired.
  ///
  /// In en, this message translates to:
  /// **'The hold has expired'**
  String get waitlistHoldExpired;

  /// No description provided for @waitlistClaimSeat.
  ///
  /// In en, this message translates to:
  /// **'Claim your place'**
  String get waitlistClaimSeat;

  /// No description provided for @teacherAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get teacherAbout;

  /// No description provided for @teacherTeachesIn.
  ///
  /// In en, this message translates to:
  /// **'Teaches in'**
  String get teacherTeachesIn;

  /// No description provided for @teacherCourses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get teacherCourses;

  /// No description provided for @teacherUpcomingBatches.
  ///
  /// In en, this message translates to:
  /// **'Upcoming classes'**
  String get teacherUpcomingBatches;

  /// No description provided for @teacherViewProfile.
  ///
  /// In en, this message translates to:
  /// **'View profile'**
  String get teacherViewProfile;

  /// No description provided for @teacherBatchFull.
  ///
  /// In en, this message translates to:
  /// **'Full'**
  String get teacherBatchFull;

  /// No description provided for @certificateAttendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get certificateAttendance;

  /// No description provided for @waitlistOfTotal.
  ///
  /// In en, this message translates to:
  /// **'of {total}'**
  String waitlistOfTotal(String total);

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get deleteAccount;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete your account?'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountBody.
  ///
  /// In en, this message translates to:
  /// **'This permanently deletes your profile, enrolments, certificates and messages. Payment records are kept without your name for accounting. This cannot be undone.'**
  String get deleteAccountBody;

  /// No description provided for @deleteAccountTypeHint.
  ///
  /// In en, this message translates to:
  /// **'Type DELETE to confirm'**
  String get deleteAccountTypeHint;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete permanently'**
  String get deleteAccountConfirm;

  /// No description provided for @deleteAccountFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t delete the account. Try again or contact support.'**
  String get deleteAccountFailed;

  /// No description provided for @deleteAccountTeacher.
  ///
  /// In en, this message translates to:
  /// **'Teachers and admins can\'t delete their account while they have batches. Contact support.'**
  String get deleteAccountTeacher;

  /// No description provided for @privacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get privacyPolicy;

  /// No description provided for @termsOfService.
  ///
  /// In en, this message translates to:
  /// **'Terms of service'**
  String get termsOfService;

  /// No description provided for @legal.
  ///
  /// In en, this message translates to:
  /// **'Legal'**
  String get legal;

  /// No description provided for @termsLead.
  ///
  /// In en, this message translates to:
  /// **'By continuing you agree to the'**
  String get termsLead;

  /// No description provided for @andLabel.
  ///
  /// In en, this message translates to:
  /// **'and'**
  String get andLabel;

  /// No description provided for @deleteAccountOrderPending.
  ///
  /// In en, this message translates to:
  /// **'A bank transfer for one of your orders is being checked. Try again once it\'s settled.'**
  String get deleteAccountOrderPending;

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @themeSystemHint.
  ///
  /// In en, this message translates to:
  /// **'Match your phone\'s setting'**
  String get themeSystemHint;

  /// No description provided for @pushNotifications.
  ///
  /// In en, this message translates to:
  /// **'Push notifications'**
  String get pushNotifications;

  /// No description provided for @pushOn.
  ///
  /// In en, this message translates to:
  /// **'On'**
  String get pushOn;

  /// No description provided for @pushOff.
  ///
  /// In en, this message translates to:
  /// **'Off'**
  String get pushOff;

  /// No description provided for @pushSettingsHint.
  ///
  /// In en, this message translates to:
  /// **'Change notifications in your phone\'s Settings → Apps → Azza.'**
  String get pushSettingsHint;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @forgotPasswordBody.
  ///
  /// In en, this message translates to:
  /// **'Enter your account email and we\'ll send you a link to choose a new password.'**
  String get forgotPasswordBody;

  /// No description provided for @sendResetLink.
  ///
  /// In en, this message translates to:
  /// **'Send reset link'**
  String get sendResetLink;

  /// No description provided for @resetLinkSent.
  ///
  /// In en, this message translates to:
  /// **'If that email has an account, a reset link is on its way.'**
  String get resetLinkSent;

  /// No description provided for @showPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get hidePassword;

  /// No description provided for @errNetwork.
  ///
  /// In en, this message translates to:
  /// **'No connection to Azza. Check your network and try again.'**
  String get errNetwork;

  /// No description provided for @errTimeout.
  ///
  /// In en, this message translates to:
  /// **'Azza took too long to answer. Try again.'**
  String get errTimeout;

  /// No description provided for @errCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled.'**
  String get errCancelled;

  /// No description provided for @errSignedOut.
  ///
  /// In en, this message translates to:
  /// **'Your session ended. Please sign in again.'**
  String get errSignedOut;

  /// No description provided for @errForbidden.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have access to this.'**
  String get errForbidden;

  /// No description provided for @errNotFound.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find that. It may have been removed.'**
  String get errNotFound;

  /// No description provided for @errBadCredentials.
  ///
  /// In en, this message translates to:
  /// **'That email and password don\'t match.'**
  String get errBadCredentials;

  /// No description provided for @errEmailTaken.
  ///
  /// In en, this message translates to:
  /// **'An account with this email already exists. Try signing in.'**
  String get errEmailTaken;

  /// No description provided for @errTooMany.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Wait a minute and try again.'**
  String get errTooMany;

  /// No description provided for @errServer.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong on our side. Try again shortly.'**
  String get errServer;

  /// No description provided for @errGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Try again.'**
  String get errGeneric;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved.'**
  String get profileSaved;

  /// No description provided for @timezoneHint.
  ///
  /// In en, this message translates to:
  /// **'Live session times are shown in this timezone.'**
  String get timezoneHint;

  /// No description provided for @useDeviceTimezone.
  ///
  /// In en, this message translates to:
  /// **'Use this phone\'s timezone: {zone}'**
  String useDeviceTimezone(String zone);

  /// No description provided for @changePassword.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get changePassword;

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get currentPassword;

  /// No description provided for @newPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPassword;

  /// No description provided for @passwordChanged.
  ///
  /// In en, this message translates to:
  /// **'Password changed. Other devices were signed out.'**
  String get passwordChanged;

  /// No description provided for @changePasswordNote.
  ///
  /// In en, this message translates to:
  /// **'Changing your password signs you out on your other devices.'**
  String get changePasswordNote;

  /// No description provided for @payAppStore.
  ///
  /// In en, this message translates to:
  /// **'App Store'**
  String get payAppStore;

  /// No description provided for @payAppStoreSub.
  ///
  /// In en, this message translates to:
  /// **'In-app purchase, charged to your Apple Account'**
  String get payAppStoreSub;

  /// No description provided for @payWithAppStore.
  ///
  /// In en, this message translates to:
  /// **'Pay with the App Store'**
  String get payWithAppStore;

  /// No description provided for @appStoreNote.
  ///
  /// In en, this message translates to:
  /// **'Payment is handled by Apple. Your place is confirmed as soon as the purchase completes.'**
  String get appStoreNote;

  /// No description provided for @appStoreBuy.
  ///
  /// In en, this message translates to:
  /// **'Buy · {price}'**
  String appStoreBuy(String price);

  /// No description provided for @appStoreConfirming.
  ///
  /// In en, this message translates to:
  /// **'Confirming your purchase…'**
  String get appStoreConfirming;

  /// No description provided for @appStorePending.
  ///
  /// In en, this message translates to:
  /// **'Waiting for approval. We\'ll enrol you as soon as the App Store confirms the purchase.'**
  String get appStorePending;

  /// No description provided for @appStoreFailed.
  ///
  /// In en, this message translates to:
  /// **'The purchase didn\'t go through.'**
  String get appStoreFailed;

  /// No description provided for @appStoreUnavailable.
  ///
  /// In en, this message translates to:
  /// **'In-app purchases aren\'t available on this device.'**
  String get appStoreUnavailable;

  /// No description provided for @appStoreRetryLater.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t confirm the purchase yet. It\'s safe — we\'ll retry automatically the next time you open the app.'**
  String get appStoreRetryLater;

  /// No description provided for @appStoreRejected.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t apply this purchase to your order. Contact support — Apple can refund the purchase.'**
  String get appStoreRejected;

  /// No description provided for @enrolOnWebsite.
  ///
  /// In en, this message translates to:
  /// **'Enrol on our website'**
  String get enrolOnWebsite;

  /// No description provided for @enrolOnWebsiteBody.
  ///
  /// In en, this message translates to:
  /// **'This class isn\'t available as an in-app purchase.'**
  String get enrolOnWebsiteBody;

  /// No description provided for @clear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clear;

  /// No description provided for @accountTitle.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get accountTitle;

  /// No description provided for @accountRowHint.
  ///
  /// In en, this message translates to:
  /// **'Photo, password, delete'**
  String get accountRowHint;

  /// No description provided for @profileSection.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileSection;

  /// No description provided for @changePhoto.
  ///
  /// In en, this message translates to:
  /// **'Change photo'**
  String get changePhoto;

  /// No description provided for @emailLockedNote.
  ///
  /// In en, this message translates to:
  /// **'Your sign-in email. Contact support to change it.'**
  String get emailLockedNote;

  /// No description provided for @useThisPhone.
  ///
  /// In en, this message translates to:
  /// **'Use this phone\'s'**
  String get useThisPhone;

  /// No description provided for @saveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get saveChanges;

  /// No description provided for @currentPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your current password.'**
  String get currentPasswordRequired;

  /// No description provided for @dangerZone.
  ///
  /// In en, this message translates to:
  /// **'Danger zone'**
  String get dangerZone;

  /// No description provided for @deleteAccountSummary.
  ///
  /// In en, this message translates to:
  /// **'Permanently delete your account, enrolments and certificates. This can\'t be undone.'**
  String get deleteAccountSummary;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take a photo'**
  String get takePhoto;

  /// No description provided for @chooseFromLibrary.
  ///
  /// In en, this message translates to:
  /// **'Choose from library'**
  String get chooseFromLibrary;

  /// No description provided for @photoPickFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t open the camera or photos. Check Azza\'s permissions in Settings.'**
  String get photoPickFailed;

  /// No description provided for @addPhotoTitle.
  ///
  /// In en, this message translates to:
  /// **'Add your photo'**
  String get addPhotoTitle;

  /// No description provided for @addPhotoBody.
  ///
  /// In en, this message translates to:
  /// **'Your teacher sees your photo on the class list and in live sessions, so they know who\'s in the class.'**
  String get addPhotoBody;

  /// No description provided for @addPhotoTips.
  ///
  /// In en, this message translates to:
  /// **'Use a clear, recent photo of your face. Only your teachers and classmates see it.'**
  String get addPhotoTips;

  /// No description provided for @addPhotoAction.
  ///
  /// In en, this message translates to:
  /// **'Add photo'**
  String get addPhotoAction;

  /// No description provided for @watchIntro.
  ///
  /// In en, this message translates to:
  /// **'Watch the intro'**
  String get watchIntro;

  /// No description provided for @watchIntroHint.
  ///
  /// In en, this message translates to:
  /// **'A short look at the course and the teacher'**
  String get watchIntroHint;

  /// No description provided for @statusPendingReview.
  ///
  /// In en, this message translates to:
  /// **'Waiting for review'**
  String get statusPendingReview;

  /// No description provided for @statusPublished.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get statusPublished;

  /// No description provided for @statusArchived.
  ///
  /// In en, this message translates to:
  /// **'Archived'**
  String get statusArchived;

  /// No description provided for @myCoursesTitle.
  ///
  /// In en, this message translates to:
  /// **'My courses'**
  String get myCoursesTitle;

  /// No description provided for @proposeCourse.
  ///
  /// In en, this message translates to:
  /// **'Propose a course'**
  String get proposeCourse;

  /// No description provided for @noProposedCourses.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t proposed a course yet.'**
  String get noProposedCourses;

  /// No description provided for @noProposedCoursesBody.
  ///
  /// In en, this message translates to:
  /// **'Propose a course and an admin will review it before it goes live.'**
  String get noProposedCoursesBody;

  /// No description provided for @changesRequested.
  ///
  /// In en, this message translates to:
  /// **'Changes requested'**
  String get changesRequested;

  /// No description provided for @waitingForReviewBody.
  ///
  /// In en, this message translates to:
  /// **'An admin is reviewing this. You can still make changes.'**
  String get waitingForReviewBody;

  /// No description provided for @publishedLockedBody.
  ///
  /// In en, this message translates to:
  /// **'This course is published. Ask an admin if it needs changes.'**
  String get publishedLockedBody;

  /// No description provided for @editCourse.
  ///
  /// In en, this message translates to:
  /// **'Edit course'**
  String get editCourse;

  /// No description provided for @newCourse.
  ///
  /// In en, this message translates to:
  /// **'New course'**
  String get newCourse;

  /// No description provided for @courseBasics.
  ///
  /// In en, this message translates to:
  /// **'Basics'**
  String get courseBasics;

  /// No description provided for @courseTitleEn.
  ///
  /// In en, this message translates to:
  /// **'Title (English)'**
  String get courseTitleEn;

  /// No description provided for @courseTitleAr.
  ///
  /// In en, this message translates to:
  /// **'Title (Arabic)'**
  String get courseTitleAr;

  /// No description provided for @courseCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get courseCategory;

  /// No description provided for @courseLevel.
  ///
  /// In en, this message translates to:
  /// **'Level'**
  String get courseLevel;

  /// No description provided for @levelBeginner.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get levelBeginner;

  /// No description provided for @levelIntermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get levelIntermediate;

  /// No description provided for @levelAdvanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get levelAdvanced;

  /// No description provided for @coursePriceAed.
  ///
  /// In en, this message translates to:
  /// **'Price (AED)'**
  String get coursePriceAed;

  /// No description provided for @courseDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get courseDescription;

  /// No description provided for @descriptionEn.
  ///
  /// In en, this message translates to:
  /// **'Description (English)'**
  String get descriptionEn;

  /// No description provided for @descriptionAr.
  ///
  /// In en, this message translates to:
  /// **'Description (Arabic)'**
  String get descriptionAr;

  /// No description provided for @descriptionHint.
  ///
  /// In en, this message translates to:
  /// **'At least 20 characters.'**
  String get descriptionHint;

  /// No description provided for @coverPhoto.
  ///
  /// In en, this message translates to:
  /// **'Cover photo'**
  String get coverPhoto;

  /// No description provided for @addCoverPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add cover photo'**
  String get addCoverPhoto;

  /// No description provided for @changeCoverPhoto.
  ///
  /// In en, this message translates to:
  /// **'Change photo'**
  String get changeCoverPhoto;

  /// No description provided for @removeCoverPhoto.
  ///
  /// In en, this message translates to:
  /// **'Remove photo'**
  String get removeCoverPhoto;

  /// No description provided for @coverPhotoHint.
  ///
  /// In en, this message translates to:
  /// **'Without a photo, the course shows its title on the colour below.'**
  String get coverPhotoHint;

  /// No description provided for @coverColour.
  ///
  /// In en, this message translates to:
  /// **'Cover colour'**
  String get coverColour;

  /// No description provided for @coverSun.
  ///
  /// In en, this message translates to:
  /// **'Sun'**
  String get coverSun;

  /// No description provided for @coverSky.
  ///
  /// In en, this message translates to:
  /// **'Sky'**
  String get coverSky;

  /// No description provided for @coverSage.
  ///
  /// In en, this message translates to:
  /// **'Sage'**
  String get coverSage;

  /// No description provided for @coverPeach.
  ///
  /// In en, this message translates to:
  /// **'Peach'**
  String get coverPeach;

  /// No description provided for @modulesTitle.
  ///
  /// In en, this message translates to:
  /// **'Modules'**
  String get modulesTitle;

  /// No description provided for @moduleTitleEn.
  ///
  /// In en, this message translates to:
  /// **'Module {n} (English)'**
  String moduleTitleEn(String n);

  /// No description provided for @moduleTitleAr.
  ///
  /// In en, this message translates to:
  /// **'Module {n} (Arabic)'**
  String moduleTitleAr(String n);

  /// No description provided for @addModule.
  ///
  /// In en, this message translates to:
  /// **'Add module'**
  String get addModule;

  /// No description provided for @removeModule.
  ///
  /// In en, this message translates to:
  /// **'Remove module'**
  String get removeModule;

  /// No description provided for @moveUp.
  ///
  /// In en, this message translates to:
  /// **'Move up'**
  String get moveUp;

  /// No description provided for @moveDown.
  ///
  /// In en, this message translates to:
  /// **'Move down'**
  String get moveDown;

  /// No description provided for @noModulesYet.
  ///
  /// In en, this message translates to:
  /// **'Add at least one module before you submit.'**
  String get noModulesYet;

  /// No description provided for @saveDraft.
  ///
  /// In en, this message translates to:
  /// **'Save draft'**
  String get saveDraft;

  /// No description provided for @submitForReview.
  ///
  /// In en, this message translates to:
  /// **'Submit for review'**
  String get submitForReview;

  /// No description provided for @draftSaved.
  ///
  /// In en, this message translates to:
  /// **'Draft saved.'**
  String get draftSaved;

  /// No description provided for @sentForReview.
  ///
  /// In en, this message translates to:
  /// **'Sent for review.'**
  String get sentForReview;

  /// No description provided for @titleRequired.
  ///
  /// In en, this message translates to:
  /// **'Add an English title.'**
  String get titleRequired;

  /// No description provided for @descriptionTooShort.
  ///
  /// In en, this message translates to:
  /// **'Write at least 20 characters in the English description.'**
  String get descriptionTooShort;

  /// No description provided for @categoryRequired.
  ///
  /// In en, this message translates to:
  /// **'Add a category.'**
  String get categoryRequired;

  /// No description provided for @priceInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a price in AED.'**
  String get priceInvalid;

  /// No description provided for @moduleTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'Every module needs an English title.'**
  String get moduleTitleRequired;

  /// No description provided for @uploadingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Uploading…'**
  String get uploadingPhoto;

  /// No description provided for @newBatch.
  ///
  /// In en, this message translates to:
  /// **'New batch'**
  String get newBatch;

  /// No description provided for @batchCourse.
  ///
  /// In en, this message translates to:
  /// **'Course'**
  String get batchCourse;

  /// No description provided for @pickCourse.
  ///
  /// In en, this message translates to:
  /// **'Pick a course'**
  String get pickCourse;

  /// No description provided for @noBatchableCourses.
  ///
  /// In en, this message translates to:
  /// **'No courses yet. Propose one first.'**
  String get noBatchableCourses;

  /// No description provided for @batchCode.
  ///
  /// In en, this message translates to:
  /// **'Batch code'**
  String get batchCode;

  /// No description provided for @batchCodeHint.
  ///
  /// In en, this message translates to:
  /// **'B and 2–4 digits, e.g. B07'**
  String get batchCodeHint;

  /// No description provided for @batchCodeInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use B and 2–4 digits, e.g. B07.'**
  String get batchCodeInvalid;

  /// No description provided for @batchSeats.
  ///
  /// In en, this message translates to:
  /// **'Seats'**
  String get batchSeats;

  /// No description provided for @seatsInvalid.
  ///
  /// In en, this message translates to:
  /// **'Seats must be between 1 and 500.'**
  String get seatsInvalid;

  /// No description provided for @sessionLanguage.
  ///
  /// In en, this message translates to:
  /// **'Session language'**
  String get sessionLanguage;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageArabic.
  ///
  /// In en, this message translates to:
  /// **'Arabic'**
  String get languageArabic;

  /// No description provided for @firstDay.
  ///
  /// In en, this message translates to:
  /// **'First day'**
  String get firstDay;

  /// No description provided for @weekdaysLabel.
  ///
  /// In en, this message translates to:
  /// **'Days'**
  String get weekdaysLabel;

  /// No description provided for @pickWeekdays.
  ///
  /// In en, this message translates to:
  /// **'Pick at least one day.'**
  String get pickWeekdays;

  /// No description provided for @sessionLength.
  ///
  /// In en, this message translates to:
  /// **'Length (minutes)'**
  String get sessionLength;

  /// No description provided for @lengthInvalid.
  ///
  /// In en, this message translates to:
  /// **'Length must be 15–480 minutes.'**
  String get lengthInvalid;

  /// No description provided for @sessionCountLabel.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get sessionCountLabel;

  /// No description provided for @sessionCountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Sessions must be 1–200.'**
  String get sessionCountInvalid;

  /// No description provided for @previewSchedule.
  ///
  /// In en, this message translates to:
  /// **'Preview schedule'**
  String get previewSchedule;

  /// No description provided for @lastSessionOn.
  ///
  /// In en, this message translates to:
  /// **'Last session {date}'**
  String lastSessionOn(String date);

  /// No description provided for @conflictCount.
  ///
  /// In en, this message translates to:
  /// **'Clashes with your other batches: {count}'**
  String conflictCount(String count);

  /// No description provided for @conflictWith.
  ///
  /// In en, this message translates to:
  /// **'Clashes with {batch}'**
  String conflictWith(String batch);

  /// No description provided for @noConflicts.
  ///
  /// In en, this message translates to:
  /// **'No clashes with your other batches.'**
  String get noConflicts;

  /// No description provided for @createBatch.
  ///
  /// In en, this message translates to:
  /// **'Create batch'**
  String get createBatch;

  /// No description provided for @batchCreated.
  ///
  /// In en, this message translates to:
  /// **'Batch saved as a draft.'**
  String get batchCreated;

  /// No description provided for @batchDraftBody.
  ///
  /// In en, this message translates to:
  /// **'This batch is a draft. Submit it so an admin can open enrollment.'**
  String get batchDraftBody;

  /// No description provided for @batchPendingBody.
  ///
  /// In en, this message translates to:
  /// **'An admin is reviewing this batch.'**
  String get batchPendingBody;

  /// No description provided for @toReviewTab.
  ///
  /// In en, this message translates to:
  /// **'To review'**
  String get toReviewTab;

  /// No description provided for @coursesSection.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get coursesSection;

  /// No description provided for @batchesSection.
  ///
  /// In en, this message translates to:
  /// **'Batches'**
  String get batchesSection;

  /// No description provided for @noPendingReviews.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting for review.'**
  String get noPendingReviews;

  /// No description provided for @sendBack.
  ///
  /// In en, this message translates to:
  /// **'Send back'**
  String get sendBack;

  /// No description provided for @sendBackTitle.
  ///
  /// In en, this message translates to:
  /// **'What needs to change?'**
  String get sendBackTitle;

  /// No description provided for @sendBackNote.
  ///
  /// In en, this message translates to:
  /// **'Note to the teacher'**
  String get sendBackNote;

  /// No description provided for @sendBackNoteTooShort.
  ///
  /// In en, this message translates to:
  /// **'Write at least 3 characters.'**
  String get sendBackNoteTooShort;

  /// No description provided for @submittedOn.
  ///
  /// In en, this message translates to:
  /// **'Submitted {date}'**
  String submittedOn(String date);

  /// No description provided for @modulesCount.
  ///
  /// In en, this message translates to:
  /// **'Modules: {count}'**
  String modulesCount(String count);

  /// No description provided for @proposedBy.
  ///
  /// In en, this message translates to:
  /// **'By {name}'**
  String proposedBy(String name);

  /// No description provided for @errCourseLocked.
  ///
  /// In en, this message translates to:
  /// **'This course is published, so only an admin can change it.'**
  String get errCourseLocked;

  /// No description provided for @errCourseIncomplete.
  ///
  /// In en, this message translates to:
  /// **'Add a description of at least 20 characters and one module before you submit.'**
  String get errCourseIncomplete;

  /// No description provided for @errAlreadySubmitted.
  ///
  /// In en, this message translates to:
  /// **'This is already waiting for review.'**
  String get errAlreadySubmitted;

  /// No description provided for @errCourseNotPublished.
  ///
  /// In en, this message translates to:
  /// **'Approve the course before its batches.'**
  String get errCourseNotPublished;

  /// No description provided for @errBatchLocked.
  ///
  /// In en, this message translates to:
  /// **'This batch is approved, so only an admin can change it.'**
  String get errBatchLocked;

  /// No description provided for @errNotPendingReview.
  ///
  /// In en, this message translates to:
  /// **'This is no longer waiting for review.'**
  String get errNotPendingReview;

  /// No description provided for @errScheduleConflict.
  ///
  /// In en, this message translates to:
  /// **'You already teach at some of these times.'**
  String get errScheduleConflict;

  /// No description provided for @errScheduleIncomplete.
  ///
  /// In en, this message translates to:
  /// **'Not every session fits this schedule. Check the days and dates.'**
  String get errScheduleIncomplete;

  /// No description provided for @errCourseArchived.
  ///
  /// In en, this message translates to:
  /// **'This course is archived.'**
  String get errCourseArchived;

  /// No description provided for @whatYoullLearn.
  ///
  /// In en, this message translates to:
  /// **'What you\'ll learn'**
  String get whatYoullLearn;

  /// No description provided for @requirementsTitle.
  ///
  /// In en, this message translates to:
  /// **'Requirements'**
  String get requirementsTitle;

  /// No description provided for @audienceTitle.
  ///
  /// In en, this message translates to:
  /// **'Who it\'s for'**
  String get audienceTitle;

  /// No description provided for @faqTitle.
  ///
  /// In en, this message translates to:
  /// **'FAQ'**
  String get faqTitle;

  /// No description provided for @totalHoursLive.
  ///
  /// In en, this message translates to:
  /// **'{hours} h live'**
  String totalHoursLive(String hours);

  /// No description provided for @ratingSemantics.
  ///
  /// In en, this message translates to:
  /// **'Rated {avg} out of 5 from {count, plural, one{{count} review} other{{count} reviews}}'**
  String ratingSemantics(String avg, int count);

  /// No description provided for @reviewsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get reviewsTitle;

  /// No description provided for @reviewsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} review} other{{count} reviews}}'**
  String reviewsCount(int count);

  /// No description provided for @noReviewsYet.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet.'**
  String get noReviewsYet;

  /// No description provided for @loadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more'**
  String get loadMore;

  /// No description provided for @writeReview.
  ///
  /// In en, this message translates to:
  /// **'Write a review'**
  String get writeReview;

  /// No description provided for @editReview.
  ///
  /// In en, this message translates to:
  /// **'Edit your review'**
  String get editReview;

  /// No description provided for @yourReview.
  ///
  /// In en, this message translates to:
  /// **'Your review'**
  String get yourReview;

  /// No description provided for @reviewBodyLabel.
  ///
  /// In en, this message translates to:
  /// **'What stood out?'**
  String get reviewBodyLabel;

  /// No description provided for @ratingRequired.
  ///
  /// In en, this message translates to:
  /// **'Pick a star rating.'**
  String get ratingRequired;

  /// No description provided for @postReview.
  ///
  /// In en, this message translates to:
  /// **'Post review'**
  String get postReview;

  /// No description provided for @reviewSaved.
  ///
  /// In en, this message translates to:
  /// **'Thanks for your review.'**
  String get reviewSaved;

  /// No description provided for @deleteReview.
  ///
  /// In en, this message translates to:
  /// **'Delete review'**
  String get deleteReview;

  /// No description provided for @deleteReviewConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete your review?'**
  String get deleteReviewConfirm;

  /// No description provided for @reviewDeleted.
  ///
  /// In en, this message translates to:
  /// **'Review deleted.'**
  String get reviewDeleted;

  /// No description provided for @starsN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} star} other{{n} stars}}'**
  String starsN(int n);

  /// No description provided for @replyAction.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get replyAction;

  /// No description provided for @replyTo.
  ///
  /// In en, this message translates to:
  /// **'Reply to {name}'**
  String replyTo(String name);

  /// No description provided for @teacherReply.
  ///
  /// In en, this message translates to:
  /// **'Teacher\'s reply'**
  String get teacherReply;

  /// No description provided for @replyTooShort.
  ///
  /// In en, this message translates to:
  /// **'Write at least 2 characters.'**
  String get replyTooShort;

  /// No description provided for @replySent.
  ///
  /// In en, this message translates to:
  /// **'Reply posted.'**
  String get replySent;

  /// No description provided for @hideReview.
  ///
  /// In en, this message translates to:
  /// **'Hide'**
  String get hideReview;

  /// No description provided for @unhideReview.
  ///
  /// In en, this message translates to:
  /// **'Unhide'**
  String get unhideReview;

  /// No description provided for @hiddenLabel.
  ///
  /// In en, this message translates to:
  /// **'Hidden'**
  String get hiddenLabel;

  /// No description provided for @relatedTitle.
  ///
  /// In en, this message translates to:
  /// **'You might also like'**
  String get relatedTitle;

  /// No description provided for @shareCourse.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get shareCourse;

  /// No description provided for @saveCourse.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get saveCourse;

  /// No description provided for @unsaveCourse.
  ///
  /// In en, this message translates to:
  /// **'Remove from saved'**
  String get unsaveCourse;

  /// No description provided for @savedToast.
  ///
  /// In en, this message translates to:
  /// **'Saved.'**
  String get savedToast;

  /// No description provided for @unsavedToast.
  ///
  /// In en, this message translates to:
  /// **'Removed from saved.'**
  String get unsavedToast;

  /// No description provided for @filters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get filters;

  /// No description provided for @sortLabel.
  ///
  /// In en, this message translates to:
  /// **'Sort by'**
  String get sortLabel;

  /// No description provided for @sortNewest.
  ///
  /// In en, this message translates to:
  /// **'Newest'**
  String get sortNewest;

  /// No description provided for @sortRating.
  ///
  /// In en, this message translates to:
  /// **'Top rated'**
  String get sortRating;

  /// No description provided for @sortPriceAsc.
  ///
  /// In en, this message translates to:
  /// **'Price: low to high'**
  String get sortPriceAsc;

  /// No description provided for @sortPriceDesc.
  ///
  /// In en, this message translates to:
  /// **'Price: high to low'**
  String get sortPriceDesc;

  /// No description provided for @sortPopular.
  ///
  /// In en, this message translates to:
  /// **'Most popular'**
  String get sortPopular;

  /// No description provided for @anyOption.
  ///
  /// In en, this message translates to:
  /// **'Any'**
  String get anyOption;

  /// No description provided for @minRatingLabel.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get minRatingLabel;

  /// No description provided for @ratingAtLeast.
  ///
  /// In en, this message translates to:
  /// **'{n}+ stars'**
  String ratingAtLeast(String n);

  /// No description provided for @priceRangeAed.
  ///
  /// In en, this message translates to:
  /// **'Price range (AED)'**
  String get priceRangeAed;

  /// No description provided for @minPrice.
  ///
  /// In en, this message translates to:
  /// **'Min'**
  String get minPrice;

  /// No description provided for @maxPrice.
  ///
  /// In en, this message translates to:
  /// **'Max'**
  String get maxPrice;

  /// No description provided for @priceRangeInvalid.
  ///
  /// In en, this message translates to:
  /// **'The minimum price is above the maximum.'**
  String get priceRangeInvalid;

  /// No description provided for @applyFilters.
  ///
  /// In en, this message translates to:
  /// **'Show results'**
  String get applyFilters;

  /// No description provided for @resetFilters.
  ///
  /// In en, this message translates to:
  /// **'Reset'**
  String get resetFilters;

  /// No description provided for @featuredTitle.
  ///
  /// In en, this message translates to:
  /// **'Featured'**
  String get featuredTitle;

  /// No description provided for @savedCoursesTitle.
  ///
  /// In en, this message translates to:
  /// **'Saved courses'**
  String get savedCoursesTitle;

  /// No description provided for @noSavedTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing saved yet.'**
  String get noSavedTitle;

  /// No description provided for @noSavedBody.
  ///
  /// In en, this message translates to:
  /// **'Tap the heart on a course to keep it here.'**
  String get noSavedBody;

  /// No description provided for @bulletEn.
  ///
  /// In en, this message translates to:
  /// **'Point {n} (English)'**
  String bulletEn(String n);

  /// No description provided for @bulletAr.
  ///
  /// In en, this message translates to:
  /// **'Point {n} (Arabic)'**
  String bulletAr(String n);

  /// No description provided for @addPoint.
  ///
  /// In en, this message translates to:
  /// **'Add point'**
  String get addPoint;

  /// No description provided for @removePoint.
  ///
  /// In en, this message translates to:
  /// **'Remove point'**
  String get removePoint;

  /// No description provided for @faqQuestionEn.
  ///
  /// In en, this message translates to:
  /// **'Question {n} (English)'**
  String faqQuestionEn(String n);

  /// No description provided for @faqAnswerEn.
  ///
  /// In en, this message translates to:
  /// **'Answer {n} (English)'**
  String faqAnswerEn(String n);

  /// No description provided for @faqQuestionAr.
  ///
  /// In en, this message translates to:
  /// **'Question {n} (Arabic)'**
  String faqQuestionAr(String n);

  /// No description provided for @faqAnswerAr.
  ///
  /// In en, this message translates to:
  /// **'Answer {n} (Arabic)'**
  String faqAnswerAr(String n);

  /// No description provided for @addQuestion.
  ///
  /// In en, this message translates to:
  /// **'Add question'**
  String get addQuestion;

  /// No description provided for @removeQuestion.
  ///
  /// In en, this message translates to:
  /// **'Remove question'**
  String get removeQuestion;

  /// No description provided for @faqIncomplete.
  ///
  /// In en, this message translates to:
  /// **'Each question needs an English question and answer.'**
  String get faqIncomplete;

  /// No description provided for @moduleDescriptionEn.
  ///
  /// In en, this message translates to:
  /// **'Module {n} description (English)'**
  String moduleDescriptionEn(String n);

  /// No description provided for @moduleDescriptionAr.
  ///
  /// In en, this message translates to:
  /// **'Module {n} description (Arabic)'**
  String moduleDescriptionAr(String n);

  /// No description provided for @errReviewNotEligible.
  ///
  /// In en, this message translates to:
  /// **'You can review this course after attending one of its live sessions.'**
  String get errReviewNotEligible;

  /// No description provided for @teacherRecordingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Your recordings'**
  String get teacherRecordingsTitle;

  /// No description provided for @teacherRecordingsLede.
  ///
  /// In en, this message translates to:
  /// **'Every session you teach is recorded automatically when you press Start. Recordings show here once processed, usually within the hour.'**
  String get teacherRecordingsLede;

  /// No description provided for @teacherRecordingsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No recordings yet'**
  String get teacherRecordingsEmpty;

  /// No description provided for @shareRecording.
  ///
  /// In en, this message translates to:
  /// **'Share or save the recording'**
  String get shareRecording;

  /// No description provided for @playRecording.
  ///
  /// In en, this message translates to:
  /// **'Play recording'**
  String get playRecording;

  /// No description provided for @instructorsTitle.
  ///
  /// In en, this message translates to:
  /// **'Instructors'**
  String get instructorsTitle;

  /// No description provided for @instructorsLede.
  ///
  /// In en, this message translates to:
  /// **'The people who teach on Azza. Open a profile to see their courses and open classes.'**
  String get instructorsLede;

  /// No description provided for @instructorsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No instructors yet'**
  String get instructorsEmpty;

  /// No description provided for @meetInstructors.
  ///
  /// In en, this message translates to:
  /// **'Meet the instructors'**
  String get meetInstructors;

  /// No description provided for @meetInstructorsHint.
  ///
  /// In en, this message translates to:
  /// **'Who teaches on Azza, and what'**
  String get meetInstructorsHint;

  /// No description provided for @allInstructors.
  ///
  /// In en, this message translates to:
  /// **'All instructors'**
  String get allInstructors;

  /// No description provided for @instructorCoursesN.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} course} other{{count} courses}}'**
  String instructorCoursesN(int count);

  /// No description provided for @instructorOpenBatchesN.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} open class} other{{count} open classes}}'**
  String instructorOpenBatchesN(int count);

  /// No description provided for @teachOnAzza.
  ///
  /// In en, this message translates to:
  /// **'Teach on Azza'**
  String get teachOnAzza;

  /// No description provided for @teachRowHint.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get teachRowHint;

  /// No description provided for @teachSignUpLink.
  ///
  /// In en, this message translates to:
  /// **'Want to teach on Azza?'**
  String get teachSignUpLink;

  /// No description provided for @teachSignUpHint.
  ///
  /// In en, this message translates to:
  /// **'Create your account first, then open Me → Teach on Azza to apply.'**
  String get teachSignUpHint;

  /// No description provided for @teachPitchTitle.
  ///
  /// In en, this message translates to:
  /// **'Teach what you know.'**
  String get teachPitchTitle;

  /// No description provided for @teachPitchBody.
  ///
  /// In en, this message translates to:
  /// **'Guide small classes of learners across the region, in Arabic or English, with lessons, practice and live sessions. Tell us who you are and what you\'d teach; our team reviews every application, usually within a few days.'**
  String get teachPitchBody;

  /// No description provided for @applySectionAbout.
  ///
  /// In en, this message translates to:
  /// **'About you'**
  String get applySectionAbout;

  /// No description provided for @applySectionTeach.
  ///
  /// In en, this message translates to:
  /// **'What you\'d teach'**
  String get applySectionTeach;

  /// No description provided for @applySectionExperience.
  ///
  /// In en, this message translates to:
  /// **'Your experience'**
  String get applySectionExperience;

  /// No description provided for @applySectionContact.
  ///
  /// In en, this message translates to:
  /// **'Links and contact'**
  String get applySectionContact;

  /// No description provided for @applyHeadline.
  ///
  /// In en, this message translates to:
  /// **'Headline'**
  String get applyHeadline;

  /// No description provided for @applyHeadlineHint.
  ///
  /// In en, this message translates to:
  /// **'Product designer · 8 years at agencies'**
  String get applyHeadlineHint;

  /// No description provided for @applyBio.
  ///
  /// In en, this message translates to:
  /// **'Short bio'**
  String get applyBio;

  /// No description provided for @applyBioHint.
  ///
  /// In en, this message translates to:
  /// **'Who you are, how you teach and who you help. At least 40 characters.'**
  String get applyBioHint;

  /// No description provided for @applyCategories.
  ///
  /// In en, this message translates to:
  /// **'Categories (1 to 5)'**
  String get applyCategories;

  /// No description provided for @applyLanguages.
  ///
  /// In en, this message translates to:
  /// **'Teaching languages'**
  String get applyLanguages;

  /// No description provided for @applyExperience.
  ///
  /// In en, this message translates to:
  /// **'Teaching experience'**
  String get applyExperience;

  /// No description provided for @applyExperienceHint.
  ///
  /// In en, this message translates to:
  /// **'3 years running weekend workshops for groups of 20 adults'**
  String get applyExperienceHint;

  /// No description provided for @applySample.
  ///
  /// In en, this message translates to:
  /// **'Sample or portfolio link (optional)'**
  String get applySample;

  /// No description provided for @applySampleHint.
  ///
  /// In en, this message translates to:
  /// **'https://example.com/portfolio'**
  String get applySampleHint;

  /// No description provided for @applyPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone (optional)'**
  String get applyPhone;

  /// No description provided for @applyPhoneHint.
  ///
  /// In en, this message translates to:
  /// **'+971 50 123 4567'**
  String get applyPhoneHint;

  /// No description provided for @applySubmit.
  ///
  /// In en, this message translates to:
  /// **'Send application'**
  String get applySubmit;

  /// No description provided for @applySent.
  ///
  /// In en, this message translates to:
  /// **'Application sent. We\'ll let you know.'**
  String get applySent;

  /// No description provided for @applyHeadlineInvalid.
  ///
  /// In en, this message translates to:
  /// **'Write 4 to 120 characters.'**
  String get applyHeadlineInvalid;

  /// No description provided for @applyBioInvalid.
  ///
  /// In en, this message translates to:
  /// **'Write 40 to 2000 characters.'**
  String get applyBioInvalid;

  /// No description provided for @applyExperienceInvalid.
  ///
  /// In en, this message translates to:
  /// **'Write 20 to 1500 characters.'**
  String get applyExperienceInvalid;

  /// No description provided for @applyCategoriesInvalid.
  ///
  /// In en, this message translates to:
  /// **'Pick 1 to 5 categories.'**
  String get applyCategoriesInvalid;

  /// No description provided for @applyLanguagesInvalid.
  ///
  /// In en, this message translates to:
  /// **'Pick at least one language.'**
  String get applyLanguagesInvalid;

  /// No description provided for @applyUrlInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use a full https:// link.'**
  String get applyUrlInvalid;

  /// No description provided for @applyPendingTitle.
  ///
  /// In en, this message translates to:
  /// **'Your application is being reviewed'**
  String get applyPendingTitle;

  /// No description provided for @applyPendingBody.
  ///
  /// In en, this message translates to:
  /// **'We\'ll notify you as soon as there\'s a decision. Meanwhile, you can keep learning as usual.'**
  String get applyPendingBody;

  /// No description provided for @applyRejectedTitle.
  ///
  /// In en, this message translates to:
  /// **'Your last application wasn\'t approved'**
  String get applyRejectedTitle;

  /// No description provided for @applyRejectedLead.
  ///
  /// In en, this message translates to:
  /// **'The reviewer\'s note is below. You\'re welcome to apply again.'**
  String get applyRejectedLead;

  /// No description provided for @applyApprovedTitle.
  ///
  /// In en, this message translates to:
  /// **'You can teach now'**
  String get applyApprovedTitle;

  /// No description provided for @applyApprovedBody.
  ///
  /// In en, this message translates to:
  /// **'Your instructor account is ready. Refresh to open the teacher studio and propose your first course.'**
  String get applyApprovedBody;

  /// No description provided for @applyRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh my account'**
  String get applyRefresh;

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @errAlreadyInstructor.
  ///
  /// In en, this message translates to:
  /// **'You already teach on Azza.'**
  String get errAlreadyInstructor;

  /// No description provided for @errApplicationPending.
  ///
  /// In en, this message translates to:
  /// **'Your application is already being reviewed.'**
  String get errApplicationPending;

  /// No description provided for @errApplicationDecided.
  ///
  /// In en, this message translates to:
  /// **'This application was already decided.'**
  String get errApplicationDecided;

  /// No description provided for @instructorApplicationsSection.
  ///
  /// In en, this message translates to:
  /// **'Instructor applications'**
  String get instructorApplicationsSection;

  /// No description provided for @applicantExperience.
  ///
  /// In en, this message translates to:
  /// **'Experience'**
  String get applicantExperience;

  /// No description provided for @openSample.
  ///
  /// In en, this message translates to:
  /// **'Open sample'**
  String get openSample;

  /// No description provided for @declineApplicationTitle.
  ///
  /// In en, this message translates to:
  /// **'Why are you declining?'**
  String get declineApplicationTitle;

  /// No description provided for @declineNoteLabel.
  ///
  /// In en, this message translates to:
  /// **'Note to the applicant'**
  String get declineNoteLabel;

  /// No description provided for @declineNoteHint.
  ///
  /// In en, this message translates to:
  /// **'Please add a short teaching sample.'**
  String get declineNoteHint;

  /// No description provided for @sendBackNoteHint.
  ///
  /// In en, this message translates to:
  /// **'Add a module on brushes and paper.'**
  String get sendBackNoteHint;

  /// No description provided for @nameHint.
  ///
  /// In en, this message translates to:
  /// **'Sara Kamal'**
  String get nameHint;

  /// No description provided for @emailHint.
  ///
  /// In en, this message translates to:
  /// **'name@example.com'**
  String get emailHint;

  /// No description provided for @passwordHint.
  ///
  /// In en, this message translates to:
  /// **'Your password'**
  String get passwordHint;

  /// No description provided for @newPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'At least 8 characters'**
  String get newPasswordHint;

  /// No description provided for @errQuizTimeUp.
  ///
  /// In en, this message translates to:
  /// **'Time ran out on this attempt, so it was recorded as 0.'**
  String get errQuizTimeUp;

  /// No description provided for @errQuizClosed.
  ///
  /// In en, this message translates to:
  /// **'This quiz is closed.'**
  String get errQuizClosed;

  /// No description provided for @errNoAttemptsLeft.
  ///
  /// In en, this message translates to:
  /// **'You have no attempts left on this quiz.'**
  String get errNoAttemptsLeft;

  /// No description provided for @errAttemptNotStarted.
  ///
  /// In en, this message translates to:
  /// **'Start the quiz before submitting.'**
  String get errAttemptNotStarted;

  /// No description provided for @lessonsTitle.
  ///
  /// In en, this message translates to:
  /// **'Lessons'**
  String get lessonsTitle;

  /// No description provided for @lessonsCountN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} lesson} other{{n} lessons}}'**
  String lessonsCountN(int n);

  /// No description provided for @lessonNofM.
  ///
  /// In en, this message translates to:
  /// **'Lesson {n} of {m}'**
  String lessonNofM(String n, String m);

  /// No description provided for @lessonHasVideo.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get lessonHasVideo;

  /// No description provided for @lessonAttachmentsN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} attachment} other{{n} attachments}}'**
  String lessonAttachmentsN(int n);

  /// No description provided for @lessonAttachments.
  ///
  /// In en, this message translates to:
  /// **'Attachments'**
  String get lessonAttachments;

  /// No description provided for @noLessons.
  ///
  /// In en, this message translates to:
  /// **'No lessons yet'**
  String get noLessons;

  /// No description provided for @noLessonsBody.
  ///
  /// In en, this message translates to:
  /// **'Your teacher hasn\'t added lessons to this course yet.'**
  String get noLessonsBody;

  /// No description provided for @previousLesson.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get previousLesson;

  /// No description provided for @nextLesson.
  ///
  /// In en, this message translates to:
  /// **'Next lesson'**
  String get nextLesson;

  /// No description provided for @watchLessonVideo.
  ///
  /// In en, this message translates to:
  /// **'Watch the lesson video'**
  String get watchLessonVideo;

  /// No description provided for @watchLessonVideoHint.
  ///
  /// In en, this message translates to:
  /// **'Opens in your video player'**
  String get watchLessonVideoHint;

  /// No description provided for @videoOnYoutube.
  ///
  /// In en, this message translates to:
  /// **'Opens on YouTube'**
  String get videoOnYoutube;

  /// No description provided for @videoOnVimeo.
  ///
  /// In en, this message translates to:
  /// **'Opens on Vimeo'**
  String get videoOnVimeo;

  /// No description provided for @myQuizzesTitle.
  ///
  /// In en, this message translates to:
  /// **'My quizzes'**
  String get myQuizzesTitle;

  /// No description provided for @quizzesTitle.
  ///
  /// In en, this message translates to:
  /// **'Quizzes'**
  String get quizzesTitle;

  /// No description provided for @noQuizzes.
  ///
  /// In en, this message translates to:
  /// **'No quizzes yet'**
  String get noQuizzes;

  /// No description provided for @noQuizzesBody.
  ///
  /// In en, this message translates to:
  /// **'Quizzes from your teachers will show up here.'**
  String get noQuizzesBody;

  /// No description provided for @noQuestions.
  ///
  /// In en, this message translates to:
  /// **'This quiz has no questions.'**
  String get noQuestions;

  /// No description provided for @quizzesToDo.
  ///
  /// In en, this message translates to:
  /// **'To do'**
  String get quizzesToDo;

  /// No description provided for @quizzesDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get quizzesDone;

  /// No description provided for @quizzesWebOnly.
  ///
  /// In en, this message translates to:
  /// **'Quizzes are created and edited on the web. Here you can follow your students\' results.'**
  String get quizzesWebOnly;

  /// No description provided for @quizLabel.
  ///
  /// In en, this message translates to:
  /// **'Quiz'**
  String get quizLabel;

  /// No description provided for @quizOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get quizOpen;

  /// No description provided for @quizInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get quizInProgress;

  /// No description provided for @quizSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get quizSubmitted;

  /// No description provided for @quizMissed.
  ///
  /// In en, this message translates to:
  /// **'Missed'**
  String get quizMissed;

  /// No description provided for @quizQuestionsN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} question} other{{n} questions}}'**
  String quizQuestionsN(int n);

  /// No description provided for @quizMinutesN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, other{{n} min}}'**
  String quizMinutesN(int n);

  /// No description provided for @quizPointsN.
  ///
  /// In en, this message translates to:
  /// **'{n} pts'**
  String quizPointsN(String n);

  /// No description provided for @quizBest.
  ///
  /// In en, this message translates to:
  /// **'Best {score}'**
  String quizBest(String score);

  /// No description provided for @quizAttemptsUsed.
  ///
  /// In en, this message translates to:
  /// **'Attempts {used}/{max}'**
  String quizAttemptsUsed(String used, String max);

  /// No description provided for @quizQuestionsLabel.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get quizQuestionsLabel;

  /// No description provided for @quizPointsLabel.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get quizPointsLabel;

  /// No description provided for @quizTimeLimitLabel.
  ///
  /// In en, this message translates to:
  /// **'Time limit'**
  String get quizTimeLimitLabel;

  /// No description provided for @quizNoTimeLimit.
  ///
  /// In en, this message translates to:
  /// **'No time limit'**
  String get quizNoTimeLimit;

  /// No description provided for @quizAttemptsLabel.
  ///
  /// In en, this message translates to:
  /// **'Attempts'**
  String get quizAttemptsLabel;

  /// No description provided for @quizDueLabel.
  ///
  /// In en, this message translates to:
  /// **'Due'**
  String get quizDueLabel;

  /// No description provided for @quizBestScore.
  ///
  /// In en, this message translates to:
  /// **'Your best score'**
  String get quizBestScore;

  /// No description provided for @quizYourAttempts.
  ///
  /// In en, this message translates to:
  /// **'Your attempts'**
  String get quizYourAttempts;

  /// No description provided for @quizTimedOut.
  ///
  /// In en, this message translates to:
  /// **'Time ran out'**
  String get quizTimedOut;

  /// No description provided for @quizStart.
  ///
  /// In en, this message translates to:
  /// **'Start quiz'**
  String get quizStart;

  /// No description provided for @quizTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get quizTryAgain;

  /// No description provided for @quizResume.
  ///
  /// In en, this message translates to:
  /// **'Resume attempt'**
  String get quizResume;

  /// No description provided for @quizClosedNote.
  ///
  /// In en, this message translates to:
  /// **'This quiz is closed.'**
  String get quizClosedNote;

  /// No description provided for @quizNoAttemptsNote.
  ///
  /// In en, this message translates to:
  /// **'You\'ve used all your attempts.'**
  String get quizNoAttemptsNote;

  /// No description provided for @quizUnavailableNote.
  ///
  /// In en, this message translates to:
  /// **'This quiz can\'t be started right now.'**
  String get quizUnavailableNote;

  /// No description provided for @quizStartTimedTitle.
  ///
  /// In en, this message translates to:
  /// **'Start the timer?'**
  String get quizStartTimedTitle;

  /// No description provided for @quizStartTimedBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll have {minutes, plural, one{{minutes} minute} other{{minutes} minutes}} once you start. When time runs out, your answers are submitted automatically.'**
  String quizStartTimedBody(int minutes);

  /// No description provided for @quizQuestionNofM.
  ///
  /// In en, this message translates to:
  /// **'Question {n} of {m}'**
  String quizQuestionNofM(String n, String m);

  /// No description provided for @quizQuestionN.
  ///
  /// In en, this message translates to:
  /// **'Question {n}'**
  String quizQuestionN(String n);

  /// No description provided for @quizAnsweredN.
  ///
  /// In en, this message translates to:
  /// **'{n} answered'**
  String quizAnsweredN(String n);

  /// No description provided for @quizChooseOne.
  ///
  /// In en, this message translates to:
  /// **'Choose one'**
  String get quizChooseOne;

  /// No description provided for @quizChooseAll.
  ///
  /// In en, this message translates to:
  /// **'Choose all that apply'**
  String get quizChooseAll;

  /// No description provided for @quizPrevious.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get quizPrevious;

  /// No description provided for @quizNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get quizNext;

  /// No description provided for @quizSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get quizSubmit;

  /// No description provided for @quizSubmitTitle.
  ///
  /// In en, this message translates to:
  /// **'Submit your answers?'**
  String get quizSubmitTitle;

  /// No description provided for @quizAnsweredOf.
  ///
  /// In en, this message translates to:
  /// **'You answered {answered} of {total, plural, one{{total} question.} other{{total} questions.}}'**
  String quizAnsweredOf(int answered, int total);

  /// No description provided for @quizUnansweredWarning.
  ///
  /// In en, this message translates to:
  /// **'Unanswered questions score 0.'**
  String get quizUnansweredWarning;

  /// No description provided for @quizAutoSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Time\'s up. Your answers were submitted.'**
  String get quizAutoSubmitted;

  /// No description provided for @quizLeaveTitle.
  ///
  /// In en, this message translates to:
  /// **'Leave the quiz?'**
  String get quizLeaveTitle;

  /// No description provided for @quizLeaveBody.
  ///
  /// In en, this message translates to:
  /// **'Your answers on this screen won\'t be saved.'**
  String get quizLeaveBody;

  /// No description provided for @quizLeaveTimedBody.
  ///
  /// In en, this message translates to:
  /// **'Your answers on this screen won\'t be saved, and the timer keeps running.'**
  String get quizLeaveTimedBody;

  /// No description provided for @quizKeepGoing.
  ///
  /// In en, this message translates to:
  /// **'Keep going'**
  String get quizKeepGoing;

  /// No description provided for @quizLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get quizLeave;

  /// No description provided for @quizTimeLeft.
  ///
  /// In en, this message translates to:
  /// **'Time left {time}'**
  String quizTimeLeft(String time);

  /// No description provided for @quizResultTitle.
  ///
  /// In en, this message translates to:
  /// **'Result'**
  String get quizResultTitle;

  /// No description provided for @quizAttemptN.
  ///
  /// In en, this message translates to:
  /// **'Attempt {n}'**
  String quizAttemptN(String n);

  /// No description provided for @quizYourScore.
  ///
  /// In en, this message translates to:
  /// **'Your score'**
  String get quizYourScore;

  /// No description provided for @quizPointsOf.
  ///
  /// In en, this message translates to:
  /// **'{score} of {max} points'**
  String quizPointsOf(String score, String max);

  /// No description provided for @quizAnswersHidden.
  ///
  /// In en, this message translates to:
  /// **'Correct answers appear after the due date, or once you\'ve used all your attempts.'**
  String get quizAnswersHidden;

  /// No description provided for @quizReviewAnswers.
  ///
  /// In en, this message translates to:
  /// **'Review your answers'**
  String get quizReviewAnswers;

  /// No description provided for @quizCorrect.
  ///
  /// In en, this message translates to:
  /// **'Correct'**
  String get quizCorrect;

  /// No description provided for @quizIncorrect.
  ///
  /// In en, this message translates to:
  /// **'Incorrect'**
  String get quizIncorrect;

  /// No description provided for @quizPartial.
  ///
  /// In en, this message translates to:
  /// **'Partly correct'**
  String get quizPartial;

  /// No description provided for @quizNotAnswered.
  ///
  /// In en, this message translates to:
  /// **'Not answered'**
  String get quizNotAnswered;

  /// No description provided for @quizBackToQuiz.
  ///
  /// In en, this message translates to:
  /// **'Back to the quiz'**
  String get quizBackToQuiz;

  /// No description provided for @quizResultsTitle.
  ///
  /// In en, this message translates to:
  /// **'Quiz results'**
  String get quizResultsTitle;

  /// No description provided for @quizStudentsAttempted.
  ///
  /// In en, this message translates to:
  /// **'{students, plural, one{{students} student tried} other{{students} students tried}} · {attempts, plural, one{{attempts} attempt} other{{attempts} attempts}}'**
  String quizStudentsAttempted(int students, int attempts);

  /// No description provided for @studentsLabel.
  ///
  /// In en, this message translates to:
  /// **'Students'**
  String get studentsLabel;

  /// No description provided for @quizAverage.
  ///
  /// In en, this message translates to:
  /// **'Average'**
  String get quizAverage;

  /// No description provided for @quizNoAttemptsYet.
  ///
  /// In en, this message translates to:
  /// **'No attempts yet'**
  String get quizNoAttemptsYet;

  /// No description provided for @quizAttemptsN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} attempt} other{{n} attempts}}'**
  String quizAttemptsN(int n);

  /// No description provided for @quizPerQuestion.
  ///
  /// In en, this message translates to:
  /// **'By question'**
  String get quizPerQuestion;

  /// No description provided for @quizCorrectOfAnswered.
  ///
  /// In en, this message translates to:
  /// **'{correct} of {answered} correct'**
  String quizCorrectOfAnswered(String correct, String answered);

  /// No description provided for @messagesTitle.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get messagesTitle;

  /// No description provided for @messagesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No messages yet'**
  String get messagesEmptyTitle;

  /// No description provided for @messagesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Your class chats and messages with your teacher show up here.'**
  String get messagesEmptyBody;

  /// No description provided for @classChat.
  ///
  /// In en, this message translates to:
  /// **'Class chat'**
  String get classChat;

  /// No description provided for @messageYourTeacher.
  ///
  /// In en, this message translates to:
  /// **'Message your teacher'**
  String get messageYourTeacher;

  /// No description provided for @chatPrivateLabel.
  ///
  /// In en, this message translates to:
  /// **'Private chat'**
  String get chatPrivateLabel;

  /// No description provided for @chatNoMessagesYet.
  ///
  /// In en, this message translates to:
  /// **'No messages yet. Say hello to get things started.'**
  String get chatNoMessagesYet;

  /// No description provided for @chatComposerLabel.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get chatComposerLabel;

  /// No description provided for @chatComposerHint.
  ///
  /// In en, this message translates to:
  /// **'Write a message'**
  String get chatComposerHint;

  /// No description provided for @chatClosedNote.
  ///
  /// In en, this message translates to:
  /// **'This class has ended, so its chat is read-only.'**
  String get chatClosedNote;

  /// No description provided for @chatAdminReadOnly.
  ///
  /// In en, this message translates to:
  /// **'You can read this private chat, but not reply to it.'**
  String get chatAdminReadOnly;

  /// No description provided for @chatLoadEarlier.
  ///
  /// In en, this message translates to:
  /// **'Load earlier messages'**
  String get chatLoadEarlier;

  /// No description provided for @chatMessageDeleted.
  ///
  /// In en, this message translates to:
  /// **'Message deleted'**
  String get chatMessageDeleted;

  /// No description provided for @chatDeleteMessage.
  ///
  /// In en, this message translates to:
  /// **'Delete message'**
  String get chatDeleteMessage;

  /// No description provided for @chatDeleteConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this message?'**
  String get chatDeleteConfirmTitle;

  /// No description provided for @chatDeleteConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'It will be removed for everyone in this chat.'**
  String get chatDeleteConfirmBody;

  /// No description provided for @chatSendFailed.
  ///
  /// In en, this message translates to:
  /// **'Not sent. Tap to try again.'**
  String get chatSendFailed;

  /// No description provided for @chatSending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get chatSending;

  /// No description provided for @chatUnreadN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, other{{n} unread}}'**
  String chatUnreadN(int n);

  /// No description provided for @announcementsTitle.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get announcementsTitle;

  /// No description provided for @announcementsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No announcements yet'**
  String get announcementsEmpty;

  /// No description provided for @announcementsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'News from your teachers and the Azza team will appear here.'**
  String get announcementsEmptyBody;

  /// No description provided for @latestFromClasses.
  ///
  /// In en, this message translates to:
  /// **'Latest from your classes'**
  String get latestFromClasses;

  /// No description provided for @pinnedLabel.
  ///
  /// In en, this message translates to:
  /// **'Pinned'**
  String get pinnedLabel;

  /// No description provided for @fromAzzaTeam.
  ///
  /// In en, this message translates to:
  /// **'Azza team'**
  String get fromAzzaTeam;

  /// No description provided for @newAnnouncement.
  ///
  /// In en, this message translates to:
  /// **'New announcement'**
  String get newAnnouncement;

  /// No description provided for @platformAnnouncement.
  ///
  /// In en, this message translates to:
  /// **'Platform announcement'**
  String get platformAnnouncement;

  /// No description provided for @announcementTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get announcementTitleLabel;

  /// No description provided for @announcementTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'Give the announcement a title.'**
  String get announcementTitleRequired;

  /// No description provided for @announcementBodyLabel.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get announcementBodyLabel;

  /// No description provided for @announcementBodyHint.
  ///
  /// In en, this message translates to:
  /// **'Markdown works: **bold**, lists and links'**
  String get announcementBodyHint;

  /// No description provided for @announcementBodyRequired.
  ///
  /// In en, this message translates to:
  /// **'Write the announcement.'**
  String get announcementBodyRequired;

  /// No description provided for @announcementAudience.
  ///
  /// In en, this message translates to:
  /// **'Who sees it'**
  String get announcementAudience;

  /// No description provided for @audienceAll.
  ///
  /// In en, this message translates to:
  /// **'Everyone'**
  String get audienceAll;

  /// No description provided for @audienceStudents.
  ///
  /// In en, this message translates to:
  /// **'Students'**
  String get audienceStudents;

  /// No description provided for @audienceTeachers.
  ///
  /// In en, this message translates to:
  /// **'Teachers'**
  String get audienceTeachers;

  /// No description provided for @announcementPin.
  ///
  /// In en, this message translates to:
  /// **'Pin to the top'**
  String get announcementPin;

  /// No description provided for @announcementNotify.
  ///
  /// In en, this message translates to:
  /// **'Notify people'**
  String get announcementNotify;

  /// No description provided for @announcementNotifyClassHint.
  ///
  /// In en, this message translates to:
  /// **'Your students get an in-app and push notification.'**
  String get announcementNotifyClassHint;

  /// No description provided for @announcementNotifyPlatformHint.
  ///
  /// In en, this message translates to:
  /// **'In the app, by push and by email.'**
  String get announcementNotifyPlatformHint;

  /// No description provided for @announcementPost.
  ///
  /// In en, this message translates to:
  /// **'Post'**
  String get announcementPost;

  /// No description provided for @announcementPosted.
  ///
  /// In en, this message translates to:
  /// **'Announcement posted.'**
  String get announcementPosted;

  /// No description provided for @announcementDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete announcement'**
  String get announcementDelete;

  /// No description provided for @announcementDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this announcement?'**
  String get announcementDeleteConfirm;

  /// No description provided for @helpSupport.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get helpSupport;

  /// No description provided for @helpSupportHint.
  ///
  /// In en, this message translates to:
  /// **'Ask the Azza team'**
  String get helpSupportHint;

  /// No description provided for @supportEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No requests yet'**
  String get supportEmptyTitle;

  /// No description provided for @supportEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Stuck with a payment, a class or your account? Tell us and we\'ll help.'**
  String get supportEmptyBody;

  /// No description provided for @newTicket.
  ///
  /// In en, this message translates to:
  /// **'New request'**
  String get newTicket;

  /// No description provided for @newTicketIntro.
  ///
  /// In en, this message translates to:
  /// **'Tell us what\'s going on. We\'ll reply here and by email.'**
  String get newTicketIntro;

  /// No description provided for @ticketSubject.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get ticketSubject;

  /// No description provided for @ticketSubjectHint.
  ///
  /// In en, this message translates to:
  /// **'In a few words, what\'s wrong?'**
  String get ticketSubjectHint;

  /// No description provided for @ticketSubjectRequired.
  ///
  /// In en, this message translates to:
  /// **'Add a short subject.'**
  String get ticketSubjectRequired;

  /// No description provided for @ticketCategory.
  ///
  /// In en, this message translates to:
  /// **'Topic'**
  String get ticketCategory;

  /// No description provided for @supportCatPayment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get supportCatPayment;

  /// No description provided for @supportCatClass.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get supportCatClass;

  /// No description provided for @supportCatAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get supportCatAccount;

  /// No description provided for @supportCatTechnical.
  ///
  /// In en, this message translates to:
  /// **'Technical'**
  String get supportCatTechnical;

  /// No description provided for @supportCatOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get supportCatOther;

  /// No description provided for @ticketOrder.
  ///
  /// In en, this message translates to:
  /// **'Order (optional)'**
  String get ticketOrder;

  /// No description provided for @ticketClass.
  ///
  /// In en, this message translates to:
  /// **'Class (optional)'**
  String get ticketClass;

  /// No description provided for @ticketNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get ticketNone;

  /// No description provided for @ticketThisOrder.
  ///
  /// In en, this message translates to:
  /// **'This order'**
  String get ticketThisOrder;

  /// No description provided for @ticketThisClass.
  ///
  /// In en, this message translates to:
  /// **'This class'**
  String get ticketThisClass;

  /// No description provided for @ticketMessage.
  ///
  /// In en, this message translates to:
  /// **'What happened?'**
  String get ticketMessage;

  /// No description provided for @ticketMessageHint.
  ///
  /// In en, this message translates to:
  /// **'What you tried, and what you saw'**
  String get ticketMessageHint;

  /// No description provided for @ticketMessageRequired.
  ///
  /// In en, this message translates to:
  /// **'Tell us what happened.'**
  String get ticketMessageRequired;

  /// No description provided for @ticketSubmit.
  ///
  /// In en, this message translates to:
  /// **'Send to support'**
  String get ticketSubmit;

  /// No description provided for @ticketCreated.
  ///
  /// In en, this message translates to:
  /// **'Sent. We\'ll reply here and by email.'**
  String get ticketCreated;

  /// No description provided for @ticketStatusOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get ticketStatusOpen;

  /// No description provided for @ticketStatusAwaitingYou.
  ///
  /// In en, this message translates to:
  /// **'Waiting for you'**
  String get ticketStatusAwaitingYou;

  /// No description provided for @ticketStatusAwaitingUser.
  ///
  /// In en, this message translates to:
  /// **'Awaiting user'**
  String get ticketStatusAwaitingUser;

  /// No description provided for @ticketStatusResolved.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get ticketStatusResolved;

  /// No description provided for @ticketNewReply.
  ///
  /// In en, this message translates to:
  /// **'New reply'**
  String get ticketNewReply;

  /// No description provided for @ticketReplyLabel.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get ticketReplyLabel;

  /// No description provided for @ticketReplyHint.
  ///
  /// In en, this message translates to:
  /// **'Write a reply'**
  String get ticketReplyHint;

  /// No description provided for @ticketMarkResolved.
  ///
  /// In en, this message translates to:
  /// **'Mark resolved'**
  String get ticketMarkResolved;

  /// No description provided for @ticketResolvedNote.
  ///
  /// In en, this message translates to:
  /// **'Marked resolved. Thanks for letting us know.'**
  String get ticketResolvedNote;

  /// No description provided for @ticketResolvedReopenHint.
  ///
  /// In en, this message translates to:
  /// **'This request is resolved. Reply any time to reopen it.'**
  String get ticketResolvedReopenHint;

  /// No description provided for @ticketStaffLabel.
  ///
  /// In en, this message translates to:
  /// **'Azza support'**
  String get ticketStaffLabel;

  /// No description provided for @ticketSetStatus.
  ///
  /// In en, this message translates to:
  /// **'Change status'**
  String get ticketSetStatus;

  /// No description provided for @ticketStatusChanged.
  ///
  /// In en, this message translates to:
  /// **'Status updated.'**
  String get ticketStatusChanged;

  /// No description provided for @ticketFrom.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get ticketFrom;

  /// No description provided for @ticketLinkedOrder.
  ///
  /// In en, this message translates to:
  /// **'Order'**
  String get ticketLinkedOrder;

  /// No description provided for @ticketLinkedClass.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get ticketLinkedClass;

  /// No description provided for @supportInbox.
  ///
  /// In en, this message translates to:
  /// **'Support inbox'**
  String get supportInbox;

  /// No description provided for @supportInboxEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing here. All caught up.'**
  String get supportInboxEmpty;

  /// No description provided for @supportFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get supportFilterAll;

  /// No description provided for @ticketAllCategories.
  ///
  /// In en, this message translates to:
  /// **'All topics'**
  String get ticketAllCategories;

  /// No description provided for @needHelp.
  ///
  /// In en, this message translates to:
  /// **'Need help?'**
  String get needHelp;

  /// No description provided for @errChatTooFast.
  ///
  /// In en, this message translates to:
  /// **'You\'re sending messages too quickly. Wait a moment and try again.'**
  String get errChatTooFast;

  /// No description provided for @errDmNotAllowed.
  ///
  /// In en, this message translates to:
  /// **'Private messages are only between a student and their teacher.'**
  String get errDmNotAllowed;

  /// No description provided for @errNotClassMember.
  ///
  /// In en, this message translates to:
  /// **'Only people in this class can see this.'**
  String get errNotClassMember;

  /// No description provided for @errInvalidAssignee.
  ///
  /// In en, this message translates to:
  /// **'That person can\'t take this request.'**
  String get errInvalidAssignee;

  /// No description provided for @studentContinueLearning.
  ///
  /// In en, this message translates to:
  /// **'Continue learning'**
  String get studentContinueLearning;

  /// No description provided for @studentModulesN.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} module} other{{n} modules}}'**
  String studentModulesN(int n);

  /// No description provided for @studentOpenLessons.
  ///
  /// In en, this message translates to:
  /// **'Open lessons'**
  String get studentOpenLessons;

  /// No description provided for @studentPracticeQuiz.
  ///
  /// In en, this message translates to:
  /// **'Quiz'**
  String get studentPracticeQuiz;

  /// No description provided for @studentPracticeAssignment.
  ///
  /// In en, this message translates to:
  /// **'Assignment'**
  String get studentPracticeAssignment;

  /// No description provided for @studentOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get studentOverdue;

  /// No description provided for @studentWasDue.
  ///
  /// In en, this message translates to:
  /// **'Was due {when}'**
  String studentWasDue(String when);

  /// No description provided for @studentNoDueDate.
  ///
  /// In en, this message translates to:
  /// **'No due date'**
  String get studentNoDueDate;

  /// No description provided for @studentSessionN.
  ///
  /// In en, this message translates to:
  /// **'Session {n}'**
  String studentSessionN(String n);

  /// No description provided for @studentCertificateReadyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your certificate is ready'**
  String get studentCertificateReadyTitle;

  /// No description provided for @studentCertificateReadyBody.
  ///
  /// In en, this message translates to:
  /// **'{course}: proof you learned it. Open it to view and share.'**
  String studentCertificateReadyBody(String course);

  /// No description provided for @studentHowWasToday.
  ///
  /// In en, this message translates to:
  /// **'How was today\'s session?'**
  String get studentHowWasToday;

  /// No description provided for @studentSessionPractice.
  ///
  /// In en, this message translates to:
  /// **'Practise what you covered'**
  String get studentSessionPractice;

  /// No description provided for @studentPractiseNow.
  ///
  /// In en, this message translates to:
  /// **'Practise now'**
  String get studentPractiseNow;

  /// No description provided for @studentNextModule.
  ///
  /// In en, this message translates to:
  /// **'Next module'**
  String get studentNextModule;

  /// No description provided for @studentModuleDone.
  ///
  /// In en, this message translates to:
  /// **'You\'ve reached the end of {module}.'**
  String studentModuleDone(String module);

  /// No description provided for @studentModuleQuizHint.
  ///
  /// In en, this message translates to:
  /// **'Check what you learned with “{quiz}”.'**
  String studentModuleQuizHint(String quiz);

  /// No description provided for @studentModuleNextHint.
  ///
  /// In en, this message translates to:
  /// **'Keep going with the next module.'**
  String get studentModuleNextHint;

  /// No description provided for @studentClassLabel.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get studentClassLabel;

  /// No description provided for @studentAddToCalendar.
  ///
  /// In en, this message translates to:
  /// **'Add to my calendar'**
  String get studentAddToCalendar;

  /// No description provided for @studentCalendarCopied.
  ///
  /// In en, this message translates to:
  /// **'Calendar link copied. Paste it into your calendar app to subscribe.'**
  String get studentCalendarCopied;

  /// No description provided for @studentSubmittedOn.
  ///
  /// In en, this message translates to:
  /// **'Submitted {when}'**
  String studentSubmittedOn(String when);

  /// No description provided for @studentSubmittedLate.
  ///
  /// In en, this message translates to:
  /// **'Submitted late'**
  String get studentSubmittedLate;

  /// No description provided for @studentOverdueHint.
  ///
  /// In en, this message translates to:
  /// **'You can still hand it in. It will be marked late.'**
  String get studentOverdueHint;

  /// No description provided for @adminNavManage.
  ///
  /// In en, this message translates to:
  /// **'Manage'**
  String get adminNavManage;

  /// No description provided for @adminManageTitle.
  ///
  /// In en, this message translates to:
  /// **'Manage'**
  String get adminManageTitle;

  /// No description provided for @adminHubPeopleSection.
  ///
  /// In en, this message translates to:
  /// **'People and support'**
  String get adminHubPeopleSection;

  /// No description provided for @adminHubMoneySection.
  ///
  /// In en, this message translates to:
  /// **'Money'**
  String get adminHubMoneySection;

  /// No description provided for @adminHubCatalogSection.
  ///
  /// In en, this message translates to:
  /// **'Catalog'**
  String get adminHubCatalogSection;

  /// No description provided for @adminHubInsightSection.
  ///
  /// In en, this message translates to:
  /// **'Insight and platform'**
  String get adminHubInsightSection;

  /// No description provided for @adminHubSupportSub.
  ///
  /// In en, this message translates to:
  /// **'Tickets from students and teachers'**
  String get adminHubSupportSub;

  /// No description provided for @adminHubPeopleSub.
  ///
  /// In en, this message translates to:
  /// **'Accounts, roles, bans and teacher profiles'**
  String get adminHubPeopleSub;

  /// No description provided for @adminHubPaymentsSub.
  ///
  /// In en, this message translates to:
  /// **'Every order, with refunds'**
  String get adminHubPaymentsSub;

  /// No description provided for @adminHubPayoutsSub.
  ///
  /// In en, this message translates to:
  /// **'Monthly payouts to teachers'**
  String get adminHubPayoutsSub;

  /// No description provided for @adminHubCouponsSub.
  ///
  /// In en, this message translates to:
  /// **'Discount codes and who used them'**
  String get adminHubCouponsSub;

  /// No description provided for @adminHubBankSub.
  ///
  /// In en, this message translates to:
  /// **'Where students send bank transfers'**
  String get adminHubBankSub;

  /// No description provided for @adminHubCurrenciesSub.
  ///
  /// In en, this message translates to:
  /// **'Display rates for SAR, QAR and USD'**
  String get adminHubCurrenciesSub;

  /// No description provided for @adminHubCoursesSub.
  ///
  /// In en, this message translates to:
  /// **'Create, edit, publish and feature'**
  String get adminHubCoursesSub;

  /// No description provided for @adminHubBatchesSub.
  ///
  /// In en, this message translates to:
  /// **'Classes, schedules and enrolments'**
  String get adminHubBatchesSub;

  /// No description provided for @adminHubCategoriesSub.
  ///
  /// In en, this message translates to:
  /// **'Order, names and visibility'**
  String get adminHubCategoriesSub;

  /// No description provided for @adminHubReportsSub.
  ///
  /// In en, this message translates to:
  /// **'Revenue, fill, attendance, completion'**
  String get adminHubReportsSub;

  /// No description provided for @adminHubLiveSub.
  ///
  /// In en, this message translates to:
  /// **'Every room on air right now'**
  String get adminHubLiveSub;

  /// No description provided for @adminHubSettingsSub.
  ///
  /// In en, this message translates to:
  /// **'Platform rules and integrations'**
  String get adminHubSettingsSub;

  /// No description provided for @adminHubNoSettings.
  ///
  /// In en, this message translates to:
  /// **'Arabic course text is edited inside each course; there is no separate translations area.'**
  String get adminHubNoSettings;

  /// No description provided for @adminSettingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get adminSettingsTitle;

  /// No description provided for @adminSettingsBody.
  ///
  /// In en, this message translates to:
  /// **'These rules come from the server configuration. Change them there.'**
  String get adminSettingsBody;

  /// No description provided for @adminRules.
  ///
  /// In en, this message translates to:
  /// **'Rules'**
  String get adminRules;

  /// No description provided for @adminIntegrations.
  ///
  /// In en, this message translates to:
  /// **'Integrations'**
  String get adminIntegrations;

  /// No description provided for @adminConfigured.
  ///
  /// In en, this message translates to:
  /// **'Configured'**
  String get adminConfigured;

  /// No description provided for @adminNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Not configured'**
  String get adminNotConfigured;

  /// No description provided for @adminRuleTeacherShare.
  ///
  /// In en, this message translates to:
  /// **'Teacher share'**
  String get adminRuleTeacherShare;

  /// No description provided for @adminRuleEarningHold.
  ///
  /// In en, this message translates to:
  /// **'Earnings hold'**
  String get adminRuleEarningHold;

  /// No description provided for @adminRuleMinPayout.
  ///
  /// In en, this message translates to:
  /// **'Minimum payout'**
  String get adminRuleMinPayout;

  /// No description provided for @adminRuleTransferHold.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer hold'**
  String get adminRuleTransferHold;

  /// No description provided for @adminRuleVat.
  ///
  /// In en, this message translates to:
  /// **'VAT'**
  String get adminRuleVat;

  /// No description provided for @adminDaysValue.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} day} other{{n} days}}'**
  String adminDaysValue(int n);

  /// No description provided for @adminHoursValue.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} hour} other{{n} hours}}'**
  String adminHoursValue(int n);

  /// No description provided for @adminRoleStudent.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get adminRoleStudent;

  /// No description provided for @adminRoleTeacher.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get adminRoleTeacher;

  /// No description provided for @adminRoleAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get adminRoleAdmin;

  /// No description provided for @adminNeedsYouCount.
  ///
  /// In en, this message translates to:
  /// **'Needs you · {n}'**
  String adminNeedsYouCount(String n);

  /// No description provided for @adminAllClear.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting on you. Nice.'**
  String get adminAllClear;

  /// No description provided for @adminQueueProposals.
  ///
  /// In en, this message translates to:
  /// **'Proposals to review'**
  String get adminQueueProposals;

  /// No description provided for @adminQueueProposalsSub.
  ///
  /// In en, this message translates to:
  /// **'Courses and classes from teachers'**
  String get adminQueueProposalsSub;

  /// No description provided for @adminQueueTransfers.
  ///
  /// In en, this message translates to:
  /// **'Transfers to verify'**
  String get adminQueueTransfers;

  /// No description provided for @adminQueueTransfersSub.
  ///
  /// In en, this message translates to:
  /// **'Receipts waiting; seats are on hold'**
  String get adminQueueTransfersSub;

  /// No description provided for @adminQueuePayouts.
  ///
  /// In en, this message translates to:
  /// **'Payout runs'**
  String get adminQueuePayouts;

  /// No description provided for @adminQueuePayoutsSub.
  ///
  /// In en, this message translates to:
  /// **'To approve or mark paid'**
  String get adminQueuePayoutsSub;

  /// No description provided for @adminQueueReschedules.
  ///
  /// In en, this message translates to:
  /// **'Reschedule requests'**
  String get adminQueueReschedules;

  /// No description provided for @adminQueueReschedulesSub.
  ///
  /// In en, this message translates to:
  /// **'Teachers asking to move a session'**
  String get adminQueueReschedulesSub;

  /// No description provided for @adminQueueTickets.
  ///
  /// In en, this message translates to:
  /// **'Open support tickets'**
  String get adminQueueTickets;

  /// No description provided for @adminQueueTicketsSub.
  ///
  /// In en, this message translates to:
  /// **'People waiting for an answer'**
  String get adminQueueTicketsSub;

  /// No description provided for @adminQueueApplications.
  ///
  /// In en, this message translates to:
  /// **'Instructor applications'**
  String get adminQueueApplications;

  /// No description provided for @adminQueueApplicationsSub.
  ///
  /// In en, this message translates to:
  /// **'People who want to teach'**
  String get adminQueueApplicationsSub;

  /// No description provided for @adminQueueAlerts.
  ///
  /// In en, this message translates to:
  /// **'Other alerts'**
  String get adminQueueAlerts;

  /// No description provided for @adminQueueAlertsSub.
  ///
  /// In en, this message translates to:
  /// **'Held payouts, bank checks, expiring holds'**
  String get adminQueueAlertsSub;

  /// No description provided for @adminLiveNow.
  ///
  /// In en, this message translates to:
  /// **'Live now'**
  String get adminLiveNow;

  /// No description provided for @adminRoomIssues.
  ///
  /// In en, this message translates to:
  /// **'{n} with issues'**
  String adminRoomIssues(String n);

  /// No description provided for @adminPeopleInRoom.
  ///
  /// In en, this message translates to:
  /// **'{n} in the room'**
  String adminPeopleInRoom(String n);

  /// No description provided for @adminQualityIssue.
  ///
  /// In en, this message translates to:
  /// **'quality: {quality}'**
  String adminQualityIssue(String quality);

  /// No description provided for @adminHealth.
  ///
  /// In en, this message translates to:
  /// **'Health'**
  String get adminHealth;

  /// No description provided for @adminPaymentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get adminPaymentsTitle;

  /// No description provided for @adminSearchOrders.
  ///
  /// In en, this message translates to:
  /// **'Search orders'**
  String get adminSearchOrders;

  /// No description provided for @adminSearchOrdersHint.
  ///
  /// In en, this message translates to:
  /// **'Reference, student name or email'**
  String get adminSearchOrdersHint;

  /// No description provided for @adminAnyMethod.
  ///
  /// In en, this message translates to:
  /// **'Any method'**
  String get adminAnyMethod;

  /// No description provided for @adminNoOrders.
  ///
  /// In en, this message translates to:
  /// **'No orders here'**
  String get adminNoOrders;

  /// No description provided for @adminNoOrdersBody.
  ///
  /// In en, this message translates to:
  /// **'Try another status or method, or clear the search.'**
  String get adminNoOrdersBody;

  /// No description provided for @adminOrderTitle.
  ///
  /// In en, this message translates to:
  /// **'Order'**
  String get adminOrderTitle;

  /// No description provided for @adminRefundedSoFar.
  ///
  /// In en, this message translates to:
  /// **'{amount} refunded so far'**
  String adminRefundedSoFar(String amount);

  /// No description provided for @adminOrderAmounts.
  ///
  /// In en, this message translates to:
  /// **'Amounts'**
  String get adminOrderAmounts;

  /// No description provided for @adminSubtotal.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get adminSubtotal;

  /// No description provided for @adminDiscount.
  ///
  /// In en, this message translates to:
  /// **'Discount'**
  String get adminDiscount;

  /// No description provided for @adminVat.
  ///
  /// In en, this message translates to:
  /// **'VAT'**
  String get adminVat;

  /// No description provided for @adminProcessorFee.
  ///
  /// In en, this message translates to:
  /// **'Card fee'**
  String get adminProcessorFee;

  /// No description provided for @adminReceived.
  ///
  /// In en, this message translates to:
  /// **'Received'**
  String get adminReceived;

  /// No description provided for @adminTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get adminTotal;

  /// No description provided for @adminOrderPeople.
  ///
  /// In en, this message translates to:
  /// **'Student and class'**
  String get adminOrderPeople;

  /// No description provided for @adminClass.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get adminClass;

  /// No description provided for @adminOrderTrail.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get adminOrderTrail;

  /// No description provided for @adminMethod.
  ///
  /// In en, this message translates to:
  /// **'Method'**
  String get adminMethod;

  /// No description provided for @adminCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get adminCreated;

  /// No description provided for @adminPaidAt.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get adminPaidAt;

  /// No description provided for @adminVerifiedBy.
  ///
  /// In en, this message translates to:
  /// **'Verified by'**
  String get adminVerifiedBy;

  /// No description provided for @adminAppleRefundNote.
  ///
  /// In en, this message translates to:
  /// **'App Store purchases are refunded by Apple. The refund is recorded here when Apple tells us.'**
  String get adminAppleRefundNote;

  /// No description provided for @adminRefund.
  ///
  /// In en, this message translates to:
  /// **'Refund'**
  String get adminRefund;

  /// No description provided for @adminRefundTitle.
  ///
  /// In en, this message translates to:
  /// **'Refund this order'**
  String get adminRefundTitle;

  /// No description provided for @adminRefundSubtitle.
  ///
  /// In en, this message translates to:
  /// **'{reference} · up to {amount}'**
  String adminRefundSubtitle(String reference, String amount);

  /// No description provided for @adminRefundAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount to refund'**
  String get adminRefundAmount;

  /// No description provided for @adminRefundAmountHelper.
  ///
  /// In en, this message translates to:
  /// **'A partial refund keeps the student enrolled.'**
  String get adminRefundAmountHelper;

  /// No description provided for @adminRefundReasonHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Student asked to cancel before the class started'**
  String get adminRefundReasonHint;

  /// No description provided for @adminRefundBankNote.
  ///
  /// In en, this message translates to:
  /// **'This was a bank transfer: finance sends the money back by hand after you confirm.'**
  String get adminRefundBankNote;

  /// No description provided for @adminAmountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount above zero.'**
  String get adminAmountInvalid;

  /// No description provided for @adminRefundTooLarge.
  ///
  /// In en, this message translates to:
  /// **'You can refund up to {amount}.'**
  String adminRefundTooLarge(String amount);

  /// No description provided for @adminReasonRequired.
  ///
  /// In en, this message translates to:
  /// **'Add a short reason (3 characters or more).'**
  String get adminReasonRequired;

  /// No description provided for @adminRefundConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Refund {amount}?'**
  String adminRefundConfirmTitle(String amount);

  /// No description provided for @adminRefundConfirmFull.
  ///
  /// In en, this message translates to:
  /// **'This refunds the whole order. The student loses their seat and the teacher\'s earnings are adjusted. This can\'t be undone.'**
  String get adminRefundConfirmFull;

  /// No description provided for @adminRefundConfirmPartial.
  ///
  /// In en, this message translates to:
  /// **'The student keeps their seat. The teacher\'s earnings are adjusted. This can\'t be undone.'**
  String get adminRefundConfirmPartial;

  /// No description provided for @adminRefundDone.
  ///
  /// In en, this message translates to:
  /// **'Refunded {amount}.'**
  String adminRefundDone(String amount);

  /// No description provided for @adminRefundManualDone.
  ///
  /// In en, this message translates to:
  /// **'Refund of {amount} recorded. Finance will send the transfer.'**
  String adminRefundManualDone(String amount);

  /// No description provided for @adminPeopleTitle.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get adminPeopleTitle;

  /// No description provided for @adminSearchPeople.
  ///
  /// In en, this message translates to:
  /// **'Search people'**
  String get adminSearchPeople;

  /// No description provided for @adminSearchPeopleHint.
  ///
  /// In en, this message translates to:
  /// **'Name or email'**
  String get adminSearchPeopleHint;

  /// No description provided for @adminNoPeople.
  ///
  /// In en, this message translates to:
  /// **'No one matches'**
  String get adminNoPeople;

  /// No description provided for @adminPeopleCount.
  ///
  /// In en, this message translates to:
  /// **'{n} shown'**
  String adminPeopleCount(String n);

  /// No description provided for @adminBanned.
  ///
  /// In en, this message translates to:
  /// **'Banned'**
  String get adminBanned;

  /// No description provided for @adminInviteUser.
  ///
  /// In en, this message translates to:
  /// **'Invite someone'**
  String get adminInviteUser;

  /// No description provided for @adminInviteBody.
  ///
  /// In en, this message translates to:
  /// **'They get an email with a link to set their password.'**
  String get adminInviteBody;

  /// No description provided for @adminInviteSent.
  ///
  /// In en, this message translates to:
  /// **'Invite sent to {email}.'**
  String adminInviteSent(String email);

  /// No description provided for @adminSendInvite.
  ///
  /// In en, this message translates to:
  /// **'Send invite'**
  String get adminSendInvite;

  /// No description provided for @adminNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Lina Haddad'**
  String get adminNameHint;

  /// No description provided for @adminNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Add a name (2 characters or more).'**
  String get adminNameRequired;

  /// No description provided for @adminEmailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get adminEmailInvalid;

  /// No description provided for @adminRole.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get adminRole;

  /// No description provided for @adminEmailLanguage.
  ///
  /// In en, this message translates to:
  /// **'Email language'**
  String get adminEmailLanguage;

  /// No description provided for @adminLanguageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get adminLanguageEnglish;

  /// No description provided for @adminLanguageArabic.
  ///
  /// In en, this message translates to:
  /// **'Arabic'**
  String get adminLanguageArabic;

  /// No description provided for @adminAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get adminAccount;

  /// No description provided for @adminEmailVerified.
  ///
  /// In en, this message translates to:
  /// **'Email verified'**
  String get adminEmailVerified;

  /// No description provided for @adminYes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get adminYes;

  /// No description provided for @adminNo.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get adminNo;

  /// No description provided for @adminJoined.
  ///
  /// In en, this message translates to:
  /// **'Joined'**
  String get adminJoined;

  /// No description provided for @adminActiveEnrollments.
  ///
  /// In en, this message translates to:
  /// **'Active enrolments'**
  String get adminActiveEnrollments;

  /// No description provided for @adminTeachingBatches.
  ///
  /// In en, this message translates to:
  /// **'Classes taught'**
  String get adminTeachingBatches;

  /// No description provided for @adminCannotEditSelf.
  ///
  /// In en, this message translates to:
  /// **'You can\'t change your own role or ban yourself.'**
  String get adminCannotEditSelf;

  /// No description provided for @adminChangeRole.
  ///
  /// In en, this message translates to:
  /// **'Change role'**
  String get adminChangeRole;

  /// No description provided for @adminChangeRoleTitle.
  ///
  /// In en, this message translates to:
  /// **'Make {name} a {role}?'**
  String adminChangeRoleTitle(String name, String role);

  /// No description provided for @adminChangeRoleBody.
  ///
  /// In en, this message translates to:
  /// **'Their tabs and permissions change the next time they open the app.'**
  String get adminChangeRoleBody;

  /// No description provided for @adminChangeRoleAdminBody.
  ///
  /// In en, this message translates to:
  /// **'Admins can see every payment and account and change them. Only give this to people who run Azza.'**
  String get adminChangeRoleAdminBody;

  /// No description provided for @adminRoleChanged.
  ///
  /// In en, this message translates to:
  /// **'Role changed to {role}.'**
  String adminRoleChanged(String role);

  /// No description provided for @adminBan.
  ///
  /// In en, this message translates to:
  /// **'Ban account'**
  String get adminBan;

  /// No description provided for @adminUnban.
  ///
  /// In en, this message translates to:
  /// **'Lift ban'**
  String get adminUnban;

  /// No description provided for @adminBanTitle.
  ///
  /// In en, this message translates to:
  /// **'Ban {name}?'**
  String adminBanTitle(String name);

  /// No description provided for @adminUnbanTitle.
  ///
  /// In en, this message translates to:
  /// **'Lift the ban on {name}?'**
  String adminUnbanTitle(String name);

  /// No description provided for @adminBanBody.
  ///
  /// In en, this message translates to:
  /// **'They are signed out everywhere and can\'t sign in until you lift the ban.'**
  String get adminBanBody;

  /// No description provided for @adminUnbanBody.
  ///
  /// In en, this message translates to:
  /// **'They can sign in again straight away.'**
  String get adminUnbanBody;

  /// No description provided for @adminBannedDone.
  ///
  /// In en, this message translates to:
  /// **'Account banned.'**
  String get adminBannedDone;

  /// No description provided for @adminUnbannedDone.
  ///
  /// In en, this message translates to:
  /// **'Ban lifted.'**
  String get adminUnbannedDone;

  /// No description provided for @adminPublicProfile.
  ///
  /// In en, this message translates to:
  /// **'Public teacher profile'**
  String get adminPublicProfile;

  /// No description provided for @adminHeadline.
  ///
  /// In en, this message translates to:
  /// **'Headline'**
  String get adminHeadline;

  /// No description provided for @adminHeadlineHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Data analyst teaching Excel and SQL'**
  String get adminHeadlineHint;

  /// No description provided for @adminBio.
  ///
  /// In en, this message translates to:
  /// **'Bio'**
  String get adminBio;

  /// No description provided for @adminBioHint.
  ///
  /// In en, this message translates to:
  /// **'What they do, who they help, and how they teach'**
  String get adminBioHint;

  /// No description provided for @adminProfileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved.'**
  String get adminProfileSaved;

  /// No description provided for @adminMarkPaid.
  ///
  /// In en, this message translates to:
  /// **'Mark as paid'**
  String get adminMarkPaid;

  /// No description provided for @adminMarkPaidBody.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} teacher} other{{count} teachers}} · {total}. Add the bank\'s reference for the transfer.'**
  String adminMarkPaidBody(int count, String total);

  /// No description provided for @adminTransferRef.
  ///
  /// In en, this message translates to:
  /// **'Transfer reference'**
  String get adminTransferRef;

  /// No description provided for @adminTransferRefHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. ENBD-2026-11-05'**
  String get adminTransferRefHint;

  /// No description provided for @adminTransferRefRequired.
  ///
  /// In en, this message translates to:
  /// **'Add the transfer reference (3 characters or more).'**
  String get adminTransferRefRequired;

  /// No description provided for @adminMarkPaidConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Mark {total} as paid?'**
  String adminMarkPaidConfirmTitle(String total);

  /// No description provided for @adminMarkPaidConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Teachers are emailed that their payout is on the way. Held and carried-over amounts roll into next month.'**
  String get adminMarkPaidConfirmBody;

  /// No description provided for @adminRunMarkedPaid.
  ///
  /// In en, this message translates to:
  /// **'Payout run marked as paid.'**
  String get adminRunMarkedPaid;

  /// No description provided for @adminAdjustHint.
  ///
  /// In en, this message translates to:
  /// **'Tap a teacher to add a bonus or a deduction before you approve.'**
  String get adminAdjustHint;

  /// No description provided for @adminAdjustTitle.
  ///
  /// In en, this message translates to:
  /// **'Adjust {name}'**
  String adminAdjustTitle(String name);

  /// No description provided for @adminAdjustSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Currently {amount}'**
  String adminAdjustSubtitle(String amount);

  /// No description provided for @adminBonus.
  ///
  /// In en, this message translates to:
  /// **'Bonus'**
  String get adminBonus;

  /// No description provided for @adminDeduction.
  ///
  /// In en, this message translates to:
  /// **'Deduction'**
  String get adminDeduction;

  /// No description provided for @adminAdjustAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get adminAdjustAmount;

  /// No description provided for @adminAdjustReasonHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Extra catch-up session on 12 Nov'**
  String get adminAdjustReasonHint;

  /// No description provided for @adminSaveAdjustment.
  ///
  /// In en, this message translates to:
  /// **'Save adjustment'**
  String get adminSaveAdjustment;

  /// No description provided for @adminAdjustmentSaved.
  ///
  /// In en, this message translates to:
  /// **'Adjustment saved.'**
  String get adminAdjustmentSaved;

  /// No description provided for @adminVerifyBank.
  ///
  /// In en, this message translates to:
  /// **'Verify bank details'**
  String get adminVerifyBank;

  /// No description provided for @adminVerifyBankTitle.
  ///
  /// In en, this message translates to:
  /// **'Verify {name}\'s bank details?'**
  String adminVerifyBankTitle(String name);

  /// No description provided for @adminVerifyBankBody.
  ///
  /// In en, this message translates to:
  /// **'{bank}\n{holder}\n{iban}\n\nCheck these match the teacher\'s documents. Their held payouts are released.'**
  String adminVerifyBankBody(String bank, String holder, String iban);

  /// No description provided for @adminBankVerified.
  ///
  /// In en, this message translates to:
  /// **'{name}\'s bank details are verified.'**
  String adminBankVerified(String name);

  /// No description provided for @adminCoursesTitle.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get adminCoursesTitle;

  /// No description provided for @adminNoCourses.
  ///
  /// In en, this message translates to:
  /// **'No courses here'**
  String get adminNoCourses;

  /// No description provided for @adminFromPrice.
  ///
  /// In en, this message translates to:
  /// **'from {price}'**
  String adminFromPrice(String price);

  /// No description provided for @adminFeaturedAt.
  ///
  /// In en, this message translates to:
  /// **'featured #{rank}'**
  String adminFeaturedAt(String rank);

  /// No description provided for @adminCourseVisibility.
  ///
  /// In en, this message translates to:
  /// **'Status and visibility'**
  String get adminCourseVisibility;

  /// No description provided for @adminCourseStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get adminCourseStatus;

  /// No description provided for @adminCourseStatusHelper.
  ///
  /// In en, this message translates to:
  /// **'Published courses show in the catalog. Archived ones are hidden.'**
  String get adminCourseStatusHelper;

  /// No description provided for @adminFeaturedRank.
  ///
  /// In en, this message translates to:
  /// **'Featured rank'**
  String get adminFeaturedRank;

  /// No description provided for @adminFeaturedRankHint.
  ///
  /// In en, this message translates to:
  /// **'Leave empty to keep it off the rail'**
  String get adminFeaturedRankHint;

  /// No description provided for @adminFeaturedRankHelper.
  ///
  /// In en, this message translates to:
  /// **'0–999. Lower numbers come first on the home rail.'**
  String get adminFeaturedRankHelper;

  /// No description provided for @adminFeaturedRankInvalid.
  ///
  /// In en, this message translates to:
  /// **'Featured rank must be a whole number from 0 to 999.'**
  String get adminFeaturedRankInvalid;

  /// No description provided for @adminLastReviewNote.
  ///
  /// In en, this message translates to:
  /// **'Last review note: {note}'**
  String adminLastReviewNote(String note);

  /// No description provided for @adminPublish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get adminPublish;

  /// No description provided for @adminCoursePublished.
  ///
  /// In en, this message translates to:
  /// **'Course published. It\'s in the catalog now.'**
  String get adminCoursePublished;

  /// No description provided for @adminCourseSaved.
  ///
  /// In en, this message translates to:
  /// **'Course saved.'**
  String get adminCourseSaved;

  /// No description provided for @adminPickTeacher.
  ///
  /// In en, this message translates to:
  /// **'Pick the teacher'**
  String get adminPickTeacher;

  /// No description provided for @adminBatchDraftBody.
  ///
  /// In en, this message translates to:
  /// **'Saved as a draft. Open enrolment when it\'s ready for students.'**
  String get adminBatchDraftBody;

  /// No description provided for @adminBatchOpenBody.
  ///
  /// In en, this message translates to:
  /// **'Enrolment is open. Students can book a seat.'**
  String get adminBatchOpenBody;

  /// No description provided for @adminOpenEnrolment.
  ///
  /// In en, this message translates to:
  /// **'Open enrolment'**
  String get adminOpenEnrolment;

  /// No description provided for @adminEnrolmentOpened.
  ///
  /// In en, this message translates to:
  /// **'Enrolment is open.'**
  String get adminEnrolmentOpened;

  /// No description provided for @adminBatchTools.
  ///
  /// In en, this message translates to:
  /// **'Admin tools'**
  String get adminBatchTools;

  /// No description provided for @adminShiftSchedule.
  ///
  /// In en, this message translates to:
  /// **'Shift schedule'**
  String get adminShiftSchedule;

  /// No description provided for @adminShiftBody.
  ///
  /// In en, this message translates to:
  /// **'Moves every scheduled session from the one you pick, keeping the same time of day. Students are told.'**
  String get adminShiftBody;

  /// No description provided for @adminShiftFrom.
  ///
  /// In en, this message translates to:
  /// **'From session'**
  String get adminShiftFrom;

  /// No description provided for @adminShiftDays.
  ///
  /// In en, this message translates to:
  /// **'Days to move'**
  String get adminShiftDays;

  /// No description provided for @adminShiftDaysHelper.
  ///
  /// In en, this message translates to:
  /// **'Negative moves earlier, positive moves later (−60 to 60).'**
  String get adminShiftDaysHelper;

  /// No description provided for @adminShiftZero.
  ///
  /// In en, this message translates to:
  /// **'Pick a number of days other than 0.'**
  String get adminShiftZero;

  /// No description provided for @adminShiftConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Shift {code}\'s schedule?'**
  String adminShiftConfirmTitle(String code);

  /// No description provided for @adminShiftConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'{sessions, plural, one{{sessions} session moves by {days} days.} other{{sessions} sessions move by {days} days.}} Students get a notification.'**
  String adminShiftConfirmBody(int sessions, String days);

  /// No description provided for @adminScheduleShifted.
  ///
  /// In en, this message translates to:
  /// **'Schedule shifted. Students have been told.'**
  String get adminScheduleShifted;

  /// No description provided for @adminAttendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get adminAttendance;

  /// No description provided for @adminEnrollments.
  ///
  /// In en, this message translates to:
  /// **'Enrolments'**
  String get adminEnrollments;

  /// No description provided for @adminNoEnrollments.
  ///
  /// In en, this message translates to:
  /// **'No one has enrolled yet.'**
  String get adminNoEnrollments;

  /// No description provided for @adminEnrollmentSummary.
  ///
  /// In en, this message translates to:
  /// **'{active} active of {total}'**
  String adminEnrollmentSummary(String active, String total);

  /// No description provided for @adminEnrolPending.
  ///
  /// In en, this message translates to:
  /// **'Awaiting payment'**
  String get adminEnrolPending;

  /// No description provided for @adminEnrolAwaitingTransfer.
  ///
  /// In en, this message translates to:
  /// **'Awaiting transfer'**
  String get adminEnrolAwaitingTransfer;

  /// No description provided for @adminEnrolActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get adminEnrolActive;

  /// No description provided for @adminEnrolCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get adminEnrolCancelled;

  /// No description provided for @adminCouponsTitle.
  ///
  /// In en, this message translates to:
  /// **'Coupons'**
  String get adminCouponsTitle;

  /// No description provided for @adminNewCoupon.
  ///
  /// In en, this message translates to:
  /// **'New coupon'**
  String get adminNewCoupon;

  /// No description provided for @adminNoCoupons.
  ///
  /// In en, this message translates to:
  /// **'No coupons yet'**
  String get adminNoCoupons;

  /// No description provided for @adminNoCouponsBody.
  ///
  /// In en, this message translates to:
  /// **'Create a code for a launch, a partner or a season.'**
  String get adminNoCouponsBody;

  /// No description provided for @adminCouponActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get adminCouponActive;

  /// No description provided for @adminCouponScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get adminCouponScheduled;

  /// No description provided for @adminCouponExpired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get adminCouponExpired;

  /// No description provided for @adminCouponPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get adminCouponPaused;

  /// No description provided for @adminCouponExhausted.
  ///
  /// In en, this message translates to:
  /// **'Used up'**
  String get adminCouponExhausted;

  /// No description provided for @adminPercentOff.
  ///
  /// In en, this message translates to:
  /// **'{n}% off'**
  String adminPercentOff(String n);

  /// No description provided for @adminAmountOff.
  ///
  /// In en, this message translates to:
  /// **'{amount} off'**
  String adminAmountOff(String amount);

  /// No description provided for @adminAllCourses.
  ///
  /// In en, this message translates to:
  /// **'All courses'**
  String get adminAllCourses;

  /// No description provided for @adminUntil.
  ///
  /// In en, this message translates to:
  /// **'until {date}'**
  String adminUntil(String date);

  /// No description provided for @adminUsedCount.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, =0{Not used yet} one{Used once} other{Used {n} times}}'**
  String adminUsedCount(int n);

  /// No description provided for @adminUsedOf.
  ///
  /// In en, this message translates to:
  /// **'Used {n} of {max}'**
  String adminUsedOf(String n, String max);

  /// No description provided for @adminUsage.
  ///
  /// In en, this message translates to:
  /// **'Usage'**
  String get adminUsage;

  /// No description provided for @adminCouponCodeSection.
  ///
  /// In en, this message translates to:
  /// **'Code and discount'**
  String get adminCouponCodeSection;

  /// No description provided for @adminCouponCode.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get adminCouponCode;

  /// No description provided for @adminCouponCodeHelper.
  ///
  /// In en, this message translates to:
  /// **'3–20 capital letters, numbers or dashes. It can\'t change later.'**
  String get adminCouponCodeHelper;

  /// No description provided for @adminCouponCodeFixed.
  ///
  /// In en, this message translates to:
  /// **'The code can\'t change once created.'**
  String get adminCouponCodeFixed;

  /// No description provided for @adminCouponCodeInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use 3–20 capital letters, numbers or dashes.'**
  String get adminCouponCodeInvalid;

  /// No description provided for @adminPercent.
  ///
  /// In en, this message translates to:
  /// **'Percent'**
  String get adminPercent;

  /// No description provided for @adminFixedAmount.
  ///
  /// In en, this message translates to:
  /// **'Fixed amount'**
  String get adminFixedAmount;

  /// No description provided for @adminPercentOffLabel.
  ///
  /// In en, this message translates to:
  /// **'Percent off'**
  String get adminPercentOffLabel;

  /// No description provided for @adminAmountOffLabel.
  ///
  /// In en, this message translates to:
  /// **'Amount off'**
  String get adminAmountOffLabel;

  /// No description provided for @adminPercentInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a percent from 1 to 100.'**
  String get adminPercentInvalid;

  /// No description provided for @adminCouponLimits.
  ///
  /// In en, this message translates to:
  /// **'Limits'**
  String get adminCouponLimits;

  /// No description provided for @adminMaxRedemptions.
  ///
  /// In en, this message translates to:
  /// **'Total uses'**
  String get adminMaxRedemptions;

  /// No description provided for @adminPerUserLimit.
  ///
  /// In en, this message translates to:
  /// **'Uses per student'**
  String get adminPerUserLimit;

  /// No description provided for @adminMinOrder.
  ///
  /// In en, this message translates to:
  /// **'Minimum order'**
  String get adminMinOrder;

  /// No description provided for @adminUnlimited.
  ///
  /// In en, this message translates to:
  /// **'Unlimited'**
  String get adminUnlimited;

  /// No description provided for @adminNoMinimum.
  ///
  /// In en, this message translates to:
  /// **'No minimum'**
  String get adminNoMinimum;

  /// No description provided for @adminCouponWhen.
  ///
  /// In en, this message translates to:
  /// **'When and where'**
  String get adminCouponWhen;

  /// No description provided for @adminStartsOn.
  ///
  /// In en, this message translates to:
  /// **'Valid from'**
  String get adminStartsOn;

  /// No description provided for @adminExpiresOn.
  ///
  /// In en, this message translates to:
  /// **'Valid through'**
  String get adminExpiresOn;

  /// No description provided for @adminNoDate.
  ///
  /// In en, this message translates to:
  /// **'No date'**
  String get adminNoDate;

  /// No description provided for @adminDatesInvalid.
  ///
  /// In en, this message translates to:
  /// **'The end date must be on or after the start date.'**
  String get adminDatesInvalid;

  /// No description provided for @adminCouponScope.
  ///
  /// In en, this message translates to:
  /// **'Applies to'**
  String get adminCouponScope;

  /// No description provided for @adminCouponScopeHelper.
  ///
  /// In en, this message translates to:
  /// **'One course, or every course.'**
  String get adminCouponScopeHelper;

  /// No description provided for @adminCouponActiveSwitch.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get adminCouponActiveSwitch;

  /// No description provided for @adminCouponActiveHelper.
  ///
  /// In en, this message translates to:
  /// **'Turn off to pause the code at checkout.'**
  String get adminCouponActiveHelper;

  /// No description provided for @adminCreateCoupon.
  ///
  /// In en, this message translates to:
  /// **'Create coupon'**
  String get adminCreateCoupon;

  /// No description provided for @adminCouponCreated.
  ///
  /// In en, this message translates to:
  /// **'{code} is ready to use.'**
  String adminCouponCreated(String code);

  /// No description provided for @adminCouponSaved.
  ///
  /// In en, this message translates to:
  /// **'Coupon saved.'**
  String get adminCouponSaved;

  /// No description provided for @adminTotalDiscount.
  ///
  /// In en, this message translates to:
  /// **'Total discount given'**
  String get adminTotalDiscount;

  /// No description provided for @adminNoRedemptions.
  ///
  /// In en, this message translates to:
  /// **'No one has used this code yet.'**
  String get adminNoRedemptions;

  /// No description provided for @adminCategoriesTitle.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get adminCategoriesTitle;

  /// No description provided for @adminNewCategory.
  ///
  /// In en, this message translates to:
  /// **'New category'**
  String get adminNewCategory;

  /// No description provided for @adminEditCategory.
  ///
  /// In en, this message translates to:
  /// **'Edit category'**
  String get adminEditCategory;

  /// No description provided for @adminNoCategories.
  ///
  /// In en, this message translates to:
  /// **'No categories yet'**
  String get adminNoCategories;

  /// No description provided for @adminCourseCount.
  ///
  /// In en, this message translates to:
  /// **'{n, plural, one{{n} course} other{{n} courses}}'**
  String adminCourseCount(int n);

  /// No description provided for @adminHidden.
  ///
  /// In en, this message translates to:
  /// **'hidden'**
  String get adminHidden;

  /// No description provided for @adminHide.
  ///
  /// In en, this message translates to:
  /// **'Hide from the catalog'**
  String get adminHide;

  /// No description provided for @adminShow.
  ///
  /// In en, this message translates to:
  /// **'Show in the catalog'**
  String get adminShow;

  /// No description provided for @adminDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get adminDelete;

  /// No description provided for @adminDeleteCategoryTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete {name}?'**
  String adminDeleteCategoryTitle(String name);

  /// No description provided for @adminDeleteCategoryBody.
  ///
  /// In en, this message translates to:
  /// **'This removes the category for good. It can\'t be undone.'**
  String get adminDeleteCategoryBody;

  /// No description provided for @adminCategoryDeleted.
  ///
  /// In en, this message translates to:
  /// **'{name} deleted.'**
  String adminCategoryDeleted(String name);

  /// No description provided for @adminCategoryInUseTitle.
  ///
  /// In en, this message translates to:
  /// **'This category still has courses'**
  String get adminCategoryInUseTitle;

  /// No description provided for @adminCategoryInUseBody.
  ///
  /// In en, this message translates to:
  /// **'Move the courses in {name} to another category first, or hide it so students stop seeing it.'**
  String adminCategoryInUseBody(String name);

  /// No description provided for @adminHideInstead.
  ///
  /// In en, this message translates to:
  /// **'Hide it instead'**
  String get adminHideInstead;

  /// No description provided for @adminCategoryHidden.
  ///
  /// In en, this message translates to:
  /// **'Category hidden.'**
  String get adminCategoryHidden;

  /// No description provided for @adminCategoryShown.
  ///
  /// In en, this message translates to:
  /// **'Category is visible again.'**
  String get adminCategoryShown;

  /// No description provided for @adminCategorySaved.
  ///
  /// In en, this message translates to:
  /// **'Category saved.'**
  String get adminCategorySaved;

  /// No description provided for @adminSlug.
  ///
  /// In en, this message translates to:
  /// **'Slug'**
  String get adminSlug;

  /// No description provided for @adminSlugHelper.
  ///
  /// In en, this message translates to:
  /// **'Lowercase letters, numbers and dashes. Used in links; it can\'t change later.'**
  String get adminSlugHelper;

  /// No description provided for @adminSlugFixed.
  ///
  /// In en, this message translates to:
  /// **'The slug can\'t change once created.'**
  String get adminSlugFixed;

  /// No description provided for @adminSlugInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use 2–40 lowercase letters, numbers or dashes.'**
  String get adminSlugInvalid;

  /// No description provided for @adminNameEn.
  ///
  /// In en, this message translates to:
  /// **'Name in English'**
  String get adminNameEn;

  /// No description provided for @adminNameAr.
  ///
  /// In en, this message translates to:
  /// **'Name in Arabic'**
  String get adminNameAr;

  /// No description provided for @adminOrder.
  ///
  /// In en, this message translates to:
  /// **'Order'**
  String get adminOrder;

  /// No description provided for @adminOrderHelper.
  ///
  /// In en, this message translates to:
  /// **'Lower numbers come first.'**
  String get adminOrderHelper;

  /// No description provided for @adminVisibleInCatalog.
  ///
  /// In en, this message translates to:
  /// **'Visible in the catalog'**
  String get adminVisibleInCatalog;

  /// No description provided for @adminReportsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get adminReportsTitle;

  /// No description provided for @adminLastDays.
  ///
  /// In en, this message translates to:
  /// **'Last {n, plural, one{{n} day} other{{n} days}}'**
  String adminLastDays(int n);

  /// No description provided for @adminVsPrevious.
  ///
  /// In en, this message translates to:
  /// **'vs the period before'**
  String get adminVsPrevious;

  /// No description provided for @adminRevenue.
  ///
  /// In en, this message translates to:
  /// **'Revenue'**
  String get adminRevenue;

  /// No description provided for @adminNewEnrollments.
  ///
  /// In en, this message translates to:
  /// **'New enrolments'**
  String get adminNewEnrollments;

  /// No description provided for @adminCompletion.
  ///
  /// In en, this message translates to:
  /// **'Completion'**
  String get adminCompletion;

  /// No description provided for @adminRefunds.
  ///
  /// In en, this message translates to:
  /// **'Refunds'**
  String get adminRefunds;

  /// No description provided for @adminRevenueByCourse.
  ///
  /// In en, this message translates to:
  /// **'Revenue by course'**
  String get adminRevenueByCourse;

  /// No description provided for @adminTeachersReport.
  ///
  /// In en, this message translates to:
  /// **'Teachers'**
  String get adminTeachersReport;

  /// No description provided for @adminTeacherStats.
  ///
  /// In en, this message translates to:
  /// **'{sessions, plural, one{{sessions} session} other{{sessions} sessions}} · {attendance} attendance · {onTime} on time'**
  String adminTeacherStats(int sessions, String attendance, String onTime);

  /// No description provided for @adminBankAccountsTitle.
  ///
  /// In en, this message translates to:
  /// **'Bank accounts'**
  String get adminBankAccountsTitle;

  /// No description provided for @adminNewBankAccount.
  ///
  /// In en, this message translates to:
  /// **'New bank account'**
  String get adminNewBankAccount;

  /// No description provided for @adminEditBankAccount.
  ///
  /// In en, this message translates to:
  /// **'Edit bank account'**
  String get adminEditBankAccount;

  /// No description provided for @adminNoBankAccounts.
  ///
  /// In en, this message translates to:
  /// **'No bank accounts yet'**
  String get adminNoBankAccounts;

  /// No description provided for @adminBankAccountSaved.
  ///
  /// In en, this message translates to:
  /// **'Bank account saved.'**
  String get adminBankAccountSaved;

  /// No description provided for @adminActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get adminActive;

  /// No description provided for @adminInactive.
  ///
  /// In en, this message translates to:
  /// **'Hidden'**
  String get adminInactive;

  /// No description provided for @adminBankName.
  ///
  /// In en, this message translates to:
  /// **'Bank'**
  String get adminBankName;

  /// No description provided for @adminAccountName.
  ///
  /// In en, this message translates to:
  /// **'Account name'**
  String get adminAccountName;

  /// No description provided for @adminBranch.
  ///
  /// In en, this message translates to:
  /// **'Branch'**
  String get adminBranch;

  /// No description provided for @adminOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get adminOptional;

  /// No description provided for @adminInstructions.
  ///
  /// In en, this message translates to:
  /// **'Instructions for students'**
  String get adminInstructions;

  /// No description provided for @adminInstructionsHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Put the order reference in the transfer note'**
  String get adminInstructionsHint;

  /// No description provided for @adminShowAtCheckout.
  ///
  /// In en, this message translates to:
  /// **'Show at checkout'**
  String get adminShowAtCheckout;

  /// No description provided for @adminIbanInvalid.
  ///
  /// In en, this message translates to:
  /// **'A UAE IBAN is AE followed by 21 digits.'**
  String get adminIbanInvalid;

  /// No description provided for @adminSwiftInvalid.
  ///
  /// In en, this message translates to:
  /// **'SWIFT is 8 or 11 letters and numbers.'**
  String get adminSwiftInvalid;

  /// No description provided for @adminCurrenciesTitle.
  ///
  /// In en, this message translates to:
  /// **'Currencies'**
  String get adminCurrenciesTitle;

  /// No description provided for @adminCurrenciesBody.
  ///
  /// In en, this message translates to:
  /// **'Money always moves in AED. These rates only change the approximate prices students see.'**
  String get adminCurrenciesBody;

  /// No description provided for @adminRatesUpdated.
  ///
  /// In en, this message translates to:
  /// **'Updated {when}'**
  String adminRatesUpdated(String when);

  /// No description provided for @adminFxRates.
  ///
  /// In en, this message translates to:
  /// **'Rates per 1 AED'**
  String get adminFxRates;

  /// No description provided for @adminRateLabel.
  ///
  /// In en, this message translates to:
  /// **'{currency} per AED'**
  String adminRateLabel(String currency);

  /// No description provided for @adminRateHelper.
  ///
  /// In en, this message translates to:
  /// **'How many {currency} one dirham buys'**
  String adminRateHelper(String currency);

  /// No description provided for @adminRateInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a rate above zero.'**
  String get adminRateInvalid;

  /// No description provided for @adminRateSaved.
  ///
  /// In en, this message translates to:
  /// **'{currency} rate saved.'**
  String adminRateSaved(String currency);

  /// No description provided for @progressMarkComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark as complete'**
  String get progressMarkComplete;

  /// No description provided for @progressCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get progressCompleted;

  /// No description provided for @progressUndoHint.
  ///
  /// In en, this message translates to:
  /// **'Tap to mark it as not done'**
  String get progressUndoHint;

  /// No description provided for @progressLessonsOf.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total, plural, one{{total} lesson} other{{total} lessons}}'**
  String progressLessonsOf(int done, int total);

  /// No description provided for @progressResume.
  ///
  /// In en, this message translates to:
  /// **'Resume: {lesson}'**
  String progressResume(String lesson);

  /// No description provided for @progressStart.
  ///
  /// In en, this message translates to:
  /// **'Start: {lesson}'**
  String progressStart(String lesson);

  /// No description provided for @progressAllDone.
  ///
  /// In en, this message translates to:
  /// **'All lessons done'**
  String get progressAllDone;

  /// No description provided for @progressAllDoneBody.
  ///
  /// In en, this message translates to:
  /// **'Revisit any lesson, or practise what you learned.'**
  String get progressAllDoneBody;

  /// No description provided for @progressSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Your progress wasn\'t saved. Try again.'**
  String get progressSaveFailed;

  /// No description provided for @guestBrowseCourses.
  ///
  /// In en, this message translates to:
  /// **'Browse courses'**
  String get guestBrowseCourses;

  /// No description provided for @guestResumeNotice.
  ///
  /// In en, this message translates to:
  /// **'Sign in and we\'ll bring you right back.'**
  String get guestResumeNotice;

  /// No description provided for @guestPromptTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue'**
  String get guestPromptTitle;

  /// No description provided for @guestPromptBody.
  ///
  /// In en, this message translates to:
  /// **'Sign in or create an account to do this.'**
  String get guestPromptBody;

  /// No description provided for @guestHomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Your learning, in one place'**
  String get guestHomeTitle;

  /// No description provided for @guestHomeBody.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your next lesson, the practice that\'s due and your live sessions.'**
  String get guestHomeBody;

  /// No description provided for @guestScheduleTitle.
  ///
  /// In en, this message translates to:
  /// **'Your week of learning'**
  String get guestScheduleTitle;

  /// No description provided for @guestScheduleBody.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your live sessions and add them to your calendar.'**
  String get guestScheduleBody;

  /// No description provided for @guestLibraryTitle.
  ///
  /// In en, this message translates to:
  /// **'Your lessons and recordings'**
  String get guestLibraryTitle;

  /// No description provided for @guestLibraryBody.
  ///
  /// In en, this message translates to:
  /// **'Sign in to open your lessons, session recordings and class materials.'**
  String get guestLibraryBody;

  /// No description provided for @guestMeTitle.
  ///
  /// In en, this message translates to:
  /// **'Make it yours'**
  String get guestMeTitle;

  /// No description provided for @guestMeBody.
  ///
  /// In en, this message translates to:
  /// **'Create an account to save courses, join a class and earn a certificate.'**
  String get guestMeBody;

  /// No description provided for @guestReviewCta.
  ///
  /// In en, this message translates to:
  /// **'Sign in to write a review'**
  String get guestReviewCta;

  /// No description provided for @guestTeachCta.
  ///
  /// In en, this message translates to:
  /// **'Create an account to apply'**
  String get guestTeachCta;

  /// No description provided for @guestTeachBody.
  ///
  /// In en, this message translates to:
  /// **'Applications are tied to your account, so we can reach you and set up your teaching tools once you\'re approved.'**
  String get guestTeachBody;

  /// No description provided for @guestVerifyTitle.
  ///
  /// In en, this message translates to:
  /// **'Verify a certificate'**
  String get guestVerifyTitle;

  /// No description provided for @guestVerifyValid.
  ///
  /// In en, this message translates to:
  /// **'Certificate verified'**
  String get guestVerifyValid;

  /// No description provided for @guestVerifyValidBody.
  ///
  /// In en, this message translates to:
  /// **'Azza issued this certificate to {name} for completing {course}.'**
  String guestVerifyValidBody(String name, String course);

  /// No description provided for @guestVerifyInvalid.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t verify this certificate'**
  String get guestVerifyInvalid;

  /// No description provided for @guestVerifyInvalidBody.
  ///
  /// In en, this message translates to:
  /// **'Check the code and try again. Codes look like AZ-CERT-7Q4K.'**
  String get guestVerifyInvalidBody;

  /// No description provided for @guestVerifyLearnCta.
  ///
  /// In en, this message translates to:
  /// **'Learn with Azza'**
  String get guestVerifyLearnCta;

  /// No description provided for @courseTypeRecorded.
  ///
  /// In en, this message translates to:
  /// **'Recorded'**
  String get courseTypeRecorded;

  /// No description provided for @filterFormat.
  ///
  /// In en, this message translates to:
  /// **'Format'**
  String get filterFormat;

  /// No description provided for @formatLive.
  ///
  /// In en, this message translates to:
  /// **'Live classes'**
  String get formatLive;

  /// No description provided for @formatRecorded.
  ///
  /// In en, this message translates to:
  /// **'Recorded lessons'**
  String get formatRecorded;

  /// No description provided for @pricePerMonth.
  ///
  /// In en, this message translates to:
  /// **'{price} / month'**
  String pricePerMonth(String price);

  /// No description provided for @pricePerYear.
  ///
  /// In en, this message translates to:
  /// **'{price} / year'**
  String pricePerYear(String price);

  /// No description provided for @fromPricePerMonth.
  ///
  /// In en, this message translates to:
  /// **'From {price} / month'**
  String fromPricePerMonth(String price);

  /// No description provided for @planTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose your plan'**
  String get planTitle;

  /// No description provided for @planIntro.
  ///
  /// In en, this message translates to:
  /// **'Start any time. Learn at your pace.'**
  String get planIntro;

  /// No description provided for @planMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get planMonthly;

  /// No description provided for @planYearly.
  ///
  /// In en, this message translates to:
  /// **'Yearly'**
  String get planYearly;

  /// No description provided for @planYearlyDetail.
  ///
  /// In en, this message translates to:
  /// **'{price} / month, billed yearly'**
  String planYearlyDetail(String price);

  /// No description provided for @planSaveMonths.
  ///
  /// In en, this message translates to:
  /// **'Save {n, plural, one{{n} month} other{{n} months}}'**
  String planSaveMonths(int n);

  /// No description provided for @planYouGet.
  ///
  /// In en, this message translates to:
  /// **'What you get'**
  String get planYouGet;

  /// No description provided for @planGetLessons.
  ///
  /// In en, this message translates to:
  /// **'All lessons and quizzes'**
  String get planGetLessons;

  /// No description provided for @planGetCertificate.
  ///
  /// In en, this message translates to:
  /// **'A certificate when you finish'**
  String get planGetCertificate;

  /// No description provided for @planGetCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel any time'**
  String get planGetCancel;

  /// No description provided for @planCancelLine.
  ///
  /// In en, this message translates to:
  /// **'Cancel any time. You keep access until the end of the period you paid for.'**
  String get planCancelLine;

  /// No description provided for @planNextCharge.
  ///
  /// In en, this message translates to:
  /// **'Next charge on {date}'**
  String planNextCharge(String date);

  /// No description provided for @planPaidUntil.
  ///
  /// In en, this message translates to:
  /// **'You\'re covered until {date}. This plan doesn\'t renew by itself.'**
  String planPaidUntil(String date);

  /// No description provided for @planPaidUntilShort.
  ///
  /// In en, this message translates to:
  /// **'Paid until {date}'**
  String planPaidUntilShort(String date);

  /// No description provided for @planRenews.
  ///
  /// In en, this message translates to:
  /// **'Renews {date}'**
  String planRenews(String date);

  /// No description provided for @planEnds.
  ///
  /// In en, this message translates to:
  /// **'Ends {date}'**
  String planEnds(String date);

  /// No description provided for @planYourPlan.
  ///
  /// In en, this message translates to:
  /// **'Your plan'**
  String get planYourPlan;

  /// No description provided for @planEnded.
  ///
  /// In en, this message translates to:
  /// **'Your plan has ended. Your progress is saved.'**
  String get planEnded;

  /// No description provided for @planTransferNote.
  ///
  /// In en, this message translates to:
  /// **'Pay by bank transfer. Your access starts once we confirm it, usually within 1 working day.'**
  String get planTransferNote;

  /// No description provided for @planStart.
  ///
  /// In en, this message translates to:
  /// **'Start learning'**
  String get planStart;

  /// No description provided for @planWebsiteOnly.
  ///
  /// In en, this message translates to:
  /// **'Available on our website for now'**
  String get planWebsiteOnly;

  /// No description provided for @planWebsiteOnlyBody.
  ///
  /// In en, this message translates to:
  /// **'Open our website in your browser to start this plan.'**
  String get planWebsiteOnlyBody;

  /// No description provided for @planAppleNote.
  ///
  /// In en, this message translates to:
  /// **'Payment is handled by Apple. Manage or cancel in your App Store subscriptions.'**
  String get planAppleNote;

  /// No description provided for @planWatchFree.
  ///
  /// In en, this message translates to:
  /// **'Watch the free lesson'**
  String get planWatchFree;

  /// No description provided for @planVatNote.
  ///
  /// In en, this message translates to:
  /// **'Prices are before VAT. Any VAT is added at checkout.'**
  String get planVatNote;

  /// No description provided for @planFreeLesson.
  ///
  /// In en, this message translates to:
  /// **'Free lesson'**
  String get planFreeLesson;

  /// No description provided for @planTransferBefore.
  ///
  /// In en, this message translates to:
  /// **'Send it before {date}.'**
  String planTransferBefore(String date);

  /// No description provided for @planReceiptSent.
  ///
  /// In en, this message translates to:
  /// **'We\'ve got your receipt'**
  String get planReceiptSent;

  /// No description provided for @planReceiptSentBody.
  ///
  /// In en, this message translates to:
  /// **'We\'ll confirm your transfer, usually within 1 working day. Your plan starts then.'**
  String get planReceiptSentBody;

  /// No description provided for @planBackToCourse.
  ///
  /// In en, this message translates to:
  /// **'Back to the course'**
  String get planBackToCourse;

  /// No description provided for @returnSettingUp.
  ///
  /// In en, this message translates to:
  /// **'Setting up your access…'**
  String get returnSettingUp;

  /// No description provided for @returnSettingUpBody.
  ///
  /// In en, this message translates to:
  /// **'This usually takes a few seconds.'**
  String get returnSettingUpBody;

  /// No description provided for @returnSlowTitle.
  ///
  /// In en, this message translates to:
  /// **'This is taking longer than usual'**
  String get returnSlowTitle;

  /// No description provided for @returnSlowBody.
  ///
  /// In en, this message translates to:
  /// **'Your payment is safe. Your access will appear as soon as it\'s confirmed.'**
  String get returnSlowBody;

  /// No description provided for @returnCheckAgain.
  ///
  /// In en, this message translates to:
  /// **'Check again'**
  String get returnCheckAgain;

  /// No description provided for @returnHome.
  ///
  /// In en, this message translates to:
  /// **'Go to home'**
  String get returnHome;

  /// No description provided for @lessonLocked.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get lessonLocked;

  /// No description provided for @lessonLockedBody.
  ///
  /// In en, this message translates to:
  /// **'This lesson is part of the plan.'**
  String get lessonLockedBody;

  /// No description provided for @lessonsLockedTitle.
  ///
  /// In en, this message translates to:
  /// **'Start a plan to unlock every lesson'**
  String get lessonsLockedTitle;

  /// No description provided for @lessonsSeePlans.
  ///
  /// In en, this message translates to:
  /// **'See plans'**
  String get lessonsSeePlans;

  /// No description provided for @errAlreadySubscribed.
  ///
  /// In en, this message translates to:
  /// **'You already have a plan for this course.'**
  String get errAlreadySubscribed;

  /// No description provided for @errPlanRequired.
  ///
  /// In en, this message translates to:
  /// **'You need a plan to open this.'**
  String get errPlanRequired;

  /// No description provided for @errAppleProductMissing.
  ///
  /// In en, this message translates to:
  /// **'This plan isn\'t available in the app yet.'**
  String get errAppleProductMissing;

  /// No description provided for @plansTitle.
  ///
  /// In en, this message translates to:
  /// **'Your plans'**
  String get plansTitle;

  /// No description provided for @plansRowHint.
  ///
  /// In en, this message translates to:
  /// **'Renew, cancel or change a plan'**
  String get plansRowHint;

  /// No description provided for @plansEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No plans yet'**
  String get plansEmptyTitle;

  /// No description provided for @plansEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Pick a recorded course and start any time.'**
  String get plansEmptyBody;

  /// No description provided for @plansFind.
  ///
  /// In en, this message translates to:
  /// **'Find a course'**
  String get plansFind;

  /// No description provided for @plansOpenCourse.
  ///
  /// In en, this message translates to:
  /// **'Open course'**
  String get plansOpenCourse;

  /// No description provided for @planProviderCard.
  ///
  /// In en, this message translates to:
  /// **'Card'**
  String get planProviderCard;

  /// No description provided for @planProviderApple.
  ///
  /// In en, this message translates to:
  /// **'App Store'**
  String get planProviderApple;

  /// No description provided for @planCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel plan'**
  String get planCancel;

  /// No description provided for @planCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this plan?'**
  String get planCancelTitle;

  /// No description provided for @planCancelBody.
  ///
  /// In en, this message translates to:
  /// **'You can keep learning until {date}. Your progress and certificate stay yours.'**
  String planCancelBody(String date);

  /// No description provided for @planCancelStep2Title.
  ///
  /// In en, this message translates to:
  /// **'Are you sure?'**
  String get planCancelStep2Title;

  /// No description provided for @planCancelStep2Body.
  ///
  /// In en, this message translates to:
  /// **'Your plan will end on {date} and won\'t renew.'**
  String planCancelStep2Body(String date);

  /// No description provided for @planCancelConfirm.
  ///
  /// In en, this message translates to:
  /// **'Yes, cancel my plan'**
  String get planCancelConfirm;

  /// No description provided for @planKeep.
  ///
  /// In en, this message translates to:
  /// **'Keep my plan'**
  String get planKeep;

  /// No description provided for @planCancelledToast.
  ///
  /// In en, this message translates to:
  /// **'Done. You can keep learning until {date}.'**
  String planCancelledToast(String date);

  /// No description provided for @planResume.
  ///
  /// In en, this message translates to:
  /// **'Resume plan'**
  String get planResume;

  /// No description provided for @planResumedToast.
  ///
  /// In en, this message translates to:
  /// **'Your plan will renew as before.'**
  String get planResumedToast;

  /// No description provided for @planSwitchToYearly.
  ///
  /// In en, this message translates to:
  /// **'Switch to yearly'**
  String get planSwitchToYearly;

  /// No description provided for @planSwitchToMonthly.
  ///
  /// In en, this message translates to:
  /// **'Switch to monthly'**
  String get planSwitchToMonthly;

  /// No description provided for @planSwitchNote.
  ///
  /// In en, this message translates to:
  /// **'Stripe credits the unused time on your current plan.'**
  String get planSwitchNote;

  /// No description provided for @planSwitchedToast.
  ///
  /// In en, this message translates to:
  /// **'Plan changed.'**
  String get planSwitchedToast;

  /// No description provided for @planUpdateCard.
  ///
  /// In en, this message translates to:
  /// **'Update card'**
  String get planUpdateCard;

  /// No description provided for @planManageAppStore.
  ///
  /// In en, this message translates to:
  /// **'Manage it in the App Store'**
  String get planManageAppStore;

  /// No description provided for @planRenewTransfer.
  ///
  /// In en, this message translates to:
  /// **'Renew by transfer'**
  String get planRenewTransfer;

  /// No description provided for @planSwitchToCard.
  ///
  /// In en, this message translates to:
  /// **'Switch to card'**
  String get planSwitchToCard;

  /// No description provided for @planUploadReceipt.
  ///
  /// In en, this message translates to:
  /// **'Upload receipt'**
  String get planUploadReceipt;

  /// No description provided for @planPendingReceipt.
  ///
  /// In en, this message translates to:
  /// **'Waiting for your receipt'**
  String get planPendingReceipt;

  /// No description provided for @planPendingReview.
  ///
  /// In en, this message translates to:
  /// **'We\'re checking your transfer. This usually takes 1 working day.'**
  String get planPendingReview;

  /// No description provided for @planPendingRejected.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t confirm your transfer: {note}'**
  String planPendingRejected(String note);

  /// No description provided for @planPendingRejectedPlain.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t confirm your transfer. You can try again.'**
  String get planPendingRejectedPlain;

  /// No description provided for @planPastDue.
  ///
  /// In en, this message translates to:
  /// **'Your last payment didn\'t go through. Update your card to keep learning.'**
  String get planPastDue;

  /// No description provided for @planCancellingBanner.
  ///
  /// In en, this message translates to:
  /// **'Your plan ends on {date}. Your progress and certificate stay yours.'**
  String planCancellingBanner(String date);

  /// No description provided for @returnSeePlans.
  ///
  /// In en, this message translates to:
  /// **'See your plans'**
  String get returnSeePlans;

  /// No description provided for @recordedRenew.
  ///
  /// In en, this message translates to:
  /// **'Renew to continue'**
  String get recordedRenew;

  /// No description provided for @recordedCourses.
  ///
  /// In en, this message translates to:
  /// **'Recorded courses'**
  String get recordedCourses;

  /// No description provided for @recordedNext.
  ///
  /// In en, this message translates to:
  /// **'Next: {title}'**
  String recordedNext(String title);

  /// No description provided for @courseTypeTitle.
  ///
  /// In en, this message translates to:
  /// **'What kind of course?'**
  String get courseTypeTitle;

  /// No description provided for @courseTypeLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get courseTypeLive;

  /// No description provided for @courseTypeLiveBody.
  ///
  /// In en, this message translates to:
  /// **'Classes with set dates and a teacher in the room. Learners join a class.'**
  String get courseTypeLiveBody;

  /// No description provided for @courseTypeRecordedBody.
  ///
  /// In en, this message translates to:
  /// **'Lessons learners watch any time, on a monthly or yearly plan. No classes to schedule.'**
  String get courseTypeRecordedBody;

  /// No description provided for @courseTypeFixed.
  ///
  /// In en, this message translates to:
  /// **'The type can\'t be changed once the course is created.'**
  String get courseTypeFixed;

  /// No description provided for @hubTitle.
  ///
  /// In en, this message translates to:
  /// **'Recorded course'**
  String get hubTitle;

  /// No description provided for @hubSubscribers.
  ///
  /// In en, this message translates to:
  /// **'Subscribers'**
  String get hubSubscribers;

  /// No description provided for @hubEarnings.
  ///
  /// In en, this message translates to:
  /// **'Your earnings'**
  String get hubEarnings;

  /// No description provided for @hubEarningsNote.
  ///
  /// In en, this message translates to:
  /// **'Your share of plan payments for this course.'**
  String get hubEarningsNote;

  /// No description provided for @hubEarningsUnknown.
  ///
  /// In en, this message translates to:
  /// **'Earnings from plans appear here once payments arrive.'**
  String get hubEarningsUnknown;

  /// No description provided for @hubQuizzes.
  ///
  /// In en, this message translates to:
  /// **'Course quizzes'**
  String get hubQuizzes;

  /// No description provided for @hubNoQuizzes.
  ///
  /// In en, this message translates to:
  /// **'No quizzes yet. Learners must pass every published quiz to earn the certificate.'**
  String get hubNoQuizzes;

  /// No description provided for @hubAddQuiz.
  ///
  /// In en, this message translates to:
  /// **'Add a quiz'**
  String get hubAddQuiz;

  /// No description provided for @hubPassMark.
  ///
  /// In en, this message translates to:
  /// **'Pass mark {percent}%'**
  String hubPassMark(String percent);

  /// No description provided for @hubPreview.
  ///
  /// In en, this message translates to:
  /// **'Free preview lesson'**
  String get hubPreview;

  /// No description provided for @hubPreviewBody.
  ///
  /// In en, this message translates to:
  /// **'Anyone can watch this lesson, even without an account.'**
  String get hubPreviewBody;

  /// No description provided for @hubPreviewNone.
  ///
  /// In en, this message translates to:
  /// **'No preview lesson'**
  String get hubPreviewNone;

  /// No description provided for @hubPreviewSaved.
  ///
  /// In en, this message translates to:
  /// **'Preview lesson saved.'**
  String get hubPreviewSaved;

  /// No description provided for @hubNoLessons.
  ///
  /// In en, this message translates to:
  /// **'Add lessons on the web to choose a preview.'**
  String get hubNoLessons;

  /// No description provided for @hubEditDetails.
  ///
  /// In en, this message translates to:
  /// **'Edit course details'**
  String get hubEditDetails;

  /// No description provided for @quizPassPercent.
  ///
  /// In en, this message translates to:
  /// **'Pass mark (%)'**
  String get quizPassPercent;

  /// No description provided for @quizPassHelper.
  ///
  /// In en, this message translates to:
  /// **'The share of the points needed to pass.'**
  String get quizPassHelper;

  /// No description provided for @quizPassInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a number from 0 to 100.'**
  String get quizPassInvalid;

  /// No description provided for @quizCourseNote.
  ///
  /// In en, this message translates to:
  /// **'Learners can retake this quiz as many times as they like.'**
  String get quizCourseNote;

  /// No description provided for @adminCutsTitle.
  ///
  /// In en, this message translates to:
  /// **'Teacher cuts'**
  String get adminCutsTitle;

  /// No description provided for @adminCutsBody.
  ///
  /// In en, this message translates to:
  /// **'The share of each payment, after VAT and fees, that goes to the teacher. It is read when the payment is made and never changed afterwards.'**
  String get adminCutsBody;

  /// No description provided for @adminCutLive.
  ///
  /// In en, this message translates to:
  /// **'Live courses (%)'**
  String get adminCutLive;

  /// No description provided for @adminCutRecorded.
  ///
  /// In en, this message translates to:
  /// **'Recorded courses (%)'**
  String get adminCutRecorded;

  /// No description provided for @adminCutsSave.
  ///
  /// In en, this message translates to:
  /// **'Save cuts'**
  String get adminCutsSave;

  /// No description provided for @adminCutsSaved.
  ///
  /// In en, this message translates to:
  /// **'Cuts saved.'**
  String get adminCutsSaved;

  /// No description provided for @adminCutInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number from 0 to 100.'**
  String get adminCutInvalid;

  /// No description provided for @adminCourseCut.
  ///
  /// In en, this message translates to:
  /// **'Teacher cut for this course (%)'**
  String get adminCourseCut;

  /// No description provided for @adminCourseCutHelp.
  ///
  /// In en, this message translates to:
  /// **'For rare cases. Leave empty to use the default, {percent}%.'**
  String adminCourseCutHelp(String percent);

  /// No description provided for @adminCourseCutSaved.
  ///
  /// In en, this message translates to:
  /// **'Course cut saved.'**
  String get adminCourseCutSaved;

  /// No description provided for @adminRecordedPrices.
  ///
  /// In en, this message translates to:
  /// **'Recorded prices'**
  String get adminRecordedPrices;

  /// No description provided for @adminMonthlyPrice.
  ///
  /// In en, this message translates to:
  /// **'Monthly price (AED, before VAT)'**
  String get adminMonthlyPrice;

  /// No description provided for @adminYearlyPrice.
  ///
  /// In en, this message translates to:
  /// **'Yearly price (AED, before VAT)'**
  String get adminYearlyPrice;

  /// No description provided for @adminPricesInvalid.
  ///
  /// In en, this message translates to:
  /// **'The yearly price must be lower than 12 monthly payments.'**
  String get adminPricesInvalid;

  /// No description provided for @adminPricesSaved.
  ///
  /// In en, this message translates to:
  /// **'Prices saved.'**
  String get adminPricesSaved;

  /// No description provided for @adminAppleIds.
  ///
  /// In en, this message translates to:
  /// **'App Store product ids'**
  String get adminAppleIds;

  /// No description provided for @adminAppleMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly product id'**
  String get adminAppleMonthly;

  /// No description provided for @adminAppleYearly.
  ///
  /// In en, this message translates to:
  /// **'Yearly product id'**
  String get adminAppleYearly;

  /// No description provided for @adminAppleSaved.
  ///
  /// In en, this message translates to:
  /// **'Product ids saved.'**
  String get adminAppleSaved;

  /// No description provided for @adminSubsTitle.
  ///
  /// In en, this message translates to:
  /// **'Subscriptions'**
  String get adminSubsTitle;

  /// No description provided for @adminHubSubsSub.
  ///
  /// In en, this message translates to:
  /// **'Plans on recorded courses'**
  String get adminHubSubsSub;

  /// No description provided for @adminSubsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No subscriptions match.'**
  String get adminSubsEmpty;

  /// No description provided for @adminSubsAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get adminSubsAll;

  /// No description provided for @adminSubCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel plan'**
  String get adminSubCancel;

  /// No description provided for @adminSubCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this plan now?'**
  String get adminSubCancelTitle;

  /// No description provided for @adminSubCancelBody.
  ///
  /// In en, this message translates to:
  /// **'The learner loses access straight away. Their progress and certificate stay.'**
  String get adminSubCancelBody;

  /// No description provided for @adminRefundNone.
  ///
  /// In en, this message translates to:
  /// **'Cancel only'**
  String get adminRefundNone;

  /// No description provided for @adminRefundFull.
  ///
  /// In en, this message translates to:
  /// **'Cancel and refund the last payment'**
  String get adminRefundFull;

  /// No description provided for @adminSubCancelled.
  ///
  /// In en, this message translates to:
  /// **'Plan cancelled.'**
  String get adminSubCancelled;

  /// No description provided for @adminSubApple.
  ///
  /// In en, this message translates to:
  /// **'Managed by Apple'**
  String get adminSubApple;

  /// No description provided for @adminSubLastPayment.
  ///
  /// In en, this message translates to:
  /// **'Last payment {amount}'**
  String adminSubLastPayment(String amount);

  /// No description provided for @adminTransferPlan.
  ///
  /// In en, this message translates to:
  /// **'Plan'**
  String get adminTransferPlan;

  /// No description provided for @adminTransferCourse.
  ///
  /// In en, this message translates to:
  /// **'Course'**
  String get adminTransferCourse;

  /// No description provided for @adminTransferPlanChip.
  ///
  /// In en, this message translates to:
  /// **'Plan transfer'**
  String get adminTransferPlanChip;

  /// No description provided for @planPastDueChip.
  ///
  /// In en, this message translates to:
  /// **'Payment failed'**
  String get planPastDueChip;

  /// No description provided for @planCancellingChip.
  ///
  /// In en, this message translates to:
  /// **'Ending'**
  String get planCancellingChip;

  /// No description provided for @planExpiredChip.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get planExpiredChip;

  /// No description provided for @planSettingUpChip.
  ///
  /// In en, this message translates to:
  /// **'Setting up'**
  String get planSettingUpChip;

  /// No description provided for @planActiveChip.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get planActiveChip;

  /// No description provided for @certificateRecordedCompletion.
  ///
  /// In en, this message translates to:
  /// **'Completed every lesson and passed every quiz'**
  String get certificateRecordedCompletion;

  /// No description provided for @certificateCompletion.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get certificateCompletion;

  /// No description provided for @earningsRecordedCourses.
  ///
  /// In en, this message translates to:
  /// **'Recorded courses'**
  String get earningsRecordedCourses;

  /// No description provided for @hubSubscribersUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Subscriber numbers aren\'t available right now.'**
  String get hubSubscribersUnavailable;

  /// No description provided for @adminSubReceiptReturnByHand.
  ///
  /// In en, this message translates to:
  /// **'A transfer receipt was under review; return that money by hand.'**
  String get adminSubReceiptReturnByHand;

  /// No description provided for @appStoreTitle.
  ///
  /// In en, this message translates to:
  /// **'App Store'**
  String get appStoreTitle;

  /// No description provided for @appStoreSyncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get appStoreSyncNow;

  /// No description provided for @appStoreSyncStarted.
  ///
  /// In en, this message translates to:
  /// **'Sync started. The list updates in a few seconds.'**
  String get appStoreSyncStarted;

  /// No description provided for @appStoreNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Add your App Store Connect API key to enable automatic product setup.'**
  String get appStoreNotConfigured;

  /// No description provided for @appStoreNothingYet.
  ///
  /// In en, this message translates to:
  /// **'No products yet. Sync to create them.'**
  String get appStoreNothingYet;

  /// No description provided for @appStoreSeats.
  ///
  /// In en, this message translates to:
  /// **'Seat prices'**
  String get appStoreSeats;

  /// No description provided for @appStoreCourses.
  ///
  /// In en, this message translates to:
  /// **'Recorded courses'**
  String get appStoreCourses;

  /// No description provided for @appleSyncSynced.
  ///
  /// In en, this message translates to:
  /// **'Synced'**
  String get appleSyncSynced;

  /// No description provided for @appleSyncSkipped.
  ///
  /// In en, this message translates to:
  /// **'Skipped'**
  String get appleSyncSkipped;

  /// No description provided for @appleSyncFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get appleSyncFailed;

  /// No description provided for @appleSyncNever.
  ///
  /// In en, this message translates to:
  /// **'Not synced yet'**
  String get appleSyncNever;

  /// No description provided for @adminPricesRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a monthly and a yearly price.'**
  String get adminPricesRequired;

  /// No description provided for @planTransferNotOnIos.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer isn\'t available on iPhone. Manage your plan in the App Store.'**
  String get planTransferNotOnIos;

  /// No description provided for @reportsRecordedTitle.
  ///
  /// In en, this message translates to:
  /// **'Recorded courses'**
  String get reportsRecordedTitle;

  /// No description provided for @reportsRecordedNone.
  ///
  /// In en, this message translates to:
  /// **'No recorded-course payments in this range.'**
  String get reportsRecordedNone;

  /// No description provided for @reportsGross.
  ///
  /// In en, this message translates to:
  /// **'Gross'**
  String get reportsGross;

  /// No description provided for @reportsFees.
  ///
  /// In en, this message translates to:
  /// **'Fees'**
  String get reportsFees;

  /// No description provided for @reportsVat.
  ///
  /// In en, this message translates to:
  /// **'VAT'**
  String get reportsVat;

  /// No description provided for @reportsNet.
  ///
  /// In en, this message translates to:
  /// **'Net'**
  String get reportsNet;

  /// No description provided for @transferNotFound.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find this transfer. It may already be reviewed.'**
  String get transferNotFound;

  /// No description provided for @transferBackToQueue.
  ///
  /// In en, this message translates to:
  /// **'Back to transfers'**
  String get transferBackToQueue;
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
