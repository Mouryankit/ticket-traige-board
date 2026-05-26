import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import ticketsRouter from './routes/tickets.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const API_PREFIX = '/bfhl';

export function createApp() {
  const app = express();
  const clientOrigin = process.env.CLIENT_ORIGIN || '*';

  app.use(helmet());
  app.use(cors({ origin: clientOrigin === '*' ? true : clientOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get(`${API_PREFIX}/health`, (req, res) => {
    res.json({ ok: true });
  });

  app.use(`${API_PREFIX}/tickets`, ticketsRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
