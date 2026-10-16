import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import { z } from "zod";
const app = express();
const port = Number(process.env.PORT || 8787);
app.use(cors({ origin: process.env.APP_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "24kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
const states = new Set([
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
]);
const SearchSchema = z.object({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(50),
  date: z.string().max(10).optional().default(""),
  interests: z.string().max(300).optional().default(""),
  skills: z.string().max(300).optional().default(""),
  experience: z.string().max(300).optional().default(""),
  preferences: z.string().max(500).optional().default("")
});
const EmailSchema = z.object({
  opportunity: z.object({
    title: z.string().max(200), organization: z.string().max(200), summary: z.string().max(1000),
    location: z.string().max(200), date: z.string().max(100), sourceUrl: z.string().url().max(1000)
  }),
  interests: z.string().max(300).optional().default(""), skills: z.string().max(300).optional().default(""),
  experience: z.string().max(300).optional().default("")
});
// Conservative typo handling: only ordinary free-text words and a small set of known city misspellings.
// Numeric fields/identifiers are never normalized by this function.
function normalizeCity(city: string) {
  const trimmed = city.trim().replace(/\s+/g, " ");
  const key = trimmed.toLowerCase().replace(/[.,]/g, "");
  const known: Record<string, string> = {
    pheonix: "Phoenix", pheonic: "Phoenix", phenoix: "Phoenix", phonix: "Phoenix", phx: "Phoenix",
    "los angles": "Los Angeles", "san fransisco": "San Francisco", "newyork": "New York"
  };
  return known[key] ?? trimmed;
}
const ordinaryCorrections: Record<string, string> = {
  natrue: "nature", natuer: "nature", natures: "nature", pheonix: "Phoenix", enviroment: "environment",
  baskteball: "basketball", basketbal: "basketball", volunter: "volunteer", voluteer: "volunteer",
  childern: "children", childeren: "children", seniros: "seniors", eldely: "elderly",
  comunity: "community", tutorng: "tutoring", artss: "arts", animlas: "animals",
  aniamls: "animals", volunteeer: "volunteer", enviornment: "environment",
  grassroot: "grassroots", competion: "competition", competetion: "competition"
};
function normalizeOrdinaryText(value: string) {
  // Correct alphabetic tokens only; punctuation and numeric sequences remain unchanged.
  return value.replace(/[A-Za-z]+/g, (word) => ordinaryCorrections[word.toLowerCase()] ?? word);
}
function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word.length > 2);
}
const mockCatalog = [
  { id: "youth-sports", title: "Youth basketball and recreation support", category: "Sports & recreation", tags: ["basketball", "sports", "kids", "children", "youth", "coach", "recreation", "working with kids"], summary: "Illustrative idea: assist with a youth sports session, equipment setup, or activity stations. This is not a real event or opening." },
  { id: "older-adult-activities", title: "Older-adult recreation and social activities", category: "Older adult programs", tags: ["older adults", "older people", "seniors", "elderly", "aging", "community", "recreation", "conversation", "activities"], summary: "Illustrative idea: help a community center with a group activity, games, or a social program for older adults. This is not a real event or opening." },
  { id: "intergenerational", title: "Intergenerational games and movement activities", category: "Intergenerational community", tags: ["basketball", "sports", "kids", "children", "youth", "older adults", "seniors", "intergenerational", "recreation"], summary: "Illustrative idea: support an activity that brings younger and older community members together. This is not a real event or opening." },
  { id: "library-youth", title: "Library activities for children and teens", category: "Youth & education", tags: ["kids", "children", "youth", "teens", "reading", "library", "tutoring", "working with kids"], summary: "Illustrative idea: explore whether a local library has youth events, reading support, or supervised activity opportunities. This is not a real event or opening." },
  { id: "senior-tech", title: "Technology and digital-literacy help for older adults", category: "Older adult programs", tags: ["older adults", "seniors", "elderly", "technology", "computers", "teaching", "patience", "community"], summary: "Illustrative idea: help older adults learn to use everyday technology in a supervised community setting. This is not a real event or opening." },
  { id: "nature-restoration", title: "Nature and park stewardship", category: "Environment", tags: ["nature", "environment", "parks", "plants", "gardening", "outdoors", "community"], summary: "Illustrative idea: look for a local park or habitat group's cleanup or stewardship activities. This is not a real event or opening." },
  { id: "food-support", title: "Community food-support volunteering", category: "Community support", tags: ["food", "food bank", "community", "packing", "families", "service"], summary: "Illustrative idea: investigate food-packing or distribution shifts run by a local organization. This is not a real event or opening." },
  { id: "animal-care", title: "Animal-care and shelter support", category: "Animal welfare", tags: ["animals", "animal welfare", "dogs", "cats", "shelter", "care"], summary: "Illustrative idea: check whether a local animal organization has age-appropriate volunteer tasks. This is not a real event or opening." },
  { id: "arts-youth", title: "Creative workshops for young people", category: "Arts & youth", tags: ["art", "arts", "music", "crafts", "kids", "children", "youth", "teaching"], summary: "Illustrative idea: support a supervised art or creative workshop for children or teens. This is not a real event or opening." },
  { id: "community-cleanup", title: "Neighborhood cleanup and community events", category: "Community", tags: ["community", "cleanup", "environment", "events", "teamwork", "outdoors"], summary: "Illustrative idea: find a city or neighborhood group organizing a public cleanup. This is not a real event or opening." }
];
function buildMockResults(input: z.infer<typeof SearchSchema>, city: string) {
  const normalized = {
    interests: normalizeOrdinaryText(input.interests),
    skills: normalizeOrdinaryText(input.skills),
    experience: normalizeOrdinaryText(input.experience),
    preferences: normalizeOrdinaryText(input.preferences)
  };
  const profileText = Object.values(normalized).join(" ").toLowerCase();
  const expandedProfile = profileText
    .replace(/old people|older people|elderly|elders/g, "older adults seniors")
    .replace(/kids|children|child/g, "kids children youth")
    .replace(/basketball/g, "basketball sports recreation coach");
  const profileWords = new Set(words(expandedProfile));
  const ranked = mockCatalog.map((item) => {
    const tags = item.tags.map((tag) => tag.toLowerCase());
    const matches = tags.filter((tag) => expandedProfile.includes(tag) || tag.split(" ").some((part) => profileWords.has(part)));
    const score = matches.length;
    const why = matches.length
      ? `This example overlaps with the words or related themes you entered: ${[...new Set(matches)].slice(0, 4).join(", ")}.`
      : "This general example is included only to demonstrate the finder; it may not fit your interests.";
    return { ...item, matches, score, why };
  }).sort((a, b) => b.score - a.score);
  const hasProfile = profileText.trim().length > 0;
  const selected = hasProfile
    ? ranked.filter((item) => item.score > 0).slice(0, 5)
    : ranked.slice(0, 4);
  const pool = selected.length >= 2 ? selected : [...selected, ...ranked.filter((item) => !selected.some((picked) => picked.id === item.id)).slice(0, 2 - selected.length)];
  return pool.map((item, index) => ({
    id: `mock-${item.id}-${index}`,
    title: item.title,
    organization: "Illustrative example — no real organization attached",
    location: `${city}, ${input.state}`,
    date: input.date ? `Mock date: ${input.date} (not an actual event date)` : "No real date; example only",
    category: item.category,
    summary: item.summary,
    fitReason: item.why,
    status: "Mock example" as const,
    isDemo: true,
    matchTerms: item.matches
  }));
}
app.get("/health", (_req, res) => res.json({
  ok: true,
  mode: process.env.TAVILY_API_KEY ? "tavily" : "search-key-required",
  liveSearchEnabled: Boolean(process.env.TAVILY_API_KEY)
}));
// Tavily is called only from the server, so the API key is never exposed to the browser.
// Basic search is intentional; this app does not add an "advanced search" feature.
type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  published_date?: string;
};
function expandSearchTerms(value: string) {
  const normalized = normalizeOrdinaryText(value).toLowerCase();
  const expanded = normalized
    .replace(/\b(old people|older people|elderly|elders)\b/g, "older adults seniors")
    .replace(/\b(kids|children|child)\b/g, "youth children")
    .replace(/\bbasketball\b/g, "basketball youth sports recreation")
    .replace(/\bworking with kids\b/g, "youth mentoring child programs recreation");
  return expanded.trim();
}
function safeHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Source organization"; }
}
function looksLikeUsefulSource(url: string) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return false;
    const path = parsed.pathname.toLowerCase();
    // Avoid generic search result pages and homepage-only aggregator links when possible.
    const broadDirectories = ["volunteermatch.org", "idealist.org", "eventbrite.com", "meetup.com"];
    if (broadDirectories.some((domain) => parsed.hostname.endsWith(domain)) && (path === "/" || path.length < 8)) return false;
    return true;
  } catch { return false; }
}
function categoryFor(text: string) {
  const value = text.toLowerCase();
  if (/basketball|sports|athletic|recreation|coach/.test(value)) return "Sports & recreation";
  if (/senior|older adult|aging|retirement|elder/.test(value)) return "Older adult programs";
  if (/youth|child|teen|school|tutor|mentor/.test(value)) return "Youth & education";
  if (/park|nature|environment|garden|cleanup/.test(value)) return "Environment & community";
  if (/animal|shelter|wildlife/.test(value)) return "Animal welfare";
  if (/food bank|food pantry|meal|hunger/.test(value)) return "Food support";
  return "Community service";
}
function fitExplanation(sourceText: string, profile: string) {
  const themes = [
    { re: /basketball|sports|athletic|recreation|coach/i, label: "sports and recreation" },
    { re: /older adult|senior|aging|elder|retirement/i, label: "older-adult programs" },
    { re: /youth|children|child|teen|mentor|tutor/i, label: "working with young people" },
    { re: /nature|environment|park|garden/i, label: "nature and community care" },
    { re: /technology|computer|digital literacy/i, label: "technology support" },
    { re: /art|music|creative/i, label: "creative activities" }
  ];
  const matched = themes.filter((theme) => theme.re.test(profile) && theme.re.test(sourceText)).map((theme) => theme.label);
  return matched.length
    ? `The source mentions ${[...new Set(matched)].slice(0, 3).join(", ")}, which overlaps with your interests or experience. Confirm the role and age requirements with the organization.`
    : "This source may be relevant based on the location or general community-service terms. Check the original page to confirm the role fits your interests and age requirements.";
}
async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        topic: "general",
        search_depth: "basic",
        max_results: 8,
        include_answer: false,
        include_raw_content: false
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
    const data = await response.json() as { results?: TavilyResult[] };
    return Array.isArray(data.results) ? data.results : [];
  } finally {
    clearTimeout(timeout);
  }
}
async function findLiveOpportunities(input: z.infer<typeof SearchSchema>, city: string, state: string) {
  const profile = expandSearchTerms([input.interests, input.skills, input.experience, input.preferences].filter(Boolean).join(" "));
  const location = `${city}, ${state}`;
  const profileTerms = profile || "community volunteering";
  // Separate queries deliberately balance established organizations with small/local groups.
  // These are ordinary basic searches, not a separate advanced-search feature.
  const queries = [
    `(${profileTerms}) volunteer opportunities nonprofit organization in ${location}`,
    `(${profileTerms}) local grassroots neighborhood mutual aid community group volunteer in ${location}`,
    `(${profileTerms}) city parks library community center volunteer event in ${location}`,
    `(${profileTerms}) small nonprofit youth community program volunteer sign up in ${location}`
  ];
  const batches = await Promise.all(queries.map((query) => tavilySearch(query)));
  const seen = new Set<string>();
  const candidates = batches.flat().filter((item) => {
    if (!item.url || !item.title || !looksLikeUsefulSource(item.url)) return false;
    let normalizedUrl = item.url;
    try {
      const parsed = new URL(item.url);
      parsed.hash = "";
      for (const key of [...parsed.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) parsed.searchParams.delete(key);
      parsed.searchParams.sort();
      normalizedUrl = parsed.toString().replace(/\/$/, "");
    } catch {}
    if (seen.has(normalizedUrl)) return false;
    seen.add(normalizedUrl);
    return true;
  });
  const profileWords = new Set(words(profile));
  const ranked = candidates.map((item) => {
    const sourceText = `${item.title || ""} ${item.content || ""}`;
    const sourceWords = new Set(words(sourceText));
    const overlap = [...profileWords].filter((word) => sourceWords.has(word));
    const fit = fitExplanation(sourceText, profile);
    const url = item.url || "";
    const host = safeHost(url).toLowerCase();
    const path = (() => { try { return new URL(url).pathname.toLowerCase(); } catch { return "/"; } })();
    const localOrGrassroots = /grassroots|mutual aid|neighborhood|community-led|volunteer-run|small nonprofit|community group/i.test(sourceText) ? 0.12 : 0;
    const actionablePage = path !== "/" && path.length > 2 ? 0.12 : 0;
    const orgOrGov = /\.gov$|\.org$/.test(host) ? 0.04 : 0;
    const score = (item.score || 0) + overlap.length * 0.035 + (fit.startsWith("The source mentions") ? 0.2 : 0) + localOrGrassroots + actionablePage + orgOrGov;
    return { item, sourceText, score, fit };
  }).sort((a, b) => b.score - a.score).slice(0, 12);
  return ranked.map(({ item, sourceText, fit }, index) => {
    const url = item.url!;
    const host = safeHost(url);
    const snippet = (item.content || "Open the original page to review the program details.").replace(/\s+/g, " ").trim().slice(0, 480);
    const title = (item.title || "Community opportunity").slice(0, 200);
    return {
      id: `live-${Buffer.from(url).toString("base64url").slice(0, 36)}-${index}`,
      title,
      organization: host,
      location,
      date: item.published_date ? `Source page published ${item.published_date}; event date/current availability not confirmed` : "Event date and current availability not confirmed — check the source",
      checkedAt: new Date().toISOString(),
      category: categoryFor(`${title} ${snippet}`),
      summary: snippet,
      fitReason: fit,
      status: "Potential lead" as const,
      sourceUrl: url,
      officialUrl: url,
      isDemo: false,
      matchTerms: [...profileWords].filter((word) => words(sourceText).includes(word)).slice(0, 8)
    };
  });
}
app.post("/api/opportunities", async (req, res) => {
  const parsed = SearchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the search fields." });
  const input = parsed.data;
  const state = [...states].find((name) => name.toLowerCase() === input.state.toLowerCase());
  if (!state) return res.status(400).json({ error: "We don't have that state registered. Please choose one of the 50 states or District of Columbia." });
  const city = normalizeCity(input.city);
  if (input.date) {
    const date = new Date(`${input.date}T12:00:00`);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ error: "Please enter a valid date." });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(); maxDate.setMonth(maxDate.getMonth() + 6);
    if (date < today) return res.status(400).json({ error: "Please choose today or a future date." });
    if (date > maxDate) return res.status(400).json({ error: "We don't have enough data that far out. Please choose a date within the next six months." });
  }
  // Ceramic is deliberately never called in this build. This does not block Tavily:
  // Tavily remains the only live search provider when TAVILY_API_KEY is configured.
  if (!process.env.TAVILY_API_KEY) {
    if (process.env.MOCK_RESULTS_ENABLED === "true") {
      const opportunities = buildMockResults(input, city);
      return res.json({
        mode: "mock",
        normalizedCity: city !== input.city.trim() ? city : undefined,
        message: "MOCK MODE: these are illustrative concepts, not real organizations or available openings. Add TAVILY_API_KEY to enable live research.",
        opportunities
      });
    }
    return res.status(503).json({
      mode: "disabled",
      normalizedCity: city !== input.city.trim() ? city : undefined,
      message: "Live research needs a Tavily API key in the backend's .env.local file. No sample listings were substituted.",
      opportunities: []
    });
  }
  try {
    const opportunities = await findLiveOpportunities(input, city, state);
    return res.json({
      mode: "tavily",
      normalizedCity: city !== input.city.trim() ? city : undefined,
      message: opportunities.length
        ? `Found ${opportunities.length} potential source-backed leads. Dates, age eligibility, and current availability still need to be confirmed on each original page.`
        : "The search provider returned no suitable source pages for this combination. Try broader interests or another nearby location; no opportunities were invented.",
      opportunities
    });
  } catch (error) {
    // Do not log profile fields or user-entered search terms.
    console.error("Tavily opportunity search failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(502).json({
      error: "Live research could not be completed. Please try again later. No sample listings were substituted.",
      opportunities: []
    });
  }
});
app.post("/api/email-draft", async (req, res) => {
  const parsed = EmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the draft details." });
  const { opportunity, interests, skills, experience } = parsed.data;
  const fallback = {
    subject: `Question about ${opportunity.title}`,
    body: `Hello ${opportunity.organization} team,\n\nI'm reaching out to ask whether you currently have opportunities to get involved with ${opportunity.title}.\n\nCould you share current availability, any age or experience requirements, and the next steps to participate?\n\nThank you for your time,\n[Your name]`
  };
  if (!process.env.OPENAI_API_KEY) return res.json({ ...fallback, mode: "template" });
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini", temperature: 0.3, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Write a concise, friendly, editable inquiry email. Use only supplied facts. Ask the organization to confirm availability and age eligibility. Never imply the email was sent. Return JSON with subject and body." },
        { role: "user", content: JSON.stringify({ opportunity, interests, skills, experience }) }
      ]
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return res.json({ ...fallback, mode: "template" });
    const draft = JSON.parse(content) as { subject?: string; body?: string };
    return res.json({ subject: String(draft.subject || fallback.subject).slice(0, 180), body: String(draft.body || fallback.body).slice(0, 6000), mode: "ai" });
  } catch {
    return res.json({ ...fallback, mode: "template" });
  }
});
app.listen(port, () => console.log(`Impact Agent API listening on http://localhost:${port}`));