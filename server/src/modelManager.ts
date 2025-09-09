import { prisma } from './db/prisma.js';
import { env } from './env.js';

export type ModelStatus = 'idle' | 'loading' | 'unloading';

type ManagerState = {
  activeModelName: string | null;
  status: ModelStatus;
  progress: number;
};

class ModelManager {
  private state: ManagerState = { activeModelName: null, status: 'idle', progress: 0 };
  private timer: NodeJS.Timeout | null = null;

  async init() {
    const s = await prisma.setting.findUnique({ where: { key: 'activeModel' } });
    if (s && s.value) {
      this.state.activeModelName = s.value;
      this.state.status = 'idle';
      this.state.progress = 100;
    }
  }

  getStatus(): ManagerState {
    return { ...this.state };
  }

  async load(name: string) {
    if (this.state.activeModelName === name && this.state.status === 'idle') {
      return; // noop
    }
    if (this.state.status !== 'idle') return;
    this.state.status = 'loading';
    this.state.progress = 0;

    // Start a mock progress ticker but cap at 99% until warmup finishes
    const duration = 3000 + Math.floor(Math.random() * 5000); // 3-8s visual estimate
    const start = Date.now();
    let warmed = false;
    const warmupPromise = this.warmupLoad(name).catch(() => {}).finally(() => { warmed = true; });

    const tick = () => {
      const elapsed = Date.now() - start;
      let p = Math.floor((elapsed / duration) * 100);
      if (!warmed) p = Math.min(p, 99);
      else p = Math.max(p, 99);
      this.state.progress = Math.min(100, p);
      if (this.state.progress >= 100 || (warmed && p >= 100)) {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.state.activeModelName = name;
        this.state.status = 'idle';
        this.state.progress = 100;
        prisma.setting.upsert({
          where: { key: 'activeModel' },
          update: { value: name },
          create: { key: 'activeModel', value: name }
        }).catch(() => {});
      }
    };
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(tick, 150);
    // Ensure we complete once warmed in case the ticker hasn't reached 100
    warmupPromise.then(() => {
      // Force final tick to 100
      this.state.progress = 100;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.state.activeModelName = name;
      this.state.status = 'idle';
      prisma.setting.upsert({
        where: { key: 'activeModel' },
        update: { value: name },
        create: { key: 'activeModel', value: name }
      }).catch(() => {});
    });
  }

  async unload() {
    if (this.state.status !== 'idle') return;
    if (!this.state.activeModelName) return;
    this.state.status = 'unloading';
    this.state.progress = 0;
    // Mock quick unload
    setTimeout(() => {
      this.state.activeModelName = null;
      this.state.status = 'idle';
      this.state.progress = 0;
      prisma.setting.delete({ where: { key: 'activeModel' } }).catch(() => {});
    }, 800);
  }

  private async warmupLoad(name: string): Promise<void> {
    // TODO: Replace this warmup with a proper LM Studio load API if/when available.
    // This sends a tiny non-persistent request to trigger LM Studio's JIT loader.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const body = {
        model: name,
        stream: false,
        temperature: 0,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      } as any;
      const resp = await fetch(`${env.LMSTUDIO_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      // We don't care about the result; success means model is now loaded.
      if (!resp.ok) {
        // let it fail silently; UI still shows the model as selected
      }
    } catch {
      // Ignore abort/errors; loader remains mock-progress only
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const modelManager = new ModelManager();
