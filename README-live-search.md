# Impact Agent live search setup

The existing `/api/opportunities` endpoint now calls Tavily's basic Search API from the Express server when `TAVILY_API_KEY` is configured. It does not call Ceramic. The key is read only on the server and is never sent to the browser.

## 1. Configure the key

1. Create/access your Tavily account and copy an API key from its dashboard.
2. In this project root, create `.env.local` (next to `package.json`).
3. Add:

```env
TAVILY_API_KEY=put_your_key_here
MOCK_RESULTS_ENABLED=false
CERAMIC_LIVE_SEARCH_ENABLED=false
```

Keep `.env.local` private and do not commit it or paste the key into chat. `.env.local` should be ignored by Git. If a key is ever exposed, revoke it and create a replacement.

## 2. Start the app

```bash
npm install
npm run dev
```

The Vite frontend runs at `http://localhost:5173`; the Express API runs at port `8787`.

## 3. What the search does

- Validates the city, state, date, and profile fields.
- Corrects a small list of common city and ordinary-word typos, without normalizing date fields or numeric identifiers.
- Makes two focused Tavily **basic** searches based on the user's profile and location.
- Deduplicates and ranks results using profile-word overlap and broad interest categories.
- Returns source URLs and snippets from the search provider. Results are labeled `Potential lead`; a search result is not proof that an event is open, age-eligible, or currently available.
- If search fails or finds no relevant pages, the app shows an honest message and does not replace it with mock results.

## Limitations and safety

Tavily search results are discovery leads, not verified listings. Users should open the source page to confirm current dates, location, cost, age eligibility, supervision requirements, and contact details. The code intentionally avoids sending profile data to Ceramic. OpenAI is only used for optional editable email drafts, not search. The server logs provider errors without logging the user's profile or query terms.

This environment could not complete `npm install` due to a timeout, so the integration has not been dependency-built or live-tested here. After setup, run `npm run build` and test a few varied searches locally before relying on it.
