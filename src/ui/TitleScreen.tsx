import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { blue, ink, muted, paper, serif } from './theme'

const ORIGINAL = 'https://github.com/byteab/operation-ink'

type Props = {
  onBegin: () => void
}

export function TitleScreen({ onBegin }: Props) {
  const [about, setAbout] = useState(false)

  return (
    <View style={styles.root}>
      <View style={styles.sheet}>
        <Text style={styles.kicker}>FIELD MANUAL</Text>
        <Text style={styles.title}>Operation{'\n'}Safe Return</Text>
        <View style={styles.rule} />
        <Text style={styles.lede}>
          A paper-and-ink hostage rescue. Find the detention block, free the hostage, and reach the east gate.
        </Text>
        <View style={styles.swatchRow}>
          <View style={styles.swatch} />
          <View style={[styles.swatch, styles.swatchBlue]} />
          <Text style={styles.swatchLabel}>You in ink. The hostage in blue.</Text>
        </View>
        <Pressable style={styles.primary} onPress={onBegin} accessibilityRole="button">
          <Text style={styles.primaryText}>Begin mission</Text>
        </Pressable>
        <Pressable onPress={() => setAbout(value => !value)} accessibilityRole="button">
          <Text style={styles.link}>{about ? 'Hide credits' : 'About and credits'}</Text>
        </Pressable>
        {about ? (
          <View style={styles.about}>
            <Text style={styles.body}>
              Inspired by Operation Safe Return by Ehsan Sarshar (@byteab). This phone version is an independent recreation, not a copy of the browser game.
            </Text>
            <Text style={styles.link} onPress={() => Linking.openURL(ORIGINAL)}>
              {ORIGINAL}
            </Text>
            <Text style={styles.body}>
              Sound effects are original procedural synthesis, dedicated to the public domain (CC0). No Project I.G.I. audio is included. Code is under the MIT licence.
            </Text>
            <Text style={styles.body}>
              Landscape is preferred. Move with the left stick, look by dragging the right side, then Fire, Use, Reload, and Sprint. On the web, WASD, drag, F, R, and Space work as well.
            </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 2,
    borderColor: ink,
    paddingHorizontal: 28,
    paddingVertical: 26,
    gap: 12,
  },
  kicker: {
    fontFamily: serif,
    letterSpacing: 3,
    fontSize: 12,
    color: muted,
  },
  title: {
    fontFamily: serif,
    fontSize: 46,
    lineHeight: 48,
    color: ink,
  },
  rule: {
    height: 1,
    backgroundColor: ink,
    marginVertical: 4,
  },
  lede: {
    fontSize: 16,
    lineHeight: 22,
    color: ink,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ink,
  },
  swatchBlue: {
    backgroundColor: blue,
  },
  swatchLabel: {
    color: muted,
    fontSize: 13,
  },
  primary: {
    marginTop: 8,
    backgroundColor: ink,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryText: {
    color: paper,
    fontSize: 18,
    letterSpacing: 0.4,
    fontFamily: serif,
  },
  link: {
    color: blue,
    fontSize: 15,
  },
  about: {
    gap: 8,
  },
  body: {
    color: ink,
    fontSize: 14,
    lineHeight: 20,
  },
})
