/** Sunset gradient along the walk: violet → magenta → orange. */
export function stepColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1)
  return `hsl(${(262 + t * 128) % 360} 86% 60%)`
}
