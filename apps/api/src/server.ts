import cors from "cors";
import express from "express";
import helmet from "helmet";
import { apiRouter } from "./routes";
import { errorMiddleware } from "./utils/errors";

export function createApp() {
  const app = express();
  const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : "*" }));
  app.use("/api/v1/payments/stripe/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ data: { ok: true, service: "the-pet-villa-api" }, meta: {}, error: null });
  });

  app.use("/api/v1", apiRouter);
  app.use(errorMiddleware);

  return app;
}
