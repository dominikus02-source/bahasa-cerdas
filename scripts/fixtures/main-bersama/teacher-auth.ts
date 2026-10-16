import type { User } from "@prisma/client";
let actor: User | null = null;
export function setTestUser(user: User | null) {
  actor = user;
}
export async function getUser() {
  return actor;
}
