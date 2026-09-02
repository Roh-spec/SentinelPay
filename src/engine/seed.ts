import { PrismaClient } from "@prisma/client";
import { detectAndOpenCases } from "./run";

export async function seedDatabase(prisma: PrismaClient) {
  await prisma.auditLog.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.recoveryCase.deleteMany();
  await prisma.checkoutSession.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.mandate.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.batchRun.deleteMany();

  const now = new Date();
  now.setHours(11, 0, 0, 0);

  const FIRST = [
    "Aarav", "Diya", "Kabir", "Meera", "Ishaan", "Ananya", "Rohan", "Sara",
    "Vikram", "Nisha", "Arjun", "Priya", "Rahul", "Kavya", "Aditya", "Sneha",
    "Kunal", "Pooja", "Nikhil", "Riya", "Harsh", "Isha", "Yash", "Tanvi",
    "Dev", "Aisha", "Siddharth", "Neha", "Manav", "Shreya", "Karan", "Aanya",
    "Varun", "Ira", "Aryan", "Myra", "Ritika", "Om", "Zara", "Laksh",
  ];
  const LAST = [
    "Sharma", "Patel", "Reddy", "Iyer", "Khan", "Mehta", "Nair", "Gupta",
    "Singh", "Das", "Joshi", "Kapoor", "Bose", "Malhotra", "Chopra",
  ];
  const SUB_CODES = [
    "insufficient_funds",
    "insufficient_funds",
    "insufficient_funds",
    "expired_card",
    "expired_card",
    "do_not_honor",
    "card_not_supported",
    "fraud_suspected",
    "timeout",
    "GATEWAY_ERROR_INSUFFICIENT_FUNDS",
  ] as const;
  const ONE_OFF = [
    "insufficient_funds",
    "do_not_honor",
    "timeout",
    "expired_card",
    "fraud_suspected",
  ] as const;
  const PLANS = [
    { plan: "Growth Monthly", mrr: 299900 },
    { plan: "Pro Monthly", mrr: 799900 },
    { plan: "Starter Monthly", mrr: 99900 },
    { plan: "Scale Annual /12", mrr: 1499900 },
  ];

  function pad(n: number, w = 3) {
    return String(n).padStart(w, "0");
  }

  const customers = [];
  for (let i = 0; i < 40; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    customers.push({
      id: `cust_${pad(i + 1)}`,
      name,
      email: `${FIRST[i % FIRST.length].toLowerCase()}.${i}@merchant.test`,
      phone: `+9198${String(10000000 + i * 17).slice(0, 8)}`,
      ltvPaise: 50_000_00 + i * 12_500_00,
      riskTier: i % 11 === 0 ? "silent" : i % 7 === 0 ? "high" : "standard",
      contactPrefs: i % 5 === 0 ? "sms" : "email",
      dndStartHour: 21,
      dndEndHour: 9,
      optedOut: i === 19,
      paydayDay: [1, 5, 7, 15][i % 4],
    });
  }
  await prisma.customer.createMany({ data: customers });

  let payN = 0;
  const failedSubs = 48;
  for (let i = 0; i < failedSubs; i++) {
    const cust = customers[i % customers.length];
    const plan = PLANS[i % PLANS.length];
    const subId = `sub_${pad(i + 1)}`;
    const nextBill = new Date(now);
    nextBill.setDate(nextBill.getDate() - (2 + (i % 6)));
    await prisma.subscription.create({
      data: {
        id: subId,
        customerId: cust.id,
        plan: plan.plan,
        mrrPaise: plan.mrr,
        status: "past_due",
        nextBillDate: nextBill,
      },
    });
    payN += 1;
    await prisma.paymentAttempt.create({
      data: {
        id: `pay_${pad(payN)}`,
        customerId: cust.id,
        subscriptionId: subId,
        amountPaise: plan.mrr,
        status: "failed",
        declineCode: SUB_CODES[i % SUB_CODES.length],
        gateway: i % 3 === 0 ? "razorpay" : "hdfc_pg",
        attemptedAt: nextBill,
        sourceType: "subscription",
      },
    });
  }

  for (let i = 0; i < 16; i++) {
    const cust = customers[(i + 3) % customers.length];
    payN += 1;
    await prisma.paymentAttempt.create({
      data: {
        id: `pay_${pad(payN)}`,
        customerId: cust.id,
        amountPaise: [149900, 249900, 499900, 99900][i % 4],
        status: "failed",
        declineCode: ONE_OFF[i % ONE_OFF.length],
        gateway: "razorpay",
        attemptedAt: new Date(now.getTime() - (i + 1) * 3600_000),
        sourceType: "one_off",
      },
    });
  }

  const checkoutSteps = ["payment_method", "otp", "upi_intent", "review"];
  for (let i = 0; i < 14; i++) {
    const cust = customers[(i + 8) % customers.length];
    await prisma.checkoutSession.create({
      data: {
        id: `chk_${pad(i + 1)}`,
        customerId: cust.id,
        amountPaise: [59900, 129900, 249900, 79900][i % 4],
        stepDropped: checkoutSteps[i % checkoutSteps.length],
        abandonedAt: new Date(now.getTime() - (i + 2) * 7200_000),
      },
    });
  }

  for (let i = 0; i < 14; i++) {
    const cust = customers[(i + 12) % customers.length];
    const due = new Date(now);
    due.setDate(due.getDate() - (8 + (i % 20)));
    await prisma.invoice.create({
      data: {
        id: `inv_${pad(i + 1)}`,
        customerId: cust.id,
        amountPaise: [12500000, 34800000, 8900000, 56000000][i % 4],
        dueDate: due,
        status: "overdue",
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    const cust = customers[(i + 5) % customers.length];
    const nextDebit = new Date(now);
    nextDebit.setDate(i % 2 === 0 ? 3 : 16);
    await prisma.mandate.create({
      data: {
        id: `man_${pad(i + 1)}`,
        customerId: cust.id,
        type: i % 2 === 0 ? "UPI_AUTOPAY" : "NACH",
        status: "failed",
        amountPaise: [49900, 99900, 199900][i % 3],
        nextDebitAt: nextDebit,
        windowHint: i % 2 === 0 ? "days_1_7" : "days_14_21",
      },
    });
  }

  const silentCusts = customers.filter((c) => c.riskTier === "silent").slice(0, 8);
  for (let i = 0; i < silentCusts.length; i++) {
    const cust = silentCusts[i];
    payN += 1;
    await prisma.paymentAttempt.create({
      data: {
        id: `pay_${pad(payN)}`,
        customerId: cust.id,
        amountPaise: [89900, 159900, 249900][i % 3],
        status: "failed",
        declineCode: "no_response",
        gateway: "voice_queue",
        attemptedAt: new Date(now.getTime() - 5 * 86400_000),
        sourceType: "voice_queue",
      },
    });
  }

  const openedCases = await detectAndOpenCases(now);

  return {
    customers: customers.length,
    subscriptions: failedSubs,
    payments: payN,
    checkouts: 14,
    invoices: 14,
    mandates: 10,
    voice: silentCusts.length,
    casesOpened: openedCases.length,
  };
}
