import * as m from '$lib/paraglide/messages.js';
import { getAppSettings } from './app-settings.svelte.js';

export type AgentDoneAlert = 'off' | 'sound' | 'sound-notify';
export const AGENT_DONE_ALERTS: AgentDoneAlert[] = ['off', 'sound', 'sound-notify'];

export function normalizeAgentDoneAlert(value: string | undefined): AgentDoneAlert {
  return AGENT_DONE_ALERTS.includes(value as AgentDoneAlert) ? (value as AgentDoneAlert) : 'off';
}

/** Varios agentes terminando juntos tocam um aviso so. */
const SOUND_GAP_MS = 1_500;
let lastSoundAt = 0;

type SinkAudioContext = AudioContext & { setSinkId?: (sinkId: string) => Promise<void> };

/** Dois tons curtos e suaves, gerados na hora: nao depende de arquivo de audio. */
export async function playAgentDoneSound(outputDeviceId?: string): Promise<void> {
  const context: SinkAudioContext = new AudioContext();
  try {
    if (outputDeviceId && outputDeviceId !== 'default') await context.setSinkId?.(outputDeviceId).catch(() => undefined);
    const start = context.currentTime + 0.02;
    for (const [index, frequency] of [880, 1318.5].entries()) {
      const at = start + index * 0.16;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.45);
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
  } finally {
    await context.close().catch(() => undefined);
  }
}

/** Avisa que um agente terminou uma tarefa, conforme a preferencia do usuario. */
export async function alertAgentFinished(agentTitle: string): Promise<void> {
  const settings = await getAppSettings();
  const mode = normalizeAgentDoneAlert(settings.agentDoneAlert);
  if (mode === 'off') return;
  const now = Date.now();
  if (now - lastSoundAt >= SOUND_GAP_MS) {
    lastSoundAt = now;
    void playAgentDoneSound(settings.audioOutputDeviceId).catch(() => undefined);
  }
  if (mode !== 'sound-notify' || document.hasFocus() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const notification = new Notification(m['agent_done.notification_title']({ title: agentTitle }), {
    body: m['agent_done.notification_body'](),
    silent: true,
  });
  notification.onclick = () => window.focus();
}
