import { useState } from "react";
import {
  Award,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  Clock3,
  Gift,
  GraduationCap,
  Layers3,
  RefreshCw,
  Sparkles,
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

const bottomItems = [
  { label: "Thư Viện", Icon: BookOpen },
  { label: "Khóa học", Icon: GraduationCap },
  { label: "Ôn tập", Icon: RefreshCw },
  { label: "Sổ từ", Icon: BookMarked },
  { label: "Nhiệm Vụ", Icon: ClipboardCheck },
];

const rarityStyles: Record<string, { text: string; badge: string; border: string }> = {
  Copper: {
    text: "text-[#e8b878]",
    badge: "from-[#a96338] to-[#714324]",
    border: "border-[#d2915b]/55",
  },
  Silver: {
    text: "text-[#d8e2ee]",
    badge: "from-[#aebdd0] to-[#697c95]",
    border: "border-[#c7d5e6]/55",
  },
  Gold: {
    text: "text-[#f5d775]",
    badge: "from-[#edc45c] to-[#a97827]",
    border: "border-[#f0cf70]/65",
  },
};

export function MissionRefresh() {
  const [activeTab, setActiveTab] = useState("Nhiệm Vụ");
  const [activeNav, setActiveNav] = useState("Nhiệm Vụ");

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#171b2a] text-[#f3f1eb]">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[radial-gradient(ellipse_at_50%_-15%,#39496f_0%,#20283e_39%,#171b2a_77%)] pb-[104px] shadow-[0_0_70px_rgba(7,10,20,.35)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.13] [background-image:radial-gradient(#b9c6e1_0.6px,transparent_0.6px)] [background-size:8px_8px]" />

        <div className="relative space-y-5 px-[18px] pb-7 pt-5 sm:px-6">
          <header className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a9bbd9]">
                  VocabFlow · Hành trình hôm nay
                </p>
                <h1 className="mt-1 text-[25px] font-extrabold leading-tight tracking-[-.035em] text-[#fffaf0]">
                  Ba nhiệm vụ hôm nay
                </h1>
                <p className="mt-1 text-[13px] leading-5 text-[#b8c1d2]">
                  Mỗi ngày có nhiệm vụ mới
                </p>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-[#8293b3]/35 bg-[#2a3550]/90 text-[#f0cd76] shadow-[inset_0_1px_rgba(255,255,255,.1)]">
                <Sparkles size={20} strokeWidth={1.8} />
              </div>
            </div>

            <div className="flex rounded-[17px] border border-[#7486a8]/35 bg-[#161d30]/75 p-1 shadow-[inset_0_1px_4px_rgba(0,0,0,.28)]" aria-label="Các mục nhiệm vụ">
              {["Nhiệm Vụ", "Cửa Hàng", "Bộ Sưu Tập"].map((tab) => {
                const selected = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveTab(tab)}
                    className={`min-h-[39px] min-w-0 flex-1 rounded-[12px] px-1 text-[11px] font-bold tracking-[-.02em] transition-all duration-200 sm:text-xs ${
                      selected
                        ? "bg-gradient-to-b from-[#536c9c] to-[#344c78] text-[#fff8e9] shadow-[0_2px_8px_rgba(5,10,22,.3),inset_0_1px_rgba(255,255,255,.16)]"
                        : "text-[#aebbd0] hover:bg-white/[.05]"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </header>

          <section className="relative flex min-h-[75px] items-center gap-3 overflow-hidden rounded-[20px] border border-[#8f9db6]/30 bg-gradient-to-r from-[#303d59] via-[#293650] to-[#222d45] px-4 py-3 shadow-[0_8px_20px_rgba(5,8,17,.22),inset_0_1px_rgba(255,255,255,.09)]" aria-label="Số dư">
            <div aria-hidden="true" className="absolute -right-3 -top-8 h-24 w-24 rounded-full bg-[#e4b957]/[.09] blur-2xl" />
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#ffe49a]/30 bg-gradient-to-br from-[#f0d17c] to-[#be8a39] text-[#3a2c18] shadow-[0_3px_10px_rgba(0,0,0,.2)]">
              <Award size={23} strokeWidth={2} />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="text-[9px] font-extrabold tracking-[.2em] text-[#b8c4d7]">SỐ DƯ</p>
              <p className="mt-0.5 text-[19px] font-extrabold leading-tight tracking-[-.035em] text-[#fff4d6]">124 Stone</p>
            </div>
            <span className="relative rounded-full border border-[#aab7cc]/20 bg-[#182238]/50 px-2.5 py-1 text-[10px] font-semibold text-[#bdc8d8]">
              Hôm nay
            </span>
          </section>

          <section className="space-y-3" aria-label="Nhiệm vụ hằng ngày">
            {missions.map(({ Icon, ...mission }) => {
              const percentage = Math.min(100, (mission.value / mission.target) * 100);
              const rarity = rarityStyles[mission.reward];
              return (
                <article
                  key={mission.level}
                  aria-label={`Cấp ${mission.level}. ${mission.title}. Tiến độ ${mission.progress}. Rương ${mission.reward} khi hoàn thành.`}
                  className="group relative overflow-hidden rounded-[22px] border border-[#8297bf]/40 bg-[linear-gradient(118deg,rgba(109,137,183,.38)_0%,rgba(59,81,122,.86)_43%,rgba(39,57,91,.98)_100%)] p-[14px] shadow-[0_7px_18px_rgba(5,9,19,.26),inset_0_1px_rgba(255,255,255,.13)] sm:p-4"
                >
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 [background:linear-gradient(135deg,rgba(255,255,255,.07),transparent_36%,transparent_76%,rgba(8,15,31,.15))]" />
                  <div className="relative flex min-w-0 items-start gap-[10px] sm:gap-3">
                    <span className="mt-1 grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[15px] border border-[#d6e1f0]/15 bg-[#243451]/75 text-[#f5d47d] shadow-[inset_0_1px_5px_rgba(0,0,0,.22)] sm:h-12 sm:w-12">
                      <Icon size={21} strokeWidth={2.1} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-extrabold tracking-[.18em] text-[#c1d0e9]">CẤP {mission.level}</p>
                      <h2 className="mt-0.5 break-words text-[15px] font-extrabold leading-[1.25] tracking-[-.025em] text-[#fffaf0] sm:text-[16px]">
                        {mission.title}
                      </h2>
                      <p className="mt-1 text-[11px] leading-[1.45] text-[#d0d8e6] sm:text-[12px]">
                        {mission.description}
                      </p>
                      <p className={`mt-1.5 text-[10px] font-bold leading-4 ${rarity.text}`}>
                        Rương {mission.reward} khi hoàn thành
                      </p>
                    </div>
                    <span
                      className={`relative mt-2 grid h-[43px] w-[43px] shrink-0 place-items-center rounded-[14px] border ${rarity.border} bg-gradient-to-br ${rarity.badge} text-[#fff2ce] shadow-[0_4px_9px_rgba(7,9,16,.24),inset_0_1px_rgba(255,255,255,.3)] sm:h-[46px] sm:w-[46px]`}
                      aria-label={`Rương ${mission.reward}`}
                    >
                      <Gift size={23} strokeWidth={1.8} />
                      <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#fff0b7] shadow-[0_0_8px_rgba(255,240,183,.7)]" />
                    </span>
                  </div>
                  <div className="relative mt-3 flex items-center gap-2.5">
                    <div
                      className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#18243c]/90 shadow-[inset_0_1px_3px_rgba(0,0,0,.35)]"
                      role="progressbar"
                      aria-label={`Tiến độ ${mission.progress}`}
                      aria-valuenow={mission.value}
                      aria-valuemin={0}
                      aria-valuemax={mission.target}
                    >
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#f3d477] to-[#d5a949] transition-[width] duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <strong className="min-w-[61px] text-right text-[11px] font-bold tabular-nums text-[#e0e8f3] sm:min-w-[68px] sm:text-xs">
                      {mission.progress}
                    </strong>
                  </div>
                </article>
              );
            })}
          </section>

          <p className="border-l-2 border-[#8297bd]/45 pl-3 text-[10px] leading-[1.55] text-[#aeb8ca] sm:text-[11px]">
            Stone, rương và tiến độ nhiệm vụ được lưu offline, rồi đồng bộ cùng dữ liệu tài khoản.
          </p>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex min-h-[79px] max-w-[480px] items-stretch border-t border-[#91a4c7]/35 bg-[linear-gradient(180deg,rgba(59,82,128,.97),rgba(38,58,96,.99))] px-1 pb-[max(7px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(7,12,23,.3)]" aria-label="Điều hướng chính">
          {bottomItems.map(({ label, Icon }) => {
            const active = activeNav === label;
            return (
              <button
                key={label}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setActiveNav(label)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-start gap-1 rounded-xl px-0.5 text-[9px] font-semibold transition-all duration-200 sm:text-[10px] ${
                  active ? "text-[#fff5d9]" : "text-[#d1d9e8] hover:text-white"
                }`}
              >
                <span className={`grid h-[40px] w-[46px] max-w-full place-items-center rounded-[13px] transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-b from-[#f2d579] to-[#d6ae4f] text-[#303044] shadow-[0_3px_9px_rgba(10,15,25,.3),inset_0_1px_rgba(255,255,255,.5)]"
                    : "text-[#d7dfed]"
                }`}>
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.9} />
                </span>
                <small className="max-w-full truncate text-center leading-none">{label}</small>
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
