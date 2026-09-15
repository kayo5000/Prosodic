/**
 * inspect_figma_file.js
 *
 * Downloads and analyzes the Figma design file structure, styles, colors, and components.
 */

const fs = require('fs');
const path = require('path');

const figmaToken = process.env.FIGMA_TOKEN;
if (!figmaToken) {
  console.error('FIGMA_TOKEN is not set. Run with:  node --env-file=.env tools/inspect_figma_file.js');
  process.exit(1);
}
const fileKey = process.env.FIGMA_FILE_KEY;

async function fetchFigmaFile() {
  console.log(`📡 Fetching Figma file: ${fileKey}...`);

  try {
    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': figmaToken,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Figma API Error (${res.status}):`, err);
      return;
    }

    const data = await res.json();
    console.log(`✅ File Name: "${data.name}" (Last Modified: ${data.lastModified})`);
    console.log(`📊 Number of Pages / Canvas: ${data.document.children.length}`);

    // Save full JSON to scratch for deep analysis
    const outDir = path.resolve(__dirname, '..', 'scratch');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, 'figma_file.json');
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Saved full Figma data to ${outFile}`);

    // Traverse and log top-level frames and components
    const frames = [];
    function traverse(node, depth = 0) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'SECTION') {
        frames.push({
          id: node.id,
          name: node.name,
          type: node.type,
          bounds: node.absoluteBoundingBox,
          childrenCount: node.children ? node.children.length : 0,
        });
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    }

    traverse(data.document);

    console.log('\n🎨 Top-Level Frames & Components Found:');
    frames.forEach((f) => {
      console.log(` - [${f.type}] "${f.name}" (ID: ${f.id}, Children: ${f.childrenCount}, Bounds: ${JSON.stringify(f.bounds)})`);
    });

    // If frames exist, fetch rendered image preview URLs
    if (frames.length > 0) {
      const ids = frames.map((f) => f.id).slice(0, 10).join(',');
      console.log(`\n🖼️ Fetching image rendering previews for frames: ${ids}...`);
      const imgRes = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=png&scale=2`, {
        headers: { 'X-Figma-Token': figmaToken },
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        console.log('🖼️ Rendered Image URLs:', JSON.stringify(imgData.images, null, 2));

        // Download the images to scratch
        for (const [id, url] of Object.entries(imgData.images)) {
          if (url) {
            const frameObj = frames.find((f) => f.id === id);
            const safeName = (frameObj ? frameObj.name : id).replace(/[^a-zA-Z0-9_-]/g, '_');
            const imgFetch = await fetch(url);
            const buffer = Buffer.from(await imgFetch.arrayBuffer());
            const imgPath = path.join(outDir, `figma_${safeName}.png`);
            fs.writeFileSync(imgPath, buffer);
            console.log(`📸 Downloaded frame preview: ${imgPath}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

fetchFigmaFile();
