import React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import "./_group.css";

export function CurrentChest() {
  return (
    <main className="vf-chest-frame">
      <header className="vf-chest-header">
        <button aria-label="Quay lại">
          <ArrowLeft size={23} />
        </button>
        <span>Mở rương</span>
      </header>
      <section className="vf-chest-stage">
        <article className="vf-chest-card vf-chest-card-current">
          <div className="vf-flat-chest" aria-label="Rương Gold hiện tại">
            <div className="vf-flat-chest-top">!</div>
            <div className="vf-flat-chest-body">
              <Lock size={18} />
            </div>
            <div className="vf-flat-chest-band" />
          </div>
          <h1 className="vf-chest-rarity">Phẩm chất Gold</h1>
          <p className="vf-chest-hint">Chạm vào rương để nâng cấp</p>
          <div className="vf-chest-dots" aria-label="Còn 3 lượt nâng cấp">
            <span />
            <span />
            <span />
          </div>
        </article>
      </section>
    </main>
  );
}
