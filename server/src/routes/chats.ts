import { Router } from 'express';
import { prisma } from '../db/prisma.js';

export const chatsRouter = Router();

// Create chat
chatsRouter.post('/', async (req, res) => {
  const { title = 'New Chat', model = '' } = req.body || {};
  const chat = await prisma.chat.create({ data: { title, model } });
  res.json({ chat });
});

// List chats
chatsRouter.get('/', async (req, res) => {
  const chats = await prisma.chat.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json({ chats });
});

// Get chat + messages
chatsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) return res.status(404).json({ error: 'Not found' });
  const messages = await prisma.message.findMany({ where: { chatId: id }, orderBy: { createdAt: 'asc' } });
  res.json({ chat, messages });
});

// Update chat
chatsRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, model, systemPrompt } = req.body || {};
  const chat = await prisma.chat.update({ where: { id }, data: { title, model, systemPrompt } });
  res.json({ chat });
});

// Delete chat
chatsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.chat.delete({ where: { id } });
  res.status(204).end();
});

// Add message
chatsRouter.post('/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { role, content } = req.body || {};
  if (!role || !content) return res.status(400).json({ error: 'role and content required' });
  const message = await prisma.message.create({ data: { chatId: id, role, content } });
  await prisma.chat.update({ where: { id }, data: { updatedAt: new Date() } });
  res.json({ message });
});

// Delete message
chatsRouter.delete('/:id/messages/:mid', async (req, res) => {
  const { mid } = req.params;
  await prisma.message.delete({ where: { id: mid } });
  res.status(204).end();
});

