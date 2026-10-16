export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  location: string;
  date: string;
  category: string;
  summary: string;
  fitReason: string;
  status:
    | "Potential lead"
    | "Upcoming"
    | "Not currently accepting"
    | "Mock example";
  sourceUrl?: string;
  officialUrl?: string;
  contactEmail?: string;
  isDemo?: boolean;
  matchTerms?: string[];
};
