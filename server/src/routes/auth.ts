import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(120),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  paymentSchedule: true,
  payday: true,
  payWeekday: true,
  payAnchorDate: true,
  loanPayday: true,
  monthlyIncome: true,
  onboardingStep: true,
  createdAt: true,
  updatedAt: true,
} as const;

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
      },
      select: SAFE_USER_SELECT,
    });
    const token = signToken({ sub: user.id, email: user.email });
    res.status(201).json({ user, token });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const { passwordHash, ...safe } = user;
    const token = signToken({ sub: user.id, email: user.email });
    res.json({ user: safe, token });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: SAFE_USER_SELECT,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  })
);

const updateUserSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  paymentSchedule: z.enum(["monthly", "biweekly", "weekly"]).optional(),
  payday: z.number().int().min(1).max(31).optional(),
  payWeekday: z.number().int().min(0).max(6).optional(),
  payAnchorDate: z.string().nullable().optional(),
  loanPayday: z.number().int().min(1).max(31).optional(),
  monthlyIncome: z.number().min(0).optional(),
  onboardingStep: z.number().int().min(0).max(5).optional(),
});

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    const { payAnchorDate, ...rest } = data;
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        ...rest,
        ...(payAnchorDate !== undefined
          ? { payAnchorDate: payAnchorDate ? new Date(payAnchorDate) : null }
          : {}),
      },
      select: SAFE_USER_SELECT,
    });
    res.json({ user });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(120),
});

router.post("/change-password", requireAuth, asyncHandler(async (req, res) => {
  const data = changePasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.status(204).end();
}));

export default router;
