export type NeuralLinkState = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface NeuralStateConfig {
  color: number
  css: string
  bloom: number
  pulse: number
  rot: number
  line: number
  label: string
}

export const NEURAL_STATES: Record<NeuralLinkState, NeuralStateConfig> = {
  idle: {
    color: 0x00e5ff,
    css: '#00e5ff',
    bloom: 0.85,
    pulse: 1.3,
    rot: 0.14,
    line: 0.06,
    label: 'AGUARDANDO',
  },
  listening: {
    color: 0x00ff9d,
    css: '#00ff9d',
    bloom: 1.0,
    pulse: 2.4,
    rot: 0.2,
    line: 0.1,
    label: 'OUVINDO',
  },
  thinking: {
    color: 0xffd700,
    css: '#ffd700',
    bloom: 1.12,
    pulse: 6.5,
    rot: 0.9,
    line: 0.34,
    label: 'PROCESSANDO',
  },
  speaking: {
    color: 0xd946ef,
    css: '#d946ef',
    bloom: 1.05,
    pulse: 3.2,
    rot: 0.28,
    line: 0.1,
    label: 'RESPONDENDO',
  },
}

export const NEURAL_ACCENT_COLORS: Record<NeuralLinkState, string> = {
  idle: '#00e5ff',
  listening: '#00ff9d',
  thinking: '#ffd700',
  speaking: '#d946ef',
}

export interface AudioBands {
  bass: number
  mid: number
  treble: number
  level: number
  rms?: number
}
