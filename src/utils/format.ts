const pad = (n: number) => String(n).padStart(2, '0')

/** Local date and time as `YYYY-MM-DD HH:mm` (ISO 8601 order, no zone). */
export function isoLocalDateTime(time: number | Date): string {
  const d = new Date(time)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}
