import { useRef, type PointerEvent } from 'react'
import type { Graph } from '../game/graph.ts'
import { stepColor } from './stepColor.ts'
import './GraphBoard.css'

export interface BoardMarks {
  /** Vertices to spotlight (e.g. valid starting points). */
  vertices?: number[]
  /** Suggested next edge. */
  edge?: number
  /** Edge where the player's path went wrong. */
  wrongEdge?: number
}

interface GraphBoardProps {
  graph: Graph
  pathVertices: readonly number[]
  pathEdges: readonly number[]
  interactive: boolean
  highlightMoves: boolean
  showDegrees: boolean
  marks: BoardMarks | null
  shake: { vertex: number; key: number } | null
  onVertex: (vertex: number, fromDrag: boolean) => void
  onEdge: (edge: number) => void
}

export function GraphBoard({
  graph,
  pathVertices,
  pathEdges,
  interactive,
  highlightMoves,
  showDegrees,
  marks,
  shake,
  onVertex,
  onEdge,
}: GraphBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ pointerId: number; last: number } | null>(null)
  const { radius: r, vertices, edges } = graph

  const order = new Map(pathEdges.map((e, i) => [e, i]))
  const current = pathVertices.length > 0 ? pathVertices[pathVertices.length - 1] : -1
  const start = pathVertices.length > 0 ? pathVertices[0] : -1
  const candidateEdges = new Set<number>()
  const candidateVertices = new Set<number>()
  if (interactive && current >= 0) {
    for (const n of graph.adjacency[current]) {
      if (!order.has(n.edge)) {
        candidateEdges.add(n.edge)
        candidateVertices.add(n.to)
      }
    }
  }
  const remaining = graph.adjacency.map((list) => list.filter((n) => !order.has(n.edge)).length)
  const touched = new Set(pathVertices)
  const hinted = new Set(marks?.vertices ?? [])
  const badgeR = Math.max(10, Math.min(13, r * 0.48))

  function toBoard(e: PointerEvent<SVGSVGElement>) {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return null
    return { point: new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()), scale: ctm.a }
  }

  function vertexAt(x: number, y: number, reach: number): number {
    let best = -1
    let bestDist = Infinity
    for (const v of vertices) {
      const d = Math.hypot(v.x - x, v.y - y)
      if (d < bestDist) {
        bestDist = d
        best = v.id
      }
    }
    return bestDist <= reach ? best : -1
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!interactive || e.button > 0) return
    const hit = toBoard(e)
    if (!hit) return
    const slackPx = e.pointerType === 'touch' ? 16 : 6
    const v = vertexAt(hit.point.x, hit.point.y, r + slackPx / hit.scale)
    const edgeAttr = (e.target as Element).closest('[data-edge]')?.getAttribute('data-edge')
    if (v < 0 && edgeAttr == null) return

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { pointerId: e.pointerId, last: v }
    if (v >= 0) onVertex(v, false)
    else onEdge(Number(edgeAttr))
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!interactive || !drag || drag.pointerId !== e.pointerId) return
    const hit = toBoard(e)
    if (!hit) return
    const v = vertexAt(hit.point.x, hit.point.y, r * 1.05)
    if (v >= 0 && v !== drag.last) {
      drag.last = v
      onVertex(v, true)
    }
  }

  function endDrag() {
    dragRef.current = null
  }

  return (
    <svg
      ref={svgRef}
      className={`graph-board${interactive ? ' is-interactive' : ''}`}
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="img"
      aria-label={`Đồ thị gồm ${vertices.length} đỉnh và ${edges.length} cạnh`}
    >
      <g className="edges-idle">
        {edges.map((e) => {
          const a = vertices[e.u]
          const b = vertices[e.v]
          const cls = order.has(e.id)
            ? 'edge edge-base is-walked'
            : candidateEdges.has(e.id) && highlightMoves
              ? 'edge edge-base is-candidate'
              : 'edge edge-base'
          return <line key={e.id} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        })}
      </g>

      <g className="edges-walked">
        {pathEdges.map((edgeId, i) => {
          const from = vertices[pathVertices[i]]
          const to = vertices[pathVertices[i + 1]]
          const color = stepColor(i, edges.length)
          const d = `M${from.x} ${from.y}L${to.x} ${to.y}`
          return (
            <g key={edgeId} style={{ color }}>
              <path className="edge-glow" d={d} />
              <path className="edge-walk" d={d} pathLength={1} />
            </g>
          )
        })}
      </g>

      {marks?.edge !== undefined && <EdgeMark graph={graph} edge={marks.edge} className="edge-hint" />}
      {marks?.wrongEdge !== undefined && <EdgeMark graph={graph} edge={marks.wrongEdge} className="edge-wrong" />}

      <g className="edges-hit">
        {edges.map((e) => {
          const a = vertices[e.u]
          const b = vertices[e.v]
          return (
            <line
              key={e.id}
              data-edge={e.id}
              className={candidateEdges.has(e.id) ? 'edge-hit is-candidate' : 'edge-hit'}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={r * 1.1}
            />
          )
        })}
      </g>

      <g className="step-badges">
        {pathEdges.map((edgeId, i) => {
          const e = edges[edgeId]
          const x = (vertices[e.u].x + vertices[e.v].x) / 2
          const y = (vertices[e.u].y + vertices[e.v].y) / 2
          return (
            <g key={edgeId} transform={`translate(${x} ${y})`}>
              <g className="step-badge">
                <circle r={badgeR} fill={stepColor(i, edges.length)} />
                <text dy="0.36em" fontSize={badgeR * 1.05}>
                  {i + 1}
                </text>
              </g>
            </g>
          )
        })}
      </g>

      <g className="vertices">
        {vertices.map((v) => {
          const isCurrent = v.id === current
          const isCandidate = candidateVertices.has(v.id)
          const isDone = !isCurrent && touched.has(v.id) && remaining[v.id] === 0
          const isShaking = shake?.vertex === v.id
          const cls = [
            'vertex',
            isCurrent && 'is-current',
            isCandidate && highlightMoves && 'is-candidate',
            isDone && 'is-done',
            v.id === start && 'is-start',
            hinted.has(v.id) && 'is-hint',
            interactive && (current < 0 || isCandidate) && 'is-clickable',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <g key={v.id} transform={`translate(${v.x} ${v.y})`} className={cls}>
              <g key={isShaking ? shake.key : 0} className={isShaking ? 'vertex-body shake' : 'vertex-body'}>
                <circle className="vertex-halo" r={r + 10} />
                <circle className="vertex-hint-ring" r={r + 13} />
                <circle className="vertex-pulse" r={r} />
                <circle className="vertex-start-ring" r={r + 6} />
                <circle className="vertex-core" r={r} />
                <text className="vertex-label" dy="0.35em" fontSize={r * 0.84}>
                  {v.label}
                </text>
                {showDegrees && (
                  <g className="vertex-degree" transform={`translate(${r * 0.8} ${-r * 0.8})`}>
                    <circle r={r * 0.46} />
                    <text dy="0.36em" fontSize={r * 0.52}>
                      {graph.degrees[v.id]}
                    </text>
                  </g>
                )}
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function EdgeMark({ graph, edge, className }: { graph: Graph; edge: number; className: string }) {
  const e = graph.edges[edge]
  const a = graph.vertices[e.u]
  const b = graph.vertices[e.v]
  return <line className={className} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
}
