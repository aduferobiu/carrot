import "dotenv/config";
import cors from "cors";
import express from "express";
import { accountsRouter } from "./routes/accounts";
import { healthRouter } from "./routes/health";
import { insightsRouter } from "./routes/insights";
import { subscriptionsRouter } from "./routes/subscriptions";
import { transactionsRouter } from "./routes/transactions";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/accounts", accountsRouter);
app.use("/transactions", transactionsRouter);
app.use("/subscriptions", subscriptionsRouter);
app.use("/insights", insightsRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
