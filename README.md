# Impact Agent

React 18 + TypeScript + Vite frontend with an Express API. The API can use Tavily Basic Search for source-backed opportunity discovery when you add your own Tavily key. OpenAI is optional and is used only to generate editable email drafts; without an OpenAI key, the API returns a safe template. Ceramic remains disabled.

## Requirements

- Node.js 20 LTS or newer
- A Tavily API key for live web research
- Optional: an OpenAI API key for AI-generated editable email drafts (API billing is separate from ChatGPT)

## Install and run

1. Extract this ZIP. Open a terminal in the `impact-agent` folder (the folder containing `package.json`).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`. On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Edit `.env.local` locally and add your keys:

   ```env
   PORT=8787
   APP_ORIGIN=http://localhost:5173
   TAVILY_API_KEY=your_new_tavily_key
   MOCK_RESULTS_ENABLED=false
   CERAMIC_API_KEY=
   CERAMIC_LIVE_SEARCH_ENABLED=false
   OPENAI_API_KEY=
   OPENAI_MODEL=gpt-4.1-mini
   ```

   Keep the keys private. Never put them in frontend files, commit `.env.local`, or paste them into chat. Revoke and replace any key that has been exposed.

5. Start the frontend and API together:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:5173`. Vite proxies `/api` requests to the Express API at port `8787`.

## Live search behavior

- `/api/opportunities` calls Tavily Basic Search from the server when `TAVILY_API_KEY` is configured. It makes two focused searches, filters and deduplicates results, and ranks them against profile terms.
- Search results are **potential leads**, not verified openings. The app cannot guarantee a page is current, that a role is accepting volunteers, or that a minor is eligible. Open the original source to confirm dates, age eligibility, supervision, costs, location, and contact details.
- If live search is not configured or fails, the API returns an honest error/empty state instead of pretending results are real. Mock examples are off by default and are explicitly labeled if deliberately enabled.
- Ceramic is intentionally not called. Leave `CERAMIC_LIVE_SEARCH_ENABLED=false` until its terms and permission have been reviewed.
- `/api/email-draft` returns an editable template without an OpenAI key. With `OPENAI_API_KEY`, it can use the configured OpenAI model to improve the draft. It does not send email.

## UI and implementation notes

- Keeps the existing video hero and navigation.
- Includes the staggered `LOADING` letters with reduced-motion support, the multicolor Glow Effect CTA, and a local 3D-style reveal. The local reveal is not the licensed React Bits Pro component.
- Uses lighter charcoal/plum accents on inner pages. The requested moving Uiverse flower animation is not included; the existing Lucide flower icon remains.
- Includes API rate limiting and input validation.

## Build and verification

Run `npm run build` to type-check and build the frontend. The current packaging environment did not have the full dependencies installed, so a successful build could not be confirmed here. After installing dependencies, resolve any build errors before relying on the app. Test with several different profiles and confirm every result opens its source page.
