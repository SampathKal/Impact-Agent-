
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Loader from "./components/Loader";
import ThreeDReveal from "./components/ThreeDReveal";
import { GlowEffect } from "./components/ui/glow-effect";
import HalftoneWordmarkFooter from "./components/ui/halftone-wordmark-footer";
import {
  Flower2,
  ArrowUpRight,
  ArrowLeft,
  MapPin,
  CalendarDays,
  Heart,
  ExternalLink,
  Copy,
  Mail,
  ShieldCheck,
  Leaf,
  Sparkles,
  Accessibility
} from "lucide-react";
import type { Opportunity } from "./types";

type Page =
  | "home"
  | "find"
  | "results"
  | "detail"
  | "email"
  | "privacy"
  | "accessibility";

type SearchForm = {
  date: string;
  city: string;
  state: string;
  age: string;
  interests: string;
  skills: string;
  experience: string;
  preferences: string;
};

type EmailDraftResponse = {
  subject?: string;
  body?: string;
  mode?: string;
  error?: string;
};

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "District of Columbia",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana",
  "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee",
  "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

const navItems: { label: string; page: Page; hash?: string }[] = [
  { label: "Home", page: "home" },
  { label: "Our mission", page: "home", hash: "mission" },
  { label: "Find opportunities", page: "find" },
  { label: "Privacy", page: "privacy" },
  { label: "Accessibility", page: "accessibility" }
];

const BLOOM_SEED = 452026671;

function bloomPhase(index: number, axis: number) {
  let value =
    (BLOOM_SEED ^
      Math.imul(index + 1, 0x45d9f3b) ^
      Math.imul(axis + 1, 0x27d4eb2d)) >>> 0;

  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;

  return (value / 4294967296) * Math.PI * 2;
}

const BLOOM_BLOBS = [
  { name: "Ink", color: "#111111", cx: 72.39, cy: 58.91, stops: [0, 19.38, 38.75, 58.13, 77.5], p: bloomPhase(0, 0), p2: bloomPhase(0, 1) },
  { name: "Slate", color: "#5C5C5C", cx: 37.53, cy: 79.97, stops: [0, 13.25, 26.5, 39.75, 53], p: bloomPhase(1, 0), p2: bloomPhase(1, 1) },
  { name: "Ash", color: "#A7A7A7", cx: 41.45, cy: 25.53, stops: [0, 17.1, 34.2, 51.3, 68.4], p: bloomPhase(2, 0), p2: bloomPhase(2, 1) },
  { name: "Paper", color: "#F2F2F2", cx: 72.25, cy: 83.19, stops: [0, 10.63, 21.25, 31.88, 42.5], p: bloomPhase(3, 0), p2: bloomPhase(3, 1) }
];

function rgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function BloomField() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = fieldRef.current;
    if (!node) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let frame = 0;
    let start = 0;

    const draw = (now: number) => {
      if (!start) start = now;

      const t = (now - start) / 1000;
      const ph = t * 0.24;

      const gradients = BLOOM_BLOBS.map((blob) => {
        const x =
          blob.cx +
          (Math.sin(ph * 0.55 + blob.p) - Math.sin(blob.p)) * 14 * 0.27;
        const y =
          blob.cy +
          (Math.sin(ph * 0.43 + blob.p2) - Math.sin(blob.p2)) * 14 * 0.27;

        const [s0, s1, s2, s3, s4] = blob.stops;

        const stops =
          `${rgba(blob.color, 0.98)} ${s0}%, ` +
          `${rgba(blob.color, 0.82)} ${s1}%, ` +
          `${rgba(blob.color, 0.42)} ${s2}%, ` +
          `${rgba(blob.color, 0.14)} ${s3}%, ` +
          `${rgba(blob.color, 0)} ${s4}%`;

        return `radial-gradient(ellipse 70% 70% at ${x}% ${y}%, ${stops})`;
      });

      node.style.backgroundImage = gradients.join(", ");

      if (!reducedMotion) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    draw(performance.now());

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <div ref={fieldRef} className="bloom-field" aria-hidden="true" />;
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState<SearchForm>({
    date: "",
    city: "",
    state: "",
    age: "",
    interests: "",
    skills: "",
    experience: "",
    preferences: ""
  });

  const [results, setResults] = useState<Opportunity[]>([]);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailMode, setEmailMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [queryError, setQueryError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 100);
    const onScroll = () => setScrolled(window.scrollY > 40);

    window.addEventListener("scroll", onScroll);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    document.title =
      page === "home"
        ? "Impact Agent — Open a new door. Grow something good."
        : `${page === "accessibility" ? "Accessibility" : page.charAt(0).toUpperCase() + page.slice(1)} — Impact Agent`;

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page]);

  const navigate = (next: Page) => {
    setMenuOpen(false);
    setPage(next);
    setNotice("");
    setQueryError("");
  };

  const update = (key: keyof SearchForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  async function findOpportunities(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQueryError("");

    if (!form.city.trim() || !form.state) {
      setQueryError(
        "Please enter a city and choose a state. We won't guess your location."
      );
      return;
    }

    if (
      form.age.trim() &&
      (!/^\d{1,3}$/.test(form.age.trim()) ||
        Number(form.age) < 1 ||
        Number(form.age) > 120)
    ) {
      setQueryError("Enter a valid age between 1 and 120, or leave it blank.");
      return;
    }

    if (form.date) {
      const chosen = new Date(`${form.date}T12:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sixMonths = new Date();
      sixMonths.setMonth(sixMonths.getMonth() + 6);

      if (Number.isNaN(chosen.getTime()) || chosen < today) {
        setQueryError("Please choose today or a future date.");
        return;
      }

      if (chosen > sixMonths) {
        setQueryError(
          "Please choose a date within the next six months."
        );
        return;
      }
    }

    setBusy(true);

    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: form.age.trim() ? Number(form.age) : undefined
        })
      });

      const data = await response.json() as {
        opportunities?: Opportunity[];
        mode?: string;
        message?: string;
        error?: string;
        normalizedCity?: string;
      };

      if (data.normalizedCity) {
        update("city", data.normalizedCity);
      }

      setResults(
        Array.isArray(data.opportunities) ? data.opportunities : []
      );

      setNotice(
        data.message ||
          data.error ||
          (response.ok
            ? "No source-backed results were returned. Try adjusting your interests or date."
            : "Search is unavailable right now. No sample listings were substituted.")
      );

      setPage("results");
    } catch {
      setResults([]);
      setNotice(
        "The search request could not be completed. Check that the local API is running, then try again. No sample listings were substituted."
      );
      setPage("results");
    } finally {
      setBusy(false);
    }
  }

  async function draftEmail() {
    if (!selected) return;

    setBusy(true);
    setNotice("");
    setEmailMode("");

    try {
      const response = await fetch("/api/email-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity: {
            title: selected.title,
            organization: selected.organization,
            summary: selected.summary,
            location: selected.location,
            date: selected.date,
            sourceUrl: selected.sourceUrl || selected.officialUrl || undefined
          },
          age: form.age.trim() ? Number(form.age) : undefined,
          interests: form.interests,
          skills: form.skills,
          experience: form.experience
        })
      });

      const data = await response.json() as EmailDraftResponse;

      if (!response.ok) {
        throw new Error(data.error || "Draft unavailable");
      }

      setEmailSubject(
        data.subject || `Question about ${selected.title}`
      );

      setEmailBody(
        data.body || fallbackEmail(selected, form)
      );

      setEmailMode(
        data.mode === "ai"
          ? "Personalized AI draft"
          : "Editable email template"
      );
    } catch {
      setEmailSubject(`Question about ${selected.title}`);
      setEmailBody(fallbackEmail(selected, form));
      setEmailMode("Editable email template");
      setNotice(
        "AI personalization was unavailable, so we've prepared an editable template using your details instead."
      );
    } finally {
      setBusy(false);
      setPage("email");
    }
  }

  const pageHeading: Partial<Record<Page, string>> = {
    find: "Find your next good thing.",
    results: "A few doors to open.",
    detail: selected?.title || "Opportunity details",
    email: "Start a conversation.",
    privacy: "Privacy, plainly.",
    accessibility: "Accessibility matters."
  };

  return (
    <div className="min-h-screen bg-[#1a191c] text-[#f6f3ed]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-black focus:p-3 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
          scrolled || page !== "home"
            ? "bg-[#161616]/90 backdrop-blur-md border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex items-center justify-between h-16 md:h-20">
          <button
            onClick={() => navigate("home")}
            className={`relative z-50 text-white text-xl md:text-2xl font-semibold tracking-tight nav-enter ${
              mounted ? "is-mounted" : ""
            }`}
            aria-label="Impact Agent home"
          >
            Impact Agent<span className="text-[#9eb8a2]">.</span>
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`hidden md:flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 text-white/90 text-sm hover:bg-white/10 transition nav-enter ${
              mounted ? "is-mounted" : ""
            }`}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
          >
            {menuOpen ? "Close" : "Navigate"}
            <span aria-hidden="true" className="text-white/50">
              {menuOpen ? "−" : "+"}
            </span>
          </button>

          <div
            className={`hidden md:flex items-center text-white/90 nav-enter ${
              mounted ? "is-mounted" : ""
            }`}
            aria-hidden="true"
          >
            <Flower2 className="w-7 h-7 text-[#fd688d]" strokeWidth={1.4} />
          </div>

          <button
            className={`md:hidden relative z-50 w-8 h-8 flex flex-col items-center justify-center gap-1.5 nav-enter ${
              mounted ? "is-mounted" : ""
            }`}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span
              className={`block w-6 h-[2px] bg-white transition-all duration-500 ease-overlay ${
                menuOpen ? "rotate-45 translate-y-[4px]" : ""
              }`}
            />
            <span
              className={`block w-6 h-[2px] bg-white transition-all duration-500 ease-overlay ${
                menuOpen ? "-rotate-45 -translate-y-[4px]" : ""
              }`}
            />
          </button>
        </div>
      </header>

      <div
        id="main-navigation"
        className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-center transition-all duration-700 ease-overlay ${
          menuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        aria-hidden={!menuOpen}
      >
        <nav aria-label="Main navigation" className="flex flex-col items-center gap-6 md:gap-8">
          {navItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.page);

                if (item.hash) {
                  window.setTimeout(() => {
                    document.getElementById(item.hash!)?.scrollIntoView({
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                      ).matches ? "auto" : "smooth"
                    });
                  }, 100);
                }
              }}
              className={`font-instrument text-3xl sm:text-4xl md:text-6xl text-white hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-all duration-600 ease-overlay ${
                menuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{
                transitionDelay: menuOpen ? `${150 + index * 60}ms` : "0ms"
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {page === "home" && (
        <main id="main-content">
          <section className="relative w-full h-screen min-h-[100svh] overflow-hidden flex items-end justify-center">
            <div
              className={`absolute inset-0 transition-all duration-[1400ms] ease-entrance ${
                mounted ? "scale-100 opacity-100" : "scale-105 opacity-0"
              }`}
            >
              <video
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260819_212700_3bb9329b-5c50-4257-a09b-ca85cf3654a3.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                aria-label="Decorative background video"
              />
            </div>

            <div className="relative z-10 text-center px-6 pb-16 md:pb-24 max-w-4xl mx-auto w-full">
              <h1
                className={`font-instrument text-white text-[2.5rem] leading-[0.95] sm:text-5xl md:text-6xl lg:text-7xl mb-5 md:mb-6 hero-enter ${
                  mounted ? "is-mounted delay-400" : ""
                }`}
              >
                Open a new door.
                <br className="hidden sm:block" /> Grow something good.
              </h1>

              <p
                className={`text-white/70 text-base md:text-lg mb-8 md:mb-10 max-w-md mx-auto hero-enter ${
                  mounted ? "is-mounted delay-600" : ""
                }`}
              >
                Turn what you care about into real-world action. Find
                meaningful opportunities near you — free, with no account
                or sign-up.
              </p>

              <button
                onClick={() => navigate("find")}
                className={`glow-cta inline-block px-8 py-3.5 bg-white text-black text-sm md:text-base font-medium rounded-full hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition hero-enter ${
                  mounted ? "is-mounted delay-800" : ""
                }`}
              >
                <span className="glow-cta-orb" aria-hidden="true">
                  <GlowEffect mode="rotate" blur="strong" duration={7} />
                </span>
                <span className="glow-cta-label">
                  Find an opportunity <ArrowUpRight aria-hidden="true" className="inline w-4 h-4 ml-1" />
                </span>
              </button>

              <p className="text-white/60 text-xs mt-5">
                You choose the action. You review the source. You decide
                what happens next.
              </p>
            </div>
          </section>

          <section
            id="mission"
            className="px-6 md:px-10 py-24 md:py-36 max-w-6xl mx-auto"
          >
            <p className="eyebrow mb-5">
              <Leaf className="w-4 h-4" aria-hidden="true" /> THE IDEA
            </p>

            <h2 className="font-instrument text-4xl sm:text-5xl md:text-7xl max-w-4xl leading-[1.02]">
              Less scrolling for ways to help. More doing the good you
              came here to do.
            </h2>

            <div className="grid md:grid-cols-3 gap-10 mt-16">
              <article>
                <span className="step">01</span>
                <h3 className="text-xl mt-4 mb-2">Start with what matters</h3>
                <p className="muted">
                  Choose a place, date, age if you wish, and the interests
                  or skills you want to bring. You can keep it broad.
                </p>
              </article>
              <article>
                <span className="step">02</span>
                <h3 className="text-xl mt-4 mb-2">Explore real leads</h3>
                <p className="muted">
                  Review source links and the status of each opportunity.
                  Listings may need confirmation with the organizer.
                </p>
              </article>
              <article>
                <span className="step">03</span>
                <h3 className="text-xl mt-4 mb-2">Take the next step</h3>
                <p className="muted">
                  Open the organizer's website or create a personalized,
                  editable email draft. Impact Agent never contacts anyone for you.
                </p>
              </article>
            </div>

            <ThreeDReveal />

            <div className="mt-20 border-t border-white/15 pt-8 flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between">
              <p className="muted max-w-xl">
                No account. No saved profile. Your preferences are used for
                this search and aren't intentionally stored by this starter.
              </p>
              <button
                onClick={() => navigate("find")}
                className="pill-light self-start glow-cta-soft"
              >
                Find your next good thing <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </section>

          <Footer navigate={navigate} />
        </main>
      )}

      {page !== "home" && (
        <main
          id="main-content"
          className="inner-page-shell min-h-screen pt-28 pb-20 px-6 md:px-10 max-w-6xl mx-auto"
        >
          <BloomField />

          <div className="inner-page-content">
            <button
              onClick={() =>
                navigate(
                  page === "results"
                    ? "find"
                    : page === "detail"
                      ? "results"
                      : page === "email"
                        ? "detail"
                        : "home"
                )
              }
              className="text-sm text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white flex items-center gap-2 mb-10"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>

            <p className="eyebrow mb-4">
              <Sparkles size={15} aria-hidden="true" /> IMPACT AGENT
            </p>

            <h1 className="font-instrument text-5xl md:text-7xl leading-none max-w-4xl mb-8">
              {pageHeading[page]}
            </h1>

            {page === "find" && (
              <form onSubmit={findOpportunities} className="panel max-w-3xl">
                <p className="muted mb-7">
                  Tell us where and when you might help. Only share information
                  you're comfortable using for this search. Age is optional.
                  Please don't enter sensitive personal details.
                </p>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="City *">
                    <input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="e.g. Phoenix"
                      required
                      maxLength={100}
                      autoComplete="address-level2"
                    />
                  </Field>

                  <Field label="State *">
                    <select
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                      required
                      autoComplete="address-level1"
                    >
                      <option value="">Choose a state</option>
                      {states.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="When would you like to help?">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                  </Field>

                  <Field label="Age (optional)">
                    <input
                      type="number"
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                      min={1}
                      max={120}
                      inputMode="numeric"
                      placeholder="Helps check age eligibility"
                    />
                  </Field>

                  <Field label="Interests / causes">
                    <input
                      value={form.interests}
                      onChange={(e) => update("interests", e.target.value)}
                      maxLength={300}
                      placeholder="Nature, animals, food access…"
                    />
                  </Field>

                  <Field label="Skills or hobbies">
                    <input
                      value={form.skills}
                      onChange={(e) => update("skills", e.target.value)}
                      maxLength={300}
                      placeholder="Gardening, writing, art…"
                    />
                  </Field>

                  <Field label="Experience (optional)">
                    <input
                      value={form.experience}
                      onChange={(e) => update("experience", e.target.value)}
                      maxLength={300}
                      placeholder="Anything you'd like to contribute"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Preferences (optional)">
                      <textarea
                        value={form.preferences}
                        onChange={(e) => update("preferences", e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Indoor/outdoor, one-off/recurring, access needs to consider…"
                      />
                    </Field>
                  </div>
                </div>

                {queryError && (
                  <p className="error mt-5" role="alert" aria-live="assertive">
                    {queryError}
                  </p>
                )}

                {busy && (
                  <div className="mt-7" role="status" aria-live="polite">
                    <Loader />
                    <p className="muted mt-3">Researching opportunities…</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="pill-light mt-7 disabled:opacity-50"
                >
                  {busy ? "Researching…" : "Find opportunities"}
                  {!busy && <ArrowUpRight size={16} aria-hidden="true" />}
                </button>

                <p className="text-white/55 text-xs mt-5">
                  Live research uses Tavily when configured. Results are
                  leads to investigate, not confirmed openings. Age requirements
                  should always be confirmed with the organization.
                </p>
              </form>
            )}

            {page === "results" && (
              <div>
                {notice && (
                  <div className="notice mb-6" role="status" aria-live="polite">
                    {notice}
                  </div>
                )}

                <p className="muted mb-8">
                  {results.length > 0 && results.every((item) => item.isDemo)
                    ? "These are mock examples to test personalization. They are not real events, organizations, or openings."
                    : "These are leads to investigate, not guarantees of availability. Confirm details on each original source."}
                </p>

                {results.length === 0 ? (
                  <div className="empty-results">
                    <span className="empty-mark" aria-hidden="true">—</span>
                    <h2 className="font-instrument text-3xl mb-2">
                      No results to show yet.
                    </h2>
                    <p className="muted max-w-xl">
                      Impact Agent will not invent organizations or events to
                      fill this space. Check the message above: the backend may
                      need a Tavily key, the search may have failed, or the
                      sources may not contain a strong match.
                    </p>
                    <button
                      onClick={() => navigate("find")}
                      className="pill-outline mt-6"
                    >
                      Adjust your search
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {results.map((item) => (
                      <article key={item.id} className="result-card">
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <span className={`status ${item.isDemo ? "status-mock" : ""}`}>
                            {item.isDemo ? "MOCK · NOT A REAL OPPORTUNITY" : item.status}
                          </span>
                          <span className="text-white/55 text-xs">{item.category}</span>
                        </div>

                        <h2 className="font-instrument text-3xl mb-2">
                          {item.title}
                        </h2>
                        <p className="text-white/65 text-sm mb-5">
                          {item.organization}
                        </p>
                        <p className="muted mb-5">{item.summary}</p>

                        {!item.isDemo && (item.sourceUrl || item.officialUrl) && (
                          <div className="text-xs text-white/60 mb-5 flex flex-wrap gap-x-4 gap-y-2 items-center">
                            <a
                              className="underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                              href={item.sourceUrl || item.officialUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open original source
                            </a>
                            {item.checkedAt && (
                              <span>
                                Source checked {new Date(item.checkedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-sm text-[#b9cdbd] mb-6">
                          Why it may fit: {item.fitReason}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm text-white/65 mb-6">
                          <span className="flex gap-2 items-center">
                            <MapPin size={15} aria-hidden="true" /> {item.location}
                          </span>
                          <span className="flex gap-2 items-center">
                            <CalendarDays size={15} aria-hidden="true" /> {item.date}
                          </span>
                        </div>

                        <button
                          className="pill-outline"
                          onClick={() => {
                            setSelected(item);
                            setPage("detail");
                          }}
                        >
                          Explore this lead <ArrowUpRight size={15} aria-hidden="true" />
                        </button>
                      </article>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => navigate("find")}
                  className="pill-outline mt-8"
                >
                  Change search
                </button>
              </div>
            )}

            {page === "detail" && selected && (
              <div className="panel max-w-3xl">
                <div className="flex flex-wrap gap-3 mb-6">
                  <span className={`status ${selected.isDemo ? "status-mock" : ""}`}>
                    {selected.isDemo ? "MOCK · NOT A REAL OPPORTUNITY" : selected.status}
                  </span>
                  <span className="status">{selected.category}</span>
                </div>

                <h2 className="text-2xl mb-2">{selected.organization}</h2>
                <p className="muted mb-6">{selected.summary}</p>

                <div className="detail-row">
                  <MapPin size={18} aria-hidden="true" />
                  <div><strong>Location</strong><p>{selected.location}</p></div>
                </div>

                <div className="detail-row">
                  <CalendarDays size={18} aria-hidden="true" />
                  <div><strong>Date / availability</strong><p>{selected.date}</p></div>
                </div>

                {selected.checkedAt && !selected.isDemo && (
                  <div className="detail-row">
                    <ShieldCheck size={18} aria-hidden="true" />
                    <div>
                      <strong>Source checked</strong>
                      <p>{new Date(selected.checkedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <Heart size={18} aria-hidden="true" />
                  <div><strong>Why it may fit</strong><p>{selected.fitReason}</p></div>
                </div>

                {(selected as Opportunity & { ageEligibility?: string }).ageEligibility && (
                  <div className="detail-row">
                    <ShieldCheck size={18} aria-hidden="true" />
                    <div>
                      <strong>Age eligibility</strong>
                      <p>
                        {(selected as Opportunity & { ageEligibility?: string }).ageEligibility}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-7 flex flex-wrap gap-3">
                  {selected.isDemo ? (
                    <p className="mock-explainer">
                      This is a mock concept for testing personalization. It
                      has no real source page or organization, so email drafting
                      is disabled.
                    </p>
                  ) : (
                    <>
                      {(selected.officialUrl || selected.sourceUrl) && (
                        <a
                          className="pill-light"
                          href={selected.officialUrl || selected.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open original source <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      )}

                      <button
                        onClick={draftEmail}
                        className="pill-outline"
                        disabled={busy}
                      >
                        {busy ? "Preparing your email…" : "Draft a personalized email"}
                        <Mail size={15} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>

                {busy && (
                  <p className="muted mt-4" role="status" aria-live="polite">
                    Preparing your draft…
                  </p>
                )}

                <p className="text-white/55 text-xs mt-6">
                  Confirm the organization, date, location, age eligibility,
                  supervision, and signup requirements directly. If you're
                  under 18, involve a parent or guardian before contacting
                  or attending.
                </p>
              </div>
            )}

            {page === "email" && (
              <div className="panel max-w-3xl">
                <p className="muted mb-4">
                  Your draft uses the opportunity details and any interests,
                  skills, experience, or age you chose to provide. Review and
                  edit everything before using it.
                </p>

                {emailMode && (
                  <p className="text-sm text-[#b9cdbd] mb-4" role="status">
                    {emailMode}
                  </p>
                )}

                {notice && (
                  <p className="notice mb-5" role="status" aria-live="polite">
                    {notice}
                  </p>
                )}

                <Field label="Subject">
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    maxLength={180}
                    aria-label="Email subject"
                  />
                </Field>

                <div className="mt-5">
                  <Field label="Email draft">
                    <textarea
                      rows={14}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      maxLength={6000}
                      aria-label="Editable email message"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  <button
                    className="pill-light"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `Subject: ${emailSubject}\n\n${emailBody}`
                        );
                        setNotice("Your email draft was copied to the clipboard.");
                      } catch {
                        setNotice(
                          "Clipboard access was blocked. Select the text in the fields and copy it manually."
                        );
                      }
                    }}
                  >
                    <Copy size={15} aria-hidden="true" /> Copy draft
                  </button>

                  <a
                    className="pill-outline"
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                      (selected?.contactEmail || "").trim()
                    )}&su=${encodeURIComponent(
                      emailSubject.replace(/[—–]/g, "-")
                    )}&body=${encodeURIComponent(
                      emailBody.replace(/[—–]/g, "-")
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open email draft <Mail size={15} aria-hidden="true" />
                  </a>
                </div>

                <p className="text-white/55 text-xs mt-5">
                  Impact Agent does not send the message. The email link opens
                  your email app, where you can review it before sending.
                </p>
              </div>
            )}

            {page === "privacy" && (
              <div className="prose-panel max-w-3xl">
                <ShieldCheck className="text-[#b9cdbd] mb-5" size={28} aria-hidden="true" />
                <h2>Designed to ask for less</h2>
                <p>
                  This starter has no accounts, profiles, or database. Search
                  fields are sent to the server to process the current request.
                  Hosting providers may maintain operational logs, so production
                  settings must be reviewed before launch.
                </p>

                <h2>What may be sent to providers</h2>
                <p>
                  If an external search or AI provider is enabled, requests may
                  include your city, state, date, optional age, interests,
                  skills, and experience. Avoid sensitive personal details.
                  Review each provider's current terms and privacy policy.
                </p>

                <h2>What we don't do</h2>
                <p>
                  This starter doesn't create an account, save a profile, or
                  send email on your behalf. Before launch, configure log
                  controls, rate limits, data retention, and accurate provider
                  disclosures.
                </p>

                <h2>Young people</h2>
                <p>
                  Ask a parent or trusted adult to help review opportunities
                  and confirm age rules, supervision, transport, and safety
                  before contacting an organization or attending an event.
                </p>

                <p className="text-white/55 text-sm">
                  Template only. Update this page to reflect the final
                  implementation and applicable law before publishing.
                </p>
              </div>
            )}

            {page === "accessibility" && (
              <div className="prose-panel max-w-3xl">
                <Accessibility className="text-[#b9cdbd] mb-5" size={30} aria-hidden="true" />

                <h2>Our accessibility commitment</h2>
                <p>
                  Impact Agent aims to make finding community opportunities
                  usable by as many people as possible. We are working toward
                  a clear, keyboard-friendly, responsive experience. This
                  statement describes our goals; it is not a claim of formal
                  WCAG conformance or a completed accessibility audit.
                </p>

                <h2>Keyboard navigation</h2>
                <p>
                  You can use Tab and Shift+Tab to move between interactive
                  controls, Enter or Space to activate buttons, and the
                  navigation menu to reach the main sections. A skip link
                  appears when focused by keyboard.
                </p>

                <h2>Screen readers and readable content</h2>
                <p>
                  We aim to use meaningful headings, labeled form fields,
                  text alternatives where needed, and status messages for
                  search results and errors. Some visual effects and third-party
                  components may still need additional testing.
                </p>

                <h2>Motion and visual design</h2>
                <p>
                  We aim to respect the reduced-motion preference on supported
                  devices. You can also use your browser's zoom controls to
                  enlarge content. We still need to test contrast, focus
                  visibility, layouts at high zoom, and all animations.
                </p>

                <h2>Need help or found a barrier?</h2>
                <p>
                  If a control does not work, try using the keyboard or another
                  browser. You can also ask the opportunity organizer directly
                  about access needs and accommodations. This version does not
                  yet have a dedicated accessibility-feedback email address,
                  so we won't display a made-up contact.
                </p>

                <h2>Ongoing improvements</h2>
                <p>
                  Before launch, we plan to test keyboard-only use, screen
                  readers, browser zoom, form errors, video behavior, reduced
                  motion, and color contrast. Please treat this as an ongoing
                  commitment rather than a certification.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate("home")}
                    className="pill-light"
                  >
                    Back to home <ArrowUpRight size={15} aria-hidden="true" />
                  </button>

                  <button
                    onClick={() => navigate("find")}
                    className="pill-outline"
                  >
                    Find opportunities <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field-label">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Footer({ navigate }: { navigate: (page: Page) => void }) {
  return (
    <>
      <HalftoneWordmarkFooter
        wordmark="impact agent"
        label="Impact Agent"
        meta={`AI FOR REAL-WORLD IMPACT · © ${new Date().getFullYear()}`}
        preset="night"
        palette={{ background: "#161616", ink: "#f6f3ed", warm: "#f5b9d3" }}
        height="440px"
        dotGap={5.5}
        radius={82}
        crop={0.22}
        grain={0.28}
        columns={[
          {
            title: "Explore",
            links: [
              { label: "Find opportunities", href: "#find", onClick: () => navigate("find") },
              { label: "Our mission", href: "#mission", onClick: () => navigate("home") }
            ]
          },
          {
            title: "About",
            links: [
              { label: "Privacy", href: "#privacy", onClick: () => navigate("privacy") },
              { label: "Accessibility", href: "#accessibility", onClick: () => navigate("accessibility") }
            ]
          },
          {
            title: "Take action",
            links: [
              { label: "Start with what matters", href: "#find", onClick: () => navigate("find") },
              { label: "Real-world impact", href: "#mission", onClick: () => navigate("home") }
            ]
          }
        ]}
      />

      {/* These are real React buttons outside the custom footer component,
          so the accessibility and privacy links work even if its link
          click handling is not forwarded correctly. */}
      <div className="bg-[#161616] border-t border-white/10 px-6 md:px-10 py-7">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-5 items-center justify-between">
          <p className="text-sm text-white/60">
            Impact Agent — built for more accessible community action.
          </p>

          <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate("privacy")}
              className="text-sm underline underline-offset-4 text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Privacy statement
            </button>

            <button
              type="button"
              onClick={() => navigate("accessibility")}
              className="text-sm underline underline-offset-4 text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Accessibility statement
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

function fallbackEmail(
  opportunity: Opportunity,
  form: SearchForm
) {
  const parts = [
    `Hello ${opportunity.organization} team,`,
    "",
    `I'm reaching out to ask about getting involved with ${opportunity.title}.`,
    ""
  ];

  if (form.interests.trim()) {
    parts.push(
      `I'm particularly interested in ${form.interests.trim()}.`,
      ""
    );
  }

  if (form.skills.trim()) {
    parts.push(
      `Some skills or hobbies I could bring include ${form.skills.trim()}.`,
      ""
    );
  }

  if (form.experience.trim()) {
    parts.push(
      `My relevant experience includes ${form.experience.trim()}.`,
      ""
    );
  }

  parts.push(
    `Could you let me know whether this opportunity is currently available, what the age and experience requirements are${form.age.trim() ? ` for someone aged ${form.age.trim()}` : ""}, whether supervision or a guardian is required, and how to get started?`,
    "",
    "Thank you for your time,",
    "[Your name]"
  );

  return parts.join("\n");
}
