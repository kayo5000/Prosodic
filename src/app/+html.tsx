import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        {/* Favicons & Apple Touch Icon Suite */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png" />

        <title>Prosodic</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          #portrait-lock-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #000;
            z-index: 2147483647;
            color: white;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 24px;
          }
          /* Target mobile phones in landscape mode */
          @media screen and (max-height: 500px) and (orientation: landscape) {
            #portrait-lock-overlay {
              display: flex !important;
            }
          }
        ` }} />
      </head>
      <body>
        <div id="portrait-lock-overlay">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 16 }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
          <h2 style={{ fontSize: 20, margin: 0, marginBottom: 8 }}>Please Rotate Your Device</h2>
          <p style={{ color: '#888', margin: 0, fontSize: 15 }}>Prosodic Studio requires portrait mode on mobile devices.</p>
        </div>
        {children}
      </body>
    </html>
  );
}
