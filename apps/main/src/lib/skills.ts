export type Skill = {
  slug: string;
  label: string;
};

export const SKILLS: Skill[] = [
  { slug: "vocabulary-builder", label: "Vocabulary Builder" },
  { slug: "paraphrasing-challenge", label: "Paraphrasing" },
  { slug: "pronunciation-repeat-after-me", label: "Pronunciation" },
  { slug: "sentence-structure-scramble", label: "Sentence Structure" },
  { slug: "listening-for-details", label: "Listening for Details" },
  { slug: "synonym-match", label: "Synonym Match" },
];

export const getSkillBySlug = (slug: string): Skill | undefined =>
  SKILLS.find((s) => s.slug === slug);
