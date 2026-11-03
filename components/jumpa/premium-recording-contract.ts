/**
 * Contract for a future Premium LiveKit Egress service.
 *
 * IMPORTANT: not implemented, not enabled, and never invoked by Free recording.
 * Only the authenticated server may create/stop Egress jobs and issue short-lived
 * object-store upload credentials. Do not expose LiveKit or S3 secrets to clients.
 */
export interface PremiumRecordingRequest {
  roomId: string;
  requestedByUserId: string;
  idempotencyKey: string;
}

export interface PremiumRecordingStatus {
  jobId: string;
  roomId: string;
  state: "starting" | "recording" | "finalizing" | "ready" | "failed";
  objectKey?: string;
  errorCode?: string;
}

export interface PremiumRecordingProvider {
  start(request: PremiumRecordingRequest): Promise<PremiumRecordingStatus>;
  status(jobId: string): Promise<PremiumRecordingStatus>;
  stop(jobId: string): Promise<PremiumRecordingStatus>;
}

/**
 * TODO before Premium release:
 * 1. Authorize room host/cohost + active Premium entitlement on every call.
 * 2. Start LiveKit room-composite Egress server-side, write to private object
 *    storage with server-managed credentials, never browser credentials.
 * 3. Use a durable job row with idempotency and webhook signature checks.
 * 4. Handle retries and resumable/multipart uploads without exposing object keys.
 * 5. Enforce retention, encryption, access audit, deletion and participant notice.
 * 6. Keep Egress running on host disconnect; stop on room end or policy timeout.
 * 7. Test file integrity with ffprobe and object HEAD before state='ready'.
 */
