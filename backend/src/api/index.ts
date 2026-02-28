// Mount API routes on the Express app.
 
import { type Express } from 'express';
import controls from './routes/controls';
import metrics from './routes/metrics';

export function mountApi(app: Express): void {
  app.use('/api/controls', controls);
  app.use('/api/metrics', metrics);
}
