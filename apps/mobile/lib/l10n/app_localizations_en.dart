// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'azza';

  @override
  String get retry => 'Try again';

  @override
  String get errorTitle => 'That didn\'t load.';

  @override
  String get emptyGeneric => 'Nothing here yet.';

  @override
  String get seeAll => 'See all';

  @override
  String get continueLabel => 'Continue';

  @override
  String get cancel => 'Cancel';

  @override
  String get back => 'Back';

  @override
  String get noOpenBatchesShort => 'No open classes';

  @override
  String chargedAsAed(String amount) {
    return 'Charged as $amount';
  }

  @override
  String get ratesUnavailableHint =>
      'Shown in AED: exchange rates are unavailable right now.';

  @override
  String get decrease => 'Decrease';

  @override
  String get increase => 'Increase';

  @override
  String get paymentPageNotOpened =>
      'Couldn\'t open the payment page. Tap “Open payment page” to try again.';

  @override
  String get payCardCheckoutSub =>
      'Card, Apple Pay or Google Pay on Stripe\'s secure page · charged in AED';

  @override
  String get confirmingPayment => 'Confirming your payment…';

  @override
  String confirmingPaymentBody(String code, String amount) {
    return 'Finish paying $amount on Stripe\'s secure page. Your place in $code is held, and this screen updates as soon as the payment is confirmed.';
  }

  @override
  String get checkingPayment => 'Checking every few seconds…';

  @override
  String get openPaymentPage => 'Open payment page';

  @override
  String get coursePricedPerBatch =>
      'No price here: you set the seat price on each batch. Students see the lowest open batch as the course\'s “from” price.';

  @override
  String get seatPriceRequired => 'Enter a seat price in AED (more than 0).';

  @override
  String get seatPriceAed => 'Seat price (AED)';

  @override
  String get seatPriceHint => '450';

  @override
  String get seatPriceHelper =>
      'What one student pays for this batch. Charged in AED.';

  @override
  String get seatsHelper => 'How many students can enrol (1–500).';

  @override
  String get sessionAdded => 'Session added.';

  @override
  String cancelSessionTitle(String slate) {
    return 'Cancel $slate?';
  }

  @override
  String get cancelSessionBody =>
      'Students are notified and the session leaves their schedule. This can\'t be undone.';

  @override
  String get keepSession => 'Keep session';

  @override
  String get cancelSession => 'Cancel session';

  @override
  String get sessionCancelled => 'Session cancelled.';

  @override
  String get upcomingSessions => 'Upcoming sessions';

  @override
  String get addSession => 'Add session';

  @override
  String get noUpcomingSessions => 'No upcoming sessions.';

  @override
  String get moveSessionAction => 'Move session';

  @override
  String get requestMove => 'Request a move';

  @override
  String showAllN(String count) {
    return 'Show all $count';
  }

  @override
  String get sessionTitleRequired =>
      'Give the session a title (at least 2 characters).';

  @override
  String get errStartInPast => 'Pick a time in the future.';

  @override
  String addSessionTitle(String code) {
    return 'Add a session to $code';
  }

  @override
  String get addSessionLead =>
      'An extra live session outside the weekly schedule: a catch-up, a bonus or an exam.';

  @override
  String get sessionTitleLabel => 'Session title';

  @override
  String get sessionTitleHint => 'Catch-up: review and Q&A';

  @override
  String get sessionDate => 'Date';

  @override
  String sessionTimeOtherZone(String device, String batchZone) {
    return 'Times are in your phone\'s timezone ($device). This batch runs in $batchZone.';
  }

  @override
  String sessionTimeZone(String zone) {
    return 'Times are in the batch timezone, $zone.';
  }

  @override
  String get sessionLengthHelper => '15 to 480 minutes, in steps of 15.';

  @override
  String get notifyStudentsNow => 'Notify students';

  @override
  String get notifyStudentsNowSub =>
      'Send them a notification and an email now.';

  @override
  String get couldNotAddSession => 'Couldn\'t add the session';

  @override
  String editSeatsTitle(String code) {
    return 'Seats in $code';
  }

  @override
  String editSeatsLead(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count students are enrolled.',
      one: '$count student is enrolled.',
    );
    return '$_temp0 Seats can\'t go below that.';
  }

  @override
  String get couldNotSaveSeats => 'Couldn\'t change the seats';

  @override
  String get saveSeats => 'Save seats';

  @override
  String get seatsSaved => 'Seats updated.';

  @override
  String get editSeats => 'Edit seats';

  @override
  String get sessionMoved => 'Session moved.';

  @override
  String get moveReasonHint => 'Public holiday';

  @override
  String get moveSessionNow => 'Move session';

  @override
  String get errConflict => 'That clashes with something already scheduled.';

  @override
  String get errBatchClosed =>
      'This batch has ended or was cancelled, so it can\'t take new sessions.';

  @override
  String get errCapacityTooLow =>
      'Seats can\'t go below the number of enrolled students.';

  @override
  String get save => 'Save';

  @override
  String get saved => 'Saved';

  @override
  String get skip => 'Skip';

  @override
  String get signOut => 'Sign out';

  @override
  String get edit => 'Edit';

  @override
  String get copy => 'Copy';

  @override
  String get copied => 'Copied';

  @override
  String get close => 'Close';

  @override
  String get send => 'Send';

  @override
  String get you => 'You';

  @override
  String get navHome => 'Home';

  @override
  String get navExplore => 'Explore';

  @override
  String get navSchedule => 'Schedule';

  @override
  String get navLibrary => 'Library';

  @override
  String get navMe => 'Me';

  @override
  String get navToday => 'Today';

  @override
  String get navBatches => 'Batches';

  @override
  String get navCalendar => 'Calendar';

  @override
  String get navEarnings => 'Earnings';

  @override
  String get navOverview => 'Overview';

  @override
  String get navLive => 'Live';

  @override
  String get navApprovals => 'Approvals';

  @override
  String get statusScheduled => 'Scheduled';

  @override
  String statusStartsIn(String minutes) {
    return 'Starts in ${minutes}m';
  }

  @override
  String fmtInMinutes(String minutes) {
    return 'in $minutes min';
  }

  @override
  String fmtInHours(String hours) {
    return 'in $hours h';
  }

  @override
  String get statusLive => 'Live';

  @override
  String get statusEnded => 'Ended';

  @override
  String get statusRescheduled => 'Rescheduled';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get batchDraft => 'Draft';

  @override
  String get batchEnrolling => 'Enrolling';

  @override
  String get batchFull => 'Full · waitlist';

  @override
  String get batchRunning => 'Running';

  @override
  String get batchCompleted => 'Completed';

  @override
  String get batchCancelled => 'Cancelled';

  @override
  String get orderAwaitingPayment => 'Awaiting payment';

  @override
  String get orderAwaitingReceipt => 'Awaiting receipt';

  @override
  String get orderVerifying => 'Verifying';

  @override
  String get orderAmountMismatch => 'Amount mismatch';

  @override
  String get orderPaid => 'Paid';

  @override
  String get orderFailed => 'Failed';

  @override
  String get orderRejected => 'Rejected';

  @override
  String get orderExpired => 'Expired';

  @override
  String get orderRefunded => 'Refunded';

  @override
  String get splashTagline => 'Courses in Arabic & English';

  @override
  String get splashLine => 'Learn it. Practise it. Make it yours.';

  @override
  String get chooseLanguage => 'Choose your language';

  @override
  String get leftToRight => 'Left to right';

  @override
  String get rightToLeft => 'Right to left';

  @override
  String get languageHint =>
      'You can change the language any time from Me → Language & region. Each class is taught in its own language.';

  @override
  String get onboardingTitle => 'What do you want to learn?';

  @override
  String get onboardingLine =>
      'Learn step by step, practise with feedback, get help from your teacher, and prove it with a certificate.';

  @override
  String get onboardingTimezone =>
      'Your timezone — live session times convert to it';

  @override
  String get detected => 'detected';

  @override
  String get bestTime => 'Best time for live sessions';

  @override
  String get mornings => 'Mornings';

  @override
  String get evenings => 'Evenings';

  @override
  String get weekends => 'Weekends';

  @override
  String get interestDesign => 'Design';

  @override
  String get interestLanguages => 'Languages';

  @override
  String get interestCode => 'Code';

  @override
  String get interestBusiness => 'Business';

  @override
  String get interestArt => 'Art';

  @override
  String get interestMusic => 'Music';

  @override
  String get signInTitle => 'Welcome back.';

  @override
  String get signInSubtitle => 'Pick up where you left off.';

  @override
  String get signUpTitle => 'Start learning today.';

  @override
  String get signUpSubtitle =>
      'A clear path, practice with feedback, and a certificate that proves it.';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get fullName => 'Full name';

  @override
  String get signIn => 'Sign in';

  @override
  String get createAccount => 'Create account';

  @override
  String get haveAccount => 'I already have an account';

  @override
  String get noAccount => 'New here? Create an account';

  @override
  String get orLabel => 'or';

  @override
  String get continueGoogle => 'Continue with Google';

  @override
  String get continueApple => 'Continue with Apple';

  @override
  String get termsNote =>
      'By continuing you agree to the Terms and Privacy policy.';

  @override
  String get invalidEmail => 'Enter a valid email';

  @override
  String get passwordTooShort => 'At least 8 characters';

  @override
  String get nameTooShort => 'At least 2 characters';

  @override
  String get verifyTitle => 'Check your inbox.';

  @override
  String verifyBody(String email) {
    return 'We sent a verification link to $email.';
  }

  @override
  String resendIn(String time) {
    return 'Resend in $time';
  }

  @override
  String get resend => 'Resend';

  @override
  String get changeEmail => 'Change email';

  @override
  String get verifyPermissions =>
      'After this we\'ll ask for camera and mic once, so you can join live sessions in one tap.';

  @override
  String get verifyContinue => 'Verify & continue';

  @override
  String greetingMorning(String name) {
    return 'Morning, $name';
  }

  @override
  String greetingAfternoon(String name) {
    return 'Afternoon, $name';
  }

  @override
  String greetingEvening(String name) {
    return 'Evening, $name';
  }

  @override
  String get liveNow => 'Live now';

  @override
  String get joinLiveRoom => 'Join session';

  @override
  String inRoom(String count) {
    return '$count joined';
  }

  @override
  String get myBatches => 'Your courses';

  @override
  String nextAt(String when) {
    return 'Next session · $when';
  }

  @override
  String get continueWatching => 'Catch up';

  @override
  String get noBatchesTitle => 'No courses yet';

  @override
  String get noBatchesBody =>
      'Find a course, then choose a class whose live sessions fit your week.';

  @override
  String get exploreCta => 'Find your course';

  @override
  String get upNext => 'Next live session';

  @override
  String get practiceDue => 'Practice due';

  @override
  String get exploreTitle => 'Find what you want to learn.';

  @override
  String get searchCourses => 'Search courses';

  @override
  String get allFilter => 'All';

  @override
  String coursesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count courses',
      one: '$count course',
    );
    return '$_temp0';
  }

  @override
  String get noCoursesFound => 'No courses match. Try another search.';

  @override
  String levelN(String n) {
    return 'Level $n';
  }

  @override
  String liveSessionsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n live sessions',
      one: '$n live session',
    );
    return '$_temp0';
  }

  @override
  String get recordings => 'Recordings';

  @override
  String get certificate => 'Certificate';

  @override
  String teaches(String codes) {
    return 'Teaches $codes';
  }

  @override
  String get outcomesTitle => 'You\'ll leave able to';

  @override
  String syllabusN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n modules',
      one: '$n module',
    );
    return 'Syllabus · $_temp0';
  }

  @override
  String fromPrice(String price) {
    return 'From $price';
  }

  @override
  String chooseBatchN(String n) {
    return 'Choose your class · $n';
  }

  @override
  String get pickBatch => 'Choose your class.';

  @override
  String timesShownIn(String tz) {
    return 'Times shown in $tz';
  }

  @override
  String get fullSchedule => 'Full schedule';

  @override
  String enrollIn(String code) {
    return 'Join class $code';
  }

  @override
  String seatsLeft(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n places left',
      one: '$n place left',
    );
    return '$_temp0';
  }

  @override
  String seatsOf(String taken, String capacity) {
    return '$taken/$capacity';
  }

  @override
  String get noOpenBatches => 'No classes are open right now. Check back soon.';

  @override
  String joiningLate(int ran, int left) {
    String _temp0 = intl.Intl.pluralLogic(
      ran,
      locale: localeName,
      other: '$ran sessions already ran',
      one: '$ran session already ran',
    );
    String _temp1 = intl.Intl.pluralLogic(
      left,
      locale: localeName,
      other: '$left live sessions left.',
      one: '$left live session left.',
    );
    return 'Joining late? $_temp0 — catch up on the recordings in your library. $_temp1';
  }

  @override
  String get addToCalendar => 'Add to calendar';

  @override
  String continueWithPrice(String price) {
    return 'Continue · $price';
  }

  @override
  String sessionN(String n) {
    return 'Session $n';
  }

  @override
  String get joinWaitlist => 'Join waitlist';

  @override
  String get checkoutTitle => 'Checkout';

  @override
  String stepOf(String a, String b) {
    return 'Step $a / $b';
  }

  @override
  String get showPricesIn => 'Show prices in';

  @override
  String get batchPrice => 'Class price';

  @override
  String get coupon => 'Coupon';

  @override
  String get apply => 'Apply';

  @override
  String get discount => 'Discount';

  @override
  String get vat => 'VAT';

  @override
  String get total => 'Total';

  @override
  String chargedInAed(String aed, String currency, String rate) {
    return 'Charged in $aed. Your bank converts. $currency is an estimate at 1 AED = $rate $currency.';
  }

  @override
  String get chargedExact => 'Charged in AED. This is the exact amount.';

  @override
  String get payWith => 'Pay with';

  @override
  String get payCard => 'Card · Google Pay';

  @override
  String get payCardSub => 'Confirmed instantly · 3-D Secure';

  @override
  String get payBank => 'Bank transfer';

  @override
  String get payBankSub => 'Your place is held for 48 h while you transfer';

  @override
  String continueAmount(String amount) {
    return 'Continue · $amount';
  }

  @override
  String get couponInvalid => 'That coupon didn\'t apply.';

  @override
  String get payByCard => 'Pay by card';

  @override
  String payAmount(String amount) {
    return 'Pay $amount';
  }

  @override
  String cardNote(String amount) {
    return 'Your bank may ask you to confirm with 3-D Secure. Your card statement will show $amount.';
  }

  @override
  String get securedByStripe =>
      'Secured by Stripe · we never store card numbers';

  @override
  String get stripeUnavailable =>
      'Card payments aren\'t configured in this build. Use bank transfer.';

  @override
  String get paymentCancelled => 'Payment cancelled.';

  @override
  String get bankTransfer => 'Bank transfer';

  @override
  String seatHeld(String time) {
    return 'Place held $time';
  }

  @override
  String get transferExactly => 'Transfer exactly';

  @override
  String get reference => 'Reference';

  @override
  String referenceHint(String amount) {
    return 'Put the reference in the transfer notes. Send AED, or ask your bank to convert so $amount arrives.';
  }

  @override
  String get chooseBank => 'Choose a receiving bank';

  @override
  String copyIbanOf(String bank) {
    return 'Copy full IBAN of $bank';
  }

  @override
  String get uploadReceipt =>
      'Upload transfer receipt (PDF, JPG, PNG · max 10 MB)';

  @override
  String get chooseFile => 'Choose file';

  @override
  String get fileTooLarge => 'File is larger than 10 MB.';

  @override
  String get iSentTransfer => 'I\'ve sent the transfer';

  @override
  String get holdExpired =>
      'The 48 h hold expired and your place was released.';

  @override
  String get noBanks => 'No receiving banks are active. Contact support.';

  @override
  String orderRef(String ref) {
    return 'Order $ref';
  }

  @override
  String get almostOnAir => 'Nearly done.';

  @override
  String verifyingBody(String code, String amount) {
    return 'We\'re holding your place in $code while finance checks the transfer of $amount.';
  }

  @override
  String get tlOrderCreated => 'Place held';

  @override
  String get tlReceiptUploaded => 'Receipt uploaded';

  @override
  String get tlFinanceVerifying => 'Finance verifying';

  @override
  String get tlSeatConfirmed => 'Place confirmed';

  @override
  String get rejectedTitle => 'Receipt needs attention';

  @override
  String get reupload => 'Re-upload receipt';

  @override
  String get contactSupport => 'Contact finance support';

  @override
  String get orderFailedBody =>
      'The payment didn\'t go through. You can try again.';

  @override
  String get orderExpiredBody =>
      'This order expired and your place was released.';

  @override
  String get goToSchedule => 'Go to my schedule';

  @override
  String get youreIn => 'You\'re in.';

  @override
  String enrolledBody(String course, String code, int count, String n) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'your $n live sessions are in your schedule.',
      one: 'your $n live session is in your schedule.',
      zero: 'your live sessions will appear in your schedule.',
    );
    return 'Your place in $course · $code is confirmed. Start with the lessons; $_temp0';
  }

  @override
  String get nextTake => 'Next live session';

  @override
  String get days => 'days';

  @override
  String get hrs => 'hrs';

  @override
  String get mins => 'min';

  @override
  String lobbyOpensAt(String time) {
    return 'you can join from $time';
  }

  @override
  String syncCalendar(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'Sync $n sessions to calendar',
      one: 'Sync $n session to calendar',
    );
    return '$_temp0';
  }

  @override
  String get watchRecordings => 'Watch recordings';

  @override
  String get myOrders => 'My orders';

  @override
  String get noOrders => 'No orders yet.';

  @override
  String get thisWeek => 'This week';

  @override
  String get noSessionsWeek => 'No live sessions this week.';

  @override
  String get prevWeek => 'Previous week';

  @override
  String get nextWeek => 'Next week';

  @override
  String lobbyOpenStarts(String time) {
    return 'Lobby open · starts $time';
  }

  @override
  String lobbyStarts(String time) {
    return 'Lobby · starts $time';
  }

  @override
  String get cameraPreview => 'You · camera preview';

  @override
  String get microphone => 'Microphone';

  @override
  String get camera => 'Camera';

  @override
  String joinAs(String name) {
    return 'Join as $name';
  }

  @override
  String get lobbyClosed => 'You can join 15 min before the session starts.';

  @override
  String get goLive => 'Go live';

  @override
  String get recordSession => 'Record session';

  @override
  String get recordSessionSub => 'Saved to the batch library after processing';

  @override
  String waitingN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n waiting',
    );
    return '$_temp0';
  }

  @override
  String get networkCheck => 'Network check runs when you join';

  @override
  String get connecting => 'Connecting…';

  @override
  String get rec => 'Rec';

  @override
  String get reconnecting => 'Reconnecting…';

  @override
  String get reconnectingBody => 'Weak signal. Video paused to keep audio.';

  @override
  String get hostLabel => 'host';

  @override
  String get chat => 'Chat';

  @override
  String peopleN(String n) {
    return 'People ($n)';
  }

  @override
  String handsN(String n) {
    return 'Hands raised · $n';
  }

  @override
  String get messageHint => 'Message';

  @override
  String get leave => 'Leave';

  @override
  String get raiseHand => 'Hand';

  @override
  String get muteAll => 'Mute all';

  @override
  String get record => 'Record';

  @override
  String get endForAll => 'End for all';

  @override
  String get endConfirmTitle => 'End the session for everyone?';

  @override
  String get endConfirmBody =>
      'The room closes, recording stops and attendance is saved.';

  @override
  String get allowSpeak => 'Allow to speak';

  @override
  String get mute => 'Mute';

  @override
  String get remove => 'Remove';

  @override
  String get noMessages => 'No messages yet. Say hi.';

  @override
  String get noHands => 'No hands raised.';

  @override
  String get onlyYou => 'Only you are here so far.';

  @override
  String get liveUnavailable => 'Video isn\'t available for this session yet.';

  @override
  String edgeWaitingTitle(String host) {
    return '$host hasn\'t started yet';
  }

  @override
  String get edgeWaitingSub =>
      'Usually starts within 5 min · you\'ll join automatically';

  @override
  String get edgeLiveNow => 'Live now';

  @override
  String get edgePermTitle => 'Camera or microphone blocked';

  @override
  String get edgePermBody =>
      'Azza can\'t use your camera or microphone, so the class can\'t see or hear you.';

  @override
  String get edgePermStepsIos =>
      'Open Settings → Azza → turn on Camera and Microphone, then come back.';

  @override
  String get edgePermStepsAndroid =>
      'Open Settings → Apps → Azza → Permissions → allow Camera and Microphone, then come back.';

  @override
  String get edgePermMissing =>
      'We couldn\'t find a camera or microphone on this device.';

  @override
  String get edgePermBusy =>
      'Another app is using your camera or microphone. Close it and try again.';

  @override
  String get edgeOpenSettings => 'Open Settings';

  @override
  String get edgeTryAgain => 'Try again';

  @override
  String get edgeJoinAudioOnly => 'Join with audio only';

  @override
  String get edgeJoinListenOnly => 'Join to listen only';

  @override
  String get edgeReconnecting => 'Reconnecting… your video paused, audio kept';

  @override
  String get edgeLostTitle => 'Connection lost';

  @override
  String get edgeLostBody =>
      'We couldn\'t get you back in automatically. Your place in the class is safe.';

  @override
  String get edgeRejoin => 'Rejoin';

  @override
  String edgeRoomFullTitle(String n, String max) {
    return 'Room is at $n/$max';
  }

  @override
  String get edgeRoomFullGeneric => 'This room is full';

  @override
  String get edgeRoomFullBody =>
      'A place frees up as soon as someone leaves. Try again in a minute, or watch the recording after the session.';

  @override
  String edgeCancelledTitle(String s, String teacher) {
    return '$s cancelled by $teacher';
  }

  @override
  String get edgeCancelledBody =>
      'It won\'t count against your attendance. Your schedule shows what\'s next.';

  @override
  String edgeMovedTitle(String s, String when) {
    return '$s moved to $when';
  }

  @override
  String edgeMovedBody(String was, String tz) {
    return 'It was $was. Times are in your time zone ($tz).';
  }

  @override
  String get edgeEndedTitle => 'This session has ended';

  @override
  String get edgeEndedBody =>
      'The recording appears in your library once it\'s ready.';

  @override
  String get edgeNotEnrolledTitle => 'You\'re not in this class';

  @override
  String get edgeNotEnrolledBody =>
      'You need an active enrolment in this class to join.';

  @override
  String get edgeBackToSchedule => 'Back to schedule';

  @override
  String get edgeWaitingButton => 'Waiting for the host…';

  @override
  String get wrapTitle => 'Session complete.';

  @override
  String endedStayed(String time, int min) {
    String _temp0 = intl.Intl.pluralLogic(
      min,
      locale: localeName,
      other: '$min min',
    );
    return 'Ended $time · you stayed $_temp0';
  }

  @override
  String howWas(String slate) {
    return 'How was $slate?';
  }

  @override
  String get tagClear => 'Clear';

  @override
  String get tagPace => 'Good pace';

  @override
  String get tagExamples => 'Great examples';

  @override
  String get tagAudio => 'Audio issues';

  @override
  String get tagTooFast => 'Too fast';

  @override
  String get recordingProcessing => 'Recording processing';

  @override
  String get recordingSoon => 'Ready in about 20 min · we\'ll notify you';

  @override
  String get nextLabel => 'Next';

  @override
  String get sendFeedback => 'Send feedback';

  @override
  String get thanksFeedback => 'Thanks — Feedback sent.';

  @override
  String get libraryTitle => 'Library';

  @override
  String get libraryEmptyTitle => 'Learn at your pace';

  @override
  String continueAt(String at) {
    return 'Continue · $at';
  }

  @override
  String allRecordingsN(String n) {
    return 'All recordings · $n';
  }

  @override
  String get materials => 'Materials';

  @override
  String get noRecordings =>
      'Recordings appear here after each session, so you can rewatch or catch up.';

  @override
  String get noMaterials => 'No materials shared yet.';

  @override
  String get assignments => 'Assignments';

  @override
  String get dueTab => 'Due';

  @override
  String get submittedTab => 'Submitted';

  @override
  String get gradedTab => 'Graded';

  @override
  String dueAt(String when) {
    return 'Due $when';
  }

  @override
  String get submitAssignment => 'Submit assignment';

  @override
  String get linkLabel => 'Link';

  @override
  String get textLabel => 'Notes';

  @override
  String get noAssignments => 'No assignments here.';

  @override
  String get submittedOk => 'Submitted.';

  @override
  String scoreOf(String score, String max) {
    return '$score / $max';
  }

  @override
  String get enrollFirst =>
      'Join a class to unlock its lessons, recordings and materials.';

  @override
  String get inbox => 'Inbox';

  @override
  String get markAllRead => 'Mark all read';

  @override
  String get today => 'Today';

  @override
  String get earlier => 'Earlier';

  @override
  String get noNotifications => 'You\'re all caught up.';

  @override
  String get timezone => 'Timezone';

  @override
  String get language => 'Language';

  @override
  String get notifications => 'Notifications';

  @override
  String get account => 'Account';

  @override
  String batchesN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n classes',
      one: '$n class',
    );
    return '$_temp0';
  }

  @override
  String get languageRegion => 'Language & region';

  @override
  String get appLanguage => 'App language';

  @override
  String get numerals => 'Numerals';

  @override
  String get numeralsArabic => 'Arabic-Indic ٠١٢٣٤٥٦٧٨٩';

  @override
  String get numeralsWestern => 'Western 0123456789';

  @override
  String get preview => 'Preview';

  @override
  String get displayCurrency => 'Display currency';

  @override
  String get editProfile => 'Edit profile';

  @override
  String get nextTakeLobbyOpen => 'Next session · lobby open';

  @override
  String nextTakeIn(String time) {
    return 'Next session · starts in $time';
  }

  @override
  String get enterLobby => 'Enter lobby';

  @override
  String studentsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n students',
      one: '$n student',
    );
    return '$_temp0';
  }

  @override
  String get todayStat => 'Today';

  @override
  String get weekStat => 'Week';

  @override
  String get sessionsLabel => 'sessions';

  @override
  String get attendStat => 'Attend.';

  @override
  String get laterToday => 'Later today';

  @override
  String teacherHubTitle(String course, String code) {
    return '$course · $code';
  }

  @override
  String get teacherHubSessions => 'Sessions';

  @override
  String get teacherHubStudents => 'Students';

  @override
  String get teacherHubPractice => 'Practice';

  @override
  String get teacherNewAssignment => 'New assignment';

  @override
  String get teacherNoAssignments =>
      'No assignments yet. Add one so students can practise after a session.';

  @override
  String teacherSubmittedCount(String count) {
    return '$count handed in';
  }

  @override
  String get teacherNewQuiz => 'New quiz';

  @override
  String get teacherEditQuiz => 'Edit quiz';

  @override
  String get teacherQuizResults => 'Results';

  @override
  String get teacherNoQuizzesBody =>
      'Write a short quiz to check what your students learned.';

  @override
  String get teacherMaterialSlides => 'Slides';

  @override
  String get teacherMaterialFile => 'File';

  @override
  String get teacherMaterialVideo => 'Video';

  @override
  String get teacherAddMaterial => 'Add material';

  @override
  String get teacherAddMaterialLede =>
      'Upload a file or a video from your phone, or share a link to slides, a web page or a video. Students open it from their library.';

  @override
  String get teacherMaterialAdded =>
      'Material added. Your students can open it now.';

  @override
  String get teacherNoMaterials =>
      'No materials yet. Add slides, files or links for this class.';

  @override
  String get teacherNoClassRecordings =>
      'No recordings yet. Each session is recorded when you start it.';

  @override
  String teacherMinutesShort(String count) {
    return '$count min';
  }

  @override
  String get teacherVideoTooLarge =>
      'That video is over 200 MB. Share it as a link instead.';

  @override
  String get teacherUploading => 'Uploading…';

  @override
  String get teacherUploadVideo => 'Upload a video';

  @override
  String teacherUploadedFile(String name) {
    return 'Uploaded: $name';
  }

  @override
  String get teacherUploadVideoHint => 'MP4, MOV or WEBM, up to 200 MB.';

  @override
  String get teacherMaterialTitleHint => 'e.g. Week 2 slides';

  @override
  String get teacherTitleRequired => 'Add a title of at least 2 characters.';

  @override
  String get teacherMaterialUrlHelper =>
      'A link students can open, starting with https://';

  @override
  String get filesAttach => 'Attach files';

  @override
  String filesAttachHint(int count, String n, String types, String mb) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$n files',
      one: '$n file',
    );
    return 'Up to $_temp0 · $types · $mb MB each';
  }

  @override
  String filesUploadingPercent(String percent) {
    return 'Uploading $percent%';
  }

  @override
  String filesRemove(String name) {
    return 'Remove $name';
  }

  @override
  String filesOpen(String name) {
    return 'Open $name';
  }

  @override
  String get filesYourFiles => 'Your files';

  @override
  String get filesSubmitted => 'Files';

  @override
  String filesTooMany(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'You can attach up to $count files.',
      one: 'You can attach up to $count file.',
    );
    return '$_temp0';
  }

  @override
  String get filesWaitForUpload => 'Wait for your files to finish uploading.';

  @override
  String filesTypeRefused(String name, String types) {
    return '$name can\'t be attached. Use $types.';
  }

  @override
  String filesTooLargeRefused(String name, String mb) {
    return '$name is larger than $mb MB.';
  }

  @override
  String filesEmptyRefused(String name) {
    return '$name is empty.';
  }

  @override
  String get filesErrType =>
      'This file type isn\'t supported. Try PDF, Word, PowerPoint, Excel, an image, ZIP or text.';

  @override
  String get filesErrEmpty => 'This file is empty. Choose another one.';

  @override
  String get filesErrTooLarge => 'This file is too large to upload.';

  @override
  String get filesErrMissing => 'Choose a file to upload.';

  @override
  String get filesErrForeignUrl => 'Upload the file here first, then add it.';

  @override
  String get filesErrEmptySubmission => 'Add a link, some text or a file.';

  @override
  String get filesUploadMaterial => 'Upload file';

  @override
  String filesUploadMaterialHint(String types, String mb) {
    return '$types, up to $mb MB. Students open it from their library.';
  }

  @override
  String get filesLinkKindsNote =>
      'To share a document, upload it. Links are for slides, web pages and videos.';

  @override
  String get filesEditAssignment => 'Edit assignment';

  @override
  String get filesSaveChanges => 'Save changes';

  @override
  String get filesAssignmentSaved => 'Assignment updated.';

  @override
  String get filesAssignmentActions => 'Assignment options';

  @override
  String get filesDeleteAssignment => 'Delete assignment';

  @override
  String filesDeleteAssignmentTitle(String title) {
    return 'Delete “$title”?';
  }

  @override
  String get filesDeleteAssignmentBody =>
      'This can\'t be undone. Once a student has submitted, the assignment can\'t be deleted, but you can still edit it.';

  @override
  String get filesDelete => 'Delete';

  @override
  String get filesAssignmentDeleted => 'Assignment deleted.';

  @override
  String get filesErrHasSubmissions =>
      'Students have already submitted this assignment, so it can\'t be deleted. You can still edit it.';

  @override
  String filesErrScoreTooHigh(String score) {
    return 'A submission is already graded $score, so the max score can\'t go below that.';
  }

  @override
  String get teacherUrlInvalid => 'Enter a full link, like https://example.com';

  @override
  String get teacherLinkSession => 'Session';

  @override
  String get teacherOptional => 'Optional';

  @override
  String get teacherNoSessionLink => 'Not linked to a session';

  @override
  String get teacherAssignmentCreated =>
      'Assignment created. Students can see it now.';

  @override
  String get teacherAssignmentLede =>
      'Students hand in text or a link before the due time. Late work is still accepted and marked late.';

  @override
  String get teacherAssignmentTitleHint => 'e.g. Build a budget spreadsheet';

  @override
  String get teacherInstructions => 'Instructions';

  @override
  String get teacherInstructionsHint =>
      'What should students do, and what does good work look like?';

  @override
  String get teacherDueHelper => 'Tap to choose the date and time.';

  @override
  String get teacherChangeDue => 'Choose due date';

  @override
  String get teacherDueInPast => 'Pick a time in the future.';

  @override
  String get teacherMaxScore => 'Max score';

  @override
  String get teacherMaxScoreHelper => 'The top score for this assignment.';

  @override
  String get teacherMaxScoreInvalid => 'Enter a whole number from 1 to 1000.';

  @override
  String get teacherCreateAssignment => 'Create assignment';

  @override
  String teacherGradedScore(String score, String max) {
    return 'Graded $score/$max';
  }

  @override
  String get teacherToGrade => 'To grade';

  @override
  String get teacherSubmissionsTitle => 'Submissions';

  @override
  String teacherOutOf(String max) {
    return 'Out of $max';
  }

  @override
  String get teacherNoSubmissions => 'Nothing handed in yet.';

  @override
  String teacherHandedIn(String when) {
    return 'Handed in $when';
  }

  @override
  String get teacherGradeSaved => 'Grade saved. The student has been told.';

  @override
  String get teacherTheirWork => 'Their work';

  @override
  String get teacherScore => 'Score';

  @override
  String teacherScoreHint(String max) {
    return '0 to $max';
  }

  @override
  String teacherScoreInvalid(String max) {
    return 'Enter a whole number from 0 to $max.';
  }

  @override
  String get teacherFeedback => 'Feedback';

  @override
  String get teacherFeedbackHint => 'What went well, and one thing to improve.';

  @override
  String get teacherSaveGrade => 'Save grade';

  @override
  String get teacherGradingTitle => 'Grading';

  @override
  String get teacherGradingLede =>
      'Work handed in across your classes, oldest first.';

  @override
  String get teacherAllGraded => 'All caught up. Nothing to grade.';

  @override
  String get teacherQuizSaved => 'Quiz saved.';

  @override
  String get teacherQuizNeedsQuestion =>
      'Add at least one question before publishing.';

  @override
  String get teacherPublishQuizTitle => 'Publish this quiz?';

  @override
  String get teacherPublishQuizBody =>
      'Your students will be notified and can start it. Once someone starts, the questions can\'t change.';

  @override
  String get teacherPublish => 'Publish';

  @override
  String get teacherQuizPublished =>
      'Quiz published. Students have been notified.';

  @override
  String get teacherQuizUnpublished => 'Quiz moved back to draft.';

  @override
  String get teacherDeleteQuizTitle => 'Delete this quiz?';

  @override
  String get teacherDeleteQuizBody =>
      'The quiz and its questions will be removed. This can\'t be undone.';

  @override
  String get teacherDelete => 'Delete';

  @override
  String get teacherQuizDeleted => 'Quiz deleted.';

  @override
  String get teacherTrue => 'True';

  @override
  String get teacherFalse => 'False';

  @override
  String get teacherSingleChoice => 'Single choice';

  @override
  String get teacherChooseAll => 'Choose all';

  @override
  String get teacherTrueFalse => 'True / false';

  @override
  String teacherQuizTotals(int questions, int points) {
    String _temp0 = intl.Intl.pluralLogic(
      questions,
      locale: localeName,
      other: '$questions questions',
      one: '$questions question',
    );
    String _temp1 = intl.Intl.pluralLogic(
      points,
      locale: localeName,
      other: '$points pts',
      one: '$points pt',
    );
    return '$_temp0 · $_temp1';
  }

  @override
  String get teacherQuizLocked =>
      'Students have started this quiz, so its questions are locked. You can still change the details.';

  @override
  String get teacherQuizDetails => 'Details';

  @override
  String get teacherQuizTitleHint => 'e.g. Module 1 check';

  @override
  String get teacherQuizInstructionsHint =>
      'Anything students should know before they start.';

  @override
  String get teacherQuizModule => 'Module';

  @override
  String get teacherQuizModuleHelper =>
      'Students see the quiz with this module\'s lessons.';

  @override
  String get teacherNoModule => 'No module';

  @override
  String get teacherNoDueDate => 'No due date';

  @override
  String get teacherTimeLimit => 'Time limit (minutes)';

  @override
  String get teacherUntimed => 'Untimed';

  @override
  String get teacherTimeLimitHelper => 'Leave empty for no time limit.';

  @override
  String get teacherTimeLimitInvalid =>
      'Enter 1 to 600 minutes, or leave it empty.';

  @override
  String get teacherAttempts => 'Attempts';

  @override
  String get teacherAttemptsHelper =>
      'How many times each student can take it.';

  @override
  String get teacherAddQuestion => 'Add question';

  @override
  String get teacherSaveDraft => 'Save draft';

  @override
  String get teacherUnpublish => 'Unpublish';

  @override
  String teacherQuestionN(String n) {
    return 'Question $n';
  }

  @override
  String get teacherRemoveQuestion => 'Remove question';

  @override
  String get teacherQuestionPrompt => 'Question';

  @override
  String get teacherQuestionPromptHint =>
      'Write the question students will answer.';

  @override
  String get teacherQuestionRequired => 'Write the question.';

  @override
  String get teacherMarkAllCorrect => 'Mark every correct answer.';

  @override
  String get teacherMarkOneCorrect => 'Mark the one correct answer.';

  @override
  String get teacherCorrectAnswer => 'Correct answer';

  @override
  String get teacherMarkCorrect => 'Mark as correct';

  @override
  String teacherOptionN(String n) {
    return 'Option $n';
  }

  @override
  String get teacherOptionRequired => 'Fill in this option or remove it.';

  @override
  String get teacherRemoveOption => 'Remove option';

  @override
  String get teacherAddOption => 'Add option';

  @override
  String get teacherPoints => 'Points';

  @override
  String get teacherAttendanceBreakdown => 'Breakdown';

  @override
  String teacherAttendanceRate(String rate) {
    return '$rate attended';
  }

  @override
  String teacherAttendanceFiltered(String mark) {
    return 'Showing $mark only. Tap again to show everyone.';
  }

  @override
  String teacherTodayAt(String time) {
    return 'Today $time';
  }

  @override
  String teacherTomorrowAt(String time) {
    return 'Tomorrow $time';
  }

  @override
  String get teacherNoUpcomingSessions =>
      'No sessions coming up this week. Add one from your class.';

  @override
  String get teacherNextSession => 'Next session';

  @override
  String get teacherReschedule => 'Move';

  @override
  String get teacherNeedsAtRisk => 'Students falling behind';

  @override
  String get teacherNeedsYou => 'Needs you';

  @override
  String get teacherNeedsGrade => 'Work to grade';

  @override
  String get teacherNeedsReschedule => 'Replies to your move requests';

  @override
  String get teacherNeedsProposals => 'Proposals with review notes';

  @override
  String get teacherNeedClassFirst => 'Create a class first.';

  @override
  String get teacherProposeCourse => 'Propose a course';

  @override
  String get teacherPostAnnouncement => 'Post an announcement';

  @override
  String get teacherUploadMaterial => 'Upload material';

  @override
  String get teacherQuickActions => 'Quick actions';

  @override
  String get teacherMyClasses => 'My classes';

  @override
  String get teacherSeeAll => 'See all';

  @override
  String teacherStudentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count students',
      one: '$count student',
    );
    return '$_temp0';
  }

  @override
  String get teacherEarningsSnapshot => 'Earnings';

  @override
  String get teacherEarningsUnavailable =>
      'Earnings couldn\'t load. Pull to refresh.';

  @override
  String get teacherThisPeriod => 'This month';

  @override
  String get teacherNextPayout => 'Next payout';

  @override
  String get teacherPayoutMissing => 'Add a payout method so we can pay you.';

  @override
  String get teacherAddPayoutMethod => 'Add';

  @override
  String get teacherFirstClassBody =>
      'Pick a course, set the schedule and send it for review.';

  @override
  String get teacherCreateFirstClass => 'Create your first class';

  @override
  String get noSessionsToday => 'No sessions today. Enjoy the quiet.';

  @override
  String rosterTitle(String code) {
    return '$code roster';
  }

  @override
  String get enrolledLabel => 'Enrolled';

  @override
  String get avgAttendance => 'Avg attend.';

  @override
  String get doneLabel => 'Done';

  @override
  String get searchStudents => 'Search students';

  @override
  String get atRisk => 'At risk';

  @override
  String get waitlist => 'Waitlist';

  @override
  String messageAll(String code) {
    return 'Message all of $code';
  }

  @override
  String get noStudents => 'No students yet.';

  @override
  String get noTeacherBatches => 'No batches assigned to you yet.';

  @override
  String get prepTitle => 'Session prep';

  @override
  String runOfShow(int min) {
    String _temp0 = intl.Intl.pluralLogic(
      min,
      locale: localeName,
      other: '$min min',
    );
    return 'Run of show · $_temp0';
  }

  @override
  String get addBlock => '+ Add block';

  @override
  String get blockLabel => 'Block label';

  @override
  String get atMinute => 'At minute';

  @override
  String get filesForStudents => 'Files for students';

  @override
  String get privateNotes => 'Private notes';

  @override
  String get reschedule => 'Reschedule';

  @override
  String get openLobby => 'Open lobby';

  @override
  String get moveSession => 'Move this session';

  @override
  String get newDay => 'New day';

  @override
  String get startTime => 'Start time';

  @override
  String get reason => 'Reason';

  @override
  String get notifyStudents => 'Notify students when approved';

  @override
  String get sendToAdmin => 'Send to admin for approval';

  @override
  String get adminReviews => 'Admins review requests within 24 h.';

  @override
  String get requestSent => 'Request sent to admin.';

  @override
  String get attendanceSummary => 'Attendance summary';

  @override
  String get present => 'Present';

  @override
  String get late => 'Late';

  @override
  String get leftEarly => 'Left early';

  @override
  String get absent => 'Absent';

  @override
  String get attendanceRule =>
      'Filled from LiveKit join/leave events. Full attendance = at least 75% of the session.';

  @override
  String publishRecording(String code) {
    return 'Publish recording to $code';
  }

  @override
  String ranFor(String duration) {
    return 'ran $duration';
  }

  @override
  String get earningsTitle => 'Earnings';

  @override
  String get earnedSoFar => 'Earned this month so far';

  @override
  String nextPayoutOn(String date) {
    return 'pays $date';
  }

  @override
  String get displayOnly => 'Display only: payouts are always made in AED.';

  @override
  String get pendingLabel => 'Pending';

  @override
  String get scheduledRest => 'still scheduled this month';

  @override
  String get availableLabel => 'Available';

  @override
  String get lifetimePaid => 'Paid to date';

  @override
  String get byBatch => 'This period by batch';

  @override
  String get netRevenueNote =>
      'Net revenue = paid enrollments − refunds − Stripe fees. A refund after a payout is deducted from your next payout.';

  @override
  String get payoutMethod => 'Payout method';

  @override
  String get verified => 'Verified';

  @override
  String get unverified => 'Pending verification';

  @override
  String get bankName => 'Bank';

  @override
  String get accountHolder => 'Account holder';

  @override
  String get iban => 'IBAN';

  @override
  String get swift => 'SWIFT';

  @override
  String get payoutCurrency => 'Payout currency';

  @override
  String get changeBank => 'Change bank account';

  @override
  String get addBank => 'Add bank account';

  @override
  String get changeBankNote =>
      'A new account is re-verified by finance before the next run. Payouts pause until it is approved.';

  @override
  String get history => 'History';

  @override
  String get noPayouts => 'No payouts yet.';

  @override
  String get noBankDetails => 'Add a UAE bank account to receive payouts.';

  @override
  String get ibanInvalid => 'UAE IBAN: AE + 21 digits';

  @override
  String get swiftInvalid => '8 or 11 letters/digits';

  @override
  String sessionsDelivered(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n sessions delivered',
      one: '$n session delivered',
    );
    return '$_temp0';
  }

  @override
  String opsGreeting(String name) {
    return 'Ops, $name';
  }

  @override
  String get onAirLabel => 'Live now';

  @override
  String roomsPeople(int rooms, int people) {
    String _temp0 = intl.Intl.pluralLogic(
      rooms,
      locale: localeName,
      other: '$rooms rooms',
      one: '$rooms room',
    );
    String _temp1 = intl.Intl.pluralLogic(
      people,
      locale: localeName,
      other: '$people people',
      one: '$people person',
    );
    return '$_temp0 · $_temp1';
  }

  @override
  String get sessionsToday => 'Sessions today';

  @override
  String get activeBatches => 'Active batches';

  @override
  String get revenueMonth => 'Revenue this month';

  @override
  String get seatsFilled => 'Seats filled';

  @override
  String get needsYou => 'Needs you';

  @override
  String get noAlerts => 'Nothing needs a decision right now.';

  @override
  String get liveMonitorTitle => 'Live now';

  @override
  String autoRefresh(String s) {
    return 'auto-refresh ${s}s';
  }

  @override
  String liveN(String n) {
    return '$n live';
  }

  @override
  String get joinSilently => 'Join silently';

  @override
  String get noLiveRooms => 'No sessions are live right now.';

  @override
  String participantsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n people',
      one: '$n person',
    );
    return '$_temp0';
  }

  @override
  String get recordingOn => 'recording';

  @override
  String get batchesTitle => 'Batches';

  @override
  String get seatsLabel => 'seats';

  @override
  String get nextSession => 'Next session';

  @override
  String get teacherLabel => 'Teacher';

  @override
  String sessionsRun(int done, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total sessions run',
      one: '$total session run',
    );
    return '$done of $_temp0';
  }

  @override
  String get transfersToVerify => 'Transfers to verify';

  @override
  String get payoutRuns => 'Payout runs';

  @override
  String get noTransfers => 'No transfers waiting.';

  @override
  String get noPayoutRuns => 'No payout runs yet.';

  @override
  String transferTitle(String ref) {
    return 'Transfer $ref';
  }

  @override
  String get receiptPreview => 'Receipt preview';

  @override
  String get openFullSize => 'Open full size';

  @override
  String get noReceipt => 'No receipt uploaded yet.';

  @override
  String get studentLabel => 'Student';

  @override
  String get batchLabel => 'Batch';

  @override
  String get expected => 'Expected';

  @override
  String get receivedStatement => 'Received (bank statement, AED)';

  @override
  String get rejectReason => 'Reject reason (if rejecting)';

  @override
  String get reasonShort => 'Amount short';

  @override
  String get reasonReference => 'Reference missing';

  @override
  String get reasonUnreadable => 'Receipt unreadable';

  @override
  String get reasonNotReceived => 'Not received yet';

  @override
  String get reject => 'Reject';

  @override
  String get approve => 'Approve';

  @override
  String get decline => 'Decline';

  @override
  String get approveEnroll => 'Approve & enroll';

  @override
  String get requestNewReceipt => 'Ask for a new receipt';

  @override
  String get reviewDone => 'Decision saved.';

  @override
  String payoutRunTitle(String period) {
    return 'Payout run · $period';
  }

  @override
  String get awaitingApproval => 'Awaiting approval';

  @override
  String totalTeachers(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n teachers',
      one: '$n teacher',
    );
    return 'Total · $_temp0';
  }

  @override
  String heldNote(String n) {
    return '$n held: bank account not verified or below the minimum.';
  }

  @override
  String approvePayouts(int n, String amount) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'Approve $n payouts · $amount',
      one: 'Approve $n payout · $amount',
    );
    return '$_temp0';
  }

  @override
  String get downloadFile => 'Download bank transfer file';

  @override
  String get runApproved => 'Run approved.';

  @override
  String get held => 'Held';

  @override
  String get ready => 'Ready';

  @override
  String get paidLabel => 'Paid';

  @override
  String get carriedOver => 'Carried over';

  @override
  String alertTransfersToVerify(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n bank transfers to verify',
      one: '$n bank transfer to verify',
    );
    return '$_temp0';
  }

  @override
  String alertSeatHoldsExpiring(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n seat holds expire within 24 h',
      one: '$n seat hold expires within 24 h',
    );
    return '$_temp0';
  }

  @override
  String alertTeacherBankUnverified(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n teachers\' bank details to verify',
      one: '$n teacher\'s bank details to verify',
    );
    return '$_temp0';
  }

  @override
  String alertPayoutsHeld(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n payouts on hold',
      one: '$n payout on hold',
    );
    return '$_temp0';
  }

  @override
  String rescheduleRequestTitle(String teacher, String slate) {
    return '$teacher asks to move $slate';
  }

  @override
  String get newPayoutRun => 'New payout run';

  @override
  String get myRescheduleRequests => 'My requests';

  @override
  String get requestPending => 'Pending';

  @override
  String get requestApproved => 'Approved';

  @override
  String get requestDeclined => 'Declined';

  @override
  String get videoDevMode =>
      'Video is off in this environment (LiveKit isn\'t configured). Chat and raised hands still work.';

  @override
  String get certificatesTitle => 'Certificates';

  @override
  String get certificatesEmptyTitle => 'Proof you learned it';

  @override
  String get certificatesEmptyBody =>
      'Attend at least 80% of your class\'s live sessions and your certificate appears here when the class ends. Anyone can verify it.';

  @override
  String get certificatesEarned => 'Earned';

  @override
  String get certificatesInProgress => 'In progress';

  @override
  String certificateAttended(String attended, String total) {
    return 'Attended $attended/$total';
  }

  @override
  String certificateWithTeacher(String name) {
    return 'with $name';
  }

  @override
  String certificateSessionsNeeded(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n more sessions needed',
      one: '$n more session needed',
    );
    return '$_temp0';
  }

  @override
  String get certificateOneSessionNeeded => '1 more session needed';

  @override
  String get certificateRequirementMet =>
      'Attendance met — your certificate is issued when the class ends.';

  @override
  String get certificateUnreachable =>
      'Not enough sessions left to reach 80% in this class.';

  @override
  String certificateAttendedOfRequired(int attended, int required) {
    String _temp0 = intl.Intl.pluralLogic(
      required,
      locale: localeName,
      other: '$required sessions to earn it',
      one: '$required session to earn it',
    );
    return '$attended of $_temp0';
  }

  @override
  String get certificateNew => 'New';

  @override
  String get certificateOfCompletion => 'Certificate of completion';

  @override
  String get certificateAwardedTo => 'Awarded to';

  @override
  String get certificateForCompleting => 'for completing';

  @override
  String get certificateBatch => 'Class';

  @override
  String get certificateTeacher => 'Teacher';

  @override
  String get certificateIssued => 'Issued';

  @override
  String get certificateDates => 'Dates';

  @override
  String get certificateVerifyCode => 'Verify code';

  @override
  String get certificateShare => 'Share';

  @override
  String get certificateLinkCopied => 'Verification link copied';

  @override
  String get certificateCompleteTitle => 'Course complete.';

  @override
  String certificateCompleteBody(int attended, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total live sessions.',
      one: '$total live session.',
    );
    return 'You attended $attended of $_temp0';
  }

  @override
  String certificateVerifyHint(String url) {
    return 'Proof of the skill. Anyone can check it at $url';
  }

  @override
  String waitlistPosition(String position, String total) {
    return '$position in line · of $total';
  }

  @override
  String get waitlistNextInLine => 'You\'re next in line';

  @override
  String startsOnDate(String date) {
    return 'Starts $date';
  }

  @override
  String waitlistJoinedOn(String date) {
    return 'Joined $date';
  }

  @override
  String get waitlistWhatNext => 'What happens next';

  @override
  String get waitlistStepSeat =>
      'When a place frees up, it goes to the first person in line.';

  @override
  String get waitlistStepNotify =>
      'We\'ll notify and email you the moment it\'s yours.';

  @override
  String get waitlistStepHold =>
      'You then have 24 hours to check out before the place moves on.';

  @override
  String get waitlistNoCharge => 'Nothing is charged while you wait.';

  @override
  String get waitlistLeave => 'Leave waitlist';

  @override
  String get waitlistLeaveConfirmTitle => 'Leave the waitlist?';

  @override
  String waitlistLeaveConfirmBody(String batch) {
    return 'You\'ll lose your place for $batch. If you rejoin later, you\'ll start at the back of the line.';
  }

  @override
  String get waitlistStay => 'Stay in line';

  @override
  String get waitlistLeft => 'You left the waitlist';

  @override
  String get waitlistSeatOpen => 'A place opened for you';

  @override
  String waitlistHeldFor(String time) {
    return 'Held for you · $time';
  }

  @override
  String get waitlistHoldExpired => 'The hold has expired';

  @override
  String get waitlistClaimSeat => 'Claim your place';

  @override
  String get teacherAbout => 'About';

  @override
  String get teacherTeachesIn => 'Teaches in';

  @override
  String get teacherCourses => 'Courses';

  @override
  String get teacherUpcomingBatches => 'Upcoming classes';

  @override
  String get teacherViewProfile => 'View profile';

  @override
  String get teacherBatchFull => 'Full';

  @override
  String get certificateAttendance => 'Attendance';

  @override
  String waitlistOfTotal(String total) {
    return 'of $total';
  }

  @override
  String get deleteAccount => 'Delete account';

  @override
  String get deleteAccountTitle => 'Delete your account?';

  @override
  String get deleteAccountBody =>
      'This permanently deletes your profile, enrolments, certificates and messages. Payment records are kept without your name for accounting. This cannot be undone.';

  @override
  String get deleteAccountTypeHint => 'Type DELETE to confirm';

  @override
  String get deleteAccountConfirm => 'Delete permanently';

  @override
  String get deleteAccountFailed =>
      'Couldn\'t delete the account. Try again or contact support.';

  @override
  String get deleteAccountTeacher =>
      'Teachers and admins can\'t delete their account while they have batches. Contact support.';

  @override
  String get privacyPolicy => 'Privacy policy';

  @override
  String get termsOfService => 'Terms of service';

  @override
  String get legal => 'Legal';

  @override
  String get termsLead => 'By continuing you agree to the';

  @override
  String get andLabel => 'and';

  @override
  String get deleteAccountOrderPending =>
      'A bank transfer for one of your orders is being checked. Try again once it\'s settled.';

  @override
  String get appearance => 'Appearance';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get themeSystemHint => 'Match your phone\'s setting';

  @override
  String get pushNotifications => 'Push notifications';

  @override
  String get pushOn => 'On';

  @override
  String get pushOff => 'Off';

  @override
  String get pushSettingsHint =>
      'Change notifications in your phone\'s Settings → Apps → Azza.';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get forgotPasswordBody =>
      'Enter your account email and we\'ll send you a link to choose a new password.';

  @override
  String get sendResetLink => 'Send reset link';

  @override
  String get resetLinkSent =>
      'If that email has an account, a reset link is on its way.';

  @override
  String get showPassword => 'Show password';

  @override
  String get hidePassword => 'Hide password';

  @override
  String get errNetwork =>
      'No connection to Azza. Check your network and try again.';

  @override
  String get errTimeout => 'Azza took too long to answer. Try again.';

  @override
  String get errCancelled => 'Cancelled.';

  @override
  String get errSignedOut => 'Your session ended. Please sign in again.';

  @override
  String get errForbidden => 'You don\'t have access to this.';

  @override
  String get errNotFound => 'We couldn\'t find that. It may have been removed.';

  @override
  String get errBadCredentials => 'That email and password don\'t match.';

  @override
  String get errEmailTaken =>
      'An account with this email already exists. Try signing in.';

  @override
  String get errTooMany => 'Too many attempts. Wait a minute and try again.';

  @override
  String get errServer =>
      'Something went wrong on our side. Try again shortly.';

  @override
  String get errGeneric => 'Something went wrong. Try again.';

  @override
  String get profileSaved => 'Profile saved.';

  @override
  String get timezoneHint => 'Live session times are shown in this timezone.';

  @override
  String useDeviceTimezone(String zone) {
    return 'Use this phone\'s timezone: $zone';
  }

  @override
  String get changePassword => 'Change password';

  @override
  String get currentPassword => 'Current password';

  @override
  String get newPassword => 'New password';

  @override
  String get passwordChanged =>
      'Password changed. Other devices were signed out.';

  @override
  String get changePasswordNote =>
      'Changing your password signs you out on your other devices.';

  @override
  String get payAppStore => 'App Store';

  @override
  String get payAppStoreSub => 'In-app purchase, charged to your Apple Account';

  @override
  String get payWithAppStore => 'Pay with the App Store';

  @override
  String get appStoreNote =>
      'Payment is handled by Apple. Your place is confirmed as soon as the purchase completes.';

  @override
  String appStoreBuy(String price) {
    return 'Buy · $price';
  }

  @override
  String get appStoreConfirming => 'Confirming your purchase…';

  @override
  String get appStorePending =>
      'Waiting for approval. We\'ll enrol you as soon as the App Store confirms the purchase.';

  @override
  String get appStoreFailed => 'The purchase didn\'t go through.';

  @override
  String get appStoreUnavailable =>
      'In-app purchases aren\'t available on this device.';

  @override
  String get appStoreRetryLater =>
      'We couldn\'t confirm the purchase yet. It\'s safe — we\'ll retry automatically the next time you open the app.';

  @override
  String get appStoreRejected =>
      'We couldn\'t apply this purchase to your order. Contact support — Apple can refund the purchase.';

  @override
  String get enrolOnWebsite => 'Enrol on our website';

  @override
  String get enrolOnWebsiteBody =>
      'This class isn\'t available as an in-app purchase.';

  @override
  String get clear => 'Clear';

  @override
  String get accountTitle => 'Account';

  @override
  String get accountRowHint => 'Photo, password, delete';

  @override
  String get profileSection => 'Profile';

  @override
  String get changePhoto => 'Change photo';

  @override
  String get emailLockedNote =>
      'Your sign-in email. Contact support to change it.';

  @override
  String get useThisPhone => 'Use this phone\'s';

  @override
  String get saveChanges => 'Save changes';

  @override
  String get currentPasswordRequired => 'Enter your current password.';

  @override
  String get dangerZone => 'Danger zone';

  @override
  String get deleteAccountSummary =>
      'Permanently delete your account, enrolments and certificates. This can\'t be undone.';

  @override
  String get takePhoto => 'Take a photo';

  @override
  String get chooseFromLibrary => 'Choose from library';

  @override
  String get photoPickFailed =>
      'Couldn\'t open the camera or photos. Check Azza\'s permissions in Settings.';

  @override
  String get addPhotoTitle => 'Add your photo';

  @override
  String get addPhotoBody =>
      'Your teacher sees your photo on the class list and in live sessions, so they know who\'s in the class.';

  @override
  String get addPhotoTips =>
      'Use a clear, recent photo of your face. Only your teachers and classmates see it.';

  @override
  String get addPhotoAction => 'Add photo';

  @override
  String get watchIntro => 'Watch the intro';

  @override
  String get watchIntroHint => 'A short look at the course and the teacher';

  @override
  String get statusPendingReview => 'Waiting for review';

  @override
  String get statusPublished => 'Published';

  @override
  String get statusArchived => 'Archived';

  @override
  String get myCoursesTitle => 'My courses';

  @override
  String get proposeCourse => 'Propose a course';

  @override
  String get noProposedCourses => 'You haven\'t proposed a course yet.';

  @override
  String get noProposedCoursesBody =>
      'Propose a course and an admin will review it before it goes live.';

  @override
  String get changesRequested => 'Changes requested';

  @override
  String get waitingForReviewBody =>
      'An admin is reviewing this. You can still make changes.';

  @override
  String get publishedLockedBody =>
      'This course is published. Ask an admin if it needs changes.';

  @override
  String get editCourse => 'Edit course';

  @override
  String get newCourse => 'New course';

  @override
  String get courseBasics => 'Basics';

  @override
  String get courseTitleEn => 'Title (English)';

  @override
  String get courseTitleAr => 'Title (Arabic)';

  @override
  String get courseCategory => 'Category';

  @override
  String get courseLevel => 'Level';

  @override
  String get levelBeginner => 'Beginner';

  @override
  String get levelIntermediate => 'Intermediate';

  @override
  String get levelAdvanced => 'Advanced';

  @override
  String get coursePriceAed => 'Price (AED)';

  @override
  String get courseDescription => 'Description';

  @override
  String get descriptionEn => 'Description (English)';

  @override
  String get descriptionAr => 'Description (Arabic)';

  @override
  String get descriptionHint => 'At least 20 characters.';

  @override
  String get coverPhoto => 'Cover photo';

  @override
  String get addCoverPhoto => 'Add cover photo';

  @override
  String get changeCoverPhoto => 'Change photo';

  @override
  String get removeCoverPhoto => 'Remove photo';

  @override
  String get coverPhotoHint =>
      'Without a photo, the course shows its title on the colour below.';

  @override
  String get coverColour => 'Cover colour';

  @override
  String get coverSun => 'Sun';

  @override
  String get coverSky => 'Sky';

  @override
  String get coverSage => 'Sage';

  @override
  String get coverPeach => 'Peach';

  @override
  String get modulesTitle => 'Modules';

  @override
  String moduleTitleEn(String n) {
    return 'Module $n (English)';
  }

  @override
  String moduleTitleAr(String n) {
    return 'Module $n (Arabic)';
  }

  @override
  String get addModule => 'Add module';

  @override
  String get removeModule => 'Remove module';

  @override
  String get moveUp => 'Move up';

  @override
  String get moveDown => 'Move down';

  @override
  String get noModulesYet => 'Add at least one module before you submit.';

  @override
  String get saveDraft => 'Save draft';

  @override
  String get submitForReview => 'Submit for review';

  @override
  String get draftSaved => 'Draft saved.';

  @override
  String get sentForReview => 'Sent for review.';

  @override
  String get titleRequired => 'Add an English title.';

  @override
  String get descriptionTooShort =>
      'Write at least 20 characters in the English description.';

  @override
  String get categoryRequired => 'Add a category.';

  @override
  String get priceInvalid => 'Enter a price in AED.';

  @override
  String get moduleTitleRequired => 'Every module needs an English title.';

  @override
  String get uploadingPhoto => 'Uploading…';

  @override
  String get newBatch => 'New batch';

  @override
  String get batchCourse => 'Course';

  @override
  String get pickCourse => 'Pick a course';

  @override
  String get noBatchableCourses => 'No courses yet. Propose one first.';

  @override
  String get batchCode => 'Batch code';

  @override
  String get batchCodeHint => 'B and 2–4 digits, e.g. B07';

  @override
  String get batchCodeInvalid => 'Use B and 2–4 digits, e.g. B07.';

  @override
  String get batchSeats => 'Seats';

  @override
  String get seatsInvalid => 'Seats must be between 1 and 500.';

  @override
  String get sessionLanguage => 'Session language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageArabic => 'Arabic';

  @override
  String get firstDay => 'First day';

  @override
  String get weekdaysLabel => 'Days';

  @override
  String get pickWeekdays => 'Pick at least one day.';

  @override
  String get sessionLength => 'Length (minutes)';

  @override
  String get lengthInvalid => 'Length must be 15–480 minutes.';

  @override
  String get sessionCountLabel => 'Sessions';

  @override
  String get sessionCountInvalid => 'Sessions must be 1–200.';

  @override
  String get previewSchedule => 'Preview schedule';

  @override
  String lastSessionOn(String date) {
    return 'Last session $date';
  }

  @override
  String conflictCount(String count) {
    return 'Clashes with your other batches: $count';
  }

  @override
  String conflictWith(String batch) {
    return 'Clashes with $batch';
  }

  @override
  String get noConflicts => 'No clashes with your other batches.';

  @override
  String get createBatch => 'Create batch';

  @override
  String get batchCreated => 'Batch saved as a draft.';

  @override
  String get batchDraftBody =>
      'This batch is a draft. Submit it so an admin can open enrollment.';

  @override
  String get batchPendingBody => 'An admin is reviewing this batch.';

  @override
  String get toReviewTab => 'To review';

  @override
  String get coursesSection => 'Courses';

  @override
  String get batchesSection => 'Batches';

  @override
  String get noPendingReviews => 'Nothing is waiting for review.';

  @override
  String get sendBack => 'Send back';

  @override
  String get sendBackTitle => 'What needs to change?';

  @override
  String get sendBackNote => 'Note to the teacher';

  @override
  String get sendBackNoteTooShort => 'Write at least 3 characters.';

  @override
  String submittedOn(String date) {
    return 'Submitted $date';
  }

  @override
  String modulesCount(String count) {
    return 'Modules: $count';
  }

  @override
  String proposedBy(String name) {
    return 'By $name';
  }

  @override
  String get errCourseLocked =>
      'This course is published, so only an admin can change it.';

  @override
  String get errCourseIncomplete =>
      'Add a description of at least 20 characters and one module before you submit.';

  @override
  String get errAlreadySubmitted => 'This is already waiting for review.';

  @override
  String get errCourseNotPublished => 'Approve the course before its batches.';

  @override
  String get errBatchLocked =>
      'This batch is approved, so only an admin can change it.';

  @override
  String get errNotPendingReview => 'This is no longer waiting for review.';

  @override
  String get errScheduleConflict => 'You already teach at some of these times.';

  @override
  String get errScheduleIncomplete =>
      'Not every session fits this schedule. Check the days and dates.';

  @override
  String get errCourseArchived => 'This course is archived.';

  @override
  String get whatYoullLearn => 'What you\'ll learn';

  @override
  String get requirementsTitle => 'Requirements';

  @override
  String get audienceTitle => 'Who it\'s for';

  @override
  String get faqTitle => 'FAQ';

  @override
  String totalHoursLive(String hours) {
    return '$hours h live';
  }

  @override
  String ratingSemantics(String avg, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count reviews',
      one: '$count review',
    );
    return 'Rated $avg out of 5 from $_temp0';
  }

  @override
  String get reviewsTitle => 'Reviews';

  @override
  String reviewsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count reviews',
      one: '$count review',
    );
    return '$_temp0';
  }

  @override
  String get noReviewsYet => 'No reviews yet.';

  @override
  String get loadMore => 'Load more';

  @override
  String get writeReview => 'Write a review';

  @override
  String get editReview => 'Edit your review';

  @override
  String get yourReview => 'Your review';

  @override
  String get reviewBodyLabel => 'What stood out?';

  @override
  String get ratingRequired => 'Pick a star rating.';

  @override
  String get postReview => 'Post review';

  @override
  String get reviewSaved => 'Thanks for your review.';

  @override
  String get deleteReview => 'Delete review';

  @override
  String get deleteReviewConfirm => 'Delete your review?';

  @override
  String get reviewDeleted => 'Review deleted.';

  @override
  String starsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n stars',
      one: '$n star',
    );
    return '$_temp0';
  }

  @override
  String get replyAction => 'Reply';

  @override
  String replyTo(String name) {
    return 'Reply to $name';
  }

  @override
  String get teacherReply => 'Teacher\'s reply';

  @override
  String get replyTooShort => 'Write at least 2 characters.';

  @override
  String get replySent => 'Reply posted.';

  @override
  String get hideReview => 'Hide';

  @override
  String get unhideReview => 'Unhide';

  @override
  String get hiddenLabel => 'Hidden';

  @override
  String get relatedTitle => 'You might also like';

  @override
  String get shareCourse => 'Share';

  @override
  String get saveCourse => 'Save';

  @override
  String get unsaveCourse => 'Remove from saved';

  @override
  String get savedToast => 'Saved.';

  @override
  String get unsavedToast => 'Removed from saved.';

  @override
  String get filters => 'Filters';

  @override
  String get sortLabel => 'Sort by';

  @override
  String get sortNewest => 'Newest';

  @override
  String get sortRating => 'Top rated';

  @override
  String get sortPriceAsc => 'Price: low to high';

  @override
  String get sortPriceDesc => 'Price: high to low';

  @override
  String get sortPopular => 'Most popular';

  @override
  String get anyOption => 'Any';

  @override
  String get minRatingLabel => 'Rating';

  @override
  String ratingAtLeast(String n) {
    return '$n+ stars';
  }

  @override
  String get priceRangeAed => 'Price range (AED)';

  @override
  String get minPrice => 'Min';

  @override
  String get maxPrice => 'Max';

  @override
  String get priceRangeInvalid => 'The minimum price is above the maximum.';

  @override
  String get applyFilters => 'Show results';

  @override
  String get resetFilters => 'Reset';

  @override
  String get featuredTitle => 'Featured';

  @override
  String get savedCoursesTitle => 'Saved courses';

  @override
  String get noSavedTitle => 'Nothing saved yet.';

  @override
  String get noSavedBody => 'Tap the heart on a course to keep it here.';

  @override
  String bulletEn(String n) {
    return 'Point $n (English)';
  }

  @override
  String bulletAr(String n) {
    return 'Point $n (Arabic)';
  }

  @override
  String get addPoint => 'Add point';

  @override
  String get removePoint => 'Remove point';

  @override
  String faqQuestionEn(String n) {
    return 'Question $n (English)';
  }

  @override
  String faqAnswerEn(String n) {
    return 'Answer $n (English)';
  }

  @override
  String faqQuestionAr(String n) {
    return 'Question $n (Arabic)';
  }

  @override
  String faqAnswerAr(String n) {
    return 'Answer $n (Arabic)';
  }

  @override
  String get addQuestion => 'Add question';

  @override
  String get removeQuestion => 'Remove question';

  @override
  String get faqIncomplete =>
      'Each question needs an English question and answer.';

  @override
  String moduleDescriptionEn(String n) {
    return 'Module $n description (English)';
  }

  @override
  String moduleDescriptionAr(String n) {
    return 'Module $n description (Arabic)';
  }

  @override
  String get errReviewNotEligible =>
      'You can review this course after attending one of its live sessions.';

  @override
  String get teacherRecordingsTitle => 'Your recordings';

  @override
  String get teacherRecordingsLede =>
      'Every session you teach is recorded automatically when you press Start. Recordings show here once processed, usually within the hour.';

  @override
  String get teacherRecordingsEmpty => 'No recordings yet';

  @override
  String get shareRecording => 'Share or save the recording';

  @override
  String get playRecording => 'Play recording';

  @override
  String get instructorsTitle => 'Instructors';

  @override
  String get instructorsLede =>
      'The people who teach on Azza. Open a profile to see their courses and open classes.';

  @override
  String get instructorsEmpty => 'No instructors yet';

  @override
  String get meetInstructors => 'Meet the instructors';

  @override
  String get meetInstructorsHint => 'Who teaches on Azza, and what';

  @override
  String get allInstructors => 'All instructors';

  @override
  String instructorCoursesN(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count courses',
      one: '$count course',
    );
    return '$_temp0';
  }

  @override
  String instructorOpenBatchesN(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count open classes',
      one: '$count open class',
    );
    return '$_temp0';
  }

  @override
  String get teachOnAzza => 'Teach on Azza';

  @override
  String get teachRowHint => 'Apply';

  @override
  String get teachSignUpLink => 'Want to teach on Azza?';

  @override
  String get teachSignUpHint =>
      'Create your account first, then open Me → Teach on Azza to apply.';

  @override
  String get teachPitchTitle => 'Teach what you know.';

  @override
  String get teachPitchBody =>
      'Guide small classes of learners across the region, in Arabic or English, with lessons, practice and live sessions. Tell us who you are and what you\'d teach; our team reviews every application, usually within a few days.';

  @override
  String get applySectionAbout => 'About you';

  @override
  String get applySectionTeach => 'What you\'d teach';

  @override
  String get applySectionExperience => 'Your experience';

  @override
  String get applySectionContact => 'Links and contact';

  @override
  String get applyHeadline => 'Headline';

  @override
  String get applyHeadlineHint => 'Product designer · 8 years at agencies';

  @override
  String get applyBio => 'Short bio';

  @override
  String get applyBioHint =>
      'Who you are, how you teach and who you help. At least 40 characters.';

  @override
  String get applyCategories => 'Categories (1 to 5)';

  @override
  String get applyLanguages => 'Teaching languages';

  @override
  String get applyExperience => 'Teaching experience';

  @override
  String get applyExperienceHint =>
      '3 years running weekend workshops for groups of 20 adults';

  @override
  String get applySample => 'Sample or portfolio link (optional)';

  @override
  String get applySampleHint => 'https://example.com/portfolio';

  @override
  String get applyPhone => 'Phone (optional)';

  @override
  String get applyPhoneHint => '+971 50 123 4567';

  @override
  String get applySubmit => 'Send application';

  @override
  String get applySent => 'Application sent. We\'ll let you know.';

  @override
  String get applyHeadlineInvalid => 'Write 4 to 120 characters.';

  @override
  String get applyBioInvalid => 'Write 40 to 2000 characters.';

  @override
  String get applyExperienceInvalid => 'Write 20 to 1500 characters.';

  @override
  String get applyCategoriesInvalid => 'Pick 1 to 5 categories.';

  @override
  String get applyLanguagesInvalid => 'Pick at least one language.';

  @override
  String get applyUrlInvalid => 'Use a full https:// link.';

  @override
  String get applyPendingTitle => 'Your application is being reviewed';

  @override
  String get applyPendingBody =>
      'We\'ll notify you as soon as there\'s a decision. Meanwhile, you can keep learning as usual.';

  @override
  String get applyRejectedTitle => 'Your last application wasn\'t approved';

  @override
  String get applyRejectedLead =>
      'The reviewer\'s note is below. You\'re welcome to apply again.';

  @override
  String get applyApprovedTitle => 'You can teach now';

  @override
  String get applyApprovedBody =>
      'Your instructor account is ready. Refresh to open the teacher studio and propose your first course.';

  @override
  String get applyRefresh => 'Refresh my account';

  @override
  String get refresh => 'Refresh';

  @override
  String get errAlreadyInstructor => 'You already teach on Azza.';

  @override
  String get errApplicationPending =>
      'Your application is already being reviewed.';

  @override
  String get errApplicationDecided => 'This application was already decided.';

  @override
  String get instructorApplicationsSection => 'Instructor applications';

  @override
  String get applicantExperience => 'Experience';

  @override
  String get openSample => 'Open sample';

  @override
  String get declineApplicationTitle => 'Why are you declining?';

  @override
  String get declineNoteLabel => 'Note to the applicant';

  @override
  String get declineNoteHint => 'Please add a short teaching sample.';

  @override
  String get sendBackNoteHint => 'Add a module on brushes and paper.';

  @override
  String get nameHint => 'Sara Kamal';

  @override
  String get emailHint => 'name@example.com';

  @override
  String get passwordHint => 'Your password';

  @override
  String get newPasswordHint => 'At least 8 characters';

  @override
  String get errQuizTimeUp =>
      'Time ran out on this attempt, so it was recorded as 0.';

  @override
  String get errQuizClosed => 'This quiz is closed.';

  @override
  String get errNoAttemptsLeft => 'You have no attempts left on this quiz.';

  @override
  String get errAttemptNotStarted => 'Start the quiz before submitting.';

  @override
  String get lessonsTitle => 'Lessons';

  @override
  String lessonsCountN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n lessons',
      one: '$n lesson',
    );
    return '$_temp0';
  }

  @override
  String lessonNofM(String n, String m) {
    return 'Lesson $n of $m';
  }

  @override
  String get lessonHasVideo => 'Video';

  @override
  String lessonAttachmentsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n attachments',
      one: '$n attachment',
    );
    return '$_temp0';
  }

  @override
  String get lessonAttachments => 'Attachments';

  @override
  String get noLessons => 'No lessons yet';

  @override
  String get noLessonsBody =>
      'Your teacher hasn\'t added lessons to this course yet.';

  @override
  String get previousLesson => 'Previous';

  @override
  String get nextLesson => 'Next lesson';

  @override
  String get watchLessonVideo => 'Watch the lesson video';

  @override
  String get watchLessonVideoHint => 'Opens in your video player';

  @override
  String get videoOnYoutube => 'Opens on YouTube';

  @override
  String get videoOnVimeo => 'Opens on Vimeo';

  @override
  String get myQuizzesTitle => 'My quizzes';

  @override
  String get quizzesTitle => 'Quizzes';

  @override
  String get noQuizzes => 'No quizzes yet';

  @override
  String get noQuizzesBody => 'Quizzes from your teachers will show up here.';

  @override
  String get noQuestions => 'This quiz has no questions.';

  @override
  String get quizzesToDo => 'To do';

  @override
  String get quizzesDone => 'Done';

  @override
  String get quizzesWebOnly =>
      'Quizzes are created and edited on the web. Here you can follow your students\' results.';

  @override
  String get quizLabel => 'Quiz';

  @override
  String get quizOpen => 'Open';

  @override
  String get quizInProgress => 'In progress';

  @override
  String get quizSubmitted => 'Submitted';

  @override
  String get quizMissed => 'Missed';

  @override
  String quizQuestionsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n questions',
      one: '$n question',
    );
    return '$_temp0';
  }

  @override
  String quizMinutesN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n min',
    );
    return '$_temp0';
  }

  @override
  String quizPointsN(String n) {
    return '$n pts';
  }

  @override
  String quizBest(String score) {
    return 'Best $score';
  }

  @override
  String quizAttemptsUsed(String used, String max) {
    return 'Attempts $used/$max';
  }

  @override
  String get quizQuestionsLabel => 'Questions';

  @override
  String get quizPointsLabel => 'Points';

  @override
  String get quizTimeLimitLabel => 'Time limit';

  @override
  String get quizNoTimeLimit => 'No time limit';

  @override
  String get quizAttemptsLabel => 'Attempts';

  @override
  String get quizDueLabel => 'Due';

  @override
  String get quizBestScore => 'Your best score';

  @override
  String get quizYourAttempts => 'Your attempts';

  @override
  String get quizTimedOut => 'Time ran out';

  @override
  String get quizStart => 'Start quiz';

  @override
  String get quizTryAgain => 'Try again';

  @override
  String get quizResume => 'Resume attempt';

  @override
  String get quizClosedNote => 'This quiz is closed.';

  @override
  String get quizNoAttemptsNote => 'You\'ve used all your attempts.';

  @override
  String get quizUnavailableNote => 'This quiz can\'t be started right now.';

  @override
  String get quizStartTimedTitle => 'Start the timer?';

  @override
  String quizStartTimedBody(int minutes) {
    String _temp0 = intl.Intl.pluralLogic(
      minutes,
      locale: localeName,
      other: '$minutes minutes',
      one: '$minutes minute',
    );
    return 'You\'ll have $_temp0 once you start. When time runs out, your answers are submitted automatically.';
  }

  @override
  String quizQuestionNofM(String n, String m) {
    return 'Question $n of $m';
  }

  @override
  String quizQuestionN(String n) {
    return 'Question $n';
  }

  @override
  String quizAnsweredN(String n) {
    return '$n answered';
  }

  @override
  String get quizChooseOne => 'Choose one';

  @override
  String get quizChooseAll => 'Choose all that apply';

  @override
  String get quizPrevious => 'Back';

  @override
  String get quizNext => 'Next';

  @override
  String get quizSubmit => 'Submit';

  @override
  String get quizSubmitTitle => 'Submit your answers?';

  @override
  String quizAnsweredOf(int answered, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total questions.',
      one: '$total question.',
    );
    return 'You answered $answered of $_temp0';
  }

  @override
  String get quizUnansweredWarning => 'Unanswered questions score 0.';

  @override
  String get quizAutoSubmitted => 'Time\'s up. Your answers were submitted.';

  @override
  String get quizLeaveTitle => 'Leave the quiz?';

  @override
  String get quizLeaveBody => 'Your answers on this screen won\'t be saved.';

  @override
  String get quizLeaveTimedBody =>
      'Your answers on this screen won\'t be saved, and the timer keeps running.';

  @override
  String get quizKeepGoing => 'Keep going';

  @override
  String get quizLeave => 'Leave';

  @override
  String quizTimeLeft(String time) {
    return 'Time left $time';
  }

  @override
  String get quizResultTitle => 'Result';

  @override
  String quizAttemptN(String n) {
    return 'Attempt $n';
  }

  @override
  String get quizYourScore => 'Your score';

  @override
  String quizPointsOf(String score, String max) {
    return '$score of $max points';
  }

  @override
  String get quizAnswersHidden =>
      'Correct answers appear after the due date, or once you\'ve used all your attempts.';

  @override
  String get quizReviewAnswers => 'Review your answers';

  @override
  String get quizCorrect => 'Correct';

  @override
  String get quizIncorrect => 'Incorrect';

  @override
  String get quizPartial => 'Partly correct';

  @override
  String get quizNotAnswered => 'Not answered';

  @override
  String get quizBackToQuiz => 'Back to the quiz';

  @override
  String get quizResultsTitle => 'Quiz results';

  @override
  String quizStudentsAttempted(int students, int attempts) {
    String _temp0 = intl.Intl.pluralLogic(
      students,
      locale: localeName,
      other: '$students students tried',
      one: '$students student tried',
    );
    String _temp1 = intl.Intl.pluralLogic(
      attempts,
      locale: localeName,
      other: '$attempts attempts',
      one: '$attempts attempt',
    );
    return '$_temp0 · $_temp1';
  }

  @override
  String get studentsLabel => 'Students';

  @override
  String get quizAverage => 'Average';

  @override
  String get quizNoAttemptsYet => 'No attempts yet';

  @override
  String quizAttemptsN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n attempts',
      one: '$n attempt',
    );
    return '$_temp0';
  }

  @override
  String get quizPerQuestion => 'By question';

  @override
  String quizCorrectOfAnswered(String correct, String answered) {
    return '$correct of $answered correct';
  }

  @override
  String get messagesTitle => 'Messages';

  @override
  String get messagesEmptyTitle => 'No messages yet';

  @override
  String get messagesEmptyBody =>
      'Your class chats and messages with your teacher show up here.';

  @override
  String get classChat => 'Class chat';

  @override
  String get messageYourTeacher => 'Message your teacher';

  @override
  String get chatPrivateLabel => 'Private chat';

  @override
  String get chatNoMessagesYet =>
      'No messages yet. Say hello to get things started.';

  @override
  String get chatComposerLabel => 'Message';

  @override
  String get chatComposerHint => 'Write a message';

  @override
  String get chatClosedNote =>
      'This class has ended, so its chat is read-only.';

  @override
  String get chatAdminReadOnly =>
      'You can read this private chat, but not reply to it.';

  @override
  String get chatLoadEarlier => 'Load earlier messages';

  @override
  String get chatMessageDeleted => 'Message deleted';

  @override
  String get chatDeleteMessage => 'Delete message';

  @override
  String get chatDeleteConfirmTitle => 'Delete this message?';

  @override
  String get chatDeleteConfirmBody =>
      'It will be removed for everyone in this chat.';

  @override
  String get chatSendFailed => 'Not sent. Tap to try again.';

  @override
  String get chatSending => 'Sending…';

  @override
  String chatUnreadN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n unread',
    );
    return '$_temp0';
  }

  @override
  String get announcementsTitle => 'Announcements';

  @override
  String get announcementsEmpty => 'No announcements yet';

  @override
  String get announcementsEmptyBody =>
      'News from your teachers and the Azza team will appear here.';

  @override
  String get latestFromClasses => 'Latest from your classes';

  @override
  String get pinnedLabel => 'Pinned';

  @override
  String get fromAzzaTeam => 'Azza team';

  @override
  String get newAnnouncement => 'New announcement';

  @override
  String get platformAnnouncement => 'Platform announcement';

  @override
  String get announcementTitleLabel => 'Title';

  @override
  String get announcementTitleRequired => 'Give the announcement a title.';

  @override
  String get announcementBodyLabel => 'Message';

  @override
  String get announcementBodyHint =>
      'Markdown works: **bold**, lists and links';

  @override
  String get announcementBodyRequired => 'Write the announcement.';

  @override
  String get announcementAudience => 'Who sees it';

  @override
  String get audienceAll => 'Everyone';

  @override
  String get audienceStudents => 'Students';

  @override
  String get audienceTeachers => 'Teachers';

  @override
  String get announcementPin => 'Pin to the top';

  @override
  String get announcementNotify => 'Notify people';

  @override
  String get announcementNotifyClassHint =>
      'Your students get an in-app and push notification.';

  @override
  String get announcementNotifyPlatformHint =>
      'In the app, by push and by email.';

  @override
  String get announcementPost => 'Post';

  @override
  String get announcementPosted => 'Announcement posted.';

  @override
  String get announcementDelete => 'Delete announcement';

  @override
  String get announcementDeleteConfirm => 'Delete this announcement?';

  @override
  String get helpSupport => 'Help & support';

  @override
  String get helpSupportHint => 'Ask the Azza team';

  @override
  String get supportEmptyTitle => 'No requests yet';

  @override
  String get supportEmptyBody =>
      'Stuck with a payment, a class or your account? Tell us and we\'ll help.';

  @override
  String get newTicket => 'New request';

  @override
  String get newTicketIntro =>
      'Tell us what\'s going on. We\'ll reply here and by email.';

  @override
  String get ticketSubject => 'Subject';

  @override
  String get ticketSubjectHint => 'In a few words, what\'s wrong?';

  @override
  String get ticketSubjectRequired => 'Add a short subject.';

  @override
  String get ticketCategory => 'Topic';

  @override
  String get supportCatPayment => 'Payment';

  @override
  String get supportCatClass => 'Class';

  @override
  String get supportCatAccount => 'Account';

  @override
  String get supportCatTechnical => 'Technical';

  @override
  String get supportCatOther => 'Other';

  @override
  String get ticketOrder => 'Order (optional)';

  @override
  String get ticketClass => 'Class (optional)';

  @override
  String get ticketNone => 'None';

  @override
  String get ticketThisOrder => 'This order';

  @override
  String get ticketThisClass => 'This class';

  @override
  String get ticketMessage => 'What happened?';

  @override
  String get ticketMessageHint => 'What you tried, and what you saw';

  @override
  String get ticketMessageRequired => 'Tell us what happened.';

  @override
  String get ticketSubmit => 'Send to support';

  @override
  String get ticketCreated => 'Sent. We\'ll reply here and by email.';

  @override
  String get ticketStatusOpen => 'Open';

  @override
  String get ticketStatusAwaitingYou => 'Waiting for you';

  @override
  String get ticketStatusAwaitingUser => 'Awaiting user';

  @override
  String get ticketStatusResolved => 'Resolved';

  @override
  String get ticketNewReply => 'New reply';

  @override
  String get ticketReplyLabel => 'Reply';

  @override
  String get ticketReplyHint => 'Write a reply';

  @override
  String get ticketMarkResolved => 'Mark resolved';

  @override
  String get ticketResolvedNote =>
      'Marked resolved. Thanks for letting us know.';

  @override
  String get ticketResolvedReopenHint =>
      'This request is resolved. Reply any time to reopen it.';

  @override
  String get ticketStaffLabel => 'Azza support';

  @override
  String get ticketSetStatus => 'Change status';

  @override
  String get ticketStatusChanged => 'Status updated.';

  @override
  String get ticketFrom => 'From';

  @override
  String get ticketLinkedOrder => 'Order';

  @override
  String get ticketLinkedClass => 'Class';

  @override
  String get supportInbox => 'Support inbox';

  @override
  String get supportInboxEmpty => 'Nothing here. All caught up.';

  @override
  String get supportFilterAll => 'All';

  @override
  String get ticketAllCategories => 'All topics';

  @override
  String get needHelp => 'Need help?';

  @override
  String get errChatTooFast =>
      'You\'re sending messages too quickly. Wait a moment and try again.';

  @override
  String get errDmNotAllowed =>
      'Private messages are only between a student and their teacher.';

  @override
  String get errNotClassMember => 'Only people in this class can see this.';

  @override
  String get errInvalidAssignee => 'That person can\'t take this request.';

  @override
  String get studentContinueLearning => 'Continue learning';

  @override
  String studentModulesN(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n modules',
      one: '$n module',
    );
    return '$_temp0';
  }

  @override
  String get studentOpenLessons => 'Open lessons';

  @override
  String get studentPracticeQuiz => 'Quiz';

  @override
  String get studentPracticeAssignment => 'Assignment';

  @override
  String get studentOverdue => 'Overdue';

  @override
  String studentWasDue(String when) {
    return 'Was due $when';
  }

  @override
  String get studentNoDueDate => 'No due date';

  @override
  String studentSessionN(String n) {
    return 'Session $n';
  }

  @override
  String get studentCertificateReadyTitle => 'Your certificate is ready';

  @override
  String studentCertificateReadyBody(String course) {
    return '$course: proof you learned it. Open it to view and share.';
  }

  @override
  String get studentHowWasToday => 'How was today\'s session?';

  @override
  String get studentSessionPractice => 'Practise what you covered';

  @override
  String get studentPractiseNow => 'Practise now';

  @override
  String get studentNextModule => 'Next module';

  @override
  String studentModuleDone(String module) {
    return 'You\'ve reached the end of $module.';
  }

  @override
  String studentModuleQuizHint(String quiz) {
    return 'Check what you learned with “$quiz”.';
  }

  @override
  String get studentModuleNextHint => 'Keep going with the next module.';

  @override
  String get studentClassLabel => 'Class';

  @override
  String get studentAddToCalendar => 'Add to my calendar';

  @override
  String get studentCalendarCopied =>
      'Calendar link copied. Paste it into your calendar app to subscribe.';

  @override
  String studentSubmittedOn(String when) {
    return 'Submitted $when';
  }

  @override
  String get studentSubmittedLate => 'Submitted late';

  @override
  String get studentOverdueHint =>
      'You can still hand it in. It will be marked late.';

  @override
  String get adminNavManage => 'Manage';

  @override
  String get adminManageTitle => 'Manage';

  @override
  String get adminHubPeopleSection => 'People and support';

  @override
  String get adminHubMoneySection => 'Money';

  @override
  String get adminHubCatalogSection => 'Catalog';

  @override
  String get adminHubInsightSection => 'Insight and platform';

  @override
  String get adminHubSupportSub => 'Tickets from students and teachers';

  @override
  String get adminHubPeopleSub => 'Accounts, roles, bans and teacher profiles';

  @override
  String get adminHubPaymentsSub => 'Every order, with refunds';

  @override
  String get adminHubPayoutsSub => 'Monthly payouts to teachers';

  @override
  String get adminHubCouponsSub => 'Discount codes and who used them';

  @override
  String get adminHubBankSub => 'Where students send bank transfers';

  @override
  String get adminHubCurrenciesSub => 'Add, edit and order display currencies';

  @override
  String get adminHubCoursesSub => 'Create, edit, publish and feature';

  @override
  String get adminHubBatchesSub => 'Classes, schedules and enrolments';

  @override
  String get adminHubCategoriesSub => 'Order, names and visibility';

  @override
  String get adminHubReportsSub => 'Revenue, fill, attendance, completion';

  @override
  String get adminHubLiveSub => 'Every room on air right now';

  @override
  String get adminHubSettingsSub => 'Business rules, contact and integrations';

  @override
  String get adminHubNoSettings =>
      'Arabic course text is edited inside each course; there is no separate translations area.';

  @override
  String get adminSettingsTitle => 'Settings';

  @override
  String get adminSettingsBody =>
      'Business rules and contact details are editable here. Keys and secrets stay in the server environment.';

  @override
  String get adminRules => 'Business rules';

  @override
  String get adminIntegrations => 'Integrations';

  @override
  String get adminConfigured => 'Configured';

  @override
  String get adminNotConfigured => 'Not configured';

  @override
  String get adminRuleTeacherShare => 'Teacher share';

  @override
  String get adminRuleEarningHold => 'Earnings hold';

  @override
  String get adminRuleMinPayout => 'Minimum payout';

  @override
  String get adminRuleTransferHold => 'Bank transfer hold';

  @override
  String get adminRuleVat => 'VAT';

  @override
  String adminDaysValue(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n days',
      one: '$n day',
    );
    return '$_temp0';
  }

  @override
  String adminHoursValue(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n hours',
      one: '$n hour',
    );
    return '$_temp0';
  }

  @override
  String get adminRoleStudent => 'Student';

  @override
  String get adminRoleTeacher => 'Teacher';

  @override
  String get adminRoleAdmin => 'Admin';

  @override
  String adminNeedsYouCount(String n) {
    return 'Needs you · $n';
  }

  @override
  String get adminAllClear => 'Nothing is waiting on you. Nice.';

  @override
  String get adminQueueProposals => 'Proposals to review';

  @override
  String get adminQueueProposalsSub => 'Courses and classes from teachers';

  @override
  String get adminQueueTransfers => 'Transfers to verify';

  @override
  String get adminQueueTransfersSub => 'Receipts waiting; seats are on hold';

  @override
  String get adminQueuePayouts => 'Payout runs';

  @override
  String get adminQueuePayoutsSub => 'To approve or mark paid';

  @override
  String get adminQueueReschedules => 'Reschedule requests';

  @override
  String get adminQueueReschedulesSub => 'Teachers asking to move a session';

  @override
  String get adminQueueTickets => 'Open support tickets';

  @override
  String get adminQueueTicketsSub => 'People waiting for an answer';

  @override
  String get adminQueueApplications => 'Instructor applications';

  @override
  String get adminQueueApplicationsSub => 'People who want to teach';

  @override
  String get adminQueueAlerts => 'Other alerts';

  @override
  String get adminQueueAlertsSub => 'Held payouts, bank checks, expiring holds';

  @override
  String get adminLiveNow => 'Live now';

  @override
  String adminRoomIssues(String n) {
    return '$n with issues';
  }

  @override
  String adminPeopleInRoom(String n) {
    return '$n in the room';
  }

  @override
  String adminQualityIssue(String quality) {
    return 'quality: $quality';
  }

  @override
  String get adminHealth => 'Health';

  @override
  String get adminPaymentsTitle => 'Payments';

  @override
  String get adminSearchOrders => 'Search orders';

  @override
  String get adminSearchOrdersHint => 'Reference, student name or email';

  @override
  String get adminAnyMethod => 'Any method';

  @override
  String get adminNoOrders => 'No orders here';

  @override
  String get adminNoOrdersBody =>
      'Try another status or method, or clear the search.';

  @override
  String get adminOrderTitle => 'Order';

  @override
  String adminRefundedSoFar(String amount) {
    return '$amount refunded so far';
  }

  @override
  String get adminOrderAmounts => 'Amounts';

  @override
  String get adminSubtotal => 'Subtotal';

  @override
  String get adminDiscount => 'Discount';

  @override
  String get adminVat => 'VAT';

  @override
  String get adminProcessorFee => 'Card fee';

  @override
  String get adminReceived => 'Received';

  @override
  String get adminTotal => 'Total';

  @override
  String get adminOrderPeople => 'Student and class';

  @override
  String get adminClass => 'Class';

  @override
  String get adminOrderTrail => 'Payment';

  @override
  String get adminMethod => 'Method';

  @override
  String get adminCreated => 'Created';

  @override
  String get adminPaidAt => 'Paid';

  @override
  String get adminVerifiedBy => 'Verified by';

  @override
  String get adminAppleRefundNote =>
      'App Store purchases are refunded by Apple. The refund is recorded here when Apple tells us.';

  @override
  String get adminRefund => 'Refund';

  @override
  String get adminRefundTitle => 'Refund this order';

  @override
  String adminRefundSubtitle(String reference, String amount) {
    return '$reference · up to $amount';
  }

  @override
  String get adminRefundAmount => 'Amount to refund';

  @override
  String get adminRefundAmountHelper =>
      'A partial refund keeps the student enrolled.';

  @override
  String get adminRefundReasonHint =>
      'e.g. Student asked to cancel before the class started';

  @override
  String get adminRefundBankNote =>
      'This was a bank transfer: finance sends the money back by hand after you confirm.';

  @override
  String get adminAmountInvalid => 'Enter an amount above zero.';

  @override
  String adminRefundTooLarge(String amount) {
    return 'You can refund up to $amount.';
  }

  @override
  String get adminReasonRequired =>
      'Add a short reason (3 characters or more).';

  @override
  String adminRefundConfirmTitle(String amount) {
    return 'Refund $amount?';
  }

  @override
  String get adminRefundConfirmFull =>
      'This refunds the whole order. The student loses their seat and the teacher\'s earnings are adjusted. This can\'t be undone.';

  @override
  String get adminRefundConfirmPartial =>
      'The student keeps their seat. The teacher\'s earnings are adjusted. This can\'t be undone.';

  @override
  String adminRefundDone(String amount) {
    return 'Refunded $amount.';
  }

  @override
  String adminRefundManualDone(String amount) {
    return 'Refund of $amount recorded. Finance will send the transfer.';
  }

  @override
  String get adminPeopleTitle => 'People';

  @override
  String get adminSearchPeople => 'Search people';

  @override
  String get adminSearchPeopleHint => 'Name or email';

  @override
  String get adminNoPeople => 'No one matches';

  @override
  String adminPeopleCount(String n) {
    return '$n shown';
  }

  @override
  String get adminBanned => 'Banned';

  @override
  String get adminInviteUser => 'Invite someone';

  @override
  String get adminInviteBody =>
      'They get an email with a link to set their password.';

  @override
  String adminInviteSent(String email) {
    return 'Invite sent to $email.';
  }

  @override
  String get adminSendInvite => 'Send invite';

  @override
  String get adminNameHint => 'e.g. Lina Haddad';

  @override
  String get adminNameRequired => 'Add a name (2 characters or more).';

  @override
  String get adminEmailInvalid => 'Enter a valid email address.';

  @override
  String get adminRole => 'Role';

  @override
  String get adminEmailLanguage => 'Email language';

  @override
  String get adminLanguageEnglish => 'English';

  @override
  String get adminLanguageArabic => 'Arabic';

  @override
  String get adminAccount => 'Account';

  @override
  String get adminEmailVerified => 'Email verified';

  @override
  String get adminYes => 'Yes';

  @override
  String get adminNo => 'No';

  @override
  String get adminJoined => 'Joined';

  @override
  String get adminActiveEnrollments => 'Active enrolments';

  @override
  String get adminTeachingBatches => 'Classes taught';

  @override
  String get adminCannotEditSelf =>
      'You can\'t change your own role or ban yourself.';

  @override
  String get adminChangeRole => 'Change role';

  @override
  String adminChangeRoleTitle(String name, String role) {
    return 'Make $name a $role?';
  }

  @override
  String get adminChangeRoleBody =>
      'Their tabs and permissions change the next time they open the app.';

  @override
  String get adminChangeRoleAdminBody =>
      'Admins can see every payment and account and change them. Only give this to people who run Azza.';

  @override
  String adminRoleChanged(String role) {
    return 'Role changed to $role.';
  }

  @override
  String get adminBan => 'Ban account';

  @override
  String get adminUnban => 'Lift ban';

  @override
  String adminBanTitle(String name) {
    return 'Ban $name?';
  }

  @override
  String adminUnbanTitle(String name) {
    return 'Lift the ban on $name?';
  }

  @override
  String get adminBanBody =>
      'They are signed out everywhere and can\'t sign in until you lift the ban.';

  @override
  String get adminUnbanBody => 'They can sign in again straight away.';

  @override
  String get adminBannedDone => 'Account banned.';

  @override
  String get adminUnbannedDone => 'Ban lifted.';

  @override
  String get adminPublicProfile => 'Public teacher profile';

  @override
  String get adminHeadline => 'Headline';

  @override
  String get adminHeadlineHint => 'e.g. Data analyst teaching Excel and SQL';

  @override
  String get adminBio => 'Bio';

  @override
  String get adminBioHint => 'What they do, who they help, and how they teach';

  @override
  String get adminProfileSaved => 'Profile saved.';

  @override
  String get adminMarkPaid => 'Mark as paid';

  @override
  String adminMarkPaidBody(int count, String total) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count teachers',
      one: '$count teacher',
    );
    return '$_temp0 · $total. Add the bank\'s reference for the transfer.';
  }

  @override
  String get adminTransferRef => 'Transfer reference';

  @override
  String get adminTransferRefHint => 'e.g. ENBD-2026-11-05';

  @override
  String get adminTransferRefRequired =>
      'Add the transfer reference (3 characters or more).';

  @override
  String adminMarkPaidConfirmTitle(String total) {
    return 'Mark $total as paid?';
  }

  @override
  String get adminMarkPaidConfirmBody =>
      'Teachers are emailed that their payout is on the way. Held and carried-over amounts roll into next month.';

  @override
  String get adminRunMarkedPaid => 'Payout run marked as paid.';

  @override
  String get adminAdjustHint =>
      'Tap a teacher to add a bonus or a deduction before you approve.';

  @override
  String adminAdjustTitle(String name) {
    return 'Adjust $name';
  }

  @override
  String adminAdjustSubtitle(String amount) {
    return 'Currently $amount';
  }

  @override
  String get adminBonus => 'Bonus';

  @override
  String get adminDeduction => 'Deduction';

  @override
  String get adminAdjustAmount => 'Amount';

  @override
  String get adminAdjustReasonHint => 'e.g. Extra catch-up session on 12 Nov';

  @override
  String get adminSaveAdjustment => 'Save adjustment';

  @override
  String get adminAdjustmentSaved => 'Adjustment saved.';

  @override
  String get adminVerifyBank => 'Verify bank details';

  @override
  String adminVerifyBankTitle(String name) {
    return 'Verify $name\'s bank details?';
  }

  @override
  String adminVerifyBankBody(String bank, String holder, String iban) {
    return '$bank\n$holder\n$iban\n\nCheck these match the teacher\'s documents. Their held payouts are released.';
  }

  @override
  String adminBankVerified(String name) {
    return '$name\'s bank details are verified.';
  }

  @override
  String get adminCoursesTitle => 'Courses';

  @override
  String get adminNoCourses => 'No courses here';

  @override
  String adminFromPrice(String price) {
    return 'from $price';
  }

  @override
  String adminFeaturedAt(String rank) {
    return 'featured #$rank';
  }

  @override
  String get adminCourseVisibility => 'Status and visibility';

  @override
  String get adminCourseStatus => 'Status';

  @override
  String get adminCourseStatusHelper =>
      'Published courses show in the catalog. Archived ones are hidden.';

  @override
  String get adminFeaturedRank => 'Featured rank';

  @override
  String get adminFeaturedRankHint => 'Leave empty to keep it off the rail';

  @override
  String get adminFeaturedRankHelper =>
      '0–999. Lower numbers come first on the home rail.';

  @override
  String get adminFeaturedRankInvalid =>
      'Featured rank must be a whole number from 0 to 999.';

  @override
  String adminLastReviewNote(String note) {
    return 'Last review note: $note';
  }

  @override
  String get adminPublish => 'Publish';

  @override
  String get adminCoursePublished =>
      'Course published. It\'s in the catalog now.';

  @override
  String get adminCourseSaved => 'Course saved.';

  @override
  String get adminPickTeacher => 'Pick the teacher';

  @override
  String get adminBatchDraftBody =>
      'Saved as a draft. Open enrolment when it\'s ready for students.';

  @override
  String get adminBatchOpenBody =>
      'Enrolment is open. Students can book a seat.';

  @override
  String get adminOpenEnrolment => 'Open enrolment';

  @override
  String get adminEnrolmentOpened => 'Enrolment is open.';

  @override
  String get adminBatchTools => 'Admin tools';

  @override
  String get adminShiftSchedule => 'Shift schedule';

  @override
  String get adminShiftBody =>
      'Moves every scheduled session from the one you pick, keeping the same time of day. Students are told.';

  @override
  String get adminShiftFrom => 'From session';

  @override
  String get adminShiftDays => 'Days to move';

  @override
  String get adminShiftDaysHelper =>
      'Negative moves earlier, positive moves later (−60 to 60).';

  @override
  String get adminShiftZero => 'Pick a number of days other than 0.';

  @override
  String adminShiftConfirmTitle(String code) {
    return 'Shift $code\'s schedule?';
  }

  @override
  String adminShiftConfirmBody(int sessions, String days) {
    String _temp0 = intl.Intl.pluralLogic(
      sessions,
      locale: localeName,
      other: '$sessions sessions move by $days days.',
      one: '$sessions session moves by $days days.',
    );
    return '$_temp0 Students get a notification.';
  }

  @override
  String get adminScheduleShifted =>
      'Schedule shifted. Students have been told.';

  @override
  String get adminAttendance => 'Attendance';

  @override
  String get adminEnrollments => 'Enrolments';

  @override
  String get adminNoEnrollments => 'No one has enrolled yet.';

  @override
  String adminEnrollmentSummary(String active, String total) {
    return '$active active of $total';
  }

  @override
  String get adminEnrolPending => 'Awaiting payment';

  @override
  String get adminEnrolAwaitingTransfer => 'Awaiting transfer';

  @override
  String get adminEnrolActive => 'Active';

  @override
  String get adminEnrolCancelled => 'Cancelled';

  @override
  String get adminCouponsTitle => 'Coupons';

  @override
  String get adminNewCoupon => 'New coupon';

  @override
  String get adminNoCoupons => 'No coupons yet';

  @override
  String get adminNoCouponsBody =>
      'Create a code for a launch, a partner or a season.';

  @override
  String get adminCouponActive => 'Active';

  @override
  String get adminCouponScheduled => 'Scheduled';

  @override
  String get adminCouponExpired => 'Expired';

  @override
  String get adminCouponPaused => 'Paused';

  @override
  String get adminCouponExhausted => 'Used up';

  @override
  String adminPercentOff(String n) {
    return '$n% off';
  }

  @override
  String adminAmountOff(String amount) {
    return '$amount off';
  }

  @override
  String get adminAllCourses => 'All courses';

  @override
  String adminUntil(String date) {
    return 'until $date';
  }

  @override
  String adminUsedCount(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: 'Used $n times',
      one: 'Used once',
      zero: 'Not used yet',
    );
    return '$_temp0';
  }

  @override
  String adminUsedOf(String n, String max) {
    return 'Used $n of $max';
  }

  @override
  String get adminUsage => 'Usage';

  @override
  String get adminCouponCodeSection => 'Code and discount';

  @override
  String get adminCouponCode => 'Code';

  @override
  String get adminCouponCodeHelper =>
      '3–20 capital letters, numbers or dashes. It can\'t change later.';

  @override
  String get adminCouponCodeFixed => 'The code can\'t change once created.';

  @override
  String get adminCouponCodeInvalid =>
      'Use 3–20 capital letters, numbers or dashes.';

  @override
  String get adminPercent => 'Percent';

  @override
  String get adminFixedAmount => 'Fixed amount';

  @override
  String get adminPercentOffLabel => 'Percent off';

  @override
  String get adminAmountOffLabel => 'Amount off';

  @override
  String get adminPercentInvalid => 'Enter a percent from 1 to 100.';

  @override
  String get adminCouponLimits => 'Limits';

  @override
  String get adminMaxRedemptions => 'Total uses';

  @override
  String get adminPerUserLimit => 'Uses per student';

  @override
  String get adminMinOrder => 'Minimum order';

  @override
  String get adminUnlimited => 'Unlimited';

  @override
  String get adminNoMinimum => 'No minimum';

  @override
  String get adminCouponWhen => 'When and where';

  @override
  String get adminStartsOn => 'Valid from';

  @override
  String get adminExpiresOn => 'Valid through';

  @override
  String get adminNoDate => 'No date';

  @override
  String get adminDatesInvalid =>
      'The end date must be on or after the start date.';

  @override
  String get adminCouponScope => 'Applies to';

  @override
  String get adminCouponScopeHelper => 'One course, or every course.';

  @override
  String get adminCouponActiveSwitch => 'Active';

  @override
  String get adminCouponActiveHelper =>
      'Turn off to pause the code at checkout.';

  @override
  String get adminCreateCoupon => 'Create coupon';

  @override
  String adminCouponCreated(String code) {
    return '$code is ready to use.';
  }

  @override
  String get adminCouponSaved => 'Coupon saved.';

  @override
  String get adminTotalDiscount => 'Total discount given';

  @override
  String get adminNoRedemptions => 'No one has used this code yet.';

  @override
  String get adminCategoriesTitle => 'Categories';

  @override
  String get adminNewCategory => 'New category';

  @override
  String get adminEditCategory => 'Edit category';

  @override
  String get adminNoCategories => 'No categories yet';

  @override
  String adminCourseCount(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n courses',
      one: '$n course',
    );
    return '$_temp0';
  }

  @override
  String get adminHidden => 'hidden';

  @override
  String get adminHide => 'Hide from the catalog';

  @override
  String get adminShow => 'Show in the catalog';

  @override
  String get adminDelete => 'Delete';

  @override
  String adminDeleteCategoryTitle(String name) {
    return 'Delete $name?';
  }

  @override
  String get adminDeleteCategoryBody =>
      'This removes the category for good. It can\'t be undone.';

  @override
  String adminCategoryDeleted(String name) {
    return '$name deleted.';
  }

  @override
  String get adminCategoryInUseTitle => 'This category still has courses';

  @override
  String adminCategoryInUseBody(String name) {
    return 'Move the courses in $name to another category first, or hide it so students stop seeing it.';
  }

  @override
  String get adminHideInstead => 'Hide it instead';

  @override
  String get adminCategoryHidden => 'Category hidden.';

  @override
  String get adminCategoryShown => 'Category is visible again.';

  @override
  String get adminCategorySaved => 'Category saved.';

  @override
  String get adminSlug => 'Slug';

  @override
  String get adminSlugHelper =>
      'Lowercase letters, numbers and dashes. Used in links; it can\'t change later.';

  @override
  String get adminSlugFixed => 'The slug can\'t change once created.';

  @override
  String get adminSlugInvalid =>
      'Use 2–40 lowercase letters, numbers or dashes.';

  @override
  String get adminNameEn => 'Name in English';

  @override
  String get adminNameAr => 'Name in Arabic';

  @override
  String get adminOrder => 'Order';

  @override
  String get adminOrderHelper => 'Lower numbers come first.';

  @override
  String get adminVisibleInCatalog => 'Visible in the catalog';

  @override
  String get adminReportsTitle => 'Reports';

  @override
  String adminLastDays(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n days',
      one: '$n day',
    );
    return 'Last $_temp0';
  }

  @override
  String get adminVsPrevious => 'vs the period before';

  @override
  String get adminRevenue => 'Revenue';

  @override
  String get adminNewEnrollments => 'New enrolments';

  @override
  String get adminCompletion => 'Completion';

  @override
  String get adminRefunds => 'Refunds';

  @override
  String get adminRevenueByCourse => 'Revenue by course';

  @override
  String get adminTeachersReport => 'Teachers';

  @override
  String adminTeacherStats(int sessions, String attendance, String onTime) {
    String _temp0 = intl.Intl.pluralLogic(
      sessions,
      locale: localeName,
      other: '$sessions sessions',
      one: '$sessions session',
    );
    return '$_temp0 · $attendance attendance · $onTime on time';
  }

  @override
  String get adminBankAccountsTitle => 'Bank accounts';

  @override
  String get adminNewBankAccount => 'New bank account';

  @override
  String get adminEditBankAccount => 'Edit bank account';

  @override
  String get adminNoBankAccounts => 'No bank accounts yet';

  @override
  String get adminBankAccountSaved => 'Bank account saved.';

  @override
  String get adminActive => 'Active';

  @override
  String get adminInactive => 'Hidden';

  @override
  String get adminBankName => 'Bank';

  @override
  String get adminAccountName => 'Account name';

  @override
  String get adminBranch => 'Branch';

  @override
  String get adminOptional => 'Optional';

  @override
  String get adminInstructions => 'Instructions for students';

  @override
  String get adminInstructionsHint =>
      'e.g. Put the order reference in the transfer note';

  @override
  String get adminShowAtCheckout => 'Show at checkout';

  @override
  String get adminIbanInvalid => 'A UAE IBAN is AE followed by 21 digits.';

  @override
  String get adminSwiftInvalid => 'SWIFT is 8 or 11 letters and numbers.';

  @override
  String get adminCurrenciesTitle => 'Currencies';

  @override
  String get adminCurrenciesBody =>
      'Money always moves in AED. Other currencies only change the approximate prices students see.';

  @override
  String adminRateLabel(String currency) {
    return '$currency per AED';
  }

  @override
  String get adminRateInvalid => 'Enter a rate above zero.';

  @override
  String adminRateSaved(String currency) {
    return '$currency rate saved.';
  }

  @override
  String get progressMarkComplete => 'Mark as complete';

  @override
  String get progressCompleted => 'Completed';

  @override
  String get progressUndoHint => 'Tap to mark it as not done';

  @override
  String progressLessonsOf(int done, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total lessons',
      one: '$total lesson',
    );
    return '$done of $_temp0';
  }

  @override
  String progressResume(String lesson) {
    return 'Resume: $lesson';
  }

  @override
  String progressStart(String lesson) {
    return 'Start: $lesson';
  }

  @override
  String get progressAllDone => 'All lessons done';

  @override
  String get progressAllDoneBody =>
      'Revisit any lesson, or practise what you learned.';

  @override
  String get progressSaveFailed => 'Your progress wasn\'t saved. Try again.';

  @override
  String get guestBrowseCourses => 'Browse courses';

  @override
  String get guestResumeNotice => 'Sign in and we\'ll bring you right back.';

  @override
  String get guestPromptTitle => 'Sign in to continue';

  @override
  String get guestPromptBody => 'Sign in or create an account to do this.';

  @override
  String get guestHomeTitle => 'Your learning, in one place';

  @override
  String get guestHomeBody =>
      'Sign in to see your next lesson, the practice that\'s due and your live sessions.';

  @override
  String get guestScheduleTitle => 'Your week of learning';

  @override
  String get guestScheduleBody =>
      'Sign in to see your live sessions and add them to your calendar.';

  @override
  String get guestLibraryTitle => 'Your lessons and recordings';

  @override
  String get guestLibraryBody =>
      'Sign in to open your lessons, session recordings and class materials.';

  @override
  String get guestMeTitle => 'Make it yours';

  @override
  String get guestMeBody =>
      'Create an account to save courses, join a class and earn a certificate.';

  @override
  String get guestReviewCta => 'Sign in to write a review';

  @override
  String get guestTeachCta => 'Create an account to apply';

  @override
  String get guestTeachBody =>
      'Applications are tied to your account, so we can reach you and set up your teaching tools once you\'re approved.';

  @override
  String get guestVerifyTitle => 'Verify a certificate';

  @override
  String get guestVerifyValid => 'Certificate verified';

  @override
  String guestVerifyValidBody(String name, String course) {
    return 'Azza issued this certificate to $name for completing $course.';
  }

  @override
  String get guestVerifyInvalid => 'We couldn\'t verify this certificate';

  @override
  String get guestVerifyInvalidBody =>
      'Check the code and try again. Codes look like AZ-CERT-7Q4K.';

  @override
  String get guestVerifyLearnCta => 'Learn with Azza';

  @override
  String get courseTypeRecorded => 'Recorded';

  @override
  String get filterFormat => 'Format';

  @override
  String get formatLive => 'Live classes';

  @override
  String get formatRecorded => 'Recorded lessons';

  @override
  String pricePerMonth(String price) {
    return '$price / month';
  }

  @override
  String pricePerYear(String price) {
    return '$price / year';
  }

  @override
  String fromPricePerMonth(String price) {
    return 'From $price / month';
  }

  @override
  String get planTitle => 'Choose your plan';

  @override
  String get planIntro => 'Start any time. Learn at your pace.';

  @override
  String get planMonthly => 'Monthly';

  @override
  String get planYearly => 'Yearly';

  @override
  String planYearlyDetail(String price) {
    return '$price / month, billed yearly';
  }

  @override
  String planSaveMonths(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n months',
      one: '$n month',
    );
    return 'Save $_temp0';
  }

  @override
  String get planYouGet => 'What you get';

  @override
  String get planGetLessons => 'All lessons and quizzes';

  @override
  String get planGetCertificate => 'A certificate when you finish';

  @override
  String get planGetCancel => 'Cancel any time';

  @override
  String get planCancelLine =>
      'Cancel any time. You keep access until the end of the period you paid for.';

  @override
  String planNextCharge(String date) {
    return 'Next charge on $date';
  }

  @override
  String planPaidUntil(String date) {
    return 'You\'re covered until $date. This plan doesn\'t renew by itself.';
  }

  @override
  String planPaidUntilShort(String date) {
    return 'Paid until $date';
  }

  @override
  String planRenews(String date) {
    return 'Renews $date';
  }

  @override
  String planEnds(String date) {
    return 'Ends $date';
  }

  @override
  String get planYourPlan => 'Your plan';

  @override
  String get planEnded => 'Your plan has ended. Your progress is saved.';

  @override
  String get planTransferNote =>
      'Pay by bank transfer. Your access starts once we confirm it, usually within 1 working day.';

  @override
  String get planStart => 'Start learning';

  @override
  String get planWebsiteOnly => 'Available on our website for now';

  @override
  String get planWebsiteOnlyBody =>
      'Open our website in your browser to start this plan.';

  @override
  String get planAppleNote =>
      'Payment is handled by Apple. Manage or cancel in your App Store subscriptions.';

  @override
  String get planWatchFree => 'Watch the free lesson';

  @override
  String get planVatNote =>
      'Prices are before VAT. Any VAT is added at checkout.';

  @override
  String get planFreeLesson => 'Free lesson';

  @override
  String planTransferBefore(String date) {
    return 'Send it before $date.';
  }

  @override
  String get planReceiptSent => 'We\'ve got your receipt';

  @override
  String get planReceiptSentBody =>
      'We\'ll confirm your transfer, usually within 1 working day. Your plan starts then.';

  @override
  String get planBackToCourse => 'Back to the course';

  @override
  String get returnSettingUp => 'Setting up your access…';

  @override
  String get returnSettingUpBody => 'This usually takes a few seconds.';

  @override
  String get returnSlowTitle => 'This is taking longer than usual';

  @override
  String get returnSlowBody =>
      'Your payment is safe. Your access will appear as soon as it\'s confirmed.';

  @override
  String get returnCheckAgain => 'Check again';

  @override
  String get returnHome => 'Go to home';

  @override
  String get lessonLocked => 'Locked';

  @override
  String get lessonLockedBody => 'This lesson is part of the plan.';

  @override
  String get lessonsLockedTitle => 'Start a plan to unlock every lesson';

  @override
  String get lessonsSeePlans => 'See plans';

  @override
  String get errAlreadySubscribed => 'You already have a plan for this course.';

  @override
  String get errPlanRequired => 'You need a plan to open this.';

  @override
  String get errAppleProductMissing =>
      'This plan isn\'t available in the app yet.';

  @override
  String get plansTitle => 'Your plans';

  @override
  String get plansRowHint => 'Renew, cancel or change a plan';

  @override
  String get plansEmptyTitle => 'No plans yet';

  @override
  String get plansEmptyBody => 'Pick a recorded course and start any time.';

  @override
  String get plansFind => 'Find a course';

  @override
  String get plansOpenCourse => 'Open course';

  @override
  String get planProviderCard => 'Card';

  @override
  String get planProviderApple => 'App Store';

  @override
  String get planCancel => 'Cancel plan';

  @override
  String get planCancelTitle => 'Cancel this plan?';

  @override
  String planCancelBody(String date) {
    return 'You can keep learning until $date. Your progress and certificate stay yours.';
  }

  @override
  String get planCancelStep2Title => 'Are you sure?';

  @override
  String planCancelStep2Body(String date) {
    return 'Your plan will end on $date and won\'t renew.';
  }

  @override
  String get planCancelConfirm => 'Yes, cancel my plan';

  @override
  String get planKeep => 'Keep my plan';

  @override
  String planCancelledToast(String date) {
    return 'Done. You can keep learning until $date.';
  }

  @override
  String get planResume => 'Resume plan';

  @override
  String get planResumedToast => 'Your plan will renew as before.';

  @override
  String get planSwitchToYearly => 'Switch to yearly';

  @override
  String get planSwitchToMonthly => 'Switch to monthly';

  @override
  String get planSwitchNote =>
      'Stripe credits the unused time on your current plan.';

  @override
  String get planSwitchedToast => 'Plan changed.';

  @override
  String get planUpdateCard => 'Update card';

  @override
  String get planManageAppStore => 'Manage it in the App Store';

  @override
  String get planRenewTransfer => 'Renew by transfer';

  @override
  String get planSwitchToCard => 'Switch to card';

  @override
  String get planUploadReceipt => 'Upload receipt';

  @override
  String get planPendingReceipt => 'Waiting for your receipt';

  @override
  String get planPendingReview =>
      'We\'re checking your transfer. This usually takes 1 working day.';

  @override
  String planPendingRejected(String note) {
    return 'We couldn\'t confirm your transfer: $note';
  }

  @override
  String get planPendingRejectedPlain =>
      'We couldn\'t confirm your transfer. You can try again.';

  @override
  String get planPastDue =>
      'Your last payment didn\'t go through. Update your card to keep learning.';

  @override
  String planCancellingBanner(String date) {
    return 'Your plan ends on $date. Your progress and certificate stay yours.';
  }

  @override
  String get returnSeePlans => 'See your plans';

  @override
  String get recordedRenew => 'Renew to continue';

  @override
  String get recordedCourses => 'Recorded courses';

  @override
  String recordedNext(String title) {
    return 'Next: $title';
  }

  @override
  String get courseTypeTitle => 'What kind of course?';

  @override
  String get courseTypeLive => 'Live';

  @override
  String get courseTypeLiveBody =>
      'Classes with set dates and a teacher in the room. Learners join a class.';

  @override
  String get courseTypeRecordedBody =>
      'Lessons learners watch any time, on a monthly or yearly plan. No classes to schedule.';

  @override
  String get courseTypeFixed =>
      'The type can\'t be changed once the course is created.';

  @override
  String get hubTitle => 'Recorded course';

  @override
  String get hubSubscribers => 'Subscribers';

  @override
  String get hubEarnings => 'Your earnings';

  @override
  String get hubEarningsNote => 'Your share of plan payments for this course.';

  @override
  String get hubEarningsUnknown =>
      'Earnings from plans appear here once payments arrive.';

  @override
  String get hubQuizzes => 'Course quizzes';

  @override
  String get hubNoQuizzes =>
      'No quizzes yet. Learners must pass every published quiz to earn the certificate.';

  @override
  String get hubAddQuiz => 'Add a quiz';

  @override
  String hubPassMark(String percent) {
    return 'Pass mark $percent%';
  }

  @override
  String get hubPreview => 'Free preview lesson';

  @override
  String get hubPreviewBody =>
      'Anyone can watch this lesson, even without an account.';

  @override
  String get hubPreviewNone => 'No preview lesson';

  @override
  String get hubPreviewSaved => 'Preview lesson saved.';

  @override
  String get hubNoLessons => 'Add lessons on the web to choose a preview.';

  @override
  String get hubEditDetails => 'Edit course details';

  @override
  String get quizPassPercent => 'Pass mark (%)';

  @override
  String get quizPassHelper => 'The share of the points needed to pass.';

  @override
  String get quizPassInvalid => 'Enter a number from 0 to 100.';

  @override
  String get quizCourseNote =>
      'Learners can retake this quiz as many times as they like.';

  @override
  String get adminCutsTitle => 'Teacher cuts';

  @override
  String get adminCutsBody =>
      'The share of each payment, after VAT and fees, that goes to the teacher. It is read when the payment is made and never changed afterwards.';

  @override
  String get adminCutLive => 'Live courses (%)';

  @override
  String get adminCutRecorded => 'Recorded courses (%)';

  @override
  String get adminCutsSave => 'Save cuts';

  @override
  String get adminCutsSaved => 'Cuts saved.';

  @override
  String get adminCutInvalid => 'Enter a whole number from 0 to 100.';

  @override
  String get adminCourseCut => 'Teacher cut for this course (%)';

  @override
  String adminCourseCutHelp(String percent) {
    return 'For rare cases. Leave empty to use the default, $percent%.';
  }

  @override
  String get adminCourseCutSaved => 'Course cut saved.';

  @override
  String get adminRecordedPrices => 'Recorded prices';

  @override
  String get adminMonthlyPrice => 'Monthly price (AED, before VAT)';

  @override
  String get adminYearlyPrice => 'Yearly price (AED, before VAT)';

  @override
  String get adminPricesInvalid =>
      'The yearly price must be lower than 12 monthly payments.';

  @override
  String get adminPricesSaved => 'Prices saved.';

  @override
  String get adminAppleIds => 'App Store product ids';

  @override
  String get adminAppleMonthly => 'Monthly product id';

  @override
  String get adminAppleYearly => 'Yearly product id';

  @override
  String get adminAppleSaved => 'Product ids saved.';

  @override
  String get adminSubsTitle => 'Subscriptions';

  @override
  String get adminHubSubsSub => 'Plans on recorded courses';

  @override
  String get adminSubsEmpty => 'No subscriptions match.';

  @override
  String get adminSubsAll => 'All';

  @override
  String get adminSubCancel => 'Cancel plan';

  @override
  String get adminSubCancelTitle => 'Cancel this plan now?';

  @override
  String get adminSubCancelBody =>
      'The learner loses access straight away. Their progress and certificate stay.';

  @override
  String get adminRefundNone => 'Cancel only';

  @override
  String get adminRefundFull => 'Cancel and refund the last payment';

  @override
  String get adminSubCancelled => 'Plan cancelled.';

  @override
  String get adminSubApple => 'Managed by Apple';

  @override
  String adminSubLastPayment(String amount) {
    return 'Last payment $amount';
  }

  @override
  String get adminTransferPlan => 'Plan';

  @override
  String get adminTransferCourse => 'Course';

  @override
  String get adminTransferPlanChip => 'Plan transfer';

  @override
  String get planPastDueChip => 'Payment failed';

  @override
  String get planCancellingChip => 'Ending';

  @override
  String get planExpiredChip => 'Ended';

  @override
  String get planSettingUpChip => 'Setting up';

  @override
  String get planActiveChip => 'Active';

  @override
  String get certificateRecordedCompletion =>
      'Completed every lesson and passed every quiz';

  @override
  String get certificateCompletion => 'Completed';

  @override
  String get earningsRecordedCourses => 'Recorded courses';

  @override
  String get hubSubscribersUnavailable =>
      'Subscriber numbers aren\'t available right now.';

  @override
  String get adminSubReceiptReturnByHand =>
      'A transfer receipt was under review; return that money by hand.';

  @override
  String get appStoreTitle => 'App Store';

  @override
  String get appStoreSyncNow => 'Sync now';

  @override
  String get appStoreSyncStarted =>
      'Sync started. The list updates in a few seconds.';

  @override
  String get appStoreNotConfigured =>
      'Add your App Store Connect API key to enable automatic product setup.';

  @override
  String get appStoreNothingYet => 'No products yet. Sync to create them.';

  @override
  String get appStoreSeats => 'Seat prices';

  @override
  String get appStoreCourses => 'Recorded courses';

  @override
  String get appleSyncSynced => 'Synced';

  @override
  String get appleSyncSkipped => 'Skipped';

  @override
  String get appleSyncFailed => 'Failed';

  @override
  String get appleSyncNever => 'Not synced yet';

  @override
  String get adminPricesRequired => 'Enter a monthly and a yearly price.';

  @override
  String get planTransferNotOnIos =>
      'Bank transfer isn\'t available on iPhone. Manage your plan in the App Store.';

  @override
  String get reportsRecordedTitle => 'Recorded courses';

  @override
  String get reportsRecordedNone =>
      'No recorded-course payments in this range.';

  @override
  String get reportsGross => 'Gross';

  @override
  String get reportsFees => 'Fees';

  @override
  String get reportsVat => 'VAT';

  @override
  String get reportsNet => 'Net';

  @override
  String get transferNotFound =>
      'We couldn\'t find this transfer. It may already be reviewed.';

  @override
  String get transferBackToQueue => 'Back to transfers';

  @override
  String get whatsappChat => 'Chat on WhatsApp';

  @override
  String get whatsappOpenFailed => 'Couldn\'t open WhatsApp.';

  @override
  String whatsappCourseMessage(String course) {
    return 'Hi Azza, I have a question about $course.';
  }

  @override
  String whatsappBatchMessage(String course, String batchCode) {
    return 'Hi Azza, I have a question about $course ($batchCode).';
  }

  @override
  String get whatsappGeneralMessage => 'Hi Azza, I need some help.';

  @override
  String get contactUs => 'Contact us';

  @override
  String get contactEmail => 'Email';

  @override
  String get contactPhone => 'Phone';

  @override
  String get contactAddress => 'Address';

  @override
  String get followUs => 'Follow us';

  @override
  String get adminRulesBody =>
      'These apply platform-wide. Leave a rule at its default to follow the server setting.';

  @override
  String adminRuleRange(int min, int max) {
    return 'Enter a whole number from $min to $max.';
  }

  @override
  String get adminRulesSaved => 'Rules saved.';

  @override
  String get adminRulesSave => 'Save rules';

  @override
  String adminRuleResetDone(String rule) {
    return '$rule reset to its default.';
  }

  @override
  String adminRuleDefault(String value) {
    return 'Default: $value';
  }

  @override
  String get adminRuleReset => 'Reset to default';

  @override
  String get adminIntegrationsNote => 'Set in the server environment.';

  @override
  String get adminContactTitle => 'Contact & social';

  @override
  String get adminContactBody =>
      'Shown in Help & support and used by the WhatsApp buttons. Leave a field empty to hide it.';

  @override
  String get adminContactSave => 'Save contact details';

  @override
  String get adminContactSaved => 'Contact details saved.';

  @override
  String get adminWhatsappInvalid =>
      'Use 8 to 15 digits with the country code, no + or spaces.';

  @override
  String get adminWhatsappHelper =>
      'Digits with country code, e.g. 971501234567';

  @override
  String get adminAddressEn => 'Address (English)';

  @override
  String get adminAddressAr => 'Address (Arabic)';

  @override
  String get adminAddressTooLong => 'Keep the address under 300 characters.';

  @override
  String get adminSocialInvalid =>
      'Enter a full link that starts with https://';

  @override
  String get adminCurrencySaved => 'Currency saved.';

  @override
  String adminCurrencyDeleteTitle(String code) {
    return 'Remove $code?';
  }

  @override
  String adminCurrencyDeleteBody(String code) {
    return 'Anyone who chose $code will see prices in AED instead. Past orders keep the currency and rate they were placed with.';
  }

  @override
  String adminCurrencyDeleted(String code) {
    return '$code removed.';
  }

  @override
  String get adminNewCurrency => 'Add currency';

  @override
  String adminEditCurrency(String code) {
    return 'Edit $code';
  }

  @override
  String get adminNoCurrencies => 'No currencies yet.';

  @override
  String get adminCurrencyBase => 'Base';

  @override
  String get adminCurrencyBaseHint =>
      'Charges and payouts are always in AED. Its rate is always 1.';

  @override
  String get adminCurrencyLocked => 'Always on';

  @override
  String get adminMoveUp => 'Move up';

  @override
  String get adminMoveDown => 'Move down';

  @override
  String get adminCurrencyCode => 'Code';

  @override
  String get adminCurrencyCodeHelper =>
      'Three letters, e.g. EUR. It can\'t be changed later.';

  @override
  String get adminCurrencyCodeInvalid => 'Enter a three-letter currency code.';

  @override
  String get adminCurrencyDecimalsInvalid => 'Decimals must be 0 to 3.';

  @override
  String get adminCurrencySymbol => 'Symbol (optional)';

  @override
  String get adminCurrencyDecimals => 'Decimals';

  @override
  String get adminCurrencyDecimalsHelper =>
      'How many decimals prices show, 0 to 3';

  @override
  String get adminRatePerAed => 'Rate per 1 AED';

  @override
  String get adminRatePerAedHelper => 'How many units one dirham buys';

  @override
  String get adminCurrencyEnabled => 'Show to students';

  @override
  String get adminCategoryImageAdd => 'Add image';

  @override
  String get adminCategoryImageChange => 'Change image';

  @override
  String get adminCategoryImageSaved => 'Category image saved.';

  @override
  String get adminCategoryImageRemoved => 'Category image removed.';

  @override
  String get adminCategoryImageHint =>
      'JPG, PNG or WebP. Students see it instead of the icon.';

  @override
  String get adminCategoryImageAfterSave =>
      'Save the category first, then add an image.';

  @override
  String get phoneLabel => 'Mobile number';

  @override
  String get phoneRequired => 'Enter your mobile number';

  @override
  String phoneInvalidFor(String country) {
    return 'That number doesn\'t look right for $country';
  }

  @override
  String get phoneSearchCountries => 'Search country or dial code';

  @override
  String get phoneCountryPicker => 'Choose country';

  @override
  String get phoneNoCountries => 'No country matches that search.';

  @override
  String adminCurrencyRateLine(String rate, String code) {
    return '1 AED = $rate $code';
  }

  @override
  String adminCurrencyDecimalsCount(int decimals) {
    String _temp0 = intl.Intl.pluralLogic(
      decimals,
      locale: localeName,
      other: '$decimals decimals',
      one: '$decimals decimal',
      zero: 'no decimals',
    );
    return '$_temp0';
  }

  @override
  String get adminCurrencyNameArRequired => 'Enter the Arabic name.';

  @override
  String get adminCurrencyNameTooLong => 'Names can be up to 60 characters.';

  @override
  String get adminCurrencySymbolTooLong =>
      'The symbol can be up to 8 characters.';

  @override
  String get errPhoneInvalid => 'That phone number doesn\'t look right.';

  @override
  String get errCurrencyUnavailable =>
      'That currency isn\'t available any more.';

  @override
  String get errBaseCurrencyLocked =>
      'The dirham is the base currency and can\'t be changed that way.';
}
