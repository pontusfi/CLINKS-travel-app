/**
 * Generates every CLINK icon from one vector-ish definition.
 *
 *   node scripts/generate-icons.js
 *
 * Everything is described in a normalised [0,1] square and rasterised at 2048px,
 * then downscaled — Jimp's bilinear filter is doing the anti-aliasing, which is
 * why the master is drawn much larger than any output.
 *
 * The mark is two glasses tilted into a clink, with a notch near each rim so the
 * silhouette reads as a glass rather than a blob, plus three sparks at the point
 * of contact. Colours are the app's gradient (see the design tokens in
 * CLAUDE.md) so the icon matches the wordmark and the primary buttons.
 *
 * Re-run this after changing any of it, then commit the PNGs — the build does
 * not generate them.
 */

const Jimp = require('jimp-compact')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MASTER = 2048

const PURPLE = [0x9b, 0x5c, 0xff]
const PINK = [0xff, 0x3d, 0x8b]

// ─── Geometry, all in [0,1] ──────────────────────────────────────────────────

// Tall and sharply tapered — a wide, shallow trapezoid just reads as a slab.
const GLASS = { hwTop: 0.125, hwBot: 0.07, hh: 0.32 }

// The rotation leans each glass *inward at the rim*, so they meet at the top and
// splay at the base. Flip these signs and you get a V that meets at the bottom,
// which looks like a crown rather than a toast.
const GLASSES = [
  { cx: 0.23, cy: 0.55, rot: 22 },
  { cx: 0.77, cy: 0.55, rot: -22 },
]

// Sparks radiate from just above where the rims meet.
const SPARK_ORIGIN = { x: 0.5, y: 0.235 }
const SPARKS = [90, 145, 35]
const SPARK_R0 = 0.055
const SPARK_R1 = 0.12
const SPARK_HALF_W = 0.018

const CORNER_R = 0.22

// How much of the tile the mark fills. At 1.0 the glasses run almost edge to
// edge (~33% ink) and the tile reads as cramped, so the app icon holds it back
// to leave a margin of gradient. The Android foreground is smaller again to
// stay inside the adaptive-icon safe zone, which masks the outer third.
const SCALE_ICON = 0.84
const SCALE_ANDROID_FG = 0.62
const SCALE_SPLASH = 0.86
// The favicon is seen at 16px in a tab. It needs more air than the app icon:
// at the same scale the glasses run into the rounded corners and merge.
const SCALE_FAVICON = 0.70
// Maskable icons get cropped to a circle/squircle of ~80% diameter. The
// full-bleed art pokes outside that, so the maskable variant is padded further
// — declaring one asset as both "any" and "maskable" clips the glass bases.
const SCALE_MASKABLE = 0.58

function insideGlass(x, y, g) {
  const dx = x - g.cx
  const dy = y - g.cy
  const t = (-g.rot * Math.PI) / 180
  const ct = Math.cos(t)
  const st = Math.sin(t)
  const lx = dx * ct - dy * st
  const ly = dx * st + dy * ct

  if (Math.abs(ly) > GLASS.hh) return false

  // Notch below the rim. It vanishes at favicon sizes, which is fine — it's
  // there to give the shape structure at 192px and up.
  const fromTop = ly + GLASS.hh
  if (fromTop > 0.05 && fromTop < 0.072) return false

  const k = fromTop / (2 * GLASS.hh)
  const halfW = GLASS.hwTop + (GLASS.hwBot - GLASS.hwTop) * k
  return Math.abs(lx) <= halfW
}

function insideSpark(x, y) {
  for (const deg of SPARKS) {
    const a = (deg * Math.PI) / 180
    const dx = Math.cos(a)
    const dy = -Math.sin(a)
    const ax = SPARK_ORIGIN.x + dx * SPARK_R0
    const ay = SPARK_ORIGIN.y + dy * SPARK_R0
    const bx = SPARK_ORIGIN.x + dx * SPARK_R1
    const by = SPARK_ORIGIN.y + dy * SPARK_R1

    const vx = bx - ax
    const vy = by - ay
    const wx = x - ax
    const wy = y - ay
    const len2 = vx * vx + vy * vy
    let t = len2 ? (wx * vx + wy * vy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const px = ax + vx * t - x
    const py = ay + vy * t - y
    if (Math.sqrt(px * px + py * py) <= SPARK_HALF_W) return true
  }
  return false
}

function insideMark(x, y, scale) {
  const mx = 0.5 + (x - 0.5) / scale
  const my = 0.5 + (y - 0.5) / scale
  if (mx < 0 || mx > 1 || my < 0 || my > 1) return false
  if (insideSpark(mx, my)) return true
  return GLASSES.some(g => insideGlass(mx, my, g))
}

/** Rounded-square coverage test, used only for the favicon variants. */
function insideRoundedSquare(x, y) {
  const r = CORNER_R
  const cx = Math.min(Math.max(x, r), 1 - r)
  const cy = Math.min(Math.max(y, r), 1 - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

// ─── Rasteriser ──────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {boolean} opts.background  draw the gradient
 * @param {boolean} opts.mark        draw the glasses
 * @param {boolean} opts.rounded     clip to a rounded square
 * @param {number}  opts.markScale   1 = full bleed, <1 shrinks it (Android safe zone)
 */
function render({ background = true, mark = true, rounded = false, markScale = 1 }) {
  const size = MASTER
  const buf = Buffer.alloc(size * size * 4)

  for (let py = 0; py < size; py++) {
    const y = (py + 0.5) / size
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size
      const i = (py * size + px) * 4

      if (rounded && !insideRoundedSquare(x, y)) continue // stays transparent

      let r = 0
      let g = 0
      let b = 0
      let a = 0

      if (background) {
        // 135°: interpolate along the top-left → bottom-right diagonal.
        const t = Math.min(1, Math.max(0, (x + y) / 2))
        r = PURPLE[0] + (PINK[0] - PURPLE[0]) * t
        g = PURPLE[1] + (PINK[1] - PURPLE[1]) * t
        b = PURPLE[2] + (PINK[2] - PURPLE[2]) * t
        a = 255
      }

      if (mark && insideMark(x, y, markScale)) {
        r = 255
        g = 255
        b = 255
        a = 255
      }

      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = a
    }
  }

  const img = new Jimp(size, size)
  img.bitmap.data = buf
  return img
}

/** Rough ink coverage — a blind smoke test that the shapes actually drew. */
function coverage(img, predicate) {
  const d = img.bitmap.data
  let hit = 0
  const total = img.bitmap.width * img.bitmap.height
  for (let i = 0; i < d.length; i += 4) {
    if (predicate(d[i], d[i + 1], d[i + 2], d[i + 3])) hit++
  }
  return (hit / total) * 100
}

const isWhite = (r, g, b, a) => a > 200 && r > 240 && g > 240 && b > 240
const isOpaque = (_r, _g, _b, a) => a > 200

async function emit(img, size, rel) {
  const out = img.clone().resize(size, size, Jimp.RESIZE_BILINEAR)
  await out.writeAsync(path.join(ROOT, rel))
  console.log(`  ${String(size).padStart(4)}px  ${rel}`)
}

async function main() {
  console.log('rendering master tiles...')
  const full = render({ background: true, mark: true, markScale: SCALE_ICON })
  const roundedTile = render({ background: true, mark: true, rounded: true, markScale: SCALE_FAVICON })
  const markOnly = render({ background: false, mark: true, markScale: SCALE_ANDROID_FG })
  const splashMark = render({ background: false, mark: true, markScale: SCALE_SPLASH })
  const maskable = render({ background: true, mark: true, markScale: SCALE_MASKABLE })
  const bgOnly = render({ background: true, mark: false })

  const white = coverage(full, isWhite)
  const opaque = coverage(roundedTile, isOpaque)
  console.log(`\nsanity checks`)
  console.log(`  mark covers        ${white.toFixed(1)}%  (want roughly 15-27%)`)
  console.log(`  rounded tile fills ${opaque.toFixed(1)}%  (want roughly 88-97%)`)
  if (white < 12 || white > 30) throw new Error('mark coverage looks wrong — check the geometry')
  if (opaque < 80 || opaque > 99) throw new Error('rounded mask looks wrong')

  console.log('\nwriting:')
  await emit(full, 1024, 'assets/icon.png')
  await emit(full, 512, 'public/icon-512.png')
  await emit(full, 192, 'public/icon-192.png')
  await emit(full, 180, 'public/apple-touch-icon.png')

  await emit(maskable, 512, 'public/icon-maskable-512.png')
  await emit(maskable, 192, 'public/icon-maskable-192.png')

  await emit(roundedTile, 64, 'public/favicon.png')
  await emit(roundedTile, 48, 'assets/favicon.png')

  await emit(markOnly, 1024, 'assets/android-icon-foreground.png')
  await emit(markOnly, 1024, 'assets/android-icon-monochrome.png')
  await emit(splashMark, 512, 'assets/splash-icon.png')
  await emit(bgOnly, 1024, 'assets/android-icon-background.png')

  console.log('\ndone.')
}

// Only run when invoked directly, so the shapes can be required and previewed
// at arbitrary sizes while iterating on the design.
if (require.main === module) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { render, Jimp, SCALE_ICON, SCALE_FAVICON, SCALE_ANDROID_FG, SCALE_SPLASH, SCALE_MASKABLE }
