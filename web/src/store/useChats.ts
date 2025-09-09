import { create } from 'zustand';
import { apiDelete, apiGet, apiPatch, apiPost, sseChatPost } from '../lib/api';

export type Chat = {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Message = {
  id: string;
  chatId: string;
  role: 'system'|'user'|'assistant';
  content: string;
  createdAt: string;
}

type ChatsState = {
  chats: Chat[];
  messages: Message[];
  selectedChatId: string | null;
  isStreaming: boolean;
  error: string | null;
  fetchChats: () => Promise<void>;
  selectChat: (id: string) => Promise<void>;
  createChat: (title?: string, model?: string) => Promise<Chat>;
  renameChat: (id: string, title: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  updateModel: (id: string, model: string) => Promise<void>;
  updateSystemPrompt: (id: string, systemPrompt: string) => Promise<void>;
}

export const useChatsStore = create<ChatsState>((set, get) => ({
  chats: [],
  messages: [],
  selectedChatId: null,
  isStreaming: false,
  error: null,

  async fetchChats() {
    const data = await apiGet<{ chats: Chat[] }>(`/api/chats`);
    set({ chats: data.chats });
    if (data.chats.length > 0 && !get().selectedChatId) {
      await get().selectChat(data.chats[0].id);
    }
  },

  async selectChat(id: string) {
    const data = await apiGet<{ chat: Chat, messages: Message[] }>(`/api/chats/${id}`);
    set({ selectedChatId: id, messages: data.messages });
    // ensure chat exists in list
    const list = get().chats;
    if (!list.find(c => c.id === id)) set({ chats: [data.chat, ...list] });
  },

  async createChat(title?: string, model?: string) {
    const data = await apiPost<{ chat: Chat }>(`/api/chats`, { title, model });
    set({ chats: [data.chat, ...get().chats], selectedChatId: data.chat.id, messages: [] });
    return data.chat;
  },

  async renameChat(id: string, title: string) {
    const data = await apiPatch<{ chat: Chat }>(`/api/chats/${id}`, { title });
    set({ chats: get().chats.map(c => c.id === id ? data.chat : c) });
  },

  async deleteChat(id: string) {
    await apiDelete(`/api/chats/${id}`);
    const remaining = get().chats.filter(c => c.id !== id);
    set({ chats: remaining });
    if (get().selectedChatId === id) {
      const next = remaining[0]?.id || null;
      set({ selectedChatId: next, messages: [] });
    }
  },

  async updateModel(id: string, model: string) {
    const data = await apiPatch<{ chat: Chat }>(`/api/chats/${id}`, { model });
    set({ chats: get().chats.map(c => c.id === id ? data.chat : c) });
  },

  async updateSystemPrompt(id: string, systemPrompt: string) {
    const data = await apiPatch<{ chat: Chat }>(`/api/chats/${id}`, { systemPrompt });
    set({ chats: get().chats.map(c => c.id === id ? data.chat : c) });
  },

  async sendMessage(text: string) {
    const chatId = get().selectedChatId;
    if (!chatId) throw new Error('No chat selected');
    // append user message locally
    const tempId = `temp_${Date.now()}`;
    const userMsg: Message = { id: tempId, chatId, role: 'user', content: text, createdAt: new Date().toISOString() };
    set({ messages: [...get().messages, userMsg], isStreaming: true, error: null });
    let assistantText = '';
    try {
      await sseChatPost(`/api/chat`, { chatId, message: text }, (t) => {
        assistantText += t;
        const assistantTemp: Message = { id: 'assistant_temp', chatId, role: 'assistant', content: assistantText, createdAt: new Date().toISOString() };
        // ensure last message is assistant temp
        const msgs = get().messages.filter(m => m.id !== 'assistant_temp');
        set({ messages: [...msgs, assistantTemp] });
      });
    } catch (e: any) {
      if (e?.needModelLoad) {
        set({ error: 'Please select and load a model before sending.' });
      } else {
        set({ error: e?.message || 'Error sending message' });
      }
    } finally {
      set({ isStreaming: false });
      if (assistantText.length > 0) {
        // refresh messages from server to replace temp with persisted ones
        const data = await apiGet<{ chat: Chat, messages: Message[] }>(`/api/chats/${chatId}`);
        set({ messages: data.messages });
      }
    }
  }
}));
