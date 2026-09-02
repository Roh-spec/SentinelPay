import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const rootCause = searchParams.get("rootCause");
  const direction = searchParams.get("direction");
  const cases = await prisma.recoveryCase.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(rootCause ? { rootCause } : {}),
      ...(direction ? { direction } : {}),
    },
    include: { customer: true },
    orderBy: { amountAtRisk: "desc" },
  });
  return NextResponse.json(cases);
}
