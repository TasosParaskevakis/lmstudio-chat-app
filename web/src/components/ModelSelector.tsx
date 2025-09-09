import { useEffect, useState } from 'react';
import { useModelStore } from '../store/useModel';
import { useChatsStore } from '../store/useChats';

export function ModelSelector() {
  const { available, loadedModel, status, progress, fetchAvailable, loadModel } = useModelStore();
  const { selectedChatId, updateModel } = useChatsStore();
  const [open, setOpen] = useState(false);

  useEffect(() => { fetchAvailable(); }, []);

  const onSelect = async (name: string) => {
    setOpen(false);
    if (name === loadedModel) return;
    await loadModel(name);
    if (selectedChatId) await updateModel(selectedChatId, name);
  };

  return (
    <div className="relative">
      <button className="border px-3 py-1 rounded bg-white" onClick={() => setOpen(o=>!o)}>
        {loadedModel ? `Model: ${loadedModel}` : 'Select Model'}
        {status !== 'idle' && <span className="ml-2 text-xs text-gray-600">{status} {progress}%</span>}
      </button>
      {open && (
        <div className="absolute mt-1 bg-white border rounded shadow z-10 w-80 max-h-80 overflow-auto">
          {available.map(m => (
            <div key={m} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(m)}>
              {m}
            </div>
          ))}
          {available.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No models found</div>}
        </div>
      )}
    </div>
  );
}
