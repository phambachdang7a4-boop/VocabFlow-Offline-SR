import React from "react";
import { Pressable, Text, View } from "react-native-web";
import { ReviewCardExtracted } from "./ReviewCardExtracted";
import { colors as c, F, Icon } from "./support";
import "./_group.css";

const word = {
  id: 1,
  term: "whimsical",
  meaning: "Tuyệt vời; Xuất sắc (adjective)",
  ipa: "/ˈwɪmzɪkəl/",
  example: "The artist’s whimsical paintings featured dancing animals and floating houses, bringing joy to viewers.",
  level: 2,
  reviewCount: 1,
};

const exercise = {
  kind: "cloze" as const,
  prompt: "The artist’s ________ paintings featured dancing animals and floating houses, bringing joy to viewers.",
  hint: "whimsi___l",
};

export function Current() {
  return (
    <div className="vocabflow-review-frame" style={{ paddingBottom: 26 }}>
      <View style={{ paddingTop: 42, paddingHorizontal: 22, paddingBottom: 18, backgroundColor: c.primary, flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: "#C8D3E8", fontFamily: F.s, fontSize: 11, letterSpacing: 1.6 }}>HỌC NGẮT QUÃNG</Text>
          <Text style={{ color: c.primaryForeground, fontFamily: F.b, fontSize: 28 }}>Phiên ôn tập</Text>
        </View>
        <Pressable accessibilityRole="button" style={{ width: 44, height: 44, borderRadius: 24, borderWidth: 1, borderColor: "#6680AC", alignItems: "center", justifyContent: "center" }}>
          <Icon name="settings" size={19} color={c.primaryForeground} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable accessibilityRole="button" style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.card }}>
            <Icon name="arrow-left" color={c.foreground} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 8, borderRadius: 8, backgroundColor: c.reviewTrack, overflow: "hidden" }}>
              <View style={{ width: "20%", height: 8, borderRadius: 8, backgroundColor: c.primary }} />
            </View>
            <Text style={{ color: c.mutedForeground, fontFamily: F.m, fontSize: 13 }}>Đã xong 1 / 5 từ</Text>
          </View>
        </View>
        <ReviewCardExtracted word={word} exercise={exercise} layout="separate" />
      </View>
    </div>
  );
}
