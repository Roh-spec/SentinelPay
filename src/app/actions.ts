"use server";

import { revalidatePath } from "next/cache";
import {
  runBatch,
  stepSingleCase,
  humanResolveCase,
  humanOptOutCase,
} from "@/engine/run";
import { seedDatabase } from "@/engine/seed";
import { prisma } from "@/lib/prisma";

export async function actionRunBatch() {
  await runBatch();
  revalidatePath("/");
  revalidatePath("/cases");
}

export async function actionReseed() {
  await seedDatabase(prisma);
  revalidatePath("/");
  revalidatePath("/cases");
}

export async function actionStepCase(caseId: string) {
  const result = await stepSingleCase(caseId);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
  return result;
}

export async function actionHumanResolve(
  caseId: string,
  notes: string,
  recoveredAmountPaise?: number
) {
  const result = await humanResolveCase(caseId, notes, recoveredAmountPaise);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
  return result;
}

export async function actionHumanOptOut(caseId: string, reason?: string) {
  const result = await humanOptOutCase(caseId, reason);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
  return result;
}
