/**
 * figma_client.js
 *
 * Connects to Figma API to discover team projects, files, and design components.
 */

const figmaToken = process.env.FIGMA_TOKEN;
if (!figmaToken) {
  console.error('FIGMA_TOKEN is not set. Run with:  node --env-file=.env tools/figma_client.js');
  process.exit(1);
}
const teamId = '1668710866629834954';

async function fetchFigmaData() {
  console.log('📡 Connecting to Figma REST API...');

  try {
    // 1. Get Team Projects
    const res = await fetch(`https://api.figma.com/v1/teams/${teamId}/projects`, {
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
    console.log('🎨 Found Projects:', JSON.stringify(data, null, 2));

    if (data.projects && data.projects.length > 0) {
      for (const project of data.projects) {
        console.log(`\n📁 Inspecting Project: ${project.name} (ID: ${project.id})...`);
        const filesRes = await fetch(`https://api.figma.com/v1/projects/${project.id}/files`, {
          headers: { 'X-Figma-Token': figmaToken },
        });
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          console.log(`📄 Files in ${project.name}:`, JSON.stringify(filesData, null, 2));
        }
      }
    }
  } catch (err) {
    console.error('Network Error connecting to Figma:', err);
  }
}

fetchFigmaData();
