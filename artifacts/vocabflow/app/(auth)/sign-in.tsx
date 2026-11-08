import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, type Href, router } from 'expo-router';
import { useAuth, useSignIn, useSSO } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { F } from '@/components/ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

function getMessage(_error: unknown): string {
  return 'Không thể đăng nhập lúc này. Hãy kiểm tra kết nối và thông tin rồi thử lại.';
}

export default function SignInScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { isLoaded } = useAuth();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useWarmUpBrowser();

  const finishSignIn = useCallback(async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setError('Tài khoản cần hoàn tất thêm một bước xác minh. Hãy thử lại sau.');
          return;
        }
        router.replace(decorateUrl('/(tabs)') as Href);
      },
    });
  }, [signIn]);

  const submitPassword = async () => {
    if (!isLoaded || busy || !emailAddress.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.password({ emailAddress: emailAddress.trim(), password });
      if (result.error) {
        setError(getMessage(result.error));
      } else if (signIn.status === 'complete') {
        await finishSignIn();
      } else if (signIn.status === 'needs_client_trust') {
        const emailFactor = signIn.supportedSecondFactors.find(factor => factor.strategy === 'email_code');
        if (emailFactor) {
          await signIn.mfa.sendEmailCode();
          setNeedsVerification(true);
        } else {
          setError('Tài khoản cần xác minh bổ sung nhưng chưa có phương thức phù hợp.');
        }
      } else if (signIn.status === 'needs_second_factor') {
        setError('Tài khoản yêu cầu xác minh hai bước. Hãy dùng phương thức xác minh đã bật.');
      } else {
        setError('Đăng nhập chưa hoàn tất. Hãy kiểm tra thông tin rồi thử lại.');
      }
    } catch (failure) {
      setError(getMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!isLoaded || busy || !verificationCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
      if (signIn.status === 'complete') await finishSignIn();
      else setError('Mã xác minh chưa hoàn tất đăng nhập.');
    } catch (failure) {
      setError(getMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri(
        Platform.OS === 'web' ? undefined : { scheme: 'vocabflow' },
      );
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });
      if (!createdSessionId || !setActive) {
        setError('Đăng nhập Google chưa hoàn tất. Hãy thử lại hoặc dùng email.');
        return;
      }
      await setActive({
        session: createdSessionId,
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setError('Tài khoản cần hoàn tất thêm một bước xác minh. Hãy thử lại sau.');
            return;
          }
          router.replace(decorateUrl('/(tabs)') as Href);
        },
      });
    } catch (failure) {
      setError(getMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    { color: c.foreground, backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
  ];

  return (
    <KeyboardAwareScrollViewCompat
      style={StyleSheet.flatten([styles.container, { backgroundColor: c.background }])}
      contentContainerStyle={{
        ...styles.content,
        paddingTop: insets.top + 28,
        paddingBottom: insets.bottom + 36,
      }}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.brandMark, { backgroundColor: c.accent, borderRadius: 18 }]}>
        <Text style={[styles.brandLetter, { color: c.foreground }]}>V</Text>
      </View>
      <Text style={[styles.brand, { color: c.primary }]}>VocabFlow</Text>
      <Text style={[styles.title, { color: c.foreground }]}>
        {needsVerification ? 'Xác minh đăng nhập' : 'Chào mừng trở lại'}
      </Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {needsVerification
          ? `Nhập mã đã gửi đến ${emailAddress.trim()}.`
        : 'Đăng nhập để đồng bộ sổ từ và tiến độ học giữa các thiết bị.'}
      </Text>
      {!isLoaded ? (
        <Text accessibilityLiveRegion="polite" style={[styles.connectionNotice, { color: c.mutedForeground, backgroundColor: c.card }]}>
          Đang kết nối dịch vụ đăng nhập…
        </Text>
      ) : null}

      {needsVerification ? (
        <>
          <Text style={[styles.label, { color: c.foreground }]}>Mã xác minh</Text>
          <TextInput
            testID="auth-sign-in-code"
            accessibilityLabel="Mã xác minh"
            style={inputStyle}
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="Nhập mã trong email"
            placeholderTextColor={c.mutedForeground}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
          />
          <AuthButton
            testID="auth-sign-in-verify"
            label="Xác minh và tiếp tục"
            busy={!isLoaded || busy || fetchStatus === 'fetching'}
            onPress={() => { void verifyEmailCode(); }}
            primary
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => { setNeedsVerification(false); setVerificationCode(''); setError(null); }}
          >
            <Text style={[styles.textLink, { color: c.primary }]}>Quay lại đăng nhập</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: c.foreground }]}>Email</Text>
          <TextInput
            testID="auth-sign-in-email"
            accessibilityLabel="Email"
            style={inputStyle}
            value={emailAddress}
            onChangeText={setEmailAddress}
            placeholder="ten@email.com"
            placeholderTextColor={c.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <Text style={[styles.label, { color: c.foreground }]}>Mật khẩu</Text>
          <TextInput
            testID="auth-sign-in-password"
            accessibilityLabel="Mật khẩu"
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={c.mutedForeground}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => { void submitPassword(); }}
          />
          {errors.fields.identifier ? <Text style={[styles.error, { color: '#C0392B' }]}>Kiểm tra lại địa chỉ email.</Text> : null}
          {errors.fields.password ? <Text style={[styles.error, { color: '#C0392B' }]}>Mật khẩu chưa đúng. Hãy thử lại.</Text> : null}
          <AuthButton
            testID="auth-sign-in-submit"
            label="Đăng nhập"
            busy={!isLoaded || busy || fetchStatus === 'fetching'}
            onPress={() => { void submitPassword(); }}
            primary
          />
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.mutedForeground }]}>hoặc</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>
          <AuthButton
            testID="auth-google"
            label="Tiếp tục với Google"
            busy={!isLoaded || busy}
            onPress={() => { void signInWithGoogle(); }}
          />
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: c.mutedForeground }]}>Chưa có tài khoản? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Text style={StyleSheet.flatten([styles.textLink, { color: c.primary }])}>Đăng ký</Text>
            </Link>
          </View>
        </>
      )}
      {error ? <Text accessibilityRole="alert" style={[styles.errorBox, { color: '#C0392B', backgroundColor: c.card }]}>{error}</Text> : null}
      <Text style={[styles.privacy, { color: c.mutedForeground }]}>
        Dữ liệu học được lưu trên thiết bị và đồng bộ an toàn khi có mạng.
      </Text>
    </KeyboardAwareScrollViewCompat>
  );
}

function AuthButton({ testID, label, busy, onPress, primary = false }: {
  testID: string;
  label: string;
  busy: boolean;
  onPress: () => void;
  primary?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? c.accent : c.card,
          borderColor: primary ? c.accent : c.border,
          opacity: busy ? 0.7 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={primary ? c.foreground : c.primary} /> : null}
      <Text style={[styles.buttonText, { color: primary ? c.foreground : c.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 12,
  },
  brandMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  brandLetter: { fontFamily: F.b, fontSize: 30 },
  brand: { fontFamily: F.b, fontSize: 22, textAlign: 'center', marginBottom: 14 },
  title: { fontFamily: F.b, fontSize: 27, textAlign: 'center' },
  subtitle: { fontFamily: F.r, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 10 },
  label: { fontFamily: F.s, fontSize: 14, marginTop: 4 },
  input: { minHeight: 54, borderWidth: 1, paddingHorizontal: 16, fontFamily: F.r, fontSize: 16 },
  button: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  buttonText: { fontFamily: F.s, fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 5 },
  dividerLine: { height: 1, flex: 1 },
  dividerText: { fontFamily: F.r, fontSize: 13 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  footerText: { fontFamily: F.r, fontSize: 14 },
  textLink: { fontFamily: F.s, fontSize: 14, textAlign: 'center' },
  error: { fontFamily: F.r, fontSize: 13 },
  errorBox: { borderRadius: 12, padding: 12, fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  privacy: { fontFamily: F.r, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  connectionNotice: { borderRadius: 12, padding: 10, fontFamily: F.r, fontSize: 13, textAlign: 'center' },
});
