export type TabBackgroundMusicState = {
  activeTab: string | null;
  appVisible: boolean;
  soundReady: boolean;
  soundEnabled: boolean;
};

export function shouldPlayTabBackgroundMusic({
  activeTab,
  appVisible,
  soundReady,
  soundEnabled,
}: TabBackgroundMusicState): boolean {
  return (
    activeTab === "review" &&
    appVisible &&
    soundReady &&
    soundEnabled
  );
}
