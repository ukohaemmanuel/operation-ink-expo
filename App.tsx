import * as ScreenOrientation from 'expo-screen-orientation'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GameScreen } from './src/GameScreen'
import { TitleScreen } from './src/ui/TitleScreen'
import { paper } from './src/ui/theme'

export default function App() {
  const [screen, setScreen] = useState<'title' | 'game'>('title')
  const [volume, setVolume] = useState(0.7)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {})
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {})
    }
  }, [])

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: paper }}>
      <StatusBar style="dark" hidden={screen === 'game'} />
      {screen === 'game' ? (
        <GameScreen
          volume={volume}
          reducedMotion={reducedMotion}
          onVolume={setVolume}
          onReducedMotion={setReducedMotion}
          onExit={() => setScreen('title')}
        />
      ) : (
        <TitleScreen onBegin={() => setScreen('game')} />
      )}
    </SafeAreaProvider>
  )
}
