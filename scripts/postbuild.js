const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  const vercelJson = {
    cleanUrls: true,
    rewrites: [{ source: '/(.*)', destination: '/index.html' }],
    headers: [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/_expo/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ],
  };
  fs.writeFileSync(path.join(distDir, 'vercel.json'), JSON.stringify(vercelJson, null, 2));

  // Copy public assets (avatar.jpg, bg.jpg, intro-bg.mp4, favicon.ico, favicon.png, apple-touch-icon.png, etc.)
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    const copyRecursive = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const item of fs.readdirSync(src)) {
          copyRecursive(path.join(src, item), path.join(dest, item));
        }
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    copyRecursive(publicDir, distDir);
  }

  // Ensure assets/images/favicon.png exists in dist
  const distAssetsImages = path.join(distDir, 'assets/images');
  fs.mkdirSync(distAssetsImages, { recursive: true });
  const favSrc = path.resolve(__dirname, '../assets/images/favicon.png');
  if (fs.existsSync(favSrc)) {
    fs.copyFileSync(favSrc, path.join(distAssetsImages, 'favicon.png'));
  }

  const videoSrc = path.resolve(__dirname, '../assets/videos/intro-bg.mp4');
  const videoDistDir = path.join(distDir, 'assets/videos');
  if (fs.existsSync(videoSrc)) {
    fs.mkdirSync(videoDistDir, { recursive: true });
    fs.copyFileSync(videoSrc, path.join(videoDistDir, 'intro-bg.mp4'));
  }

  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');

    const iconTags = `
    <!-- Favicons and Apple Touch Icon Suite -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png" />
`;

    if (!html.includes('apple-touch-icon')) {
      html = html.replace('</head>', `${iconTags}\n  </head>`);
      fs.writeFileSync(indexPath, html, 'utf8');
    }

    const contactDir = path.join(distDir, 'contact');
    fs.mkdirSync(contactDir, { recursive: true });
    fs.writeFileSync(path.join(contactDir, 'index.html'), html);
    fs.writeFileSync(path.join(distDir, 'contact.html'), html);

    const jColeDir = path.join(distDir, 'j-cole');
    fs.mkdirSync(jColeDir, { recursive: true });
    fs.writeFileSync(path.join(jColeDir, 'index.html'), html);
    fs.writeFileSync(path.join(distDir, 'j-cole.html'), html);
  }

  console.log('[postbuild] Full icon suite, assets, and vercel.json successfully generated in dist/');
}
