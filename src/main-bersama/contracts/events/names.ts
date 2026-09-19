// ─── Event Names ────────────────────────────────────────────
// Nama event realtime, dipisah per arah. Transport (Socket.IO/
// SSE) bukan bagian tahap ini. Tanpa event khusus visual —
// visual ditentukan frontend dari state domain.

export const CLIENT_TO_SERVER_EVENTS = [
  'session:join',
  'state:request',
  'answer:submit',
] as const;

export const TEACHER_TO_SERVER_EVENTS = [
  'session:start',
  'round:next',
  'round:close',
  'round:discuss',
  'session:pause',
  'session:resume',
  'session:end',
] as const;

export const SERVER_TO_CLIENT_EVENTS = [
  'state:sync',
  'answer:ack',
  'session:update',
] as const;

export type ClientToServerEventName = (typeof CLIENT_TO_SERVER_EVENTS)[number];
export type TeacherToServerEventName = (typeof TEACHER_TO_SERVER_EVENTS)[number];
export type ServerToClientEventName = (typeof SERVER_TO_CLIENT_EVENTS)[number];
