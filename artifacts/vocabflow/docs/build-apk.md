# Build an Android APK

The GitHub Actions workflow at `.github/workflows/build-android-apk.yml` builds
VocabFlow whenever code is pushed and can also be started manually.

## Download

1. Push the full workspace repository to GitHub. Keep the root `pnpm-lock.yaml`,
   `pnpm-workspace.yaml`, and `artifacts/vocabflow` directory.
2. Open the repository's **Actions** tab and select **Build VocabFlow Android
   APK**. Choose **Run workflow** if a push has not started a build.
3. Open a successful run and download the `vocabflow-debug-apk` artifact.
4. Extract the downloaded ZIP on your phone and install `app-debug.apk`.

The Android application ID is `com.vocabflow.app`. The generated APK uses a
temporary debug signing key, so it is suitable for testing and sideloading, not
for Google Play. Each clean workflow run creates a different debug key, which
means Android will not treat a later APK as an in-place update. Do not uninstall
an installed copy containing words or progress to replace it; uninstalling
erases that copy's local SQLite data. A release APK with a persistent signing
key is required for reliable in-place updates.
