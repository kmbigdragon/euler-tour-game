import { useEffect, useEffectEvent, useReducer, useRef, useState } from 'react'
import type { DifficultyId } from '../game/difficulty.ts'
import { findEulerTrail, solvablePrefix, suggestNextStep, type Trail } from '../game/euler.ts'
import { generateGraph } from '../game/generator.ts'
import { edgeBetween, otherEnd } from '../game/graph.ts'
import { playSound, type SoundName } from '../game/sound.ts'
import { createGame, elapsedAt, gameReducer, type GameState } from '../game/state.ts'
import { recordPlayed, recordWin, timeLimitMs, type Settings } from '../game/storage.ts'
import { useNow } from '../hooks/useNow.ts'
import { GraphBoard, type BoardMarks } from './GraphBoard.tsx'
import { Hud } from './Hud.tsx'
import { Icon } from './Icon.tsx'
import { Modal } from './Modal.tsx'
import { ResultModal, type WinInfo } from './ResultModal.tsx'
import { RulesModal } from './RulesModal.tsx'
import { SettingsModal } from './SettingsModal.tsx'
import { stepColor } from './stepColor.ts'
import './GameScreen.css'

interface GameScreenProps {
  difficulty: DifficultyId
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  onHome: () => void
}

type Overlay = 'settings' | 'rules' | 'leave' | null
type ToastTone = 'info' | 'error' | 'hint'

interface Toast {
  id: number
  text: string
  tone: ToastTone
}

/**
 * Aspect ratio of the space the board gets, so the graph layout fills it.
 * Measured when the board exists, otherwise estimated from the window.
 */
function boardAspect(canvas?: HTMLElement | null): number {
  if (canvas) {
    const style = getComputedStyle(canvas)
    const width = canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const height = canvas.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    if (width > 0 && height > 0) return width / height
  }
  const compact = window.innerWidth <= 760
  const width = compact ? window.innerWidth - 34 : Math.min(window.innerWidth - 40, 1280) - 36
  const height = window.innerHeight - (compact ? 308 : 280)
  return width / Math.max(240, height)
}

function starRating(game: GameState): number {
  let stars = 3
  if (game.hintCount > 0) stars--
  if (game.undoCount + game.resetCount * 2 > 3) stars--
  return Math.max(1, stars)
}

export function GameScreen({ difficulty, settings, onSettingsChange, onHome }: GameScreenProps) {
  const [game, dispatch] = useReducer(gameReducer, difficulty, (d) =>
    createGame(generateGraph(d, boardAspect()), d, timeLimitMs(settings, d), Date.now()),
  )
  const [toast, setToast] = useState<Toast | null>(null)
  const [marks, setMarks] = useState<BoardMarks | null>(null)
  const [shake, setShake] = useState<{ vertex: number; key: number } | null>(null)
  const [win, setWin] = useState<WinInfo | null>(null)
  const [resultOpen, setResultOpen] = useState(false)
  const [solution, setSolution] = useState<{ trail: Trail; step: number } | null>(null)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [resumeOnClose, setResumeOnClose] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const { graph, status, pathVertices, pathEdges } = game
  const now = useNow(status === 'playing')
  const elapsed = elapsedAt(game, now)
  const remainingMs = game.timeLimitMs === null ? null : game.timeLimitMs - elapsed
  const playing = status === 'playing'
  const over = status === 'won' || status === 'timeout' || status === 'gaveup'
  const current = pathVertices.length > 0 ? pathVertices[pathVertices.length - 1] : undefined
  const used = new Set(pathEdges)
  const edgesLeft = graph.edges.length - pathEdges.length
  const stuck =
    playing && current !== undefined && edgesLeft > 0 && graph.adjacency[current].every((n) => used.has(n.edge))
  const label = (v: number) => graph.vertices[v].label

  const sfx = (name: SoundName, progress?: number) => {
    if (settings.sound) playSound(name, progress)
  }
  const notify = (text: string, tone: ToastTone = 'info') => setToast({ id: Date.now(), text, tone })

  // ------------------------------------------------------------ timed effects

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), toast.tone === 'error' ? 2200 : 4200)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!marks) return
    const id = setTimeout(() => setMarks(null), 4500)
    return () => clearTimeout(id)
  }, [marks])

  useEffect(() => {
    if (!shake) return
    const id = setTimeout(() => setShake(null), 450)
    return () => clearTimeout(id)
  }, [shake])

  const onTimeUp = useEffectEvent(() => {
    dispatch({ type: 'timeout', now: Date.now() })
    setMarks(null)
    setResultOpen(true)
    sfx('lose')
  })
  const { timeLimitMs: limit, runningSince, accumulatedMs } = game
  useEffect(() => {
    if (limit === null || runningSince === null) return
    const left = limit - accumulatedMs - (Date.now() - runningSince)
    const id = setTimeout(onTimeUp, Math.max(0, left))
    return () => clearTimeout(id)
  }, [limit, runningSince, accumulatedMs])

  const onTick = useEffectEvent(() => sfx('tick'))
  const secondsLeft = remainingMs === null ? null : Math.ceil(remainingMs / 1000)
  useEffect(() => {
    if (playing && secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 10) onTick()
  }, [playing, secondsLeft])

  const onStuck = useEffectEvent(() => sfx('stuck'))
  useEffect(() => {
    if (stuck) onStuck()
  }, [stuck])

  // Solution replay, one edge at a time.
  useEffect(() => {
    if (!solution || solution.step >= solution.trail.edges.length) return
    const delay = Math.max(160, Math.min(520, 9000 / solution.trail.edges.length))
    const id = setTimeout(() => setSolution((s) => s && { ...s, step: s.step + 1 }), solution.step === 0 ? 450 : delay)
    return () => clearTimeout(id)
  }, [solution])

  // Pause when the tab is hidden so the clock is fair.
  const onHidden = useEffectEvent(() => {
    if (game.status === 'playing') dispatch({ type: 'pause', now: Date.now() })
  })
  useEffect(() => {
    const handler = () => {
      if (document.hidden) onHidden()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // ------------------------------------------------------------ actions

  function rejectMove(vertex: number, text: string) {
    setShake({ vertex, key: Date.now() })
    notify(text, 'error')
    sfx('error')
  }

  function traverse(edge: number, to: number) {
    const at = Date.now()
    setMarks(null)
    dispatch({ type: 'traverse', edge, to, now: at })
    const done = pathEdges.length + 1
    if (done === graph.edges.length) {
      const timeMs = elapsedAt(game, at)
      const { isRecord, previousBest } = recordWin(difficulty, timeMs)
      setWin({ timeMs, isRecord, previousBest, stars: starRating(game) })
      setResultOpen(true)
      sfx('win')
    } else {
      sfx('move', done / graph.edges.length)
    }
  }

  function handleVertex(v: number, fromDrag: boolean) {
    if (!playing) return
    if (current === undefined) {
      setMarks(null)
      dispatch({ type: 'start', vertex: v })
      sfx('start')
      return
    }
    if (v === current) return
    const edge = edgeBetween(graph, current, v)
    if (edge < 0) {
      if (!fromDrag) rejectMove(v, `Không có con đường nối ${label(current)} với ${label(v)}`)
      return
    }
    if (used.has(edge)) {
      // Stepping back along the last edge undoes it.
      if (edge === pathEdges[pathEdges.length - 1]) undo()
      else if (!fromDrag) rejectMove(v, `Con đường ${label(current)}–${label(v)} đã đi qua rồi`)
      return
    }
    traverse(edge, v)
  }

  function handleEdge(edge: number) {
    if (!playing) return
    if (current === undefined) {
      notify('Hãy chạm vào một đỉnh để chọn điểm xuất phát trước nhé')
      return
    }
    const e = graph.edges[edge]
    if (used.has(edge)) {
      notify('Con đường này đã đi qua rồi', 'error')
      sfx('error')
    } else if (e.u !== current && e.v !== current) {
      notify(`Con đường này không nối với đỉnh hiện tại (${label(current)})`, 'error')
      sfx('error')
    } else {
      traverse(edge, otherEnd(e, current))
    }
  }

  function undo() {
    if (!playing || pathVertices.length === 0) return
    dispatch({ type: 'undo' })
    setMarks(null)
    sfx('undo')
  }

  function resetPath() {
    if (!playing || pathVertices.length === 0) return
    dispatch({ type: 'reset-path' })
    setMarks(null)
    sfx('undo')
  }

  function hint() {
    if (!playing) return
    dispatch({ type: 'hint' })
    sfx('hint')
    const [a, b] = graph.oddVertices
    if (current === undefined) {
      setMarks({ vertices: graph.oddVertices })
      notify(`Hãy xuất phát từ ${label(a)} hoặc ${label(b)} — hai đỉnh bậc lẻ của đồ thị`, 'hint')
      return
    }
    const step = suggestNextStep(graph, pathEdges, current)
    if (step) {
      setMarks({ edge: step.edge, vertices: [step.to] })
      notify(`Thử đi từ ${label(current)} sang ${label(step.to)}`, 'hint')
      return
    }
    const k = solvablePrefix(graph, pathVertices, pathEdges)
    if (k < 0) {
      setMarks({ vertices: graph.oddVertices })
      notify(
        `Xuất phát từ ${label(pathVertices[0])} (bậc chẵn) thì không thể đi hết. Bấm "Đi lại" và chọn ${label(a)} hoặc ${label(b)}.`,
        'hint',
      )
    } else {
      setMarks({ wrongEdge: pathEdges[k] })
      notify(`Bước ${k + 1} đã rẽ sai. Hãy hoàn tác ${pathEdges.length - k} bước để quay lại.`, 'hint')
    }
  }

  function togglePause() {
    if (status === 'playing') dispatch({ type: 'pause', now: Date.now() })
    else if (status === 'paused') dispatch({ type: 'resume', now: Date.now() })
  }

  function clearRoundUi() {
    setWin(null)
    setResultOpen(false)
    setSolution(null)
    setMarks(null)
    setToast(null)
    setShake(null)
  }

  function newGraph() {
    recordPlayed(difficulty)
    clearRoundUi()
    dispatch({
      type: 'new-graph',
      graph: generateGraph(difficulty, boardAspect(canvasRef.current)),
      timeLimitMs: timeLimitMs(settings, difficulty),
      now: Date.now(),
    })
  }

  function retry() {
    recordPlayed(difficulty)
    clearRoundUi()
    dispatch({ type: 'retry', timeLimitMs: timeLimitMs(settings, difficulty), now: Date.now() })
  }

  function showSolution() {
    const start = pathVertices[0]
    const from = start !== undefined && graph.oddVertices.includes(start) ? start : graph.oddVertices[0]
    setResultOpen(false)
    setMarks(null)
    setSolution({ trail: findEulerTrail(graph, from), step: 0 })
  }

  function giveUp() {
    if (!playing && status !== 'paused') return
    dispatch({ type: 'give-up', now: Date.now() })
    sfx('lose')
    showSolution()
  }

  function openOverlay(next: Overlay) {
    if (status === 'playing') {
      dispatch({ type: 'pause', now: Date.now() })
      setResumeOnClose(true)
    }
    setOverlay(next)
  }

  function closeOverlay() {
    setOverlay(null)
    if (resumeOnClose) {
      dispatch({ type: 'resume', now: Date.now() })
      setResumeOnClose(false)
    }
  }

  function leave() {
    if (!over && pathEdges.length > 0) openOverlay('leave')
    else onHome()
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (overlay || resultOpen || e.altKey) return
    const target = e.target as HTMLElement | null
    if (target?.closest('input, textarea, select')) return
    const key = e.key.toLowerCase()
    const mod = e.ctrlKey || e.metaKey
    // Space on a focused button should press that button, not pause.
    if (key === ' ' && target?.closest('button')) return
    if (key === 'z' || key === 'backspace') undo()
    else if (mod) return
    else if (key === 'r') resetPath()
    else if (key === 'h') hint()
    else if (key === 'p' || key === ' ') togglePause()
    else if (key === 'n') newGraph()
    else return
    e.preventDefault()
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ------------------------------------------------------------ render

  const shownVertices = solution ? solution.trail.vertices.slice(0, solution.step + 1) : pathVertices
  const shownEdges = solution ? solution.trail.edges.slice(0, solution.step) : pathEdges
  const solutionDone = solution !== null && solution.step >= solution.trail.edges.length

  let statusLine: { tone: string; text: string; action?: { label: string; run: () => void } }
  if (solution) {
    const first = label(solution.trail.vertices[0])
    const last = label(solution.trail.vertices[solution.trail.vertices.length - 1])
    statusLine = {
      tone: 'info',
      text: `Lời giải mẫu: xuất phát từ ${first}, kết thúc tại ${last}`,
      action: solutionDone ? { label: 'Xem lại', run: showSolution } : undefined,
    }
  } else if (status === 'won') {
    statusLine = {
      tone: 'success',
      text: 'Hoàn thành! Bạn đã đi qua mọi con đường',
      action: { label: 'Kết quả', run: () => setResultOpen(true) },
    }
  } else if (status === 'timeout') {
    statusLine = { tone: 'danger', text: 'Hết giờ!', action: { label: 'Kết quả', run: () => setResultOpen(true) } }
  } else if (current === undefined) {
    statusLine = { tone: 'neutral', text: 'Chạm vào một đỉnh để chọn điểm xuất phát' }
  } else if (stuck) {
    statusLine = {
      tone: 'danger',
      text: `Bế tắc tại ${label(current)} — còn ${edgesLeft} con đường chưa đi`,
      action: { label: 'Hoàn tác', run: undo },
    }
  } else {
    statusLine = { tone: 'neutral', text: `Đang ở đỉnh ${label(current)} · chạm hoặc kéo tới đỉnh kề` }
  }

  const trailStart = Math.max(0, shownVertices.length - 16)

  return (
    <div className="game">
      <Hud
        difficulty={difficulty}
        vertexCount={graph.vertices.length}
        edgeCount={graph.edges.length}
        edgesDone={pathEdges.length}
        elapsedMs={elapsed}
        limitMs={game.timeLimitMs}
        status={status}
        sound={settings.sound}
        onBack={leave}
        onToggleSound={() => onSettingsChange({ ...settings, sound: !settings.sound })}
        onOpenRules={() => openOverlay('rules')}
        onOpenSettings={() => openOverlay('settings')}
      />

      <main className={`board${status === 'paused' && !overlay ? ' is-paused' : ''}`}>
        <div className={`board-status tone-${statusLine.tone}`} role="status">
          <span>{statusLine.text}</span>
          {statusLine.action && (
            <button type="button" onClick={statusLine.action.run}>
              {statusLine.action.label}
            </button>
          )}
        </div>

        <div className="board-canvas" ref={canvasRef}>
          <GraphBoard
            key={game.round}
            graph={graph}
            pathVertices={shownVertices}
            pathEdges={shownEdges}
            interactive={playing && !solution}
            highlightMoves={settings.highlightMoves}
            showDegrees={settings.showDegrees}
            marks={marks}
            shake={shake}
            onVertex={handleVertex}
            onEdge={handleEdge}
          />
        </div>

        {shownVertices.length > 0 && (
          <ol className="trail" aria-label="Đường đi">
            {trailStart > 0 && <li className="trail-more">…</li>}
            {shownVertices.slice(trailStart).map((v, i) => {
              const index = trailStart + i
              return (
                <li key={index}>
                  {index > 0 && (
                    <span className="trail-arrow" style={{ color: stepColor(index - 1, graph.edges.length) }}>
                      →
                    </span>
                  )}
                  <span className={index === shownVertices.length - 1 ? 'trail-node is-last' : 'trail-node'}>
                    {label(v)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {toast && (
          <div key={toast.id} className={`toast tone-${toast.tone}`} role="alert">
            <Icon name={toast.tone === 'hint' ? 'hint' : toast.tone === 'error' ? 'close' : 'help'} size={18} />
            <span>{toast.text}</span>
          </div>
        )}

        {status === 'paused' && !overlay && (
          <div className="pause-overlay">
            <div className="pause-card">
              <Icon name="pause" size={34} />
              <h2>Đã tạm dừng</h2>
              <p>Đồ thị được ẩn đi trong lúc tạm dừng.</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={togglePause}>
                <Icon name="play" filled /> Tiếp tục
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="controls" aria-label="Điều khiển">
        {over ? (
          <>
            <button type="button" className="ctrl" onClick={retry}>
              <Icon name="reset" />
              <span>Chơi lại</span>
            </button>
            {status !== 'won' && (
              <button type="button" className="ctrl" onClick={showSolution}>
                <Icon name="eye" />
                <span>Lời giải</span>
              </button>
            )}
            <button type="button" className="ctrl" onClick={onHome}>
              <Icon name="home" />
              <span>Trang chủ</span>
            </button>
            <button type="button" className="ctrl is-primary" onClick={newGraph}>
              <Icon name="shuffle" />
              <span>Đồ thị mới</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ctrl" onClick={undo} disabled={!playing || pathVertices.length === 0} title="Hoàn tác (Z)">
              <Icon name="undo" />
              <span>Hoàn tác</span>
            </button>
            <button type="button" className="ctrl" onClick={resetPath} disabled={!playing || pathVertices.length === 0} title="Đi lại từ đầu (R)">
              <Icon name="reset" />
              <span>Đi lại</span>
            </button>
            <button type="button" className="ctrl is-hint" onClick={hint} disabled={!playing} title="Gợi ý (H)">
              <Icon name="hint" />
              <span>Gợi ý</span>
              {game.hintCount > 0 && <span className="ctrl-badge">{game.hintCount}</span>}
            </button>
            <button type="button" className="ctrl" onClick={togglePause} title="Tạm dừng (P)">
              <Icon name={status === 'paused' ? 'play' : 'pause'} filled={status === 'paused'} />
              <span>{status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}</span>
            </button>
            <button type="button" className="ctrl" onClick={giveUp} title="Bỏ cuộc và xem lời giải">
              <Icon name="flag" />
              <span>Bỏ cuộc</span>
            </button>
            <button type="button" className="ctrl is-primary" onClick={newGraph} title="Đồ thị mới (N)">
              <Icon name="shuffle" />
              <span>Đồ thị mới</span>
            </button>
          </>
        )}
      </nav>

      {resultOpen && (status === 'won' || status === 'timeout') && (
        <ResultModal
          kind={status}
          difficulty={difficulty}
          win={win}
          edgesDone={pathEdges.length}
          edgesTotal={graph.edges.length}
          undoCount={game.undoCount}
          hintCount={game.hintCount}
          onNewGraph={newGraph}
          onRetry={retry}
          onShowSolution={showSolution}
          onHome={onHome}
          onClose={() => setResultOpen(false)}
        />
      )}

      {overlay === 'settings' && (
        <SettingsModal settings={settings} onChange={onSettingsChange} onClose={closeOverlay} inGame />
      )}
      {overlay === 'rules' && <RulesModal onClose={closeOverlay} />}
      {overlay === 'leave' && (
        <Modal title="Rời khỏi ván chơi?" onClose={closeOverlay} className="confirm-modal">
          <p>Đường đi hiện tại sẽ không được lưu lại.</p>
          <footer className="modal-footer">
            <button type="button" className="btn" onClick={closeOverlay}>
              Ở lại
            </button>
            <button type="button" className="btn btn-danger" onClick={onHome}>
              Rời đi
            </button>
          </footer>
        </Modal>
      )}
    </div>
  )
}
