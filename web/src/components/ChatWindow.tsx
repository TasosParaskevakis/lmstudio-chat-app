import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useChatsStore } from '../store/useChats';
import { useModelStore } from '../store/useModel';
import { MessageBubble } from './MessageBubble';
import { ModelSelector } from './ModelSelector';

export function ChatWindow() {
  const { messages, selectedChatId, sendMessage, updateSystemPrompt, chats, error, isStreaming } = useChatsStore();
  const { status } = useModelStore();
  const [input, setInput] = useState('');
  const [system, setSystem] = useState('');
  const currentChat = useMemo(() => chats.find(c => c.id === selectedChatId) || null, [chats, selectedChatId]);
  useEffect(() => {
    setSystem(currentChat?.systemPrompt || '');
  }, [currentChat?.id]);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Track bottom proximity
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(distance < 80);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll while streaming or if user is already near bottom
  useEffect(() => {
    if (atBottom || isStreaming) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, atBottom]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await sendMessage(input.trim());
    } catch {}
    setInput('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      (document.getElementById('sendBtn') as HTMLButtonElement)?.click();
    }
  }

  const canSend = status === 'idle';

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between bg-white">
        <div className="font-semibold">LM Studio Chat</div>
        <ModelSelector />
      </div>
      <div className="p-3 border-b bg-white">
        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
        <div className="text-xs text-gray-600 mb-1">System Prompt</div>
        <div className="flex gap-2">
          <textarea
            className="flex-1 border rounded p-2 h-16"
            placeholder="You are a helpful assistant..."
            value={system}
            onChange={(e)=>setSystem(e.target.value)}
          />
          <button
            className="px-3 py-2 bg-gray-800 text-white rounded"
            onClick={() => { if (selectedChatId) updateSystemPrompt(selectedChatId, system) }}
          >Save</button>
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-auto p-4">
        {messages.map(m => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={onSubmit} className="p-3 bg-white border-t">
        <div className="flex gap-2">
          <textarea
            className="flex-1 border rounded p-2 h-24"
            placeholder={canSend ? 'Type a message...' : 'Model is loading...'}
            value={input}
            onKeyDown={onKeyDown}
            onChange={(e)=>setInput(e.target.value)}
          />
          <button id="sendBtn" type="submit" disabled={!canSend} className={`px-4 py-2 rounded ${canSend ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-600'}`}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
