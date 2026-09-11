import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { recordsRouter } from "./routes/records.js";

export const app = express();

app.use(cors({ origin: config.corsOrigins.includes("*") ? true : config.corsOrigins }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api-records", recordsRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

app.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ success: false, message });
});
