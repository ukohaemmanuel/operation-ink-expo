/** Paper-and-ink app icons drawn in code. No third-party artwork. */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')

function crc32(buffer) {
  let crc = ~0
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function icon(size) {
  const data = Buffer.alloc(size * size * 4, 255)
  const put = (x, y, r, g, b) => {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= size || py >= size) return
    const index = (py * size + px) * 4
    data[index] = r
    data[index + 1] = g
    data[index + 2] = b
    data[index + 3] = 255
  }
  const disc = (cx, cy, radius, color) => {
    const r2 = radius * radius
    for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
      for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) put(x, y, color[0], color[1], color[2])
      }
    }
  }
  const stroke = (x0, y0, x1, y1, radius, color) => {
    const minX = Math.floor(Math.min(x0, x1) - radius)
    const maxX = Math.ceil(Math.max(x0, x1) + radius)
    const minY = Math.floor(Math.min(y0, y1) - radius)
    const maxY = Math.ceil(Math.max(y0, y1) + radius)
    const dx = x1 - x0
    const dy = y1 - y0
    const len2 = dx * dx + dy * dy || 1
    const r2 = radius * radius
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2))
        const px = x0 + t * dx
        const py = y0 + t * dy
        if ((x - px) ** 2 + (y - py) ** 2 <= r2) put(x, y, color[0], color[1], color[2])
      }
    }
  }
  const ink = [17, 17, 17]
  const blue = [40, 120, 208]
  const margin = size * 0.06
  const border = Math.max(2, size * 0.012)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const edge = x < margin || y < margin || x >= size - margin || y >= size - margin
      const inner = x < margin + border || y < margin + border || x >= size - margin - border || y >= size - margin - border
      if (edge && inner) put(x, y, 17, 17, 17)
    }
  }
  const cx = size * 0.44
  disc(cx, size * 0.28, size * 0.055, ink)
  stroke(cx, size * 0.34, cx, size * 0.6, size * 0.016, ink)
  stroke(cx, size * 0.4, size * 0.28, size * 0.48, size * 0.014, ink)
  stroke(cx, size * 0.4, size * 0.62, size * 0.5, size * 0.014, ink)
  stroke(cx, size * 0.6, size * 0.32, size * 0.82, size * 0.014, ink)
  stroke(cx, size * 0.6, size * 0.58, size * 0.82, size * 0.014, ink)
  const hx = size * 0.74
  disc(hx, size * 0.62, size * 0.03, blue)
  stroke(hx, size * 0.66, hx, size * 0.8, size * 0.01, blue)
  stroke(hx, size * 0.7, size * 0.68, size * 0.76, size * 0.008, blue)
  stroke(hx, size * 0.7, size * 0.8, size * 0.76, size * 0.008, blue)
  return png(size, size, data)
}

const files = {
  'icon.png': 1024,
  'splash-icon.png': 1024,
  'android-icon-foreground.png': 1024,
  'android-icon-background.png': 1024,
  'android-icon-monochrome.png': 1024,
  'favicon.png': 48,
}

for (const [name, size] of Object.entries(files)) {
  writeFileSync(join(assets, name), icon(size))
  console.log(name, size)
}
