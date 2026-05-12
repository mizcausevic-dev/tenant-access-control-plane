import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { issueSessionCookie } from "@/lib/auth";

const payloadSchema = z.object({
  personaId: z.enum(["security-admin", "support-lead", "product-ops"]),
});

export async function POST(request: NextRequest) {
  const payload = payloadSchema.parse(await request.json());
  const response = NextResponse.json({ ok: true, personaId: payload.personaId });

  response.cookies.set(await issueSessionCookie(payload.personaId));
  return response;
}
