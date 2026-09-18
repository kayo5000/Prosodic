import { countLineSyllables, autocorrectHyphenation } from '@/utils/syllableCounter';

import type { CadenceBarLine, CadenceBlock, FormattedSpan } from './types';

/**
 * Creates an empty 4-bar cadence block.
 */
export function createEmptyCadenceBlock(blockIndex: number, startingGlobalBar: number): CadenceBlock {
  const bars: CadenceBarLine[] = [];
  for (let i = 1; i <= 4; i++) {
    bars.push({
      id: `block-${blockIndex}-bar-${i}`,
      barIndex: i,
      globalBarNumber: startingGlobalBar + i - 1,
      spans: [{ text: '' }],
      rawText: '',
      syllableCount: 0,
    });
  }
  return {
    id: `block-${blockIndex}`,
    blockIndex,
    bars,
  };
}

/**
 * Combines spans into raw plain text.
 */
export function spansToRawText(spans: FormattedSpan[]): string {
  return spans.map((s) => s.text).join('');
}

/**
 * Converts a raw multi-line string into structured 4-bar cadence blocks.
 * Guarantees a minimum number of blocks (default 3, matching 12 bars).
 */
export function lyricsToCadenceBlocks(rawLyrics: string, minBlocks: number = 3): CadenceBlock[] {
  const lines = rawLyrics.split('\n');
  const blocks: CadenceBlock[] = [];

  const totalLines = Math.max(lines.length, minBlocks * 4);
  const blockCount = Math.ceil(totalLines / 4);

  let lineIdx = 0;
  for (let b = 1; b <= blockCount; b++) {
    const bars: CadenceBarLine[] = [];
    for (let barIdx = 1; barIdx <= 4; barIdx++) {
      const globalBarNumber = (b - 1) * 4 + barIdx;
      const text = lineIdx < lines.length ? lines[lineIdx] : '';
      lineIdx++;

      const syl = countLineSyllables(text);
      bars.push({
        id: `block-${b}-bar-${barIdx}`,
        barIndex: barIdx,
        globalBarNumber,
        spans: [{ text }],
        rawText: text,
        syllableCount: syl,
      });
    }

    blocks.push({
      id: `block-${b}`,
      blockIndex: b,
      bars,
    });
  }

  return blocks;
}

/**
 * Converts structured cadence blocks into a raw multi-line string for the prosodic engine.
 */
export function cadenceBlocksToLyrics(blocks: CadenceBlock[]): string {
  const allLines: string[] = [];
  for (const block of blocks) {
    for (const bar of block.bars) {
      allLines.push(bar.rawText);
    }
  }

  // Trim trailing empty lines, but preserve internal empty lines
  while (allLines.length > 0 && allLines[allLines.length - 1].trim() === '') {
    allLines.pop();
  }

  return allLines.join('\n');
}

/**
 * Updates text in a specific bar of a block, recalculating syllables.
 */
export function updateBarText(
  blocks: CadenceBlock[],
  blockIndex: number,
  barIndex: number,
  newText: string,
  preserveFormatting: boolean = true,
): CadenceBlock[] {
  return blocks.map((b) => {
    if (b.blockIndex !== blockIndex) return b;

    return {
      ...b,
      bars: b.bars.map((bar) => {
        if (bar.barIndex !== barIndex) return bar;

        const syl = countLineSyllables(newText);

        // If preserving formatting and we have existing spans
        let newSpans: FormattedSpan[];
        if (preserveFormatting && bar.spans.length === 1 && (bar.spans[0].italic || bar.spans[0].underline || bar.spans[0].bold)) {
          newSpans = [{ ...bar.spans[0], text: newText }];
        } else {
          newSpans = [{ text: newText }];
        }

        return {
          ...bar,
          spans: newSpans,
          rawText: newText,
          syllableCount: syl,
        };
      }),
    };
  });
}

/**
 * Toggles a formatting attribute (italic, underline, bold) for an entire bar.
 */
export function toggleBarFormatting(
  blocks: CadenceBlock[],
  blockIndex: number,
  barIndex: number,
  format: 'italic' | 'underline' | 'bold',
): CadenceBlock[] {
  return blocks.map((b) => {
    if (b.blockIndex !== blockIndex) return b;

    return {
      ...b,
      bars: b.bars.map((bar) => {
        if (bar.barIndex !== barIndex) return bar;

        const isCurrentlyActive = bar.spans.some((s) => Boolean(s[format]));
        const updatedSpans = bar.spans.map((s) => ({
          ...s,
          [format]: !isCurrentlyActive,
        }));

        return {
          ...bar,
          spans: updatedSpans,
        };
      }),
    };
  });
}

/**
 * Changes the bar count for a specific cadence block (e.g. 4, 8, 16, or custom such as 5).
 */
export function setBlockBarCount(
  blocks: CadenceBlock[],
  blockIndex: number,
  newCount: number,
  preset: import('./types').PhrasePreset,
): CadenceBlock[] {
  const safeCount = Math.max(1, Math.min(newCount, 32)); // 1 to 32 bars

  const updatedBlocks = blocks.map((b) => {
    if (b.blockIndex !== blockIndex) return b;

    let bars = [...b.bars];
    if (bars.length < safeCount) {
      for (let i = bars.length + 1; i <= safeCount; i++) {
        bars.push({
          id: `block-${b.blockIndex}-bar-${i}-${Date.now()}`,
          barIndex: i,
          globalBarNumber: 0,
          spans: [{ text: '' }],
          rawText: '',
          syllableCount: 0,
        });
      }
    } else if (bars.length > safeCount) {
      bars = bars.slice(0, safeCount);
    }

    return {
      ...b,
      phrasePreset: preset,
      targetBarCount: safeCount,
      bars: bars.map((bar, idx) => ({
        ...bar,
        barIndex: idx + 1,
      })),
    };
  });

  let runningBarNum = 1;
  return updatedBlocks.map((b) => ({
    ...b,
    bars: b.bars.map((bar) => ({
      ...bar,
      globalBarNumber: runningBarNum++,
    })),
  }));
}

export const CREATIVE_SUGGESTION_PROMPTS = [
  "Write about something great in your life that you don't always think about.",
  "What's the best story you heard this month?",
  "What's the emotional core or conflict in this section?",
  "What rhythm, bounce, or cadence pocket inspired this flow?",
  "Describe the sonic environment and texture in 3 words.",
  "What contrast or tension does this section introduce?",
  "Who is the focal point or audience for these lines?",
  "What visual metaphor or real memory anchors this phrase?",
  "How should the delivery feel (whisper, chant, melodic, punchy)?",
  "What rhyme family or vowel color dominates this thought?",
];

export function getRandomSuggestionPrompt(): string {
  const idx = Math.floor(Math.random() * CREATIVE_SUGGESTION_PROMPTS.length);
  return CREATIVE_SUGGESTION_PROMPTS[idx];
}

export function createBlankTexture(idSuffix: string = `${Date.now()}`): import('./types').TextureArtifact {
  return {
    id: `texture-${idSuffix}`,
    suggestionPrompt: CREATIVE_SUGGESTION_PROMPTS[0],
    mood: {
      type: 'excited',
      label: 'Surprised, Excited',
      note: 'Tired but grateful! Excited to go to bed tonight.',
    },
    audioRecording: {
      uri: 'sample-take.m4a',
      durationSec: 9,
      waveform: [24, 45, 65, 85, 50, 70, 95, 75, 55, 40, 70, 90, 60, 30],
    },
    mediaAttachment: {
      uri: 'sample-photo.jpg',
      type: 'image',
      caption: 'Weekdays at Home',
    },
    reflectionComment: '',
    attachedFiles: [],
    songsOnRepeat: [
      { title: 'Baby Mine', artist: 'Fred Mollin', coverIcon: 'disc', coverBg: '#2C2C2E' },
      { title: "I'm The Problem", artist: 'Morgan Wallen', coverIcon: 'guitar', coverBg: '#3A3A3C' },
    ],
    collaborator: {
      name: 'Teya',
      role: "You've Connected",
      avatarIcon: 'user',
    },
    location: 'Plaza Blok M · South Jakarta',
    collageTitle: 'Weekdays at Home',
    collageSubtitle: 'Over the last month',
  };
}

export function getNextSectionName(
  type: import('./types').SectionType,
  existingSections: import('./types').PaperSection[],
): string {
  if (type === 'intro') {
    return 'Intro';
  }
  if (type === 'verse') {
    const verseCount = existingSections.filter((s) => s.type === 'verse').length;
    return `Verse ${verseCount + 1}`;
  }
  if (type === 'pre-chorus') {
    const preChorusCount = existingSections.filter((s) => s.type === 'pre-chorus').length;
    return preChorusCount === 0 ? 'Pre-Chorus' : `Pre-Chorus ${preChorusCount + 1}`;
  }
  if (type === 'chorus' || type === 'hook') {
    const chorusCount = existingSections.filter((s) => s.type === 'chorus' || s.type === 'hook').length;
    return chorusCount === 0 ? 'Chorus 1' : `Chorus ${chorusCount + 1}`;
  }
  if (type === 'bridge') {
    const bridgeCount = existingSections.filter((s) => s.type === 'bridge').length;
    return bridgeCount === 0 ? 'Bridge' : `Bridge ${bridgeCount + 1}`;
  }
  if (type === 'outro') {
    return 'Outro';
  }
  if (type === 'reprise') {
    return 'Reprise';
  }
  return `Section ${existingSections.length + 1}`;
}

export function createSection(
  type: import('./types').SectionType,
  movementId: string,
  existingSections: import('./types').PaperSection[],
  startingGlobalBar: number = 1,
): import('./types').PaperSection {
  const name = getNextSectionName(type, existingSections);
  const blockIndex = existingSections.reduce((acc, s) => acc + s.blocks.length, 0) + 1;
  const initialBlock = createEmptyCadenceBlock(blockIndex, startingGlobalBar);

  return {
    id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    name,
    movementId,
    texture: createBlankTexture(name.toLowerCase().replace(/\s+/g, '-')),
    blocks: [initialBlock],
  };
}

export function createBeatSwitchMovement(
  existingMovements: import('./types').BeatMovement[],
  defaultBpm: number = 120,
): import('./types').BeatMovement {
  const switchCount = existingMovements.length;
  return {
    id: `movement-switch-${Date.now()}`,
    name: `Section ${switchCount + 1}`,
    bpm: defaultBpm,
    sectionIds: [],
  };
}

export function createInitialSongState(defaultBpm: number = 120): {
  metadata: import('./types').SongMetadata;
  movements: import('./types').BeatMovement[];
  sections: import('./types').PaperSection[];
} {
  const mainMovementId = `movement-${Date.now()}`;
  const mainMovement: import('./types').BeatMovement = {
    id: mainMovementId,
    name: 'Section 1',
    bpm: defaultBpm,
    sectionIds: [],
  };

  const initialSection = createSection('verse', mainMovementId, [], 1);
  mainMovement.sectionIds.push(initialSection.id);

  const metadata: import('./types').SongMetadata = {
    title: 'New Song',
    defaultBpm: defaultBpm,
    whiteboard: createBlankTexture('song-whiteboard'),
  };

  return {
    metadata,
    movements: [mainMovement],
    sections: [initialSection],
  };
}

export function sectionsToLyrics(sections: import('./types').PaperSection[]): string {
  const allLines: string[] = [];
  for (const sec of sections) {
    for (const block of sec.blocks) {
      for (const bar of block.bars) {
        allLines.push(bar.rawText);
      }
    }
  }
  while (allLines.length > 0 && allLines[allLines.length - 1].trim() === '') {
    allLines.pop();
  }
  return allLines.join('\n');
}

export function reindexSectionsGlobalBars(
  sections: import('./types').PaperSection[],
): import('./types').PaperSection[] {
  let runningBarNum = 1;
  return sections.map((sec) => ({
    ...sec,
    blocks: sec.blocks.map((b) => ({
      ...b,
      bars: b.bars.map((bar) => ({
        ...bar,
        globalBarNumber: runningBarNum++,
      })),
    })),
  }));
}

/**
 * Converts a cadence block's bars into plain multiline text for Texture writing mode.
 * Trims trailing empty bars so fresh blocks start completely empty without phantom newlines.
 */
export function blockToText(block: CadenceBlock): string {
  const lines = block.bars.map((bar) => bar.rawText);
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  return lines.join('\n');
}

/**
 * Updates a block from multiline text, keeping bars synchronized with lines.
 */
export function updateBlockFromText(
  blocks: CadenceBlock[],
  blockIndex: number,
  newText: string,
): CadenceBlock[] {
  const lines = newText.split('\n');
  return blocks.map((b) => {
    if (b.blockIndex !== blockIndex) return b;

    const minBars = Math.max(lines.length, b.bars.length, 4);
    const updatedBars: CadenceBarLine[] = [];

    for (let i = 0; i < minBars; i++) {
      const lineText = i < lines.length ? lines[i] : '';
      const existingBar = b.bars[i];
      const syl = countLineSyllables(lineText);

      if (existingBar) {
        updatedBars.push({
          ...existingBar,
          rawText: lineText,
          spans: [{ text: lineText }],
          syllableCount: syl,
        });
      } else {
        updatedBars.push({
          id: `block-${b.blockIndex}-bar-${i + 1}-${Date.now()}`,
          barIndex: i + 1,
          globalBarNumber: 0,
          rawText: lineText,
          spans: [{ text: lineText }],
          syllableCount: syl,
        });
      }
    }

    return {
      ...b,
      bars: updatedBars,
    };
  });
}

/**
 * Synchronizes hyphenation state across adjacent bars.
 * If Bar 1 ends with '-', it automatically prepends '-' to Bar 2.
 * It also strictly enforces valid linguistic boundaries for the split.
 */
export function syncCrossBarHyphenation(sections: import('./types').PaperSection[]): import('./types').PaperSection[] {
  const allBars: { secIndex: number; blockIndex: number; barIndex: number; bar: CadenceBarLine }[] = [];
  
  sections.forEach((sec, sIdx) => {
    sec.blocks.forEach((block, bIdx) => {
      block.bars.forEach((bar, barIdx) => {
        allBars.push({ secIndex: sIdx, blockIndex: bIdx, barIndex: barIdx, bar: { ...bar } });
      });
    });
  });

  for (let i = 0; i < allBars.length - 1; i++) {
    const current = allBars[i].bar;
    const next = allBars[i + 1].bar;

    const currentText = current.rawText.trimEnd();
    const nextText = next.rawText.trimStart();

    if (currentText.endsWith('-') && nextText.length > 0) {
      let rightPart = nextText.split(/\s+/)[0]; 
      if (!rightPart.startsWith('-')) {
        rightPart = '-' + rightPart;
      }
      
      const leftPart = currentText.split(/\s+/).pop()!; 

      const [newLeft, newRight] = autocorrectHyphenation(leftPart, rightPart);

      if (newLeft !== leftPart || newRight !== rightPart || !nextText.startsWith('-')) {
        const curWords = currentText.split(/\s+/);
        curWords[curWords.length - 1] = newLeft;
        current.rawText = curWords.join(' ') + (current.rawText.endsWith(' ') ? ' ' : '');
        current.spans = [{ text: current.rawText }];
        current.syllableCount = countLineSyllables(current.rawText);

        let nxtWords = nextText.split(/\s+/);
        if (!nextText.startsWith('-') && newRight === rightPart) {
           nxtWords[0] = '-' + nxtWords[0];
        } else {
           nxtWords[0] = newRight;
        }
        next.rawText = (next.rawText.startsWith(' ') ? ' ' : '') + nxtWords.join(' ');
        next.spans = [{ text: next.rawText }];
        next.syllableCount = countLineSyllables(next.rawText);
      }
    } else if (!currentText.endsWith('-') && nextText.startsWith('-')) {
      const nxtWords = nextText.split(/\s+/);
      nxtWords[0] = nxtWords[0].replace(/^-/, '');
      next.rawText = (next.rawText.startsWith(' ') ? ' ' : '') + nxtWords.join(' ');
      next.spans = [{ text: next.rawText }];
      next.syllableCount = countLineSyllables(next.rawText);
    }
  }

  const newSections = JSON.parse(JSON.stringify(sections));
  allBars.forEach((item) => {
    newSections[item.secIndex].blocks[item.blockIndex].bars[item.barIndex] = item.bar;
  });

  return newSections;
}

/**
 * Updates full paper sections from raw multiline lyrics (used in Bars Off / blank field mode).
 * Keeps sections and cadence blocks perfectly synchronized with continuous text.
 */
export function updateSectionsFromLyrics(
  existingSections: import('./types').PaperSection[],
  rawLyrics: string,
): import('./types').PaperSection[] {
  if (!existingSections || existingSections.length === 0) {
    return [createSection('verse', 'movement-1', [], 1)];
  }

  if (existingSections.length === 1) {
    const sec = existingSections[0];
    const newBlocks = lyricsToCadenceBlocks(rawLyrics, Math.max(1, sec.blocks.length));
    return [
      {
        ...sec,
        blocks: newBlocks,
      },
    ];
  }

  // Multiple sections: distribute lines based on sections' bar allocations
  const lines = rawLyrics.split('\n');
  let lineCursor = 0;
  const updated = existingSections.map((sec, sIdx) => {
    const totalBarsInSec = sec.blocks.reduce((acc, b) => acc + b.bars.length, 0);
    const isLastSection = sIdx === existingSections.length - 1;
    const secLines = isLastSection
      ? lines.slice(lineCursor)
      : lines.slice(lineCursor, lineCursor + totalBarsInSec);
    lineCursor += totalBarsInSec;

    const newBlocks = lyricsToCadenceBlocks(secLines.join('\n'), Math.max(1, sec.blocks.length));
    return {
      ...sec,
      blocks: newBlocks,
    };
  });

  return reindexSectionsGlobalBars(updated);
}

/**
 * Result structure returned by pasteLinesIntoSections.
 */
export interface PasteResult {
  sections: import('./types').PaperSection[];
  finalFocus: {
    sectionId: string;
    blockIndex: number;
    barIndex: number;
  };
}

/**
 * Distributes multiline pasted text sequentially across bars and blocks in a section.
 * If lines exceed current bars or blocks, creates new blocks automatically.
 * Reindexes all global bar numbers across the song.
 */
export function pasteLinesIntoSections(
  sections: import('./types').PaperSection[],
  targetSectionId: string,
  targetBlockIndex: number,
  targetBarIndex: number,
  multilineText: string,
): PasteResult {
  const rawLines = multilineText.split(/\r\n|\r|\n/);

  if (rawLines.length <= 1) {
    const text = rawLines[0] !== undefined ? rawLines[0] : multilineText;
    const updated = sections.map((sec) => {
      if (sec.id !== targetSectionId) return sec;
      return {
        ...sec,
        blocks: updateBarText(sec.blocks, targetBlockIndex, targetBarIndex, text),
      };
    });
    return {
      sections: reindexSectionsGlobalBars(updated),
      finalFocus: {
        sectionId: targetSectionId,
        blockIndex: targetBlockIndex,
        barIndex: targetBarIndex,
      },
    };
  }

  // Deep clone sections to allow safe block expansion
  const updatedSections: import('./types').PaperSection[] = sections.map((sec) => ({
    ...sec,
    blocks: sec.blocks.map((b) => ({
      ...b,
      bars: b.bars.map((bar) => ({
        ...bar,
        spans: [...bar.spans.map((s) => ({ ...s }))],
      })),
    })),
  }));

  const sec = updatedSections.find((s) => s.id === targetSectionId);
  if (!sec) {
    return {
      sections,
      finalFocus: {
        sectionId: targetSectionId,
        blockIndex: targetBlockIndex,
        barIndex: targetBarIndex,
      },
    };
  }

  let currentBlockIdx = targetBlockIndex;
  let currentBarIdx = targetBarIndex;

  for (let i = 0; i < rawLines.length; i++) {
    const lineText = rawLines[i];

    // Find current block or create new one
    let block = sec.blocks.find((b) => b.blockIndex === currentBlockIdx);
    if (!block) {
      const newBlock = createEmptyCadenceBlock(currentBlockIdx, 0);
      sec.blocks.push(newBlock);
      block = newBlock;
    }

    // Find or create bar in current block
    let bar = block.bars.find((b) => b.barIndex === currentBarIdx);
    if (!bar) {
      bar = {
        id: `block-${currentBlockIdx}-bar-${currentBarIdx}-${Date.now()}-${i}`,
        barIndex: currentBarIdx,
        globalBarNumber: 0,
        spans: [{ text: lineText }],
        rawText: lineText,
        syllableCount: countLineSyllables(lineText),
      };
      block.bars.push(bar);
    } else {
      bar.rawText = lineText;
      bar.spans = [{ text: lineText }];
      bar.syllableCount = countLineSyllables(lineText);
    }

    // If last line, break before advancing cursor
    if (i === rawLines.length - 1) {
      break;
    }

    // Advance to next bar
    if (currentBarIdx < block.bars.length) {
      currentBarIdx++;
    } else {
      currentBlockIdx++;
      currentBarIdx = 1;
    }
  }

  const reindexed = reindexSectionsGlobalBars(updatedSections);
  return {
    sections: reindexed,
    finalFocus: {
      sectionId: targetSectionId,
      blockIndex: currentBlockIdx,
      barIndex: currentBarIdx,
    },
  };
}
