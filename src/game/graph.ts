export interface Vertex {
  id: number
  x: number
  y: number
  label: string
}

export interface Edge {
  id: number
  u: number
  v: number
}

export interface Neighbor {
  to: number
  edge: number
}

export interface Graph {
  width: number
  height: number
  /** Vertex radius in board units. */
  radius: number
  vertices: Vertex[]
  edges: Edge[]
  adjacency: Neighbor[][]
  degrees: number[]
  oddVertices: number[]
}

export interface Point {
  x: number
  y: number
}

export function vertexLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return index < letters.length ? letters[index] : `${letters[index % 26]}${Math.floor(index / 26)}`
}

export function buildGraph(
  points: Point[],
  pairs: [number, number][],
  width: number,
  height: number,
  radius: number,
): Graph {
  const vertices = points.map((p, id) => ({ id, x: p.x, y: p.y, label: vertexLabel(id) }))
  const edges = pairs.map(([u, v], id) => ({ id, u, v }))
  const adjacency: Neighbor[][] = vertices.map(() => [])
  for (const e of edges) {
    adjacency[e.u].push({ to: e.v, edge: e.id })
    adjacency[e.v].push({ to: e.u, edge: e.id })
  }
  const degrees = adjacency.map((list) => list.length)
  const oddVertices = degrees.flatMap((d, i) => (d % 2 === 1 ? [i] : []))
  return { width, height, radius, vertices, edges, adjacency, degrees, oddVertices }
}

/** Id of the edge joining a and b, or -1 when they are not adjacent. */
export function edgeBetween(graph: Graph, a: number, b: number): number {
  return graph.adjacency[a].find((n) => n.to === b)?.edge ?? -1
}

export function otherEnd(edge: Edge, v: number): number {
  return edge.u === v ? edge.v : edge.u
}
