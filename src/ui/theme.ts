import { Platform } from 'react-native'

export const paper = '#ffffff'
export const ink = '#111111'
export const muted = '#5c5c5c'
export const blue = '#2878d0'
export const blood = '#c41212'

export const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
})
