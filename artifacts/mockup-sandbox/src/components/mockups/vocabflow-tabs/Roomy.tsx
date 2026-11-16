import "./_group.css";

const tabs = [
  { label: "Thư Viện", icon: "library.png", width: 47, height: 36 },
  { label: "Khóa học", icon: "courses.png", width: 36, height: 38 },
  { label: "Ôn tập", icon: "review.png", width: 40, height: 39 },
  { label: "Sổ từ", icon: "notebook.png", width: 36, height: 39 },
  { label: "Nhiệm Vụ", icon: "missions.png", width: 32, height: 40 },
];

export function Roomy() {
  const selectedTab = "Ôn tập";

  return (
    <main className="vocabflow-tabs-preview">
      <div className="vocabflow-tabs-context">Màn hình ứng dụng</div>
      <nav
        aria-label="Điều hướng VocabFlow"
        className="vocabflow-tabs-bar vocabflow-tabs-roomy"
      >
        <div className="vocabflow-tabs-row">
          {tabs.map((tab, index) => {
            const selected = tab.label === selectedTab;
            return (
              <div
                aria-current={selected ? "page" : undefined}
                className={`vocabflow-tab-item ${
                  selected ? "vocabflow-tab-item-active" : ""
                }`}
                key={tab.label}
              >
                <div
                  className={`vocabflow-tab-icon ${
                    selected ? "vocabflow-tab-icon-active" : ""
                  }`}
                >
                  {index > 0 && !selected ? (
                    <span className="vocabflow-tab-divider" />
                  ) : null}
                  <img
                    alt=""
                    height={tab.height}
                    src={`/__mockup/images/vocabflow-tabs/${tab.icon}`}
                    width={tab.width}
                  />
                </div>
                <span>{tab.label}</span>
              </div>
            );
          })}
        </div>
        <div aria-hidden className="vocabflow-tabs-safe-area" />
      </nav>
    </main>
  );
}
