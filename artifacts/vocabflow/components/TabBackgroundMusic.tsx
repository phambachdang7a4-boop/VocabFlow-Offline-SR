import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { useSoundEffects } from "@/contexts/SoundEffectsContext";
import { shouldPlayTabBackgroundMusic } from "@/domain/tab-background-music";

const MUSIC_VOLUME = 0.55;

export function TabBackgroundMusic({
  activeTab,
  transitionVisible,
}: {
  activeTab: string | null;
  transitionVisible: boolean;
}) {
  const player = useAudioPlayer(
    require("../assets/audio/tab-piano-ambient.mp3"),
  );
  const sound = useSoundEffects();
  const [appVisible, setAppVisible] = useState(
    AppState.currentState === "active",
  );

  useEffect(() => {
    const appSubscription = AppState.addEventListener("change", (state) => {
      setAppVisible(state === "active");
    });
    const updateWebVisibility = () => {
      if (typeof document !== "undefined") {
        setAppVisible(document.visibilityState === "visible");
      }
    };

    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", updateWebVisibility);
      updateWebVisibility();
    }

    return () => {
      appSubscription.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", updateWebVisibility);
      }
    };
  }, []);

  const shouldPlay =
    !transitionVisible &&
    shouldPlayTabBackgroundMusic({
      activeTab,
      appVisible,
      soundReady: sound.ready,
      soundEnabled: sound.enabled,
    });

  useEffect(() => {
    player.loop = true;
  }, [player]);

  useEffect(() => {
    player.volume = sound.enabled ? sound.volume * MUSIC_VOLUME : 0;
  }, [player, sound.enabled, sound.volume]);

  useEffect(() => {
    if (!shouldPlay) {
      player.pause();
      return;
    }

    try {
      player.play();
    } catch {
      // A browser may reject autoplay until the user interacts with the page.
    }
  }, [player, shouldPlay]);

  useEffect(
    () => () => {
      player.pause();
    },
    [player],
  );

  return null;
}
