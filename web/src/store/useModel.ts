import { create } from 'zustand';
import { apiGet, apiPost } from '../lib/api';

type Status = 'idle' | 'loading' | 'unloading';

type ModelState = {
  available: string[];
  loadedModel: string | null;
  status: Status;
  progress: number;
  fetchAvailable: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  loadModel: (name: string) => Promise<void>;
  unloadModel: () => Promise<void>;
  pollUntilIdle: () => Promise<void>;
}

export const useModelStore = create<ModelState>((set, get) => ({
  available: [],
  loadedModel: null,
  status: 'idle',
  progress: 0,
  async fetchAvailable() {
    const data = await apiGet<{ models: string[] }>(`/api/models/available`);
    set({ available: data.models });
  },
  async fetchStatus() {
    const data = await apiGet<{ model: string|null, status: Status, progress: number }>(`/api/models/status`);
    set({ loadedModel: data.model, status: data.status, progress: data.progress });
  },
  async loadModel(name: string) {
    await apiPost(`/api/models/load`, { name });
    await get().pollUntilIdle();
  },
  async unloadModel() {
    await apiPost(`/api/models/unload`, {});
    await get().pollUntilIdle();
  },
  async pollUntilIdle() {
    // simple polling every 400ms
    let tries = 0;
    while (tries < 200) {
      tries++;
      await new Promise((r) => setTimeout(r, 400));
      await get().fetchStatus();
      const { status } = get();
      if (status === 'idle') break;
    }
  }
}));

