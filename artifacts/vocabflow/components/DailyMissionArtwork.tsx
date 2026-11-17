import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { type DailyMissionType } from "@/domain/daily-missions";

export function DailyMissionArtwork({
  type,
  size = 72,
}: {
  type: DailyMissionType;
  size?: number;
}) {
  const c = useColors();
  const blue = c.vocabCard;
  const blueLight = c.headerButton;
  const gold = c.vocabCardAccent;
  const paper = c.vocabCardForeground;
  const outline = c.foreground;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
    >
      {type === "time" ? (
        <>
          <Rect x="32" y="5" width="16" height="8" fill={gold} />
          <Rect x="36" y="2" width="8" height="5" fill={outline} />
          <Rect x="24" y="12" width="8" height="5" fill={blueLight} />
          <Rect x="48" y="12" width="8" height="5" fill={blueLight} />
          <Circle cx="40" cy="44" r="29" fill={outline} />
          <Circle cx="40" cy="43" r="25" fill={gold} />
          <Circle cx="40" cy="43" r="19" fill={paper} />
          <Circle cx="40" cy="43" r="14" fill={blue} />
          <Rect x="38" y="29" width="4" height="15" fill={paper} />
          <Rect x="40" y="42" width="12" height="4" fill={gold} />
          <Rect x="10" y="22" width="5" height="5" fill={gold} />
          <Rect x="63" y="14" width="5" height="5" fill={gold} />
          <Path d="M9 57h6v6H9zm57-13h6v6h-6z" fill={blueLight} />
          <Rect x="36" y="67" width="8" height="5" fill={gold} />
        </>
      ) : null}

      {type === "combo" ? (
        <>
          <Path
            d="M12 56 46 12 41 37 69 21 34 70 39 46Z"
            fill={outline}
          />
          <Path
            d="M18 54 46 20 42 42 62 30 35 62 39 43Z"
            fill={gold}
          />
          <Path d="m16 59 8-2-4 7-8 3zm51-41 5-6v8l-6 5z" fill={paper} />
          <Rect x="9" y="35" width="7" height="4" fill={blueLight} />
          <Rect x="60" y="63" width="7" height="4" fill={blueLight} />
        </>
      ) : null}

      {type === "review" ? (
        <>
          <Rect x="12" y="17" width="52" height="18" fill={outline} />
          <Rect x="15" y="13" width="50" height="17" fill={blue} />
          <Rect x="20" y="18" width="42" height="8" fill={paper} />
          <Rect x="12" y="34" width="56" height="19" fill={outline} />
          <Rect x="15" y="30" width="52" height="18" fill={gold} />
          <Rect x="19" y="35" width="44" height="8" fill={paper} />
          <Rect x="9" y="52" width="60" height="18" fill={outline} />
          <Rect x="12" y="48" width="56" height="17" fill={blueLight} />
          <Rect x="17" y="53" width="46" height="7" fill={paper} />
          <Rect x="24" y="18" width="4" height="8" fill={gold} />
          <Rect x="57" y="35" width="4" height="8" fill={blue} />
          <Rect x="19" y="53" width="4" height="7" fill={gold} />
        </>
      ) : null}

      {type === "add-words" ? (
        <>
          <Path d="M8 18h23q7 0 9 6 2-6 9-6h23v43H49q-7 0-9 6-2-6-9-6H8z" fill={outline} />
          <Path d="M13 23h17q6 0 8 5v31q-4-4-9-4H13zm54 0H50q-6 0-8 5v31q4-4 9-4h16z" fill={paper} />
          <Rect x="38" y="27" width="4" height="31" fill={gold} />
          <Rect x="18" y="31" width="14" height="3" fill={blueLight} />
          <Rect x="18" y="38" width="14" height="3" fill={blueLight} />
          <Rect x="18" y="45" width="12" height="3" fill={blueLight} />
          <Rect x="48" y="31" width="14" height="3" fill={blueLight} />
          <Rect x="48" y="38" width="14" height="3" fill={blueLight} />
          <Rect x="48" y="45" width="12" height="3" fill={blueLight} />
          <Circle cx="64" cy="62" r="11" fill={gold} />
          <Rect x="62" y="56" width="4" height="12" fill={outline} />
          <Rect x="58" y="60" width="12" height="4" fill={outline} />
        </>
      ) : null}

      {type === "grade" ? (
        <>
          <Path d="m23 45-5 27 19-9 20 9-5-27z" fill={blue} />
          <Path d="m27 46-3 18 13-6 14 6-3-18z" fill={gold} />
          <Circle cx="40" cy="33" r="26" fill={outline} />
          <Circle cx="40" cy="32" r="22" fill={gold} />
          <Path d="m40 15 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill={paper} />
          <Path d="m33 32 5 5 10-11" fill="none" stroke={blue} strokeWidth="4" />
        </>
      ) : null}
    </Svg>
  );
}
