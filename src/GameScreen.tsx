import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl'
import { useKeepAwake } from 'expo-keep-awake'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSfx } from './audio/useSfx'
import { createSim, idleInput, resetSim, step, type FrameInput, type Sim } from './game/sim'
import { createWorld, type WorldView } from './game/scene'
import { Hud } from './ui/Hud'
import { EndCard, PauseMenu } from './ui/PauseMenu'
import { TouchControls } from './ui/TouchControls'
import { blood, ink, paper, serif } from './ui/theme'

type Props = {
  volume: number
  reducedMotion: boolean
  onVolume: (volume: number) => void
  onReducedMotion: (value: boolean) => void
  onExit: () => void
}

export function GameScreen({ volume, reducedMotion, onVolume, onReducedMotion, onExit }: Props) {
  useKeepAwake()
  const insets = useSafeAreaInsets()
  const sfx = useSfx(volume)
  const simRef = useRef<Sim | null>(null)
  if (!simRef.current) simRef.current = createSim()
  const inputRef = useRef<FrameInput>(idleInput())
  const stick = useRef({ x: 0, y: 0 })
  const held = useRef({ fire: false, sprint: false })
  const keys = useRef(new Set<string>())
  const pausedRef = useRef(false)
  const reducedRef = useRef(reducedMotion)
  const worldRef = useRef<WorldView | null>(null)
  const raf = useRef(0)
  const alive = useRef(true)
  reducedRef.current = reducedMotion

  const [paused, setPaused] = useState(false)
  const [frame, setFrame] = useState(0)
  const [glError, setGlError] = useState<string | null>(null)
  const sim = simRef.current

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      cancelAnimationFrame(raf.current)
      worldRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return
      keys.current.add(event.code)
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault()
      if (event.code === 'KeyF' || event.code === 'KeyE') inputRef.current.interact = true
      if (event.code === 'KeyR') inputRef.current.reload = true
      if (event.code === 'Escape' || event.code === 'KeyP') {
        pausedRef.current = !pausedRef.current
        setPaused(pausedRef.current)
      }
    }
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.code)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function setPause(value: boolean) {
    pausedRef.current = value
    setPaused(value)
    stick.current = { x: 0, y: 0 }
    held.current = { fire: false, sprint: false }
  }

  function restart() {
    if (simRef.current) resetSim(simRef.current)
    setPause(false)
    setFrame(value => value + 1)
  }

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      cancelAnimationFrame(raf.current)
      const world = createWorld(gl)
      worldRef.current = world
      let last = 0
      let hudAt = 0
      const loop = (now: number) => {
        if (!alive.current) return
        raf.current = requestAnimationFrame(loop)
        const dt = last === 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000)
        last = now
        const current = simRef.current
        if (!current) return
        const input = inputRef.current
        const keyX = (keys.current.has('KeyD') || keys.current.has('ArrowRight') ? 1 : 0)
          - (keys.current.has('KeyA') || keys.current.has('ArrowLeft') ? 1 : 0)
        const keyY = (keys.current.has('KeyW') || keys.current.has('ArrowUp') ? 1 : 0)
          - (keys.current.has('KeyS') || keys.current.has('ArrowDown') ? 1 : 0)
        input.moveX = Math.max(-1, Math.min(1, stick.current.x + keyX))
        input.moveY = Math.max(-1, Math.min(1, stick.current.y + keyY))
        input.fire = held.current.fire || keys.current.has('Space')
        input.sprint = held.current.sprint || keys.current.has('ShiftLeft') || keys.current.has('ShiftRight')
        input.reducedMotion = reducedRef.current
        if (!pausedRef.current) step(current, input, dt)
        input.lookDx = 0
        input.lookDy = 0
        input.interact = false
        input.reload = false
        const events = current.events.splice(0, current.events.length)
        sfx.current.playEvents(events)
        sfx.current.sync(current, pausedRef.current)
        world.render(current, reducedRef.current, dt)
        gl.endFrameEXP()
        if (now - hudAt > 50) {
          hudAt = now
          setFrame(value => value + 1)
        }
      }
      raf.current = requestAnimationFrame(loop)
    } catch (error) {
      setGlError(error instanceof Error ? error.message : 'The 3D view failed to start.')
    }
  }

  const ended = sim.phase !== 'active'
  const playing = !paused && !ended && !glError
  void frame

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
      <View style={[styles.overlay, { pointerEvents: 'box-none' }]}>
        <Hud sim={sim} insetTop={insets.top} />
        {sim.hitFlash > 0.02 ? (
          <View style={[styles.flash, { opacity: Math.min(0.45, sim.hitFlash * 0.4), pointerEvents: 'none' }]} />
        ) : null}
        {playing ? (
          <TouchControls
            insetTop={insets.top}
            insetLeft={insets.left}
            insetRight={insets.right}
            insetBottom={insets.bottom}
            onMove={(x, y) => { stick.current = { x, y } }}
            onLook={(dx, dy) => {
              inputRef.current.lookDx += dx
              inputRef.current.lookDy += dy
            }}
            onFire={value => { held.current.fire = value }}
            onSprint={value => { held.current.sprint = value }}
            onInteract={() => { inputRef.current.interact = true }}
            onReload={() => { inputRef.current.reload = true }}
            onPause={() => setPause(true)}
          />
        ) : null}
        {paused && !ended ? (
          <PauseMenu
            volume={volume}
            reducedMotion={reducedMotion}
            onVolume={onVolume}
            onReducedMotion={onReducedMotion}
            onResume={() => setPause(false)}
            onRestart={restart}
            onExit={onExit}
          />
        ) : null}
        {ended ? (
          <EndCard
            title={sim.phase === 'complete' ? 'Mission complete' : 'Rescue interrupted'}
            body={sim.phase === 'complete'
              ? 'The hostage is out through the east gate.'
              : 'You did not make it back. Retry the insertion.'}
            onRetry={restart}
            onExit={onExit}
          />
        ) : null}
        {glError ? (
          <View style={styles.error}>
            <Text style={styles.errorTitle}>Could not open the compound</Text>
            <Text style={styles.errorBody}>{glError}</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: paper,
  },
  gl: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  flash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: blood,
  },
  error: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontFamily: serif,
    fontSize: 28,
    color: ink,
    marginBottom: 8,
  },
  errorBody: {
    color: ink,
    fontSize: 16,
  },
})
