// Manual smoke test for the classroom socket events: `bun scripts/socket-smoke.ts <sessionId>`
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@azza/shared';

const API = process.env.API_URL ?? 'http://localhost:4000';
const sessionId = process.argv[2]!;

async function signIn(email: string) {
  const res = await fetch(`${API}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  return ((await res.json()) as { token: string }).token;
}

const connect = (token: string) => io(API, { auth: { token }, transports: ['websocket'] });
const emit = (s: ReturnType<typeof connect>, ev: string, payload: unknown) =>
  new Promise((resolve) => s.emit(ev, payload, resolve));

const lina = connect(await signIn('lina@azza.test'));
const sara = connect(await signIn('sara@azza.test'));
const outsider = connect(await signIn('omar@azza.test'));

const got: string[] = [];
lina.on(SOCKET_EVENTS.CHAT_MESSAGE, (m: { body: string }) => got.push(`lina saw chat: ${m.body}`));
lina.on(SOCKET_EVENTS.HAND_QUEUE, (q: { queue: unknown[] }) => got.push(`lina saw hand queue: ${q.queue.length}`));

console.log('lina join', await emit(lina, SOCKET_EVENTS.JOIN_SESSION, { sessionId }));
console.log('sara join', await emit(sara, SOCKET_EVENTS.JOIN_SESSION, { sessionId }));
console.log('omar join (not enrolled)', await emit(outsider, SOCKET_EVENTS.JOIN_SESSION, { sessionId }));
console.log('sara chat', await emit(sara, SOCKET_EVENTS.SEND_CHAT, { sessionId, body: 'Hello from Sara' }));
console.log('sara hand', await emit(sara, SOCKET_EVENTS.RAISE_HAND, { sessionId }));
await Bun.sleep(300);
console.log(got);
for (const s of [lina, sara, outsider]) s.close();
process.exit(0);
