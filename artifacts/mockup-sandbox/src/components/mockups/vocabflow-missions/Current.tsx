import "./_group.css";
import {
  Award,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  Clock3,
  Gift,
  GraduationCap,
  Layers3,
  PlusCircle,
  RefreshCw,
  Zap,
} from "lucide-react";

const missions = [
  {
    level: 1,
    title: "Học 5 phút",
    description: "Cộng thời gian trong phiên Ôn tập; tạm dừng khi app ở nền.",
    reward: "Copper",
    progress: "0/5 phút",
    value: 0,
    target: 5,
    Icon: Clock3,
  },
  {
    level: 2,
    title: "Combo 10 câu liên tiếp",
    description: "Trả lời đúng liên tiếp 10 câu trong một phiên Ôn tập.",
    reward: "Silver",
    progress: "0/10 câu",
    value: 0,
    target: 10,
    Icon: Zap,
  },
  {
    level: 3,
    title: "Ôn 90 từ",
    description: "Trả lời đủ số từ trong một hoặc nhiều lượt ôn hôm nay.",
    reward: "Gold",
    progress: "0/90 từ",
    value: 0,
    target: 90,
    Icon: Layers3,
  },
];

const navigation = [
  { label: "Thư Viện", Icon: BookOpen },
  { label: "Khóa học", Icon: GraduationCap },
  { label: "Ôn tập", Icon: RefreshCw },
  { label: "Sổ từ", Icon: BookMarked },
  { label: "Nhiệm Vụ", Icon: ClipboardCheck, active: true },
];

export function Current() {
  return (
    <main className="vocabflow-mission-frame dark">
      <div className="mission-current-page">
        <div className="mission-tabs" aria-label="Các mục nhiệm vụ">
          <button className="selected">Nhiệm Vụ</button>
          <button>Cửa Hàng</button>
          <button>Bộ Sưu Tập</button>
        </div>

        <section className="mission-wallet" aria-label="Số dư">
          <span className="wallet-badge">
            <Award size={21} />
          </span>
          <div className="wallet-copy">
            <span className="wallet-kicker">SỐ DƯ</span>
            <strong>124 Stone</strong>
          </div>
          <span className="wallet-date">Hôm nay</span>
        </section>

        <header className="mission-heading">
          <h1>Ba nhiệm vụ hôm nay</h1>
          <p>Mỗi ngày có nhiệm vụ mới</p>
        </header>

        <div className="mission-list">
          {missions.map(({ Icon, ...mission }) => {
            const percentage = Math.min(
              100,
              (mission.value / mission.target) * 100,
            );
            return (
              <article
                className="mission-card"
                key={mission.level}
                aria-label={`Cấp ${mission.level}. ${mission.title}. Tiến độ ${mission.progress}. Rương ${mission.reward} khi hoàn thành.`}
              >
                <div className="mission-main-row">
                  <span className="mission-icon">
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                  <div className="mission-copy">
                    <span className="mission-level">CẤP {mission.level}</span>
                    <h2>{mission.title}</h2>
                    <p>{mission.description}</p>
                    <span className={`mission-chest-label ${mission.reward.toLowerCase()}`}>
                      Rương {mission.reward} khi hoàn thành
                    </span>
                  </div>
                  <span
                    className={`mission-reward ${mission.reward.toLowerCase()}`}
                    aria-label={`Rương ${mission.reward}`}
                  >
                    <Gift size={25} strokeWidth={1.8} />
                  </span>
                </div>
                <div className="mission-progress-row">
                  <div
                    className="mission-progress-track"
                    aria-label={`Tiến độ ${mission.progress}`}
                  >
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <strong>{mission.progress}</strong>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mission-footer">
          Stone, rương và tiến độ nhiệm vụ được lưu offline, rồi đồng bộ cùng dữ
          liệu tài khoản.
        </p>
      </div>

      <nav className="mission-bottom-nav" aria-label="Điều hướng chính">
        {navigation.map(({ Icon, label, active }) => (
          <button className={active ? "active" : ""} key={label}>
            <span>
              <Icon size={23} strokeWidth={2} />
            </span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
