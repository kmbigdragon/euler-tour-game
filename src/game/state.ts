import type { DifficultyId } from './difficulty.ts'
import type { Graph } from './graph.ts'

export type GameStatus = 'playing' | 'paused' | 'won' | 'timeout' | 'gaveup'

export interface GameState {
  graph: Graph
  difficulty: DifficultyId
  /** null = no time limit. */
  timeLimitMs: number | null
  pathVertices: number[]
  pathEdges: number[]
  status: GameStatus
  /** Time banked before the current running stretch. */
  accumulatedMs: number
  /** Timestamp the clock last (re)started, null while stopped. */
  runningSince: number | null
  undoCount: number
  resetCount: number
  hintCount: number
  /** Changes whenever a fresh graph or retry starts; used as a React key. */
  round: number
}

export type GameAction =
  | { type: 'start'; vertex: number }
  | { type: 'traverse'; edge: number; to: number; now: number }
  | { type: 'undo' }
  | { type: 'reset-path' }
  | { type: 'hint' }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'timeout'; now: number }
  | { type: 'give-up'; now: number }
  | { type: 'retry'; timeLimitMs: number | null; now: number }
  | { type: 'new-graph'; graph: Graph; timeLimitMs: number | null; now: number }

export function createGame(
  graph: Graph,
  difficulty: DifficultyId,
  timeLimitMs: number | null,
  now: number,
  round = 0,
): GameState {
  return {
    graph,
    difficulty,
    timeLimitMs,
    pathVertices: [],
    pathEdges: [],
    status: 'playing',
    accumulatedMs: 0,
    runningSince: now,
    undoCount: 0,
    resetCount: 0,
    hintCount: 0,
    round,
  }
}

export function elapsedAt(state: GameState, now: number): number {
  const running = state.runningSince === null ? 0 : Math.max(0, now - state.runningSince)
  return state.accumulatedMs + running
}

function stopClock(state: GameState, now: number, status: GameStatus): GameState {
  let accumulatedMs = elapsedAt(state, now)
  if (status === 'timeout' && state.timeLimitMs !== null) accumulatedMs = state.timeLimitMs
  return { ...state, status, accumulatedMs, runningSince: null }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const playing = state.status === 'playing'
  switch (action.type) {
    case 'start':
      if (!playing || state.pathVertices.length > 0) return state
      return { ...state, pathVertices: [action.vertex] }

    case 'traverse': {
      const from = state.pathVertices[state.pathVertices.length - 1]
      const edge = state.graph.edges[action.edge]
      const joins = (edge.u === from && edge.v === action.to) || (edge.v === from && edge.u === action.to)
      if (!playing || !joins || state.pathEdges.includes(action.edge)) return state
      const next = {
        ...state,
        pathVertices: [...state.pathVertices, action.to],
        pathEdges: [...state.pathEdges, action.edge],
      }
      return next.pathEdges.length === state.graph.edges.length ? stopClock(next, action.now, 'won') : next
    }

    case 'undo':
      if (!playing || state.pathVertices.length === 0) return state
      return {
        ...state,
        pathVertices: state.pathVertices.slice(0, -1),
        pathEdges: state.pathEdges.slice(0, -1),
        undoCount: state.undoCount + 1,
      }

    case 'reset-path':
      if (!playing || state.pathVertices.length === 0) return state
      return { ...state, pathVertices: [], pathEdges: [], resetCount: state.resetCount + 1 }

    case 'hint':
      return playing ? { ...state, hintCount: state.hintCount + 1 } : state

    case 'pause':
      return playing ? stopClock(state, action.now, 'paused') : state

    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing', runningSince: action.now } : state

    case 'timeout':
      return playing ? stopClock(state, action.now, 'timeout') : state

    case 'give-up':
      return playing || state.status === 'paused' ? stopClock(state, action.now, 'gaveup') : state

    case 'retry':
      return createGame(state.graph, state.difficulty, action.timeLimitMs, action.now, state.round + 1)

    case 'new-graph':
      return createGame(action.graph, state.difficulty, action.timeLimitMs, action.now, state.round + 1)
  }
}
