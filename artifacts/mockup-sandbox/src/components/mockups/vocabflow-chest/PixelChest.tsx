import React from "react";
import { ArrowLeft } from "lucide-react";
import "./_group.css";

function GoldChestSprite() {
  return (
    <svg
      className="vf-pixel-chest"
      viewBox="0 0 220 202"
      role="img"
      aria-label="Rương Gold bằng pixel-art"
    >
      <rect x="36" y="168" width="148" height="12" fill="#452622" opacity=".72" />
      <rect x="28" y="86" width="164" height="82" fill="#3A2020" />
      <rect x="34" y="92" width="152" height="68" fill="#75412F" />
      <rect x="40" y="96" width="140" height="12" fill="#A85F3A" />
      <rect x="40" y="112" width="140" height="10" fill="#75412F" />
      <rect x="40" y="126" width="140" height="12" fill="#A85F3A" />
      <rect x="40" y="142" width="140" height="12" fill="#75412F" />
      <rect x="60" y="94" width="5" height="64" fill="#452622" opacity=".55" />
      <rect x="154" y="94" width="5" height="64" fill="#452622" opacity=".55" />
      <rect x="70" y="88" width="15" height="76" fill="#F7C94E" />
      <rect x="73" y="94" width="5" height="64" fill="#B56A43" />
      <rect x="135" y="88" width="15" height="76" fill="#F7C94E" />
      <rect x="140" y="94" width="5" height="64" fill="#B56A43" />
      <rect x="34" y="156" width="152" height="10" fill="#F7C94E" />
      <rect x="40" y="159" width="140" height="4" fill="#B56A43" />
      <rect x="42" y="112" width="8" height="8" fill="#F7C94E" />
      <rect x="170" y="112" width="8" height="8" fill="#F7C94E" />
      <rect x="42" y="138" width="8" height="8" fill="#F7C94E" />
      <rect x="170" y="138" width="8" height="8" fill="#F7C94E" />
      <rect x="94" y="117" width="32" height="34" fill="#452622" />
      <rect x="98" y="121" width="24" height="27" fill="#F7C94E" />
      <rect x="103" y="125" width="14" height="18" fill="#B56A43" />
      <rect x="108" y="129" width="5" height="9" fill="#452622" />
      <rect x="106" y="137" width="9" height="6" fill="#452622" />
      <rect x="44" y="78" width="10" height="10" fill="#C77DE0" />
      <rect x="166" y="78" width="10" height="10" fill="#C77DE0" />
      <path
        d="M27 100V70H33V52H42V37H52V25H68V16H152V25H168V37H178V52H187V70H193V100Z"
        fill="#3A2020"
      />
      <path
        d="M34 94V68H40V50H49V39H58V29H71V22H149V29H162V39H171V50H180V68H186V94Z"
        fill="#8C4D32"
      />
      <path
        d="M46 66V51H54V41H65V33H155V41H166V51H174V66Z"
        fill="#B56A43"
      />
      <rect x="70" y="22" width="14" height="74" fill="#F7C94E" />
      <rect x="74" y="27" width="5" height="63" fill="#B56A43" />
      <rect x="136" y="22" width="14" height="74" fill="#F7C94E" />
      <rect x="140" y="27" width="5" height="63" fill="#B56A43" />
      <rect x="34" y="88" width="152" height="10" fill="#F7C94E" />
      <rect x="41" y="91" width="138" height="4" fill="#B56A43" />
      <rect x="44" y="69" width="8" height="8" fill="#C77DE0" />
      <rect x="168" y="69" width="8" height="8" fill="#C77DE0" />
      <rect x="103" y="67" width="14" height="14" fill="#F7C94E" />
    </svg>
  );
}

export function PixelChest() {
  return (
    <main className="vf-chest-frame">
      <header className="vf-chest-header">
        <button aria-label="Quay lại">
          <ArrowLeft size={23} />
        </button>
        <span>Mở rương</span>
      </header>
      <section className="vf-chest-stage">
        <article className="vf-chest-card vf-chest-card-pixel">
          <GoldChestSprite />
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
