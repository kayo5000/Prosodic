/**
 * codex_auditor.js
 *
 * Real OpenAI / Codex Systems Auditor Bridge for Antigravity.
 *
 * Calls OpenAI's official API (model: gpt-4o) using OPENAI_API_KEY with the
 * adversarial persona defined in tools/codex-auditor-prompt.md.
 */

const fs = require('fs');
const path = require('path');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Error: OPENAI_API_KEY environment variable is missing.');
  process.exit(1);
}

const promptPath = path.join(__dirname, 'codex-auditor-prompt.md');
const auditorPrompt = fs.existsSync(promptPath)
  ? fs.readFileSync(promptPath, 'utf8')
  : 'You are a principal systems auditor.';

async function runCodexAudit(targetContent, userContext = '') {
  console.log('📡 Connecting to OpenAI GPT-4o / Codex API...');

  const systemMessage = `${auditorPrompt}\n\nStrict Rule: You are performing an independent, adversarial code audit. Do not summarize or praise. Find bugs, race conditions, edge cases, and design flaws.`;

  const userMessage = userContext
    ? `${userContext}\n\nHere is the codebase content / diff to review:\n\n${targetContent}`
    : `Please perform a rigorous adversarial audit of the following code:\n\n${targetContent}`;

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`OpenAI API Error (${response.status}):`, errText);
      process.exit(1);
    }

    const data = await response.json();
    const review = data.choices[0].message.content;

    console.log('\n======================================================================');
    console.log('🤖 OFFICIAL OPENAI (GPT-4O / CODEX) ADVERSARIAL AUDIT REPORT');
    console.log('======================================================================\n');
    console.log(review);
    console.log('\n======================================================================\n');
  } catch (err) {
    console.error('Network or Execution Error calling OpenAI API:', err);
    process.exit(1);
  }
}

// Read target files from arguments or read prosodicCore.ts + transaction.ts by default
const args = process.argv.slice(2);
let filesToAudit = [
  'src/services/prosodicCore.ts',
  'src/data/db/transaction.ts',
  'src/utils/aavePhonology.ts',
  'src/data/translations.ts',
];

if (args.length > 0) {
  filesToAudit = args;
}

let combinedCode = '';
for (const relPath of filesToAudit) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (fs.existsSync(fullPath)) {
    combinedCode += `\n\n--- FILE: ${relPath} ---\n` + fs.readFileSync(fullPath, 'utf8');
  }
}

runCodexAudit(
  combinedCode,
  'Audit our Step 3 codebase implementation (Central Brain, AAVE Phonology, SQLite transactions, and 3-Mode Universal Translation Engine).'
);
