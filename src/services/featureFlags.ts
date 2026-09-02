// Feature Flags System for Gradual Rollout & Rollback Safety

export interface FeatureFlags {
  sentinelaPulse: boolean
  sentinelaCommunications: boolean
  sentinelaTriage: boolean
  sentinelaSituationRoom: boolean
  sentinelaDeadlines: boolean
  sentinelaProcessesDossier: boolean
  sentinelaAutomations: boolean
  sentinelaHealth: boolean
  operationalTwin: boolean
  dailyBriefing: boolean
  incidentMode: boolean
  recoveredTimeMetric: boolean
  temporalSimulator: boolean
  reducedMotionTheme: boolean
}

const STORAGE_KEY = 'nox_feature_flags_v1'

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  sentinelaPulse: true,
  sentinelaCommunications: true,
  sentinelaTriage: true,
  sentinelaSituationRoom: true,
  sentinelaDeadlines: true,
  sentinelaProcessesDossier: true,
  sentinelaAutomations: true,
  sentinelaHealth: true,
  operationalTwin: true,
  dailyBriefing: true,
  incidentMode: true,
  recoveredTimeMetric: true,
  temporalSimulator: true,
  reducedMotionTheme: false,
}

export class FeatureFlagManager {
  private static instance: FeatureFlagManager
  private flags: FeatureFlags = DEFAULT_FEATURE_FLAGS
  private listeners: Set<() => void> = new Set()

  private constructor() {
    this.load()
  }

  public static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager()
    }
    return FeatureFlagManager.instance
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.flags = { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(stored) }
      }
    } catch {
      this.flags = DEFAULT_FEATURE_FLAGS
    }
  }

  public getFlags(): FeatureFlags {
    return { ...this.flags }
  }

  public isEnabled(flag: keyof FeatureFlags): boolean {
    return !!this.flags[flag]
  }

  public setFlag(flag: keyof FeatureFlags, enabled: boolean) {
    this.flags[flag] = enabled
    this.save()
  }

  public resetToDefaults() {
    this.flags = { ...DEFAULT_FEATURE_FLAGS }
    this.save()
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.flags))
    } catch {
      /* ignore */
    }
    this.listeners.forEach((cb) => cb())
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}

export const featureFlags = FeatureFlagManager.getInstance()
