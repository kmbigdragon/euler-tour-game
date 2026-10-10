import { getDifficulty, type Difficulty, type DifficultyId } from './difficulty.ts'
import { buildGraph, type Graph, type Point } from './graph.ts'
import { pick, randInt, shuffle, type Rng } from './random.ts'

/** Board area in SVG units; the aspect ratio adapts to the screen. */
const BOARD_AREA = 1000 * 680
const MIN_ANGLE = (24 * Math.PI) / 180

interface Candidate {
  u: number
  v: number
  len: number
}

/**
 * Random connected planar graph with exactly two odd-degree vertices, so an
 * Euler path always exists and must start at one of those two vertices.
 * Vertex count, edge count and layout are all re-rolled on every call.
 */
export function generateGraph(difficultyId: DifficultyId, aspect = 1.5, rng: Rng = Math.random): Graph {
  const level = getDifficulty(difficultyId)
  const ratio = clamp(aspect, 0.6, 1.8)
  const width = Math.round(Math.sqrt(BOARD_AREA * ratio))
  const height = Math.round(BOARD_AREA / width)

  let lastPoints: Point[] = []
  for (let attempt = 0; attempt < 200; attempt++) {
    // After many misses, accept any edge count rather than fail.
    const strict = attempt < 150
    const n = randInt(rng, level.vertices[0], level.vertices[1])
    const spacing = Math.sqrt((width * height) / n)
    const radius = clamp(spacing * 0.12, 20, 30)
    const [lo, hi] = edgeRange(level, n)
    // Margin leaves room for the hint ring and degree badge around edge vertices.
    const points = samplePoints(rng, n, width, height, radius * 1.5 + 14)
    lastPoints = points
    const candidates = planarCandidates(points, spacing, radius)
    if (candidates.length < lo || !isConnected(n, candidates)) continue

    for (let t = 0; t < 40; t++) {
      const target = randInt(rng, lo, Math.min(hi, candidates.length))
      const pairs = eulerianEdgeSet(rng, n, candidates, target)
      if (pairs && (!strict || (pairs.length >= lo && pairs.length <= hi))) {
        return finalize(points, pairs, width, height, radius, spacing)
      }
    }
  }

  // Practically unreachable: a simple path always has exactly two odd vertices.
  const order = lastPoints.map((_, i) => i).sort((a, b) => lastPoints[a].x - lastPoints[b].x)
  const pairs = order.slice(1).map((v, i): [number, number] => [order[i], v])
  return finalize(lastPoints, pairs, width, height, 24, 150)
}

export function edgeRange(level: Difficulty, n: number): [number, number] {
  const lo = Math.max(level.edges[0], n + 1)
  const hi = Math.max(lo, Math.min(level.edges[1], Math.floor(n * 2.1)))
  return [lo, hi]
}

/** Mitchell's best-candidate sampling: evenly spread but still random. */
function samplePoints(rng: Rng, n: number, width: number, height: number, margin: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i < n; i++) {
    let best: Point = { x: width / 2, y: height / 2 }
    let bestDist = -1
    for (let c = 0; c < 40; c++) {
      const p = {
        x: margin + rng() * (width - 2 * margin),
        y: margin + rng() * (height - 2 * margin),
      }
      let d = Infinity
      for (const q of points) d = Math.min(d, Math.hypot(p.x - q.x, p.y - q.y))
      if (d > bestDist) {
        bestDist = d
        best = p
      }
    }
    points.push(best)
  }
  return points
}

/** Shortest-first greedy set of non-crossing, readable edges. */
function planarCandidates(points: Point[], spacing: number, radius: number): Candidate[] {
  const maxLen = spacing * 2
  const all: Candidate[] = []
  for (let u = 0; u < points.length; u++) {
    for (let v = u + 1; v < points.length; v++) {
      const len = Math.hypot(points[u].x - points[v].x, points[u].y - points[v].y)
      if (len <= maxLen) all.push({ u, v, len })
    }
  }
  all.sort((a, b) => a.len - b.len)

  const accepted: Candidate[] = []
  for (const c of all) {
    if (passesNearVertex(points, c, radius * 1.9)) continue
    if (accepted.some((e) => segmentsCross(points, c, e) || sharpAngle(points, c, e))) continue
    accepted.push(c)
  }
  return accepted
}

function eulerianEdgeSet(rng: Rng, n: number, candidates: Candidate[], target: number): [number, number][] | null {
  // Random spanning tree; its edges are never removed, so the graph stays connected.
  const order = candidates
    .map((c, i) => ({ i, w: c.len * (0.6 + rng() * 0.8) }))
    .sort((a, b) => a.w - b.w)
  const dsu = new DisjointSet(n)
  const selected = candidates.map(() => false)
  const free: number[] = []
  for (const { i } of order) {
    if (dsu.union(candidates[i].u, candidates[i].v)) selected[i] = true
    else free.push(i)
  }
  for (const i of shuffle(rng, free).slice(0, Math.max(0, target - (n - 1)))) selected[i] = true

  const deg = new Array<number>(n).fill(0)
  candidates.forEach((c, i) => {
    if (selected[i]) {
      deg[c.u]++
      deg[c.v]++
    }
  })
  const freeAdj: { to: number; idx: number }[][] = Array.from({ length: n }, () => [])
  for (const i of free) {
    freeAdj[candidates[i].u].push({ to: candidates[i].v, idx: i })
    freeAdj[candidates[i].v].push({ to: candidates[i].u, idx: i })
  }

  const toggle = (i: number) => {
    const delta = selected[i] ? -1 : 1
    selected[i] = !selected[i]
    deg[candidates[i].u] += delta
    deg[candidates[i].v] += delta
  }

  // Toggling every edge on a path flips the parity of its two endpoints only.
  for (let guard = 0; guard < 4 * n; guard++) {
    const odd = deg.flatMap((d, v) => (d % 2 === 1 ? [v] : []))
    if (odd.length === 2) break
    if (odd.length === 0) {
      if (free.length === 0) return null
      toggle(pick(rng, free))
      continue
    }
    const path = shuffle(rng, odd)
      .map((a) => pathToNearestOdd(rng, a, deg, freeAdj))
      .find((p) => p !== null)
    if (!path) return null
    path.forEach(toggle)
  }

  if (deg.filter((d) => d % 2 === 1).length !== 2) return null
  return candidates.flatMap((c, i): [number, number][] => (selected[i] ? [[c.u, c.v]] : []))
}

function pathToNearestOdd(
  rng: Rng,
  start: number,
  deg: number[],
  freeAdj: { to: number; idx: number }[][],
): number[] | null {
  const via = new Map<number, { from: number; idx: number }>()
  const seen = new Set([start])
  const queue = [start]
  while (queue.length > 0) {
    const v = queue.shift()!
    if (v !== start && deg[v] % 2 === 1) {
      const path: number[] = []
      for (let cur = v; cur !== start; cur = via.get(cur)!.from) path.push(via.get(cur)!.idx)
      return path
    }
    for (const { to, idx } of shuffle(rng, [...freeAdj[v]])) {
      if (seen.has(to)) continue
      seen.add(to)
      via.set(to, { from: v, idx })
      queue.push(to)
    }
  }
  return null
}

/** Relabel vertices in reading order (top-left to bottom-right) so labels are easy to find. */
function finalize(
  points: Point[],
  pairs: [number, number][],
  width: number,
  height: number,
  radius: number,
  spacing: number,
): Graph {
  const band = spacing * 0.55
  const order = points
    .map((_, i) => i)
    .sort((a, b) => Math.round(points[a].y / band) - Math.round(points[b].y / band) || points[a].x - points[b].x)
  const rank = new Array<number>(points.length)
  order.forEach((old, i) => (rank[old] = i))
  return buildGraph(
    order.map((i) => ({ x: Math.round(points[i].x), y: Math.round(points[i].y) })),
    pairs.map(([u, v]) => [rank[u], rank[v]]),
    width,
    height,
    Math.round(radius),
  )
}

// ---------------------------------------------------------------- geometry

function orient(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function segmentsCross(points: Point[], a: Candidate, b: Candidate): boolean {
  if (a.u === b.u || a.u === b.v || a.v === b.u || a.v === b.v) return false
  const [p1, p2, p3, p4] = [points[a.u], points[a.v], points[b.u], points[b.v]]
  const d1 = orient(p3, p4, p1)
  const d2 = orient(p3, p4, p2)
  const d3 = orient(p1, p2, p3)
  const d4 = orient(p1, p2, p4)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function passesNearVertex(points: Point[], c: Candidate, clearance: number): boolean {
  const a = points[c.u]
  const b = points[c.v]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  return points.some((p, k) => {
    if (k === c.u || k === c.v) return false
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1)
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) < clearance
  })
}

/** Two edges leaving the same vertex at a very narrow angle are hard to tell apart. */
function sharpAngle(points: Point[], a: Candidate, b: Candidate): boolean {
  const shared = a.u === b.u || a.u === b.v ? a.u : a.v === b.u || a.v === b.v ? a.v : -1
  if (shared < 0) return false
  const s = points[shared]
  const p = points[a.u === shared ? a.v : a.u]
  const q = points[b.u === shared ? b.v : b.u]
  const cos =
    ((p.x - s.x) * (q.x - s.x) + (p.y - s.y) * (q.y - s.y)) /
    (Math.hypot(p.x - s.x, p.y - s.y) * Math.hypot(q.x - s.x, q.y - s.y))
  return Math.acos(clamp(cos, -1, 1)) < MIN_ANGLE
}

function isConnected(n: number, candidates: Candidate[]): boolean {
  const dsu = new DisjointSet(n)
  let components = n
  for (const c of candidates) if (dsu.union(c.u, c.v)) components--
  return components === 1
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x))
}

class DisjointSet {
  private parent: number[]

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra === rb) return false
    this.parent[ra] = rb
    return true
  }
}
