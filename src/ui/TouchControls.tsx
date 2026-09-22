import { useRef, useState } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import { ink, paper, serif } from './theme'

type Props = {
  insetTop: number
  insetLeft: number
  insetRight: number
  insetBottom: number
  onMove: (x: number, y: number) => void
  onLook: (dx: number, dy: number) => void
  onFire: (held: boolean) => void
  onSprint: (held: boolean) => void
  onInteract: () => void
  onReload: () => void
  onPause: () => void
}

const BASE = 132

export function TouchControls({
  insetTop,
  insetLeft,
  insetRight,
  insetBottom,
  onMove,
  onLook,
  onFire,
  onSprint,
  onInteract,
  onReload,
  onPause,
}: Props) {
  const moveRef = useRef(onMove)
  const lookRef = useRef(onLook)
  moveRef.current = onMove
  lookRef.current = onLook
  const lookPoint = useRef({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const stick = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => aim(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onPanResponderMove: event => aim(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onPanResponderRelease: () => {
        moveRef.current(0, 0)
        setKnob({ x: 0, y: 0 })
      },
      onPanResponderTerminate: () => {
        moveRef.current(0, 0)
        setKnob({ x: 0, y: 0 })
      },
    }),
  ).current

  const look = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => {
        lookPoint.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
      },
      onPanResponderMove: event => {
        const x = event.nativeEvent.pageX
        const y = event.nativeEvent.pageY
        lookRef.current(x - lookPoint.current.x, y - lookPoint.current.y)
        lookPoint.current = { x, y }
      },
    }),
  ).current

  function aim(locationX: number, locationY: number) {
    const dx = locationX - BASE / 2
    const dy = locationY - BASE / 2
    const len = Math.hypot(dx, dy)
    if (len < 12) {
      moveRef.current(0, 0)
      setKnob({ x: 0, y: 0 })
      return
    }
    const max = BASE / 2 - 16
    const scale = len > max ? max / len : 1
    setKnob({ x: dx * scale, y: dy * scale })
    moveRef.current((dx * scale) / max, -(dy * scale) / max)
  }

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
      <View style={styles.look} {...look.panHandlers}>
        <Text style={styles.lookHint}>DRAG TO LOOK</Text>
      </View>
      <View
        style={[styles.stick, { left: 20 + insetLeft, bottom: 24 + insetBottom }]}
        {...stick.panHandlers}
      >
        <View style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
      </View>
      <Pressable
        style={[styles.small, styles.sprint, { left: 28 + insetLeft, bottom: 168 + insetBottom }]}
        onPressIn={() => onSprint(true)}
        onPressOut={() => onSprint(false)}
        accessibilityLabel="Sprint"
      >
        <Text style={styles.smallText}>Sprint</Text>
      </Pressable>
      <View style={[styles.cluster, { right: 18 + insetRight, bottom: 22 + insetBottom }]}>
        <Pressable style={styles.fire} onPressIn={() => onFire(true)} onPressOut={() => onFire(false)} accessibilityLabel="Fire">
          <Text style={styles.fireText}>Fire</Text>
        </Pressable>
        <Pressable style={styles.small} onPress={onInteract} accessibilityLabel="Interact">
          <Text style={styles.smallText}>Use</Text>
        </Pressable>
        <Pressable style={styles.small} onPress={onReload} accessibilityLabel="Reload">
          <Text style={styles.smallText}>Reload</Text>
        </Pressable>
      </View>
      <Pressable
        style={[styles.pause, { top: 8 + insetTop, left: 16 + insetLeft }]}
        onPress={onPause}
        accessibilityLabel="Pause"
      >
        <Text style={styles.pauseText}>Pause</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  look: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '52%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 72,
  },
  lookHint: {
    color: '#b0b0b0',
    letterSpacing: 2,
    fontSize: 12,
  },
  stick: {
    position: 'absolute',
    width: BASE,
    height: BASE,
    borderRadius: BASE / 2,
    borderWidth: 2,
    borderColor: ink,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ink,
  },
  cluster: {
    position: 'absolute',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  fire: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireText: {
    color: paper,
    fontFamily: serif,
    fontSize: 18,
  },
  small: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: ink,
    backgroundColor: paper,
    alignItems: 'center',
  },
  smallText: {
    color: ink,
    fontSize: 14,
  },
  sprint: {
    position: 'absolute',
    zIndex: 2,
  },
  pause: {
    position: 'absolute',
    zIndex: 3,
    borderWidth: 1.5,
    borderColor: ink,
    backgroundColor: paper,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pauseText: {
    color: ink,
    fontSize: 13,
  },
})
