import { useState } from 'react'
import { DIFFICULTIES, type DifficultyId } from '../game/difficulty.ts'
import { formatDuration, formatSeconds } from '../game/format.ts'
import { loadRecords, type Settings } from '../game/storage.ts'
import { LevelBars } from './Controls.tsx'
import { HeroGraph } from './HeroGraph.tsx'
import { Icon } from './Icon.tsx'
import './HomeScreen.css'

interface HomeScreenProps {
  difficulty: DifficultyId
  settings: Settings
  onDifficultyChange: (difficulty: DifficultyId) => void
  onStart: () => void
  onOpenSettings: () => void
  onOpenRules: () => void
}

export function HomeScreen({
  difficulty,
  settings,
  onDifficultyChange,
  onStart,
  onOpenSettings,
  onOpenRules,
}: HomeScreenProps) {
  const [records] = useState(loadRecords)

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-art">
          <HeroGraph />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Minigame đồ thị · Vẽ một nét</span>
          <h1 className="title">
            Euler <span className="title-grad">Tour</span>
          </h1>
          <p className="tagline">
            Chọn một đỉnh, rồi đi qua <strong>tất cả</strong> các con đường — mỗi con đường{' '}
            <strong>đúng một lần</strong>.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn" onClick={onOpenRules}>
              <Icon name="help" /> Luật chơi
            </button>
            <button type="button" className="btn" onClick={onOpenSettings}>
              <Icon name="settings" /> Cài đặt
            </button>
          </div>
        </div>
      </section>

      <section className="setup card">
        <div className="setup-head">
          <h2>Chọn độ khó</h2>
          <span className="setup-timer">
            <Icon name="clock" size={16} />
            {settings.timeLimitEnabled ? 'Có giới hạn thời gian' : 'Không giới hạn thời gian'}
          </span>
        </div>

        <div className="levels" role="radiogroup" aria-label="Độ khó">
          {DIFFICULTIES.map((d) => {
            const record = records[d.id]
            const selected = d.id === difficulty
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`level-card lvl-${d.id}${selected ? ' is-selected' : ''}`}
                onClick={() => onDifficultyChange(d.id)}
                onDoubleClick={onStart}
              >
                <span className="level-top">
                  <LevelBars level={d.level} />
                  <span className="level-check">
                    <Icon name="check" size={14} />
                  </span>
                </span>
                <span className="level-name">{d.label}</span>
                <span className="level-desc">{d.description}</span>
                <span className="level-specs">
                  <span>
                    {d.vertices[0]}–{d.vertices[1]} đỉnh
                  </span>
                  <span>
                    {d.edges[0]}–{d.edges[1]} cạnh
                  </span>
                </span>
                <span className="level-foot">
                  <span title="Giới hạn thời gian">
                    <Icon name="clock" size={14} />
                    {settings.timeLimitEnabled ? formatSeconds(settings.timeLimits[d.id]) : '∞'}
                  </span>
                  <span title="Kỷ lục của bạn">
                    <Icon name="trophy" size={14} />
                    {record.bestMs !== null ? formatDuration(record.bestMs) : '—'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <button type="button" className="btn btn-primary btn-lg start-btn" onClick={onStart}>
          <Icon name="play" filled /> Bắt đầu
        </button>
        <p className="setup-note">
          Mỗi lần bắt đầu, số đỉnh, số cạnh và hình dạng đồ thị đều được sinh ngẫu nhiên.
        </p>
      </section>
    </div>
  )
}
