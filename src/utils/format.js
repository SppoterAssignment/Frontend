export function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export const formatMiles = (miles) => `${Math.round(miles).toLocaleString()} mi`

// Created once and reused: building an Intl formatter is relatively expensive.
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export const formatTime = (value) => timeFormatter.format(new Date(value))

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in *local* time.
export function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function nextFullHour() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d
}
