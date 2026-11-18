const R2_PUBLIC_BASE_URL =
  process.env.EXPO_PUBLIC_CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim().replace(
    /\/+$/,
    "",
  );

export function publicDataAssetUrl(
  objectKey: string,
  fallbackUrl: string,
): string {
  if (!R2_PUBLIC_BASE_URL) return fallbackUrl;
  return new URL(
    objectKey.replace(/^\/+/, ""),
    `${R2_PUBLIC_BASE_URL}/`,
  ).toString();
}
