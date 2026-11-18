import { useEffect, useState } from "react";
import { getOfflineCourseBundle } from "@/data/offline-course-data";
import { reviewExampleTranslation } from "@/domain/review-result-details";

export function useReviewExampleTranslation(example: string): string | null {
  const [translation, setTranslation] = useState<string | null>(() =>
    reviewExampleTranslation(example),
  );

  useEffect(() => {
    let active = true;
    setTranslation(reviewExampleTranslation(example));
    void getOfflineCourseBundle()
      .catch(() => null)
      .then(() => {
        if (active) setTranslation(reviewExampleTranslation(example));
      });
    return () => {
      active = false;
    };
  }, [example]);

  return translation;
}
