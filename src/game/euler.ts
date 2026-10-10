import type { Graph, Neighbor } from './graph.ts'

export interface Trail {
  vertices: number[]
  edges: number[]
}

/** Hierholzer's algorithm. Starts from an odd vertex unless told otherwise. */
export function findEulerTrail(graph: Graph, start = graph.oddVertices[0] ?? 0): Trail {
  const used = graph.edges.map(() => false)
  const next = graph.vertices.map(() => 0)
  const stack = [{ v: start, edge: -1 }]
  const vertices: number[] = []
  const edges: number[] = []

  while (stack.length > 0) {
    const top = stack[stack.length - 1]
    const adj = graph.adjacency[top.v]
    while (next[top.v] < adj.length && used[adj[next[top.v]].edge]) next[top.v]++
    if (next[top.v] === adj.length) {
      stack.pop()
      vertices.push(top.v)
      if (top.edge >= 0) edges.push(top.edge)
    } else {
      const { to, edge } = adj[next[top.v]]
      used[edge] = true
      stack.push({ v: to, edge })
    }
  }
  return { vertices: vertices.reverse(), edges: edges.reverse() }
}

/**
 * Whether the unused edges can still all be walked, each exactly once,
 * starting from `current`.
 */
export function canComplete(graph: Graph, used: ReadonlySet<number>, current: number): boolean {
  const remaining = graph.edges.length - used.size
  if (remaining === 0) return true

  const deg = graph.adjacency.map((list) => list.filter((n) => !used.has(n.edge)).length)
  if (deg[current] === 0) return false

  // Every unused edge must be reachable from the current vertex…
  const seen = new Set([current])
  const queue = [current]
  let reachableDegree = 0
  while (queue.length > 0) {
    const v = queue.pop()!
    reachableDegree += deg[v]
    for (const n of graph.adjacency[v]) {
      if (!used.has(n.edge) && !seen.has(n.to)) {
        seen.add(n.to)
        queue.push(n.to)
      }
    }
  }
  if (reachableDegree / 2 !== remaining) return false

  // …and the remaining graph must have 0 odd vertices, or 2 with current among them.
  const odd = deg.flatMap((d, v) => (d % 2 === 1 ? [v] : []))
  return odd.length === 0 || (odd.length === 2 && odd.includes(current))
}

/** A next step that keeps the puzzle solvable (Fleury's rule), if one exists. */
export function suggestNextStep(graph: Graph, usedEdges: readonly number[], current: number): Neighbor | null {
  const used = new Set(usedEdges)
  for (const n of graph.adjacency[current]) {
    if (used.has(n.edge)) continue
    used.add(n.edge)
    const ok = canComplete(graph, used, n.to)
    used.delete(n.edge)
    if (ok) return n
  }
  return null
}

/**
 * Number of edges in the longest prefix of the player's path from which the
 * puzzle is still solvable, or -1 if the chosen start vertex itself is wrong.
 */
export function solvablePrefix(graph: Graph, pathVertices: readonly number[], pathEdges: readonly number[]): number {
  for (let k = pathEdges.length; k >= 0; k--) {
    if (canComplete(graph, new Set(pathEdges.slice(0, k)), pathVertices[k])) return k
  }
  return -1
}
