import { Icon } from './Icon.tsx'
import { Modal } from './Modal.tsx'

const SHORTCUTS: [string, string][] = [
  ['Z / Backspace', 'Hoàn tác một bước'],
  ['R', 'Đi lại từ đầu'],
  ['H', 'Gợi ý'],
  ['P / Space', 'Tạm dừng / tiếp tục'],
  ['N', 'Đồ thị mới'],
]

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Luật chơi" onClose={onClose} className="rules-modal">
      <p className="rules-lead">
        Hãy tìm <strong>đường đi Euler</strong>: một nét vẽ liền đi qua <strong>tất cả</strong> các con đường (cạnh)
        của đồ thị, mỗi con đường <strong>đúng một lần</strong>.
      </p>

      <ol className="rules-steps">
        <li>
          <span className="rules-num">1</span>
          <div>
            <strong>Chọn điểm xuất phát.</strong> Chạm vào một đỉnh bất kỳ.
          </div>
        </li>
        <li>
          <span className="rules-num">2</span>
          <div>
            <strong>Đi tiếp.</strong> Chạm vào một đỉnh kề (hoặc chạm vào con đường), hay giữ và kéo qua các đỉnh để vẽ
            liền một mạch.
          </div>
        </li>
        <li>
          <span className="rules-num">3</span>
          <div>
            <strong>Không đi lại.</strong> Con đường đã đi sẽ được tô màu và đánh số thứ tự, không thể đi lần nữa. Kéo
            ngược về đỉnh vừa đi để hoàn tác.
          </div>
        </li>
        <li>
          <span className="rules-num">4</span>
          <div>
            <strong>Về đích.</strong> Đi hết mọi con đường trước khi hết giờ là chiến thắng!
          </div>
        </li>
      </ol>

      <div className="rules-tip">
        <Icon name="hint" size={22} />
        <div>
          <strong>Bí quyết của Euler</strong>
          <p>
            Bậc của một đỉnh là số con đường nối vào nó. Mọi đồ thị trong trò chơi đều có đúng{' '}
            <strong>2 đỉnh bậc lẻ</strong> — đường đi phải bắt đầu ở một đỉnh bậc lẻ và kết thúc ở đỉnh bậc lẻ còn lại.
            Khi đang đi, tránh băng qua một "cây cầu" (con đường mà nếu đi qua sẽ tách phần còn lại làm đôi) nếu vẫn còn
            lựa chọn khác.
          </p>
        </div>
      </div>

      <div className="rules-scoring">
        <strong>Đánh giá sao</strong>
        <p>
          Hoàn thành được 3 sao, trừ 1 sao nếu dùng gợi ý và trừ 1 sao nếu hoàn tác quá 3 lần (mỗi lần "Đi lại" tính
          bằng 2 lần hoàn tác).
        </p>
      </div>

      <div className="rules-keys">
        <strong>Phím tắt</strong>
        <dl>
          {SHORTCUTS.map(([key, what]) => (
            <div key={key}>
              <dt>
                {key.split(' / ').map((k, i) => (
                  <span key={k}>
                    {i > 0 && ' / '}
                    <kbd>{k}</kbd>
                  </span>
                ))}
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </div>

      <footer className="modal-footer">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Đã hiểu, chơi thôi!
        </button>
      </footer>
    </Modal>
  )
}
