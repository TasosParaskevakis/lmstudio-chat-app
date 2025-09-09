import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { prisma } from './db/prisma.js';
import { modelsRouter } from './routes/models.js';
import { chatsRouter } from './routes/chats.js';
import { chatRouter } from './routes/chat.js';
import { modelManager } from './modelManager.js';

const app = express();
// Support multiple CORS origins via comma-separated env or wildcard
const origins = env.CORS_ORIGIN.split(',').map(o => o.trim());
const corsOptions: cors.CorsOptions = origins.includes('*') ? { origin: true } : { origin: origins };
app.use(cors(corsOptions));
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
