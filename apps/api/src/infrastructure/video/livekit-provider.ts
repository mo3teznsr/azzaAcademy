import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  RoomServiceClient,
  WebhookReceiver,
} from 'livekit-server-sdk';
import type { RoomInfo, VideoGrant, VideoProvider, VideoWebhookEvent } from '../../core/ports';

export class LiveKitVideoProvider implements VideoProvider {
  private readonly rooms: RoomServiceClient;
  private readonly egress: EgressClient;
  private readonly webhooks: WebhookReceiver;

  constructor(
    readonly serverUrl: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {
    const httpUrl = serverUrl.replace(/^ws/, 'http');
    this.rooms = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    this.egress = new EgressClient(httpUrl, apiKey, apiSecret);
    this.webhooks = new WebhookReceiver(apiKey, apiSecret);
  }

  async createJoinToken(grant: VideoGrant): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: grant.identity,
      name: grant.name,
      metadata: grant.metadata,
      ttl: '4h',
    });
    token.addGrant({
      room: grant.roomName,
      roomJoin: true,
      canPublish: grant.canPublish,
      canPublishData: grant.canPublishData,
      canSubscribe: true,
      roomAdmin: grant.isHost,
      roomRecord: grant.isHost,
      hidden: grant.hidden ?? false,
    });
    return token.toJwt();
  }

  async ensureRoom(roomName: string, opts: { emptyTimeoutSec: number; maxParticipants: number }) {
    await this.rooms.createRoom({
      name: roomName,
      emptyTimeout: opts.emptyTimeoutSec,
      maxParticipants: opts.maxParticipants,
    });
  }

  async listRooms(): Promise<RoomInfo[]> {
    const rooms = await this.rooms.listRooms();
    return rooms.map((r) => ({
      name: r.name,
      numParticipants: r.numParticipants,
      createdAt: r.creationTime ? new Date(Number(r.creationTime) * 1000) : null,
      recording: r.activeRecording,
    }));
  }

  async closeRoom(roomName: string) {
    await this.rooms.deleteRoom(roomName);
  }

  async muteParticipant(roomName: string, identity: string) {
    const participant = await this.rooms.getParticipant(roomName, identity);
    await Promise.all(
      participant.tracks
        .filter((t) => !t.muted)
        .map((t) => this.rooms.mutePublishedTrack(roomName, identity, t.sid, true)),
    );
  }

  async removeParticipant(roomName: string, identity: string) {
    await this.rooms.removeParticipant(roomName, identity);
  }

  async setCanPublish(roomName: string, identity: string, canPublish: boolean) {
    await this.rooms.updateParticipant(roomName, identity, undefined, { canPublish, canSubscribe: true, canPublishData: true });
  }

  async startRecording(roomName: string) {
    const output = new EncodedFileOutput({ filepath: `recordings/${roomName}/{time}.mp4` });
    const info = await this.egress.startRoomCompositeEgress(roomName, { file: output }, { layout: 'speaker' });
    return { egressId: info.egressId };
  }

  async stopRecording(egressId: string) {
    await this.egress.stopEgress(egressId);
  }

  async parseWebhook(rawBody: string, authHeader: string | undefined): Promise<VideoWebhookEvent> {
    const event = await this.webhooks.receive(rawBody, authHeader);
    return {
      event: event.event,
      roomName: event.room?.name ?? event.egressInfo?.roomName,
      participantIdentity: event.participant?.identity,
      egressId: event.egressInfo?.egressId,
      fileUrl: event.egressInfo?.fileResults?.[0]?.location,
      at: event.createdAt ? new Date(Number(event.createdAt) * 1000) : new Date(),
    };
  }
}

/** Used when LiveKit credentials are absent: tokens are fake, room ops are no-ops. */
export class DisabledVideoProvider implements VideoProvider {
  readonly serverUrl = '';
  async createJoinToken(grant: VideoGrant) {
    return `dev-token:${grant.roomName}:${grant.identity}`;
  }
  async ensureRoom() {}
  async listRooms() {
    return [];
  }
  async closeRoom() {}
  async muteParticipant() {}
  async removeParticipant() {}
  async setCanPublish() {}
  async startRecording(roomName: string) {
    return { egressId: `dev-egress-${roomName}` };
  }
  async stopRecording() {}
  async parseWebhook(rawBody: string): Promise<VideoWebhookEvent> {
    const body = JSON.parse(rawBody) as Omit<VideoWebhookEvent, 'at'> & { at?: string };
    return { ...body, at: body.at ? new Date(body.at) : new Date() };
  }
}
