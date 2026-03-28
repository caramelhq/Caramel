import { container } from "@sapphire/framework";
import { randomUUID } from "crypto";
import { logCategories } from "./catalog";
import { LogsWizardSession } from "./types";

const sessionTtlSeconds = 300;

const sessionKey = (guildId: string, userId: string) =>
  `logs:wizard:session:${guildId}:${userId}`;
const lockKey = (guildId: string) => `logs:wizard:lock:${guildId}`;

export async function acquireLogsWizardLock(guildId: string, userId: string) {
  const result = await container.redis.set(
    lockKey(guildId),
    userId,
    "EX",
    sessionTtlSeconds,
    "NX",
  );
  return result === "OK";
}

export async function getLogsWizardLockOwner(guildId: string) {
  return container.redis.get(lockKey(guildId));
}

export async function releaseLogsWizardLock(guildId: string, userId: string) {
  const owner = await getLogsWizardLockOwner(guildId);
  if (owner === userId) {
    await container.redis.del(lockKey(guildId));
  }
}

export function createInitialWizardSession(
  guildId: string,
  userId: string,
): LogsWizardSession {
  const now = Date.now();

  return {
    guildId,
    userId,
    step: 1,
    selectedCategories: logCategories.map((c) => c.id),
    blocks: {},
    activeConfigBlock: null,
    mainMessageId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveLogsWizardSession(session: LogsWizardSession) {
  session.updatedAt = Date.now();
  await container.redis.set(
    sessionKey(session.guildId, session.userId),
    JSON.stringify(session),
    "EX",
    sessionTtlSeconds,
  );
}

export async function getLogsWizardSession(
  guildId: string,
  userId: string,
): Promise<LogsWizardSession | null> {
  const raw = await container.redis.get(sessionKey(guildId, userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LogsWizardSession;
  } catch {
    return null;
  }
}

export async function deleteLogsWizardSession(guildId: string, userId: string) {
  await container.redis.del(sessionKey(guildId, userId));
}

export function createWizardToken() {
  return randomUUID().slice(0, 8);
}
