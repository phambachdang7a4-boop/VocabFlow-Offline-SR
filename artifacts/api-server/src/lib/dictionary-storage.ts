import { Storage } from "@google-cloud/storage";

// Replit's canonical sidecar-authenticated App Storage client.
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export const DICTIONARY_OBJECT_KEY = "vocabflow/dictionary-2b65bea9577c2a41.db";
export const AUDIO_DICTIONARY_OBJECT_KEY =
  "vocabflow/audio-dictionary-b3821cbbe15ee0e4.db";
export const UK_IPA_OBJECT_KEY =
  "vocabflow/uk-ipa-supplement-b3ae7040c0a2c7a4.txt";
export const COURSE_DATA_OBJECT_KEY =
  "vocabflow/course-data-v1-8cb5bc7796b11a6d.json";

export async function findDictionaryAsset() {
  const paths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  if (!paths.length) throw new Error("Public App Storage is not configured");
  for (const path of paths) {
    const [bucket, ...prefix] = path.replace(/^\/+/, "").split("/");
    const file = objectStorageClient
      .bucket(bucket)
      .file([...prefix, DICTIONARY_OBJECT_KEY].join("/"));
    const [exists] = await file.exists();
    if (exists) return file;
  }
  throw new Error("Pinned dictionary asset is not in App Storage");
}

export async function findAudioDictionaryAsset() {
  const paths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  if (!paths.length) throw new Error("Public App Storage is not configured");
  for (const path of paths) {
    const [bucket, ...prefix] = path.replace(/^\/+/, "").split("/");
    const file = objectStorageClient
      .bucket(bucket)
      .file([...prefix, AUDIO_DICTIONARY_OBJECT_KEY].join("/"));
    const [exists] = await file.exists();
    if (exists) return file;
  }
  throw new Error("Pinned offline audio asset is not in App Storage");
}

export async function findUkIpaAsset() {
  const paths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  if (!paths.length) throw new Error("Public App Storage is not configured");
  for (const path of paths) {
    const [bucket, ...prefix] = path.replace(/^\/+/, "").split("/");
    const file = objectStorageClient
      .bucket(bucket)
      .file([...prefix, UK_IPA_OBJECT_KEY].join("/"));
    const [exists] = await file.exists();
    if (exists) return file;
  }
  throw new Error("UK IPA supplement is not in App Storage");
}

export async function findCourseDataAsset() {
  const paths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  if (!paths.length) throw new Error("Public App Storage is not configured");
  for (const path of paths) {
    const [bucket, ...prefix] = path.replace(/^\/+/, "").split("/");
    const file = objectStorageClient
      .bucket(bucket)
      .file([...prefix, COURSE_DATA_OBJECT_KEY].join("/"));
    const [exists] = await file.exists();
    if (exists) return file;
  }
  throw new Error("Pinned offline course package is not in App Storage");
}
