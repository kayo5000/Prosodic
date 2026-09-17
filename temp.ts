
import type { PaperSection, CadenceBarLine } from './src/components/studio/paper/types';
import { countLineSyllables, autocorrectHyphenation } from './src/utils/syllableCounter';

export function syncCrossBarHyphenation(sections: PaperSection[]): PaperSection[] {
  // We need to iterate over all bars sequentially across all blocks and sections
  // to detect bar(i) ending with '-' and bar(i+1) starting with '-' (or auto-prepending it).

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
      // It's a cross-bar split!
      
      // 1. Tell the next field it got split by auto-prepending '-' if it doesn't have it
      let rightPart = nextText.split(/\s+/)[0]; // First word of next bar
      if (!rightPart.startsWith('-')) {
        rightPart = '-' + rightPart;
      }
      
      const leftPart = currentText.split(/\s+/).pop()!; // Last word of current bar

      // 2. Validate and snap to syllables (autocorrect)
      const [newLeft, newRight] = autocorrectHyphenation(leftPart, rightPart);

      // 3. Update the text in both bars
      if (newLeft !== leftPart || newRight !== rightPart || !nextText.startsWith('-')) {
        // Replace last word of current
        const curWords = currentText.split(/\s+/);
        curWords[curWords.length - 1] = newLeft;
        current.rawText = curWords.join(' ') + (current.rawText.endsWith(' ') ? ' ' : '');
        current.spans = [{ text: current.rawText }];
        current.syllableCount = countLineSyllables(current.rawText);

        // Replace first word of next
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
      // If user deleted the hyphen from the first bar, we should remove it from the second bar too
      // so they remain 'communicating'.
      const nxtWords = nextText.split(/\s+/);
      nxtWords[0] = nxtWords[0].replace(/^-/, '');
      next.rawText = (next.rawText.startsWith(' ') ? ' ' : '') + nxtWords.join(' ');
      next.spans = [{ text: next.rawText }];
      next.syllableCount = countLineSyllables(next.rawText);
    }
  }

  // Re-assemble sections
  const newSections = JSON.parse(JSON.stringify(sections));
  allBars.forEach((item) => {
    newSections[item.secIndex].blocks[item.blockIndex].bars[item.barIndex] = item.bar;
  });

  return newSections;
}

