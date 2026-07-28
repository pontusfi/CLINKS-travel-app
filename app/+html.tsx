import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

/**
 * HTML shell for every web page. Web-only — native is unaffected.
 * Mostly here so "Add to Home Screen" gives a proper standalone app.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>CLINK</title>
        <meta name="description" content="Log every round with your crew, in real time." />

        {/* Installed-PWA behaviour */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B0A12" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CLINK" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Link previews when the invite URL gets pasted into a group chat */}
        <meta property="og:title" content="CLINK" />
        <meta property="og:description" content="Log every round with your crew, in real time." />
        <meta property="og:type" content="website" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: rootStyle }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

// Dark background everywhere, including the overscroll area, so the PWA doesn't
// flash white against the app's #0B0A12 canvas.
const rootStyle = `
html, body, #root {
  background-color: #0B0A12;
  overscroll-behavior: none;
}
body {
  -webkit-tap-highlight-color: transparent;
}
`
