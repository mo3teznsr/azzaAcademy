import 'package:flutter/widgets.dart';

import '../l10n/l10n.dart';
import 'app_exception.dart';

/// The user-facing sentence for an error, in the app's language.
/// Client-side and common server codes have their own strings; server prose (English only)
/// is shown as-is in English and replaced by a generic line in Arabic.
extension AppExceptionText on AppException {
  String describe(BuildContext context) {
    final l = context.l10n;
    final mapped = switch (code) {
      'NETWORK' => l.errNetwork,
      'TIMEOUT' => l.errTimeout,
      'CANCELLED' => l.errCancelled,
      'UNAUTHORIZED' => l.errSignedOut,
      'FORBIDDEN' => l.errForbidden,
      'NOT_FOUND' => l.errNotFound,
      'INVALID_EMAIL_OR_PASSWORD' => l.errBadCredentials,
      'USER_ALREADY_EXISTS' || 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' => l.errEmailTaken,
      'TOO_MANY_REQUESTS' => l.errTooMany,
      'RATE_LIMITED' => l.errChatTooFast,
      'DM_NOT_ALLOWED' => l.errDmNotAllowed,
      'NOT_CLASS_MEMBER' => l.errNotClassMember,
      'CHAT_CLOSED' => l.chatClosedNote,
      'INVALID_ASSIGNEE' => l.errInvalidAssignee,
      'COURSE_LOCKED' => l.errCourseLocked,
      'COURSE_INCOMPLETE' => l.errCourseIncomplete,
      'ALREADY_SUBMITTED' => l.errAlreadySubmitted,
      'COURSE_NOT_PUBLISHED' => l.errCourseNotPublished,
      'COURSE_ARCHIVED' => l.errCourseArchived,
      'BATCH_LOCKED' => l.errBatchLocked,
      'NOT_PENDING_REVIEW' => l.errNotPendingReview,
      'REVIEW_NOT_ELIGIBLE' => l.errReviewNotEligible,
      'SCHEDULE_INCOMPLETE' => l.errScheduleIncomplete,
      'ALREADY_INSTRUCTOR' => l.errAlreadyInstructor,
      'APPLICATION_DECIDED' => l.errApplicationDecided,
      'QUIZ_TIME_UP' => l.errQuizTimeUp,
      'QUIZ_CLOSED' => l.errQuizClosed,
      'NO_ATTEMPTS_LEFT' => l.errNoAttemptsLeft,
      'ATTEMPT_NOT_STARTED' => l.errAttemptNotStarted,
      'CONFLICT' when details is Map && (details as Map)['conflicts'] is List => l.errScheduleConflict,
      'CONFLICT' => l.errConflict,
      'START_IN_PAST' => l.errStartInPast,
      'BATCH_CLOSED' => l.errBatchClosed,
      'CAPACITY_TOO_LOW' => l.errCapacityTooLow,
      _ when (statusCode ?? 0) >= 500 || code.startsWith('HTTP_5') => l.errServer,
      _ => null,
    };
    if (mapped != null) return mapped;
    final english = Localizations.localeOf(context).languageCode == 'en';
    return english && message.isNotEmpty && code != 'UNKNOWN' ? message : l.errGeneric;
  }
}

/// Shorthand for `catch (e)` blocks.
String errorText(BuildContext context, Object error) => AppException.from(error).describe(context);
