import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

const baseSchema = z.object({
  description: z.string().min(1).max(120),
  store: z.string().min(1).max(60),
  totalAmount: z.number().min(0),
  totalMonths: z.number().int().min(1).max(60),
  monthlyAmount: z.number().min(0),
  startDate: z.coerce.date(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const msi = await prisma.mSIPurchase.findMany({
      where: { userId: req.userId! },
      include: { payments: { orderBy: { date: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ msi });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = baseSchema.parse(req.body);
    const msi = await prisma.mSIPurchase.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json({ msi });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = baseSchema.partial().extend({ monthsPaid: z.number().int().min(0).optional() }).parse(req.body);
    const result = await prisma.mSIPurchase.updateMany({
      where: { id: String(req.params.id), userId: req.userId! },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    const msi = await prisma.mSIPurchase.findUnique({
      where: { id: String(req.params.id) },
      include: { payments: true },
    });
    res.json({ msi });
  })
);

router.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const msi = await prisma.mSIPurchase.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!msi) return res.status(404).json({ error: "Not found" });
    if (msi.monthsPaid >= msi.totalMonths) {
      return res.status(409).json({ error: "Already fully paid" });
    }
    const [payment] = await prisma.$transaction([
      prisma.mSIPayment.create({
        data: { msiId: msi.id, amount: msi.monthlyAmount },
      }),
      prisma.mSIPurchase.update({
        where: { id: msi.id },
        data: { monthsPaid: { increment: 1 } },
      }),
    ]);
    res.status(201).json({ payment });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await prisma.mSIPurchase.deleteMany({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  })
);

export default router;
