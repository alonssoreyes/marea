import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const categoryEnum = z.enum([
  "alimentos","transporte","entretenimiento","salud","hogar","ropa","tecnologia","servicios","otros",
]);

router.get("/", asyncHandler(async (req, res) => {
  const budgets = await prisma.budget.findMany({ where: { userId: req.userId! } });
  res.json({ budgets });
}));

router.put("/", asyncHandler(async (req, res) => {
  const data = z.object({ category: categoryEnum, amount: z.number().min(0) }).parse(req.body);
  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId: req.userId!, category: data.category } },
    update: { amount: data.amount },
    create: { userId: req.userId!, category: data.category, amount: data.amount },
  });
  res.json({ budget });
}));

router.delete("/:category", asyncHandler(async (req, res) => {
  await prisma.budget.deleteMany({
    where: { userId: req.userId!, category: categoryEnum.parse(String(req.params.category)) },
  });
  res.status(204).end();
}));

export default router;
