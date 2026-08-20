/**
 * Web Audio API Notification Sound Synthesizer
 * Provides a clean, modern, lightweight notification sound without external MP3 assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a pleasant, lightweight double-note chime (C5 -> E5).
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    masterGain.connect(ctx.destination);

    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Note 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.07);
    osc2.connect(masterGain);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.24);
  } catch (err) {
    // Silently ignore browser audio autoplay policy restrictions
    console.debug("[AudioService] Autoplay policy prevented audio chime:", err);
  }
}
