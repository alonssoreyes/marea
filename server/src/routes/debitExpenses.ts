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
  description: z.string().max(120).default(""),
  category: z
    .enum([
      "alimentos",
      "transporte",
      "entretenimiento",
      "salud",
      "hogar",
      "ropa",
      "tecnologia",
      "servicios",
      "otros",
    ])
    .default("otros"),
  date: z.coerce.date(),
  tags: z.array(z.string().max(40)).max(15).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const expenses = await prisma.debitExpense.findMany({
      where: { userId: req.userId! },
      orderBy: { date: "desc" },
    });
    res.json({ debitExpenses: expenses });
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

    const [expense] = await prisma.$transaction([
      prisma.debitExpense.create({
        data: {
          userId: req.userId!,
          accountId: account.id,
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date,
          tags: data.tags ?? [],
        },
      }),
      prisma.account.update({
        where: { id: account.id },
        data: { balance: new Prisma.Decimal(account.balance).minus(data.amount) },
      }),
    ]);
    res.status(201).json({ debitExpense: expense });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const expense = await prisma.debitExpense.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
      include: { account: true },
    });
    if (!expense) return res.status(404).json({ error: "Not found" });

    await prisma.$transaction([
      prisma.debitExpense.delete({ where: { id: expense.id } }),
      prisma.account.update({
        where: { id: expense.accountId },
        data: {
          balance: new Prisma.Decimal(expense.account.balance).plus(expense.amount),
        },
      }),
    ]);
    res.status(204).end();
  })
);

export default router;
