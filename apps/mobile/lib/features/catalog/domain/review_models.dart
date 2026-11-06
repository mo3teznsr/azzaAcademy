import 'package:flutter/foundation.dart';

import '../../../core/utils/json.dart';

/// One student review: `{ id, rating, body, teacherReply, repliedAt, hidden, createdAt, user{ id, name, image } }`.
@immutable
class CourseReview {
  const CourseReview({
    required this.id,
    required this.rating,
    this.body = '',
    this.userId = '',
    this.userName = '',
    this.userImage,
    this.teacherReply,
    this.repliedAt,
    this.hidden = false,
    this.createdAt,
  });

  factory CourseReview.fromJson(Json j) {
    final u = obj(j, 'user');
    return CourseReview(
      id: str(j, 'id'),
      rating: integer(j, 'rating', 5).clamp(1, 5),
      body: str(j, 'body'),
      userId: str(j, 'userId', str(u, 'id')),
      userName: str(u, 'name'),
      userImage: strOrNull(u, 'image'),
      teacherReply: strOrNull(j, 'teacherReply'),
      repliedAt: date(j, 'repliedAt'),
      hidden: boolean(j, 'hidden'),
      createdAt: date(j, 'createdAt'),
    );
  }

  final String id;
  final int rating;
  final String body;
  final String userId;
  final String userName;
  final String? userImage;
  final String? teacherReply;
  final DateTime? repliedAt;
  final bool hidden;
  final DateTime? createdAt;
}

/// `GET /courses/:id/reviews?page` → `{ items, total, page, pageSize, summary{ ratingAvg, ratingCount, distribution }, mine, canReview }`.
@immutable
class ReviewsPage {
  const ReviewsPage({
    this.items = const [],
    this.total = 0,
    this.page = 1,
    this.pageSize = 10,
    this.ratingAvg = 0,
    this.ratingCount = 0,
    this.distribution = const {},
    this.mine,
    this.canReview = false,
  });

  factory ReviewsPage.fromJson(Json j) {
    final summary = obj(j, 'summary');
    final dist = obj(summary, 'distribution');
    final mine = objOrNull(j, 'mine');
    return ReviewsPage(
      items: list(j, 'items').map(CourseReview.fromJson).toList(),
      total: integer(j, 'total'),
      page: integer(j, 'page', 1),
      pageSize: integer(j, 'pageSize', 10),
      ratingAvg: dbl(summary, 'ratingAvg'),
      ratingCount: integer(summary, 'ratingCount'),
      distribution: {for (var star = 1; star <= 5; star++) star: integer(dist, '$star')},
      mine: mine == null ? null : CourseReview.fromJson(mine),
      canReview: boolean(j, 'canReview'),
    );
  }

  final List<CourseReview> items;
  final int total;
  final int page;
  final int pageSize;
  final double ratingAvg;
  final int ratingCount;

  /// Visible reviews per star (1–5).
  final Map<int, int> distribution;

  /// The signed-in student's own review, if any.
  final CourseReview? mine;
  final bool canReview;
}
