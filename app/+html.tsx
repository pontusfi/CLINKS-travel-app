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
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Expo injects a favicon.ico of its own from app.json's web.favicon;
            this PNG is the crisper option modern browsers prefer. */}
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />

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
//
// The height rules matter more than they look. ScrollViewStyleReset (above)
// sets `html, body, #root { height: 100% }`, and on mobile `100%` resolves
// against the *layout* viewport — which browsers size to the largest viewport,
// i.e. with the address bar retracted. The app shell then stands taller than
// what's actually on screen, and the browser pans the visual viewport over the
// overhang. That reads as being able to scroll a bit past the top and bottom,
// and `overflow: hidden` does nothing about it, because the document isn't the
// thing scrolling.
//
// dvh tracks the currently visible height instead, so there's no overhang to
// pan over. Kept behind @supports with the 100% above as the fallback.
const rootStyle = `
html, body, #root {
  background-color: #0B0A12;
  overscroll-behavior: none;
}
@supports (height: 100dvh) {
  html, body, #root {
    height: 100dvh;
  }
}
html {
  overflow: hidden;
}
body {
  -webkit-tap-highlight-color: transparent;
}
`
