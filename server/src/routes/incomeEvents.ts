import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  accountId: z.string(),
  amount: z.number().positive(),
  source: z
    .enum([
      "sueldo",
      "aguinaldo",
      "bono",
      "freelance",
      "reembolso",
      "regalo",
      "venta",
      "intereses",
      "otro",
    ])
    .default("otro"),
  description: z.string().max(200).optional(),
  date: z.coerce.date(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const events = await prisma.incomeEvent.findMany({
      where: { userId: req.userId! },
      orderBy: { date: "desc" },
    });
    res.json({ incomeEvents: events });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId: req.userId! },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const [incomeEvent] = await prisma.$transaction([
      prisma.incomeEvent.create({
        data: {
          userId: req.userId!,
          accountId: account.id,
          amount: data.amount,
          source: data.source,
          description: data.description,
          date: data.date,
        },
      }),
      prisma.account.update({
        where: { id: account.id },
        data: { balance: new Prisma.Decimal(account.balance).plus(data.amount) },
      }),
    ]);
    res.status(201).json({ incomeEvent });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const event = await prisma.incomeEvent.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
      include: { account: true },
    });
    if (!event) return res.status(404).json({ error: "Not found" });

    await prisma.$transaction([
      prisma.incomeEvent.delete({ where: { id: event.id } }),
      prisma.account.update({
        where: { id: event.accountId },
        data: {
          balance: new Prisma.Decimal(event.account.balance).minus(event.amount),
        },
      }),
    ]);
    res.status(204).end();
  })
);

export default router;
