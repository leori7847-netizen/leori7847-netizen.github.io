import express from "express";

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: process.env.PYTHON_SANDBOX_MODE || "mock" });
});

app.listen(process.env.PORT || 8787, () => {
  console.log("AI exam simulator API ready");
});
