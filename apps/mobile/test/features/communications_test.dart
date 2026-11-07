import 'dart:async';

import 'package:azza/core/domain/class_ref.dart';
import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/network/error_text.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/providers.dart';
import 'package:azza/core/realtime/socket_events.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/announcements/data/announcements_repository.dart';
import 'package:azza/features/announcements/domain/announcement_models.dart';
import 'package:azza/features/announcements/presentation/announcement_widgets.dart';
import 'package:azza/features/announcements/presentation/class_hub.dart';
import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/chat/domain/chat_models.dart';
import 'package:azza/features/chat/presentation/chat_thread_screen.dart';
import 'package:azza/features/chat/presentation/messages_button.dart';
import 'package:azza/features/chat/presentation/messages_inbox_screen.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/support/data/support_repository.dart';
import 'package:azza/features/support/domain/support_models.dart';
import 'package:azza/features/support/presentation/new_ticket_screen.dart';
import 'package:azza/features/support/presentation/support_inbox_screen.dart';
import 'package:azza/features/support/presentation/ticket_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

final _t0 = DateTime.now().subtract(const Duration(minutes: 30));

Conversation _classConv({int unread = 0, bool closed = false}) => Conversation(
      id: 'c-class',
      type: ConversationType.classChat,
      batch: classB07,
      lastMessage: LastMessage(body: 'See you Tuesday', senderName: 'Lina Haddad', createdAt: _t0),
      lastMessageAt: _t0,
      unread: unread,
      closed: closed,
    );

Conversation _directConv({int unread = 0}) => Conversation(
      id: 'c-dm',
      type: ConversationType.direct,
      batch: classB07,
      counterpart: const Person(id: 'u-t', name: 'Lina Haddad', role: Role.teacher),
      lastMessage: LastMessage(body: 'Happy to help', senderName: 'Lina Haddad', createdAt: _t0.subtract(const Duration(hours: 1))),
      lastMessageAt: _t0.subtract(const Duration(hours: 1)),
      unread: unread,
    );

ThreadMessage _msg(String id, Person who, String body, {int minutesAgo = 20}) =>
    ThreadMessage(id: id, sender: who, body: body, createdAt: DateTime.now().subtract(Duration(minutes: minutesAgo)));

const _lina = Person(id: 'u-t', name: 'Lina Haddad', role: Role.teacher);
const _sara = Person(id: 'u-s', name: 'Sara Kamal', role: Role.student);
const _omar = Person(id: 'u-o', name: 'Omar Said', role: Role.student);

List<Override> _comms({
  AppUser user = student,
  FakeChatRepository? chat,
  FakeAnnouncementsRepository? announcements,
  FakeSupportRepository? support,
  FakeRealtimeClient? rt,
}) =>
    [
      currentUserProvider.overrideWithValue(user),
      chatRepositoryProvider.overrideWithValue(chat ?? FakeChatRepository()),
      announcementsRepositoryProvider.overrideWithValue(announcements ?? FakeAnnouncementsRepository()),
      supportRepositoryProvider.overrideWithValue(support ?? FakeSupportRepository()),
      realtimeClientProvider.overrideWithValue(rt ?? FakeRealtimeClient()),
      meRepositoryProvider.overrideWithValue(FakeMeRepository()),
    ];

/// A small router so screens can push and replace.
Future<GoRouter> _pumpRouted(WidgetTester tester, String initial, List<RouteBase> routes, List<Override> overrides) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final prefs = await testPrefs();
  final router = GoRouter(initialLocation: initial, routes: routes);
  addTearDown(router.dispose);
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [sharedPreferencesProvider.overrideWithValue(prefs), ...overrides],
    child: MaterialApp.router(
      theme: AzzaTheme.build(ThemeVariant.student),
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: localizationDelegates,
      routerConfig: router,
    ),
  ));
  return router;
}

void main() {
  group('Messages inbox', () {
    testWidgets('lists conversations with unread counts and a total badge', (tester) async {
      final chat = FakeChatRepository(overview: ConversationsOverview(items: [_classConv(unread: 3), _directConv(unread: 1)], unreadTotal: 4));
      await pumpScreen(
        tester,
        const Scaffold(body: Column(children: [MessagesButton(), Expanded(child: MessagesInboxScreen())])),
        overrides: _comms(chat: chat),
      );
      await settle(tester);

      expect(find.text('Product Design Foundations'), findsOneWidget);
      expect(find.text('Lina Haddad'), findsOneWidget);
      expect(find.textContaining('See you Tuesday'), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('conversation-unread-c-class')), matching: find.text('3')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('conversation-unread-c-dm')), matching: find.text('1')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('messages-button')), matching: find.text('4')), findsOneWidget);
    });

    testWidgets('a socket message bumps the unread count; an empty inbox says so', (tester) async {
      final rt = FakeRealtimeClient();
      final chat = FakeChatRepository(overview: ConversationsOverview(items: [_classConv()], unreadTotal: 0));
      await pumpScreen(tester, const MessagesInboxScreen(), overrides: _comms(chat: chat, rt: rt));
      await settle(tester);
      expect(find.byKey(const Key('conversation-unread-c-class')), findsNothing);

      rt.fire(SocketEvents.conversationMessage, {
        'conversationId': 'c-class',
        'message': {'id': 'm9', 'sender': {'id': 'u-t', 'name': 'Lina Haddad', 'role': 'TEACHER'}, 'body': 'Slides are up', 'createdAt': DateTime.now().toUtc().toIso8601String(), 'deleted': false},
      });
      await settle(tester);
      expect(find.descendant(of: find.byKey(const Key('conversation-unread-c-class')), matching: find.text('1')), findsOneWidget);
      expect(find.textContaining('Slides are up'), findsOneWidget);
    });

    testWidgets('empty state', (tester) async {
      await pumpScreen(tester, const MessagesInboxScreen(), overrides: _comms());
      await settle(tester);
      expect(find.text('No messages yet'), findsOneWidget);
    });
  });

  group('Chat thread', () {
    testWidgets('sending appends optimistically, then swaps in the server copy', (tester) async {
      final rt = FakeRealtimeClient();
      final chat = FakeChatRepository(
        overview: ConversationsOverview(items: [_classConv(unread: 2)], unreadTotal: 2),
        threads: {'c-class': MessagesPage(items: [_msg('m1', _lina, 'Welcome to B07')])},
      )..sendGate = Completer<void>();
      await pumpScreen(tester, ChatThreadScreen(conversationId: 'c-class', conversation: _classConv(unread: 2)), overrides: _comms(chat: chat, rt: rt));
      await settle(tester);

      expect(find.text('Welcome to B07'), findsOneWidget);
      expect(chat.reads, contains('c-class'));

      await tester.enterText(find.byKey(const Key('thread-composer')), 'Hi everyone');
      await tester.pump();
      await tester.tap(find.byKey(const Key('thread-send')));
      await tester.pump();

      expect(find.text('Hi everyone'), findsOneWidget);
      expect(find.text('Sending…'), findsOneWidget);
      expect(find.byKey(const Key('msg-local-0')), findsOneWidget);
      expect(chat.sent, [('c-class', 'Hi everyone')]);

      chat.sendGate!.complete();
      await settle(tester);
      expect(find.text('Sending…'), findsNothing);
      expect(find.byKey(const Key('msg-srv-1')), findsOneWidget);
      expect(find.text('Hi everyone'), findsOneWidget);

      // A live message from someone else arrives over the socket; a repeat of a known id is ignored.
      final incoming = {
        'conversationId': 'c-class',
        'message': {'id': 'm2', 'sender': {'id': 'u-o', 'name': 'Omar Said', 'role': 'STUDENT'}, 'body': 'Hello Sara', 'createdAt': DateTime.now().toUtc().toIso8601String()},
      };
      rt.fire(SocketEvents.conversationMessage, incoming);
      rt.fire(SocketEvents.conversationMessage, incoming);
      await settle(tester);
      expect(find.text('Hello Sara'), findsOneWidget);

      rt.fire(SocketEvents.conversationMessageDeleted, {'conversationId': 'c-class', 'messageId': 'm2'});
      await settle(tester);
      expect(find.text('Hello Sara'), findsNothing);
      expect(find.text('Message deleted'), findsOneWidget);
    });

    testWidgets('a failed send can be retried', (tester) async {
      final chat = FakeChatRepository(threads: {'c-dm': const MessagesPage()}, sendError: const AppException('RATE_LIMITED', 'slow down', statusCode: 429));
      await pumpScreen(tester, ChatThreadScreen(conversationId: 'c-dm', conversation: _directConv()), overrides: _comms(chat: chat));
      await settle(tester);
      await tester.enterText(find.byKey(const Key('thread-composer')), 'Quick question');
      await tester.pump();
      await tester.tap(find.byKey(const Key('thread-send')));
      await settle(tester);
      expect(find.text('Not sent. Tap to try again.'), findsOneWidget);
      expect(find.textContaining('too quickly'), findsOneWidget);

      chat.sendError = null;
      await tester.tap(find.text('Quick question'));
      await settle(tester);
      expect(chat.sent.length, 2);
      expect(find.text('Not sent. Tap to try again.'), findsNothing);
    });

    testWidgets('a closed class chat is read-only', (tester) async {
      final chat = FakeChatRepository(threads: {'c-class': MessagesPage(items: [_msg('m1', _sara, 'Thanks for the class!')])});
      await pumpScreen(tester, ChatThreadScreen(conversationId: 'c-class', conversation: _classConv(closed: true)), overrides: _comms(chat: chat));
      await settle(tester);

      expect(find.byKey(const Key('thread-composer')), findsNothing);
      expect(find.byKey(const Key('chat-read-only')), findsOneWidget);
      expect(find.text('This class has ended, so its chat is read-only.'), findsOneWidget);

      // Even my own message can't be deleted once the class has ended.
      await tester.longPress(find.text('Thanks for the class!'));
      await settle(tester);
      expect(find.byKey(const Key('chat-delete-confirm')), findsNothing);
    });

    testWidgets('long-press deletes my own message; others are untouchable for a student', (tester) async {
      final chat = FakeChatRepository(threads: {
        'c-class': MessagesPage(items: [_msg('m1', _omar, 'From Omar', minutesAgo: 30), _msg('m2', _sara, 'From me')]),
      });
      await pumpScreen(tester, ChatThreadScreen(conversationId: 'c-class', conversation: _classConv()), overrides: _comms(chat: chat));
      await settle(tester);

      await tester.longPress(find.text('From Omar'));
      await settle(tester);
      expect(find.byKey(const Key('chat-delete-confirm')), findsNothing);

      await tester.longPress(find.text('From me'));
      await settle(tester);
      await tester.tap(find.byKey(const Key('chat-delete-confirm')));
      await settle(tester);
      expect(chat.deleted, ['m2']);
      expect(find.text('Message deleted'), findsOneWidget);
    });

    test('delete rules: teacher in class chats, sender, admin always', () {
      final others = _msg('m1', _omar, 'x');
      final conv = _classConv();
      expect(canDeleteMessage(m: others, user: teacher, conversation: conv, closed: false), isTrue);
      expect(canDeleteMessage(m: others, user: teacher, conversation: _directConv(), closed: false), isFalse);
      expect(canDeleteMessage(m: others, user: student, conversation: conv, closed: false), isFalse);
      expect(canDeleteMessage(m: others, user: admin, conversation: conv, closed: true), isTrue);
      expect(canDeleteMessage(m: others, user: teacher, conversation: conv, closed: true), isFalse);
    });

    testWidgets('pulling for earlier asks for messages before the oldest one', (tester) async {
      final oldest = _msg('m1', _lina, 'Oldest here', minutesAgo: 90);
      final chat = FakeChatRepository(threads: {'c-class': MessagesPage(items: [oldest], hasMore: true)});
      await pumpScreen(tester, ChatThreadScreen(conversationId: 'c-class', conversation: _classConv()), overrides: _comms(chat: chat));
      await settle(tester);
      await tester.tap(find.byKey(const Key('chat-load-earlier')));
      await settle(tester);
      expect(chat.pagesBefore.last, oldest.createdAt);
    });
  });

  group('Class hub', () {
    final ann = Announcement(id: 'a1', scope: AnnouncementScope.batch, title: 'Bring your sketches', body: '**Tuesday** we critique.', createdAt: _t0, pinned: true, batch: classB07);

    Future<GoRouter> pumpHub(WidgetTester tester, AppUser user, FakeChatRepository chat) => _pumpRouted(
          tester,
          '/hub',
          [
            GoRoute(path: '/hub', builder: (_, _) => const Scaffold(body: SingleChildScrollView(child: ClassHub(batchId: 'b7')))),
            GoRoute(path: '/messages/:id', builder: (_, s) => Scaffold(body: Text('thread ${s.pathParameters['id']}'))),
            GoRoute(path: '/batches/:id/announcements', builder: (_, _) => const Scaffold(body: Text('class announcements'))),
          ],
          _comms(user: user, chat: chat, announcements: FakeAnnouncementsRepository(byBatch: {'b7': [ann]})),
        );

    testWidgets('students see announcements, class chat and "Message your teacher"', (tester) async {
      final chat = FakeChatRepository(classConv: _classConv(), directConv: _directConv());
      await pumpHub(tester, student, chat);
      await settle(tester);

      expect(find.text('Bring your sketches'), findsOneWidget);
      expect(find.byKey(const Key('class-chat')), findsOneWidget);
      expect(find.byKey(const Key('message-teacher')), findsOneWidget);

      await tester.tap(find.byKey(const Key('message-teacher')));
      await settle(tester);
      expect(chat.directOpened, ['b7']);
      expect(find.text('thread c-dm'), findsOneWidget);
    });

    testWidgets('the private-message button is for students only', (tester) async {
      final chat = FakeChatRepository(classConv: _classConv());
      await pumpHub(tester, teacher, chat);
      await settle(tester);
      expect(find.byKey(const Key('class-chat')), findsOneWidget);
      expect(find.byKey(const Key('message-teacher')), findsNothing);

      await tester.tap(find.byKey(const Key('class-chat')));
      await settle(tester);
      expect(find.text('thread c-class'), findsOneWidget);
    });
  });

  group('Announcements', () {
    testWidgets('home strip shows the latest; hidden when there are none', (tester) async {
      final items = [
        Announcement(id: 'a1', scope: AnnouncementScope.batch, title: 'Bring your sketches', body: 'Read [this](https://x.y) first', createdAt: _t0, batch: classB07),
        Announcement(id: 'a2', scope: AnnouncementScope.platform, title: 'New Arabic courses', body: '# Big news', createdAt: _t0),
      ];
      await pumpScreen(tester, const Scaffold(body: LatestAnnouncementsStrip()), overrides: _comms(announcements: FakeAnnouncementsRepository(mineList: items)));
      await settle(tester);
      expect(find.byKey(const Key('home-announcements')), findsOneWidget);
      expect(find.text('Latest from your classes'), findsOneWidget);
      expect(find.text('Bring your sketches'), findsOneWidget);
      expect(find.text('Read this first'), findsOneWidget);
      expect(find.text('Azza team'), findsOneWidget);

      await pumpScreen(tester, const Scaffold(body: LatestAnnouncementsStrip()), overrides: _comms());
      await settle(tester);
      expect(find.byKey(const Key('home-announcements')), findsNothing);
    });

    testWidgets('a teacher posts a class announcement from the sheet', (tester) async {
      final repo = FakeAnnouncementsRepository();
      await pumpScreen(
        tester,
        Scaffold(body: Builder(builder: (context) => TextButton(onPressed: () => showAnnouncementSheet(context, batchId: 'b7'), child: const Text('open')))),
        overrides: _comms(user: teacher, announcements: repo),
      );
      await tester.tap(find.text('open'));
      await settle(tester, 12);
      await tester.tap(find.byKey(const Key('announcement-post')));
      await settle(tester);
      expect(find.text('Give the announcement a title.'), findsOneWidget);
      expect(repo.posted, isEmpty);

      await tester.enterText(find.byKey(const Key('announcement-title')), 'No class Thursday');
      await tester.enterText(find.byKey(const Key('announcement-body')), 'We move to **Friday**.');
      await tester.tap(find.byKey(const Key('announcement-pin')));
      await tester.tap(find.byKey(const Key('announcement-post')));
      await settle(tester, 12);
      expect(repo.posted.single.$1, 'b7');
      expect(repo.posted.single.$2.title, 'No class Thursday');
      expect(repo.posted.single.$2.pinned, isTrue);
      expect(repo.posted.single.$2.audience, isNull);
    });

    test('plainPreview strips markdown', () {
      expect(plainPreview('## Hi\n- **bold** and [link](https://a.b)'), 'Hi bold and link');
    });
  });

  group('Support', () {
    final order = Order(id: 'o1', reference: 'AZ-1042', status: OrderStatus.verifying, method: PaymentMethod.bankTransfer, totalFils: 88000);

    testWidgets('creating a ticket prefilled with an order opens its thread', (tester) async {
      final support = FakeSupportRepository();
      await _pumpRouted(
        tester,
        '/support/new?orderId=o1',
        [
          GoRoute(path: '/support/new', builder: (_, s) => NewTicketScreen(orderId: s.uri.queryParameters['orderId'])),
          GoRoute(path: '/support/:id', builder: (_, s) => TicketScreen(ticketId: s.pathParameters['id']!)),
        ],
        [
          ..._comms(support: support),
          checkoutRepositoryProvider.overrideWithValue(FakeCheckoutRepository(current: order)),
        ],
      );
      await settle(tester);
      expect(find.text('AZ-1042'), findsOneWidget);
      expect(find.text('Payment'), findsOneWidget);

      await tester.tap(find.byKey(const Key('ticket-submit')));
      await settle(tester);
      expect(find.text('Add a short subject.'), findsOneWidget);
      expect(support.opened, isEmpty);

      await tester.enterText(find.byKey(const Key('ticket-subject')), 'Receipt not accepted');
      await tester.enterText(find.byKey(const Key('ticket-body')), 'I uploaded it twice.');
      await tester.tap(find.byKey(const Key('ticket-submit')));
      await settle(tester, 12);

      final draft = support.opened.single;
      expect(draft.subject, 'Receipt not accepted');
      expect(draft.category, SupportCategory.payment);
      expect(draft.orderId, 'o1');
      expect(draft.toJson()['orderId'], 'o1');
      expect(find.byKey(const Key('ticket-header')), findsOneWidget);
      expect(find.text('I uploaded it twice.'), findsOneWidget);
    });

    TicketDetail detail(SupportStatus status) => TicketDetail(
          summary: TicketSummary(
            id: 't1',
            subject: 'Cannot join',
            category: SupportCategory.technical,
            status: status,
            user: const TicketUser(id: 'u-s', name: 'Sara Kamal', email: 'sara@example.com'),
            lastMessageAt: _t0,
            createdAt: _t0,
          ),
          messages: [SupportMessage(id: 'm1', authorId: 'u-s', body: 'The lobby spins forever', createdAt: _t0)],
          batch: classB07,
        );

    testWidgets('a staff reply flips the ticket to "Awaiting user"', (tester) async {
      final support = FakeSupportRepository(details: {'t1': detail(SupportStatus.open)}, staff: true);
      await pumpScreen(tester, const TicketScreen(ticketId: 't1'), overrides: _comms(user: admin, support: support));
      await settle(tester);
      expect(find.text('OPEN'), findsOneWidget);
      expect(find.textContaining('sara@example.com'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('thread-composer')), 'Try updating the app.');
      await tester.pump();
      await tester.tap(find.byKey(const Key('thread-send')));
      await settle(tester);
      expect(support.replies, [('t1', 'Try updating the app.')]);
      expect(find.text('AWAITING USER'), findsOneWidget);
      expect(find.text('Try updating the app.'), findsOneWidget);

      await tester.tap(find.byKey(const Key('ticket-status-menu')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('ticket-status-RESOLVED')));
      await settle(tester);
      expect(support.statusChanges, [('t1', SupportStatus.resolved)]);
      expect(find.text('RESOLVED'), findsOneWidget);
    });

    testWidgets('the owner marks resolved, and replying reopens it', (tester) async {
      final support = FakeSupportRepository(details: {'t1': detail(SupportStatus.awaitingUser)});
      await pumpScreen(tester, const TicketScreen(ticketId: 't1'), overrides: _comms(support: support));
      await settle(tester);
      expect(find.text('WAITING FOR YOU'), findsOneWidget);
      expect(find.byKey(const Key('ticket-status-menu')), findsNothing);

      await tester.tap(find.byKey(const Key('ticket-resolve')));
      await settle(tester);
      expect(find.text('RESOLVED'), findsOneWidget);
      expect(find.byKey(const Key('ticket-resolve')), findsNothing);

      await tester.enterText(find.byKey(const Key('thread-composer')), 'It happened again');
      await tester.pump();
      await tester.tap(find.byKey(const Key('thread-send')));
      await settle(tester);
      expect(find.text('OPEN'), findsOneWidget);
    });

    testWidgets('admin inbox filters by status', (tester) async {
      TicketSummary row(String id, SupportStatus s, {bool unread = false}) => TicketSummary(
            id: id,
            subject: 'Ticket $id',
            category: SupportCategory.payment,
            status: s,
            lastMessageAt: _t0,
            user: const TicketUser(id: 'u-s', name: 'Sara Kamal'),
            unreadForMe: unread,
          );
      final support = FakeSupportRepository(list: [row('1', SupportStatus.open, unread: true), row('2', SupportStatus.resolved)]);
      await pumpScreen(tester, const SupportInboxScreen(), overrides: _comms(user: admin, support: support));
      await settle(tester);
      expect(find.text('Ticket 1'), findsOneWidget);
      expect(find.text('Ticket 2'), findsNothing);
      expect(find.byKey(const Key('ticket-unread-1')), findsOneWidget);

      await tester.tap(find.byKey(const Key('inbox-status-ALL')));
      await settle(tester);
      expect(find.text('Ticket 2'), findsOneWidget);
      expect(support.queries.last.status, isNull);
    });
  });

  group('Routing and errors', () {
    test('notificationRoute covers the communications types', () {
      expect(notificationRoute('ANNOUNCEMENT', {'announcementId': 'a1', 'batchId': 'b7'}), '/batches/b7/announcements');
      expect(notificationRoute('ANNOUNCEMENT', {'announcementId': 'a1'}), '/announcements');
      expect(notificationRoute('ANNOUNCEMENT', {'announcementId': 'a1', 'batchId': 'null'}), '/announcements');
      expect(notificationRoute('CHAT_MESSAGE', {'conversationId': 'c1'}), '/messages/c1');
      expect(notificationRoute('SUPPORT_TICKET', {'ticketId': 't1'}), '/support/t1');
      expect(notificationRoute('SUPPORT_REPLY', {'ticketId': 't1'}), '/support/t1');
    });

    testWidgets('error codes have their own sentences', (tester) async {
      late BuildContext ctx;
      await pumpScreen(tester, Builder(builder: (c) {
        ctx = c;
        return const SizedBox();
      }), overrides: const []);
      String say(String code, int status) => AppException(code, 'server prose', statusCode: status).describe(ctx);
      expect(say('DM_NOT_ALLOWED', 403), contains('student and their teacher'));
      expect(say('NOT_CLASS_MEMBER', 403), contains('people in this class'));
      expect(say('CHAT_CLOSED', 422), contains('read-only'));
      expect(say('RATE_LIMITED', 429), contains('too quickly'));
      expect(say('INVALID_ASSIGNEE', 422), contains("can't take this request"));
    });
  });
}
