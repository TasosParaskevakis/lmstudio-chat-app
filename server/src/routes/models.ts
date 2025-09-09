import { Router } from 'express';
import { env } from '../env.js';
import { modelManager } from '../modelManager.js';

export const modelsRouter = Router();

modelsRouter.get('/available', async (req, res) => {
  // Try LM Studio /v1/models, fallback to a mock list on error
  try {
    const resp = await fetch(`${env.LMSTUDIO_BASE_URL}/models`);
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const data = await resp.json();
    const models: string[] = (data?.data || [])
      .map((m: any) => m.id || m.name)
      .filter(Boolean);
    res.json({ models });
  } catch (e) {
    const fallback = [
      'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF',
      'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
      'NousResearch/Hermes-2-Pro-Llama-3-8B-GGUF'
    ];
    res.json({ models: fallback, note: 'LM Studio unavailable; showing fallback list.' });
  }
});

modelsRouter.get('/loaded', (req, res) => {
  const s = modelManager.getStatus();
  res.json({ model: s.activeModelName, status: s.status, progress: s.progress });
});

modelsRouter.post('/load', async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
  modelManager.load(name);
  res.status(202).json({ statusUrl: '/api/models/status' });
});

modelsRouter.post('/unload', async (req, res) => {
  modelManager.unload();
  res.status(202).json({ statusUrl: '/api/models/status' });
});

modelsRouter.get('/status', (req, res) => {
  const s = modelManager.getStatus();
  res.json({ model: s.activeModelName, status: s.status, progress: s.progress });
});

