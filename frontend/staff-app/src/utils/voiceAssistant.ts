/**
 * Voice Assistant & Audio Guidance for Voice Picking & Industrial Warehousing
 * Uses Web Speech API with Vietnamese voice synthesis and audio cues.
 */

class VoiceAssistant {
  private isVoiceEnabled: boolean = true;
  private synth: SpeechSynthesis | null = null;
  private vietnameseVoice: SpeechSynthesisVoice | null = null;
  private audioContext: AudioContext | null = null;
  private listeners: ((enabled: boolean) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }

      // Auto-unlock audio context and voices upon first user interaction
      const unlock = () => {
        if (!this.audioContext) {
          try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
              this.audioContext.resume();
            }
          } catch (e) {
            // ignore
          }
        }
        this.initVoices();
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize Vietnamese voices (vi-VN, vi_VN, or Vietnamese named voices)
    this.vietnameseVoice =
      voices.find(v => v.lang.startsWith('vi') || v.name.toLowerCase().includes('vietnam')) ||
      voices.find(v => v.lang.startsWith('vi-VN')) ||
      voices[0] ||
      null;
  }

  public subscribe(fn: (enabled: boolean) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public setEnabled(enabled: boolean) {
    this.isVoiceEnabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
    this.listeners.forEach(fn => fn(enabled));
  }

  public isEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  public toggle(): boolean {
    const next = !this.isVoiceEnabled;
    this.setEnabled(next);
    if (next) {
      this.playTone('ALERT');
    }
    return next;
  }

  /**
   * Voice synthesis is permanently DISABLED as requested.
   * Replaced with subtle, professional sound effects.
   */
  public speak(text: string, priority: 'HIGH' | 'NORMAL' = 'NORMAL') {
    // Disabled text-to-speech voice completely.
    // Instead, plays a subtle chime if sound is enabled.
    if (!this.isVoiceEnabled) return;
    this.playTone('BEEP');
  }

  /**
   * Industrial Announcements - Sound effects only, zero voice
   */
  public announceNewPickingOrder() {
    this.playTone('ALERT');
  }

  public announceNewPackingOrder() {
    this.playTone('SUCCESS');
  }

  public announceNewInboundOrder() {
    this.playTone('ALERT');
  }

  /**
   * Play industrial confirmation or alert tone
   */
  public playTone(type: 'SUCCESS' | 'ERROR' | 'ALERT' | 'COMPLETE' | 'LOCATE' | 'BEEP' | 'SMARTKEY') {
    if (!this.isVoiceEnabled) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'SMARTKEY') {
        // Realistic car/motorbike key-fob double chirp ("Pip-Pip!")
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2500, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3200, now + 0.11);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.35, now + 0.11);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc.start(now);
        osc.stop(now + 0.08);
        osc2.start(now + 0.11);
        osc2.stop(now + 0.23);
        this.vibrate([70, 40, 100]);
      } else if (type === 'LOCATE') {
        // Modern crystal sonar radar ping when activating shelf IoT
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1320, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        osc.frequency.setValueAtTime(2093, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
        this.vibrate([60, 40, 80]);
      } else if (type === 'BEEP') {
        // Quick crisp barcode scanner beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
        this.vibrate([30]);
      } else if (type === 'SUCCESS') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
        this.vibrate([40, 30, 40]);
      } else if (type === 'ERROR') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.1);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
        this.vibrate([200, 100, 200]);
      } else if (type === 'ALERT') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.42);
        this.vibrate([100]);
      } else if (type === 'COMPLETE') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(783, now + 0.2);
        osc.frequency.setValueAtTime(1046, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.47);
        this.vibrate([50, 50, 50, 50, 150]);
      }
    } catch (e) {
      console.warn('Audio Context tone failed:', e);
    }
  }

  private vibrate(pattern: number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
}

export const voiceAssistant = new VoiceAssistant();
