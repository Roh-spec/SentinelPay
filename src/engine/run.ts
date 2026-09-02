import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { diagnoseDecline } from "./diagnose";
import { decideAndApply, type CaseSnapshot } from "./fsm";
import {
  POLICY_VERSION,
  type Direction,
  type FsmState,
  type RootCause,
} from "./types";

const TERMINAL = new Set(["CLOSED", "HUMAN_ESCALATED"]);

function id(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export async function detectAndOpenCases(now = new Date()) {
  const opened: string[] = [];

  const failedPays = await prisma.paymentAttempt.findMany({
    where: { status: "failed", caseId: null },
    include: { subscription: true },
  });

  for (const pay of failedPays) {
    const direction: Direction =
      pay.sourceType === "voice_queue"
        ? "hinglish_voice"
        : pay.sourceType === "one_off"
          ? "payment_degradation"
          : "failed_subscription";
    const existing = await prisma.recoveryCase.findFirst({
      where: {
        sourceId: pay.subscriptionId ?? pay.id,
        direction,
        status: { notIn: ["recovered", "lost", "opted_out"] },
      },
    });
    if (existing) {
      await prisma.paymentAttempt.update({
        where: { id: pay.id },
        data: { caseId: existing.id },
      });
      continue;
    }
    const customerId =
      pay.customerId ??
      pay.subscription?.customerId ??
      null;
    if (!customerId) continue;
    const diag = diagnoseDecline(pay.declineCode);
    const caseId = id("rc");
    await prisma.recoveryCase.create({
      data: {
        id: caseId,
        customerId,
        direction,
        sourceType: pay.sourceType,
        sourceId: pay.subscriptionId ?? pay.id,
        subscriptionId: pay.subscriptionId,
        openedAt: pay.attemptedAt,
        status: "open",
        fsmState: "OPEN",
        rootCause: diag.rootCause,
        amountAtRisk: pay.amountPaise,
        policyVersion: POLICY_VERSION,
      },
    });
    await prisma.paymentAttempt.update({
      where: { id: pay.id },
      data: { caseId },
    });
    await prisma.auditLog.create({
      data: {
        id: id("aud"),
        caseId,
        timestamp: now,
        actor: "system",
        action: "detect_open",
        inputJson: JSON.stringify({
          paymentAttemptId: pay.id,
          declineCode: pay.declineCode,
        }),
        outputJson: JSON.stringify(diag),
        policyVersion: POLICY_VERSION,
      },
    });
    opened.push(caseId);
  }

  const checkouts = await prisma.checkoutSession.findMany({
    where: { recovered: false, cases: { none: {} } },
  });
  for (const co of checkouts) {
    const caseId = id("rc");
    const diag = diagnoseDecline("checkout_abandoned");
    await prisma.recoveryCase.create({
      data: {
        id: caseId,
        customerId: co.customerId,
        direction: "checkout_dropoff",
        sourceType: "checkout",
        sourceId: co.id,
        checkoutId: co.id,
        openedAt: co.abandonedAt,
        status: "open",
        fsmState: "OPEN",
        rootCause: diag.rootCause,
        amountAtRisk: co.amountPaise,
        policyVersion: POLICY_VERSION,
      },
    });
    await prisma.auditLog.create({
      data: {
        id: id("aud"),
        caseId,
        timestamp: now,
        actor: "system",
        action: "detect_open",
        inputJson: JSON.stringify({ checkoutId: co.id, step: co.stepDropped }),
        outputJson: JSON.stringify(diag),
        policyVersion: POLICY_VERSION,
      },
    });
    opened.push(caseId);
  }

  const invoices = await prisma.invoice.findMany({
    where: { status: "overdue", cases: { none: {} } },
  });
  for (const inv of invoices) {
    const caseId = id("rc");
    const diag = diagnoseDecline("invoice_overdue");
    await prisma.recoveryCase.create({
      data: {
        id: caseId,
        customerId: inv.customerId,
        direction: "b2b_receivables",
        sourceType: "invoice",
        sourceId: inv.id,
        invoiceId: inv.id,
        openedAt: inv.dueDate,
        status: "open",
        fsmState: "OPEN",
        rootCause: diag.rootCause,
        amountAtRisk: inv.amountPaise,
        policyVersion: POLICY_VERSION,
      },
    });
    await prisma.auditLog.create({
      data: {
        id: id("aud"),
        caseId,
        timestamp: now,
        actor: "system",
        action: "detect_open",
        inputJson: JSON.stringify({ invoiceId: inv.id }),
        outputJson: JSON.stringify(diag),
        policyVersion: POLICY_VERSION,
      },
    });
    opened.push(caseId);
  }

  const mandates = await prisma.mandate.findMany({
    where: { status: "failed", cases: { none: {} } },
  });
  for (const m of mandates) {
    const caseId = id("rc");
    const diag = diagnoseDecline("mandate_failed");
    await prisma.recoveryCase.create({
      data: {
        id: caseId,
        customerId: m.customerId,
        direction: "mandate_retry",
        sourceType: "mandate",
        sourceId: m.id,
        mandateId: m.id,
        openedAt: m.nextDebitAt,
        status: "open",
        fsmState: "OPEN",
        rootCause: diag.rootCause,
        amountAtRisk: m.amountPaise,
        policyVersion: POLICY_VERSION,
      },
    });
    await prisma.auditLog.create({
      data: {
        id: id("aud"),
        caseId,
        timestamp: now,
        actor: "system",
        action: "detect_open",
        inputJson: JSON.stringify({ mandateId: m.id, window: m.windowHint }),
        outputJson: JSON.stringify(diag),
        policyVersion: POLICY_VERSION,
      },
    });
    opened.push(caseId);
  }

  return opened;
}

function toSnap(
  row: Awaited<ReturnType<typeof prisma.recoveryCase.findFirstOrThrow>> & {
    customer: {
      name: string;
      optedOut: boolean;
      dndStartHour: number;
      dndEndHour: number;
      paydayDay: number;
    };
  },
): CaseSnapshot {
  return {
    id: row.id,
    customerName: row.customer.name,
    direction: row.direction as Direction,
    rootCause: row.rootCause as RootCause,
    fsmState: row.fsmState as FsmState,
    status: row.status,
    amountAtRisk: row.amountAtRisk,
    amountRecovered: row.amountRecovered,
    attemptsUsed: row.attemptsUsed,
    nudgeSent: row.nudgeSent,
    openedAt: row.openedAt,
    lastContactAt: row.lastContactAt,
    optedOut: row.customer.optedOut,
    dndStartHour: row.customer.dndStartHour,
    dndEndHour: row.customer.dndEndHour,
    paydayDay: row.customer.paydayDay,
    discountOfferedBps: row.discountOfferedBps,
    promiseDate: row.promiseDate,
    promiseStatus: row.promiseStatus,
    stoppedReason: row.stoppedReason,
  };
}

export async function runCaseToCompletion(caseId: string, start = new Date()) {
  let now = new Date(start);
  now.setHours(11, 0, 0, 0);
  let steps = 0;
  while (steps < 10) {
    const row = await prisma.recoveryCase.findUniqueOrThrow({
      where: { id: caseId },
      include: { customer: true },
    });
    if (TERMINAL.has(row.fsmState)) break;
    const batchDiscount = (
      await prisma.recoveryCase.aggregate({
        _sum: { discountOfferedBps: true },
      })
    )._sum.discountOfferedBps ?? 0;
    const snap = toSnap(row);
    const result = decideAndApply(snap, now, batchDiscount);
    await prisma.auditLog.create({
      data: {
        id: id("aud"),
        caseId,
        timestamp: now,
        actor: result.audit.actor,
        action: result.audit.action,
        inputJson: JSON.stringify(result.audit.input),
        outputJson: JSON.stringify(result.audit.output),
        policyVersion: result.audit.policyVersion,
        channel: result.audit.channel === "none" ? null : result.audit.channel,
        messageBody: result.audit.messageBody,
      },
    });
    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        fsmState: result.next.fsmState,
        status: result.next.status,
        attemptsUsed: result.next.attemptsUsed ?? row.attemptsUsed,
        nudgeSent: result.next.nudgeSent ?? row.nudgeSent,
        lastContactAt: result.next.lastContactAt ?? row.lastContactAt,
        amountRecovered: result.next.amountRecovered ?? row.amountRecovered,
        stoppedReason: result.next.stoppedReason ?? row.stoppedReason,
        discountOfferedBps:
          result.next.discountOfferedBps ?? row.discountOfferedBps,
        promiseDate: result.next.promiseDate ?? row.promiseDate,
        promiseStatus: result.next.promiseStatus ?? row.promiseStatus,
        closedAt: result.next.fsmState === "CLOSED" ? now : row.closedAt,
      },
    });
    if (result.recovered) {
      if (row.checkoutId) {
        await prisma.checkoutSession.update({
          where: { id: row.checkoutId },
          data: { recovered: true },
        });
      }
      if (row.invoiceId) {
        await prisma.invoice.update({
          where: { id: row.invoiceId },
          data: { status: "paid" },
        });
      }
      if (row.subscriptionId) {
        await prisma.subscription.update({
          where: { id: row.subscriptionId },
          data: { status: "active" },
        });
      }
      if (row.mandateId) {
        await prisma.mandate.update({
          where: { id: row.mandateId },
          data: { status: "active" },
        });
      }
    }
    if (TERMINAL.has(result.next.fsmState)) break;
    if (result.decision.action === "defer") {
      now = new Date(now.getTime() + 36 * 60 * 60 * 1000);
      now.setHours(11, 0, 0, 0);
    } else {
      now = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      now.setHours(11, 0, 0, 0);
    }
    steps += 1;
  }
}

export async function stepSingleCase(caseId: string, now = new Date()) {
  const row = await prisma.recoveryCase.findUniqueOrThrow({
    where: { id: caseId },
    include: { customer: true },
  });
  if (TERMINAL.has(row.fsmState)) {
    return { ok: false, reason: `Case is already in terminal state: ${row.fsmState}` };
  }
  const batchDiscount = (
    await prisma.recoveryCase.aggregate({
      _sum: { discountOfferedBps: true },
    })
  )._sum.discountOfferedBps ?? 0;
  const snap = toSnap(row);
  const result = decideAndApply(snap, now, batchDiscount);
  await prisma.auditLog.create({
    data: {
      id: id("aud"),
      caseId,
      timestamp: now,
      actor: result.audit.actor,
      action: result.audit.action,
      inputJson: JSON.stringify(result.audit.input),
      outputJson: JSON.stringify(result.audit.output),
      policyVersion: result.audit.policyVersion,
      channel: result.audit.channel === "none" ? null : result.audit.channel,
      messageBody: result.audit.messageBody,
    },
  });
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      fsmState: result.next.fsmState,
      status: result.next.status,
      attemptsUsed: result.next.attemptsUsed ?? row.attemptsUsed,
      nudgeSent: result.next.nudgeSent ?? row.nudgeSent,
      lastContactAt: result.next.lastContactAt ?? row.lastContactAt,
      amountRecovered: result.next.amountRecovered ?? row.amountRecovered,
      stoppedReason: result.next.stoppedReason ?? row.stoppedReason,
      discountOfferedBps:
        result.next.discountOfferedBps ?? row.discountOfferedBps,
      promiseDate: result.next.promiseDate ?? row.promiseDate,
      promiseStatus: result.next.promiseStatus ?? row.promiseStatus,
      closedAt: result.next.fsmState === "CLOSED" ? now : row.closedAt,
    },
  });
  if (result.recovered) {
    if (row.checkoutId) {
      await prisma.checkoutSession.update({
        where: { id: row.checkoutId },
        data: { recovered: true },
      });
    }
    if (row.invoiceId) {
      await prisma.invoice.update({
        where: { id: row.invoiceId },
        data: { status: "paid" },
      });
    }
    if (row.subscriptionId) {
      await prisma.subscription.update({
        where: { id: row.subscriptionId },
        data: { status: "active" },
      });
    }
    if (row.mandateId) {
      await prisma.mandate.update({
        where: { id: row.mandateId },
        data: { status: "active" },
      });
    }
  }
  return { ok: true, result };
}

export async function humanResolveCase(
  caseId: string,
  notes: string,
  recoveredPaise?: number,
  actor = "human_operator"
) {
  const row = await prisma.recoveryCase.findUniqueOrThrow({
    where: { id: caseId },
  });
  const now = new Date();
  const amt = recoveredPaise ?? row.amountAtRisk;

  await prisma.auditLog.create({
    data: {
      id: id("aud"),
      caseId,
      timestamp: now,
      actor: "human",
      action: "human_resolution",
      inputJson: JSON.stringify({ notes, operator: actor, collectedPaise: amt }),
      outputJson: JSON.stringify({
        status: "recovered",
        recoveredAmountPaise: amt,
        reason: `Human operator resolution: ${notes}`,
      }),
      policyVersion: POLICY_VERSION,
    },
  });

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      fsmState: "CLOSED",
      status: "recovered",
      amountRecovered: amt,
      closedAt: now,
      stoppedReason: "human_resolved",
    },
  });

  if (row.checkoutId) {
    await prisma.checkoutSession.update({ where: { id: row.checkoutId }, data: { recovered: true } });
  }
  if (row.invoiceId) {
    await prisma.invoice.update({ where: { id: row.invoiceId }, data: { status: "paid" } });
  }
  if (row.subscriptionId) {
    await prisma.subscription.update({ where: { id: row.subscriptionId }, data: { status: "active" } });
  }
  if (row.mandateId) {
    await prisma.mandate.update({ where: { id: row.mandateId }, data: { status: "active" } });
  }

  return { ok: true, recoveredPaise: amt };
}

export async function humanOptOutCase(caseId: string, reason = "Customer request via support") {
  const row = await prisma.recoveryCase.findUniqueOrThrow({
    where: { id: caseId },
    include: { customer: true },
  });
  const now = new Date();

  await prisma.customer.update({
    where: { id: row.customerId },
    data: { optedOut: true },
  });

  await prisma.auditLog.create({
    data: {
      id: id("aud"),
      caseId,
      timestamp: now,
      actor: "human",
      action: "opt_out_enforced",
      inputJson: JSON.stringify({ reason }),
      outputJson: JSON.stringify({
        status: "opted_out",
        stopReason: "customer_opted_out",
        reason: "Customer opt-out recorded; automation halted immediately.",
      }),
      policyVersion: POLICY_VERSION,
    },
  });

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      fsmState: "CLOSED",
      status: "opted_out",
      closedAt: now,
      stoppedReason: "customer_opted_out",
    },
  });

  return { ok: true };
}

export async function runBatch() {
  const startedAt = new Date();
  const runId = id("batch");
  await prisma.batchRun.create({
    data: { id: runId, startedAt },
  });
  await detectAndOpenCases(startedAt);
  const open = await prisma.recoveryCase.findMany({
    where: { fsmState: { notIn: ["CLOSED"] } },
    select: { id: true },
  });
  for (const c of open) {
    await runCaseToCompletion(c.id, startedAt);
  }
  const rollup = await prisma.recoveryCase.aggregate({
    _sum: { amountAtRisk: true, amountRecovered: true },
    _count: true,
  });
  await prisma.batchRun.update({
    where: { id: runId },
    data: {
      finishedAt: new Date(),
      casesProcessed: rollup._count,
      amountAtRisk: rollup._sum.amountAtRisk ?? 0,
      amountRecovered: rollup._sum.amountRecovered ?? 0,
      notes: "Full detect → diagnose → decide → execute pass",
    },
  });
  return { runId, casesProcessed: open.length, ...rollup };
}

export async function resetAndReseed() {
  await prisma.auditLog.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.recoveryCase.deleteMany();
  await prisma.checkoutSession.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.mandate.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.batchRun.deleteMany();
}
