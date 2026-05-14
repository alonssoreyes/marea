import express from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import accountsRoutes from "./routes/accounts.js";
import cardsRoutes from "./routes/cards.js";
import fixedExpensesRoutes from "./routes/fixedExpenses.js";
import cardExpensesRoutes from "./routes/cardExpenses.js";
import cardPaymentsRoutes from "./routes/cardPayments.js";
import debitExpensesRoutes from "./routes/debitExpenses.js";
import incomeEventsRoutes from "./routes/incomeEvents.js";
import transfersRoutes from "./routes/transfers.js";
import loansRoutes from "./routes/loans.js";
import msiRoutes from "./routes/msi.js";
import goalsRoutes from "./routes/goals.js";
import budgetsRoutes from "./routes/budgets.js";

const app = express();

app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "marea-server", env: env.NODE_ENV });
});

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/fixed-expenses", fixedExpensesRoutes);
app.use("/api/card-expenses", cardExpensesRoutes);
app.use("/api/card-payments", cardPaymentsRoutes);
app.use("/api/debit-expenses", debitExpensesRoutes);
app.use("/api/income-events", incomeEventsRoutes);
app.use("/api/transfers", transfersRoutes);
app.use("/api/loans", loansRoutes);
app.use("/api/msi", msiRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/budgets", budgetsRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🌊 Marea API listening on http://localhost:${env.PORT}`);
});
