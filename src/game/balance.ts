/** Tunables for the short mobile mission. Distances are metres, times are seconds. */

export const EYE_HEIGHT = 1.62
export const PLAYER_RADIUS = 0.3
export const HOSTAGE_RADIUS = 0.26
export const WALK_SPEED = 4.2
export const SPRINT_SPEED = 7.1
export const HOSTAGE_SPEED = 2.65
export const GUARD_SPEED = 1.85
export const LOOK_SENS = 0.0062
export const PITCH_LIMIT = 1.15

export const PLAYER_HEALTH = 100
export const GUARD_HEALTH = 100

export const PISTOL = {
  capacity: 12,
  reserve: 36,
  reload: 1.65,
  interval: 0.28,
  range: 46,
  damage: 40,
} as const

export const GUARD_COMBAT = {
  damage: 14,
  interval: 0.78,
  range: 18,
  alarmRange: 26,
  sightAngle: 0.92,
  spread: 0.045,
  memory: 7,
} as const

/** Head hits use the original ink mission's head multiplier. */
export const HEAD_MULTIPLIER = 2.2

export const HOSTAGE_BLUE = 0x2878d0
export const BLOOD = 0xc41212
export const INK = 0x111111
export const PAPER = 0xffffff
