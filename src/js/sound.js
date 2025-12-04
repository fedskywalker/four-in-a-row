/**
 * Four in a Row - Sound System
 * Web Audio API based sound effects with physics-based variations
 */

class SoundSystem {
  constructor() {
    this.enabled = true;
    this.audioContext = null;
    this.masterGain = null;
    this.initialized = false;
    this.sounds = {};

    // Volume levels
    this.volumes = {
      master: 0.7,
      sfx: 0.8,
      ui: 0.6
    };
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volumes.master;
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      this.enabled = false;
    }
  }

  /**
   * Resume audio context if suspended
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Toggle sound on/off
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? this.volumes.master : 0;
    }
  }

  /**
   * Check if sound is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Create an oscillator-based sound effect
   * @param {Object} options
   */
  createTone(options) {
    if (!this.initialized || !this.enabled) return;

    const {
      frequency = 440,
      type = 'sine',
      duration = 100,
      volume = 0.5,
      attack = 5,
      decay = 50,
      detune = 0
    } = options;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.audioContext.currentTime;

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume * this.volumes.sfx, now + attack / 1000);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + (attack + decay) / 1000);

    oscillator.start(now);
    oscillator.stop(now + duration / 1000);
  }

  /**
   * Create noise-based sound effect
   * @param {Object} options
   */
  createNoise(options) {
    if (!this.initialized || !this.enabled) return;

    const {
      duration = 100,
      volume = 0.3,
      filterFreq = 1000,
      filterQ = 1
    } = options;

    // Create noise buffer
    const bufferSize = this.audioContext.sampleRate * (duration / 1000);
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;

    const gainNode = this.audioContext.createGain();

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume * this.volumes.sfx, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

    noise.start(now);
    noise.stop(now + duration / 1000);
  }

  /**
   * Play piece drop impact sound
   * @param {number} dropHeight - Number of rows dropped (1-6)
   */
  playPieceImpact(dropHeight = 3) {
    if (!this.initialized || !this.enabled) return;

    // Scale volume and characteristics based on drop height
    const intensity = Math.min(dropHeight / 6, 1);
    const baseVolume = 0.3 + intensity * 0.4;

    // Initial impact transient
    this.createTone({
      frequency: 180 + Math.random() * 40,
      type: 'sine',
      duration: 80,
      volume: baseVolume,
      attack: 2,
      decay: 60
    });

    // Plastic resonance
    setTimeout(() => {
      this.createTone({
        frequency: 350 + Math.random() * 100,
        type: 'triangle',
        duration: 120,
        volume: baseVolume * 0.5,
        attack: 5,
        decay: 100
      });
    }, 10);

    // High click component
    setTimeout(() => {
      this.createNoise({
        duration: 40,
        volume: baseVolume * 0.3,
        filterFreq: 2500 + Math.random() * 500,
        filterQ: 2
      });
    }, 5);

    // Rattle/settle sounds
    if (dropHeight > 2) {
      setTimeout(() => {
        this.createTone({
          frequency: 200 + Math.random() * 50,
          type: 'sine',
          duration: 30,
          volume: baseVolume * 0.2,
          attack: 2,
          decay: 25
        });
      }, 100);

      setTimeout(() => {
        this.createTone({
          frequency: 180 + Math.random() * 30,
          type: 'sine',
          duration: 20,
          volume: baseVolume * 0.1,
          attack: 2,
          decay: 15
        });
      }, 140);
    }
  }

  /**
   * Play piece pickup sound
   */
  playPiecePickup() {
    if (!this.initialized || !this.enabled) return;

    // Soft click
    this.createTone({
      frequency: 800,
      type: 'sine',
      duration: 50,
      volume: 0.2,
      attack: 3,
      decay: 40
    });

    // Slide friction
    this.createNoise({
      duration: 60,
      volume: 0.1,
      filterFreq: 3000,
      filterQ: 1
    });
  }

  /**
   * Play column hover tick
   */
  playColumnTick() {
    if (!this.initialized || !this.enabled) return;

    this.createTone({
      frequency: 1200,
      type: 'sine',
      duration: 30,
      volume: 0.15,
      attack: 2,
      decay: 25
    });
  }

  /**
   * Play button press sound
   */
  playButtonPress() {
    if (!this.initialized || !this.enabled) return;

    this.createTone({
      frequency: 600,
      type: 'sine',
      duration: 60,
      volume: 0.25 * this.volumes.ui,
      attack: 3,
      decay: 50
    });
  }

  /**
   * Play button release sound
   */
  playButtonRelease() {
    if (!this.initialized || !this.enabled) return;

    this.createTone({
      frequency: 800,
      type: 'sine',
      duration: 40,
      volume: 0.2 * this.volumes.ui,
      attack: 3,
      decay: 35
    });
  }

  /**
   * Play invalid move sound
   */
  playInvalidMove() {
    if (!this.initialized || !this.enabled) return;

    // Low buzz
    this.createTone({
      frequency: 150,
      type: 'sawtooth',
      duration: 200,
      volume: 0.3,
      attack: 10,
      decay: 180
    });

    setTimeout(() => {
      this.createTone({
        frequency: 130,
        type: 'sawtooth',
        duration: 150,
        volume: 0.2,
        attack: 10,
        decay: 130
      });
    }, 50);
  }

  /**
   * Play win sound
   */
  playWin() {
    if (!this.initialized || !this.enabled) return;

    // Triumphant chord arpeggio (C-E-G-C)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5-E5-G5-C6
    const baseVolume = 0.4;

    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.createTone({
          frequency: freq,
          type: 'sine',
          duration: 400,
          volume: baseVolume,
          attack: 20,
          decay: 350
        });

        // Harmonic
        this.createTone({
          frequency: freq * 2,
          type: 'sine',
          duration: 300,
          volume: baseVolume * 0.3,
          attack: 30,
          decay: 250
        });
      }, i * 100);
    });

    // Sparkle overlay
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.createTone({
          frequency: 2000 + Math.random() * 2000,
          type: 'sine',
          duration: 100,
          volume: 0.1,
          attack: 5,
          decay: 90
        });
      }, 400 + i * 80);
    }

    // Finale flourish
    setTimeout(() => {
      this.createTone({
        frequency: 1046.50,
        type: 'sine',
        duration: 500,
        volume: 0.5,
        attack: 30,
        decay: 450
      });
      this.createTone({
        frequency: 1318.51, // E6
        type: 'sine',
        duration: 500,
        volume: 0.35,
        attack: 30,
        decay: 450
      });
      this.createTone({
        frequency: 1567.98, // G6
        type: 'sine',
        duration: 500,
        volume: 0.25,
        attack: 30,
        decay: 450
      });
    }, 500);
  }

  /**
   * Play lose sound
   */
  playLose() {
    if (!this.initialized || !this.enabled) return;

    // Gentle descending tones
    const notes = [392, 349.23, 329.63, 293.66]; // G4-F4-E4-D4
    const baseVolume = 0.25;

    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.createTone({
          frequency: freq,
          type: 'sine',
          duration: 300,
          volume: baseVolume * (1 - i * 0.15),
          attack: 40,
          decay: 250
        });
      }, i * 150);
    });

    // Minor third at end
    setTimeout(() => {
      this.createTone({
        frequency: 293.66, // D4
        type: 'sine',
        duration: 400,
        volume: 0.2,
        attack: 50,
        decay: 350
      });
      this.createTone({
        frequency: 349.23, // F4
        type: 'sine',
        duration: 400,
        volume: 0.15,
        attack: 50,
        decay: 350
      });
    }, 600);
  }

  /**
   * Play draw sound
   */
  playDraw() {
    if (!this.initialized || !this.enabled) return;

    // Neutral, intriguing sequence
    const notes = [440, 523.25, 493.88, 440]; // A4-C5-B4-A4
    const baseVolume = 0.25;

    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.createTone({
          frequency: freq,
          type: 'sine',
          duration: 250,
          volume: baseVolume,
          attack: 30,
          decay: 200
        });
      }, i * 120);
    });
  }

  /**
   * Play player join sound
   */
  playPlayerJoin() {
    if (!this.initialized || !this.enabled) return;

    // Friendly ascending chime
    const notes = [523.25, 659.25, 783.99]; // C5-E5-G5
    const baseVolume = 0.3;

    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.createTone({
          frequency: freq,
          type: 'sine',
          duration: 200,
          volume: baseVolume,
          attack: 10,
          decay: 180
        });
      }, i * 80);
    });
  }

  /**
   * Play player leave sound
   */
  playPlayerLeave() {
    if (!this.initialized || !this.enabled) return;

    // Gentle descending tone
    this.createTone({
      frequency: 440,
      type: 'sine',
      duration: 300,
      volume: 0.25,
      attack: 20,
      decay: 270
    });

    setTimeout(() => {
      this.createTone({
        frequency: 349.23,
        type: 'sine',
        duration: 250,
        volume: 0.2,
        attack: 20,
        decay: 220
      });
    }, 100);

    // Whoosh
    this.createNoise({
      duration: 200,
      volume: 0.15,
      filterFreq: 800,
      filterQ: 0.5
    });
  }

  /**
   * Play your turn notification
   */
  playYourTurn() {
    if (!this.initialized || !this.enabled) return;

    // Two-note attention getter
    this.createTone({
      frequency: 880,
      type: 'sine',
      duration: 120,
      volume: 0.3,
      attack: 10,
      decay: 100
    });

    setTimeout(() => {
      this.createTone({
        frequency: 1174.66, // D6
        type: 'sine',
        duration: 150,
        volume: 0.35,
        attack: 10,
        decay: 130
      });
    }, 100);
  }
}

// Export singleton instance
export const sound = new SoundSystem();
