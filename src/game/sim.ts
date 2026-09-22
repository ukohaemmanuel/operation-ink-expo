import {
  EYE_HEIGHT,
  GUARD_COMBAT,
  GUARD_HEALTH,
  GUARD_SPEED,
  HEAD_MULTIPLIER,
  HOSTAGE_RADIUS,
  HOSTAGE_SPEED,
  LOOK_SENS,
  PISTOL,
  PITCH_LIMIT,
  PLAYER_HEALTH,
  PLAYER_RADIUS,
  SPRINT_SPEED,
  WALK_SPEED,
} from './balance'
import {
  DETENTION_DOOR,
  GATE_PANEL,
  GUARDS,
  HOSTAGE_HOME,
  JEEP,
  SPAWN,
  STATIONS,
  activeBlocks,
  floorHeight,
  overlaps,
  rayBlock,
  rayCylinder,
  slide,
  type Block,
  type Station,
} from './world'

export type Phase = 'active' | 'dead' | 'complete'
export type Alarm = 'inactive' | 'active' | 'silenced'
export type HostageStatus = 'captive' | 'following' | 'aboard'

export type FrameInput = {
  moveX: number
  moveY: number
  lookDx: number
  lookDy: number
  fire: boolean
  interact: boolean
  reload: boolean
  sprint: boolean
  reducedMotion: boolean
}

export type GuardRuntime = {
  id: string
  x: number
  y: number
  z: number
  yaw: number
  health: number
  waypoint: number
  state: 'patrol' | 'combat' | 'dead'
  cooldown: number
  memory: number
  phase: number
  down: number
  see: boolean
}

export type Impact = {
  id: number
  x: number
  y: number
  z: number
  life: number
  kind: 'ink' | 'blood'
}

export type Sim = {
  peaceful: boolean
  phase: Phase
  time: number
  health: number
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  velX: number
  velZ: number
  bob: number
  magazine: number
  reserve: number
  reloadLeft: number
  fireCooldown: number
  fireHeld: boolean
  detentionFound: boolean
  cellsReached: boolean
  gateOpen: boolean
  alarm: Alarm
  supplies: string[]
  hostage: {
    x: number
    y: number
    z: number
    yaw: number
    status: HostageStatus
    stuck: number
    phase: number
    waiting: boolean
  }
  guards: GuardRuntime[]
  jeepX: number
  jeepZ: number
  jeepState: 'waiting' | 'escaping' | 'escaped'
  lastContact: { x: number; z: number } | null
  message: string
  messageUntil: number
  prompt: string | null
  promptKind: Station['kind'] | null
  objective: string
  guide: { x: number; z: number } | null
  guideDistance: number
  guideAngle: number
  hitFlash: number
  shotFlash: number
  marker: number
  kills: number
  impacts: Impact[]
  blood: { x: number; y: number; z: number }[]
  events: string[]
  nextImpact: number
}

export function idleInput(): FrameInput {
  return {
    moveX: 0,
    moveY: 0,
    lookDx: 0,
    lookDy: 0,
    fire: false,
    interact: false,
    reload: false,
    sprint: false,
    reducedMotion: false,
  }
}

export function createSim(options?: { peaceful?: boolean }): Sim {
  const sim: Sim = {
    peaceful: options?.peaceful ?? false,
    phase: 'active',
    time: 0,
    health: PLAYER_HEALTH,
    x: SPAWN.x,
    y: 0,
    z: SPAWN.z,
    yaw: SPAWN.yaw,
    pitch: 0,
    velX: 0,
    velZ: 0,
    bob: 0,
    magazine: PISTOL.capacity,
    reserve: PISTOL.reserve,
    reloadLeft: 0,
    fireCooldown: 0,
    fireHeld: false,
    detentionFound: false,
    cellsReached: false,
    gateOpen: false,
    alarm: 'inactive',
    supplies: [],
    hostage: {
      x: HOSTAGE_HOME.x,
      y: floorHeight(HOSTAGE_HOME.x, HOSTAGE_HOME.z),
      z: HOSTAGE_HOME.z,
      yaw: 0,
      status: 'captive',
      stuck: 0,
      phase: 0,
      waiting: false,
    },
    guards: GUARDS.map(spec => ({
      id: spec.id,
      x: spec.x,
      y: 0,
      z: spec.z,
      yaw: 0,
      health: GUARD_HEALTH,
      waypoint: 0,
      state: 'patrol',
      cooldown: 0.4,
      memory: 0,
      phase: 0,
      down: 0,
      see: false,
    })),
    jeepX: JEEP.x,
    jeepZ: JEEP.z,
    jeepState: 'waiting',
    lastContact: null,
    message: '',
    messageUntil: 0,
    prompt: null,
    promptKind: null,
    objective: '',
    guide: null,
    guideDistance: 0,
    guideAngle: 0,
    hitFlash: 0,
    shotFlash: 0,
    marker: 0,
    kills: 0,
    impacts: [],
    blood: [],
    events: [],
    nextImpact: 1,
  }
  refresh(sim)
  return sim
}

export function resetSim(sim: Sim) {
  const fresh = createSim({ peaceful: sim.peaceful })
  Object.assign(sim, fresh)
}

export function lookVector(yaw: number, pitch: number) {
  const cp = Math.cos(pitch)
  return {
    x: -Math.sin(yaw) * cp,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cp,
  }
}

export function yawToward(dx: number, dz: number) {
  return Math.atan2(-dx, -dz)
}

function wrapAngle(angle: number) {
  let value = angle
  while (value > Math.PI) value -= Math.PI * 2
  while (value < -Math.PI) value += Math.PI * 2
  return value
}

function dampAngle(current: number, target: number, dt: number, speed: number) {
  const delta = wrapAngle(target - current)
  const step = Math.max(-speed * dt, Math.min(speed * dt, delta))
  return current + step
}

function say(sim: Sim, message: string) {
  sim.message = message
  sim.messageUntil = sim.time + 4.8
}

function blocksFor(sim: Sim) {
  return activeBlocks({
    gateOpen: sim.gateOpen,
    cellOpen: sim.hostage.status !== 'captive',
    jeepSolid: sim.jeepState === 'waiting',
  })
}

function moveBody(
  x: number,
  y: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  blocks: Block[],
) {
  const dist = Math.hypot(dx, dz)
  const steps = Math.max(1, Math.ceil(dist / 0.18))
  let cx = x
  let cy = y
  let cz = z
  for (let i = 0; i < steps; i++) {
    const nx = cx + dx / steps
    const nz = cz + dz / steps
    const slid = slide(cx, cz, nx, nz, cy, radius, blocks)
    const height = floorHeight(slid.x, slid.z)
    if (height - cy > 0.42) break
    cx = slid.x
    cz = slid.z
    cy = height
  }
  return { x: cx, y: cy, z: cz }
}

function nearestWall(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, range: number, blocks: Block[]) {
  let best = range
  for (const block of blocks) {
    const t = rayBlock(ox, oy, oz, dx, dy, dz, block, best)
    if (t !== null && t < best) best = t
  }
  return best
}

function hostageNearJeep(sim: Sim) {
  return Math.hypot(sim.hostage.x - JEEP.x, sim.hostage.z - JEEP.z) < 3.35 && sim.hostage.status === 'following'
}

function stationLabel(sim: Sim, station: Station) {
  if (sim.phase !== 'active' || sim.jeepState !== 'waiting') return null
  switch (station.kind) {
    case 'hostage':
      return sim.hostage.status === 'captive' ? 'Unlock' : null
    case 'gate':
      return sim.gateOpen ? null : 'Open gate'
    case 'jeep':
      if (sim.hostage.status !== 'following') return 'Hostage needed'
      if (!hostageNearJeep(sim)) return 'Hostage needed'
      if (!sim.gateOpen) return 'Open gate first'
      return 'Board jeep'
    case 'supply':
      return sim.supplies.includes(station.id) ? null : 'Heal'
    case 'alarm':
      return sim.alarm === 'active' ? 'Silence alarm' : null
    default:
      return null
  }
}

function updatePrompt(sim: Sim) {
  let best: Station | null = null
  let bestDist = Infinity
  for (const station of STATIONS) {
    const label = stationLabel(sim, station)
    if (!label) continue
    const dist = Math.hypot(sim.x - station.x, sim.z - station.z)
    const vertical = Math.abs(sim.y - station.y)
    if (dist <= station.radius && vertical < 2.4 && dist < bestDist) {
      best = station
      bestDist = dist
    }
  }
  sim.prompt = best ? stationLabel(sim, best) : null
  sim.promptKind = best?.kind ?? null
}

function useStation(sim: Sim) {
  let best: Station | null = null
  let bestDist = Infinity
  for (const station of STATIONS) {
    if (!stationLabel(sim, station)) continue
    const dist = Math.hypot(sim.x - station.x, sim.z - station.z)
    if (dist <= station.radius && Math.abs(sim.y - station.y) < 2.4 && dist < bestDist) {
      best = station
      bestDist = dist
    }
  }
  if (!best) return
  switch (best.kind) {
    case 'hostage':
      sim.hostage.status = 'following'
      sim.detentionFound = true
      sim.cellsReached = true
      say(sim, 'Cell unlocked. Lead him up to the jeep.')
      sim.events.push('unlock')
      break
    case 'gate':
      sim.gateOpen = true
      say(sim, 'Exit gate opening. Bring the hostage to the jeep.')
      sim.events.push('interact')
      break
    case 'jeep':
      if (!hostageNearJeep(sim)) {
        say(sim, 'The hostage must be at the jeep before you board.')
        return
      }
      if (!sim.gateOpen) {
        say(sim, 'Open the exit gate at the panel first.')
        return
      }
      sim.hostage.status = 'aboard'
      sim.jeepState = 'escaping'
      say(sim, 'Hostage aboard. Escaping through the east gate.')
      sim.events.push('interact')
      break
    case 'supply':
      if (sim.health >= PLAYER_HEALTH) {
        say(sim, 'Health is full. Leave the dressing for later.')
        return
      }
      sim.supplies.push(best.id)
      sim.health = PLAYER_HEALTH
      say(sim, 'Field dressing used. Health restored.')
      sim.events.push('interact')
      break
    case 'alarm':
      sim.alarm = 'silenced'
      sim.lastContact = null
      for (const guard of sim.guards) {
        if (guard.state === 'combat') guard.state = 'patrol'
        guard.see = false
      }
      say(sim, 'Alarm silenced. Guards will return to their posts.')
      sim.events.push('interact')
      break
    default:
      break
  }
}

function guideFor(sim: Sim) {
  if (sim.phase !== 'active') return null
  if (sim.jeepState === 'escaping') return { x: sim.jeepX, z: sim.jeepZ }
  if (sim.hostage.status === 'captive') {
    if (!sim.detentionFound) return DETENTION_DOOR
    if (!sim.cellsReached) return { x: 16.6, z: 10 }
    return { x: 17, z: 4.6 }
  }
  if (sim.hostage.status === 'following') {
    const near = hostageNearJeep(sim)
    if (!near) return JEEP
    if (!sim.gateOpen) return GATE_PANEL
    return JEEP
  }
  return JEEP
}

function objectiveFor(sim: Sim) {
  if (sim.phase === 'dead') return 'Rescue interrupted. Retry the insertion.'
  if (sim.phase === 'complete') return 'Hostage extracted. Mission complete.'
  if (sim.jeepState === 'escaping') return 'Escape the compound'
  if (sim.hostage.status === 'captive') {
    if (!sim.detentionFound) return 'Find the detention building'
    if (!sim.cellsReached) return 'Reach the underground cell'
    return 'Release the hostage in cell 01'
  }
  if (sim.hostage.status === 'following') {
    if (!hostageNearJeep(sim)) return 'Escort the hostage to the jeep'
    if (!sim.gateOpen) return 'Open the exit gate'
    return 'Board the jeep and escape'
  }
  return 'Escape the compound'
}

function refresh(sim: Sim) {
  if (sim.messageUntil < sim.time) sim.message = ''
  sim.objective = objectiveFor(sim)
  sim.guide = sim.phase === 'active' ? guideFor(sim) : null
  if (sim.guide) {
    sim.guideDistance = Math.hypot(sim.guide.x - sim.x, sim.guide.z - sim.z)
    const target = yawToward(sim.guide.x - sim.x, sim.guide.z - sim.z)
    sim.guideAngle = wrapAngle(target - sim.yaw)
  } else {
    sim.guideDistance = 0
    sim.guideAngle = 0
  }
  if (sim.phase === 'active' && sim.jeepState === 'waiting') updatePrompt(sim)
  else {
    sim.prompt = null
    sim.promptKind = null
  }
}

function markDiscovery(sim: Sim) {
  if (sim.x > 8.25 && sim.x < 19.8 && sim.z > 1.2 && sim.z < 12.8) sim.detentionFound = true
  if (sim.y < -1.15) sim.cellsReached = true
}

function spawnImpact(sim: Sim, x: number, y: number, z: number, kind: Impact['kind']) {
  sim.impacts.push({ id: sim.nextImpact++, x, y, z, life: kind === 'blood' ? 0.45 : 0.28, kind })
  if (sim.impacts.length > 24) sim.impacts.splice(0, sim.impacts.length - 24)
}

function damagePlayer(sim: Sim, amount: number) {
  if (sim.phase !== 'active' || amount <= 0 || sim.jeepState === 'escaping') return
  sim.health = Math.max(0, sim.health - amount)
  sim.hitFlash = 1
  if (sim.health <= 0) {
    sim.health = 0
    sim.phase = 'dead'
    sim.events.push('death')
    say(sim, 'Rescue interrupted. Retry the insertion.')
  } else {
    sim.events.push('hurt')
  }
}

function startReload(sim: Sim) {
  if (sim.reloadLeft > 0 || sim.magazine >= PISTOL.capacity || sim.reserve <= 0) return
  sim.reloadLeft = PISTOL.reload
  sim.events.push('reload')
}

function firePistol(sim: Sim, blocks: Block[]) {
  if (sim.reloadLeft > 0) return
  if (sim.magazine <= 0) {
    startReload(sim)
    return
  }
  if (sim.fireCooldown > 0) return
  sim.magazine -= 1
  sim.fireCooldown = PISTOL.interval
  sim.shotFlash = 1
  sim.events.push('shot')
  const originY = sim.y + EYE_HEIGHT
  const dir = lookVector(sim.yaw, sim.pitch)
  const wallT = nearestWall(sim.x, originY, sim.z, dir.x, dir.y, dir.z, PISTOL.range, blocks)

  const hostageT = rayCylinder(
    sim.x, originY, sim.z, dir.x, dir.y, dir.z,
    sim.hostage.x, sim.hostage.z, 0.34,
    sim.hostage.y, sim.hostage.y + 1.7,
  )
  if (hostageT !== null && hostageT < wallT && sim.hostage.status !== 'aboard') {
    say(sim, 'Hold fire. That is the hostage.')
    spawnImpact(sim, sim.x + dir.x * hostageT, originY + dir.y * hostageT, sim.z + dir.z * hostageT, 'ink')
    return
  }

  let hit: GuardRuntime | null = null
  let hitT = wallT
  let hitY = originY
  for (const guard of sim.guards) {
    if (guard.health <= 0) continue
    const t = rayCylinder(
      sim.x, originY, sim.z, dir.x, dir.y, dir.z,
      guard.x, guard.z, 0.36, guard.y, guard.y + 1.75,
    )
    if (t !== null && t < hitT) {
      hit = guard
      hitT = t
      hitY = originY + dir.y * t
    }
  }
  const px = sim.x + dir.x * hitT
  const py = originY + dir.y * hitT
  const pz = sim.z + dir.z * hitT
  if (hit) {
    const head = hitY > hit.y + 1.45
    const damage = PISTOL.damage * (head ? HEAD_MULTIPLIER : 1)
    hit.health -= damage
    hit.state = 'combat'
    hit.memory = GUARD_COMBAT.memory
    sim.lastContact = { x: sim.x, z: sim.z }
    if (sim.alarm === 'inactive') {
      sim.alarm = 'active'
      sim.events.push('alarm')
    }
    spawnImpact(sim, px, py, pz, 'blood')
    sim.marker = 1
    sim.events.push('hit')
    if (hit.health <= 0) {
      hit.health = 0
      hit.state = 'dead'
      hit.see = false
      sim.kills += 1
      if (sim.blood.length < 8) sim.blood.push({ x: hit.x, y: hit.y + 0.04, z: hit.z })
    }
  } else if (hitT < PISTOL.range - 0.05) {
    spawnImpact(sim, px, py, pz, 'ink')
  }
}

function guardSees(sim: Sim, guard: GuardRuntime, blocks: Block[]) {
  const dx = sim.x - guard.x
  const dz = sim.z - guard.z
  const dist = Math.hypot(dx, dz)
  const range = sim.alarm === 'active' ? GUARD_COMBAT.alarmRange : GUARD_COMBAT.range
  if (dist > range) return false
  const facing = yawToward(dx, dz)
  if (Math.abs(wrapAngle(facing - guard.yaw)) > GUARD_COMBAT.sightAngle) return false
  const eyeY = guard.y + 1.5
  const targetY = sim.y + EYE_HEIGHT
  const dy = targetY - eyeY
  const len = Math.hypot(dx, dy, dz) || 1
  const wall = nearestWall(guard.x, eyeY, guard.z, dx / len, dy / len, dz / len, dist, blocks)
  return wall >= dist - 0.35
}

function updateGuards(sim: Sim, dt: number, blocks: Block[]) {
  for (const guard of sim.guards) {
    guard.cooldown = Math.max(0, guard.cooldown - dt)
    if (guard.state === 'dead') {
      guard.down = Math.min(1, guard.down + dt * 2.2)
      continue
    }
    const spec = GUARDS.find(item => item.id === guard.id)
    const sees = sim.peaceful ? false : guardSees(sim, guard, blocks)
    guard.see = sees
    if (sees) {
      guard.state = 'combat'
      guard.memory = GUARD_COMBAT.memory
      sim.lastContact = { x: sim.x, z: sim.z }
      if (sim.alarm === 'inactive') {
        sim.alarm = 'active'
        sim.events.push('alarm')
      }
    } else if (guard.state === 'combat') {
      guard.memory -= dt
      if (guard.memory <= 0) guard.state = 'patrol'
    }

    let tx = guard.x
    let tz = guard.z
    let hurry = false
    if (guard.state === 'combat' && sim.lastContact) {
      const dist = Math.hypot(sim.x - guard.x, sim.z - guard.z)
      if (dist > 11) {
        tx = sim.x
        tz = sim.z
        hurry = true
      }
    } else if (sim.alarm === 'active' && sim.lastContact && !sim.peaceful) {
      tx = sim.lastContact.x
      tz = sim.lastContact.z
      hurry = true
      if (Math.hypot(tx - guard.x, tz - guard.z) < 1.2) guard.state = 'patrol'
    } else if (spec) {
      const point = spec.waypoints[guard.waypoint % spec.waypoints.length] ?? [guard.x, guard.z]
      tx = point[0]
      tz = point[1]
      if (Math.hypot(tx - guard.x, tz - guard.z) < 0.45) guard.waypoint += 1
    }

    const dx = tx - guard.x
    const dz = tz - guard.z
    const dist = Math.hypot(dx, dz)
    const moving = dist > 0.2 && !(guard.state === 'combat' && guard.see && dist < 11)
    if (moving && dist > 0.05) {
      const speed = (hurry ? GUARD_SPEED * 1.65 : GUARD_SPEED) * dt
      const step = Math.min(dist, speed)
      const moved = moveBody(guard.x, guard.y, guard.z, (dx / dist) * step, (dz / dist) * step, 0.28, blocks)
      const travelled = Math.hypot(moved.x - guard.x, moved.z - guard.z)
      guard.phase += travelled * 7
      guard.x = moved.x
      guard.y = moved.y
      guard.z = moved.z
      guard.yaw = dampAngle(guard.yaw, yawToward(dx, dz), dt, 6)
    } else if (guard.state === 'combat') {
      guard.yaw = dampAngle(guard.yaw, yawToward(sim.x - guard.x, sim.z - guard.z), dt, 7)
    }

    if (guard.see && guard.cooldown <= 0 && sim.phase === 'active') {
      const eyeY = guard.y + 1.48
      const aimYaw = yawToward(sim.x - guard.x, sim.z - guard.z) + (Math.random() - 0.5) * GUARD_COMBAT.spread
      const flat = Math.hypot(sim.x - guard.x, sim.z - guard.z)
      const aimPitch = Math.atan2(sim.y + 1.2 - eyeY, flat) + (Math.random() - 0.5) * GUARD_COMBAT.spread
      const dir = lookVector(aimYaw, aimPitch)
      const wall = nearestWall(guard.x, eyeY, guard.z, dir.x, dir.y, dir.z, 40, blocks)
      const playerT = rayCylinder(
        guard.x, eyeY, guard.z, dir.x, dir.y, dir.z,
        sim.x, sim.z, 0.42, sim.y, sim.y + 1.75,
      )
      guard.cooldown = GUARD_COMBAT.interval
      sim.events.push('enemy-shot')
      if (playerT !== null && playerT < wall) damagePlayer(sim, GUARD_COMBAT.damage)
      else if (wall < 40) spawnImpact(sim, guard.x + dir.x * wall, eyeY + dir.y * wall, guard.z + dir.z * wall, 'ink')
    }
  }
}

function updateHostage(sim: Sim, dt: number, blocks: Block[]) {
  const hostage = sim.hostage
  if (hostage.status === 'captive') {
    hostage.y = floorHeight(hostage.x, hostage.z)
    return
  }
  if (hostage.status === 'aboard') {
    hostage.x = sim.jeepX
    hostage.z = sim.jeepZ + 0.15
    hostage.y = 0.85
    return
  }
  const forward = lookVector(sim.yaw, 0)
  const tx = sim.x - forward.x * 1.45
  const tz = sim.z - forward.z * 1.45
  const playerDist = Math.hypot(sim.x - hostage.x, sim.z - hostage.z)
  hostage.waiting = playerDist > 11
  if (hostage.waiting) {
    if (sim.message === '') say(sim, 'The hostage is waiting. Go back for him.')
    return
  }
  const dx = tx - hostage.x
  const dz = tz - hostage.z
  const dist = Math.hypot(dx, dz)
  if (dist > 0.4) {
    const step = Math.min(dist, HOSTAGE_SPEED * dt)
    const beforeX = hostage.x
    const beforeZ = hostage.z
    const moved = moveBody(hostage.x, hostage.y, hostage.z, (dx / dist) * step, (dz / dist) * step, HOSTAGE_RADIUS, blocks)
    const travelled = Math.hypot(moved.x - beforeX, moved.z - beforeZ)
    hostage.x = moved.x
    hostage.y = moved.y
    hostage.z = moved.z
    hostage.phase += travelled * 8
    hostage.yaw = dampAngle(hostage.yaw, yawToward(dx, dz), dt, 8)
    hostage.stuck = travelled < step * 0.35 ? hostage.stuck + dt : 0
    if (hostage.stuck > 1.15 && playerDist < 8) {
      const solids = blocks
      const candidates = [
        { x: tx, z: tz },
        { x: sim.x - forward.z * 0.8, z: sim.z + forward.x * 0.8 },
        { x: sim.x + forward.z * 0.8, z: sim.z - forward.x * 0.8 },
      ]
      for (const point of candidates) {
        const y = floorHeight(point.x, point.z)
        if (!overlaps(point.x, y, point.z, HOSTAGE_RADIUS, solids)) {
          hostage.x = point.x
          hostage.z = point.z
          hostage.y = y
          hostage.stuck = 0
          break
        }
      }
    }
  }
}

function advanceEscape(sim: Sim, dt: number) {
  sim.jeepX += 3.6 * dt
  if (!sim.hostage.waiting) sim.hostage.x = sim.jeepX
  if (sim.jeepX > 25) {
    sim.jeepState = 'escaped'
    sim.phase = 'complete'
    say(sim, 'Hostage extracted. Mission complete.')
    sim.events.push('complete')
  }
}

export function step(sim: Sim, input: FrameInput, dt: number) {
  const frame = Math.max(0, Math.min(0.05, dt))
  sim.time += frame
  sim.hitFlash = Math.max(0, sim.hitFlash - frame * 1.7)
  sim.shotFlash = Math.max(0, sim.shotFlash - frame * 7)
  sim.marker = Math.max(0, sim.marker - frame * 4)
  for (const impact of sim.impacts) impact.life -= frame
  sim.impacts = sim.impacts.filter(impact => impact.life > 0)

  if (sim.phase !== 'active') {
    refresh(sim)
    return
  }
  if (sim.jeepState === 'escaping') {
    if (!input.reducedMotion) {
      sim.yaw = dampAngle(sim.yaw, yawToward(sim.jeepX - sim.x, sim.jeepZ - sim.z), frame, 2.4)
    }
    advanceEscape(sim, frame)
    refresh(sim)
    return
  }

  const lookDx = Math.max(-90, Math.min(90, input.lookDx))
  const lookDy = Math.max(-90, Math.min(90, input.lookDy))
  sim.yaw -= lookDx * LOOK_SENS
  sim.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, sim.pitch - lookDy * LOOK_SENS))

  const forward = lookVector(sim.yaw, 0)
  const rightX = Math.cos(sim.yaw)
  const rightZ = -Math.sin(sim.yaw)
  const wishX = forward.x * input.moveY + rightX * input.moveX
  const wishZ = forward.z * input.moveY + rightZ * input.moveX
  const wishLen = Math.hypot(wishX, wishZ)
  const nx = wishLen > 1 ? wishX / wishLen : wishX
  const nz = wishLen > 1 ? wishZ / wishLen : wishZ
  const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED
  const accel = 1 - Math.exp(-16 * frame)
  sim.velX += (nx * speed - sim.velX) * accel
  sim.velZ += (nz * speed - sim.velZ) * accel
  const blocks = blocksFor(sim)
  const moved = moveBody(sim.x, sim.y, sim.z, sim.velX * frame, sim.velZ * frame, PLAYER_RADIUS, blocks)
  if (frame > 0) {
    sim.velX = (moved.x - sim.x) / frame
    sim.velZ = (moved.z - sim.z) / frame
  }
  const travelled = Math.hypot(moved.x - sim.x, moved.z - sim.z)
  sim.x = moved.x
  sim.y = moved.y
  sim.z = moved.z
  if (!input.reducedMotion && travelled > 0.04) {
    const stride = input.sprint ? 0.34 : 0.46
    const before = sim.bob
    sim.bob += travelled * 2.1
    if (Math.floor(sim.bob / stride) !== Math.floor(before / stride)) sim.events.push('step')
  }
  markDiscovery(sim)

  sim.fireCooldown = Math.max(0, sim.fireCooldown - frame)
  if (sim.reloadLeft > 0) {
    sim.reloadLeft = Math.max(0, sim.reloadLeft - frame)
    if (sim.reloadLeft === 0) {
      const need = PISTOL.capacity - sim.magazine
      const take = Math.min(need, sim.reserve)
      sim.magazine += take
      sim.reserve -= take
    }
  }
  if (input.reload) startReload(sim)
  if (input.fire && !sim.fireHeld) firePistol(sim, blocks)
  sim.fireHeld = input.fire
  if (input.interact) useStation(sim)

  if (sim.phase === 'active') {
    updateHostage(sim, frame, blocksFor(sim))
    updateGuards(sim, frame, blocksFor(sim))
  }
  refresh(sim)
}
