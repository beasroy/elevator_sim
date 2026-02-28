import app from './app';
import dotenv from 'dotenv';
import { mountApi } from './api';
import { tick } from './simulation/loop';
import { resetState } from './simulation/state';
import { resetGenerator } from './simulation/requestGenerator';

dotenv.config();

mountApi(app);
resetState();
resetGenerator();

const TICK_MS = 100;
setInterval(() => tick(TICK_MS), TICK_MS);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
