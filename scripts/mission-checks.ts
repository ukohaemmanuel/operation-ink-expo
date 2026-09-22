import assert from 'node:assert/strict'
import { PLAYER_RADIUS } from '../src/game/balance.ts'
import { BLOCKS, floorHeight, overlaps } from '../src/game/world.ts'
import {
  createSim,
  idleInput,
  resetSim,
  step,
  type FrameInput,
  type Sim,
} from '../src/game/sim.ts'

let failed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok   ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL ${name}`)
    console.error(error)
  }
}

function go(sim: Sim, tx: number, tz: number, timeout = 8) {
  const input: FrameInput = { ...idleInput(), moveY: 1, sprint: true, reducedMotion: true }
  const frames = Math.ceil(timeout / (1 / 30))
  for (let i = 0; i < frames; i++) {
    const dx = tx - sim.x
    const dz = tz - sim.z
    if (Math.hypot(dx, dz) < 0.55) {
      sim.velX = 0
      sim.velZ = 0
      return
    }
    sim.yaw = Math.atan2(-dx, -dz)
    step(sim, input, 1 / 30)
  }
  throw new Error(`stuck going to ${tx.toFixed(2)},${tz.toFixed(2)} at ${sim.x.toFixed(2)},${sim.z.toFixed(2)} y=${sim.y.toFixed(2)}`)
}

function pump(sim: Sim, seconds: number) {
  const frames = Math.ceil(seconds / (1 / 30))
  for (let i = 0; i < frames; i++) step(sim, idleInput(), 1 / 30)
}

function press(sim: Sim, kind: 'interact' | 'fire' | 'reload') {
  const input = idleInput()
  input[kind] = true
  step(sim, input, 1 / 30)
  pump(sim, kind === 'fire' ? 0.32 : 0.04)
}

check('spawn is on open ground', () => {
  const sim = createSim({ peaceful: true })
  assert.equal(overlaps(sim.x, sim.y, sim.z, PLAYER_RADIUS, BLOCKS), false)
  assert.equal(floorHeight(sim.x, sim.z), 0)
  assert.equal(sim.objective, 'Find the detention building')
})

check('cell floor is below the landing', () => {
  assert.equal(floorHeight(17, 2.4), -3)
  assert.equal(floorHeight(17, 10), 0)
  const mid = floorHeight(17, 6.6)
  assert.ok(mid < -1 && mid > -2, `mid ramp ${mid}`)
})

check('west detention wall blocks, doorway does not', () => {
  assert.equal(overlaps(8, 0, 3.2, PLAYER_RADIUS, BLOCKS), true)
  assert.equal(overlaps(7.2, 0, 7, 0.2, BLOCKS), false)
})

check('pistol drops a guard', () => {
  const sim = createSim({ peaceful: true })
  sim.x = -9
  sim.z = 3.2
  sim.yaw = -Math.PI / 2
  sim.pitch = -0.18
  const guard = sim.guards.find(item => item.id === 'yard')!
  guard.x = -6
  guard.z = 3.2
  press(sim, 'fire')
  assert.ok(guard.health < 100 && guard.health > 0, `health ${guard.health}`)
  press(sim, 'fire')
  press(sim, 'fire')
  assert.equal(guard.state, 'dead')
  assert.equal(sim.kills, 1)
  assert.equal(sim.magazine, 9)
})

check('empty magazine reloads', () => {
  const sim = createSim({ peaceful: true })
  sim.magazine = 0
  press(sim, 'fire')
  assert.ok(sim.reloadLeft > 0)
  for (let i = 0; i < 70; i++) step(sim, idleInput(), 1 / 30)
  assert.equal(sim.magazine, 12)
  assert.equal(sim.reserve, 24)
})

check('damage can end the mission and retry restores it', () => {
  const sim = createSim({ peaceful: true })
  sim.health = 10
  const input = idleInput()
  // A nearby guard is forced to hit by stepping combat in a non-peaceful sim.
  const live = createSim()
  live.x = 0
  live.z = 0
  live.health = 20
  const guard = live.guards[0]!
  guard.x = 1.2
  guard.z = 0
  guard.state = 'combat'
  guard.see = true
  guard.cooldown = 0
  guard.memory = 5
  live.alarm = 'active'
  for (let i = 0; i < 40 && live.phase === 'active'; i++) step(live, idleInput(), 1 / 30)
  assert.equal(live.phase, 'dead')
  resetSim(live)
  assert.equal(live.phase, 'active')
  assert.equal(live.health, 100)
  assert.equal(live.hostage.status, 'captive')
  assert.equal(sim.phase, 'active')
  void input
})

check('heal, alarm, and gate stations', () => {
  const sim = createSim({ peaceful: true })
  sim.health = 100
  sim.x = -2.15
  sim.z = -7.15
  press(sim, 'interact')
  assert.match(sim.message, /full/i)
  assert.equal(sim.supplies.length, 0)
  sim.health = 40
  press(sim, 'interact')
  assert.equal(sim.health, 100)
  assert.equal(sim.supplies.length, 1)

  sim.alarm = 'active'
  sim.x = 6.55
  sim.z = -6.4
  press(sim, 'interact')
  assert.equal(sim.alarm, 'silenced')

  sim.x = 20.6
  sim.z = -4.6
  press(sim, 'interact')
  assert.equal(sim.gateOpen, true)
})

check('full rescue route', () => {
  const sim = createSim({ peaceful: true })
  const inward = [
    [-8, 2],
    [0, 4.5],
    [4, 6.9],
    [6.5, 7],
    [10.4, 7],
    [12.3, 10],
    [15.7, 10],
    [17, 7.4],
    [17, 5.6],
    [17, 4.65],
  ]
  for (const [x, z] of inward) go(sim, x!, z!)
  assert.equal(sim.detentionFound, true)
  assert.equal(sim.cellsReached, true, `y=${sim.y}`)
  assert.equal(sim.prompt, 'Unlock')
  press(sim, 'interact')
  assert.equal(sim.hostage.status, 'following')
  assert.match(sim.objective, /jeep|gate|Escort|Open|Board/)

  const outward = [
    [17, 7.5],
    [17, 10],
    [12.2, 10],
    [10.2, 7],
    [6.4, 7],
    [6.4, -0.4],
    [13.2, -4.6],
    [20.5, -4.6],
  ]
  for (const [x, z] of outward) go(sim, x!, z!)
  assert.equal(sim.prompt, 'Open gate')
  press(sim, 'interact')
  assert.equal(sim.gateOpen, true)

  go(sim, 13.7, -0.3)
  for (let i = 0; i < 150 && Math.hypot(sim.hostage.x - 16.2, sim.hostage.z + 0.3) > 3.2; i++) {
    step(sim, idleInput(), 1 / 30)
  }
  assert.ok(Math.hypot(sim.hostage.x - 16.2, sim.hostage.z + 0.3) <= 3.35, `hostage ${sim.hostage.x.toFixed(2)},${sim.hostage.z.toFixed(2)}`)
  step(sim, idleInput(), 1 / 30)
  assert.equal(sim.prompt, 'Board jeep')
  press(sim, 'interact')
  assert.equal(sim.jeepState, 'escaping')
  for (let i = 0; i < 180 && sim.phase !== 'complete'; i++) step(sim, idleInput(), 1 / 30)
  assert.equal(sim.phase, 'complete')
  assert.match(sim.objective, /complete/i)
})

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all mission checks passed')
