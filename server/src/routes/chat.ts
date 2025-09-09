import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { env } from '../env.js';
import { modelManager } from '../modelManager.js';

export const chatRouter = Router();

function approxTokenCount(text: string) {
  // crude approximation: 4 chars per token
  return Math.ceil(text.length / 4);
}

async function buildContextMessages(chatId: string, maxTokens: number) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat) throw new Error('Chat not found');
  const history = await prisma.message.findMany({ where: { chatId }, orderBy: { createdAt: 'asc' } });
  const base: any[] = [];
  if (chat.systemPrompt) base.push({ role: 'system', content: chat.systemPrompt });
  // sliding window from end
  let total = base.reduce((n, m) => n + approxTokenCount(m.content), 0);
  const selected: any[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    const tokens = approxTokenCount(m.content);
    if (total + tokens > maxTokens) break;
    selected.push({ role: m.role as any, content: m.content });
    total += tokens;
  }
  selected.reverse();
  return [...base, ...selected];
}

chatRouter.post('/', async (req, res) => {
  const { chatId, message } = req.body || {};
  const status = modelManager.getStatus();
  if (status.status !== 'idle' || !status.activeModelName) {
    return res.status(409).json({ needModelLoad: true });
  }
  if (!chatId || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'chatId and message required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  try {
    // Persist the user message immediately
    await prisma.message.create({ data: { chatId, role: 'user', content: message } });
    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date(), model: status.activeModelName } });

    // Build context
    let messages: any[];
    if (env.HISTORY_ENABLED) {
      messages = await buildContextMessages(chatId, env.MAX_CONTEXT_TOKENS);
    } else {
      // Stateless mode: only system + current user message
      const chat = await prisma.chat.findUnique({ where: { id: chatId } });
      messages = [];
      if (chat?.systemPrompt) messages.push({ role: 'system', content: chat.systemPrompt });
      messages.push({ role: 'user', content: message });
    }

    const body = {
      model: status.activeModelName,
      stream: true,
      messages
    };

    const resp = await fetch(`${env.LMSTUDIO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok || !resp.body) {
      send(JSON.stringify({ error: `Upstream error ${resp.status}` }));
      return res.end();
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let assistantText = '';
    let buffer = '';
    outer: while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const lineRaw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (!lineRaw) continue;
        if (lineRaw.startsWith('data:')) {
          // Keep data exactly as sent (preserve spaces/newlines)
          let data = lineRaw.slice(5);
          if (data.startsWith(' ')) data = data.slice(1);
          if (data === '[DONE]') {
            send('[DONE]');
            break outer;
          }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta !== undefined && delta !== null && delta !== '') {
              assistantText += delta;
              send(delta);
            }
          } catch {
            // ignore non-JSON chunks from upstream
          }
        }
      }
    }

    // Save assistant message
    if (assistantText.trim().length > 0) {
      await prisma.message.create({ data: { chatId, role: 'assistant', content: assistantText } });
      await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    }
    res.end();
  } catch (e: any) {
    send(JSON.stringify({ error: e?.message || 'Error' }));
    res.end();
  }
});
