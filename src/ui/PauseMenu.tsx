import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ink, muted, paper, serif } from './theme'

type Props = {
  volume: number
  reducedMotion: boolean
  onVolume: (volume: number) => void
  onReducedMotion: (value: boolean) => void
  onResume: () => void
  onRestart: () => void
  onExit: () => void
}

const levels = [0, 0.35, 0.7, 1]

export function PauseMenu({ volume, reducedMotion, onVolume, onReducedMotion, onResume, onRestart, onExit }: Props) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>Paused</Text>
        <Text style={styles.copy}>
          Left stick moves. Drag the right side to look. Fire is semi-automatic. Use opens the cell, the gate, the dressing, and the jeep. Sprint is held. Reload fills the pistol from reserve.
        </Text>
        <Text style={styles.label}>Volume</Text>
        <View style={styles.levels}>
          {levels.map(level => (
            <Pressable
              key={level}
              onPress={() => onVolume(level)}
              style={[styles.level, volume === level && styles.levelOn]}
              accessibilityLabel={`Volume ${Math.round(level * 100)} percent`}
            >
              <Text style={[styles.levelText, volume === level && styles.levelTextOn]}>{Math.round(level * 100)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.checkRow} onPress={() => onReducedMotion(!reducedMotion)} accessibilityRole="switch" accessibilityState={{ checked: reducedMotion }}>
          <View style={[styles.box, reducedMotion && styles.boxOn]} />
          <Text style={styles.copy}>Reduced motion</Text>
        </Pressable>
        <Pressable style={styles.primary} onPress={onResume}>
          <Text style={styles.primaryText}>Resume</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onRestart}>
          <Text style={styles.secondaryText}>Restart mission</Text>
        </Pressable>
        <Pressable onPress={onExit}>
          <Text style={styles.exit}>Return to title</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function EndCard({
  title,
  body,
  onRetry,
  onExit,
}: {
  title: string
  body: string
  onRetry: () => void
  onExit: () => void
}) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{body}</Text>
        <Pressable style={styles.primary} onPress={onRetry}>
          <Text style={styles.primaryText}>Retry mission</Text>
        </Pressable>
        <Pressable onPress={onExit}>
          <Text style={styles.exit}>Return to title</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 5,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderWidth: 2,
    borderColor: ink,
    backgroundColor: paper,
    padding: 20,
    gap: 10,
  },
  title: {
    fontFamily: serif,
    fontSize: 32,
    color: ink,
  },
  copy: {
    color: ink,
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    color: muted,
    letterSpacing: 1.4,
    fontSize: 11,
  },
  levels: {
    flexDirection: 'row',
    gap: 8,
  },
  level: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ink,
    alignItems: 'center',
    paddingVertical: 8,
  },
  levelOn: {
    backgroundColor: ink,
  },
  levelText: {
    color: ink,
  },
  levelTextOn: {
    color: paper,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  box: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: ink,
  },
  boxOn: {
    backgroundColor: ink,
  },
  primary: {
    backgroundColor: ink,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  primaryText: {
    color: paper,
    fontFamily: serif,
    fontSize: 18,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: ink,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    color: ink,
    fontSize: 16,
  },
  exit: {
    textAlign: 'center',
    color: muted,
    paddingVertical: 4,
  },
})
