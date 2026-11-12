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
  testID: string;
  artSize: number;
  style?: StyleProp<ViewStyle>;
  gazeToUser?: boolean;
};

/** Adds restrained pixel-art eye and book motions while leaving Corvi's illustration intact. */
export function CorviBlinkingArtwork({ source, testID, artSize, style, gazeToUser = false }: CorviBlinkingArtworkProps) {
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
    opacity: Math.sin(pageTurnProgress.value * Math.PI),
    transform: [
      { scaleX: Math.max(0.08, 1 - pageTurnProgress.value * 0.92) },
      { rotateZ: `${pageTurnProgress.value * -8}deg` },
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
          withDelay(5200, withTiming(1, { duration: 360 })),
          withTiming(0, { duration: 420 }),
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
    <Animated.View testID={`${testID}-frame`} style={[styles.frame, style, gentleFloat]}>
      <Image
        testID={testID}
        accessible={false}
        source={source}
        resizeMode="contain"
        style={StyleSheet.absoluteFill}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'relative', overflow: 'visible' },
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
});
