import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Storage } from "@google-cloud/storage";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const assets = [
  {
    key: "vocabflow/dictionary-2b65bea9577c2a41.db",
    bytes: 44_212_224,
    sha256:
      "2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a",
    contentType: "application/octet-stream",
  },
  {
    key: "vocabflow/audio-dictionary-b3821cbbe15ee0e4.db",
    bytes: 321_847_296,
    sha256:
      "b3821cbbe15ee0e42dad72867a14202adbcefae2ed1e1712e24fcc9c389f4acc",
    contentType: "application/vnd.sqlite3",
  },
  {
    key: "vocabflow/uk-ipa-supplement-b3ae7040c0a2c7a4.txt",
    bytes: 3_023_499,
    sha256:
      "b3ae7040c0a2c7a479a93cd8be2cb0ae5c8d7dd58f84d54ad4d212d9983c9d9c",
    contentType: "text/plain; charset=utf-8",
  },
  {
    key: "vocabflow/course-data-v1-8cb5bc7796b11a6d.json",
    bytes: 10_716_186,
    sha256:
      "8cb5bc7796b11a6dd83a42f02a7e390cce8fa65f256ae593dd7d046f48b18f02",
    contentType: "application/octet-stream",
    metadata: { "course-data-version": "1" },
  },
];

const required = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_BUCKET_NAME",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing required R2 configuration: ${missing.join(", ")}`);
}

const searchPaths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);
if (!searchPaths.length) {
  throw new Error("Replit App Storage source paths are not configured.");
}

const sourceStorage = new Storage({
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

const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME.trim();
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

function findSourceObject(objectKey) {
  return (async () => {
    for (const path of searchPaths) {
      const [sourceBucket, ...prefix] = path.replace(/^\/+/, "").split("/");
      const file = sourceStorage
        .bucket(sourceBucket)
        .file([...prefix, objectKey].join("/"));
      const [exists] = await file.exists();
      if (exists) return file;
    }
    throw new Error(`Source object is missing from App Storage: ${objectKey}`);
  })();
}

async function copyVerifiedAsset(asset) {
  try {
    const existing = await r2.send(
      new HeadObjectCommand({ Bucket: bucket, Key: asset.key }),
    );
    if (
      Number(existing.ContentLength) === asset.bytes &&
      existing.Metadata?.sha256 === asset.sha256
    ) {
      console.log(`Already verified in R2; leaving unchanged: ${asset.key}`);
      return;
    }
    throw new Error(
      `R2 already contains a different object at ${asset.key}; nothing was overwritten.`,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("already contains a different object")
    ) {
      throw error;
    }
    const statusCode = error?.$metadata?.httpStatusCode;
    if (statusCode !== 404 && error?.name !== "NotFound") throw error;
  }

  const source = await findSourceObject(asset.key);
  const [metadata] = await source.getMetadata();
  if (Number(metadata.size) !== asset.bytes) {
    throw new Error(
      `Source size mismatch for ${asset.key}: expected ${asset.bytes}, got ${metadata.size}.`,
    );
  }

  const digest = createHash("sha256");
  let receivedBytes = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      receivedBytes += bytes.byteLength;
      digest.update(bytes);
      callback(null, bytes);
    },
  });
  const sourceStream = source.createReadStream();
  const upload = new Upload({
    client: r2,
    params: {
      Bucket: bucket,
      Key: asset.key,
      Body: meter,
      ContentLength: asset.bytes,
      ContentType: asset.contentType,
      CacheControl: "public, max-age=86400",
      Metadata: { sha256: asset.sha256, ...asset.metadata },
    },
    queueSize: 2,
    partSize: 16 * 1024 * 1024,
    leavePartsOnError: false,
  });

  try {
    const uploadPromise = upload.done();
    await Promise.all([pipeline(sourceStream, meter), uploadPromise]);
  } catch (error) {
    sourceStream.destroy();
    meter.destroy();
    await upload.abort().catch(() => undefined);
    throw error;
  }

  const actualSha256 = digest.digest("hex");
  if (receivedBytes !== asset.bytes || actualSha256 !== asset.sha256) {
    await r2
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.key }))
      .catch(() => undefined);
    throw new Error(
      `Transferred object failed size/hash verification: ${asset.key}.`,
    );
  }

  const head = await r2.send(
    new HeadObjectCommand({ Bucket: bucket, Key: asset.key }),
  );
  if (Number(head.ContentLength) !== asset.bytes) {
    throw new Error(`R2 object size mismatch after upload: ${asset.key}.`);
  }
  console.log(
    `Verified ${asset.key}: ${receivedBytes} bytes, SHA-256 ${actualSha256}`,
  );
}

for (const asset of assets) {
  await copyVerifiedAsset(asset);
}

console.log(
  "All pinned public packages were copied to R2 and verified. Replit App Storage remains unchanged.",
);
console.log(
  "For browser downloads, add this CORS rule in the bucket Settings: " +
    JSON.stringify({
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "HEAD"],
      AllowedHeaders: ["Range", "If-Range"],
      ExposeHeaders: [
        "Accept-Ranges",
        "Content-Range",
        "Content-Length",
        "ETag",
        "X-Audio-Dictionary-SHA256",
        "X-Audio-Dictionary-Entries",
        "X-Course-Data-Version",
        "X-Course-Data-SHA256",
        "X-UK-IPA-SHA256",
        "X-Amz-Meta-SHA256",
        "X-Amz-Meta-Course-Data-Version",
      ],
      MaxAgeSeconds: 3600,
    }),
);
