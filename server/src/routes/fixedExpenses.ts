import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const baseSchema = z.object({
  name: z.string().min(1).max(80),
  amount: z.number().min(0),
  payDay: z.number().int().min(1).max(31),
  sourceKind: z.enum(["account", "card"]),
  sourceId: z.string().min(1),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.fixedExpense.findMany({
      where: { userId: req.userId! },
      orderBy: { payDay: "asc" },
    });
    res.json({ fixedExpenses: items });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = baseSchema.parse(req.body);
    const fixed = await prisma.fixedExpense.create({
      data: { ...data, userId: req.userId!, paidCycles: [] },
    });
    res.status(201).json({ fixedExpense: fixed });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = baseSchema.partial().parse(req.body);
    const result = await prisma.fixedExpense.updateMany({
      where: { id: String(req.params.id), userId: req.userId! },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.fixedExpense.findUnique({ where: { id: String(req.params.id) } });
    res.json({ fixedExpense: updated });
  })
);

router.post(
  "/:id/toggle-paid",
  asyncHandler(async (req, res) => {
    const { cycle } = z.object({ cycle: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.body);
    const fixed = await prisma.fixedExpense.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!fixed) return res.status(404).json({ error: "Not found" });
    const next = fixed.paidCycles.includes(cycle)
      ? fixed.paidCycles.filter((c) => c !== cycle)
      : [...fixed.paidCycles, cycle];
    const updated = await prisma.fixedExpense.update({
      where: { id: fixed.id },
      data: { paidCycles: next },
    });
    res.json({ fixedExpense: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await prisma.fixedExpense.deleteMany({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  })
);

export default router;
