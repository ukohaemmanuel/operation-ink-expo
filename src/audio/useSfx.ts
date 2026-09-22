import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { useEffect, useRef } from 'react'
import type { Sim } from '../game/sim'

const sources = {
  shot: require('../../assets/sfx/shot.wav'),
  enemy: require('../../assets/sfx/enemy.wav'),
  hit: require('../../assets/sfx/hit.wav'),
  hurt: require('../../assets/sfx/hurt.wav'),
  reload: require('../../assets/sfx/reload.wav'),
  interact: require('../../assets/sfx/interact.wav'),
  unlock: require('../../assets/sfx/unlock.wav'),
  step: require('../../assets/sfx/step.wav'),
  death: require('../../assets/sfx/death.wav'),
  complete: require('../../assets/sfx/complete.wav'),
  alarm: require('../../assets/sfx/alarm.wav'),
} as const

type Cue = keyof typeof sources

const eventCue: Record<string, Cue | undefined> = {
  shot: 'shot',
  'enemy-shot': 'enemy',
  hit: 'hit',
  hurt: 'hurt',
  reload: 'reload',
  interact: 'interact',
  unlock: 'unlock',
  step: 'step',
  death: 'death',
  complete: 'complete',
}

export type Sfx = {
  playEvents: (events: string[]) => void
  sync: (sim: Sim, paused: boolean) => void
}

/**
 * Original procedural cues played through expo-audio.
 * Nothing here is sampled from another game.
 */
export function useSfx(volume: number) {
  const players = useRef<Partial<Record<Cue, AudioPlayer>>>({})
  const volumeRef = useRef(volume)
  const alarmOn = useRef(false)
  volumeRef.current = volume

  function ensure() {
    if (players.current.shot) return
    const created: Partial<Record<Cue, AudioPlayer>> = {}
    for (const [name, source] of Object.entries(sources) as [Cue, number][]) {
      const player = createAudioPlayer(source, { updateInterval: 1000, keepAudioSessionActive: true })
      player.volume = volumeRef.current
      created[name] = player
    }
    players.current = created
  }

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
    }).catch(() => {})
    return () => {
      alarmOn.current = false
      for (const player of Object.values(players.current)) player?.remove()
      players.current = {}
    }
  }, [])

  useEffect(() => {
    for (const player of Object.values(players.current)) {
      if (player) player.volume = volume
    }
  }, [volume])

  const api = useRef<Sfx>({
    playEvents(events) {
      ensure()
      if (volumeRef.current <= 0) return
      for (const event of events) {
        const cue = eventCue[event]
        const player = cue ? players.current[cue] : undefined
        if (!player) continue
        player.volume = cue === 'step' ? volumeRef.current * 0.4 : volumeRef.current
        void player.seekTo(0).then(() => player.play()).catch(() => {})
      }
    },
    sync(sim, paused) {
      ensure()
      const player = players.current.alarm
      if (!player) return
      const on = sim.alarm === 'active' && sim.phase === 'active' && !paused && volumeRef.current > 0
      if (on === alarmOn.current) return
      alarmOn.current = on
      player.volume = volumeRef.current * 0.55
      player.loop = on
      if (on) player.play()
      else {
        player.pause()
        void player.seekTo(0)
      }
    },
  })

  return api
}
