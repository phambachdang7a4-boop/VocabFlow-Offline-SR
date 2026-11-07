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

export function Inline() {
  return (
    <div className="vocabflow-review-frame" style={{ display: "flex", flexDirection: "column", padding: "20px 20px 28px" }}>
      <View style={{ paddingTop: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Thoát phiên ôn tập" style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={24} color={c.mutedForeground} />
        </Pressable>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.gold, alignItems: "center", justifyContent: "center" }}>
          <Icon name="book-open" size={16} color={c.foreground} />
        </View>
        <View style={{ flex: 1, height: 10, borderRadius: 8, backgroundColor: c.reviewTrack, overflow: "hidden" }}>
          <View style={{ width: "20%", height: 10, borderRadius: 8, backgroundColor: c.primary }} />
        </View>
        <Text style={{ fontFamily: F.s, color: c.mutedForeground, fontSize: 12 }}>1/5</Text>
      </View>

      <Text style={{ marginTop: 40, marginBottom: 18, textAlign: "center", color: c.mutedForeground, fontFamily: F.b, fontSize: 20 }}>
        Điền từ
      </Text>
      <View style={{ flex: 1 }}>
        <ReviewCardExtracted word={word} exercise={exercise} layout="inline" />
      </View>
    </div>
  );
}
