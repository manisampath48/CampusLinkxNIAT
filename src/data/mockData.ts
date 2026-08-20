import { ApprovedStudent, CampusDetails, Opportunity, Post, ProjectRequirement, UserProfile } from '../types';
import { FORMATTED_ANNAMACHARYA_STUDENTS } from './annamacharyaStudents';

export const CAMPUSES: CampusDetails[] = [
  {
    name: "Annamacharya × NIAT",
    code: "ANK",
    location: "Kadapa, Andhra Pradesh",
    image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200",
    description: "Annamacharya Institute of Technology & Sciences in collaboration with NIAT. Pioneering AI, Full Stack & Data Engineering excellence.",
    established: "2001",
    studentCountEstimate: 1420,
    highlights: ["CSE", "AI & ML", "Data Science", "ECE"]
  },
  {
    name: "NRI × NIAT",
    code: "NRI",
    location: "Vijayawada, Andhra Pradesh",
    image: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&q=80&w=1200",
    description: "NRI Institute of Technology & NIAT hub. Innovating in software engineering, Cloud computing & hackathons.",
    established: "2008",
    studentCountEstimate: 1180,
    highlights: ["CSE", "IT", "AI & ML", "Full Stack"]
  },
  {
    name: "Chalapathi × NIAT",
    code: "CIET",
    location: "Guntur, Andhra Pradesh",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200",
    description: "Chalapathi Institute of Engineering and Technology × NIAT campus. Driving developer communities and tech leadership.",
    established: "2007",
    studentCountEstimate: 980,
    highlights: ["CSE", "Data Science", "ECE", "DevOps"]
  }
];

export const APPROVED_STUDENTS_DB: ApprovedStudent[] = [
  ...FORMATTED_ANNAMACHARYA_STUDENTS
];

export const DEMO_PROFILES: UserProfile[] = [];

export const DEMO_POSTS: Post[] = [];

export const DEMO_PROJECTS: ProjectRequirement[] = [];

export const DEMO_OPPORTUNITIES: Opportunity[] = [];

