import type { TimeSignature } from '@/utils/tempoDensity';

export interface VaultVerse {
  id: string;
  title: string;
  eraOrStyle: string;
  bpm: number;
  timeSignature: TimeSignature;
  description: string;
  lyrics: string;
  complexityPreview: number; // 0 - 100
}

export const VAULT_VERSES: VaultVerse[] = [
  {
    id: 'reverse_chronology_persevered',
    title: 'Reverse Chronology: Persevered',
    eraOrStyle: 'Perceptual Rhotic Architecture',
    bpm: 86,
    timeSignature: '4/4',
    description: 'Surgical separation of NURSE (/ɜːr/) and NEAR (/ɪər/) rhotic sound families with internal EE vowel resonance.',
    complexityPreview: 95,
    lyrics: `I persevered through the worst, my thirst to adhere is a curse
My life, I see it in reverse, I first appeared in a hearse
The driver steered to the church
My grandkids carried the coffin to the altar as they burst into tears from their shirts`,
  },
  {
    id: 'compound_polysyllabic_masterpiece',
    title: 'The Compound Polysyllabic Masterpiece',
    eraOrStyle: 'Multi-Syllabic Complex',
    bpm: 90,
    timeSignature: '4/4',
    description: 'A relentless 4-syllable compound rhyme weave resolving on the EE and AY vowel families.',
    complexityPreview: 94,
    lyrics: `I grab the microphone and spit a multi-syllabic scheme
Never miss a single beat inside the rhythm of the machine
The architecture is supreme my state of mind is crystal clean
I elevate above the scene and paint the vision on the screen`,
  },
  {
    id: 'over_the_bar_enjambment',
    title: 'The Over-The-Bar Enjambment Flow',
    eraOrStyle: 'Elastic Modern Pocket',
    bpm: 84,
    timeSignature: '4/4',
    description: 'Phrasing that deliberately crosses measure lines instead of stopping on Beat 4.',
    complexityPreview: 88,
    lyrics: `I never let the measure dictate where the phrase will end
Because the cadence is elastic bending past the boundary when
The snare strikes I accelerate and carry all the momentum through
Into the next dimension showing what a master mind can do`,
  },
  {
    id: 'high_velocity_double_time',
    title: 'The High-Velocity Double-Time Drill',
    eraOrStyle: 'Chopper Speed Pocket',
    bpm: 130,
    timeSignature: '4/4',
    description: 'Sustained 8.2 SPS rapid-fire syllabic runs with zero dropped grid subdivisions.',
    complexityPreview: 96,
    lyrics: `Rapid-fire syllable precision moving fast across the track
Never hesitation when I step up on the pad and hit attack
Every single consonant is hitting like a hammer on the grid
Dominating every frequency the greatest that they ever did`,
  },
  {
    id: 'plosive_percussion_alliteration',
    title: 'The Plosive Percussion Alliteration Stanza',
    eraOrStyle: 'Timbre & Texture Focus',
    bpm: 94,
    timeSignature: '4/4',
    description: 'Heavy use of plosive consonants (/P/, /T/, /K/) acting as auxiliary percussion over the beat.',
    complexityPreview: 86,
    lyrics: `Peter power punches properly producing potent prose
Penetrating pressure placing patterns perfectly proposed
Tenacious tigers taking territory tracking targets true
Kinetic kings commanding craft creating concepts crystal new`,
  },
];
