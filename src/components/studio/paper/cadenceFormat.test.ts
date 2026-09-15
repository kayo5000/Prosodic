import {
  blockToText,
  cadenceBlocksToLyrics,
  createBeatSwitchMovement,
  createEmptyCadenceBlock,
  createInitialSongState,
  createSection,
  lyricsToCadenceBlocks,
  reindexSectionsGlobalBars,
  sectionsToLyrics,
  setBlockBarCount,
  toggleBarFormatting,
  updateBarText,
} from './cadenceFormat';

describe('cadenceFormat tests', () => {
  it('creates an empty 4-bar cadence block with 0 syllables', () => {
    const block = createEmptyCadenceBlock(1, 1);
    expect(block.blockIndex).toBe(1);
    expect(block.bars).toHaveLength(4);
    expect(block.bars[0].barIndex).toBe(1);
    expect(block.bars[0].globalBarNumber).toBe(1);
    expect(block.bars[0].syllableCount).toBe(0);
    expect(block.bars[3].barIndex).toBe(4);
    expect(block.bars[3].globalBarNumber).toBe(4);
  });

  it('converts lyrics into 4-bar cadence blocks with accurate syllable counts', () => {
    const inputLyrics = 'Mrs Reality\n\nPlease\nSing Me a Song';
    const blocks = lyricsToCadenceBlocks(inputLyrics, 3);

    // Guaranteed minimum 3 blocks
    expect(blocks.length).toBeGreaterThanOrEqual(3);

    const block1 = blocks[0];
    expect(block1.bars[0].rawText).toBe('Mrs Reality');
    // "Mrs Reality" -> Mrs (1 or 2 depending on phonetics) + reality (4) = 5
    expect(block1.bars[0].syllableCount).toBe(5);

    expect(block1.bars[1].rawText).toBe('');
    expect(block1.bars[1].syllableCount).toBe(0);

    expect(block1.bars[2].rawText).toBe('Please');
    expect(block1.bars[2].syllableCount).toBe(1);

    expect(block1.bars[3].rawText).toBe('Sing Me a Song');
    expect(block1.bars[3].syllableCount).toBe(4);

    // Block 2 and 3 should be empty bars with 0 syllables
    expect(blocks[1].bars[0].syllableCount).toBe(0);
    expect(blocks[2].bars[0].syllableCount).toBe(0);
  });

  it('converts blocks back to lyrics string preserving internal blank lines', () => {
    const inputLyrics = 'Mrs Reality\n\nPlease\nSing Me a Song';
    const blocks = lyricsToCadenceBlocks(inputLyrics, 3);
    const output = cadenceBlocksToLyrics(blocks);
    expect(output).toBe(inputLyrics);
  });

  it('updates text in a specific bar and recomputes syllable count', () => {
    const blocks = lyricsToCadenceBlocks('Line 1\nLine 2', 3);
    const updated = updateBarText(blocks, 1, 2, 'Unstoppable rhythm');
    const bar2 = updated[0].bars[1];
    expect(bar2.rawText).toBe('Unstoppable rhythm');
    expect(bar2.syllableCount).toBe(6); // un-stop-pa-ble (4) + rhy-thm (2) = 6
  });

  it('toggles bar formatting (underline, italic, bold)', () => {
    let blocks = lyricsToCadenceBlocks('Test line', 1);
    blocks = toggleBarFormatting(blocks, 1, 1, 'underline');
    expect(blocks[0].bars[0].spans[0].underline).toBe(true);

    blocks = toggleBarFormatting(blocks, 1, 1, 'italic');
    expect(blocks[0].bars[0].spans[0].italic).toBe(true);
    expect(blocks[0].bars[0].spans[0].underline).toBe(true);

    // Toggle underline off
    blocks = toggleBarFormatting(blocks, 1, 1, 'underline');
    expect(blocks[0].bars[0].spans[0].underline).toBe(false);
    expect(blocks[0].bars[0].spans[0].italic).toBe(true);
  });

  it('resizes section phrase length to 5 bars (custom), 8 bars, and 16 bars', () => {
    let blocks = lyricsToCadenceBlocks('Bar 1\nBar 2\nBar 3\nBar 4', 2);
    expect(blocks[0].bars).toHaveLength(4);

    // Resize block 1 to 5 bars (custom)
    blocks = setBlockBarCount(blocks, 1, 5, '-/-');
    expect(blocks[0].bars).toHaveLength(5);
    expect(blocks[0].phrasePreset).toBe('-/-');
    expect(blocks[0].bars[4].barIndex).toBe(5);
    expect(blocks[0].bars[4].globalBarNumber).toBe(5);
    // Block 2 should now start at globalBarNumber 6
    expect(blocks[1].bars[0].globalBarNumber).toBe(6);

    // Resize block 1 to 8 bars (4/8)
    blocks = setBlockBarCount(blocks, 1, 8, '4/8');
    expect(blocks[0].bars).toHaveLength(8);
    expect(blocks[0].phrasePreset).toBe('4/8');
    expect(blocks[1].bars[0].globalBarNumber).toBe(9);

    // Resize block 1 to 16 bars (4/16)
    blocks = setBlockBarCount(blocks, 1, 16, '4/16');
    expect(blocks[0].bars).toHaveLength(16);
    expect(blocks[0].phrasePreset).toBe('4/16');
    expect(blocks[1].bars[0].globalBarNumber).toBe(17);

    // Resize back to 4 bars (4/4)
    blocks = setBlockBarCount(blocks, 1, 4, '4/4');
    expect(blocks[0].bars).toHaveLength(4);
    expect(blocks[0].phrasePreset).toBe('4/4');
    expect(blocks[1].bars[0].globalBarNumber).toBe(5);
  });

  it('initializes a fresh blank song with default New Song title and Verse 1', () => {
    const state = createInitialSongState();
    expect(state.metadata.title).toBe('New Song');
    expect(state.metadata.defaultBpm).toBe(120);
    expect(state.sections).toHaveLength(1);
    expect(state.sections[0].name).toBe('Verse 1');
    expect(state.sections[0].blocks[0].bars).toHaveLength(4);
    expect(state.sections[0].blocks[0].bars[0].rawText).toBe('');
    expect(state.sections[0].texture.suggestionPrompt).toBeTruthy();
  });

  it('auto-numbers sequential verses, choruses, and beat switches', () => {
    const sec1 = createSection('verse', 'movement-1', [], 1);
    expect(sec1.name).toBe('Verse 1');

    const sec2 = createSection('verse', 'movement-1', [sec1], 5);
    expect(sec2.name).toBe('Verse 2');

    const chorus1 = createSection('chorus', 'movement-1', [sec1, sec2], 9);
    expect(chorus1.name).toBe('Chorus 1');

    const bridge = createSection('bridge', 'movement-1', [sec1, sec2, chorus1], 13);
    expect(bridge.name).toBe('Bridge');

    const beatSwitch = createBeatSwitchMovement(
      [{ id: 'm1', name: 'Main', bpm: 120, sectionIds: [] }],
      135,
    );
    expect(beatSwitch.name).toBe('Section 2');
    expect(beatSwitch.bpm).toBe(135);

    // Test sections to lyrics serialization
    sec1.blocks[0].bars[0].rawText = 'First bar of verse 1';
    sec2.blocks[0].bars[0].rawText = 'First bar of verse 2';
    const lyrics = sectionsToLyrics([sec1, sec2]);
    expect(lyrics).toContain('First bar of verse 1');
    expect(lyrics).toContain('First bar of verse 2');

    // Test reindexing global bars
    const reindexed = reindexSectionsGlobalBars([sec1, sec2]);
    expect(reindexed[0].blocks[0].bars[0].globalBarNumber).toBe(1);
    expect(reindexed[1].blocks[0].bars[0].globalBarNumber).toBe(5);
  });

  it('converts an empty block to an empty string with no phantom newlines', () => {
    const emptyBlock = createEmptyCadenceBlock(1, 1);
    expect(blockToText(emptyBlock)).toBe('');
  });

  it('converts a block with text to multiline text while trimming trailing empty lines', () => {
    const block = createEmptyCadenceBlock(1, 1);
    block.bars[0].rawText = 'Line 1';
    block.bars[1].rawText = 'Line 2';
    expect(blockToText(block)).toBe('Line 1\nLine 2');
  });
});


