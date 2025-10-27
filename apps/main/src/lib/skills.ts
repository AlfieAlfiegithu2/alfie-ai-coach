export type Skill = {
  slug: string;
  label: string;
};

export const SKILLS: Skill[] = [
  { slug: "vocabulary-builder", label: "Vocabulary Builder" },
  { slug: "paraphrasing-challenge", label: "Paraphrasing Challenge" },
  { slug: "pronunciation-repeat-after-me", label: "Pronunciation \"Repeat After Me\"" },
  { slug: "sentence-structure-scramble", label: "Sentence Structure Scramble" },
  { slug: "listening-for-details", label: "Listening for Details" },
  { slug: "synonym-match", label: "Synonym Match" },
  { slug: "sentence-mastery", label: "AI Speaking Tutor" },
];

export const getSkillBySlug = (slug: string): Skill | undefined =>
  SKILLS.find((s) => s.slug === slug);
