import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { computeLoanAmortization } from "../lib/finance.js";

const router = Router();
router.use(requireAuth);

const baseSchema = z.object({
  bank: z.string().min(1).max(60),
  originalAmount: z.number().min(0),
  remainingAmount: z.number().min(0),
  annualRate: z.number().min(0).max(1),
  totalPayments: z.number().int().min(1),
  monthlyPayment: z.number().min(0),
  startDate: z.coerce.date(),
  sourceAccountId: z.string().nullable().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const loans = await prisma.loan.findMany({
      where: { userId: req.userId! },
      include: { payments: { orderBy: { date: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ loans });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = baseSchema.parse(req.body);
    const loan = await prisma.loan.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json({ loan });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = baseSchema.partial().parse(req.body);
    const result = await prisma.loan.updateMany({
      where: { id: String(req.params.id), userId: req.userId! },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    const loan = await prisma.loan.findUnique({
      where: { id: String(req.params.id) },
      include: { payments: true },
    });
    res.json({ loan });
  })
);

const paymentSchema = z.object({ extra: z.number().min(0).default(0) });

router.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const { extra } = paymentSchema.parse(req.body);
    const loan = await prisma.loan.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    const { interest, principal, newBalance } = computeLoanAmortization({
      remainingAmount: Number(loan.remainingAmount),
      annualRate: Number(loan.annualRate),
      monthlyPayment: Number(loan.monthlyPayment),
    });

    const totalPaid = Number(loan.monthlyPayment) + extra;

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.loanPayment.create({
        data: {
          loanId: loan.id,
          amount: totalPaid,
          principal: principal + extra,
          interest,
        },
      }),
      prisma.loan.update({
        where: { id: loan.id },
        data: {
          remainingAmount: Prisma.Decimal.max(new Prisma.Decimal(0), new Prisma.Decimal(newBalance - extra)),
        },
      }),
    ];

    if (loan.sourceAccountId) {
      const acc = await prisma.account.findFirst({
        where: { id: loan.sourceAccountId, userId: req.userId! },
      });
      if (acc) {
        ops.push(
          prisma.account.update({
            where: { id: acc.id },
            data: { balance: new Prisma.Decimal(Number(acc.balance)).sub(totalPaid) },
          })
        );
      }
    }

    const [payment] = await prisma.$transaction(ops);
    res.status(201).json({ payment });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await prisma.loan.deleteMany({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  })
);

export default router;
