import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

interface CorviChestArtworkProps {
  size: number;
}

/** Compact offline vector art for VocabFlow's glasses-wearing raven mascot. */
export function CorviChestArtwork({ size }: CorviChestArtworkProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 190"
      accessible
      accessibilityLabel="Corvi, quạ đen bên rương Hắc Diệu Thạch"
    >
      <Ellipse cx="101" cy="174" rx="67" ry="8" fill="#08090B" opacity="0.48" />
      <Path d="M23 83h28m124 0h19M25 45v33m7-33v33m7-33v33m7-33v33m112-33v33m7-33v33m7-33v33" fill="none" stroke="#424955" strokeWidth="2" opacity="0.72" />
      <Path d="M22 43h33m104 0h33M20 85h35m104 0h35" fill="none" stroke="#767F8D" strokeWidth="2" opacity="0.72" />

      <Path
        d="M61 99c-13 1-27 13-34 28 18-6 31-5 43 1l13-19z"
        fill="#20242B"
        stroke="#AEB6C2"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path
        d="M65 92c-9-13-7-33 3-46 11-15 31-23 49-18 14 4 24 14 28 27l27 9-28 10c-5 17-20 28-39 28-15 0-29-4-40-10z"
        fill="#171A20"
        stroke="#D7D9DE"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M72 82c10-14 28-19 44-12 8 4 14 11 17 19-10 8-23 13-38 12-10-1-19-5-27-11z"
        fill="#292E37"
        stroke="#767F8D"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path d="M85 84c9-7 19-8 28-3M92 91c8-4 16-4 23-1" fill="none" stroke="#AEB6C2" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M141 54l29 10-29 8c3-6 3-12 0-18z" fill="#B7BEC9" stroke="#E7E9ED" strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx="112" cy="55" r="8.5" fill="#171A20" stroke="#D7D9DE" strokeWidth="2" />
      <Circle cx="131" cy="55" r="8.5" fill="#171A20" stroke="#D7D9DE" strokeWidth="2" />
      <Circle cx="112" cy="55" r="3" fill="#E9B949" />
      <Circle cx="131" cy="55" r="3" fill="#E9B949" />
      <Path d="M120 54h3m17-3 8-5" fill="none" stroke="#D7D9DE" strokeWidth="2" strokeLinecap="round" />
      <Path d="M82 91l17 10 5-5 6 5 16-10" fill="none" stroke="#AEB6C2" strokeWidth="2" strokeLinejoin="round" />
      <Path d="M91 98l9 5-7 6-8-7zm20 0-9 5 7 6 8-7z" fill="#B63A46" stroke="#E7A0A5" strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx="101" cy="103" r="2.5" fill="#E9B949" />
      <Path d="M83 101l-4 10m18-9-2 10" fill="none" stroke="#D7D9DE" strokeWidth="2" strokeLinecap="round" />

      <Path
        d="M36 112l14-13 53 9 52-8 13 12-9 10H45z"
        fill="#20242B"
        stroke="#D7D9DE"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path d="M44 114h116l-7 10H51z" fill="#383E49" stroke="#9BA4B1" strokeWidth="1.5" strokeLinejoin="round" />
      <Path
        d="M51 124h102v42H51z"
        fill="#111318"
        stroke="#AEB6C2"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path d="M62 131v27m80-27v27" fill="none" stroke="#424955" strokeWidth="2" />
      <Path d="M51 124h102v8H51z" fill="#292E37" />
      <Rect x="91" y="134" width="22" height="21" rx="4" fill="#D7D9DE" />
      <Path d="M102 140v8m-3-9a3 3 0 116 0" fill="none" stroke="#111318" strokeWidth="2" strokeLinecap="round" />
      <Path d="M57 166h90" fill="none" stroke="#E7E9ED" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
