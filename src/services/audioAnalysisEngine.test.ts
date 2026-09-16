import {
  extractWaveformFromSamples,
  detectBpmFromAudioSamples,
  parseWavArrayBuffer,
  analyzeAudioArrayBuffer,
  validateAudioVsLyricsAlignment,
} from './audioAnalysisEngine';
import type { AudioTrackMetadata, CadenceBarLine } from '../components/studio/paper/types';

function createSyntheticPulseBuffer(sampleRate: number, durationSec: number, bpm: number): Float32Array {
  const totalSamples = sampleRate * durationSec;
  const samples = new Float32Array(totalSamples);
  const beatIntervalSamples = Math.floor((60 / bpm) * sampleRate);

  for (let t = 0; t < totalSamples; t += beatIntervalSamples) {
    // Sharp transient attack (50ms decay envelope)
    const attackLength = Math.min(Math.floor(sampleRate * 0.05), totalSamples - t);
    for (let i = 0; i < attackLength; i++) {
      const decay = 1 - i / attackLength;
      samples[t + i] = Math.sin((2 * Math.PI * 220 * i) / sampleRate) * decay;
    }
  }

  return samples;
}

function createSyntheticWavBuffer(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  view.setUint8(0, 'R'.charCodeAt(0));
  view.setUint8(1, 'I'.charCodeAt(0));
  view.setUint8(2, 'F'.charCodeAt(0));
  view.setUint8(3, 'F'.charCodeAt(0));
  view.setUint32(4, 36 + dataSize, true);
  view.setUint8(8, 'W'.charCodeAt(0));
  view.setUint8(9, 'A'.charCodeAt(0));
  view.setUint8(10, 'V'.charCodeAt(0));
  view.setUint8(11, 'E'.charCodeAt(0));

  // "fmt " sub-chunk
  view.setUint8(12, 'f'.charCodeAt(0));
  view.setUint8(13, 'm'.charCodeAt(0));
  view.setUint8(14, 't'.charCodeAt(0));
  view.setUint8(15, ' '.charCodeAt(0));
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  view.setUint8(36, 'd'.charCodeAt(0));
  view.setUint8(37, 'a'.charCodeAt(0));
  view.setUint8(38, 't'.charCodeAt(0));
  view.setUint8(39, 'a'.charCodeAt(0));
  view.setUint32(40, dataSize, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

describe('audioAnalysisEngine', () => {
  describe('extractWaveformFromSamples', () => {
    it('returns empty fallback array for invalid or empty input', () => {
      const waveform = extractWaveformFromSamples(new Float32Array(0), 32);
      expect(waveform).toHaveLength(32);
      expect(waveform[0]).toBe(0.1);
    });

    it('extracts exactly 32 normalized bins from continuous samples', () => {
      const samples = createSyntheticPulseBuffer(44100, 4, 120);
      const waveform = extractWaveformFromSamples(samples, 32);
      expect(waveform).toHaveLength(32);
      expect(Math.max(...waveform)).toBeCloseTo(1.0, 1);
      expect(Math.min(...waveform)).toBeGreaterThanOrEqual(0.08);
    });
  });

  describe('detectBpmFromAudioSamples', () => {
    it('accurately detects 120 BPM tempo pulses within +/- 3 BPM', () => {
      const sampleRate = 44100;
      const samples = createSyntheticPulseBuffer(sampleRate, 6, 120);
      const result = detectBpmFromAudioSamples(samples, sampleRate);

      expect(result.bpm).toBeGreaterThanOrEqual(117);
      expect(result.bpm).toBeLessThanOrEqual(123);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.transientsCount).toBeGreaterThan(5);
    });

    it('accurately detects 90 BPM tempo pulses within +/- 3 BPM', () => {
      const sampleRate = 44100;
      const samples = createSyntheticPulseBuffer(sampleRate, 6, 90);
      const result = detectBpmFromAudioSamples(samples, sampleRate);

      expect(result.bpm).toBeGreaterThanOrEqual(87);
      expect(result.bpm).toBeLessThanOrEqual(93);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('falls back safely for silent or short samples', () => {
      const samples = new Float32Array(100);
      const result = detectBpmFromAudioSamples(samples, 44100);
      expect(result.bpm).toBe(120);
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('parseWavArrayBuffer & analyzeAudioArrayBuffer', () => {
    it('parses valid synthetic PCM WAV array buffer', () => {
      const samples = createSyntheticPulseBuffer(44100, 3, 120);
      const wavBuffer = createSyntheticWavBuffer(samples, 44100);
      const parsed = parseWavArrayBuffer(wavBuffer);

      expect(parsed).not.toBeNull();
      expect(parsed?.sampleRate).toBe(44100);
      expect(parsed?.durationSec).toBeCloseTo(3, 0);
      expect(parsed?.channelData.length).toBe(samples.length);
    });

    it('analyzes WAV buffer and returns complete AudioTrackMetadata', async () => {
      const samples = createSyntheticPulseBuffer(44100, 4, 120);
      const wavBuffer = createSyntheticWavBuffer(samples, 44100);
      const metadata = await analyzeAudioArrayBuffer(wavBuffer, 'test_beat.wav');

      expect(metadata.name).toBe('test_beat.wav');
      expect(metadata.durationSec).toBeGreaterThanOrEqual(3);
      expect(metadata.bpm).toBeGreaterThanOrEqual(115);
      expect(metadata.waveform).toHaveLength(32);
      expect(metadata.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('validateAudioVsLyricsAlignment', () => {
    const mockAudio: AudioTrackMetadata = {
      name: 'trap_loop.wav',
      uri: 'test/path',
      durationSec: 60,
      bpm: 120,
      waveform: new Array(32).fill(0.8),
      confidence: 0.95,
      transientsCount: 120,
    };

    const mockBarLines: CadenceBarLine[] = [
      {
        id: 'bar-1',
        barIndex: 1,
        globalBarNumber: 1,
        spans: [{ text: 'Dead in the middle of Little Italy little did we know' }],
        rawText: 'Dead in the middle of Little Italy little did we know',
        syllableCount: 16,
      },
      {
        id: 'bar-2',
        barIndex: 2,
        globalBarNumber: 2,
        spans: [{ text: 'That we riddled some middlemen who didn\'t do diddly' }],
        rawText: 'That we riddled some middlemen who didn\'t do diddly',
        syllableCount: 16,
      },
      {
        id: 'bar-3',
        barIndex: 3,
        globalBarNumber: 3,
        spans: [{ text: 'It was a cold night in the dark' }],
        rawText: 'It was a cold night in the dark',
        syllableCount: 8,
      },
      {
        id: 'bar-4',
        barIndex: 4,
        globalBarNumber: 4,
        spans: [{ text: 'We made a fire sparked in the park' }],
        rawText: 'We made a fire sparked in the park',
        syllableCount: 10,
      },
    ];

    it('evaluates cadence alignment and targets high confidence score', () => {
      const validation = validateAudioVsLyricsAlignment(mockAudio, mockBarLines);

      expect(validation.totalBars).toBe(4);
      expect(validation.barsAligned).toBe(4);
      expect(validation.averageSyllablesPerBar).toBe(12.5);
      expect(validation.alignmentScore).toBeGreaterThanOrEqual(0.95);
      expect(validation.feedback).toHaveLength(0);
    });

    it('generates feedback warnings for irregular syllable density', () => {
      const unevenBars: CadenceBarLine[] = [
        {
          id: 'bar-1',
          barIndex: 1,
          globalBarNumber: 1,
          spans: [{ text: 'Hi' }],
          rawText: 'Hi',
          syllableCount: 1,
        },
        {
          id: 'bar-2',
          barIndex: 2,
          globalBarNumber: 2,
          spans: [{ text: 'Supercalifragilisticexpialidocious supercalifragilisticexpialidocious' }],
          rawText: 'Supercalifragilisticexpialidocious supercalifragilisticexpialidocious',
          syllableCount: 28,
        },
      ];

      const validation = validateAudioVsLyricsAlignment(mockAudio, unevenBars);
      expect(validation.barsAligned).toBe(0);
      expect(validation.feedback.length).toBeGreaterThanOrEqual(2);
      expect(validation.feedback[0]).toContain('sparse syllable count');
      expect(validation.feedback[1]).toContain('heavy syllable density');
    });
  });
});
