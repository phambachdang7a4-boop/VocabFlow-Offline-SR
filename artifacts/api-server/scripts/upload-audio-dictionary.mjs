import { createReadStream, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(scriptDir, "../../../");
const localArgument = process.argv
  .slice(2)
  .find((argument) => argument !== "--");
const localPath = resolve(
  localArgument ??
    resolve(
      workspaceRoot,
      "generated-artifacts/audio/vocabflow-audio-dictionary-optimized.db",
    ),
);
const expectedBytes = 321847296;
const objectKey = "vocabflow/audio-dictionary-b3821cbbe15ee0e4.db";
const searchPaths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

if (!searchPaths.length) {
  throw new Error("Public App Storage is not configured in this environment.");
}
if (statSync(localPath).size !== expectedBytes) {
  throw new Error("The local audio database has an unexpected file size.");
}

const [bucketName, ...prefix] = searchPaths[0].replace(/^\/+/, "").split("/");
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: "http://127.0.0.1:1106/token",
    type: "external_account",
    credential_source: {
      url: "http://127.0.0.1:1106/credential",
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});
const object = storage
  .bucket(bucketName)
  .file([...prefix, objectKey].join("/"));
await new Promise((resolvePromise, rejectPromise) => {
  const upload = object.createWriteStream({
    resumable: true,
    metadata: {
      contentType: "application/vnd.sqlite3",
      cacheControl: "public, max-age=86400",
    },
  });
  upload.on("error", rejectPromise);
  upload.on("finish", resolvePromise);
  createReadStream(localPath).on("error", rejectPromise).pipe(upload);
});
const [metadata] = await object.getMetadata();
if (Number(metadata.size) !== expectedBytes) {
  throw new Error(
    "App Storage returned a size that does not match the audio database.",
  );
}
console.log(`Uploaded verified audio dictionary (${metadata.size} bytes).`);
