export type Failure =
  | { kind: 'renderer' }
  | { kind: 'load'; code: number }
  | { kind: 'http'; status: number };

type RecoveryState = {
  generation: number;
  lastRecovery: number | null;
  failure: Failure | null;
  waitingForForeground: boolean;
};

type RecoveryEvent =
  | { type: 'failed'; generation: number; failure: Failure; active: boolean; now: number }
  | { type: 'foreground'; now: number }
  | { type: 'retry' };

export const initialRecovery: RecoveryState = {
  generation: 0, lastRecovery: null, failure: null, waitingForForeground: false,
};

// A page can finish loading just before it crashes. Keep the guard across load events.
const recoveryInterval = 30_000;

export function recover(state: RecoveryState, event: RecoveryEvent): RecoveryState {
  function reopen(lastRecovery: number | null): RecoveryState {
    return { ...initialRecovery, generation: state.generation + 1, lastRecovery };
  }
  switch (event.type) {
    case 'retry':
      return state.failure ? reopen(null) : state;
    case 'foreground':
      return state.waitingForForeground ? reopen(event.now) : state;
    case 'failed':
      if (event.generation !== state.generation || state.failure || state.waitingForForeground) return state;
      if (event.failure.kind === 'renderer' &&
          (state.lastRecovery === null || event.now - state.lastRecovery >= recoveryInterval)) {
        return event.active ? reopen(event.now) : { ...state, waitingForForeground: true };
      }
      return { ...state, failure: event.failure };
  }
}
