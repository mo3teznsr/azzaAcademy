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
  String editSeatsLead(String count) {
    return '$count students are enrolled. Seats can\'t go below that.';
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
  String coursesCount(String count) {
    return '$count courses';
  }

  @override
  String get noCoursesFound => 'No courses match. Try another search.';

  @override
  String levelN(String n) {
    return 'Level $n';
  }

  @override
  String liveSessionsN(String n) {
    return '$n live sessions';
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
  String syllabusN(String n) {
    return 'Syllabus · $n modules';
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
  String seatsLeft(String n) {
    return '$n places left';
  }

  @override
  String seatsOf(String taken, String capacity) {
    return '$taken/$capacity';
  }

  @override
  String get noOpenBatches => 'No classes are open right now. Check back soon.';

  @override
  String joiningLate(String ran, String left) {
    return 'Joining late? $ran sessions already ran — catch up on their recordings in your library. $left live sessions left.';
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
  String enrolledBody(String course, String code, String n) {
    return 'Your place in $course · $code is confirmed. Start with the lessons; your $n live sessions are in your schedule.';
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
  String syncCalendar(String n) {
    return 'Sync $n sessions to calendar';
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
  String waitingN(String n) {
    return '$n waiting';
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
  String endedStayed(String time, String min) {
    return 'Ended $time · you stayed $min min';
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
  String batchesN(String n) {
    return '$n classes';
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
  String studentsN(String n) {
    return '$n students';
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
  String runOfShow(String min) {
    return 'Run of show · $min min';
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
  String sessionsDelivered(String n) {
    return '$n sessions delivered';
  }

  @override
  String opsGreeting(String name) {
    return 'Ops, $name';
  }

  @override
  String get onAirLabel => 'Live now';

  @override
  String roomsPeople(String rooms, String people) {
    return '$rooms rooms · $people people';
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
  String participantsN(String n) {
    return '$n people';
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
  String sessionsRun(String done, String total) {
    return '$done of $total sessions run';
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
  String totalTeachers(String n) {
    return 'Total · $n teachers';
  }

  @override
  String heldNote(String n) {
    return '$n held: bank account not verified or below the minimum.';
  }

  @override
  String approvePayouts(String n, String amount) {
    return 'Approve $n payouts · $amount';
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
  String alertTransfersToVerify(String n) {
    return '$n bank transfers to verify';
  }

  @override
  String alertSeatHoldsExpiring(String n) {
    return '$n seat holds expire within 24 h';
  }

  @override
  String alertTeacherBankUnverified(String n) {
    return '$n teacher bank details to verify';
  }

  @override
  String alertPayoutsHeld(String n) {
    return '$n payouts on hold';
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
  String certificateSessionsNeeded(String n) {
    return '$n more sessions needed';
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
  String certificateAttendedOfRequired(String attended, String required) {
    return '$attended of $required sessions to earn it';
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
  String certificateCompleteBody(String attended, String total) {
    return 'You attended $attended of $total live sessions.';
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
  String ratingSemantics(String avg, String count) {
    return 'Rated $avg out of 5 from $count reviews';
  }

  @override
  String get reviewsTitle => 'Reviews';

  @override
  String reviewsCount(String count) {
    return '$count reviews';
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
  String starsN(String n) {
    return '$n stars';
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
  String instructorCoursesN(String count) {
    return '$count courses';
  }

  @override
  String instructorOpenBatchesN(String count) {
    return '$count open classes';
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
  String lessonsCountN(String n) {
    return '$n lessons';
  }

  @override
  String lessonNofM(String n, String m) {
    return 'Lesson $n of $m';
  }

  @override
  String get lessonHasVideo => 'Video';

  @override
  String lessonAttachmentsN(String n) {
    return '$n attachments';
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
  String quizQuestionsN(String n) {
    return '$n questions';
  }

  @override
  String quizMinutesN(String n) {
    return '$n min';
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
  String quizStartTimedBody(String minutes) {
    return 'You\'ll have $minutes minutes once you start. When time runs out, your answers are submitted automatically.';
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
  String quizAnsweredOf(String answered, String total) {
    return 'You answered $answered of $total questions.';
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
  String quizStudentsAttempted(String students, String attempts) {
    return '$students students tried · $attempts attempts';
  }

  @override
  String get studentsLabel => 'Students';

  @override
  String get quizAverage => 'Average';

  @override
  String get quizNoAttemptsYet => 'No attempts yet';

  @override
  String quizAttemptsN(String n) {
    return '$n attempts';
  }

  @override
  String get quizPerQuestion => 'By question';

  @override
  String quizCorrectOfAnswered(String correct, String answered) {
    return '$correct of $answered correct';
  }
}
