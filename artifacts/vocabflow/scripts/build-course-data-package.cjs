const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const os = require("node:os");
const root = join(__dirname, "..");
const esbuild = require(
  require.resolve("esbuild", { paths: [join(root, "../api-server")] }),
);
const entryPoint = join(root, "domain/course-data-bundle-source.ts");
const outputPath = resolve(
  root,
  "../../generated-artifacts/courses/vocabflow-courses-v1.json",
);
const tempPath = join(os.tmpdir(), `vocabflow-course-package-${process.pid}.cjs`);

async function main() {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile: tempPath,
    logLevel: "silent",
  });
  const { COURSE_DATA_BUNDLE } = require(tempPath);
  assert.equal(COURSE_DATA_BUNDLE.formatVersion, 1);
  assert.equal(COURSE_DATA_BUNDLE.courses.length, 8);
  assert.ok(COURSE_DATA_BUNDLE.dictionaryIndex.terms.length > 10_000);
  for (const course of COURSE_DATA_BUNDLE.courses) {
    assert.ok(course.id && course.title && course.lessons.length > 0);
    assert.ok(Object.keys(course.entriesByTerm).length > 0);
    assert.ok(
      course.lessons.every(
        (lesson) =>
          lesson.id &&
          Array.isArray(lesson.questions) &&
          lesson.questions.every((question) =>
            course.entriesByTerm[question.term],
          ),
      ),
      `${course.title} contains a lesson without matching course entries.`,
    );
  }

  const output = `${JSON.stringify(COURSE_DATA_BUNDLE)}\n`;
  const bytes = Buffer.byteLength(output);
  const sha256 = createHash("sha256").update(output).digest("hex");
  const checkOnly = process.argv.includes("--check");
  if (checkOnly) {
    const manifestPath = join(root, "domain/course-data-package.ts");
    const manifest = readFileSync(manifestPath, "utf8");
    const expectedBytes = Number(
      manifest.match(/bytes:\s*([\d_]+)/)?.[1]?.replaceAll("_", ""),
    );
    const expectedSha256 = manifest.match(/sha256:\s*"([a-f0-9]{64})"/)?.[1];
    const expectedVersion = Number(manifest.match(/version:\s*(\d+)/)?.[1]);
    assert.equal(COURSE_DATA_BUNDLE.formatVersion, expectedVersion);
    assert.equal(bytes, expectedBytes, "The course package byte count is stale.");
    assert.equal(sha256, expectedSha256, "The course package SHA-256 is stale.");
  } else {
    mkdirSync(join(outputPath, ".."), { recursive: true });
    writeFileSync(outputPath, output);
  }
  console.log(
    JSON.stringify({
      file: "generated-artifacts/courses/vocabflow-courses-v1.json",
      checked: checkOnly,
      version: COURSE_DATA_BUNDLE.formatVersion,
      courses: COURSE_DATA_BUNDLE.courses.length,
      lessons: COURSE_DATA_BUNDLE.courses.reduce(
        (total, course) => total + course.lessons.length,
        0,
      ),
      bytes,
      sha256,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
