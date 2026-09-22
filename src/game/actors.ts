import * as THREE from 'three'

export type Figure = {
  root: THREE.Group
  fall: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
  leftArm: THREE.Group
  rightArm: THREE.Group
}

function limb(length: number, radius: number, material: THREE.Material) {
  const pivot = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.86, length, 5), material)
  mesh.position.y = -length / 2
  pivot.add(mesh)
  return pivot
}

/** Solid ink body. Limbs overlap so the figure reads as one continuous stroke. */
export function createFigure(color: number, armed = false): Figure {
  const material = new THREE.MeshBasicMaterial({ color })
  const root = new THREE.Group()
  const fall = new THREE.Group()
  root.add(fall)

  const leftLeg = limb(0.9, 0.048, material)
  leftLeg.position.set(-0.08, 0.9, 0)
  const rightLeg = limb(0.9, 0.048, material)
  rightLeg.position.set(0.08, 0.9, 0)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.075, 0.54, 6), material)
  torso.position.y = 1.16
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 8, 6), material)
  head.position.y = 1.56
  const leftArm = limb(0.64, 0.04, material)
  leftArm.position.set(-0.16, 1.38, 0)
  const rightArm = limb(0.64, 0.04, material)
  rightArm.position.set(0.16, 1.38, 0)
  fall.add(leftLeg, rightLeg, torso, head, leftArm, rightArm)

  if (armed) {
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.34), material)
    gun.position.set(0, -0.48, 0.12)
    rightArm.add(gun)
  }

  return { root, fall, leftLeg, rightLeg, leftArm, rightArm }
}

export function poseFigure(figure: Figure, phase: number, mode: 'idle' | 'walk' | 'bound' | 'dead', down = 0) {
  const swing = mode === 'walk' ? Math.sin(phase) : 0
  figure.leftLeg.rotation.x = swing * 0.7
  figure.rightLeg.rotation.x = -swing * 0.7
  figure.leftArm.rotation.x = mode === 'bound' ? 0.45 : -swing * 0.55
  figure.rightArm.rotation.x = mode === 'bound' ? 0.45 : swing * 0.5
  figure.fall.rotation.x = mode === 'dead' ? -1.15 * down : 0
  figure.fall.position.y = mode === 'dead' ? 0.08 * down : 0
}
