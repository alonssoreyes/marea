import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { classifyCardExpense } from "../lib/finance.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  cardId: z.string(),
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
    const expenses = await prisma.creditCardExpense.findMany({
      where: { userId: req.userId! },
      orderBy: { date: "desc" },
    });
    res.json({ cardExpenses: expenses });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const card = await prisma.creditCard.findFirst({
      where: { id: data.cardId, userId: req.userId! },
    });
    if (!card) return res.status(404).json({ error: "Card not found" });

    const { billingCycle, dueDate } = classifyCardExpense(data.date, {
      cutoffDay: card.cutoffDay,
      dueDay: card.dueDay,
    });

    const [expense] = await prisma.$transaction([
      prisma.creditCardExpense.create({
        data: {
          userId: req.userId!,
          cardId: card.id,
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date,
          billingCycle,
          dueDate,
          tags: data.tags ?? [],
        },
      }),
      prisma.creditCard.update({
        where: { id: card.id },
        data: { balance: new Prisma.Decimal(card.balance).plus(data.amount) },
      }),
    ]);

    res.status(201).json({ cardExpense: expense });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const expense = await prisma.creditCardExpense.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
      include: { card: true },
    });
    if (!expense) return res.status(404).json({ error: "Not found" });

    await prisma.$transaction([
      prisma.creditCardExpense.delete({ where: { id: expense.id } }),
      prisma.creditCard.update({
        where: { id: expense.cardId },
        data: {
          balance: Prisma.Decimal.max(
            new Prisma.Decimal(0),
            new Prisma.Decimal(expense.card.balance).minus(expense.amount)
          ),
        },
      }),
    ]);
    res.status(204).end();
  })
);

export default router;
