import admin from 'firebase-admin';

export interface Clock {
  now(): number;
  firestoreTimestamp(): admin.firestore.Timestamp;
}

export const SystemClock: Clock = {
  now: () => Date.now(),
  firestoreTimestamp: () => admin.firestore.Timestamp.now(),
};

let currentClock: Clock = SystemClock;

export function setClock(clock: Clock): void {
  currentClock = clock;
}

export function resetClock(): void {
  currentClock = SystemClock;
}

export function getClock(): Clock {
  return currentClock;
}

/**
 * Creates an in-memory controllable clock for deterministic testing.
 */
export function createFakeClock(initialEpochMs: number = Date.now()): Clock & { advance(ms: number): void; set(epochMs: number): void } {
  let epoch = initialEpochMs;

  return {
    now: () => epoch,
    firestoreTimestamp: () => admin.firestore.Timestamp.fromMillis(epoch),
    advance: (ms: number) => {
      epoch += ms;
    },
    set: (epochMs: number) => {
      epoch = epochMs;
    },
  };
}

