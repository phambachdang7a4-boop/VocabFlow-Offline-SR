const COURSE_PART_OF_SPEECH_PREFIX = "Từ loại:";

export function getSavedWordPartOfSpeech(note: string): string | null {
  if (!note.startsWith(COURSE_PART_OF_SPEECH_PREFIX)) return null;
  const partOfSpeech = note.slice(COURSE_PART_OF_SPEECH_PREFIX.length).trim();
  return partOfSpeech || null;
}
