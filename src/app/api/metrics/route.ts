import { NextResponse } from "next/server";
import { batchMetrics } from "@/engine/measure";

export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = await batchMetrics();
  return NextResponse.json(metrics);
}
