import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(scriptDir, "../../../");
const localPath = resolve(
  process.argv
    .slice(2)
    .find((argument) => argument !== "--") ??
    resolve(
      workspaceRoot,
      "generated-artifacts/courses/vocabflow-courses-v1.json",
    ),
);
const expectedBytes = 10_716_186;
const expectedSha256 =
  "8cb5bc7796b11a6dd83a42f02a7e390cce8fa65f256ae593dd7d046f48b18f02";
const objectKey = "vocabflow/course-data-v1-8cb5bc7796b11a6d.json";
const searchPaths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

if (!searchPaths.length) {
  throw new Error("Public App Storage is not configured in this environment.");
}
if (statSync(localPath).size !== expectedBytes) {
  throw new Error("The local course package has an unexpected file size.");
}
const localHash = createHash("sha256")
  .update(await (await import("node:fs/promises")).readFile(localPath))
  .digest("hex");
if (localHash !== expectedSha256) {
  throw new Error("The local course package does not match its pinned SHA-256.");
}

const [bucketName, ...prefix] = searchPaths[0]
  .replace(/^\/+/, "")
  .split("/");
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
      contentType: "application/json; charset=utf-8",
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
    "App Storage returned a size that does not match the course package.",
  );
}
console.log(`Uploaded verified offline course package (${metadata.size} bytes).`);
