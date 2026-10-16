import type { Opportunity } from "./types";

// Deliberately empty. The app must never silently substitute generic demo leads for real search results.
// UI-only mock concepts are generated server-side and marked isDemo=true with no source URL.
export const demoOpportunities: Opportunity[] = [];
