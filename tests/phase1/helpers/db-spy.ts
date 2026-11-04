import { vi } from 'vitest';

export interface DatabaseExecutionRecord {
  collection: string;
  operation: 'get' | 'where' | 'limit' | 'set' | 'add' | 'update' | 'delete';
  queryArgs: unknown[];
  timestamp: number;
}

export class DatabaseSpy {
  private callLog: DatabaseExecutionRecord[] = [];
  public executeSpy = vi.fn();

  record(operation: DatabaseExecutionRecord['operation'], collection: string, ...queryArgs: unknown[]) {
    this.callLog.push({
      collection,
      operation,
      queryArgs,
      timestamp: Date.now(),
    });
    this.executeSpy(operation, collection, ...queryArgs);
  }

  get calls(): DatabaseExecutionRecord[] {
    return [...this.callLog];
  }

  get callCount(): number {
    return this.callLog.length;
  }

  reset() {
    this.callLog = [];
    this.executeSpy.mockReset();
  }

  assertZeroCalls() {
    if (this.callLog.length > 0) {
      throw new Error(`Expected zero database operations, but recorded ${this.callLog.length} calls`);
    }
  }
}

export const dbSpy = new DatabaseSpy();
