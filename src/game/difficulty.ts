export type DifficultyId = 'easy' | 'medium' | 'hard' | 'expert'

export interface Difficulty {
  id: DifficultyId
  label: string
  /** 1–4, used for the signal-bar badge. */
  level: number
  vertices: [min: number, max: number]
  edges: [min: number, max: number]
  /** Default time limit in seconds. */
  defaultTime: number
  description: string
}

export const DIFFICULTIES: Difficulty[] = [
  {
    id: 'easy',
    label: 'Dễ',
    level: 1,
    vertices: [5, 7],
    edges: [7, 10],
    defaultTime: 60,
    description: 'Làm quen với luật chơi',
  },
  {
    id: 'medium',
    label: 'Trung bình',
    level: 2,
    vertices: [8, 10],
    edges: [12, 16],
    defaultTime: 120,
    description: 'Bắt đầu phải suy nghĩ',
  },
  {
    id: 'hard',
    label: 'Khó',
    level: 3,
    vertices: [11, 13],
    edges: [17, 22],
    defaultTime: 180,
    description: 'Nhiều ngã rẽ, dễ bế tắc',
  },
  {
    id: 'expert',
    label: 'Rất khó',
    level: 4,
    vertices: [14, 17],
    edges: [23, 30],
    defaultTime: 300,
    description: 'Thử thách thực sự',
  },
]

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0]
}

export function isDifficultyId(value: unknown): value is DifficultyId {
  return DIFFICULTIES.some((d) => d.id === value)
}
