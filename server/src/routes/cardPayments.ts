import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  cardId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().min(0),
  billingCycle: z.string().regex(/^\d{4}-\d{2}$/).optional().nullable(),
  date: z.coerce.date().optional(),
  note: z.string().max(200).optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const payments = await prisma.cardPayment.findMany({
      where: { userId: req.userId! },
      orderBy: { date: "desc" },
    });
    res.json({ cardPayments: payments });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const [card, account] = await Promise.all([
      prisma.creditCard.findFirst({ where: { id: data.cardId, userId: req.userId! } }),
      prisma.account.findFirst({ where: { id: data.accountId, userId: req.userId! } }),
    ]);
    if (!card) return res.status(404).json({ error: "Card not found" });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const amount = new Prisma.Decimal(data.amount);

    const [payment] = await prisma.$transaction([
      prisma.cardPayment.create({
        data: {
          userId: req.userId!,
          cardId: data.cardId,
          accountId: data.accountId,
          billingCycle: data.billingCycle ?? null,
          amount,
          date: data.date ?? new Date(),
          note: data.note ?? null,
        },
      }),
      prisma.account.update({
        where: { id: account.id },
        data: { balance: new Prisma.Decimal(Number(account.balance)).sub(amount) },
      }),
      prisma.creditCard.update({
        where: { id: card.id },
        data: {
          balance: Prisma.Decimal.max(
            new Prisma.Decimal(0),
            new Prisma.Decimal(Number(card.balance)).sub(amount)
          ),
        },
      }),
    ]);
    res.status(201).json({ cardPayment: payment });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const payment = await prisma.cardPayment.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!payment) return res.status(404).json({ error: "Not found" });

    const [card, account] = await Promise.all([
      prisma.creditCard.findUnique({ where: { id: payment.cardId } }),
      prisma.account.findUnique({ where: { id: payment.accountId } }),
    ]);

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.cardPayment.delete({ where: { id: payment.id } }),
    ];
    if (account) {
      ops.push(
        prisma.account.update({
          where: { id: account.id },
          data: { balance: new Prisma.Decimal(Number(account.balance)).add(payment.amount) },
        })
      );
    }
    if (card) {
      ops.push(
        prisma.creditCard.update({
          where: { id: card.id },
          data: { balance: new Prisma.Decimal(Number(card.balance)).add(payment.amount) },
        })
      );
    }
    await prisma.$transaction(ops);
    res.status(204).end();
  })
);

export default router;
