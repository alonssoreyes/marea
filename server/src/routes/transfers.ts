import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const createSchema = z
  .object({
    fromAccountId: z.string(),
    toAccountId: z.string(),
    amount: z.number().positive(),
    date: z.coerce.date(),
    note: z.string().max(200).optional(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "fromAccountId and toAccountId must differ",
    path: ["toAccountId"],
  });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const transfers = await prisma.transfer.findMany({
      where: { userId: req.userId! },
      orderBy: { date: "desc" },
    });
    res.json({ transfers });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: [data.fromAccountId, data.toAccountId] },
        userId: req.userId!,
      },
    });
    const from = accounts.find((a) => a.id === data.fromAccountId);
    const to = accounts.find((a) => a.id === data.toAccountId);
    if (!from || !to) return res.status(404).json({ error: "Account not found" });

    const [transfer] = await prisma.$transaction([
      prisma.transfer.create({
        data: {
          userId: req.userId!,
          fromAccountId: from.id,
          toAccountId: to.id,
          amount: data.amount,
          date: data.date,
          note: data.note,
        },
      }),
      prisma.account.update({
        where: { id: from.id },
        data: { balance: new Prisma.Decimal(from.balance).minus(data.amount) },
      }),
      prisma.account.update({
        where: { id: to.id },
        data: { balance: new Prisma.Decimal(to.balance).plus(data.amount) },
      }),
    ]);
    res.status(201).json({ transfer });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const transfer = await prisma.transfer.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
      include: { fromAccount: true, toAccount: true },
    });
    if (!transfer) return res.status(404).json({ error: "Not found" });

    await prisma.$transaction([
      prisma.transfer.delete({ where: { id: transfer.id } }),
      prisma.account.update({
        where: { id: transfer.fromAccountId },
        data: {
          balance: new Prisma.Decimal(transfer.fromAccount.balance).plus(transfer.amount),
        },
      }),
      prisma.account.update({
        where: { id: transfer.toAccountId },
        data: {
          balance: new Prisma.Decimal(transfer.toAccount.balance).minus(transfer.amount),
        },
      }),
    ]);
    res.status(204).end();
  })
);

export default router;
