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
      'TOO_MANY_REQUESTS' || 'RATE_LIMITED' => l.errTooMany,
      'COURSE_LOCKED' => l.errCourseLocked,
      'COURSE_INCOMPLETE' => l.errCourseIncomplete,
      'ALREADY_SUBMITTED' => l.errAlreadySubmitted,
      'COURSE_NOT_PUBLISHED' => l.errCourseNotPublished,
      'COURSE_ARCHIVED' => l.errCourseArchived,
      'BATCH_LOCKED' => l.errBatchLocked,
      'NOT_PENDING_REVIEW' => l.errNotPendingReview,
      'REVIEW_NOT_ELIGIBLE' => l.errReviewNotEligible,
      'SCHEDULE_INCOMPLETE' => l.errScheduleIncomplete,
      'CONFLICT' when details is Map && (details as Map)['conflicts'] is List => l.errScheduleConflict,
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
