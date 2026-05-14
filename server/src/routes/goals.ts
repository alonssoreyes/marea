import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const baseSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional(),
  targetAmount: z.number().min(0),
  targetDate: z.coerce.date().optional(),
  emoji: z.string().min(1).max(4).default("🎯"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId! },
      include: { contributions: { orderBy: { date: "desc" } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ goals });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = baseSchema.parse(req.body);
    const goal = await prisma.savingsGoal.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json({ goal });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = baseSchema.partial().parse(req.body);
    const result = await prisma.savingsGoal.updateMany({
      where: { id: String(req.params.id), userId: req.userId! },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: String(req.params.id) },
      include: { contributions: true },
    });
    res.json({ goal });
  })
);

const contribSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(120).optional(),
  accountId: z.string().optional(),
});

router.post(
  "/:id/contributions",
  asyncHandler(async (req, res) => {
    const data = contribSchema.parse(req.body);
    const goal = await prisma.savingsGoal.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const nextAmount = new Prisma.Decimal(goal.currentAmount).plus(data.amount);
    const justCompleted =
      !goal.completedAt && nextAmount.greaterThanOrEqualTo(goal.targetAmount);

    let account = null;
    if (data.accountId) {
      account = await prisma.account.findFirst({
        where: { id: data.accountId, userId: req.userId! },
      });
      if (!account) return res.status(404).json({ error: "Account not found" });
    }

    const ops: any[] = [
      prisma.savingsContribution.create({
        data: { goalId: goal.id, amount: data.amount, note: data.note, accountId: data.accountId },
      }),
      prisma.savingsGoal.update({
        where: { id: goal.id },
        data: {
          currentAmount: nextAmount,
          completedAt: justCompleted ? new Date() : goal.completedAt,
        },
      }),
    ];
    if (account) {
      ops.push(
        prisma.account.update({
          where: { id: account.id },
          data: { balance: new Prisma.Decimal(account.balance).minus(data.amount) },
        })
      );
    }
    const [contribution] = await prisma.$transaction(ops);
    res.status(201).json({ contribution });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await prisma.savingsGoal.deleteMany({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  })
);

export default router;
