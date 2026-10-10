import { DIFFICULTIES } from '../game/difficulty.ts'
import { formatSeconds } from '../game/format.ts'
import {
  defaultTimeLimits,
  TIME_LIMIT_MAX,
  TIME_LIMIT_MIN,
  type Settings,
  type ThemeMode,
} from '../game/storage.ts'
import { Segmented, Stepper, SwitchRow } from './Controls.tsx'
import { Modal } from './Modal.tsx'

interface SettingsModalProps {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
  inGame?: boolean
}

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: 'Tự động' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
]

export function SettingsModal({ settings, onChange, onClose, inGame }: SettingsModalProps) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  return (
    <Modal title="Cài đặt" onClose={onClose} className="settings-modal">
      <section className="settings-section">
        <h3>Thời gian</h3>
        <SwitchRow
          label="Giới hạn thời gian"
          description="Phải đi hết mọi con đường trước khi đồng hồ về 0"
          checked={settings.timeLimitEnabled}
          onChange={(v) => set('timeLimitEnabled', v)}
        />
        <div className={`time-limits${settings.timeLimitEnabled ? '' : ' is-disabled'}`}>
          {DIFFICULTIES.map((d) => (
            <div key={d.id} className="time-row">
              <span className={`level-dot lvl-${d.id}`} />
              <span className="time-row-label">{d.label}</span>
              <Stepper
                label={`thời gian mức ${d.label}`}
                value={settings.timeLimits[d.id]}
                min={TIME_LIMIT_MIN}
                max={TIME_LIMIT_MAX}
                format={formatSeconds}
                disabled={!settings.timeLimitEnabled}
                onChange={(v) => set('timeLimits', { ...settings.timeLimits, [d.id]: v })}
              />
            </div>
          ))}
          <button
            type="button"
            className="link-btn"
            disabled={!settings.timeLimitEnabled}
            onClick={() => set('timeLimits', defaultTimeLimits())}
          >
            Khôi phục mặc định
          </button>
        </div>
        {inGame && <p className="settings-note">Thay đổi về thời gian sẽ áp dụng từ ván tiếp theo.</p>}
      </section>

      <section className="settings-section">
        <h3>Hỗ trợ khi chơi</h3>
        <SwitchRow
          label="Tô sáng nước đi hợp lệ"
          description="Làm nổi bật các đỉnh và con đường có thể đi tiếp"
          checked={settings.highlightMoves}
          onChange={(v) => set('highlightMoves', v)}
        />
        <SwitchRow
          label="Hiển thị bậc của đỉnh"
          description="Số con đường nối vào mỗi đỉnh — manh mối để chọn điểm xuất phát"
          checked={settings.showDegrees}
          onChange={(v) => set('showDegrees', v)}
        />
      </section>

      <section className="settings-section">
        <h3>Âm thanh &amp; giao diện</h3>
        <SwitchRow label="Hiệu ứng âm thanh" checked={settings.sound} onChange={(v) => set('sound', v)} />
        <div className="setting-row">
          <span className="setting-text">
            <span className="setting-label">Giao diện</span>
          </span>
          <Segmented label="Giao diện" value={settings.theme} options={THEMES} onChange={(v) => set('theme', v)} />
        </div>
      </section>

      <footer className="modal-footer">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Xong
        </button>
      </footer>
    </Modal>
  )
}
