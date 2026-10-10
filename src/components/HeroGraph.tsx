/**
 * "Ngôi nhà một nét": the classic one-stroke puzzle, drawn along its Euler
 * path on a loop. Its two odd vertices are the bottom corners.
 */
const POINTS = {
  bl: [22, 150],
  br: [158, 150],
  tl: [22, 72],
  tr: [158, 72],
  roof: [90, 14],
} as const

const ROUTE: (keyof typeof POINTS)[] = ['bl', 'tl', 'tr', 'bl', 'br', 'tl', 'roof', 'tr', 'br']
const D = ROUTE.map((k, i) => `${i === 0 ? 'M' : 'L'}${POINTS[k][0]} ${POINTS[k][1]}`).join(' ')
const DURATION = '7s'

export function HeroGraph() {
  return (
    <svg className="hero-graph" viewBox="0 0 180 170" role="img" aria-label="Ngôi nhà vẽ bằng một nét">
      <defs>
        <linearGradient id="hero-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#7b5cff" />
          <stop offset="55%" stopColor="#c04dff" />
          <stop offset="100%" stopColor="#ff5c9a" />
        </linearGradient>
      </defs>
      <path d={D} className="hero-idle" />
      <path d={D} className="hero-walk" pathLength={100} stroke="url(#hero-stroke)">
        <animate
          attributeName="stroke-dashoffset"
          values="100;0;0;0"
          keyTimes="0;0.62;0.85;1"
          dur={DURATION}
          repeatCount="indefinite"
        />
        <animate attributeName="opacity" values="1;1;1;0" keyTimes="0;0.62;0.85;1" dur={DURATION} repeatCount="indefinite" />
      </path>
      {Object.entries(POINTS).map(([key, [x, y]]) => (
        <circle key={key} className={key === 'bl' || key === 'br' ? 'hero-node is-odd' : 'hero-node'} cx={x} cy={y} r={9} />
      ))}
      <circle className="hero-traveler" r={6}>
        <animateMotion
          path={D}
          keyPoints="0;1;1;1"
          keyTimes="0;0.62;0.85;1"
          calcMode="linear"
          dur={DURATION}
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  )
}
