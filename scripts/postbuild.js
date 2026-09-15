const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  const vercelJson = {
    cleanUrls: true,
    rewrites: [{ source: '/(.*)', destination: '/index.html' }],
  };
  fs.writeFileSync(path.join(distDir, 'vercel.json'), JSON.stringify(vercelJson, null, 2));

  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    const contactDir = path.join(distDir, 'contact');
    fs.mkdirSync(contactDir, { recursive: true });
    fs.writeFileSync(path.join(contactDir, 'index.html'), html);
    fs.writeFileSync(path.join(distDir, 'contact.html'), html);

    const jColeDir = path.join(distDir, 'j-cole');
    fs.mkdirSync(jColeDir, { recursive: true });
    fs.writeFileSync(path.join(jColeDir, 'index.html'), html);
    fs.writeFileSync(path.join(distDir, 'j-cole.html'), html);
  }

  // Copy public assets (avatar.jpg, bg.jpg, intro-bg.mp4)
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    const publicFiles = fs.readdirSync(publicDir);
    for (const file of publicFiles) {
      const srcFile = path.join(publicDir, file);
      if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, path.join(distDir, file));
      }
    }
  }

  const videoSrc = path.resolve(__dirname, '../assets/videos/intro-bg.mp4');
  const videoDistDir = path.join(distDir, 'assets/videos');
  if (fs.existsSync(videoSrc)) {
    fs.mkdirSync(videoDistDir, { recursive: true });
    fs.copyFileSync(videoSrc, path.join(videoDistDir, 'intro-bg.mp4'));
  }

  console.log('[postbuild] Generated dist/vercel.json, dist/contact fallbacks, and verified assets');
}
