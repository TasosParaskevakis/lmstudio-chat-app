import { useNavigate } from 'react-router-dom';
import { useChatsStore } from '../store/useChats';
import { useModelStore } from '../store/useModel';

export function Sidebar() {
  const navigate = useNavigate();
  const { chats, selectedChatId, createChat, deleteChat, renameChat } = useChatsStore();
  const { loadedModel, status, progress } = useModelStore();

  const onNew = async () => {
    const chat = await createChat('New Chat');
    navigate(`/chat/${chat.id}`);
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-3 border-b">
        <button onClick={onNew} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">New Chat</button>
      </div>
      <div className="px-3 py-2 text-sm text-gray-600 border-b">
        <div>Model: <span className="font-medium">{loadedModel ?? 'None'}</span></div>
        <div>Status: {status}{status !== 'idle' ? ` (${progress}%)` : ''}</div>
      </div>
      <div className="flex-1 overflow-auto">
        {chats.map(c => (
          <div key={c.id} className={`px-3 py-2 border-b cursor-pointer ${selectedChatId===c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`} onClick={() => navigate(`/chat/${c.id}`)}>
            <div className="flex items-center justify-between">
              <div className="font-medium truncate mr-2">{c.title}</div>
              <div className="flex gap-1 text-xs text-gray-500">
                <button className="hover:text-gray-700" onClick={(e) => {e.stopPropagation(); const t = prompt('Rename chat', c.title); if (t) renameChat(c.id, t)}}>Rename</button>
                <button className="hover:text-red-600" onClick={(e) => {e.stopPropagation(); if (confirm('Delete chat?')) deleteChat(c.id)}}>Delete</button>
              </div>
            </div>
            <div className="text-xs text-gray-500 truncate">{new Date(c.updatedAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

