import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { personas } from "./domain/sample-data";
import type { PersonaId, ViewerSession } from "./domain/types";

const COOKIE_NAME = "tenant-access-session";
const DEFAULT_PERSONA = "security-admin" as const;

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "tenant-access-control-plane-demo-secret",
  );
}

function mapPersona(personaId: PersonaId): ViewerSession {
  const persona =
    personas.find((candidate) => candidate.id === personaId) ??
    personas.find((candidate) => candidate.id === DEFAULT_PERSONA)!;

  return {
    ...persona,
    authMode: process.env.OIDC_ISSUER ? "oidc-ready" : "demo",
    issuer: process.env.OIDC_ISSUER,
  };
}

export async function issueSessionCookie(personaId: PersonaId) {
  const token = await new SignJWT({ personaId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());

  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function getViewerSession(): Promise<ViewerSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return mapPersona(DEFAULT_PERSONA);
  }

  try {
    const verification = await jwtVerify(token, getSecret());
    const personaId = verification.payload.personaId;

    if (
      personaId === "security-admin" ||
      personaId === "support-lead" ||
      personaId === "product-ops"
    ) {
      return mapPersona(personaId);
    }
  } catch {
    return mapPersona(DEFAULT_PERSONA);
  }

  return mapPersona(DEFAULT_PERSONA);
}

export function getAvailablePersonas() {
  return personas;
}
