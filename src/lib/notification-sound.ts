const STORAGE_KEY = 'converse_notification_sound';

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'false') return false;
  if (stored === 'true') return true;
  return true; // default on
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Plays a short notification beep using Web Audio API (no audio file needed).
 */
export function playNotificationSound(): void {
  if (!isNotificationSoundEnabled()) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore if AudioContext not supported or user blocked
  }
}
