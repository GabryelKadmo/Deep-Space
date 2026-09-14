type StartupState = { ready: Promise<void>; release: () => void };

// Node's production launcher and the bundled Svelar hooks load separate copies.
const state = globalThis as typeof globalThis & { __deepspaceDatabaseStartup?: StartupState };

export function holdBackgroundStartup(): () => void {
  if (!state.__deepspaceDatabaseStartup) {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    state.__deepspaceDatabaseStartup = { ready, release };
  }
  return state.__deepspaceDatabaseStartup.release;
}

export async function afterDatabaseReady(start: () => void): Promise<void> {
  await state.__deepspaceDatabaseStartup?.ready;
  start();
}
