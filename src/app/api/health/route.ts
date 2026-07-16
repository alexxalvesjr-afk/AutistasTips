import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Health check para orquestradores e monitoramento. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
