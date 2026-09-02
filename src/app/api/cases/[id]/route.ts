import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await prisma.recoveryCase.findUnique({
    where: { id },
    include: {
      customer: true,
      audits: { orderBy: { timestamp: "asc" } },
      attempts: true,
      subscription: true,
      invoice: true,
      checkout: true,
      mandate: true,
    },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}
