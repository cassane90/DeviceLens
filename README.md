# DeviceLens

DeviceLens is a focused, AI-assisted device triage app.

It helps a user photograph an electronic device, describe the symptoms, and get a conservative assessment of what may be wrong and what to do next.

## DeviceLens v1 scope

DeviceLens v1 does:

- accept 1 to 5 device photos
- accept a device category, optional known model, and symptom description
- use Gemini multimodal analysis for identification and triage
- show identification confidence and the visible evidence used
- rank likely causes without pretending they are confirmed faults
- flag safety and high-voltage risks
- estimate repair difficulty and a rough repair-cost range when defensible
- suggest likely tools and common failure points
- look up matching public repair guides from iFixit
- provide direct searches for YouTube repair videos, Google Maps repair shops, web research, and completed eBay listings
- save lightweight scan history locally in the browser
- work as an installable PWA

DeviceLens v1 does not:

- require an account
- require Supabase
- sell a Pro plan
- claim to verify repair businesses
- use the paid Google Places API
- require the YouTube Data API
- store uploaded photos in saved browser history
- claim AI estimates are guaranteed diagnoses

## Required environment variables

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

Only `GEMINI_API_KEY` is required. `GEMINI_MODEL` defaults to `gemini-3.8-flash`.

The Gemini key is read only by the server-side Vercel function. It must not be exposed through a `VITE_` environment variable.

## Local development

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
```

For local Vercel Functions, use the Vercel development environment. A plain Vite dev server can render the frontend, but `/api/diagnose` and `/api/ifixit` need a serverless-function-compatible dev environment.

## Deployment

The repository is structured for Vercel:

- framework: Vite
- build command: `npm run build`
- output: `dist`
- server routes: `/api/diagnose`, `/api/ifixit`, `/api/health`

Set the server environment variable `GEMINI_API_KEY` before deploying.

## Accuracy and safety

DeviceLens is an AI-assisted triage tool. Photos cannot prove every internal fault.

The application is designed to:

- show uncertainty
- separate visible evidence from inferred causes
- avoid inventing repair shops and source links
- avoid fake precision for repair costs
- warn users away from hazardous DIY work

Important repair, safety, resale, and purchasing decisions should still be independently verified.
