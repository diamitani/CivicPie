export interface Ward {
  id: number;
  name: string;
  alderman: Alderman;
  boundaries: Record<string, unknown>;
  neighborhoods: string[];
  population: number;
  demographics: Demographics;
  office: Office;
  meetings: Meeting[];
  initiatives: Initiative[];
  budget: BudgetInfo;
}

export interface Alderman {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  photoUrl?: string;
  website?: string;
  socialMedia: SocialMedia;
  biography: string;
  termStart: string;
  termEnd: string;
  committees: Committee[];
  votingRecord?: VotingRecord[];
}

export interface SocialMedia {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface Committee {
  name: string;
  role: 'chair' | 'vice-chair' | 'member';
}

export interface Demographics {
  totalPopulation: number;
  medianIncome: number;
  povertyRate: number;
  educationLevel: EducationStats;
  ageDistribution: AgeStats;
  racialBreakdown: RacialStats;
}

export interface EducationStats {
  highSchoolOrHigher: number;
  bachelorsOrHigher: number;
  graduateDegree: number;
}

export interface AgeStats {
  under18: number;
  age18to34: number;
  age35to64: number;
  over65: number;
}

export interface RacialStats {
  white: number;
  black: number;
  hispanic: number;
  asian: number;
  other: number;
}

export interface Office {
  address: string;
  phone: string;
  email: string;
  hours: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'ward' | 'committee' | 'city-council' | 'town-hall';
  description?: string;
  agendaUrl?: string;
  minutesUrl?: string;
  virtualUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'proposed' | 'active' | 'completed';
  startDate: string;
  endDate?: string;
  budget?: number;
  impact: string;
}

export interface BudgetInfo {
  totalBudget: number;
  allocated: number;
  spent: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
}

export interface VotingRecord {
  date: string;
  measure: string;
  vote: 'yes' | 'no' | 'abstain' | 'absent';
  description: string;
}

export interface Election {
  id: string;
  type: 'municipal' | 'general' | 'special';
  date: string;
  positions: Position[];
  status: 'upcoming' | 'active' | 'completed';
}

export interface Position {
  title: string;
  candidates: Candidate[];
  incumbent?: string;
}

export interface Candidate {
  name: string;
  party?: string;
  website?: string;
  photoUrl?: string;
  statement?: string;
}

export interface CivicIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  wardId: number;
  status: 'open' | 'in-progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}
