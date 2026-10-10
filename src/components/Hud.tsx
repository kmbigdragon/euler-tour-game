import { getDifficulty, type DifficultyId } from '../game/difficulty.ts'
import { formatClock, formatCountdown, formatDuration } from '../game/format.ts'
import type { GameStatus } from '../game/state.ts'
import { LevelBars } from './Controls.tsx'
import { Icon } from './Icon.tsx'

interface HudProps {
  difficulty: DifficultyId
  vertexCount: number
  edgeCount: number
  edgesDone: number
  elapsedMs: number
  limitMs: number | null
  status: GameStatus
  sound: boolean
  onBack: () => void
  onToggleSound: () => void
  onOpenRules: () => void
  onOpenSettings: () => void
}

export function Hud({
  difficulty,
  vertexCount,
  edgeCount,
  edgesDone,
  elapsedMs,
  limitMs,
  status,
  sound,
  onBack,
  onToggleSound,
  onOpenRules,
  onOpenSettings,
}: HudProps) {
  const level = getDifficulty(difficulty)
  const remaining = limitMs === null ? null : Math.max(0, limitMs - elapsedMs)
  const ratio = limitMs === null || remaining === null ? 1 : remaining / limitMs
  const live = status === 'playing' || status === 'paused'
  const timerTone =
    remaining === null || !live ? '' : remaining <= 10_000 || ratio <= 0.1 ? ' is-danger' : ratio <= 0.3 ? ' is-warning' : ''

  return (
    <header className="hud">
      <div className="hud-left">
        <button type="button" className="btn icon-btn" onClick={onBack} aria-label="Về trang chủ" title="Về trang chủ">
          <Icon name="back" />
        </button>
        <div className="hud-level">
          <span className={`level-pill lvl-${difficulty}`}>
            <LevelBars level={level.level} />
            {level.label}
          </span>
          <span className="hud-meta">
            {vertexCount} đỉnh · {edgeCount} cạnh
          </span>
        </div>
      </div>

      <div className="hud-stats">
        <div className={`stat stat-timer${timerTone}${status === 'paused' ? ' is-paused' : ''}`}>
          <Icon name="clock" size={22} className="stat-icon" />
          <div className="stat-text">
            <span className="stat-value">
              {remaining === null ? formatDuration(elapsedMs) : formatCountdown(remaining)}
            </span>
            <span className="stat-label">
              {remaining === null ? (
                'Thời gian'
              ) : (
                <>
                  Còn lại<span className="stat-extra"> · đã chơi {formatClock(elapsedMs)}</span>
                </>
              )}
            </span>
          </div>
          {limitMs !== null && (
            <span className="meter" aria-hidden="true">
              <span style={{ transform: `scaleX(${ratio})` }} />
            </span>
          )}
        </div>

        <div className="stat stat-progress">
          <Icon name="route" size={22} className="stat-icon" />
          <div className="stat-text">
            <span className="stat-value">
              {edgesDone}
              <small>/{edgeCount}</small>
            </span>
            <span className="stat-label">Con đường đã đi</span>
          </div>
          <span className="meter" aria-hidden="true">
            <span style={{ transform: `scaleX(${edgeCount ? edgesDone / edgeCount : 0})` }} />
          </span>
        </div>
      </div>

      <div className="hud-right">
        <button
          type="button"
          className="btn icon-btn"
          onClick={onToggleSound}
          aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
          title={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          <Icon name={sound ? 'volume' : 'mute'} />
        </button>
        <button type="button" className="btn icon-btn" onClick={onOpenRules} aria-label="Luật chơi" title="Luật chơi">
          <Icon name="help" />
        </button>
        <button type="button" className="btn icon-btn" onClick={onOpenSettings} aria-label="Cài đặt" title="Cài đặt">
          <Icon name="settings" />
        </button>
      </div>
    </header>
  )
}
