export interface CoverPreset {
  id: string;
  name: string;
  gradient: string;
  accentColor: string;
  description: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'crimson_mesh',
    name: 'NIAT Crimson Legacy',
    gradient: 'from-red-950 via-neutral-900 to-red-900',
    accentColor: '#800000',
    description: 'Official NIAT burgundy and deep ruby mesh'
  },
  {
    id: 'slate_geometric',
    name: 'Tech Slate Minimal',
    gradient: 'from-slate-900 via-neutral-900 to-zinc-800',
    accentColor: '#334155',
    description: 'Dark minimalist engineering slate'
  },
  {
    id: 'midnight_indigo',
    name: 'Midnight Indigo',
    gradient: 'from-indigo-950 via-slate-950 to-neutral-900',
    accentColor: '#312e81',
    description: 'Deep royal indigo with subtle starfields'
  },
  {
    id: 'emerald_campus',
    name: 'Emerald Innovation',
    gradient: 'from-emerald-950 via-neutral-900 to-teal-950',
    accentColor: '#064e3b',
    description: 'Fresh campus green and innovation teal'
  },
  {
    id: 'amber_sunset',
    name: 'Amber Glow',
    gradient: 'from-amber-950 via-stone-900 to-neutral-950',
    accentColor: '#78350f',
    description: 'Warm gold and deep amber gradient'
  }
];

export const SUGGESTED_SKILLS = [
  'Python',
  'C++',
  'Java',
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Express',
  'Firebase',
  'Firestore',
  'PostgreSQL',
  'Tailwind CSS',
  'Machine Learning',
  'Generative AI',
  'Data Structures & Algorithms',
  'Git & GitHub',
  'Docker',
  'REST APIs',
  'GraphQL',
  'Figma',
  'UI/UX Design',
  'Mobile Development',
  'Flutter'
];

export const SUGGESTED_INTERESTS = [
  'Artificial Intelligence',
  'Full Stack Web Development',
  'Hackathons & Competitions',
  'Open Source Software',
  'Startups & Entrepreneurship',
  'Cloud Computing',
  'Data Science & Analytics',
  'Robotics & IoT',
  'Cybersecurity',
  'Competitive Programming',
  'DevOps & System Design',
  'Product Design'
];

export function calculateProfileCompletion(profile: any, userProjectsCount: number = 0): {
  percentage: number;
  completedItems: { key: string; label: string; done: boolean; points: number }[];
} {
  if (!profile) {
    return { percentage: 0, completedItems: [] };
  }

  const hasAvatar = Boolean(profile.avatar && !profile.avatar.includes('ui-avatars.com') && profile.avatar.trim().length > 5);
  const hasBio = Boolean(profile.bio && profile.bio.trim().length >= 20);
  const hasSkills = Boolean(profile.skills && profile.skills.length >= 3);
  const hasInterests = Boolean(profile.interests && profile.interests.length >= 2);
  const hasGithub = Boolean(profile.githubUrl && profile.githubUrl.trim().length > 5);
  const hasLinkedin = Boolean(profile.linkedinUrl && profile.linkedinUrl.trim().length > 5);
  const hasPortfolio = Boolean(profile.portfolioUrl && profile.portfolioUrl.trim().length > 5);
  const hasProjects = Boolean(userProjectsCount > 0);
  const hasAchievements = Boolean(
    (profile.achievements && profile.achievements.length > 0) ||
    (profile.structuredAchievements && profile.structuredAchievements.length > 0)
  );
  const hasHackathons = Boolean(
    (profile.hackathons && profile.hackathons.length > 0) ||
    (profile.structuredHackathons && profile.structuredHackathons.length > 0)
  );

  const items = [
    { key: 'avatar', label: 'Custom Profile Photo', done: hasAvatar, points: 15 },
    { key: 'bio', label: 'Detailed Bio (20+ chars)', done: hasBio, points: 15 },
    { key: 'skills', label: 'Technical Skills (3+ skills)', done: hasSkills, points: 15 },
    { key: 'interests', label: 'Focus & Interests (2+)', done: hasInterests, points: 10 },
    { key: 'github', label: 'GitHub Profile Link', done: hasGithub, points: 10 },
    { key: 'linkedin', label: 'LinkedIn Profile Link', done: hasLinkedin, points: 10 },
    { key: 'portfolio', label: 'Portfolio Website', done: hasPortfolio, points: 5 },
    { key: 'projects', label: 'At least 1 Project', done: hasProjects, points: 10 },
    { key: 'achievements', label: 'Honors & Achievements', done: hasAchievements, points: 5 },
    { key: 'hackathons', label: 'Hackathon Participation', done: hasHackathons, points: 5 },
  ];

  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
  const earnedPoints = items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0);
  const percentage = Math.min(100, Math.round((earnedPoints / totalPoints) * 100));

  return {
    percentage,
    completedItems: items
  };
}

export function isValidUrl(url?: string): boolean {
  if (!url || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatUrlForDisplay(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}
