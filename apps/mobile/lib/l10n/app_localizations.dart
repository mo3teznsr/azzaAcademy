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

  /// No description provided for @noOpenBatchesShort.
  ///
  /// In en, this message translates to:
  /// **'No open batches'**
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
  /// **'Finish paying {amount} on Stripe\'s secure page. Your seat in {code} is held, and this screen updates as soon as the payment is confirmed.'**
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
  /// **'{count} students are enrolled. Seats can\'t go below that.'**
  String editSeatsLead(String count);

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
  /// **'Live online courses · Arabic & English'**
  String get splashTagline;

  /// No description provided for @splashLine.
  ///
  /// In en, this message translates to:
  /// **'Learn live, with a real teacher.'**
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
  /// **'Card · Google Pay'**
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
  /// **'We couldn\'t get you back in automatically. Your seat is still yours.'**
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
  /// **'A seat frees up as soon as someone leaves. Try again in a minute, or catch the recording after class.'**
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
  /// **'The recording appears in your learning once it\'s ready.'**
  String get edgeEndedBody;

  /// No description provided for @edgeNotEnrolledTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'re not in this batch'**
  String get edgeNotEnrolledTitle;

  /// No description provided for @edgeNotEnrolledBody.
  ///
  /// In en, this message translates to:
  /// **'You need an active enrollment in this batch to join.'**
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

  /// No description provided for @certificatesTitle.
  ///
  /// In en, this message translates to:
  /// **'Certificates'**
  String get certificatesTitle;

  /// No description provided for @certificatesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No certificates yet'**
  String get certificatesEmptyTitle;

  /// No description provided for @certificatesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Attend at least 80% of a batch\'s sessions and your certificate appears here when the batch ends.'**
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
  /// **'{n} more sessions needed'**
  String certificateSessionsNeeded(String n);

  /// No description provided for @certificateOneSessionNeeded.
  ///
  /// In en, this message translates to:
  /// **'1 more session needed'**
  String get certificateOneSessionNeeded;

  /// No description provided for @certificateRequirementMet.
  ///
  /// In en, this message translates to:
  /// **'Attendance met — your certificate is issued when the batch ends.'**
  String get certificateRequirementMet;

  /// No description provided for @certificateUnreachable.
  ///
  /// In en, this message translates to:
  /// **'Not enough sessions left to reach 80% in this batch.'**
  String get certificateUnreachable;

  /// No description provided for @certificateAttendedOfRequired.
  ///
  /// In en, this message translates to:
  /// **'{attended} of {required} sessions to earn it'**
  String certificateAttendedOfRequired(String attended, String required);

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
  /// **'Batch'**
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
  /// **'You attended {attended} of {total} live sessions.'**
  String certificateCompleteBody(String attended, String total);

  /// No description provided for @certificateVerifyHint.
  ///
  /// In en, this message translates to:
  /// **'Anyone can check it at {url}'**
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
  /// **'When a seat frees up, it goes to the first person in line.'**
  String get waitlistStepSeat;

  /// No description provided for @waitlistStepNotify.
  ///
  /// In en, this message translates to:
  /// **'We\'ll notify and email you the moment it\'s yours.'**
  String get waitlistStepNotify;

  /// No description provided for @waitlistStepHold.
  ///
  /// In en, this message translates to:
  /// **'You then have 24 hours to check out before the seat moves on.'**
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
  /// **'A seat opened for you'**
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
  /// **'Claim seat'**
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
  /// **'Upcoming batches'**
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
  /// **'Session times are shown in this timezone.'**
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
  /// **'Payment is handled by Apple. Your seat is confirmed as soon as the purchase completes.'**
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
  /// **'This seat isn\'t available as an in-app purchase.'**
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
  /// **'Your teacher sees your photo on the class list and in live sessions, so they know who\'s in the room.'**
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
  /// **'Rated {avg} out of 5 from {count} reviews'**
  String ratingSemantics(String avg, String count);

  /// No description provided for @reviewsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get reviewsTitle;

  /// No description provided for @reviewsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} reviews'**
  String reviewsCount(String count);

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
  /// **'{n} stars'**
  String starsN(String n);

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
  /// **'You can review this course after attending one of its sessions.'**
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
  /// **'The people who teach live on Azza. Open a profile to see their courses and open batches.'**
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
  /// **'{count} courses'**
  String instructorCoursesN(String count);

  /// No description provided for @instructorOpenBatchesN.
  ///
  /// In en, this message translates to:
  /// **'{count} open batches'**
  String instructorOpenBatchesN(String count);

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
  /// **'Share what you know, live.'**
  String get teachPitchTitle;

  /// No description provided for @teachPitchBody.
  ///
  /// In en, this message translates to:
  /// **'Teach small live batches to learners across the region, in Arabic or English. Tell us who you are and what you\'d teach; our team reviews every application, usually within a few days.'**
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
  /// **'{n} lessons'**
  String lessonsCountN(String n);

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
  /// **'{n} attachments'**
  String lessonAttachmentsN(String n);

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
  /// **'{n} questions'**
  String quizQuestionsN(String n);

  /// No description provided for @quizMinutesN.
  ///
  /// In en, this message translates to:
  /// **'{n} min'**
  String quizMinutesN(String n);

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
  /// **'You\'ll have {minutes} minutes once you start. When time runs out, your answers are submitted automatically.'**
  String quizStartTimedBody(String minutes);

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
  /// **'You answered {answered} of {total} questions.'**
  String quizAnsweredOf(String answered, String total);

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
  /// **'{students} students tried · {attempts} attempts'**
  String quizStudentsAttempted(String students, String attempts);

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
  /// **'{n} attempts'**
  String quizAttemptsN(String n);

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
