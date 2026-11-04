import { vi } from 'vitest';

export class FakeTimersController {
  useFakeClock(initialTime = 1730680000000) {
    vi.useFakeTimers();
    vi.setSystemTime(initialTime);
  }

  advanceTime(ms: number) {
    vi.advanceTimersByTime(ms);
  }

  restoreRealClock() {
    vi.useRealTimers();
  }
}

export const fakeTimers = new FakeTimersController();
