/**
 * Small paper compound for the mobile mission.
 * +X is east, −Z is north, Y is up. One unit is one metre.
 * The detention annex has a ground-floor landing and a ramp down to cell 01.
 */

export type BlockKind = 'cell' | 'exit' | 'jeep'

export type Block = {
  id: string
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  kind?: BlockKind
}

export type StationKind = 'hostage' | 'gate' | 'jeep' | 'supply' | 'alarm'

export type Station = {
  id: string
  kind: StationKind
  x: number
  y: number
  z: number
  radius: number
}

export type GuardSpec = {
  id: string
  x: number
  z: number
  waypoints: [number, number][]
}

const T = 0.24
const H = 3.5
const BH = 6.5
const BY = -3

function box(
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  y = 0,
  kind?: BlockKind,
): Block {
  return {
    id,
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y,
    maxY: y + h,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    kind,
  }
}

export const SPAWN = { x: -15, z: 1, yaw: -Math.PI / 2 }
export const HOSTAGE_HOME = { x: 17, z: 2.35 }
export const JEEP = { x: 16.2, z: -0.3 }
export const GATE_PANEL = { x: 20.6, z: -4.6 }
export const DETENTION_DOOR = { x: 7.15, z: 7 }

/** East-room floor: landing at y=0, ramp down to the cell at y=−3. */
export const RAMP = { x0: 14.15, x1: 19.85, zTop: 9.2, zBottom: 4, yTop: 0, yBottom: -3 }
export const CELL = { x0: 14.15, x1: 19.85, z0: 1.15, z1: 4 }

export const BLOCKS: Block[] = [
  box('fence-n', 1, -14, 42, T, 2.5),
  box('fence-s', 1, 16, 42, T, 2.5),
  box('fence-w', -20, 1, T, 30, 2.5),
  box('fence-e-n', 22, -8, T, 12, 2.5),
  box('fence-e-s', 22, 9, T, 14, 2.5),
  box('exit-gate', 22, 0, T, 4, 2.3, 0, 'exit'),

  box('mess-n', 2, -12, 12, T, H),
  box('mess-s-w', -1.45, -3, 5.1, T, H),
  box('mess-s-e', 5.45, -3, 5.1, T, H),
  box('mess-s-lintel', 2, -3, 1.8, T, 1, 2.5),
  box('mess-w', -4, -7.5, T, 9, H),
  box('mess-e', 8, -7.5, T, 9, H),

  box('det-w-n', 8, 3.55, T, 5.1, H),
  box('det-w-s', 8, 10.45, T, 5.1, H),
  box('det-w-lintel', 8, 7, T, 1.8, 1, 2.5),
  box('det-n-entry', 11, 1, 6, T, H),
  box('det-n-east', 17, 1, 6, T, BH, BY),
  box('det-s-entry', 11, 13, 6, T, H),
  box('det-s-east', 17, 13, 6, T, BH, BY),
  box('det-e', 20, 7, T, 12, BH, BY),
  box('div-n', 14, 5.1, T, 8.2, BH, BY),
  box('div-s', 14, 11.9, T, 2.2, BH, BY),
  box('div-lintel', 14, 10, T, 1.6, 1, 2.5),
  box('div-sill', 14, 10, T, 1.6, 3, BY),
  box('cell-door', 17, 4.02, 6.1, 0.2, 2.55, BY, 'cell'),

  box('crate-a', -6, 8.4, 1.2, 1.2, 1.05),
  box('crate-b', 2.2, -1.35, 1.25, 1, 0.95),
  box('crate-c', -11.2, -5.2, 1.35, 1.45, 1.1),
  box('table', -1.2, -8.1, 1.8, 0.8, 0.78),
  box('crate-d', 11.4, -6.2, 1.15, 1.15, 1),
  box('jeep', JEEP.x, JEEP.z, 4.2, 1.6, 1.35, 0, 'jeep'),
]

export const STATIONS: Station[] = [
  { id: 'cell-01', kind: 'hostage', x: 17, y: -3, z: 3.45, radius: 2.2 },
  { id: 'exit-gate', kind: 'gate', x: GATE_PANEL.x, y: 0, z: GATE_PANEL.z, radius: 1.75 },
  { id: 'jeep', kind: 'jeep', x: JEEP.x, y: 0, z: JEEP.z, radius: 2.75 },
  { id: 'mess-dressing', kind: 'supply', x: -2.15, y: 0, z: -7.15, radius: 1.45 },
  { id: 'mess-alarm', kind: 'alarm', x: 6.55, y: 0, z: -6.4, radius: 1.45 },
]

export const GUARDS: GuardSpec[] = [
  {
    id: 'yard',
    x: -6,
    z: 3.2,
    waypoints: [[-6, 3.2], [2.6, 6.4], [2.4, 0.4], [-8.6, -0.4]],
  },
  {
    id: 'mess',
    x: 0.4,
    z: -1.5,
    waypoints: [[0.4, -1.5], [5.4, 2.4], [-2.6, 3.6]],
  },
  {
    id: 'annex',
    x: 4.3,
    z: 8.4,
    waypoints: [[4.3, 8.4], [6.3, 11.4], [3.5, 5.4]],
  },
]

export function floorHeight(x: number, z: number) {
  const inEast = x >= RAMP.x0 && x <= RAMP.x1 && z >= 1.15 && z <= 12.85
  if (!inEast) return 0
  if (z >= RAMP.zTop) return 0
  if (z <= RAMP.zBottom) return RAMP.yBottom
  const t = (RAMP.zTop - z) / (RAMP.zTop - RAMP.zBottom)
  return RAMP.yBottom * t
}

export function activeBlocks(flags: { gateOpen: boolean; cellOpen: boolean; jeepSolid: boolean }) {
  return BLOCKS.filter(block => {
    if (block.kind === 'exit' && flags.gateOpen) return false
    if (block.kind === 'cell' && flags.cellOpen) return false
    if (block.kind === 'jeep' && !flags.jeepSolid) return false
    return true
  })
}

/** True when a standing capsule at (x, y, z) overlaps a solid block. */
export function overlaps(x: number, y: number, z: number, radius: number, blocks: Block[]) {
  const feet = y + 0.05
  const head = y + 1.72
  for (const block of blocks) {
    if (block.maxY < feet || block.minY > head) continue
    if (x > block.minX - radius && x < block.maxX + radius && z > block.minZ - radius && z < block.maxZ + radius) {
      return true
    }
  }
  return false
}

export function slide(
  x: number,
  z: number,
  nx: number,
  nz: number,
  y: number,
  radius: number,
  blocks: Block[],
) {
  if (!overlaps(nx, y, nz, radius, blocks)) return { x: nx, z: nz }
  if (!overlaps(nx, y, z, radius, blocks)) return { x: nx, z }
  if (!overlaps(x, y, nz, radius, blocks)) return { x, z: nz }
  return { x, z }
}

export type RayHit = { t: number }

export function rayBlock(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  block: Block,
  maxT: number,
) {
  let tmin = 0
  let tmax = maxT
  const origin = [ox, oy, oz]
  const dir = [dx, dy, dz]
  const min = [block.minX, block.minY, block.minZ]
  const max = [block.maxX, block.maxY, block.maxZ]
  for (let i = 0; i < 3; i++) {
    const direction = dir[i] ?? 0
    const start = origin[i] ?? 0
    const lo = min[i] ?? 0
    const hi = max[i] ?? 0
    if (Math.abs(direction) < 1e-8) {
      if (start < lo || start > hi) return null
      continue
    }
    let t1 = (lo - start) / direction
    let t2 = (hi - start) / direction
    if (t1 > t2) {
      const swap = t1
      t1 = t2
      t2 = swap
    }
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }
  if (tmax < 0) return null
  return tmin >= 0 ? tmin : tmax
}

/** Vertical cylinder along Y. Returns the entry distance, or null on a miss. */
export function rayCylinder(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cz: number,
  radius: number,
  y0: number,
  y1: number,
) {
  const lx = ox - cx
  const lz = oz - cz
  const a = dx * dx + dz * dz
  if (a < 1e-8) return null
  const b = 2 * (lx * dx + lz * dz)
  const c = lx * lx + lz * lz - radius * radius
  const disc = b * b - 4 * a * c
  if (disc < 0) return null
  const root = Math.sqrt(disc)
  let t = (-b - root) / (2 * a)
  if (t < 0) t = (-b + root) / (2 * a)
  if (t < 0) return null
  const y = oy + dy * t
  if (y < y0 || y > y1) return null
  return t
}
