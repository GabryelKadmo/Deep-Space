import { randomUUID } from 'node:crypto';

type SecretResponse = {
  type: 'deepspace:secret:result';
  requestId: string;
  value?: string | null;
  error?: string;
};

type PendingSecret = {
  resolve: (value: string | null) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const state = globalThis as typeof globalThis & {
  __deepspaceSecretPending?: Map<string, PendingSecret>;
  __deepspaceSecretListenerReady?: boolean;
};

const pending = state.__deepspaceSecretPending ??= new Map<string, PendingSecret>();

if (!state.__deepspaceSecretListenerReady && typeof process.on === 'function') {
  process.on('message', (message: unknown) => {
    const response = message as Partial<SecretResponse> | null;
    if (response?.type !== 'deepspace:secret:result' || !response.requestId) return;
    const request = pending.get(response.requestId);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(response.requestId);
    if (response.error) request.reject(new Error(response.error));
    else request.resolve(response.value ?? null);
  });
  state.__deepspaceSecretListenerReady = true;
}

export class DesktopSecretService {
  private async request(type: 'deepspace:secret:get' | 'deepspace:secret:set' | 'deepspace:secret:delete', key: string, value?: string): Promise<string | null> {
    if (!/^automation:[a-z0-9:_-]{1,240}$/i.test(key)) throw new Error('Invalid automation secret key.');
    if (typeof process.send !== 'function') {
      if (type !== 'deepspace:secret:get') return null;
      if (key.includes(':github:')) return process.env.DEEPSPACE_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? null;
      if (key.includes(':figma:')) return process.env.DEEPSPACE_FIGMA_TOKEN ?? process.env.FIGMA_ACCESS_TOKEN ?? null;
      return null;
    }
    const requestId = randomUUID();
    return new Promise<string | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('Secure credential request timed out.'));
      }, 5_000);
      timer.unref?.();
      pending.set(requestId, { resolve, reject, timer });
      process.send?.({ type, requestId, key, ...(value === undefined ? {} : { value }) });
    });
  }

  get(key: string): Promise<string | null> { return this.request('deepspace:secret:get', key); }
  async set(key: string, value: string): Promise<void> { await this.request('deepspace:secret:set', key, value); }
  async delete(key: string): Promise<void> { await this.request('deepspace:secret:delete', key); }
}

export const desktopSecretService = new DesktopSecretService();
