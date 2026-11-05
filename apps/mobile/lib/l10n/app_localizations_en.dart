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
  String get errorTitle => 'Something went off-air.';

  @override
  String get emptyGeneric => 'Nothing here yet.';

  @override
  String get seeAll => 'See all';

  @override
  String get continueLabel => 'Continue';

  @override
  String get cancel => 'Cancel';

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
  String get splashTagline => 'Live cohorts · since 2026';

  @override
  String get splashLine => 'Learn live, with a batch that shows up.';

  @override
  String get chooseLanguage => 'Choose your language';

  @override
  String get leftToRight => 'Left to right';

  @override
  String get rightToLeft => 'Right to left';

  @override
  String get languageHint =>
      'You can change the language any time from Me → Language & region. Each batch sets its own session language.';

  @override
  String get onboardingTitle => 'What do you want to learn live?';

  @override
  String get onboardingTimezone => 'Your timezone — batch times convert to it';

  @override
  String get detected => 'detected';

  @override
  String get bestTime => 'Best time for you';

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
  String get signInTitle => 'Take your seat.';

  @override
  String get signInSubtitle =>
      'One account for every batch you join — on your phone or the web.';

  @override
  String get signUpTitle => 'Create your account.';

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
      'After this we\'ll ask for camera and mic once, so you can join sessions in one tap.';

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
  String get joinLiveRoom => 'Join live room';

  @override
  String inRoom(String count) {
    return '$count in room';
  }

  @override
  String get myBatches => 'My batches';

  @override
  String nextAt(String when) {
    return 'Next · $when';
  }

  @override
  String get continueWatching => 'Continue watching';

  @override
  String get noBatchesTitle => 'No batches yet';

  @override
  String get noBatchesBody =>
      'Pick a course and a batch whose schedule fits your week.';

  @override
  String get exploreCta => 'Explore courses';

  @override
  String get upNext => 'Up next';

  @override
  String get exploreTitle => 'Find a batch that fits your week.';

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
    return 'Choose a batch · $n';
  }

  @override
  String get pickBatch => 'Pick your batch.';

  @override
  String timesShownIn(String tz) {
    return 'Times shown in $tz';
  }

  @override
  String get fullSchedule => 'Full schedule';

  @override
  String enrollIn(String code) {
    return 'Enroll in $code';
  }

  @override
  String seatsLeft(String n) {
    return '$n seats left';
  }

  @override
  String seatsOf(String taken, String capacity) {
    return '$taken/$capacity';
  }

  @override
  String get noOpenBatches => 'No open batches right now. Check back soon.';

  @override
  String joiningLate(String ran, String left) {
    return 'Joining late? $ran sessions already ran — they\'re in the library as recordings. $left live sessions left.';
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
  String get batchPrice => 'Batch price';

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
  String get payCardSub => 'Instant seat · 3-D Secure';

  @override
  String get payBank => 'Bank transfer';

  @override
  String get payBankSub => 'Seat held 48 h while you transfer';

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
    return 'Seat held $time';
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
  String get holdExpired => 'The 48 h hold expired and the seat was released.';

  @override
  String get noBanks => 'No receiving banks are active. Contact support.';

  @override
  String orderRef(String ref) {
    return 'Order $ref';
  }

  @override
  String get almostOnAir => 'Almost on air.';

  @override
  String verifyingBody(String code, String amount) {
    return 'We hold your seat in $code while finance checks the transfer of $amount.';
  }

  @override
  String get tlOrderCreated => 'Seat held';

  @override
  String get tlReceiptUploaded => 'Receipt uploaded';

  @override
  String get tlFinanceVerifying => 'Finance verifying';

  @override
  String get tlSeatConfirmed => 'Seat confirmed';

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
      'This order expired and the seat was released.';

  @override
  String get goToSchedule => 'Go to my schedule';

  @override
  String get youreIn => 'You\'re in.';

  @override
  String enrolledBody(String course, String code, String n) {
    return 'Your seat in $course · $code is yours. $n live sessions are now in your schedule.';
  }

  @override
  String get nextTake => 'Next take';

  @override
  String get days => 'days';

  @override
  String get hrs => 'hrs';

  @override
  String get mins => 'min';

  @override
  String lobbyOpensAt(String time) {
    return 'lobby opens $time';
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
  String get noSessionsWeek => 'No sessions this week.';

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
  String get lobbyClosed => 'The lobby opens 15 min before the session starts.';

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
      'We couldn\'t get you back in automatically. Your seat is still yours.';

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
      'A seat frees up as soon as someone leaves. Try again in a minute, or catch the recording after class.';

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
      'The recording appears in your learning once it\'s ready.';

  @override
  String get edgeNotEnrolledTitle => 'You\'re not in this batch';

  @override
  String get edgeNotEnrolledBody =>
      'You need an active enrollment in this batch to join.';

  @override
  String get edgeBackToSchedule => 'Back to schedule';

  @override
  String get edgeWaitingButton => 'Waiting for the host…';

  @override
  String get wrapTitle => 'That\'s a wrap.';

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
  String get noRecordings => 'Recordings land here after each session.';

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
      'Enroll in a batch to unlock recordings and materials.';

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
    return '$n batches';
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
  String get nextTakeLobbyOpen => 'Next take · lobby open';

  @override
  String nextTakeIn(String time) {
    return 'Next take · starts in $time';
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
  String get onAirLabel => 'On air';

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
  String get liveMonitorTitle => 'On air now';

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
  String get noLiveRooms => 'No rooms are on air.';

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
  String get certificatesEmptyTitle => 'No certificates yet';

  @override
  String get certificatesEmptyBody =>
      'Attend at least 80% of a batch\'s sessions and your certificate appears here when the batch ends.';

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
      'Attendance met — your certificate is issued when the batch ends.';

  @override
  String get certificateUnreachable =>
      'Not enough sessions left to reach 80% in this batch.';

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
  String get certificateBatch => 'Batch';

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
    return 'Anyone can check it at $url';
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
      'When a seat frees up, it goes to the first person in line.';

  @override
  String get waitlistStepNotify =>
      'We\'ll notify and email you the moment it\'s yours.';

  @override
  String get waitlistStepHold =>
      'You then have 24 hours to check out before the seat moves on.';

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
  String get waitlistSeatOpen => 'A seat opened for you';

  @override
  String waitlistHeldFor(String time) {
    return 'Held for you · $time';
  }

  @override
  String get waitlistHoldExpired => 'The hold has expired';

  @override
  String get waitlistClaimSeat => 'Claim seat';

  @override
  String get teacherAbout => 'About';

  @override
  String get teacherTeachesIn => 'Teaches in';

  @override
  String get teacherCourses => 'Courses';

  @override
  String get teacherUpcomingBatches => 'Upcoming batches';

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
  String get timezoneHint => 'Session times are shown in this timezone.';

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
      'Payment is handled by Apple. Your seat is confirmed as soon as the purchase completes.';

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
      'This seat isn\'t available as an in-app purchase.';

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
      'Your teacher sees your photo on the class list and in live sessions, so they know who\'s in the room.';

  @override
  String get addPhotoTips =>
      'Use a clear, recent photo of your face. Only your teachers and classmates see it.';

  @override
  String get addPhotoAction => 'Add photo';
}
