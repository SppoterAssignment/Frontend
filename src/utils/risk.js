// Index = risk level from the API (0 = Low ... 4 = No Travel).
export const RISK_LEVELS = [
  { label: 'Low', color: '#2f9e5b' },
  { label: 'Moderate', color: '#d9a400' },
  { label: 'High', color: '#ee7a1a' },
  { label: 'Severe', color: '#d33a2c' },
  { label: 'No Travel', color: '#7b2d8e' },
]

export const riskColor = (level) => RISK_LEVELS[level]?.color ?? '#888'
export const riskLabel = (level) => RISK_LEVELS[level]?.label ?? 'Unknown'
