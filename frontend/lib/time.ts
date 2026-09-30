export function timeAgo(isoDate: string) {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  const steps: [number, string][] = [
    [60, 's'],
    [60, 'm'],
    [24, 'h'],
    [7, 'd'],
    [4.345, 'w'],
    [12, 'mo'],
    [Infinity, 'y'],
  ]
  let value = seconds
  for (const [unit, label] of steps) {
    if (value < unit) return `${Math.max(1, Math.floor(value))}${label}`
    value /= unit
  }
  return `${Math.floor(value)}y`
}
