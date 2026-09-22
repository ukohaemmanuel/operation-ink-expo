import { StyleSheet, Text, View } from 'react-native'
import type { Sim } from '../game/sim'
import { blood, ink, muted, paper, serif } from './theme'

type Props = {
  sim: Sim
  insetTop: number
}

export function Hud({ sim, insetTop }: Props) {
  const reloading = sim.reloadLeft > 0
  const cross = sim.marker > 0.2 ? blood : ink

  return (
    <View style={[styles.layer, { paddingTop: insetTop + 8, pointerEvents: 'none' }]}>
      <View style={styles.top}>
        <View style={styles.objectiveBlock}>
          <Text style={styles.kicker}>OBJECTIVE</Text>
          <Text style={styles.objective}>{sim.objective}</Text>
          {sim.phase === 'active' && sim.guide ? (
            <View style={styles.guideRow}>
              <View style={{ transform: [{ rotate: `${sim.guideAngle}rad` }] }}>
                <View style={styles.arrow} />
              </View>
              <Text style={styles.guideText}>{Math.max(0, Math.round(sim.guideDistance))} m</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.healthBlock}>
          <Text style={styles.kicker}>HEALTH</Text>
          <View style={styles.healthTrack}>
            <View style={[styles.healthFill, { width: `${sim.health}%` }, sim.health < 35 && styles.healthLow]} />
          </View>
          <Text style={styles.healthValue}>{Math.ceil(sim.health)}</Text>
          {sim.alarm === 'active' ? <Text style={styles.alarm}>ALARM</Text> : null}
        </View>
      </View>
      {sim.message ? <Text style={styles.message}>{sim.message}</Text> : null}
      <View style={styles.cross}>
        <View style={[styles.crossArm, styles.crossUp, { backgroundColor: cross }]} />
        <View style={[styles.crossArm, styles.crossDown, { backgroundColor: cross }]} />
        <View style={[styles.crossArm, styles.crossLeft, { backgroundColor: cross }]} />
        <View style={[styles.crossArm, styles.crossRight, { backgroundColor: cross }]} />
      </View>
      <View style={styles.bottom}>
        <Text style={styles.prompt}>{sim.prompt ? `USE  ${sim.prompt}` : ''}</Text>
        <Text style={styles.ammo}>
          {reloading ? 'Reloading' : `${sim.magazine}  |  ${sim.reserve}`}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  objectiveBlock: {
    flex: 1,
    maxWidth: '70%',
    marginTop: 36,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: muted,
  },
  objective: {
    fontFamily: serif,
    fontSize: 18,
    color: ink,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ink,
  },
  guideText: {
    color: ink,
    fontSize: 13,
  },
  healthBlock: {
    width: 120,
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 36,
  },
  healthTrack: {
    width: 120,
    height: 8,
    borderWidth: 1,
    borderColor: ink,
    backgroundColor: paper,
  },
  healthFill: {
    height: '100%',
    backgroundColor: ink,
  },
  healthLow: {
    backgroundColor: blood,
  },
  healthValue: {
    fontFamily: serif,
    color: ink,
    fontSize: 16,
  },
  alarm: {
    color: blood,
    letterSpacing: 2,
    fontSize: 13,
  },
  message: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: paper,
    borderWidth: 1,
    borderColor: ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: serif,
    color: ink,
    maxWidth: '80%',
  },
  cross: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
  },
  crossArm: {
    position: 'absolute',
    backgroundColor: ink,
  },
  crossUp: { width: 2, height: 6, left: 8, top: 0 },
  crossDown: { width: 2, height: 6, left: 8, bottom: 0 },
  crossLeft: { width: 6, height: 2, left: 0, top: 8 },
  crossRight: { width: 6, height: 2, right: 0, top: 8 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  prompt: {
    fontFamily: serif,
    fontSize: 16,
    color: ink,
    backgroundColor: paper,
    paddingHorizontal: 8,
  },
  ammo: {
    marginTop: 4,
    fontSize: 14,
    letterSpacing: 1,
    color: ink,
  },
})
