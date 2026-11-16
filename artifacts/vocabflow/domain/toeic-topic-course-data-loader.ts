import courseData from "./toeic-topic-course-data.json";
import generalBusinessData from "./toeic-topic-course-data/general-business.json";
import officeIssuesData from "./toeic-topic-course-data/office-issues.json";
import personnelData from "./toeic-topic-course-data/personnel.json";
import financeAccountingData from "./toeic-topic-course-data/finance-accounting.json";
import purchasingData from "./toeic-topic-course-data/purchasing.json";
import travelTransportationData from "./toeic-topic-course-data/travel-transportation.json";
import diningHospitalityData from "./toeic-topic-course-data/dining-hospitality.json";
import healthMedicalData from "./toeic-topic-course-data/health-medical.json";
import realEstateData from "./toeic-topic-course-data/real-estate.json";
import entertainmentEventsData from "./toeic-topic-course-data/entertainment-events.json";

export interface ToeicTopicCourseEntry {
  definition: string;
  example: string;
  exampleTranslation: string;
  spellingNote?: string;
  dictionarySource: "offline" | "authored";
  exampleSource: "offline" | "authored";
  partOfSpeech: string;
  posGroup: string;
  family: string;
}

interface ToeicTopicCourseData {
  spellingConvention: string;
  totalWords: number;
  topics: {
    id: string;
    title: string;
    focus: string;
    terms: string[];
  }[];
}

export const TOEIC_TOPIC_COURSE_DATA = courseData as ToeicTopicCourseData;
export const TOEIC_TOPIC_COURSE_ENTRIES: Readonly<
  Record<string, ToeicTopicCourseEntry>
> = Object.assign(
  {},
  generalBusinessData.entries,
  officeIssuesData.entries,
  personnelData.entries,
  financeAccountingData.entries,
  purchasingData.entries,
  travelTransportationData.entries,
  diningHospitalityData.entries,
  healthMedicalData.entries,
  realEstateData.entries,
  entertainmentEventsData.entries,
) as Record<string, ToeicTopicCourseEntry>;
