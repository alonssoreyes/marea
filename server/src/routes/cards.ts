import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const baseSchema = z.object({
  bank: z.string().min(1).max(60),
  alias: z.string().min(1).max(60),
  cardLimit: z.number().min(0),
  cutoffDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  balance: z.number(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cards = await prisma.creditCard.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "asc" },
    });
    res.json({ cards });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = baseSchema.parse(req.body);
    const card = await prisma.creditCard.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json({ card });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = baseSchema.partial().parse(req.body);
    const result = await prisma.creditCard.updateMany({
      where: { id: String(req.params.id), userId: req.userId! },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: "Card not found" });
    const updated = await prisma.creditCard.findUnique({ where: { id: String(req.params.id) } });
    res.json({ card: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await prisma.creditCard.deleteMany({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (result.count === 0) return res.status(404).json({ error: "Card not found" });
    res.status(204).end();
  })
);

export default router;
