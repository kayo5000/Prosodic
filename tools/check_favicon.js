const https = require('https');

const paths = [
  'favicon.ico',
  'favicon.png',
  'apple-touch-icon.png',
  'apple-touch-icon-precomposed.png',
  'assets/images/favicon.png',
];

paths.forEach((p) => {
  https.get(`https://prosodic.shop/${p}`, (res) => {
    let size = 0;
    res.on('data', (d) => (size += d.length));
    res.on('end', () => {
      console.log(`${p} -> status: ${res.statusCode}, size: ${size}, type: ${res.headers['content-type']}`);
    });
  }).on('error', (e) => console.error(p, e.message));
});
