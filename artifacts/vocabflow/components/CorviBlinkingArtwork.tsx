import React, { useEffect } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

type CorviBlinkingArtworkProps = {
  source: ImageSourcePropType;
  backgroundSource?: ImageSourcePropType;
  testID: string;
  artSize: number;
  style?: StyleProp<ViewStyle>;
  gazeToUser?: boolean;
};

/** Adds restrained pixel-art eye and book motions while leaving Corvi's illustration intact. */
export function CorviBlinkingArtwork({ source, backgroundSource, testID, artSize, style, gazeToUser = false }: CorviBlinkingArtworkProps) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const blinkProgress = useSharedValue(0);
  const floatProgress = useSharedValue(0);
  const gazeProgress = useSharedValue(0);
  const pageTurnProgress = useSharedValue(0);
  const wingProgress = useSharedValue(0);
  const eyelidMotion = useAnimatedStyle(() => ({
    opacity: blinkProgress.value,
    transform: [{ scaleY: Math.max(0.04, blinkProgress.value) }],
  }));
  const gentleFloat = useAnimatedStyle(() => ({
    transform: [{ translateY: floatProgress.value }],
  }));
  const pupilMotion = useAnimatedStyle(() => ({
    transform: [
      { translateX: gazeProgress.value * artSize * 0.012 },
      { translateY: gazeProgress.value * -artSize * 0.006 },
    ],
  }));
  const pageMotion = useAnimatedStyle(() => ({
    opacity: Math.sin(pageTurnProgress.value * Math.PI),
    transform: [
      { scaleX: Math.max(0.08, 1 - pageTurnProgress.value * 0.92) },
      { rotateZ: `${pageTurnProgress.value * -8}deg` },
    ],
  }));
  const wingMotion = useAnimatedStyle(() => ({
    opacity: Math.min(1, wingProgress.value * 1.5),
    transform: [
      { translateX: wingProgress.value * artSize * 0.045 },
      { translateY: wingProgress.value * -artSize * 0.025 },
      { rotateZ: `${wingProgress.value * -18}deg` },
    ],
  }));

  useEffect(() => {
    cancelAnimation(blinkProgress);
    cancelAnimation(floatProgress);
    cancelAnimation(gazeProgress);
    cancelAnimation(pageTurnProgress);
    cancelAnimation(wingProgress);
    if (reduceMotion) {
      blinkProgress.value = 0;
      floatProgress.value = 0;
      gazeProgress.value = gazeToUser ? 1 : 0;
      pageTurnProgress.value = 0;
      wingProgress.value = 0;
    } else {
      blinkProgress.value = withRepeat(
        withSequence(
          withDelay(4100, withTiming(1, { duration: 65 })),
          withTiming(0, { duration: 90 }),
        ),
        -1,
        false,
      );
      floatProgress.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 1700 }),
          withTiming(0, { duration: 1700 }),
        ),
        -1,
        false,
      );
      gazeProgress.value = gazeToUser
        ? withTiming(1, { duration: 420 })
        : withRepeat(
          withSequence(
            withTiming(1, { duration: 460 }),
            withDelay(2500, withTiming(1, { duration: 1 })),
            withTiming(0, { duration: 460 }),
            withDelay(3200, withTiming(0, { duration: 1 })),
          ),
          -1,
          false,
        );
      pageTurnProgress.value = withRepeat(
        withSequence(
          withDelay(5200, withTiming(1, { duration: 360 })),
          withTiming(0, { duration: 420 }),
          withDelay(2800, withTiming(0, { duration: 1 })),
        ),
        -1,
        false,
      );
      wingProgress.value = withRepeat(
        withSequence(
          withDelay(5000, withTiming(1, { duration: 320 })),
          withTiming(0, { duration: 300 }),
          withDelay(2800, withTiming(0, { duration: 1 })),
        ),
        -1,
        false,
      );
    }
    return () => {
      cancelAnimation(blinkProgress);
      cancelAnimation(floatProgress);
      cancelAnimation(gazeProgress);
      cancelAnimation(pageTurnProgress);
      cancelAnimation(wingProgress);
    };
  }, [blinkProgress, floatProgress, gazeProgress, gazeToUser, pageTurnProgress, reduceMotion, wingProgress]);

  return (
    <Animated.View
      testID={`${testID}-frame`}
      style={[styles.frame, { width: artSize, height: artSize }, style, gentleFloat]}
    >
      {backgroundSource ? (
        <Image
          testID={`${testID}-background`}
          accessible={false}
          source={backgroundSource}
          resizeMode="contain"
          style={[styles.artwork, styles.backgroundArtwork, { width: artSize, height: artSize }]}
        />
      ) : null}
      <Image
        testID={testID}
        accessible={false}
        source={source}
        resizeMode="contain"
        style={[styles.artwork, { width: artSize, height: artSize }]}
      />
      <Animated.View
        testID={`${testID}-blink`}
        pointerEvents="none"
        style={[
          styles.eyelid,
          {
            left: artSize * 0.547,
            top: artSize * 0.386,
            width: artSize * 0.047,
            height: artSize * 0.03,
            backgroundColor: c.corviEyelid,
            borderColor: c.corviEyelidLine,
          },
          eyelidMotion,
        ]}
      >
        <View style={[styles.eyelidCrease, { backgroundColor: c.corviEyelidLine }]} />
      </Animated.View>
      <Animated.View
        testID={`${testID}-gaze`}
        pointerEvents="none"
        style={[
          styles.pupil,
          {
            left: artSize * 0.568,
            top: artSize * 0.397,
            width: Math.max(3, artSize * 0.013),
            height: Math.max(3, artSize * 0.013),
            backgroundColor: c.corviEyelid,
          },
          pupilMotion,
        ]}
      />
      <Animated.View
        testID={`${testID}-page-turn`}
        pointerEvents="none"
        style={[
          styles.turningPage,
          {
            left: artSize * 0.716,
            top: artSize * 0.501,
            width: Math.max(12, artSize * 0.074),
            height: Math.max(16, artSize * 0.13),
            backgroundColor: c.dictField,
            borderColor: c.dictLine,
          },
          pageMotion,
        ]}
      >
        <View style={[styles.pageEdge, { backgroundColor: c.dictLine }]} />
      </Animated.View>
      <Animated.View
        testID={`${testID}-wing-sweep`}
        pointerEvents="none"
        style={[
          styles.wingSweep,
          {
            left: artSize * 0.57,
            top: artSize * 0.475,
            width: artSize * 0.17,
            height: artSize * 0.085,
          },
          wingMotion,
        ]}
      >
        <View style={[styles.wingCore, { backgroundColor: c.corviEyelid, borderColor: c.corviEyelidLine }]} />
        <View style={[styles.wingFeatherOne, { backgroundColor: c.corviEyelid }]} />
        <View style={[styles.wingFeatherTwo, { backgroundColor: c.corviEyelid }]} />
        <View style={[styles.wingTip, { backgroundColor: c.corviEyelidLine }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'relative', overflow: 'visible', flexShrink: 0 },
  artwork: { flexShrink: 0 },
  backgroundArtwork: { position: 'absolute', left: 0, top: 0 },
  // Coordinates match the eye in the 236 px Corvi artwork shown on this screen.
  eyelid: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyelidCrease: { width: 6, height: 1, borderRadius: 1 },
  pupil: { position: 'absolute', borderRadius: 1 },
  turningPage: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 1,
    overflow: 'hidden',
  },
  pageEdge: { position: 'absolute', right: 2, top: 2, bottom: 2, width: 1 },
  wingSweep: { position: 'absolute', zIndex: 2 },
  wingCore: {
    position: 'absolute',
    left: '12%',
    top: '18%',
    width: '72%',
    height: '52%',
    borderWidth: 1,
    borderRadius: 2,
  },
  wingFeatherOne: { position: 'absolute', left: '4%', top: '54%', width: '44%', height: '24%' },
  wingFeatherTwo: { position: 'absolute', left: '14%', top: '76%', width: '40%', height: '18%' },
  wingTip: { position: 'absolute', right: '4%', top: '7%', width: '18%', height: '30%' },
});
