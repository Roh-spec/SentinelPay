import { NextResponse } from "next/server";
import { seedDatabase } from "@/engine/seed";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const stats = await seedDatabase(prisma);
  return NextResponse.json({ ok: true, stats });
}
