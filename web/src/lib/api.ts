const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(BASE + path);
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(BASE + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function apiDelete(path: string): Promise<void> {
  const resp = await fetch(BASE + path, { method: 'DELETE' });
  if (!resp.ok) throw new Error(await resp.text());
}

export async function sseChatPost(
  path: string,
  body: any,
  onToken: (t: string) => void
): Promise<void> {
  const resp = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    if (resp.status === 409) {
      try {
        const json = await resp.json();
        const err: any = new Error('Model not loaded');
        err.needModelLoad = !!json.needModelLoad;
        throw err;
      } catch {
        const err: any = new Error('Model not loaded');
        err.needModelLoad = true;
        throw err;
      }
    }
    throw new Error('Failed to start stream');
  }
  if (!resp.body) throw new Error('No response body');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      // Process SSE event lines without trimming token content
      const line = chunk; // keep as-is
      if (!line.startsWith('data:')) continue;
      let data = line.slice(5);
      if (data.startsWith(' ')) data = data.slice(1);
      if (data === '[DONE]') return;
      try {
        // server sends raw tokens or JSON errors; try JSON first
        const obj = JSON.parse(data);
        if (obj.error) throw new Error(obj.error);
      } catch {
        // Forward raw token including spaces/newlines
        onToken(data);
      }
    }
  }
}
