import { NextResponse } from "next/server";
import { runBatch } from "@/engine/run";
import { batchMetrics } from "@/engine/measure";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runBatch();
  const metrics = await batchMetrics();
  return NextResponse.json({ result, metrics });
}
