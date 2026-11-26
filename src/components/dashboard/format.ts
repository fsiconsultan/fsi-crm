const number = new Intl.NumberFormat("en-US")

export function n(value: number) {
  return number.format(value)
}

export function plural(count: number, one: string, many: string) {
  return `${n(count)} ${count === 1 ? one : many}`
}

export function percent(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : null
}
