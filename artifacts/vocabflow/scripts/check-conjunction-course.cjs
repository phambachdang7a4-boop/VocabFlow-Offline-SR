const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadDictionaryDomain,
  loadLocalDictionaryAdditions,
  loadTs,
  loadToeicTopicCourseDomain,
} = require("./test-support.cjs");

const additions = loadLocalDictionaryAdditions();
const course = loadTs(
  join(__dirname, "../domain/conjunction-course.ts"),
  { "./dictionary-local-additions": additions },
);
const linkingAdverbCourse = loadTs(
  join(__dirname, "../domain/linking-adverb-course.ts"),
);
const sentenceStructurePatternCourse = loadTs(
  join(__dirname, "../domain/sentence-structure-patterns.ts"),
);
const ieltsTopicCourse = loadTs(
  join(__dirname, "../domain/ielts-topic-course.ts"),
  {
    "./ielts-topic-course-data.json": require(
      "../domain/ielts-topic-course-data.json",
    ),
  },
);
const toeicTopicCourse = loadToeicTopicCourseDomain();
const dictionaryDomain = loadDictionaryDomain();
const { applyLocalDictionaryAdditions } = loadTs(
  join(__dirname, "../data/dictionary-local-additions.ts"),
  { "../domain/dictionary-local-additions": additions },
);

const sentenceStructureAnswerUniquenessReviews = new Map([
  [
    "either … or",
    {
      answer: "either … or",
      distractors: {
        "neither … nor": "The sentence requires one of two options, not neither option.",
        "not only … but also": "This asserts both options, which conflicts with “not both.”",
        "whether … or": "This introduces alternatives for consideration but does not express the required choice.",
      },
    },
  ],
  [
    "neither … nor",
    {
      answer: "neither … nor",
      distractors: {
        "both … and": "The prompt says the plan lacked both listed features.",
        "either … or": "This presents a choice instead of denying both features.",
        "not only … but also": "This asserts that both features were present, the opposite of the prompt.",
      },
    },
  ],
  [
    "not only … but also",
    {
      answer: "not only … but also",
      distractors: {
        "either … or": "The prompt explicitly says both advantages apply.",
        "neither … nor": "This denies both advantages instead of emphasizing them.",
        "whether … or": "This frames alternatives rather than asserting both advantages.",
      },
    },
  ],
  [
    "no matter how",
    {
      answer: "no matter how",
      distractors: {
        "as long as": "This sets a condition and cannot form “as long as carefully the team checked.”",
        "provided that": "This sets a condition and cannot precede the adverb “carefully” in this structure.",
        "even though": "This cannot form the required “even though carefully” clause.",
      },
    },
  ],
  [
    "so … that",
    {
      answer: "so … that",
      distractors: {
        "such … that": "“Such” needs a noun phrase here, as in “such a vast archive.”",
        "too … to": "This cannot connect the adjective “vast” to the finite clause after the second blank.",
        "as … as": "This requires a comparison, not the result clause “the researchers needed several weeks.”",
      },
    },
  ],
  [
    "the more … the more",
    {
      answer: "the more … the more",
      distractors: {
        "as … as": "This comparison does not form the paired-correlative structure in the sentence.",
        "so … that": "This requires a result clause rather than two changing quantities.",
        "not only … but also": "This requires two parallel features, not a comparative relationship.",
      },
    },
  ],
  [
    "not only did",
    {
      answer: "not only did",
      distractors: {
        "not only does": "The sentence locates the result in last year's pilot, so present-tense “does” conflicts with the time frame.",
        "not only has": "“Has the revised schedule reduce” is not grammatical; perfect inversion needs “reduced.”",
        "not only was": "“Was the revised schedule reduce” is not grammatical; “was” cannot support this base-form verb.",
      },
    },
  ],
  [
    "no sooner … than",
    {
      answer: "no sooner … than",
      distractors: {
        "hardly … than": "The standard paired form is “hardly … when/before,” not “hardly … than.”",
        "not until … than": "“Not until” does not pair with “than” to express this immediate sequence.",
        "as soon as … than": "“As soon as” does not take “than” as its paired connector.",
      },
    },
  ],
  [
    "it was … that",
    {
      answer: "it was … that",
      distractors: {
        "there was … which": "This existential construction does not cleft the object as required by “a simple water filter.”",
        "it had … when": "This does not form an object-focused cleft and “when” cannot introduce the object.",
        "there were … where": "This does not form an object-focused cleft and “where” cannot introduce the object.",
      },
    },
  ],
  [
    "having completed",
    {
      answer: "having completed",
      distractors: {
        "completed having": "The auxiliary and participle are in the wrong order.",
        "to have complete": "The perfect infinitive requires the past participle “completed,” not “complete.”",
        "having been complete": "“Complete” is an adjective here; this form does not express the engineer finishing the inspection.",
      },
    },
  ],
  [
    "so do I",
    {
      answer: "so do I",
      distractors: {
        "neither do I": "This disagrees with the positive statement “I enjoy reading.”",
        "so have I": "The original uses present simple “enjoy,” not the present perfect.",
        "neither I do": "This has incorrect word order for an agreeing response.",
      },
    },
  ],
  [
    "neither have I",
    {
      answer: "neither have I",
      distractors: {
        "so have I": "This agrees with a positive statement, but the speaker says “haven't.”",
        "neither I have": "This has incorrect word order for the agreeing negative response.",
        "I haven't neither": "This uses a nonstandard double negative rather than the required response pattern.",
      },
    },
  ],
  [
    "one / ones",
    {
      answer: "one / ones",
      distractors: {
        "it / them": "These pronouns refer to specific objects and do not replace the repeated count nouns in the adjective phrases.",
        "this / those": "These demonstratives do not serve as the stated singular/plural noun substitutes.",
        "some / any": "These are quantifiers and do not complete “the smaller” and “the cheaper” as noun substitutes.",
      },
    },
  ],
  [
    "in advance",
    {
      answer: "in advance",
      distractors: {
        "at advance": "The time expression takes “in,” not “at.”",
        "on advance": "The time expression takes “in,” not “on.”",
        "by advance": "“By advance” is not the standard expression for registering ahead of time.",
      },
    },
  ],
  [
    "at risk of",
    {
      answer: "at risk of",
      distractors: {
        "in risk of": "The fixed expression is “at risk,” not “in risk.”",
        "on risk of": "The fixed expression is “at risk,” not “on risk.”",
        "at risk to": "The risk is followed by “of” before the potential event.",
      },
    },
  ],
  [
    "on behalf of",
    {
      answer: "on behalf of",
      distractors: {
        "at behalf of": "The fixed expression is “on behalf of,” not “at behalf of.”",
        "by behalf of": "The fixed expression is “on behalf of,” not “by behalf of.”",
        "on behalf to": "The represented group is introduced by “of,” not “to.”",
      },
    },
  ],
  [
    "rely on",
    {
      answer: "rely on",
      distractors: {
        "rely to": "The verb “rely” takes “on,” not “to,” for the source of support.",
        "rely for": "“For” does not introduce the people providing the directions after “rely.”",
        "rely with": "The verb “rely” takes “on” before the guides being trusted.",
      },
    },
  ],
  [
    "apologize for",
    {
      answer: "apologize for",
      distractors: {
        "apologize of": "The thing being apologized for is introduced by “for.”",
        "apologize with": "“With” does not introduce the delay as the reason for the apology.",
        "apologize from": "“From” does not introduce the event being apologized for.",
      },
    },
  ],
  [
    "be responsible for",
    {
      answer: "be responsible for",
      distractors: {
        "be responsible of": "The adjective takes “for” before a duty or action.",
        "be responsible with": "“With” does not introduce the project lead's assigned duty.",
        "be responsible from": "“From” does not introduce a responsibility.",
      },
    },
  ],
  [
    "be familiar with",
    {
      answer: "be familiar with",
      distractors: {
        "be familiar on": "The adjective takes “with” before a process someone knows.",
        "be familiar from": "“From” does not introduce the subject someone knows.",
        "be familiar over": "“Over” does not introduce the subject someone knows.",
      },
    },
  ],
  [
    "access to",
    {
      answer: "access to",
      distractors: {
        "access for": "The noun “access” takes “to” before the resource available.",
        "access with": "“With” does not introduce the resource available to students.",
        "access on": "The noun “access” takes “to,” not “on,” before the resource.",
      },
    },
  ],
  [
    "prevent someone from",
    {
      answer: "prevent someone from",
      distractors: {
        "prevent someone to": "The verb pattern is “prevent someone from doing,” not an infinitive with “to.”",
        "prevent someone of": "The verb pattern requires “from” before the action.",
        "prevent someone with": "“With” does not introduce the action being prevented.",
      },
    },
  ],
  [
    "take part in",
    {
      answer: "take part in",
      distractors: {
        "take part at": "The fixed expression is “take part in” an event.",
        "take part of": "“Part of” means a portion of something and does not mean participate in it.",
        "take part by": "“By” does not introduce the event someone participates in.",
      },
    },
  ],
  [
    "in September",
    {
      answer: "in September",
      distractors: {
        "on September": "A month without a specific date takes “in.”",
        "at September": "A month without a specific date takes “in.”",
        "in the September": "Month names used this way do not take “the.”",
      },
    },
  ],
  [
    "on 2 June",
    {
      answer: "on 2 June",
      distractors: {
        "in 2 June": "A specific calendar date takes “on,” not “in.”",
        "at 2 June": "A specific calendar date takes “on,” not “at.”",
        "on the 2 June": "The date is conventionally written “on 2 June” without “the.”",
      },
    },
  ],
  [
    "at 8:30 a.m.",
    {
      answer: "at 8:30 a.m.",
      distractors: {
        "in 8:30 a.m.": "A specific clock time takes “at.”",
        "on 8:30 a.m.": "A specific clock time takes “at,” not “on.”",
        "on the 8:30 a.m.": "A clock time takes “at”; “on the 8:30 a.m.” is not a grammatical time phrase.",
      },
    },
  ],
  [
    "in the morning",
    {
      answer: "in the morning",
      distractors: {
        "on the morning": "The general period of a day takes “in” in this expression.",
        "at the morning": "The general period of a day takes “in” in this expression.",
        "in morning": "This general time expression requires the article “the.”",
      },
    },
  ],
  [
    "at night",
    {
      answer: "at night",
      distractors: {
        "in night": "The standard general time expression is “at night.”",
        "on night": "The standard general time expression is “at night.”",
        "at the night": "The general time expression normally omits “the.”",
      },
    },
  ],
  [
    "in a small drawer",
    {
      answer: "in a small drawer",
      distractors: {
        "on a small drawer": "The key is inside the drawer, not on its surface.",
        "at a small drawer": "“At” identifies a point or location, not containment inside a drawer.",
        "over a small drawer": "“Over” places the key above the drawer rather than inside it.",
      },
    },
  ],
  [
    "on the desk",
    {
      answer: "on the desk",
      distractors: {
        "in the desk": "The prompt specifies the top surface, not inside the desk.",
        "at the desk": "This means at the desk location, not resting on its top surface.",
        "under the desk": "This places the form below the desk, contrary to the prompt.",
      },
    },
  ],
  [
    "at the main entrance",
    {
      answer: "at the main entrance",
      distractors: {
        "in the main entrance": "The speaker waits outside the building, not inside an entrance area.",
        "on the main entrance": "“On” would place the person on the entrance structure, not at the location.",
        "through the main entrance": "“Through” describes movement via the entrance, not waiting outside it.",
      },
    },
  ],
  [
    "in Singapore",
    {
      answer: "in Singapore",
      distractors: {
        "on Singapore": "A city or country is expressed with “in.”",
        "at Singapore": "A city or country is expressed with “in,” not “at.”",
        "through Singapore": "“Through” describes movement across a place, not living there.",
      },
    },
  ],
  [
    "believe in",
    {
      answer: "believe in",
      distractors: {
        "believe on": "The fixed expression meaning have faith in a principle is “believe in.”",
        "believe at": "“At” does not introduce the principle someone accepts as valuable.",
        "believe for": "“For” does not introduce the object of belief in this meaning.",
      },
    },
  ],
  [
    "focus on",
    {
      answer: "focus on",
      distractors: {
        "focus in": "The verb takes “on” before the subject receiving attention.",
        "focus at": "“At” does not introduce the topic receiving attention.",
        "focus for": "“For” does not introduce the topic receiving attention.",
      },
    },
  ],
  [
    "good at",
    {
      answer: "good at",
      distractors: {
        "good in": "The usual pattern for ability at an activity is “good at.”",
        "good on": "“On” does not introduce an activity someone performs well.",
        "good for": "“Good for” means beneficial or suitable, not skilled at an activity.",
      },
    },
  ],
  [
    "interested in",
    {
      answer: "interested in",
      distractors: {
        "interested on": "The adjective takes “in” before a subject of interest.",
        "interested at": "“At” does not introduce the subject someone wants to learn about.",
        "interested for": "The adjective takes “in” before the subject of interest.",
      },
    },
  ],
]);

const conjunctionAnswerUniquenessReviews = new Map([
  [
    "as soon as",
    {
      answer: "as soon as",
      distractors: {
        "even though":
          "This introduces a contrast, not the immediate time when the message should be sent.",
        "provided that":
          "This makes seeing the lights a condition, but does not express the requested immediate timing.",
        "in order that":
          "This introduces a purpose clause, while seeing the lights is the time trigger.",
      },
    },
  ],
  [
    "by the time",
    {
      answer: "by the time",
      distractors: {
        "in case":
          "This would make reaching the village a precaution, not a time by which safety had lasted.",
        "even if":
          "This gives a hypothetical condition, not the ambulance's actual arrival time.",
        "so that":
          "This would make the ambulance's arrival a purpose or result, not the stated time boundary.",
      },
    },
  ],
  [
    "just as",
    {
      answer: "just as",
      distractors: {
        "even if":
          "This means the kick happens regardless of a possible whistle, not at the same moment.",
        "in order that":
          "This would make the whistle a purpose for kicking rather than a simultaneous event.",
        "provided that":
          "This makes the whistle a condition for the kick instead of marking exact simultaneity.",
      },
    },
  ],
  [
    "now when",
    {
      answer: "now when",
      distractors: {
        "in case":
          "This describes preparation for a possible event, not the repeated memory triggered by hearing the bell.",
        "provided that":
          "This makes hearing the bell a condition, but the sentence describes a recurring time trigger.",
        "so that":
          "This would give a purpose for hearing the bell, not the repeated event that prompts the memory.",
      },
    },
  ],
  [
    "now that",
    {
      answer: "now that",
      distractors: {
        "in case":
          "This expresses precaution, while the completed repair is the reason the library can reopen.",
        "as if":
          "This would make the repair seem hypothetical, despite the prompt stating it is complete.",
        "even if":
          "This makes the completed repair hypothetical instead of presenting it as the cause of reopening.",
      },
    },
  ],
  [
    "as long as",
    {
      answer: "as long as",
      distractors: {
        "in case":
          "This describes borrowing as a precaution, not as something allowed on the return condition.",
        "even though":
          "This introduces a contrast, but returning the compass is a condition for borrowing it.",
        "just as":
          "This marks simultaneous events and cannot express the stated requirement for borrowing.",
      },
    },
  ],
  [
    "in case",
    {
      answer: "in case",
      distractors: {
        "if only":
          "This expresses a wish or regret, not a precaution to take before help may be needed.",
        "even if":
          "This means the saving happens regardless of need, not as preparation for possible need.",
        "so that":
          "This would state a purpose, but the prompt specifically prepares for a possible emergency.",
      },
    },
  ],
  [
    "even if",
    {
      answer: "even if",
      distractors: {
        "even though":
          "The forecast is uncertain, so snow is only a possibility rather than an established fact.",
        "in case":
          "This normally introduces a precaution, not a condition under which the airport stays open.",
        "by the time":
          "This requires a time boundary, but the prompt states that the outcome holds despite possible snow.",
      },
    },
  ],
  [
    "even though",
    {
      answer: "even though",
      distractors: {
        "in case":
          "The prompt establishes that the road was icy, making this a factual concession rather than a precaution.",
        "provided that":
          "This makes the icy road a condition for arriving on time, not a real obstacle overcome.",
        "so that":
          "This would make the icy road a purpose or result, rather than a factual concession.",
      },
    },
  ],
  [
    "provided that",
    {
      answer: "provided that",
      distractors: {
        "even though":
          "This marks a contrast, but sealing the sample is a requirement for acceptance.",
        "if only":
          "This expresses a wish or regret, not the lab's condition for accepting the sample.",
        "in case":
          "This describes a precaution, while the prompt makes sealing a requirement for acceptance.",
      },
    },
  ],
  [
    "if only",
    {
      answer: "if only",
      distractors: {
        "even if":
          "This introduces a hypothetical condition, but the exclamation expresses regret about the past.",
        "as though":
          "This means “as if” and cannot introduce the speaker's wish to have kept the receipt.",
        "by the time":
          "This introduces a time boundary, not a past regret or unrealized wish.",
      },
    },
  ],
  [
    "as much as",
    {
      answer: "as much as",
      distractors: {
        "provided that":
          "This states a condition for approval, but the prompt contrasts liking the idea with lacking figures.",
        "in case":
          "This introduces a precaution, not the concession that the speaker likes the idea.",
        "as though":
          "This means “as if” and does not introduce the concessive contrast in this sentence.",
      },
    },
  ],
  [
    "as if",
    {
      answer: "as if",
      distractors: {
        "so that":
          "This gives a purpose, but the child is not speaking in order to know the author for years.",
        "in case":
          "This introduces a precaution, not the comparison between the child's manner and long familiarity.",
        "provided that":
          "This states a condition, while the prompt compares how the child spoke with an imagined history.",
      },
    },
  ],
  [
    "as though",
    {
      answer: "as though",
      distractors: {
        "as long as":
          "This expresses duration or a condition, not the dog's appearance of believing the bowl is full.",
        "so that":
          "This introduces purpose or result, not the imagined state suggested by the dog's stare.",
        "provided that":
          "This states a condition and does not express the bowl's unreal, imagined fullness.",
      },
    },
  ],
  [
    "as far as",
    {
      answer: "as far as",
      distractors: {
        "provided that":
          "This makes the map-based observation a condition, rather than limiting the speaker's knowledge.",
        "in order that":
          "This introduces a purpose clause, but the speaker is reporting a limited observation.",
        "even though":
          "This introduces a contrast, while the sentence limits the claim to what the map shows.",
      },
    },
  ],
  [
    "inasmuch as",
    {
      answer: "inasmuch as",
      distractors: {
        "as though":
          "This introduces a comparison, not the stated reason the form must be returned.",
        "by the time":
          "This introduces a time boundary, but missing signatures explain why approval is denied.",
        "so that":
          "This states a purpose or result, not the reason the form cannot be approved.",
      },
    },
  ],
  [
    "in order that",
    {
      answer: "in order that",
      distractors: {
        "even if":
          "This introduces a condition, while the visitors' ability to follow is the guide's purpose.",
        "as if":
          "This introduces a comparison, not the intended result of repeating each step slowly.",
        "in case":
          "This describes a precaution, but the guide repeats the steps with the purpose of helping visitors follow.",
      },
    },
  ],
  [
    "so that",
    {
      answer: "so that",
      distractors: {
        "inasmuch as":
          "This gives a reason, but preventing confusion is the purpose of labeling the jars.",
        "as far as":
          "This limits the extent of a claim and cannot express the intended purpose here.",
        "even though":
          "This introduces a concession, but nobody confusing the spices is the intended result.",
      },
    },
  ],
]);

const linkingAdverbAnswerUniquenessReviews = new Map([
  [
    "accordingly",
    {
      answer: "accordingly",
      distractors: {
        "however":
          "This signals contrast, but the schedule was changed to match the new opening hours.",
        "meanwhile":
          "This signals simultaneous events, but the schedule adjustment responds to the changed hours.",
        "instead":
          "This replaces one action with another, but the sentence describes adjusting the schedule to fit.",
      },
    },
  ],
  [
    "consequently",
    {
      answer: "consequently",
      distractors: {
        "meanwhile":
          "This signals simultaneous events, but leaving the passport at home caused the missed flight.",
        "nonetheless":
          "This means an outcome happened despite an obstacle, but the missed flight follows from the lost passport.",
        "rather":
          "This corrects or restates an idea, but the second clause gives the consequence of leaving the passport.",
      },
    },
  ],
  [
    "hence",
    {
      answer: "hence",
      distractors: {
        "indeed":
          "This emphasizes or confirms a point, but taking another route follows from the bridge closure.",
        "similarly":
          "This compares like cases, but the route change is a consequence of the closure.",
        "meanwhile":
          "This signals simultaneous events, but the second clause follows from the bridge being closed.",
      },
    },
  ],
  [
    "therefore",
    {
      answer: "therefore",
      distractors: {
        "however":
          "This signals an unexpected contrast, but passing every safety test supports readiness to ship.",
        "likewise":
          "This compares a similar case, but the sentence draws a conclusion from the test results.",
        "rather":
          "This corrects or restates an idea, but readiness is a conclusion supported by the passed tests.",
      },
    },
  ],
  [
    "then",
    {
      answer: "then",
      distractors: {
        "however":
          "This signals contrast, but placing the jar is the next step after labeling it.",
        "indeed":
          "This emphasizes a claim, but the prompt needs a connector for the next step in sequence.",
        "meanwhile":
          "This signals concurrent actions, but the prompt explicitly says labeling must happen first.",
      },
    },
  ],
  [
    "finally",
    {
      answer: "finally",
      distractors: {
        "meanwhile":
          "This signals simultaneous activity, but finding the signature concludes an hour-long search.",
        "similarly":
          "This compares like cases, but the sentence describes the eventual discovery after searching.",
        "instead":
          "This replaces one choice with another, but finding the signature is the search's final result.",
      },
    },
  ],
  [
    "furthermore",
    {
      answer: "furthermore",
      distractors: {
        "instead":
          "This replaces one option with another, but battery life is an additional benefit of the bike.",
        "then":
          "This marks a next step in time, but the second clause adds another supporting feature.",
        "hence":
          "This draws a result or conclusion, but affordability does not cause the battery to last all day.",
      },
    },
  ],
  [
    "moreover",
    {
      answer: "moreover",
      distractors: {
        "meanwhile":
          "This marks events happening at the same time, but Sunday opening is an additional fact about the museum.",
        "rather":
          "This corrects or restates an idea, but the second clause adds another positive feature.",
        "therefore":
          "This draws a conclusion, but being free does not establish that the museum is open every Sunday.",
      },
    },
  ],
  [
    "meanwhile",
    {
      answer: "meanwhile",
      distractors: {
        "rather":
          "This corrects or restates an idea, but chopping vegetables happens while the rice cooks.",
        "however":
          "This signals contrast, but cooking rice and chopping vegetables are concurrent tasks.",
        "indeed":
          "This emphasizes or confirms a claim, but the prompt marks two tasks happening at the same time.",
      },
    },
  ],
  [
    "indeed",
    {
      answer: "indeed",
      distractors: {
        "instead":
          "This replaces one choice with another, but the six-hour climb confirms the hike was demanding.",
        "accordingly":
          "This describes an adjustment to a situation, but the climb is evidence supporting the first claim.",
        "similarly":
          "This compares like cases, but the second clause supplies evidence about the same hike.",
      },
    },
  ],
  [
    "likewise",
    {
      answer: "likewise",
      distractors: {
        "then":
          "This marks a next step in a sequence, but the brother's volunteering parallels Mai's action.",
        "however":
          "This signals contrast, but both siblings gave time to help at the shelter.",
        "consequently":
          "This gives a cause-and-effect result, but the brother's action is a parallel example.",
      },
    },
  ],
  [
    "similarly",
    {
      answer: "similarly",
      distractors: {
        "meanwhile":
          "This signals simultaneous events, but the second class is presented as a comparable case.",
        "instead":
          "This replaces one option with another, but the second class made progress as a parallel example.",
        "therefore":
          "This draws a conclusion from the first clause, but the prompt only presents a comparable result.",
      },
    },
  ],
  [
    "however",
    {
      answer: "however",
      distractors: {
        "accordingly":
          "This describes an adjustment, but the rain contrasts with the forecast rather than responding to it.",
        "likewise":
          "This compares like cases, but the rain is the opposite of what the forecast led readers to expect.",
        "indeed":
          "This emphasizes or confirms a claim, but the rain contradicts the promised sunshine.",
      },
    },
  ],
  [
    "nevertheless",
    {
      answer: "nevertheless",
      distractors: {
        "hence":
          "This gives a result, but continuing to the summit happens despite the steep path.",
        "meanwhile":
          "This signals simultaneous events, but the second clause describes persisting despite an obstacle.",
        "therefore":
          "This draws a conclusion, but the hikers continued in spite of the difficulty.",
      },
    },
  ],
  [
    "nonetheless",
    {
      answer: "nonetheless",
      distractors: {
        "moreover":
          "This adds a supporting point, but building the desk happened despite the difficult instructions.",
        "then":
          "This marks a next step in time, but the sentence emphasizes persistence despite an obstacle.",
        "accordingly":
          "This describes an adjustment, but Ava built the desk despite the instructions' complexity.",
      },
    },
  ],
  [
    "instead",
    {
      answer: "instead",
      distractors: {
        "meanwhile":
          "This signals simultaneous events, but takeaway replaces eating at the unavailable café tables.",
        "consequently":
          "This cannot form the required “consequently of waiting” phrase; the sentence needs the replacement phrase “instead of.”",
        "indeed":
          "This emphasizes or confirms a claim, but takeaway is an alternative to sitting at the café.",
      },
    },
  ],
  [
    "rather",
    {
      answer: "rather",
      distractors: {
        "accordingly":
          "This describes an adjustment, but the second clause corrects the stated assumption about the problem.",
        "finally":
          "This marks a last step or outcome, but the sentence revises the explanation of the problem.",
        "likewise":
          "This compares similar cases, but the second clause replaces the price explanation with the actual issue.",
      },
    },
  ],
]);

// Add a { term, alternative } entry when an audit finds a second plausible answer.
// The check below intentionally fails until the question is rewritten or the
// competing choice is removed.
const sentenceStructureAmbiguityFindings = [];
const conjunctionAmbiguityFindings = [];
const linkingAdverbAmbiguityFindings = [];

// Keep both versions anchored to the same usage scenario; update the cues when
// intentionally rewriting a pair of aligned examples.
const linkingAdverbExampleUsageChecks = new Map([
  [
    "accordingly",
    {
      example: [/opening hours changed/i, /adjusted our schedule/i],
      exercise: [/opening hours changed/i, /adjusted our schedule/i],
    },
  ],
  [
    "consequently",
    {
      example: [/left his passport at home/i, /could not board the flight/i],
      exercise: [/left his passport at home/i, /could not board the flight/i],
    },
  ],
  [
    "hence",
    {
      example: [/bridge is closed/i, /take another route/i],
      exercise: [/bridge is closed/i, /take another route/i],
    },
  ],
  [
    "therefore",
    {
      example: [/safety test passed/i, /device is ready to ship/i],
      exercise: [/safety test passed/i, /device is ready to ship/i],
    },
  ],
  [
    "then",
    {
      example: [/label(?:ing)? each jar/i, /place it on the correct shelf/i],
      exercise: [/label(?:ing)? each jar/i, /place it on the correct shelf/i],
    },
  ],
  [
    "finally",
    {
      example: [/checked every page/i, /finally found the missing signature/i],
      exercise: [/checking every sheet/i, /found it at last/i],
    },
  ],
  [
    "furthermore",
    {
      example: [/bike is affordable/i, /battery lasts all day/i],
      exercise: [/bike is affordable/i, /battery lasts all day/i],
    },
  ],
  [
    "moreover",
    {
      example: [/museum is free/i, /open every Sunday/i],
      exercise: [/museum is free/i, /open every Sunday/i],
    },
  ],
  [
    "meanwhile",
    {
      example: [/rice is cooking/i, /chop the vegetables/i],
      exercise: [/rice is cooking/i, /chop the vegetables.*while it simmers/i],
    },
  ],
  [
    "however",
    {
      example: [/forecast promised sunshine/i, /rained all afternoon/i],
      exercise: [/forecast promised sunshine/i, /rained all afternoon/i],
    },
  ],
  [
    "nevertheless",
    {
      example: [/path was steep/i, /continued to the summit/i],
      exercise: [/path was steep/i, /continued to the summit/i],
    },
  ],
  [
    "nonetheless",
    {
      example: [/instructions looked complicated/i, /built the desk/i],
      exercise: [/instructions looked complicated/i, /built the desk/i],
    },
  ],
  [
    "instead",
    {
      example: [/café had no tables/i, /ordered takeaway/i],
      exercise: [/café had no tables/i, /ordered takeaway/i],
    },
  ],
  [
    "rather",
    {
      example: [/not the price/i, /delivery was too slow/i],
      exercise: [/not the price/i, /delivery was too slow/i],
    },
  ],
  [
    "indeed",
    {
      example: [/hike was demanding/i, /climbed for six hours/i],
      exercise: [/hike was demanding/i, /climbed for six hours/i],
    },
  ],
  [
    "likewise",
    {
      example: [
        /Mai volunteered at the shelter/i,
        /brother gave up weekends to help/i,
      ],
      exercise: [
        /Mai volunteered at the shelter/i,
        /brother gave up weekends to help/i,
      ],
    },
  ],
  [
    "similarly",
    {
      example: [/first class improved its scores/i, /second class made progress/i],
      exercise: [/first class improved its scores/i, /second class made progress/i],
    },
  ],
]);

function checkAnswerUniqueness({
  courseName,
  questions,
  reviews,
  ambiguityFindings,
}) {
  assert.equal(
    ambiguityFindings.length,
    0,
    `${courseName} questions have multiple plausible answers: ${ambiguityFindings
      .map(({ term, alternative }) => `${term}: ${alternative}`)
      .join("; ")}. Rewrite the prompt or remove the competing choice.`,
  );
  const questionsByTerm = new Map(
    questions.map((question) => [question.term, question]),
  );
  assert.equal(
    reviews.size,
    questionsByTerm.size,
    `Every ${courseName} question must have a uniqueness review.`,
  );
  for (const question of questions) {
    const review = reviews.get(question.term);
    assert.ok(
      review,
      `${question.term} is missing its answer-uniqueness review.`,
    );
    assert.equal(
      review.answer,
      question.term,
      `${question.term} must be reviewed against its keyed answer.`,
    );
    const distractorChoices = question.choices.filter(
      (choice) => choice !== question.term,
    );
    assert.deepEqual(
      Object.keys(review.distractors).sort(),
      [...distractorChoices].sort(),
      `${question.term} must review every distractor and no other choice.`,
    );
    for (const [choice, reason] of Object.entries(review.distractors)) {
      assert.ok(
        typeof reason === "string" && reason.trim().length >= 20,
        `${question.term}: explain why “${choice}” cannot also be correct.`,
      );
    }
  }
  for (const term of reviews.keys()) {
    assert.ok(
      questionsByTerm.has(term),
      `${term} has a uniqueness review but no grammar question.`,
    );
  }
}

const expectedConjunctionExamplePairs = {
  "as if": {
    dictionary: [
      "The child spoke to the author as if they had known each other for years.",
      "Đứa trẻ nói chuyện với tác giả như thể hai người đã quen nhau nhiều năm.",
    ],
  },
  "as long as": {
    dictionary: [
      "You may borrow my compass as long as you return it before sunset.",
      "Bạn có thể mượn la bàn miễn là trả lại trước khi mặt trời lặn.",
    ],
  },
  "as much as": {
    dictionary: [
      "As much as I like the idea, I cannot approve the budget without figures.",
      "Dù rất thích ý tưởng đó, tôi không thể duyệt ngân sách khi chưa có số liệu.",
    ],
  },
  "as soon as": {
    dictionary: [
      "Text me as soon as the plane lands.",
      "Hãy nhắn cho tôi ngay khi máy bay hạ cánh.",
    ],
    course: [
      "Text me as soon as you see the plane's landing lights; do not wait for it to reach the gate.",
      "Hãy nhắn cho tôi ngay khi thấy đèn hạ cánh của máy bay; đừng đợi máy bay tới cổng.",
    ],
  },
  "as far as": {
    dictionary: [
      "As far as the map shows, the footpath ends at the river.",
      "Theo như bản đồ thể hiện, lối mòn kết thúc ở con sông.",
    ],
    course: [
      "As far as I can tell from the map, the footpath ends at the river.",
      "Theo như tôi có thể nhận định từ bản đồ, lối mòn kết thúc ở con sông.",
    ],
  },
  "as though": {
    dictionary: [
      "The dog stared at the empty bowl as though it expected another meal.",
      "Con chó nhìn chằm chằm vào chiếc bát trống như thể nó đang chờ thêm thức ăn.",
    ],
    course: [
      "The dog stared at the empty bowl as though it were still full.",
      "Con chó nhìn chằm chằm vào chiếc bát trống như thể bát vẫn còn đầy.",
    ],
  },
  "by the time": {
    dictionary: [
      "The rescue team had been waiting at the village for two hours by the time the ambulance arrived.",
      "Đến lúc xe cứu thương đến, đội cứu hộ đã chờ ở làng được hai tiếng.",
    ],
  },
  "inasmuch as": {
    dictionary: [
      "Inasmuch as two signatures are missing, we cannot approve the form.",
      "Vì còn thiếu hai chữ ký, chúng tôi chưa thể duyệt biểu mẫu.",
    ],
  },
  "in order that": {
    dictionary: [
      "The guide repeated each step slowly in order that every visitor could follow.",
      "Người hướng dẫn lặp lại từng bước chậm rãi để mọi khách tham quan có thể theo kịp.",
    ],
  },
  "in case": {
    dictionary: [
      "Save the emergency number in your phone in case you need help.",
      "Hãy lưu số khẩn cấp vào điện thoại phòng khi bạn cần trợ giúp.",
    ],
  },
  "now that": {
    dictionary: [
      "Now that the repair is finished, the library can reopen.",
      "Giờ việc sửa chữa đã xong, thư viện có thể mở cửa lại.",
    ],
    course: [
      "Now that the final repair is complete, the library can reopen; the safety issue that forced it to close is gone.",
      "Giờ việc sửa chữa cuối cùng đã xong, thư viện có thể mở cửa lại vì vấn đề an toàn khiến nơi này phải đóng cửa đã được xử lý.",
    ],
  },
  "now when": {
    dictionary: [
      "Now when I hear the old school bell, I remember my first day.",
      "Giờ đây, mỗi khi nghe tiếng chuông trường cũ, tôi lại nhớ ngày đầu tiên đi học.",
    ],
    course: [
      "I used to ignore the old school bell, but now when I hear it, I remember my first day.",
      "Trước đây tôi thường bỏ qua tiếng chuông trường cũ, nhưng giờ mỗi khi nghe thấy, tôi lại nhớ ngày đầu tiên đi học.",
    ],
  },
  "even if": {
    dictionary: [
      "Even if it snows tonight, the airport will remain open.",
      "Ngay cả khi tối nay có tuyết, sân bay vẫn sẽ mở cửa.",
    ],
    course: [
      "The forecast is uncertain. Even if it snows tonight, the airport will remain open.",
      "Dự báo chưa chắc chắn. Ngay cả khi tối nay có tuyết, sân bay vẫn mở cửa.",
    ],
  },
  "even though": {
    dictionary: [
      "Even though the road was icy, the bus arrived on time.",
      "Mặc dù đường đóng băng, xe buýt vẫn đến đúng giờ.",
    ],
    course: [
      "Even though the road was icy, the bus still arrived on time.",
      "Mặc dù mặt đường phủ băng, xe buýt vẫn đến đúng giờ.",
    ],
  },
  "provided that": {
    dictionary: [
      "The lab will accept your sample provided that it is sealed before noon.",
      "Phòng thí nghiệm sẽ nhận mẫu với điều kiện mẫu được niêm phong trước buổi trưa.",
    ],
  },
  "if only": {
    dictionary: [
      "If only I had kept the receipt, I could have returned the headphones.",
      "Giá mà tôi đã giữ hóa đơn thì tôi đã có thể trả lại tai nghe.",
    ],
    course: [
      "If only I had kept the receipt! I could have returned these headphones yesterday.",
      "Giá mà tôi đã giữ hóa đơn! Hôm qua tôi đã có thể trả lại chiếc tai nghe này.",
    ],
  },
  "just as": {
    dictionary: [
      "Just as the referee blew the whistle to start the match, the striker kicked the ball.",
      "Đúng lúc trọng tài thổi còi khai cuộc, tiền đạo sút bóng.",
    ],
    course: [
      "The striker kicked the ball just as the referee blew the whistle to start the match.",
      "Tiền đạo sút bóng đúng lúc trọng tài thổi còi khai cuộc.",
    ],
  },
  "so that": {
    dictionary: [
      "Nora labeled every jar so that nobody would confuse the spices.",
      "Nora dán nhãn lên từng lọ để không ai nhầm các loại gia vị.",
    ],
  },
};

function assertConjunctionExamplePairs(dictionaryEntries, courseEntries) {
  const expectedTerms = Object.keys(expectedConjunctionExamplePairs).sort();
  const actualDictionaryTerms = dictionaryEntries
    .filter((entry) => entry.pos === "conj")
    .map((entry) => entry.term)
    .sort();
  assert.deepEqual(
    actualDictionaryTerms,
    expectedTerms,
    "Conjunction dictionary entries must cover every reviewed example term.",
  );
  assert.deepEqual(
    [...courseEntries.keys()].sort(),
    expectedTerms,
    "Conjunction course entries must cover every reviewed example term.",
  );

  const dictionaryByTerm = new Map(
    dictionaryEntries.map((entry) => [entry.term, entry]),
  );
  for (const term of expectedTerms) {
    const reviewed = expectedConjunctionExamplePairs[term];
    for (const [source, entry, expectedPair] of [
      ["dictionary", dictionaryByTerm.get(term), reviewed.dictionary],
      [
        "course",
        courseEntries.get(term),
        reviewed.course ?? reviewed.dictionary,
      ],
    ]) {
      assert.ok(
        entry,
        `Missing ${source} conjunction example pair for "${term}".`,
      );
      assert.ok(
        entry.example?.toLowerCase().includes(term.toLowerCase()),
        `The ${source} example for "${term}" must include its target term.`,
      );
      if (
        entry.example !== expectedPair[0] ||
        entry.exampleTranslation !== expectedPair[1]
      ) {
        throw new Error(
          `Conjunction ${source} example pair mismatch for "${term}".`,
        );
      }
    }
  }
}

const expectedLinkingAdverbExamplePairs = {
  accordingly: [
    "The opening hours changed, so we adjusted our schedule accordingly.",
    "Giờ mở cửa đã thay đổi, vì vậy chúng tôi điều chỉnh lịch trình cho phù hợp.",
  ],
  consequently: [
    "Leo left his passport at home; consequently, he could not board the flight.",
    "Leo để quên hộ chiếu ở nhà; vì vậy, cậu ấy không thể lên máy bay.",
  ],
  hence: [
    "The bridge is closed; hence, we must take another route.",
    "Cây cầu đã đóng; vì vậy, chúng ta phải đi đường khác.",
  ],
  therefore: [
    "Every safety test passed; therefore, the device is ready to ship.",
    "Mọi bài kiểm tra an toàn đều đạt; vì vậy, thiết bị đã sẵn sàng để giao.",
  ],
  then: [
    "Label each jar; then, place it on the correct shelf.",
    "Hãy dán nhãn từng lọ; sau đó, đặt lọ lên đúng kệ.",
  ],
  finally: [
    "We checked every page and finally found the missing signature.",
    "Chúng tôi kiểm tra từng trang và cuối cùng tìm thấy chữ ký còn thiếu.",
  ],
  furthermore: [
    "The bike is affordable; furthermore, its battery lasts all day.",
    "Chiếc xe đạp có giá phải chăng; hơn nữa, pin dùng được cả ngày.",
  ],
  moreover: [
    "The museum is free; moreover, it is open every Sunday.",
    "Bảo tàng miễn phí; hơn nữa, nơi này mở cửa vào mỗi Chủ nhật.",
  ],
  meanwhile: [
    "The rice is cooking; meanwhile, chop the vegetables.",
    "Cơm đang nấu; trong lúc đó, hãy cắt rau củ.",
  ],
  however: [
    "The forecast promised sunshine; however, it rained all afternoon.",
    "Dự báo nói trời sẽ nắng; tuy nhiên, trời mưa suốt buổi chiều.",
  ],
  nevertheless: [
    "The path was steep; nevertheless, the hikers continued to the summit.",
    "Con đường dốc; dù vậy, nhóm đi bộ vẫn tiếp tục lên đỉnh.",
  ],
  nonetheless: [
    "The instructions looked complicated; nonetheless, Ava built the desk.",
    "Hướng dẫn trông có vẻ phức tạp; mặc dù thế, Ava vẫn lắp được chiếc bàn.",
  ],
  instead: [
    "The café had no tables, so we ordered takeaway instead.",
    "Quán cà phê không còn bàn, vì vậy chúng tôi gọi đồ mang đi thay vào đó.",
  ],
  rather: [
    "The problem was not the price; rather, the delivery was too slow.",
    "Vấn đề không nằm ở giá; đúng hơn là khâu giao hàng quá chậm.",
  ],
  indeed: [
    "The hike was demanding; indeed, we climbed for six hours.",
    "Chuyến đi bộ thật vất vả; quả thật, chúng tôi đã leo suốt sáu tiếng.",
  ],
  likewise: [
    "Mai volunteered at the shelter; likewise, her brother gave up weekends to help.",
    "Mai tình nguyện ở mái ấm; tương tự, anh trai cô cũng dành cuối tuần để giúp đỡ.",
  ],
  similarly: [
    "The first class improved its scores. Similarly, the second class made progress.",
    "Lớp đầu tiên cải thiện điểm số. Tương tự, lớp thứ hai cũng tiến bộ.",
  ],
};

function assertLinkingAdverbExamplePairs(dictionaryEntries, courseEntries) {
  const expectedTerms = Object.keys(expectedLinkingAdverbExamplePairs).sort();
  const actualDictionaryTerms = dictionaryEntries
    .filter((entry) => entry.pos === "adv")
    .map((entry) => entry.term)
    .sort();
  for (const term of actualDictionaryTerms) {
    assert.ok(
      Object.hasOwn(expectedLinkingAdverbExamplePairs, term),
      `Unreviewed dictionary linking-adverb example pair for "${term}".`,
    );
  }
  for (const term of Object.keys(courseEntries)) {
    assert.ok(
      Object.hasOwn(expectedLinkingAdverbExamplePairs, term),
      `Missing reviewed linking-adverb example pair for "${term}".`,
    );
  }
  const dictionaryByTerm = new Map(
    dictionaryEntries.map((entry) => [entry.term, entry]),
  );
  for (const term of expectedTerms) {
    const expectedPair = expectedLinkingAdverbExamplePairs[term];
    for (const [source, entry] of [
      ["dictionary", dictionaryByTerm.get(term)],
      ["course", courseEntries[term]],
    ]) {
      assert.ok(
        entry,
        `Missing ${source} linking-adverb example pair for "${term}".`,
      );
      if (
        entry.example !== expectedPair[0] ||
        entry.exampleTranslation !== expectedPair[1]
      ) {
        throw new Error(
          `Linking-adverb ${source} example pair mismatch for "${term}".`,
        );
      }
    }
  }
  assert.deepEqual(
    actualDictionaryTerms,
    expectedTerms,
    "Linking-adverb dictionary entries must cover every reviewed example term.",
  );
  assert.deepEqual(
    Object.keys(courseEntries).sort(),
    expectedTerms,
    "Linking-adverb course entries must cover every reviewed example term.",
  );
}

async function checkDictionaryOverlay() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      lang_code TEXT NOT NULL DEFAULT 'vi'
    );
    CREATE TABLE definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition TEXT NOT NULL,
      pos TEXT,
      sub_pos TEXT,
      definition_lang TEXT DEFAULT 'vi',
      UNIQUE(definition, pos, sub_pos)
    );
    CREATE TABLE word_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      definition_id INTEGER NOT NULL,
      example TEXT
    );
  `);
  const existingToeicEntry = additions.TOEIC_TOPIC_DICTIONARY_ADDITIONS[0];
  const existingWordId = sqlite
    .prepare("INSERT INTO words (word, lang_code) VALUES (?, 'en')")
    .run(existingToeicEntry.term).lastInsertRowid;
  const existingDefinitionId = sqlite
    .prepare(
      "INSERT INTO definitions (definition, pos, sub_pos, definition_lang) VALUES (?, 'n', NULL, 'vi')",
    )
    .run("Nghĩa đã có trong từ điển gốc.").lastInsertRowid;
  sqlite
    .prepare(
      "INSERT INTO word_definitions (word_id, definition_id, example) VALUES (?, ?, ?)",
    )
    .run(existingWordId, existingDefinitionId, "An existing dictionary example.");
  const priorConjunction = additions.LOCAL_DICTIONARY_ADDITIONS.find(
    (entry) => entry.term === "even if",
  );
  const priorConjunctionWordId = sqlite
    .prepare("INSERT INTO words (word, lang_code) VALUES (?, 'en')")
    .run(priorConjunction.term).lastInsertRowid;
  const priorConjunctionDefinitionId = sqlite
    .prepare(
      "INSERT INTO definitions (definition, pos, sub_pos, definition_lang) VALUES (?, ?, ?, 'vi')",
    )
    .run(
      "Ngay cả khi; nêu một điều kiện giả định nhưng kết quả vẫn không đổi.",
      priorConjunction.pos,
      priorConjunction.subPos,
    ).lastInsertRowid;
  sqlite
    .prepare(
      "INSERT INTO word_definitions (word_id, definition_id, example) VALUES (?, ?, ?)",
    )
    .run(
      priorConjunctionWordId,
      priorConjunctionDefinitionId,
      priorConjunction.example,
    );
  const db = {
    getFirstAsync: async (sql, ...params) =>
      sqlite.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) =>
      sqlite.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => {
      const result = sqlite.prepare(sql).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    withTransactionAsync: async (callback) => {
      sqlite.exec("BEGIN");
      try {
        await callback();
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };

  await applyLocalDictionaryAdditions(db);
  await applyLocalDictionaryAdditions(db);
  const rows = sqlite
    .prepare(
      `SELECT w.word, d.definition, d.pos, d.sub_pos AS subPos,
        wd.example, w.lang_code AS langCode
       FROM words w
       JOIN word_definitions wd ON wd.word_id = w.id
       JOIN definitions d ON d.id = wd.definition_id
       ORDER BY w.word`,
    )
    .all();
  assert.equal(
    rows.length,
    additions.ALL_LOCAL_DICTIONARY_ADDITIONS.length + 1,
    "Overlay preserves an existing dictionary meaning and adds the course meaning.",
  );
  assert.equal(
    new Set(rows.map((row) => row.word)).size,
    additions.ALL_LOCAL_DICTIONARY_ADDITIONS.length,
  );
  for (const entry of additions.ALL_LOCAL_DICTIONARY_ADDITIONS) {
    const row = rows.find(
      (item) =>
        item.word === entry.term &&
        item.definition === entry.definition &&
        item.example === entry.example,
    );
    assert.ok(row, `${entry.term} exists in the offline dictionary.`);
    assert.equal(row.definition, entry.definition);
    assert.equal(row.example, entry.example);
    assert.equal(row.pos, entry.pos);
    assert.equal(row.subPos, entry.subPos);
    assert.equal(row.langCode, "en");
  }
  assert.ok(
    rows.some(
      (row) =>
        row.word === existingToeicEntry.term &&
        row.definition === "Nghĩa đã có trong từ điển gốc.",
    ),
    "Adding a course sense does not replace an existing dictionary meaning.",
  );
  assert.ok(
    rows.some(
      (row) =>
        row.word === priorConjunction.term &&
        row.definition === priorConjunction.definition &&
        row.example === priorConjunction.example,
    ),
    "An updated local conjunction meaning replaces the prior meaning for its own example.",
  );
  assert.equal(dictionaryDomain.dictionaryPartOfSpeech("conj"), "conjunction");
  const draft = dictionaryDomain.dictionaryDraft(
    {
      id: 900001,
      term: "as if",
      pronunciations: [],
    },
    {
      id: 900001,
      definition: additions.LOCAL_DICTIONARY_ADDITIONS[0].definition,
      pos: "conj",
      subPos: "subordinating",
      example: additions.LOCAL_DICTIONARY_ADDITIONS[0].example,
    },
  );
  assert.match(draft.note, /biên soạn cho VocabFlow/);
  const flyAddition = additions.LOCAL_DICTIONARY_WORD_ADDITIONS[0];
  const flyDraft = dictionaryDomain.dictionaryDraft(
    { id: 900002, term: flyAddition.term, pronunciations: [] },
    {
      id: 900002,
      definition: flyAddition.definition,
      pos: flyAddition.pos,
      subPos: flyAddition.subPos,
      example: flyAddition.example,
    },
  );
  assert.equal(flyDraft.meaning, `(Verb) ${flyAddition.definition}`);
  assert.equal(flyDraft.example, "The birds have flown south for the winter.");
  assert.match(flyDraft.note, /biên soạn cho VocabFlow/);
  sqlite.close();
}

async function checkCourseContentAndProgress() {
  const entries = new Map(
    additions.LOCAL_DICTIONARY_ADDITIONS.map((entry) => [entry.term, entry]),
  );
  const seenQuestions = new Set();
  const courseTerms = [];
  for (const lesson of course.CONJUNCTION_COURSE_LESSONS) {
    assert.ok(lesson.questions.length > 0);
    for (const question of lesson.questions) {
      assert.ok(entries.has(question.term), `${question.term} has dictionary data.`);
      assert.ok(question.prompt.includes("_____"), "Every exercise has one clear blank.");
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      const key = `${lesson.id}:${question.term}`;
      assert.ok(!seenQuestions.has(key), `${question.term} is not repeated in a lesson.`);
      seenQuestions.add(key);
      courseTerms.push(question.term);
    }
  }
  assert.equal(courseTerms.length, entries.size, "Every new entry appears in one exercise.");
  assert.equal(new Set(courseTerms).size, entries.size);
  assert.equal(course.CONJUNCTION_COURSE_TITLE, "Cấu trúc câu & từ nối");
  assert.equal(course.CONJUNCTION_COURSE_ENTRY_BY_TERM.size, entries.size);
  for (const entry of course.CONJUNCTION_COURSE_ENTRY_BY_TERM.values()) {
    assert.match(entry.definition, /Ghi chú:/, `${entry.term} explains related terms.`);
  }
  const conjunctionQuestionByTerm = new Map(
    course.CONJUNCTION_COURSE_LESSONS.flatMap((lesson) =>
      lesson.questions.map((question) => [question.term, question]),
    ),
  );
  assertConjunctionExamplePairs(
    additions.LOCAL_DICTIONARY_ADDITIONS,
    course.CONJUNCTION_COURSE_ENTRY_BY_TERM,
  );
  const mismatchedCourseExamples = new Map(
    course.CONJUNCTION_COURSE_ENTRY_BY_TERM,
  );
  mismatchedCourseExamples.set("even if", {
    ...mismatchedCourseExamples.get("even if"),
    exampleTranslation: "Mặc dù tối nay có tuyết, sân bay vẫn sẽ mở cửa.",
  });
  assert.throws(
    () =>
      assertConjunctionExamplePairs(
        additions.LOCAL_DICTIONARY_ADDITIONS,
        mismatchedCourseExamples,
      ),
    /Conjunction course example pair mismatch for "even if"/,
    "A translation that changes the target conjunction meaning fails clearly.",
  );
  const missingCourseExamples = new Map(
    course.CONJUNCTION_COURSE_ENTRY_BY_TERM,
  );
  missingCourseExamples.delete("by the time");
  assert.throws(
    () =>
      assertConjunctionExamplePairs(
        additions.LOCAL_DICTIONARY_ADDITIONS,
        missingCourseExamples,
      ),
    /Conjunction course entries must cover every reviewed example term/,
    "A missing target conjunction pair fails clearly.",
  );
  for (const [term, distractor] of [
    ["as soon as", "by the time"],
    ["by the time", "as soon as"],
    ["now when", "now that"],
    ["now that", "now when"],
    ["as though", "just as"],
    ["as far as", "just as"],
    ["as far as", "inasmuch as"],
  ]) {
    assert.ok(
      !conjunctionQuestionByTerm.get(term).choices.includes(distractor),
      `${term} does not compete with the similar answer ${distractor}.`,
    );
  }
  const conjunctionQuestions =
    course.CONJUNCTION_COURSE_LESSONS.flatMap((lesson) => lesson.questions);
  checkAnswerUniqueness({
    courseName: "Conjunction-course",
    questions: conjunctionQuestions,
    reviews: conjunctionAnswerUniquenessReviews,
    ambiguityFindings: conjunctionAmbiguityFindings,
  });
  assert.match(
    conjunctionQuestionByTerm.get("even if").prompt,
    /forecast is uncertain/i,
  );
  assert.match(
    conjunctionQuestionByTerm.get("even though").prompt,
    /road was icy/i,
  );
  assert.match(conjunctionQuestionByTerm.get("if only").prompt, /!/);
  assert.match(
    conjunctionQuestionByTerm.get("now when").prompt,
    /used to ignore the old school bell/i,
  );
  assert.ok(
    !conjunctionQuestionByTerm.get("even though").choices.includes("even if"),
    "A factual concession does not offer the hypothetical even-if alternative.",
  );
  assert.ok(
    !conjunctionQuestionByTerm.get("as much as").choices.includes("just as"),
    "The concessive as much as question does not offer the potentially competing just-as phrase.",
  );

  const linkingTerms = Object.keys(
    linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES,
  );
  const linkingAdverbDictionaryEntries =
    additions.LINKING_ADVERB_DICTIONARY_ADDITIONS;
  assertLinkingAdverbExamplePairs(
    linkingAdverbDictionaryEntries,
    linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES,
  );
  const mismatchedLinkingAdverbExamples = {
    ...linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES,
    however: {
      ...linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES.however,
      exampleTranslation:
        "Dự báo nói trời sẽ nắng; vì vậy, trời mưa suốt buổi chiều.",
    },
  };
  assert.throws(
    () =>
      assertLinkingAdverbExamplePairs(
        linkingAdverbDictionaryEntries,
        mismatchedLinkingAdverbExamples,
      ),
    /Linking-adverb course example pair mismatch for "however"/,
    "A translation that changes a linking adverb's meaning fails clearly.",
  );
  const missingLinkingAdverbExamples = {
    ...linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES,
  };
  delete missingLinkingAdverbExamples.however;
  assert.throws(
    () =>
      assertLinkingAdverbExamplePairs(
        linkingAdverbDictionaryEntries,
        missingLinkingAdverbExamples,
      ),
    /Missing course linking-adverb example pair for "however"/,
    "A missing linking-adverb example pair fails clearly.",
  );
  assert.throws(
    () =>
      assertLinkingAdverbExamplePairs(
        linkingAdverbDictionaryEntries.filter(
          (entry) => entry.term !== "however",
        ),
        linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES,
      ),
    /Missing dictionary linking-adverb example pair for "however"/,
    "A missing dictionary linking-adverb example pair fails clearly.",
  );
  const linkedQuestions = linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  assert.equal(
    linkingAdverbCourse.LINKING_ADVERB_COURSE_TITLE,
    "Trạng từ liên kết",
  );
  assert.equal(linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS.length, 3);
  assert.equal(linkingTerms.length, 17);
  assert.ok(!linkingTerms.includes("first"));
  assert.ok(!linkingTerms.includes("next"));
  assert.equal(linkedQuestions.length, linkingTerms.length);
  assert.deepEqual(
    [...linkedQuestions.map((question) => question.term)].sort(),
    [...linkingTerms].sort(),
    "Every linking adverb has one exercise.",
  );
  for (const lesson of linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS) {
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(
        linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES[question.term],
      );
      assert.match(
        linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES[question.term]
          .definition,
        /Ghi chú:/,
        `${question.term} explains related linking adverbs.`,
      );
    }
  }
  const linkingQuestionByTerm = new Map(
    linkedQuestions.map((question) => [question.term, question]),
  );
  assert.deepEqual(
    [...linkingAdverbExampleUsageChecks.keys()].sort(),
    [...linkingTerms].sort(),
    "Every linking-adverb example has an exercise-usage consistency check.",
  );
  for (const term of linkingTerms) {
    const entry = linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES[term];
    const question = linkingQuestionByTerm.get(term);
    const usageChecks = linkingAdverbExampleUsageChecks.get(term);
    assert.ok(
      usageChecks.example.every((signal) => signal.test(entry.example)),
      `${term} example no longer demonstrates the usage targeted by its exercise.`,
    );
    assert.ok(
      usageChecks.exercise.every((signal) => signal.test(question.prompt)),
      `${term} exercise no longer matches the usage demonstrated by its example.`,
    );
  }
  for (const [term, distractor] of [
    ["hence", "instead"],
    ["therefore", "moreover"],
    ["then", "accordingly"],
    ["meanwhile", "accordingly"],
    ["finally", "therefore"],
    ["indeed", "however"],
    ["indeed", "then"],
  ]) {
    assert.ok(
      !linkingQuestionByTerm.get(term).choices.includes(distractor),
      `${term} does not compete with the similar answer ${distractor}.`,
    );
  }
  checkAnswerUniqueness({
    courseName: "Linking-adverb-course",
    questions: linkedQuestions,
    reviews: linkingAdverbAnswerUniquenessReviews,
    ambiguityFindings: linkingAdverbAmbiguityFindings,
  });
  assert.match(
    linkingQuestionByTerm.get("finally").prompt,
    /after an hour of checking every sheet.*at last/i,
    "The finally question establishes a completed search rather than a generic result.",
  );
  assert.match(
    linkingQuestionByTerm.get("indeed").prompt,
    /confirming how strenuous it was/i,
    "The indeed question makes the second clause explicit evidence for the first.",
  );
  assert.match(
    linkingQuestionByTerm.get("instead").prompt,
    /_____ of waiting for a seat/i,
    "The instead question makes the replacement meaning and required phrase explicit.",
  );
  assert.ok(
    !linkingQuestionByTerm.get("meanwhile").choices.includes("accordingly"),
    "The concurrent task does not offer accordingly as a second plausible connector.",
  );

  const patternLessons =
    sentenceStructurePatternCourse.SENTENCE_STRUCTURE_PATTERN_LESSONS;
  const patternEntries =
    sentenceStructurePatternCourse.SENTENCE_STRUCTURE_PATTERN_ENTRIES;
  const patternQuestions = patternLessons.flatMap((lesson) => lesson.questions);
  checkAnswerUniqueness({
    courseName: "Sentence-structure",
    questions: patternQuestions,
    reviews: sentenceStructureAnswerUniquenessReviews,
    ambiguityFindings: sentenceStructureAmbiguityFindings,
  });
  for (const question of patternQuestions) {
    const learnerExplanations =
      sentenceStructurePatternCourse
        .SENTENCE_STRUCTURE_PATTERN_DISTRACTOR_EXPLANATIONS[question.term];
    const review = sentenceStructureAnswerUniquenessReviews.get(question.term);
    assert.deepEqual(
      learnerExplanations,
      review.distractors,
      `${question.term} shows the same selected-distractor reason that was reviewed for answer uniqueness.`,
    );
  }
  const patternTerms = Object.keys(patternEntries);
  assert.deepEqual(
    patternLessons.map((lesson) => lesson.title),
    [
      "Cặp liên từ và cấu trúc song hành",
      "Điều kiện, nhượng bộ và kết quả",
      "Đảo ngữ và câu nhấn mạnh",
      "Mệnh đề rút gọn, thay thế và lược bỏ",
      "Giới từ trong cụm thường gặp",
      "Phân biệt in, on và at",
    ],
  );
  const patternQuestionByTerm = new Map(
    patternQuestions.map((question) => [question.term, question]),
  );
  assert.match(
    patternQuestionByTerm.get("neither … nor").prompt,
    /it lacked both/i,
    "The paired-conjunction prompt establishes that both features are absent.",
  );
  assert.ok(
    !patternQuestionByTerm.get("so do I").choices.includes("so I do"),
    "The agreement question excludes the grammatical confirmation phrase so I do.",
  );
  assert.match(
    patternQuestionByTerm.get("on the desk").prompt,
    /top surface rather than inside a drawer/i,
    "The location question distinguishes the desk top from other desk locations.",
  );
  const reviewedPatternExamplePairs = {
    "either … or": [
      "For this assignment, each student must either write an individual reflection or submit one joint report.",
      "Với bài tập này, mỗi học viên phải chọn viết bài cảm nhận cá nhân hoặc nộp một báo cáo chung.",
    ],
    "neither … nor": [
      "The old plan provided neither enough time to inspect the site nor a safe route to the entrance.",
      "Kế hoạch cũ không dành đủ thời gian để kiểm tra địa điểm, cũng không có lối đi an toàn tới lối vào.",
    ],
    "not only … but also": [
      "The reading app is not only easy to use but also available offline.",
      "Ứng dụng đọc này không chỉ dễ sử dụng mà còn dùng được khi ngoại tuyến.",
    ],
    "no matter how": [
      "No matter how carefully the team checked the measurements, the old scale produced inconsistent results.",
      "Dù nhóm kiểm tra các số đo cẩn thận đến đâu, chiếc cân cũ vẫn cho kết quả không nhất quán.",
    ],
    "so … that": [
      "The archive was so vast that the researchers needed several weeks to catalogue its contents.",
      "Kho lưu trữ rộng lớn đến mức các nhà nghiên cứu cần vài tuần để lập danh mục nội dung.",
    ],
    "the more … the more": [
      "The more evidence the team examined, the more confident its conclusion became.",
      "Nhóm càng xem xét nhiều bằng chứng thì càng tự tin vào kết luận của mình.",
    ],
    "not only did": [
      "Not only did the revised schedule reduce delays, but it also lowered operating costs.",
      "Lịch trình sửa đổi không chỉ giảm chậm trễ mà còn hạ chi phí vận hành.",
    ],
    "no sooner … than": [
      "No sooner had the train left than the storm reached the station.",
      "Tàu vừa rời đi thì cơn bão đã tới nhà ga.",
    ],
    "it was … that": [
      "It was a simple water filter that the research team designed, not a costly pump.",
      "Thứ nhóm nghiên cứu thiết kế là một bộ lọc nước đơn giản, chứ không phải máy bơm đắt tiền.",
    ],
    "having completed": [
      "Having completed the final inspection, the engineer signed the safety certificate.",
      "Sau khi hoàn tất đợt kiểm tra cuối cùng, kỹ sư đã ký giấy chứng nhận an toàn.",
    ],
    "so do I": [
      "“I enjoy reading historical biographies.” “So do I,” Minh replied.",
      "“Tôi thích đọc tiểu sử lịch sử.” “Tôi cũng vậy,” Minh đáp.",
    ],
    "neither have I": [
      "“I haven't visited the new gallery yet.” “Neither have I,” Lan replied.",
      "“Tôi vẫn chưa đến phòng trưng bày mới.” “Tôi cũng chưa,” Lan đáp.",
    ],
    "one / ones": [
      "I prefer the blue one to the red ones because the blue jacket is in better condition.",
      "Tôi thích chiếc màu xanh hơn những chiếc màu đỏ vì chiếc áo khoác xanh còn tốt hơn.",
    ],
    "in advance": [
      "To secure a seat, please register in advance rather than waiting until the day of the event.",
      "Để giữ chỗ, vui lòng đăng ký trước thay vì chờ đến ngày diễn ra sự kiện.",
    ],
    "at risk of": [
      "Without urgent repairs, the old bridge is at risk of collapse.",
      "Nếu không được sửa chữa khẩn cấp, cây cầu cũ có nguy cơ sập.",
    ],
    "on behalf of": [
      "I am writing on behalf of the residents' committee to thank the volunteers.",
      "Tôi viết thư thay mặt ban đại diện cư dân để cảm ơn các tình nguyện viên.",
    ],
    "rely on": [
      "During the field study, the researchers had to rely on local guides for accurate directions.",
      "Trong chuyến khảo sát thực địa, các nhà nghiên cứu phải dựa vào hướng dẫn viên địa phương để có chỉ đường chính xác.",
    ],
    "apologize for": [
      "The supplier chose to apologize for the delay and offer a full refund.",
      "Nhà cung cấp quyết định xin lỗi vì sự chậm trễ và đề nghị hoàn tiền đầy đủ.",
    ],
    "be responsible for": [
      "As project lead, Mai is responsible for checking each citation before publication.",
      "Với vai trò trưởng dự án, Mai chịu trách nhiệm kiểm tra từng trích dẫn trước khi xuất bản.",
    ],
    "be familiar with": [
      "Please read the guide so you can become familiar with the new application process.",
      "Vui lòng đọc hướng dẫn để làm quen với quy trình nộp đơn mới.",
    ],
    "access to": [
      "Every student should have access to reliable internet during the course.",
      "Mọi học viên đều nên có quyền tiếp cận Internet ổn định trong suốt khóa học.",
    ],
    "prevent someone from": [
      "A clear warning can prevent someone from using the equipment incorrectly.",
      "Một cảnh báo rõ ràng có thể ngăn ai đó sử dụng thiết bị sai cách.",
    ],
    "take part in": [
      "Several local schools will take part in the regional science fair.",
      "Một số trường địa phương sẽ tham gia hội chợ khoa học cấp vùng.",
    ],
    "in September": [
      "The new term begins in September.",
      "Học kỳ mới bắt đầu vào tháng Chín.",
    ],
    "on 2 June": [
      "The conference opens on 2 June.",
      "Hội nghị khai mạc vào ngày 2 tháng Sáu.",
    ],
    "at 8:30 a.m.": [
      "The guided tour starts at 8:30 a.m.",
      "Chuyến tham quan có hướng dẫn bắt đầu lúc 8 giờ 30 sáng.",
    ],
    "in the morning": [
      "The bakery is open in the morning.",
      "Tiệm bánh mở cửa vào buổi sáng.",
    ],
    "at night": [
      "The park closes to visitors at night.",
      "Công viên đóng cửa với khách tham quan vào ban đêm.",
    ],
    "in a small drawer": [
      "The spare key is kept in a small drawer in the kitchen.",
      "Chìa khóa dự phòng được cất trong một ngăn kéo nhỏ ở nhà bếp.",
    ],
    "on the desk": [
      "Leave the signed form on the desk.",
      "Hãy để tờ đơn đã ký trên bàn.",
    ],
    "at the main entrance": [
      "I'll wait for you at the main entrance.",
      "Tôi sẽ đợi bạn ở lối vào.",
    ],
    "in Singapore": [
      "They have lived in Singapore since 2020.",
      "Họ đã sống ở Singapore từ năm 2020.",
    ],
    "believe in": [
      "Many people believe in the value of learning a little every day.",
      "Nhiều người tin vào giá trị của việc học một chút mỗi ngày.",
    ],
    "focus on": [
      "The report should focus on the causes of the delay.",
      "Bản báo cáo nên tập trung vào những nguyên nhân gây chậm trễ.",
    ],
    "good at": [
      "My sister is good at solving logic puzzles.",
      "Chị tôi giỏi giải các câu đố logic.",
    ],
    "interested in": [
      "Tariq is interested in marine biology.",
      "Tariq quan tâm đến ngành sinh học biển.",
    ],
  };
  const assertPatternExamplePair = (term, entry) => {
    const [expectedExample, expectedTranslation] =
      reviewedPatternExamplePairs[term] ?? [];
    assert.ok(
      expectedExample && expectedTranslation,
      `Sentence-structure pattern "${term}" has a reviewed English–Vietnamese pair.`,
    );
    const exampleLower = entry.example.toLowerCase();
    const targetPartOverrides = {
      "be responsible for": ["responsible for"],
      "be familiar with": ["familiar with"],
    };
    const targetParts = (
      targetPartOverrides[term] ??
      term.split(/\s*(?:…|\/)\s*/)
    )
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    const requiredCounts = new Map();
    for (const part of targetParts) {
      requiredCounts.set(part, (requiredCounts.get(part) ?? 0) + 1);
    }
    for (const [part, requiredCount] of requiredCounts) {
      const foundCount = exampleLower.split(part).length - 1;
      assert.ok(
        foundCount >= requiredCount,
        `Sentence-structure pattern "${term}" is missing "${part}" from its English example.`,
      );
    }
    assert.deepEqual(
      [entry.example, entry.exampleTranslation],
      [expectedExample, expectedTranslation],
      `Sentence-structure pattern "${term}" must keep its reviewed English–Vietnamese example pair.`,
    );
  };
  assert.deepEqual(
    Object.keys(reviewedPatternExamplePairs).sort(),
    [...patternTerms].sort(),
    "Every sentence-structure pattern has one reviewed English–Vietnamese pair.",
  );
  for (const [term, entry] of Object.entries(patternEntries)) {
    assertPatternExamplePair(term, entry);
  }
  assert.throws(
    () =>
      assertPatternExamplePair("no sooner … than", {
        ...patternEntries["no sooner … than"],
        example: "The train had left before the storm reached the station.",
      }),
    /Sentence-structure pattern "no sooner … than" is missing "no sooner"/,
  );
  assert.throws(
    () =>
      assertPatternExamplePair("no sooner … than", {
        ...patternEntries["no sooner … than"],
        exampleTranslation:
          "Cơn bão đã tới ga trước khi đoàn tàu rời đi.",
      }),
    /Sentence-structure pattern "no sooner … than" must keep its reviewed English–Vietnamese example pair/,
  );
  assert.equal(patternTerms.length, 36);
  assert.equal(patternQuestions.length, patternTerms.length);
  assert.deepEqual(
    [...patternQuestions.map((question) => question.term)].sort(),
    [...patternTerms].sort(),
    "Every added structure has one practice question.",
  );
  for (const lesson of patternLessons) {
    assert.ok(lesson.questions.length > 0);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(patternEntries[question.term]);
    }
  }
  for (const [term, entry] of Object.entries(patternEntries)) {
    assert.ok(term.includes(" "), `${term} is a multiword grammar pattern.`);
    assert.ok(entry.definition.trim(), `${term} has a Vietnamese explanation.`);
    assert.ok(entry.example.trim(), `${term} has an English example.`);
    assert.ok(
      entry.exampleTranslation.trim(),
      `${term} has a Vietnamese example translation.`,
    );
  }
  const sentenceStructureDefinitionClarityChecks = [
    [
      "either … or",
      /chọn một trong hai.*nếu muốn nói cả hai đều không đúng, dùng neither … nor/,
      "The choice pattern distinguishes selecting an option from denying both.",
    ],
    [
      "not only … but also",
      /hai đặc điểm hoặc hành động đều đúng.*nếu Not only đứng đầu một mệnh đề, đảo trợ động từ/,
      "The paired conjunction distinguishes two asserted items from fronted-clause inversion.",
    ],
    [
      "no matter how",
      /tính từ\/trạng từ \+ chủ ngữ \+ động từ.*kết quả ở mệnh đề chính vẫn không thay đổi/,
      "The concession pattern explains both its clause form and unchanged outcome.",
    ],
    [
      "the more … the more",
      /hai yếu tố thay đổi cùng chiều.*Mỗi vế bắt đầu bằng the more.*chủ ngữ và động từ/,
      "The comparison pattern explains the relationship and shows that each side forms a clause.",
    ],
    [
      "no sooner … than",
      /No sooner \+ had \+ chủ ngữ \+ quá khứ phân từ.*than \+ chủ ngữ \+ động từ quá khứ đơn/,
      "The sequence pattern distinguishes the two clause forms and their order.",
    ],
    [
      "it was … that",
      /It was \+ thành phần cần nhấn mạnh \+ that \+ phần còn lại của câu/,
      "The cleft explanation states what is focused and how the rest of the sentence follows.",
    ],
    [
      "so do I",
      /So \+ trợ động từ \+ chủ ngữ để đồng tình với câu khẳng định/,
      "The positive agreement reply states the polarity and auxiliary-subject order.",
    ],
    [
      "neither have I",
      /Neither \+ trợ động từ \+ chủ ngữ để đồng tình với câu phủ định/,
      "The negative agreement reply states the polarity and auxiliary-subject order.",
    ],
  ];
  for (const [
    term,
    clarityPattern,
    reason,
  ] of sentenceStructureDefinitionClarityChecks) {
    assert.match(
      patternEntries[term].definition,
      clarityPattern,
      `${term} explanation remains clear: ${reason}`,
    );
  }
  const prepositionTerms = [
    "in advance",
    "at risk of",
    "on behalf of",
    "rely on",
    "apologize for",
    "be responsible for",
    "be familiar with",
    "access to",
    "prevent someone from",
    "take part in",
  ];
  const prepositionLesson = patternLessons.find((lesson) =>
    lesson.id.endsWith("-preposition-patterns"),
  );
  assert.equal(
    sentenceStructurePatternCourse.SENTENCE_STRUCTURE_PATTERN_COURSE_ID,
    "sentence-structure-patterns-v1",
    "Adding patterns preserves the existing course ID.",
  );
  assert.ok(prepositionLesson);
  assert.deepEqual(
    prepositionLesson.questions.map((question) => question.term),
    prepositionTerms,
  );
  for (const question of prepositionLesson.questions) {
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.term));
    assert.ok(
      question.prompt.includes("_____"),
      `${question.term} has a fill-in question.`,
    );
  }
  const inOnAtLesson = patternLessons.find((lesson) =>
    lesson.id.endsWith("-in-on-at"),
  );
  const inOnAtTerms = [
    "in September",
    "on 2 June",
    "at 8:30 a.m.",
    "in the morning",
    "at night",
    "in a small drawer",
    "on the desk",
    "at the main entrance",
    "in Singapore",
    "believe in",
    "focus on",
    "good at",
    "interested in",
  ];
  assert.ok(inOnAtLesson);
  assert.match(inOnAtLesson.focus, /\bin, on hoặc at\b/);
  assert.deepEqual(
    inOnAtLesson.questions.map((question) => question.term),
    inOnAtTerms,
  );
  for (const question of inOnAtLesson.questions) {
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.term));
    assert.ok(question.prompt.includes("_____"));
    assert.ok(
      patternEntries[question.term].example.toLowerCase().includes(
        question.term.toLowerCase(),
      ),
      `${question.term} appears in its English example.`,
    );
  }
  assert.equal(
    new Set([...courseTerms, ...linkedQuestions.map((question) => question.term), ...patternTerms]).size,
    courseTerms.length + linkedQuestions.length + patternTerms.length,
    "Added patterns do not duplicate existing course items.",
  );

  const ieltsTerms = ieltsTopicCourse.IELTS_TOPIC_WORD_LIST.flatMap(
    (topic) => topic.terms,
  );
  const ieltsQuestions = ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  assert.equal(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_TITLE,
    "Từ vựng IELTS theo chủ đề",
  );
  assert.equal(ieltsTopicCourse.IELTS_TOPIC_WORD_LIST.length, 36);
  assert.ok(ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.length > 50);
  assert.deepEqual(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.map((lesson) => lesson.title),
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.map(
      (_, index) => `Bài ${index + 1}`,
    ),
    "IELTS lesson display numbers are continuous across all topics.",
  );
  assert.ok(ieltsTerms.length >= 1100 && ieltsTerms.length <= 2000);
  assert.equal(new Set(ieltsTerms).size, ieltsTerms.length);
  assert.equal(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_WORD_COUNT,
    ieltsTerms.length,
  );
  assert.deepEqual(
    [...ieltsQuestions.map((question) => question.term)].sort(),
    [...ieltsTerms].sort(),
    "Every IELTS word has one exercise.",
  );
  assert.deepEqual(
    Object.keys(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES).sort(),
    [...ieltsTerms].sort(),
    "Every IELTS word has course feedback content.",
  );
  for (const [term, entry] of Object.entries(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES,
  )) {
    assert.ok(entry.example.trim(), `${term} has an English example.`);
    assert.ok(
      entry.exampleTranslation.trim(),
      `${term} has a Vietnamese example translation.`,
    );
    assert.notEqual(
      entry.exampleTranslation,
      entry.example,
      `${term} keeps its English example separate from the translation.`,
    );
  }
  assert.ok(
    Object.values(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES).some(
      (entry) => entry.dictionarySource === "authored",
    ),
    "Authored entries support IELTS terms absent from the offline dictionary.",
  );
  assert.deepEqual(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS
      .filter(
        (lesson) =>
          lesson.id.startsWith("ielts-topic-vocabulary-v1-") &&
          !lesson.id.includes("-lesson-"),
      )
      .slice(0, 5)
      .map((lesson) => lesson.id),
    [
      "ielts-topic-vocabulary-v1-education",
      "ielts-topic-vocabulary-v1-environment",
      "ielts-topic-vocabulary-v1-technology",
      "ielts-topic-vocabulary-v1-health",
      "ielts-topic-vocabulary-v1-society-work",
    ],
    "Existing lesson IDs remain stable so saved progress remains visible.",
  );
  for (const lesson of ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS) {
    assert.ok(lesson.questions.length > 0 && lesson.questions.length <= 35);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES[question.term]);
    }
  }
  assert.ok(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS
      .filter((lesson) => lesson.id.includes("-lesson-"))
      .every((lesson) => lesson.questions.length >= 15),
    "New lessons use substantial word groups.",
  );

  const toeicTerms = toeicTopicCourse.TOEIC_TOPIC_WORD_LIST.flatMap(
    (topic) => topic.terms,
  );
  const toeicQuestions = toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  const toeicDictionaryTerms = new Set(
    additions.TOEIC_TOPIC_DICTIONARY_ADDITIONS.map((entry) => entry.term),
  );
  assert.equal(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_TITLE,
    "Cụm từ TOEIC theo chủ đề",
  );
  assert.equal(toeicTopicCourse.TOEIC_TOPIC_WORD_LIST.length, 10);
  assert.ok(toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.length >= 100);
  assert.deepEqual(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.map((lesson) => lesson.title),
    toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.map(
      (_, index) => `Bài ${index + 1}`,
    ),
    "TOEIC lesson display numbers are continuous across all topics.",
  );
  assert.equal(toeicTerms.length, 3000);
  assert.equal(new Set(toeicTerms).size, toeicTerms.length);
  assert.equal(
    additions.TOEIC_TOPIC_DICTIONARY_ADDITIONS.length,
    toeicTerms.length,
    "Every TOEIC course phrase is also installed in the offline dictionary.",
  );
  assert.ok(
    toeicTerms.every((term) => toeicDictionaryTerms.has(term)),
    "Course phrases and offline dictionary entries stay aligned.",
  );
  assert.equal(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_WORD_COUNT,
    toeicTerms.length,
  );
  assert.deepEqual(
    [...toeicQuestions.map((question) => question.term)].sort(),
    [...toeicTerms].sort(),
    "Every TOEIC word has one exercise.",
  );
  assert.deepEqual(
    Object.keys(toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES).sort(),
    [...toeicTerms].sort(),
    "Every TOEIC word has course feedback content.",
  );
  for (const [term, entry] of Object.entries(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES,
  )) {
    assert.ok(entry.example.trim(), `${term} has an English example.`);
    assert.ok(
      entry.exampleTranslation.trim(),
      `${term} has a Vietnamese example translation.`,
    );
    assert.notEqual(
      entry.exampleTranslation,
      entry.example,
      `${term} keeps its English example separate from its translation.`,
    );
  }
  for (const term of toeicTerms) {
    const entry = toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES[term];
    assert.ok(
      term.split(/\s+/).length >= 2,
      `${term} is a phrase, not a standalone word.`,
    );
    assert.ok(
      entry.example.toLowerCase().includes(term.toLowerCase()),
      `${term} appears in its example.`,
    );
  }
  for (const lesson of toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS) {
    assert.ok(lesson.questions.length >= 10 && lesson.questions.length <= 35);
    assert.ok(lesson.topicTitle);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES[question.term]);
    }
  }

  const root = mkdtempSync(join(tmpdir(), "vocabflow-conjunction-progress-"));
  const repository = createRepository(root);
  const { repo } = repository;
  try {
    const lessonId = `${course.CONJUNCTION_COURSE_ID}-time`;
    const interruptedLessonId = `${course.CONJUNCTION_COURSE_ID}-resume`;
    await repo.saveCourseLessonAttempt({
      lessonId: interruptedLessonId,
      currentIndex: 3,
      correctCount: 2,
      wrongQuestionIndices: [0, 2],
      retryIndex: 0,
      retrying: false,
    });
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [],
    );
    assert.deepEqual(
      await repo.getCourseLessonAttempts(course.CONJUNCTION_COURSE_ID),
      [
        {
          lessonId: interruptedLessonId,
          currentIndex: 3,
          correctCount: 2,
          wrongQuestionIndices: [0, 2],
          retryIndex: 0,
          retrying: false,
          updatedAt: (await repo.getCourseLessonAttempts(
            course.CONJUNCTION_COURSE_ID,
          ))[0].updatedAt,
        },
      ],
      "An interrupted lesson stores its question position and mistakes offline.",
    );
    await repo.markCourseLessonCompleted(interruptedLessonId);
    assert.deepEqual(
      await repo.getCourseLessonAttempts(course.CONJUNCTION_COURSE_ID),
      [],
      "Completing a lesson clears its resumable attempt.",
    );
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [interruptedLessonId],
    );
    await repo.markCourseLessonCompleted(lessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [interruptedLessonId, lessonId],
    );
    await repo.markCourseLessonCompleted(lessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [interruptedLessonId, lessonId],
      "Completing a lesson repeatedly does not duplicate its progress.",
    );
    const toeicLessonId =
      `${toeicTopicCourse.TOEIC_TOPIC_COURSE_ID}-office-issues-lesson-1`;
    await repo.markCourseLessonCompleted(toeicLessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(
        toeicTopicCourse.TOEIC_TOPIC_COURSE_ID,
      ),
      [toeicLessonId],
      "TOEIC lesson completion is stored separately from other courses.",
    );
    const db = repository.db;
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS count FROM course_lesson_progress")
        .get().count,
      3,
    );
  } finally {
    repository.db?.close();
    rmSync(root, { recursive: true, force: true });
  }
}

(async () => {
  await checkDictionaryOverlay();
  await checkCourseContentAndProgress();
  console.log("Conjunction dictionary overlay and course checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
