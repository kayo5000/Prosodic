export interface FormattedSpan {
  text: string;
  italic?: boolean;
  underline?: boolean;
  bold?: boolean;
}

export interface CadenceBarLine {
  id: string;
  barIndex: number; // 1 to 4 within a 4-bar cadence block
  globalBarNumber: number; // Global bar number (1, 2, 3...)
  spans: FormattedSpan[];
  rawText: string;
  syllableCount: number;
}

export type PhrasePreset = '4/4' | '4/8' | '4/16' | '-/-';

export interface CadenceBlock {
  id: string;
  blockIndex: number; // 1, 2, 3...
  phrasePreset?: PhrasePreset;
  targetBarCount?: number;
  bars: CadenceBarLine[];
}

export interface PaperFormatState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  headingStyle: 'body' | 'heading' | 'subheading';
}

export type SectionType = 'verse' | 'chorus' | 'hook' | 'bridge' | 'reprise' | 'custom';

export type MoodType =
  | 'excited'
  | 'aggressive'
  | 'confident'
  | 'melancholy'
  | 'flow'
  | 'street';

export interface MoodData {
  type: MoodType;
  label: string;
  note?: string;
}

export interface AudioRecordingData {
  id?: string;
  name?: string;
  uri: string;
  durationSec: number;
  waveform?: number[];
  createdAt?: string;
}

export interface MediaAttachmentData {
  uri: string;
  type: 'image' | 'video';
  caption?: string;
  name?: string;
  size?: string;
}

export interface FileAttachmentData {
  id: string;
  name: string;
  size: string;
  uri: string;
  type?: string;
}

export interface SongReferenceData {
  title: string;
  artist: string;
  coverIcon?: string;
  coverEmoji?: string;
  coverBg?: string;
}

export interface CollaboratorData {
  name: string;
  role?: string;
  avatarIcon?: string;
  avatarEmoji?: string;
}

export interface TextureArtifact {
  id: string;
  suggestionPrompt: string;
  mood?: MoodData;
  audioRecording?: AudioRecordingData;
  audioRecordings?: AudioRecordingData[];
  mediaAttachment?: MediaAttachmentData;
  mediaAttachments?: MediaAttachmentData[];
  reflectionComment?: string;
  attachedFiles?: FileAttachmentData[];
  songsOnRepeat?: SongReferenceData[];
  collaborator?: CollaboratorData;
  location?: string;
  collageTitle?: string;
  collageSubtitle?: string;
}

export interface PaperSection {
  id: string;
  type: SectionType;
  name: string;
  movementId: string;
  texture: TextureArtifact;
  blocks: CadenceBlock[];
  isFavorite?: boolean;
}

export interface BeatMovement {
  id: string;
  name: string;
  bpm: number;
  audioFile?: {
    name: string;
    uri: string;
    durationSec?: number;
  };
  sectionIds: string[];
}

export interface SongMetadata {
  title: string;
  defaultBpm: number;
  audioFile?: {
    name: string;
    uri: string;
    durationSec?: number;
  };
  whiteboard: TextureArtifact;
}

