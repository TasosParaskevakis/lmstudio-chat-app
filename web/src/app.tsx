import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { useChatsStore } from './store/useChats';
import { useModelStore } from './store/useModel';

export function App() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchChats, selectedChatId, selectChat } = useChatsStore();
  const { fetchAvailable, fetchStatus } = useModelStore();

  useEffect(() => {
    fetchChats();
    fetchAvailable();
    fetchStatus();
  }, []);

  useEffect(() => {
    if (id && id !== selectedChatId) selectChat(id);
  }, [id]);

  useEffect(() => {
    if (!id && selectedChatId) navigate(`/chat/${selectedChatId}`);
  }, [selectedChatId]);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <ChatWindow />
      </div>
    </div>
  );
}

