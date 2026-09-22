/**
 * Original procedural sound effects for Operation Safe Return.
 * These files are generated, not recorded from any game. CC0.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx')
mkdirSync(root, { recursive: true })

const rate = 22050

function wav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(rate, 24)
  buffer.writeUInt32LE(rate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE((sample * 32767) | 0, 44 + i * 2)
  }
  return buffer
}

function noise(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296 * 2 - 1
  }
}

function render(seconds, fn) {
  const count = Math.floor(rate * seconds)
  const samples = new Array(count)
  for (let i = 0; i < count; i++) samples[i] = fn(i / rate, i)
  return samples
}

const shotNoise = noise(3)
const enemyNoise = noise(9)
const hitNoise = noise(11)
const stepNoise = noise(21)

const cues = {
  shot: render(0.09, t => {
    const env = Math.exp(-t * 42)
    return (shotNoise() * 0.75 + Math.sin(2 * Math.PI * 125 * t) * 0.35) * env
  }),
  enemy: render(0.11, t => (enemyNoise() * 0.55 + Math.sin(2 * Math.PI * 90 * t) * 0.25) * Math.exp(-t * 28) * 0.7),
  hit: render(0.07, t => hitNoise() * Math.exp(-t * 55) * 0.8),
  hurt: render(0.22, t => Math.sin(2 * Math.PI * (180 - t * 220) * t) * Math.exp(-t * 8) * 0.45),
  reload: render(0.28, t => {
    const click = (at, freq) => Math.exp(-Math.abs(t - at) * 90) * Math.sin(2 * Math.PI * freq * t)
    return (click(0.02, 640) + click(0.16, 420) * 0.8) * 0.5
  }),
  interact: render(0.12, t => Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 18) * 0.35),
  unlock: render(0.32, t => {
    const blip = (at, freq) => Math.exp(-Math.max(0, t - at) * 22) * (t > at ? Math.sin(2 * Math.PI * freq * t) : 0)
    return (blip(0.01, 520) + blip(0.1, 680) + blip(0.18, 860)) * 0.28
  }),
  step: render(0.05, t => stepNoise() * Math.exp(-t * 70) * 0.35),
  death: render(0.7, t => Math.sin(2 * Math.PI * (196 - t * 80) * t) * Math.exp(-t * 3.2) * 0.4),
  complete: render(0.9, t => {
    const note = (at, freq) => (t > at ? Math.sin(2 * Math.PI * freq * (t - at)) * Math.exp(-(t - at) * 3.4) : 0)
    return (note(0, 294) + note(0.16, 349) + note(0.32, 440) + note(0.5, 587)) * 0.22
  }),
  alarm: render(0.7, t => {
    const beep = t < 0.12 || (t > 0.28 && t < 0.4)
    const env = beep ? 0.22 : 0
    return Math.sign(Math.sin(2 * Math.PI * 540 * t)) * env
  }),
}

for (const [name, samples] of Object.entries(cues)) {
  writeFileSync(join(root, `${name}.wav`), wav(samples))
}

console.log(`wrote ${Object.keys(cues).length} cues to ${root}`)
