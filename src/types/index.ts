export type CampusName = 
  | "Annamacharya × NIAT"
  | "NRI × NIAT"
  | "Chalapathi × NIAT"
  | "Annamacharya University"
  | "NRI Institute of Technology"
  | "Chalapathi Institute of Technology"
  | (string & {});

export type YearOfStudy = "1st Year" | "2nd Year" | "3rd Year" | "4th Year";
export type Section = "A" | "B" | "C" | "D";
export type Branch = "CSE" | "AI & ML" | "Data Science" | "ECE" | "EEE" | "IT" | "Mechanical";

export interface ApprovedStudent {
  studentId: string;
  name: string;
  email: string;
  campus: CampusName;
  year: YearOfStudy;
  section: Section;
  branch: Branch;
  status: "active" | "suspended" | "pending";
  invitationCode?: string;
  invitationCodeHash?: string;
  invitationUsed?: boolean;
  registeredUid?: string;
  updatedAt?: string;
}

export interface StructuredAchievement {
  id: string;
  title: string;
  description?: string;
  organization?: string;
  date?: string;
  link?: string;
  type?: 'award' | 'certification' | 'competition' | 'scholarship' | 'other';
}

export interface StructuredHackathon {
  id: string;
  name: string;
  role?: string;
  date?: string;
  result?: string;
  teamName?: string;
  projectTitle?: string;
  link?: string;
}

export interface UserProfile {
  uid: string;
  firebaseUid?: string;
  studentId: string;
  niatRegistrationNumber?: string;
  name: string;
  officialName?: string;
  email: string;
  campus: CampusName;
  year: YearOfStudy;
  section: Section;
  branch: Branch;
  course?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  coverPreset?: string;
  visibility?: 'public' | 'private';
  skills: string[];
  interests: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  customWebsite?: string;
  achievements?: string[];
  hackathons?: string[];
  structuredAchievements?: StructuredAchievement[];
  structuredHackathons?: StructuredHackathon[];
  certifications?: string[];
  isVerified: boolean;
  profileCompleted?: boolean;
  isAdmin?: boolean;
  role?: 'ADMIN' | 'STUDENT';
  googleUid?: string;
  googleEmail?: string;
  isGoogleLinked?: boolean;
  createdAt: string;
  updatedAt?: string;
  status?: "active" | "suspended" | "disabled";
}

export interface Post {
  id: string;
  authorId: string;
  ownerUid?: string;
  authorName: string;
  authorAvatar?: string;
  authorCampus: CampusName;
  authorYear: YearOfStudy;
  authorBranch: Branch;
  category: "Question" | "Project Request" | "Hackathon" | "Achievement" | "Learning Update" | "Opportunity" | "Resource" | "Collaboration";
  content: string;
  imageUrl?: string;
  likes: string[]; // user IDs who liked
  commentsCount: number;
  comments: PostComment[];
  saves: string[]; // user IDs who saved
  createdAt: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorCampus: CampusName;
  content: string;
  createdAt: string;
}

export interface Connection {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface ProjectRequirement {
  id: string;
  creatorId: string;
  ownerUid?: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorCampus: CampusName;
  title: string;
  description: string;
  rolesNeeded: string[];
  preferredCampus: "Any" | CampusName;
  isHackathon: boolean;
  hackathonName?: string;
  status: "open" | "closed";
  applicantsCount: number;
  applicants: ProjectApplicant[];
  createdAt: string;
}

export interface ProjectApplicant {
  userId: string;
  userName: string;
  userCampus: CampusName;
  userYear: YearOfStudy;
  userBranch: Branch;
  roleApplied: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: "Hackathon" | "Internship" | "Job" | "Workshop" | "Competition" | "Scholarship" | "GSoC" | "Tech Event";
  description: string;
  location: string;
  deadline: string;
  externalLink: string;
  postedBy: string;
  postedByCampus: CampusName;
  ownerUid?: string;
  authorUid?: string;
  tags: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  type: "connection_request" | "connection_accepted" | "post_like" | "post_comment" | "project_application" | "new_message";
  targetId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type ShowcaseCategory = 
  | "Web Application"
  | "Mobile Application"
  | "AI / ML"
  | "Generative AI"
  | "Automation"
  | "Hackathon"
  | "Developer Tool"
  | "Other"
  | (string & {});

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: "user" | "post" | "project" | "showcase";
  targetId: string;
  targetTitle?: string;
  reason: string;
  details?: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
}

export interface CampusDetails {
  name: CampusName;
  code: string;
  location: string;
  image: string;
  description: string;
  established: string;
  studentCountEstimate: number;
  highlights?: string[];
}

export interface BrandingConfig {
  logoUrl?: string;
  appName?: string;
  updatedAt?: string;
  logoVersion?: number;
}

export interface StudentShowcase {
  id: string;
  userId: string;
  ownerUid?: string;
  studentName: string;
  profileImage?: string;
  campus: CampusName;
  batch: string;
  skills: string[];
  technologies: string[];
  projectTitle: string;
  projectDescription: string;
  projectImage?: string;
  videoUrl?: string;
  videoDuration?: number;
  thumbnailUrl?: string;
  category?: ShowcaseCategory;
  githubUrl?: string;
  liveUrl?: string;
  teamMembers?: string[];
  likes?: string[];
  likesCount?: number;
  saves?: string[];
  savesCount?: number;
  viewsCount?: number;
  viewedBy?: string[];
  achievements?: string;
  lookingFor: string[];
  teammateSkills: string[];
  about?: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'hidden';
  reportsCount?: number;
}
