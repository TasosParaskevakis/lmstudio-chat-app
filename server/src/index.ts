import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { prisma } from './db/prisma.js';
import { modelsRouter } from './routes/models.js';
import { chatsRouter } from './routes/chats.js';
import { chatRouter } from './routes/chat.js';
import { modelManager } from './modelManager.js';

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: false }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/models', modelsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/chat', chatRouter);

async function start() {
  try {
    await prisma.$connect();
    await modelManager.init();
    app.listen(env.PORT, () => {
      console.log(`Server listening on http://localhost:${env.PORT}`);
    });
  } catch (e) {
    console.error('Failed to start server', e);
    process.exit(1);
  }
}

start();

