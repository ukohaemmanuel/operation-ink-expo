import { Renderer } from 'expo-three'
import type { ExpoWebGLRenderingContext } from 'expo-gl'
import * as THREE from 'three'
import { createFigure, poseFigure, type Figure } from './actors'
import { BLOOD, EYE_HEIGHT, HOSTAGE_BLUE, INK, PAPER } from './balance'
import type { Sim } from './sim'
import { BLOCKS, GATE_PANEL, JEEP, RAMP, STATIONS, type Block } from './world'

const paper = new THREE.MeshBasicMaterial({
  color: PAPER,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
})
const ink = new THREE.LineBasicMaterial({ color: 0x000000 })
const detail = new THREE.LineBasicMaterial({ color: 0x8a8a8a })
const black = new THREE.MeshBasicMaterial({ color: INK })
const bloodMat = new THREE.MeshBasicMaterial({ color: BLOOD })
const inkMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a })

function inkBox(w: number, h: number, d: number) {
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paper)
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), ink)
  group.add(mesh, lines)
  return group
}

function addBlock(parent: THREE.Group, block: Block) {
  const w = block.maxX - block.minX
  const h = block.maxY - block.minY
  const d = block.maxZ - block.minZ
  const group = inkBox(w, h, d)
  group.position.set(
    (block.minX + block.maxX) / 2,
    (block.minY + block.maxY) / 2,
    (block.minZ + block.maxZ) / 2,
  )
  parent.add(group)
}

function shapeGround() {
  const shape = new THREE.Shape()
  shape.moveTo(-20, -14)
  shape.lineTo(22, -14)
  shape.lineTo(22, 16)
  shape.lineTo(-20, 16)
  shape.closePath()
  const hole = new THREE.Path()
  hole.moveTo(RAMP.x0, 1.15)
  hole.lineTo(RAMP.x0, RAMP.zTop + 0.05)
  hole.lineTo(RAMP.x1, RAMP.zTop + 0.05)
  hole.lineTo(RAMP.x1, 1.15)
  hole.closePath()
  shape.holes.push(hole)
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, paper)
  mesh.position.y = -0.02
  return mesh
}

function rectFloor(x0: number, x1: number, z0: number, z1: number, y: number) {
  const shape = new THREE.Shape()
  shape.moveTo(x0, z0)
  shape.lineTo(x1, z0)
  shape.lineTo(x1, z1)
  shape.lineTo(x0, z1)
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, paper)
  mesh.position.y = y
  return mesh
}

function rampMesh() {
  const { x0, x1, zTop, zBottom, yTop, yBottom } = RAMP
  const geometry = new THREE.BufferGeometry()
  const vertices = new Float32Array([
    x0, yTop, zTop, x1, yTop, zTop, x1, yBottom, zBottom,
    x0, yTop, zTop, x1, yBottom, zBottom, x0, yBottom, zBottom,
  ])
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, paper)
  const edges = new THREE.BufferGeometry()
  edges.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    x0, yTop, zTop, x1, yTop, zTop,
    x1, yTop, zTop, x1, yBottom, zBottom,
    x1, yBottom, zBottom, x0, yBottom, zBottom,
    x0, yBottom, zBottom, x0, yTop, zTop,
  ]), 3))
  const group = new THREE.Group()
  group.add(mesh, new THREE.LineSegments(edges, ink))
  return group
}

function lineLoop(points: [number, number, number][], material = ink) {
  const data: number[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    data.push(a[0], a[1], a[2], b[0], b[1], b[2])
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data), 3))
  return new THREE.LineSegments(geometry, material)
}

function windowFrame(x: number, y: number, z: number, w: number, h: number, axis: 'x' | 'z') {
  const y0 = y - h / 2
  const y1 = y + h / 2
  if (axis === 'z') {
    return lineLoop([[x, y0, z - w / 2], [x, y0, z + w / 2], [x, y1, z + w / 2], [x, y1, z - w / 2]])
  }
  return lineLoop([[x - w / 2, y0, z], [x + w / 2, y0, z], [x + w / 2, y1, z], [x - w / 2, y1, z]])
}

function pine(x: number, z: number, scale = 1) {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, 1.05 * scale, 5), black)
  trunk.position.y = 0.52 * scale
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.62 * scale, 1.7 * scale, 5), black)
  crown.position.y = 1.7 * scale
  group.add(trunk, crown)
  group.position.set(x, 0, z)
  return group
}

function lamp(x: number, z: number) {
  const group = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.7, 5), black)
  pole.position.y = 1.35
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), black)
  head.position.y = 2.72
  group.add(pole, head)
  group.position.set(x, 0, z)
  return group
}

function cellDoor() {
  const group = new THREE.Group()
  group.position.set(14.12, -3, 4.02)
  for (let i = 0; i < 7; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 2.45, 0.045), black)
    bar.position.set(0.4 + i * 0.78, 1.22, 0)
    group.add(bar)
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.15, 0.05, 0.05), black)
  top.position.set(2.74, 2.28, 0)
  const bottom = top.clone()
  bottom.position.y = 0.28
  group.add(top, bottom)
  return group
}

function exitGate() {
  const group = new THREE.Group()
  group.position.set(22, 0, 0)
  for (let i = 0; i < 8; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 2.15, 0.045), black)
    bar.position.set(0, 1.08, -1.75 + i * 0.5)
    group.add(bar)
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 3.55), black)
  rail.position.set(0, 2.05, 0)
  const lower = rail.clone()
  lower.position.y = 0.18
  group.add(rail, lower)
  return group
}

function jeepMesh() {
  const group = new THREE.Group()
  const body = inkBox(3.7, 0.68, 1.42)
  body.position.y = 0.74
  const cab = inkBox(1.45, 0.7, 1.28)
  cab.position.set(-0.4, 1.32, 0)
  const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 8)
  for (const [x, z] of [[1.15, 0.78], [1.15, -0.78], [-1.15, 0.78], [-1.15, -0.78]] as const) {
    const mesh = new THREE.Mesh(wheel, black)
    mesh.rotation.x = Math.PI / 2
    mesh.position.set(x, 0.32, z)
    group.add(mesh)
  }
  group.add(body, cab)
  return group
}

function viewmodel() {
  const group = new THREE.Group()
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.065, 0.26), black)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.11, 0.048), black)
  grip.position.set(0, -0.08, 0.05)
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.14), black)
  barrel.position.set(0, 0.012, -0.18)
  group.add(slide, grip, barrel)
  group.position.set(0.2, -0.17, -0.46)
  return group
}

function medkit() {
  const group = new THREE.Group()
  const box = inkBox(0.36, 0.14, 0.26)
  box.position.y = 0.08
  const across = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.045), bloodMat)
  const down = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.16), bloodMat)
  across.position.y = 0.17
  down.position.y = 0.17
  group.add(box, across, down)
  const station = STATIONS.find(item => item.kind === 'supply')!
  group.position.set(station.x, 0, station.z)
  return group
}

export type WorldView = {
  render: (sim: Sim, reducedMotion: boolean, dt: number) => void
  dispose: () => void
}

export function createWorld(gl: ExpoWebGLRenderingContext): WorldView {
  const renderer = new Renderer({
    gl: gl as unknown as WebGLRenderingContext,
    pixelRatio: 1,
    width: Math.max(1, gl.drawingBufferWidth),
    height: Math.max(1, gl.drawingBufferHeight),
  })
  renderer.setClearColor(PAPER, 1)
  renderer.setSize(Math.max(1, gl.drawingBufferWidth), Math.max(1, gl.drawingBufferHeight), false)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(PAPER)
  scene.fog = new THREE.Fog(PAPER, 38, 68)

  const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 80)
  camera.rotation.order = 'YXZ'
  const gun = viewmodel()
  camera.add(gun)
  scene.add(camera)

  const staticWorld = new THREE.Group()
  for (const block of BLOCKS) {
    if (block.kind === 'cell' || block.kind === 'exit' || block.kind === 'jeep') continue
    addBlock(staticWorld, block)
  }
  staticWorld.add(shapeGround())
  staticWorld.add(rectFloor(RAMP.x0, RAMP.x1, 1.15, RAMP.zBottom + 0.05, -3.02))
  staticWorld.add(rampMesh())
  staticWorld.add(inkBox(12.1, 0.08, 9.1).translateX(2).translateY(3.56).translateZ(-7.5))
  const detentionRoof = inkBox(12.1, 0.08, 12.1)
  detentionRoof.position.set(14, 3.56, 7)
  staticWorld.add(detentionRoof)
  staticWorld.add(windowFrame(2, 1.7, -12.14, 1.4, 0.9, 'x'))
  staticWorld.add(windowFrame(-4.14, 1.7, -8.2, 1.1, 0.9, 'z'))
  staticWorld.add(windowFrame(8.14, 1.7, 4.2, 1.1, 0.9, 'z'))
  staticWorld.add(windowFrame(14, 1.7, 13.14, 1.3, 0.9, 'x'))
  staticWorld.add(lineLoop([[-20, 0.02, -14], [22, 0.02, -14], [22, 0.02, 16], [-20, 0.02, 16]], detail))
  staticWorld.add(pine(-17.2, -11.2, 1.15))
  staticWorld.add(pine(-16.4, 12.6, 0.95))
  staticWorld.add(pine(18.6, 12.8, 1.2))
  staticWorld.add(pine(12.5, -11.4, 0.85))
  staticWorld.add(lamp(-12.5, 5.5))
  staticWorld.add(lamp(5.5, 4.2))
  staticWorld.add(lamp(18.8, -8.2))
  const panel = inkBox(0.35, 1.1, 0.18)
  panel.position.set(GATE_PANEL.x, 0.7, GATE_PANEL.z)
  staticWorld.add(panel)
  const dressing = medkit()
  staticWorld.add(dressing)
  scene.add(staticWorld)

  const door = cellDoor()
  const gate = exitGate()
  const jeep = jeepMesh()
  jeep.position.set(JEEP.x, 0, JEEP.z)
  scene.add(door, gate, jeep)

  const hostage = createFigure(HOSTAGE_BLUE)
  const guards = new Map<string, Figure>()
  for (const block of ['yard', 'mess', 'annex']) {
    const figure = createFigure(INK, true)
    guards.set(block, figure)
    scene.add(figure.root)
  }
  scene.add(hostage.root)

  const impacts: THREE.Mesh[] = []
  for (let i = 0; i < 24; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), inkMat)
    mesh.visible = false
    impacts.push(mesh)
    scene.add(mesh)
  }
  const pools: THREE.Mesh[] = []
  const poolGeo = new THREE.CircleGeometry(0.34, 10)

  let width = 0
  let height = 0
  const right = new THREE.Vector3()
  const lastGuard = new Map<string, { x: number; z: number }>()

  return {
    render(sim, reducedMotion, dt) {
      const nextWidth = gl.drawingBufferWidth
      const nextHeight = gl.drawingBufferHeight
      if (nextWidth > 0 && nextHeight > 0 && (nextWidth !== width || nextHeight !== height)) {
        width = nextWidth
        height = nextHeight
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }

      const bob = reducedMotion ? 0 : Math.sin(sim.bob) * 0.035
      camera.position.set(sim.x, sim.y + EYE_HEIGHT + bob, sim.z)
      camera.rotation.y = sim.yaw
      camera.rotation.x = sim.pitch
      camera.updateMatrixWorld()
      right.set(Math.cos(sim.yaw), 0, -Math.sin(sim.yaw))
      if (!reducedMotion) camera.position.addScaledVector(right, Math.cos(sim.bob * 0.5) * 0.012)
      const kick = reducedMotion ? 0 : sim.shotFlash
      gun.position.set(0.2, -0.17 - kick * 0.02, -0.46 - kick * 0.07)
      gun.rotation.x = kick * 0.12

      const cellOpen = sim.hostage.status !== 'captive'
      const doorTarget = cellOpen ? 1.35 : 0
      door.rotation.y += (doorTarget - door.rotation.y) * (reducedMotion ? 1 : Math.min(1, dt * 4))
      const gateTarget = sim.gateOpen ? -3.45 : 0
      gate.position.z += (gateTarget - gate.position.z) * (reducedMotion ? 1 : Math.min(1, dt * 3))
      jeep.position.set(sim.jeepX, 0, sim.jeepZ)

      const dressingLeft = !sim.supplies.includes('mess-dressing')
      dressing.visible = dressingLeft

      const hostageMode = sim.hostage.status === 'captive' ? 'bound' : sim.hostage.waiting ? 'idle' : 'walk'
      hostage.root.visible = sim.hostage.status !== 'aboard'
      hostage.root.position.set(sim.hostage.x, sim.hostage.y, sim.hostage.z)
      hostage.root.rotation.y = sim.hostage.yaw
      poseFigure(hostage, sim.hostage.phase, sim.hostage.status === 'captive' ? 'bound' : hostageMode)

      for (const guard of sim.guards) {
        const figure = guards.get(guard.id)
        if (!figure) continue
        figure.root.position.set(guard.x, guard.y, guard.z)
        figure.root.rotation.y = guard.yaw
        const previous = lastGuard.get(guard.id)
        const moving = previous ? Math.hypot(guard.x - previous.x, guard.z - previous.z) > 0.004 : false
        lastGuard.set(guard.id, { x: guard.x, z: guard.z })
        const pose = guard.state === 'dead' ? 'dead' : moving ? 'walk' : 'idle'
        poseFigure(figure, guard.phase, pose, guard.down)
      }

      impacts.forEach((mesh, index) => {
        const impact = sim.impacts[index]
        if (!impact) {
          mesh.visible = false
          return
        }
        mesh.visible = true
        mesh.position.set(impact.x, impact.y, impact.z)
        mesh.material = impact.kind === 'blood' ? bloodMat : inkMat
        const scale = 0.4 + impact.life * 2.2
        mesh.scale.setScalar(scale)
      })

      while (pools.length < sim.blood.length) {
        const mesh = new THREE.Mesh(poolGeo, bloodMat)
        mesh.rotation.x = -Math.PI / 2
        scene.add(mesh)
        pools.push(mesh)
      }
      pools.forEach((mesh, index) => {
        const pool = sim.blood[index]
        if (!pool) {
          mesh.visible = false
          return
        }
        mesh.visible = true
        mesh.position.set(pool.x, pool.y, pool.z)
      })

      renderer.render(scene, camera)
    },
    dispose() {
      renderer.dispose()
    },
  }
}
