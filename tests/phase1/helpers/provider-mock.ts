import { vi } from 'vitest';

export interface ProviderMockOptions {
  latencyMs?: number;
  shouldTimeout?: boolean;
  shouldError?: boolean;
  statusCode?: number;
  errorMessage?: string;
  responsePayload?: unknown;
}

export class ControllableProviderMock {
  public callCount = 0;
  private options: ProviderMockOptions = {};

  configure(options: ProviderMockOptions) {
    this.options = { ...this.options, ...options };
  }

  reset() {
    this.callCount = 0;
    this.options = {};
  }

  install() {
    this.reset();

    global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      this.callCount++;

      // Simulate network timeout with abort signal
      if (this.options.shouldTimeout) {
        if (init?.signal) {
          const signal = init.signal;
          return new Promise((_, reject) => {
            const timer = setTimeout(() => {
              reject(new Error('Connection timed out'));
            }, this.options.latencyMs || 4000);

            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              const abortErr = new Error('The operation was aborted');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          });
        }
      }

      if (this.options.latencyMs && this.options.latencyMs > 0) {
        await new Promise((r) => setTimeout(r, this.options.latencyMs));
      }

      if (this.options.shouldError) {
        return {
          ok: false,
          status: this.options.statusCode || 500,
          text: async () => this.options.errorMessage || 'Internal Server Error',
          json: async () => ({ error: this.options.errorMessage || 'Internal Server Error' }),
        } as unknown as Response;
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(this.options.responsePayload || { status: 'success' }),
        json: async () => this.options.responsePayload || { status: 'success' },
      } as unknown as Response;
    });
  }
}

export const providerMock = new ControllableProviderMock();
