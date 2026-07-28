import { Platform } from 'react-native'

export interface ShareCardData {
  eventName: string
  totalDrinks: number
  leaderboard: { emoji: string; name: string; count: number }[]
  topDrink?: { emoji: string; label: string } | null
  peakHour?: string | null
  closed?: boolean
}

const W = 1080
const H = 1350
const PAD = 80

const BG = '#0B0A12'
const TEXT = '#F5F3FA'
const MUTED = '#B6B0C8'
const DIM = '#6B6680'
const PURPLE = '#9B5CFF'
const PINK = '#FF3D8B'
const LIME = '#C6FF4D'

/** Card generation is canvas-based, so web only. Native falls back to text. */
export function canShareImage(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined'
}

/**
 * Builds the stats card and hands it to the share sheet, or downloads it.
 *
 * IMPORTANT: this is deliberately synchronous end to end — no awaits before
 * `navigator.share`. Safari only honours share() while the user activation from
 * the tap is still live, and awaiting anything at all can spend it, at which
 * point the call rejects with NotAllowedError and the button looks broken.
 * That's why the PNG comes from the synchronous toDataURL rather than toBlob,
 * and why fonts aren't awaited: the app has already rendered with them, so
 * they're loaded by the time anyone can press this.
 */
export function shareStatsImage(data: ShareCardData): void {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not render the card on this browser.')

  draw(ctx, data)

  const blob = dataUrlToBlob(canvas.toDataURL('image/png'))
  const filename = `clink-${slug(data.eventName)}.png`
  const file = new File([blob], filename, { type: 'image/png' })

  const nav = navigator as Navigator & {
    canShare?: (d: any) => boolean
    share?: (d: any) => Promise<void>
  }

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    nav.share({
      files: [file],
      title: `${data.eventName} — CLINK`,
    }).catch(() => {
      // Cancelling the share sheet rejects too, so a failure here isn't worth
      // surfacing — but a genuine one shouldn't leave you empty-handed.
      download(blob, filename)
    })
    return
  }

  download(blob, filename)
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

function draw(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // The two glow blobs from the app's background.
  blob(ctx, 190, 210, 430, 'rgba(155,92,255,0.30)')
  blob(ctx, 900, 1120, 470, 'rgba(255,61,139,0.24)')

  let y = PAD + 20

  // ── Wordmark ──────────────────────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic'
  ctx.font = font(700, 52)
  const wordmark = ctx.createLinearGradient(PAD, y - 40, PAD + 260, y + 10)
  wordmark.addColorStop(0, '#C6B0FF')
  wordmark.addColorStop(0.5, PURPLE)
  wordmark.addColorStop(1, PINK)
  ctx.fillStyle = wordmark
  ctx.fillText('CLINK', PAD, y)

  ctx.font = mono(11 * 2)
  ctx.fillStyle = DIM
  ctx.textAlign = 'right'
  ctx.fillText(data.closed ? 'FINAL RESULTS' : 'LIVE SCOREBOARD', W - PAD, y)
  ctx.textAlign = 'left'

  y += 78

  // ── Event name ────────────────────────────────────────────────────────────
  ctx.fillStyle = TEXT
  y = wrapText(ctx, data.eventName, PAD, y, W - PAD * 2, 74, 700, 82)

  y += 30

  // ── Total ─────────────────────────────────────────────────────────────────
  ctx.font = mono(24)
  ctx.fillStyle = DIM
  ctx.fillText('DRINKS LOGGED', PAD, y)

  y += 130
  ctx.font = font(700, 150)
  ctx.fillStyle = TEXT
  ctx.fillText(String(data.totalDrinks), PAD, y)

  y += 70

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const rows = data.leaderboard.slice(0, 5)
  const max = Math.max(...rows.map(r => r.count), 1)

  ctx.font = mono(24)
  ctx.fillStyle = DIM
  ctx.fillText('LEADERBOARD', PAD, y)
  y += 48

  const rowH = 92
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const top = i === 0
    const rowY = y + i * rowH

    roundRect(ctx, PAD, rowY, W - PAD * 2, rowH - 14, 22)
    ctx.fillStyle = top ? 'rgba(155,92,255,0.16)' : 'rgba(255,255,255,0.045)'
    ctx.fill()

    // The bar is the score, drawn inside the row and clipped to its shape.
    ctx.save()
    roundRect(ctx, PAD, rowY, W - PAD * 2, rowH - 14, 22)
    ctx.clip()
    const barW = ((W - PAD * 2) * r.count) / max
    const bar = ctx.createLinearGradient(PAD, 0, PAD + barW, 0)
    bar.addColorStop(0, top ? 'rgba(155,92,255,0.55)' : 'rgba(155,92,255,0.22)')
    bar.addColorStop(1, top ? 'rgba(255,61,139,0.45)' : 'rgba(255,61,139,0.14)')
    ctx.fillStyle = bar
    ctx.fillRect(PAD, rowY, barW, rowH - 14)
    ctx.restore()

    const midY = rowY + (rowH - 14) / 2 + 12

    ctx.font = mono(26)
    ctx.fillStyle = top ? LIME : DIM
    ctx.fillText(String(i + 1), PAD + 28, midY)

    ctx.font = font(400, 40)
    ctx.fillText(r.emoji, PAD + 74, midY + 2)

    ctx.font = font(700, 36)
    ctx.fillStyle = TEXT
    ctx.fillText(ellipsis(ctx, r.name, 480), PAD + 136, midY)

    ctx.textAlign = 'right'
    ctx.font = font(700, 38)
    ctx.fillStyle = top ? LIME : MUTED
    ctx.fillText(String(r.count), W - PAD - 30, midY)
    ctx.textAlign = 'left'
  }

  // ── Footer strip ──────────────────────────────────────────────────────────
  const footY = H - PAD - 150

  roundRect(ctx, PAD, footY, W - PAD * 2, 150, 28)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()

  const half = (W - PAD * 2) / 2

  ctx.font = mono(22)
  ctx.fillStyle = DIM
  ctx.fillText('TOP DRINK', PAD + 40, footY + 52)
  ctx.fillText('PEAK HOUR', PAD + half + 40, footY + 52)

  ctx.font = font(700, 42)
  ctx.fillStyle = TEXT
  const top = data.topDrink ? `${data.topDrink.emoji} ${data.topDrink.label}` : '—'
  ctx.fillText(top, PAD + 40, footY + 110)
  ctx.fillText(data.peakHour ?? '—', PAD + half + 40, footY + 110)
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

/**
 * The fonts are the ones expo-font registered for the app, with a system stack
 * behind them — canvas silently falls back rather than failing if they somehow
 * aren't there, which is the right trade for a share card.
 */
function font(weight: number, size: number) {
  return `${weight} ${size}px "SpaceGrotesk_Bold", "SpaceGrotesk", system-ui, -apple-system, sans-serif`
}

function mono(size: number) {
  return `400 ${size}px "SpaceMono", ui-monospace, Menlo, monospace`
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draws wrapped text, returns the baseline y after the last line. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, maxW: number,
  size: number, weight: number, lineHeight: number,
): number {
  ctx.font = font(weight, size)
  const words = text.split(' ')
  let line = ''
  let cursor = y

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxW && line) {
      ctx.fillText(line, x, cursor)
      cursor += lineHeight
      line = word
    } else {
      line = candidate
    }
  }
  if (line) {
    ctx.fillText(ellipsis(ctx, line, maxW), x, cursor)
  }
  return cursor
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxW) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

// ─── Output ──────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const bytes = atob(b64)
  const buf = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
  return new Blob([buf], { type: mime })
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event'
}
