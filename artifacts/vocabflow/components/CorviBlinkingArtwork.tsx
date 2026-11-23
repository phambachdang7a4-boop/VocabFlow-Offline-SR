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
    opacity: Math.sin(pageTurnProgress.value * Math.PI * 0.5) * 0.9,
    transform: [
      { translateX: pageTurnProgress.value * artSize * 0.045 },
      { scaleX: Math.max(0.12, 1 - pageTurnProgress.value * 0.88) },
      { rotateZ: `${pageTurnProgress.value * -28}deg` },
    ],
  }));
  const wingMotion = useAnimatedStyle(() => ({
    opacity: Math.sin(pageTurnProgress.value * Math.PI * 0.5) * 0.9,
    transform: [
      { translateX: pageTurnProgress.value * artSize * 0.065 },
      { translateY: pageTurnProgress.value * -artSize * 0.025 },
      { rotateZ: `${pageTurnProgress.value * -24}deg` },
    ],
  }));

  useEffect(() => {
    cancelAnimation(blinkProgress);
    cancelAnimation(floatProgress);
    cancelAnimation(gazeProgress);
    cancelAnimation(pageTurnProgress);
    if (reduceMotion) {
      blinkProgress.value = 0;
      floatProgress.value = 0;
      gazeProgress.value = gazeToUser ? 1 : 0;
      pageTurnProgress.value = 0;
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
          withTiming(1, { duration: 520 }),
          withTiming(0, { duration: 520 }),
          withDelay(1600, withTiming(0, { duration: 1 })),
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
    };
  }, [blinkProgress, floatProgress, gazeProgress, gazeToUser, pageTurnProgress, reduceMotion]);

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
            left: artSize * 0.702,
            top: artSize * 0.416,
            width: Math.max(22, artSize * 0.15),
            height: Math.max(28, artSize * 0.18),
            backgroundColor: c.dictField,
            borderColor: c.dictLine,
          },
          pageMotion,
        ]}
      >
        <View style={[styles.pageEdge, { backgroundColor: c.dictLine }]} />
        <View style={[styles.pageRule, styles.pageRuleUpper, { backgroundColor: c.dictLine }]} />
        <View style={[styles.pageRule, styles.pageRuleLower, { backgroundColor: c.dictLine }]} />
      </Animated.View>
      <Animated.View
        testID={`${testID}-wing-sweep`}
        pointerEvents="none"
        style={[
          styles.wingSweep,
          {
            left: artSize * 0.535,
            top: artSize * 0.458,
            width: artSize * 0.23,
            height: artSize * 0.14,
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
  pageRule: { position: 'absolute', left: '18%', height: 1, width: '45%', opacity: 0.55 },
  pageRuleUpper: { top: '28%' },
  pageRuleLower: { top: '48%' },
  wingSweep: { position: 'absolute', zIndex: 2 },
  wingCore: {
    position: 'absolute',
    left: '9%',
    top: '15%',
    width: '72%',
    height: '48%',
    borderWidth: 1,
    borderRadius: 2,
    transform: [{ rotateZ: '-24deg' }],
  },
  wingFeatherOne: { position: 'absolute', left: '10%', top: '57%', width: '48%', height: '23%', transform: [{ rotateZ: '18deg' }] },
  wingFeatherTwo: { position: 'absolute', left: '21%', top: '76%', width: '43%', height: '16%', transform: [{ rotateZ: '12deg' }] },
  wingTip: { position: 'absolute', right: '8%', top: '4%', width: '18%', height: '28%' },
});
