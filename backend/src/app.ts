import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Health check for debugging / readiness
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default app;
