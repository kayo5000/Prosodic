import {
  formatDeviceBadge,
  formatMetricCard,
  translateConcept,
} from './translator';

describe('Universal Translation Engine (3 Global Dialects)', () => {
  describe('Rhetorical Device Translations', () => {
    it('translates Anadiplosis into Plain English', () => {
      const res = translateConcept('Anadiplosis', 'simple');
      expect(res.title).toBe('The Bounce-Pass');
      expect(res.description).toContain('catch that exact same word');
    });

    it('translates Anadiplosis into Dual Lens (Hybrid)', () => {
      const res = translateConcept('Anadiplosis', 'hybrid');
      expect(res.title).toBe('The Bounce-Pass (Anadiplosis)');
      expect(res.description).toContain('In classical songwriting, this rhetorical loop is called Anadiplosis');
    });

    it('translates Anadiplosis into Deep Craft', () => {
      const res = translateConcept('Anadiplosis', 'deep_craft');
      expect(res.title).toBe('Anadiplosis (Rhetorical Figure)');
      expect(res.description).toContain('Purdue OWL standard');
    });
  });

  describe('Delivery & Metric Translations', () => {
    it('translates SPS into Plain English ("Syllable Speed")', () => {
      const card = formatMetricCard('SPS', 'simple');
      expect(card.title).toBe('Syllable Speed');
    });

    it('translates SPS into Deep Craft ("Prosodic Pressure")', () => {
      const card = formatMetricCard('SPS', 'deep_craft');
      expect(card.title).toContain('Prosodic Pressure');
    });

    it('translates Aspiration Gap into Plain English ("The Hidden Meaning Gap")', () => {
      const card = formatMetricCard('AspirationGap', 'simple');
      expect(card.title).toBe('The Hidden Meaning Gap');
      expect(card.description).toContain('Hey Ya');
    });

    it('translates Concreteness into Dual Lens', () => {
      const card = formatMetricCard('Concreteness', 'hybrid');
      expect(card.title).toContain('Sensory Concreteness');
    });

    it('translates Earworm into Plain English ("Catchiness & Stickiness")', () => {
      const card = formatMetricCard('Earworm', 'simple');
      expect(card.title).toBe('Catchiness & Stickiness');
    });
  });

  describe('Badge Formatter', () => {
    it('formats badge label according to selected mode', () => {
      expect(formatDeviceBadge('Chiasmus', 'simple')).toBe('The Mirror Flip');
      expect(formatDeviceBadge('Chiasmus', 'hybrid')).toBe('Mirror Flip (Chiasmus)');
      expect(formatDeviceBadge('Chiasmus', 'deep_craft')).toBe('Chiasmus (Inverted Parallelism)');
    });

    it('returns raw key if not found in dictionary', () => {
      expect(formatDeviceBadge('UnknownDevice', 'simple')).toBe('UnknownDevice');
    });
  });
});
