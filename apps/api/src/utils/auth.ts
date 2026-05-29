import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function createDevToken(user: { id: string; role: string }) {
  return Buffer.from(JSON.stringify({ sub: user.id, role: user.role })).toString("base64url");
}

export function getActor(req: Request) {
  return {
    id: String(req.header("x-user-id") ?? req.body.ownerId ?? req.body.userId ?? randomUUID()),
    role: String(req.header("x-user-role") ?? req.body.role ?? "owner")
  };
}
