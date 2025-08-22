export function formatDateTime(d: string | number | Date) {
  const date = new Date(d)
  return date.toLocaleString()
}
