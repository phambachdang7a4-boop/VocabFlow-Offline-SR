const assert = require("node:assert/strict");
const courseData = require("../domain/ielts-topic-course-data.json");
const {
  validateCourseExamples,
  validateCourseDataAgainstAuthoredOverrides,
} = require("./build-ielts-topic-course-data.cjs");

function cloneCourseData() {
  return JSON.parse(JSON.stringify(courseData));
}

validateCourseExamples(courseData.entries);
validateCourseDataAgainstAuthoredOverrides(courseData);

const missingDefinition = cloneCourseData();
delete missingDefinition.entries.graduation;
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(missingDefinition),
  /graduation: missing authored IELTS definition/,
  "Missing authored definitions must fail the check.",
);

const changedDefinition = cloneCourseData();
changedDefinition.entries.graduation.definition = "Định nghĩa bị thay đổi.";
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(changedDefinition),
  /graduation: authored IELTS definition changed/,
  "Changed authored definitions must fail the check.",
);

const changedExample = cloneCourseData();
changedExample.entries.graduation.example = "She completed her course.";
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(changedExample),
  /graduation: authored IELTS example changed/,
  "Changed curated examples must fail the check.",
);

const changedExampleTranslation = cloneCourseData();
changedExampleTranslation.entries.graduation.exampleTranslation =
  "Bản dịch ví dụ đã bị thay đổi.";
assert.throws(
  () =>
    validateCourseDataAgainstAuthoredOverrides(changedExampleTranslation),
  /graduation: authored IELTS example translation changed/,
  "Changed curated example translations must fail the check.",
);

const changedReviewedTranslation = cloneCourseData();
changedReviewedTranslation.entries.fertilization.exampleTranslation =
  "Sự thụ phấn diễn ra sau khi phấn hoa đến được hoa.";
assert.throws(
  () =>
    validateCourseDataAgainstAuthoredOverrides(changedReviewedTranslation),
  /fertilization: authored IELTS example translation changed/,
  "Reviewed translation corrections must fail if a meaning mismatch returns.",
);

console.log(
  `IELTS course corrections verified: ${Object.keys(courseData.entries).length} entries, examples are valid, authored definitions and examples match the builder, and reviewed translations stay corrected.`,
);
