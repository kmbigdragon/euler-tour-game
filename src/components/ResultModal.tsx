import { getDifficulty, type DifficultyId } from '../game/difficulty.ts'
import { formatDuration } from '../game/format.ts'
import { Confetti } from './Confetti.tsx'
import { Icon } from './Icon.tsx'
import { Modal } from './Modal.tsx'

export interface WinInfo {
  timeMs: number
  stars: number
  isRecord: boolean
  previousBest: number | null
}

interface ResultModalProps {
  kind: 'won' | 'timeout'
  difficulty: DifficultyId
  win: WinInfo | null
  edgesDone: number
  edgesTotal: number
  undoCount: number
  hintCount: number
  onNewGraph: () => void
  onRetry: () => void
  onShowSolution: () => void
  onHome: () => void
  onClose: () => void
}

const WIN_TITLES = ['Hoàn thành!', 'Hoàn thành!', 'Tuyệt vời!', 'Xuất sắc!']

export function ResultModal({
  kind,
  difficulty,
  win,
  edgesDone,
  edgesTotal,
  undoCount,
  hintCount,
  onNewGraph,
  onRetry,
  onShowSolution,
  onHome,
  onClose,
}: ResultModalProps) {
  const level = getDifficulty(difficulty)

  if (kind === 'won' && win) {
    return (
      <>
        <Confetti />
        <Modal onClose={onClose} className="result-modal is-won">
          <div className="result-hero">
            <div className="result-badge">
              <Icon name="trophy" size={40} />
            </div>
            <h2>{WIN_TITLES[win.stars]}</h2>
            <p>
              Bạn đã đi qua cả {edgesTotal} con đường, mỗi đường đúng một lần.
            </p>
            <div className="stars" aria-label={`${win.stars} trên 3 sao`}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= win.stars ? 'star is-on' : 'star'} style={{ animationDelay: `${0.25 + i * 0.15}s` }}>
                  <Icon name="star" size={34} filled />
                </span>
              ))}
            </div>
          </div>

          <div className="result-stats">
            <div>
              <span className="result-stat-value">{formatDuration(win.timeMs)}</span>
              <span className="result-stat-label">Thời gian</span>
            </div>
            <div>
              <span className="result-stat-value">{undoCount}</span>
              <span className="result-stat-label">Hoàn tác</span>
            </div>
            <div>
              <span className="result-stat-value">{hintCount}</span>
              <span className="result-stat-label">Gợi ý</span>
            </div>
          </div>

          <div className={win.isRecord ? 'result-record is-new' : 'result-record'}>
            <Icon name="trophy" size={18} />
            {win.isRecord ? (
              <span>
                Kỷ lục mới ở mức <strong>{level.label}</strong>
                {win.previousBest !== null && <> (trước đó {formatDuration(win.previousBest)})</>}!
              </span>
            ) : (
              <span>
                Kỷ lục mức {level.label}: <strong>{formatDuration(win.previousBest ?? win.timeMs)}</strong>
              </span>
            )}
          </div>

          <div className="result-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onNewGraph}>
              <Icon name="shuffle" /> Đồ thị mới
            </button>
            <div className="result-actions-row">
              <button type="button" className="btn" onClick={onRetry}>
                <Icon name="reset" /> Chơi lại đồ thị này
              </button>
              <button type="button" className="btn" onClick={onClose}>
                <Icon name="eye" /> Xem đường đi
              </button>
            </div>
            <button type="button" className="btn btn-ghost" onClick={onHome}>
              <Icon name="home" /> Về trang chủ
            </button>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <Modal onClose={onClose} className="result-modal is-timeout">
      <div className="result-hero">
        <div className="result-badge">
          <Icon name="clock" size={40} />
        </div>
        <h2>Hết giờ!</h2>
        <p>
          Bạn đã đi được <strong>{edgesDone}</strong>/{edgesTotal} con đường. Đừng nản — thử lại nhé!
        </p>
      </div>
      <div className="result-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={onShowSolution}>
          <Icon name="eye" /> Xem lời giải
        </button>
        <div className="result-actions-row">
          <button type="button" className="btn" onClick={onRetry}>
            <Icon name="reset" /> Thử lại đồ thị này
          </button>
          <button type="button" className="btn" onClick={onNewGraph}>
            <Icon name="shuffle" /> Đồ thị mới
          </button>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          <Icon name="home" /> Về trang chủ
        </button>
      </div>
    </Modal>
  )
}
