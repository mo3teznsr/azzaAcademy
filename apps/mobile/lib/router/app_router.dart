import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/domain/enums.dart';
import '../core/prefs/app_prefs.dart';
import '../features/admin/presentation/admin_batches_screen.dart';
import '../features/admin/presentation/admin_overview_screen.dart';
import '../features/admin/presentation/approvals_screen.dart';
import '../features/admin/presentation/live_monitor_screen.dart';
import '../features/admin/presentation/payout_run_screen.dart';
import '../features/admin/presentation/transfer_verify_screen.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/language_picker_screen.dart';
import '../features/auth/presentation/onboarding_screen.dart';
import '../features/auth/presentation/sign_in_screen.dart';
import '../features/auth/presentation/splash_screen.dart';
import '../features/auth/presentation/verify_email_screen.dart';
import '../features/catalog/presentation/batch_picker_screen.dart';
import '../features/certificates/presentation/certificate_detail_screen.dart';
import '../features/certificates/presentation/certificates_screen.dart';
import '../features/catalog/presentation/batch_schedule_screen.dart';
import '../features/catalog/presentation/course_detail_screen.dart';
import '../features/catalog/presentation/explore_screen.dart';
import '../features/catalog/presentation/saved_courses_screen.dart';
import '../features/checkout/domain/apple_iap.dart';
import '../features/checkout/presentation/apple_payment_screen.dart';
import '../features/checkout/presentation/bank_transfer_screen.dart';
import '../features/checkout/presentation/card_payment_screen.dart';
import '../features/checkout/presentation/checkout_screen.dart';
import '../features/checkout/presentation/enrolled_screen.dart';
import '../features/checkout/presentation/my_orders_screen.dart';
import '../features/checkout/presentation/order_status_screen.dart';
import '../features/home/presentation/student_home_screen.dart';
import '../features/learn/presentation/assignments_screen.dart';
import '../features/learn/presentation/library_screen.dart';
import '../features/live/presentation/after_session_screen.dart';
import '../features/live/presentation/attendance_summary_screen.dart';
import '../features/live/presentation/live_room_screen.dart';
import '../features/live/presentation/lobby_screen.dart';
import '../features/me/presentation/edit_profile_screen.dart';
import '../features/me/presentation/language_settings_screen.dart';
import '../features/me/presentation/profile_photo_screen.dart';
import '../features/me/presentation/notifications_screen.dart';
import '../features/me/presentation/profile_screen.dart';
import '../features/me/presentation/schedule_screen.dart';
import '../features/teacher/presentation/course_editor_screen.dart';
import '../features/teacher/presentation/earnings_screen.dart';
import '../features/teacher/presentation/my_courses_screen.dart';
import '../features/teacher/presentation/teacher_recordings_screen.dart';
import '../features/teacher/presentation/new_batch_screen.dart';
import '../features/teacher/presentation/payout_method_screen.dart';
import '../features/teacher/presentation/reschedule_request_screen.dart';
import '../features/teacher/presentation/roster_screen.dart';
import '../features/teacher/presentation/session_prep_screen.dart';
import '../features/teacher/presentation/teacher_batches_screen.dart';
import '../features/teacher/presentation/teacher_today_screen.dart';
import '../features/teachers/presentation/teacher_profile_screen.dart';
import 'redirect.dart';
import 'role_shell.dart';
import 'routes.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

String? _appStoreOnly(BuildContext _, GoRouterState s) => usesAppStorePayments ? Routes.order(s.pathParameters['id']!) : null;

GoRoute _route(String path, Widget Function(GoRouterState s) build, {List<RouteBase> routes = const []}) =>
    GoRoute(path: path, builder: (_, s) => build(s), routes: routes);

StatefulShellBranch _branch(String path, Widget Function(GoRouterState s) build, {List<RouteBase> routes = const []}) =>
    StatefulShellBranch(routes: [_route(path, build, routes: routes)]);

List<RouteBase> buildRoutes() => [
      _route(Routes.splash, (_) => const SplashScreen()),
      _route(Routes.welcome, (_) => const LanguagePickerScreen()),
      _route(Routes.interests, (_) => const OnboardingScreen()),
      _route(Routes.signIn, (_) => const SignInScreen()),
      _route(Routes.signUp, (_) => const SignInScreen(signUp: true)),
      _route(Routes.verifyEmail, (s) => VerifyEmailScreen(email: s.uri.queryParameters['email'] ?? '')),

      // ── Student tree ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RoleShell(shell: shell, role: Role.student),
        branches: [
          _branch(Routes.studentHome, (_) => const StudentHomeScreen()),
          _branch(Routes.studentExplore, (_) => const ExploreScreen()),
          _branch(Routes.studentSchedule, (_) => const ScheduleScreen(role: Role.student)),
          _branch(Routes.studentLibrary, (_) => const LibraryScreen()),
          _branch(Routes.studentMe, (_) => const ProfileScreen()),
        ],
      ),

      // ── Teacher tree ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RoleShell(shell: shell, role: Role.teacher),
        branches: [
          _branch(Routes.teacherToday, (_) => const TeacherTodayScreen()),
          _branch(Routes.teacherBatches, (_) => const TeacherBatchesScreen(), routes: [
            _route('new', (_) => const NewBatchScreen()),
            _route('recordings', (_) => const TeacherRecordingsScreen()),
            _route('courses', (_) => const MyCoursesScreen(), routes: [
              _route('new', (_) => const CourseEditorScreen()),
              _route(':id', (s) => CourseEditorScreen(courseId: s.pathParameters['id'])),
            ]),
          ]),
          _branch(Routes.teacherCalendar, (_) => const ScheduleScreen(role: Role.teacher)),
          _branch(Routes.teacherEarnings, (_) => const EarningsScreen(), routes: [
            _route('payout-method', (_) => const PayoutMethodScreen()),
          ]),
          _branch(Routes.teacherMe, (_) => const ProfileScreen()),
        ],
      ),

      // ── Admin tree (cream ground) ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RoleShell(shell: shell, role: Role.admin),
        branches: [
          _branch(Routes.adminOverview, (_) => const AdminOverviewScreen()),
          _branch(Routes.adminLive, (_) => const LiveMonitorScreen()),
          _branch(Routes.adminBatches, (_) => const AdminBatchesScreen(), routes: [
            _route(':id', (s) => BatchQuickViewScreen(batchId: s.pathParameters['id']!)),
          ]),
          _branch(Routes.adminApprovals, (_) => const ApprovalsScreen(), routes: [
            _route('transfers/:orderId', (s) => TransferVerifyScreen(orderId: s.pathParameters['orderId']!)),
            _route('payout-runs/:id', (s) => PayoutRunScreen(runId: s.pathParameters['id']!)),
          ]),
          _branch(Routes.adminMe, (_) => const ProfileScreen()),
        ],
      ),

      // ── Shared routes (outside the shells) ──
      _route('/courses/:id', (s) => CourseDetailScreen(courseId: s.pathParameters['id']!), routes: [
        _route('batches', (s) => BatchPickerScreen(courseId: s.pathParameters['id']!)),
      ]),
      _route('/batches/:id/schedule', (s) => BatchScheduleScreen(batchId: s.pathParameters['id']!)),
      _route('/batches/:id/roster', (s) => RosterScreen(batchId: s.pathParameters['id']!)),
      _route('/checkout/:batchId', (s) => CheckoutScreen(batchId: s.pathParameters['batchId']!)),
      _route('/orders/:id', (s) => OrderStatusScreen(orderId: s.pathParameters['id']!), routes: [
        // iOS sells seats only through In-App Purchase: card / bank-transfer screens are unreachable there.
        GoRoute(
          path: 'card',
          redirect: _appStoreOnly,
          builder: (_, s) => CardPaymentScreen(orderId: s.pathParameters['id']!, clientSecret: s.extra as String?),
        ),
        GoRoute(path: 'bank-transfer', redirect: _appStoreOnly, builder: (_, s) => BankTransferScreen(orderId: s.pathParameters['id']!)),
        _route('app-store', (s) => ApplePaymentScreen(orderId: s.pathParameters['id']!, autoStart: s.extra == true)),
        _route('enrolled', (s) => EnrolledScreen(orderId: s.pathParameters['id']!)),
      ]),
      _route(Routes.myOrders, (_) => const MyOrdersScreen()),
      _route(Routes.savedCourses, (_) => const SavedCoursesScreen()),
      _route(Routes.certificates, (_) => const CertificatesScreen(), routes: [
        _route(':code', (s) => CertificateDetailScreen(code: s.pathParameters['code']!)),
      ]),
      _route('/teachers/:id', (s) => TeacherProfileScreen(teacherId: s.pathParameters['id']!)),
      _route('/sessions/:id/lobby', (s) => LobbyScreen(sessionId: s.pathParameters['id']!)),
      _route('/sessions/:id/live', (s) => LiveRoomScreen(sessionId: s.pathParameters['id']!, options: s.extra as JoinOptions?)),
      _route('/sessions/:id/after', (s) => AfterSessionScreen(sessionId: s.pathParameters['id']!)),
      _route('/sessions/:id/prep', (s) => SessionPrepScreen(sessionId: s.pathParameters['id']!)),
      _route('/sessions/:id/reschedule', (s) => RescheduleRequestScreen(sessionId: s.pathParameters['id']!)),
      _route('/sessions/:id/attendance', (s) => AttendanceSummaryScreen(sessionId: s.pathParameters['id']!)),
      _route(Routes.assignments, (s) => AssignmentsScreen(batchId: s.uri.queryParameters['batchId'])),
      _route(Routes.notifications, (_) => const NotificationsScreen()),
      _route(Routes.languageSettings, (_) => const LanguageSettingsScreen()),
      _route(Routes.editProfile, (_) => const EditProfileScreen()),
      _route(Routes.profilePhoto, (_) => const ProfilePhotoScreen()),
    ];

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.listen(onboardingProvider, (_, _) => refresh.value++);

  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: Routes.splash,
    refreshListenable: refresh,
    redirect: (context, state) => computeRedirect(
      auth: ref.read(authControllerProvider),
      onboarded: ref.read(onboardingProvider).completed,
      location: state.uri.path,
    ),
    routes: buildRoutes(),
  );
  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});
