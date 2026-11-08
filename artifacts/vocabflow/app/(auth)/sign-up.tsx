import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, type Href, router } from 'expo-router';
import { useAuth, useSignUp } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { F } from '@/components/ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

function getMessage(_error: unknown): string {
  return 'Không thể tạo tài khoản lúc này. Hãy kiểm tra kết nối rồi thử lại.';
}

export default function SignUpScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { isLoaded } = useAuth();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishSignUp = useCallback(async () => {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setError('Tài khoản cần hoàn tất thêm một bước xác minh. Hãy thử lại sau.');
          return;
        }
        router.replace(decorateUrl('/(tabs)') as Href);
      },
    });
  }, [signUp]);

  const createAccount = async () => {
    if (!isLoaded || busy || !emailAddress.trim() || !password) return;
    if (password !== confirmPassword) {
      setError('Hai mật khẩu chưa khớp.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signUp.password({ emailAddress: emailAddress.trim(), password });
      if (result.error) {
        setError(getMessage(result.error));
      } else if (signUp.status === 'complete') {
        await finishSignUp();
      } else if (
        signUp.status === 'missing_requirements' &&
        signUp.unverifiedFields.includes('email_address')
      ) {
        await signUp.verifications.sendEmailCode();
        setVerificationSent(true);
      } else {
        setError('Chưa thể hoàn tất đăng ký. Hãy kiểm tra lại thông tin.');
      }
    } catch (failure) {
      setError(getMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const verifyEmail = async () => {
    if (!isLoaded || busy || !verificationCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
      if (signUp.status === 'complete') await finishSignUp();
      else setError('Mã xác minh chưa hoàn tất đăng ký.');
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
        {verificationSent ? 'Xác minh email' : 'Tạo tài khoản'}
      </Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {verificationSent
          ? `Nhập mã đã gửi đến ${emailAddress.trim()} để bảo vệ tài khoản của bạn.`
          : 'Sổ từ và tiến độ học sẽ được giữ riêng cho tài khoản của bạn.'}
      </Text>
      {!isLoaded ? (
        <Text accessibilityLiveRegion="polite" style={[styles.connectionNotice, { color: c.mutedForeground, backgroundColor: c.card }]}>
          Đang kết nối dịch vụ đăng nhập…
        </Text>
      ) : null}

      {verificationSent ? (
        <>
          <Text style={[styles.label, { color: c.foreground }]}>Mã xác minh</Text>
          <TextInput
            testID="auth-sign-up-code"
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
          {errors.fields.code ? <Text style={[styles.error, { color: '#C0392B' }]}>Mã xác minh chưa đúng. Hãy kiểm tra email rồi thử lại.</Text> : null}
          <AuthButton
            testID="auth-sign-up-verify"
            label="Xác minh và bắt đầu"
            busy={!isLoaded || busy || fetchStatus === 'fetching'}
            onPress={() => { void verifyEmail(); }}
            primary
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy || !isLoaded}
            onPress={() => {
              setBusy(true);
              void signUp.verifications.sendEmailCode()
                .then(() => setError('Đã gửi lại mã xác minh.'))
                .catch(failure => setError(getMessage(failure)))
                .finally(() => setBusy(false));
            }}
          >
            <Text style={[styles.textLink, { color: c.primary }]}>Gửi lại mã</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: c.foreground }]}>Email</Text>
          <TextInput
            testID="auth-sign-up-email"
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
          {errors.fields.emailAddress ? <Text style={[styles.error, { color: '#C0392B' }]}>Địa chỉ email chưa hợp lệ hoặc đã được sử dụng.</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Mật khẩu</Text>
          <TextInput
            testID="auth-sign-up-password"
            accessibilityLabel="Mật khẩu"
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder="Tạo mật khẩu"
            placeholderTextColor={c.mutedForeground}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
          {errors.fields.password ? <Text style={[styles.error, { color: '#C0392B' }]}>Mật khẩu chưa đáp ứng yêu cầu.</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Nhập lại mật khẩu</Text>
          <TextInput
            testID="auth-sign-up-confirm"
            accessibilityLabel="Nhập lại mật khẩu"
            style={inputStyle}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu"
            placeholderTextColor={c.mutedForeground}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => { void createAccount(); }}
          />
          <AuthButton
            testID="auth-sign-up-submit"
            label="Tạo tài khoản"
            busy={!isLoaded || busy || fetchStatus === 'fetching'}
            onPress={() => { void createAccount(); }}
            primary
          />
          <View nativeID="clerk-captcha" />
        </>
      )}

      {error ? <Text accessibilityRole="alert" style={[styles.errorBox, { color: '#C0392B', backgroundColor: c.card }]}>{error}</Text> : null}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: c.mutedForeground }]}>Đã có tài khoản? </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Text style={StyleSheet.flatten([styles.textLink, { color: c.primary }])}>Đăng nhập</Text>
        </Link>
      </View>
      <Text style={[styles.privacy, { color: c.mutedForeground }]}>
        Dữ liệu từ điển và bài học vẫn hoạt động offline trên thiết bị.
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
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  footerText: { fontFamily: F.r, fontSize: 14 },
  textLink: { fontFamily: F.s, fontSize: 14, textAlign: 'center' },
  error: { fontFamily: F.r, fontSize: 13 },
  errorBox: { borderRadius: 12, padding: 12, fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  privacy: { fontFamily: F.r, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  connectionNotice: { borderRadius: 12, padding: 10, fontFamily: F.r, fontSize: 13, textAlign: 'center' },
});
