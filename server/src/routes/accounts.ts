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
  balance: z.number(),
  minBalance: z.number().nullable().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "asc" },
    });
    res.json({ accounts });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = baseSchema.parse(req.body);
    const account = await prisma.account.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json({ account });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = baseSchema.partial().parse(req.body);
    const account = await prisma.account.updateMany({
      where: { id: String(req.params.id), userId: req.userId! },
      data,
    });
    if (account.count === 0) return res.status(404).json({ error: "Account not found" });
    const updated = await prisma.account.findUnique({ where: { id: String(req.params.id) } });
    res.json({ account: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await prisma.account.deleteMany({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (result.count === 0) return res.status(404).json({ error: "Account not found" });
    res.status(204).end();
  })
);

export default router;
