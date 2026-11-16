import React from "react";
import { Award } from "lucide-react";
import "./_group.css";

type MissionKind = "time" | "combo" | "review";

const missions: {
  level: number;
  title: string;
  description: string;
  reward: "Copper" | "Silver" | "Gold";
  progress: string;
  target: number;
  value: number;
  kind: MissionKind;
}[] = [
  {
    level: 1,
    title: "Học 5 phút",
    description: "Cộng thời gian trong phiên Ôn tập; tạm dừng khi app ở nền.",
    reward: "Copper",
    progress: "0/5 phút",
    target: 5,
    value: 0,
    kind: "time",
  },
  {
    level: 2,
    title: "Combo 10 câu liên tiếp",
    description: "Trả lời đúng liên tiếp 10 câu trong một phiên Ôn tập.",
    reward: "Silver",
    progress: "0/10 câu",
    target: 10,
    value: 0,
    kind: "combo",
  },
  {
    level: 3,
    title: "Ôn 90 từ",
    description: "Trả lời đủ số từ trong một hoặc nhiều lượt ôn hôm nay.",
    reward: "Gold",
    progress: "0/90 từ",
    target: 90,
    value: 0,
    kind: "review",
  },
];

const chestColors = {
  Copper: { outline: "#42261d", wood: "#985832", light: "#c7824c", trim: "#d9a263" },
  Silver: { outline: "#2f3b45", wood: "#687b8b", light: "#a4b1bd", trim: "#dce5ed" },
  Gold: { outline: "#3a2020", wood: "#75412f", light: "#b56a43", trim: "#f7c94e" },
};

function MissionPicture({ kind }: { kind: MissionKind }) {
  return (
    <svg width="76" height="76" viewBox="0 0 80 80" aria-hidden="true">
      {kind === "time" ? (
        <>
          <rect x="32" y="5" width="16" height="8" fill="#e9b949" />
          <rect x="36" y="2" width="8" height="5" fill="#23232d" />
          <circle cx="40" cy="44" r="29" fill="#23232d" />
          <circle cx="40" cy="43" r="25" fill="#e9b949" />
          <circle cx="40" cy="43" r="19" fill="#f7f3ea" />
          <circle cx="40" cy="43" r="14" fill="#2f4f86" />
          <rect x="38" y="29" width="4" height="15" fill="#f7f3ea" />
          <rect x="40" y="42" width="12" height="4" fill="#e9b949" />
          <rect x="10" y="22" width="5" height="5" fill="#f7f3ea" />
          <rect x="63" y="14" width="5" height="5" fill="#e9b949" />
          <rect x="36" y="67" width="8" height="5" fill="#e9b949" />
        </>
      ) : null}
      {kind === "combo" ? (
        <>
          <path d="M12 56 46 12 41 37 69 21 34 70 39 46Z" fill="#23232d" />
          <path d="M18 54 46 20 42 42 62 30 35 62 39 43Z" fill="#e9b949" />
          <path d="m16 59 8-2-4 7-8 3zm51-41 5-6v8l-6 5z" fill="#f7f3ea" />
        </>
      ) : null}
      {kind === "review" ? (
        <>
          <rect x="12" y="17" width="52" height="18" fill="#23232d" />
          <rect x="15" y="13" width="50" height="17" fill="#2f4f86" />
          <rect x="20" y="18" width="42" height="8" fill="#f7f3ea" />
          <rect x="12" y="34" width="56" height="19" fill="#23232d" />
          <rect x="15" y="30" width="52" height="18" fill="#e9b949" />
          <rect x="19" y="35" width="44" height="8" fill="#f7f3ea" />
          <rect x="9" y="52" width="60" height="18" fill="#23232d" />
          <rect x="12" y="48" width="56" height="17" fill="#3d5e96" />
          <rect x="17" y="53" width="46" height="7" fill="#f7f3ea" />
        </>
      ) : null}
    </svg>
  );
}

function PixelChest({ reward }: { reward: keyof typeof chestColors }) {
  const color = chestColors[reward];
  return (
    <svg width="86" height="76" viewBox="0 0 110 96" role="img" aria-label={`Rương ${reward}`}>
      <rect x="18" y="80" width="74" height="7" fill="#111827" opacity=".65" />
      <rect x="15" y="43" width="80" height="39" fill={color.outline} />
      <rect x="20" y="48" width="70" height="29" fill={color.wood} />
      <rect x="23" y="51" width="64" height="7" fill={color.light} />
      <rect x="23" y="61" width="64" height="6" fill={color.wood} />
      <rect x="23" y="70" width="64" height="5" fill={color.light} />
      <rect x="39" y="45" width="9" height="35" fill={color.trim} />
      <rect x="63" y="45" width="9" height="35" fill={color.trim} />
      <path d="M13 47V34h5V23h8V14h10V9h38v5h10v9h8v11h5v13z" fill={color.outline} />
      <path d="M18 43V33h5V23h8v-7h14v-4h22v4h14v7h8v10h5v10z" fill={color.wood} />
      <path d="M28 30V24h8v-5h38v5h8v6z" fill={color.light} />
      <rect x="38" y="13" width="8" height="33" fill={color.trim} />
      <rect x="64" y="13" width="8" height="33" fill={color.trim} />
      <rect x="48" y="57" width="15" height="17" fill={color.trim} />
      <rect x="53" y="61" width="6" height="9" fill={color.outline} />
    </svg>
  );
}

const navigation = [
  { label: "Thư Viện", image: "/__mockup/images/library.png" },
  { label: "Khóa học", image: "/__mockup/images/courses.png" },
  { label: "Ôn tập", image: "/__mockup/images/review.png" },
  { label: "Sổ từ", image: "/__mockup/images/notebook.png" },
  { label: "Nhiệm Vụ", image: "/__mockup/images/missions.png", active: true },
];

export function MissionArtworkRefresh() {
  return (
    <main className="vocabflow-mission-frame dark">
      <div className="mission-artwork-page">
        <header className="mission-artwork-heading">
          <div>
            <h1>Ba nhiệm vụ hôm nay</h1>
            <p>Mỗi ngày có nhiệm vụ mới</p>
          </div>
          <span className="mission-inline-wallet" aria-label="Số dư 150 Stone">
            <Award size={16} />
            <strong>150 Stone</strong>
          </span>
        </header>

        <div className="mission-tabs" aria-label="Các mục nhiệm vụ">
          <button className="selected">Nhiệm Vụ</button>
          <button>Cửa Hàng</button>
          <button>Bộ Sưu Tập</button>
        </div>

        <section className="mission-artwork-list" aria-label="Nhiệm vụ hằng ngày">
          {missions.map((mission) => (
            <article className="mission-artwork-card" key={mission.level}>
              <div className="mission-artwork-main">
                <span className="mission-artwork-activity">
                  <MissionPicture kind={mission.kind} />
                </span>
                <div className="mission-artwork-copy">
                  <span className="mission-level">CẤP {mission.level}</span>
                  <h2>{mission.title}</h2>
                  <p>{mission.description}</p>
                  <span className={`mission-chest-label ${mission.reward.toLowerCase()}`}>
                    Rương {mission.reward} khi hoàn thành
                  </span>
                </div>
                <span className="mission-artwork-chest">
                  <PixelChest reward={mission.reward} />
                </span>
              </div>
              <div className="mission-progress-row">
                <div className="mission-progress-track" role="progressbar" aria-valuenow={mission.value} aria-valuemin={0} aria-valuemax={mission.target}>
                  <span style={{ width: `${(mission.value / mission.target) * 100}%` }} />
                </div>
                <strong>{mission.progress}</strong>
              </div>
            </article>
          ))}
        </section>

        <p className="mission-footer">
          Stone, rương và tiến độ nhiệm vụ được lưu offline, rồi đồng bộ cùng dữ liệu tài khoản.
        </p>
      </div>

      <nav className="mission-bottom-nav" aria-label="Điều hướng chính">
        {navigation.map(({ image, label, active }) => (
          <button className={active ? "active" : ""} key={label}>
            <span><img src={image} alt="" /></span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
