# Grilling session 1 — product (2026-09-23)

Handoff for resuming the `/grill-with-docs` session on Bardery. Session 1 covered the product; session 2 starts with three open product questions, then moves to the technical design.

## How to resume

1. Invoke `/grill-with-docs` (loads the `grilling` and `domain-modeling` skills).
2. Read, in this order:
   - [`CONTEXT.md`](../../CONTEXT.md): the glossary. Use its terms and challenge any drift from them.
   - [`docs/adr/`](../adr/): ADR 0001, *Story text is the source of truth*. This is the most important constraint; many technical choices follow from it.
   - [`docs/design/README.md`](../design/README.md) and `docs/design/screens/`: the Figma Make prototype, one section per screen.
   - `docs/design/figma-make-export/`: the prototype's React code, for reference only (colours, spacing, component structure).
   - This file: product decisions that aren't in the glossary or an ADR, the open questions, and the technical frontier.
3. Ask the **open questions** (Q31–Q33) together with the first technical round.

Questions are numbered continuously across sessions. Session 1 ended at Q33, so start new questions at Q34.

## Suggested skills

- `grill-with-docs` → `grilling`, `domain-modeling`: the session itself.
- `research`: for comparing AI providers (image models that accept many reference images, multilingual TTS) against primary sources, instead of relying on memory.
- `claude-api`: for any decision involving Claude models (choice, pricing, streaming, caching).
- `codebase-design`: once the module boundaries (generation pipeline, storage, search) come up.

## Product decisions not captured elsewhere

The glossary (`CONTEXT.md`) and ADR 0001 are the primary record; this list only holds what they don't.

**Scope and audience**
- Q1: A demo that could become a real product: invite-only Accounts, a daily generation limit, GDPR-ready data (Profiles hold only a name and a birth date; deleting an Account deletes everything). No billing.
- Q2: A child may use the app alone. Parent settings sit behind a PIN. All input inside a Profile, free text included, is treated as the child's and safety-checked.
- Q30: Out of scope for v1: several Heroes chosen by the reader, per-character voices, voice input, story summaries, regenerating Hero portraits or descriptions (except possibly Q32), offline reading, billing, sharing/exporting/printing Stories.

**Story flow**
- Q7: At a Choice, the reader may ask for an Ending once the Age Band's minimum number of Parts is reached; the AI then writes a fitting Ending.
- Q8: On the Decisions screen, alternatives that were already explored are marked ("you went this way before") and open the existing Storyline; unexplored ones generate new Parts. This screen is the only place to switch Storylines. Library and Home always open the most recently extended Storyline.
- Q16: The AI names 1–2 Heroes when a Story starts, and they stay fixed. Side characters never become Heroes. "Use a hero" picks exactly one existing Hero; the AI may add one new companion Hero. The reader choosing several Heroes is a future feature.
- Q19: Unsuitable free text is reinterpreted gently into an age-appropriate continuation close to the child's idea. Only clearly unsafe input (personal data, self-harm, sexual content) is blocked, with a friendly "let's try another idea". The child never sees an error.
- Q20: The daily limit counts Parts generated per Account per day, shared across Profiles. Re-reading and switching Narrators are free. At the limit, the Choice is replaced with "The storyteller is resting — come back tomorrow".
- Q22: One title per Story, generated with the first Part and never changed.

**Reading experience**
- Q9: A Storyline is one continuous vertical scroll of its Parts. The dots on screen 06 become a progress indicator.
- Q10: The AI assigns a mood colour to each Part while writing it. The background blends between neighbouring Parts' colours as the reader scrolls.
- Q26: While a Part is generated, the text streams in and a softly animated placeholder holds the illustration's spot until it fades in. The new mood colour blends in right away. The next Choice appears only once the text is complete.
- Q12: Three Narrator voices, no voice input, per-character voices deferred. *Assumed, not explicitly confirmed:* the Narrator is remembered per Profile; audio is generated on the first play of a Part and then saved; at a Choice, the Narrator reads the Options aloud, pauses, and the reader taps one.
- Q13: Semantic search runs over Parts from all Storylines and groups results by Story. A result opens the Storyline containing that Part, scrolled to it.

**Heroes and illustrations**
- Q15: A Hero's name, short description and portrait are stored (the exception in ADR 0001).
- Q17: Each image is generated from the Storyline text so far plus the current Part, with the instruction to depict only what the text states. The Hero portraits and **all** earlier illustrations of the Storyline are passed as references.
- Q27: One House Style for the whole app, adapted to the Age Band.

**Languages**
- Q18/Q24: 11 languages at launch: English, German, French, Spanish, Italian, Portuguese, Dutch, Polish, Turkish, Russian, Ukrainian. The UI follows the device language in the same 11. A language counts as supported only after a quality check across story generation, all three Narrators, and search. Adding a language should be configuration plus a quality check, not new code.

**Parent settings and data**
- Q21: Parent settings: manage Profiles (name, birth date, Story Language, delete), change the PIN, see the daily limit, delete the Account and all its data. No separate parent view of Stories.
- Q28: Only a parent (in Parent settings) can delete a Story. A Hero survives while it stars in any remaining Story; its "from · …" label moves to the oldest remaining one. A Hero with no Stories left is deleted. Single Storylines can't be deleted in v1.
- Q29: Online-only in v1.

## Open product questions (answered in [session 2](2026-09-24-technical-session.md))

**Q31 – Full set of Age Bands.** The user asked for bands below 3 and beyond 13. Proposal:

| Age Band | Who holds the device | Text per Part | Target Parts | Min before reader may end | Hard limit |
|---|---|---|---|---|---|
| 0–2 | parent reads aloud | ~20–40 words | 3–4 | 2 | 5 |
| 3–5 | parent or child | ~60–100 | 4–6 | 3 | 8 |
| 6–8 | child | ~120–200 | 6–9 | 4 | 12 |
| 9–12 | child | ~200–350 | 8–12 | 5 | 15 |
| 13–15 | teen | ~350–500 | 10–14 | 6 | 16 |
| 16+ | teen/adult | ~400–600 | 10–16 | 6 | 16 |

➡️ Recommended: these bands as tunable configuration. 16+ is capped at young-adult content. 0–2 keeps Choices (the parent picks). A hard limit of 16 also caps the number of reference images (Q17).
Still to decide: does Bardery serve adults at all?

**Q32 – A Hero who crosses Age Bands.** Q27 (Heroes look older in older bands) conflicts with Q15 (one stored portrait) and Q17 (the portrait is used as a reference). Options: (a) keep the old portrait; (b) skip the portrait reference when the band changed; (c) store one portrait per Hero per Age Band, generating an older one from the previous portrait on first use in a new band.
➡️ Recommended: (c). This pulls a small, automatic piece of portrait regeneration into v1, which is an exception to Q30.

**Q33 – Story card colours.** ➡️ Recommended: the card gradient comes from the mood colours of the Parts in the default Storyline, so no new data is needed.

## Prototype corrections to make

- Profile picker shows overlapping bands ("Age 4–6", "Age 6–8"); switch to the final bands from Q31.
- The microphone icon on the story screen opens audio mode, not voice input; replace it with headphones or a speaker.
- Screen 08 repeats the same excerpt ("Luna stands at the forest's edge…") for every decision; each entry should quote its own Part.
- Screen 11 lacks the Choice behaviour in audio mode (see Q12 assumption).

## Technical frontier (next session)

Settled so far: **one codebase for native (iOS, Android) and web** (Q7). Expo (React Native + React Native Web) with TypeScript was recommended but not yet confirmed. Everything else is open.

These have no unsettled prerequisites, so they can be asked in the first technical round:

- **Client framework**: confirm Expo + TypeScript; routing, styling, and how much of the Figma Make export to reuse.
- **Backend shape and language**: TypeScript backend? Framework; monolith vs. separate generation workers.
- **Hosting and data residency**: EU hosting for GDPR (children's data, EU-based developer).
- **Data store**: the recommendation to test is one Postgres with pgvector for both data and semantic search, in line with ADR 0001's "keep the system small".
- **AI providers**, one per modality. Each must cover all 11 languages:
  - text generation (streaming, safety);
  - image generation (must accept up to ~16+ reference images plus Hero portraits, and hold the House Style);
  - text-to-speech (3 voices per language);
  - multilingual embeddings.
  Provider data-processing terms (EU, no training on children's data) are a constraint.
- **Auth**: invite-only Accounts (magic link / passkeys / OAuth?), the Parent settings PIN, and multiple Profiles per Account.
- **Showcase goals**: public repo? License, README/architecture docs, and what the project should demonstrate to a reader of the code.

These depend on the ones above, so they come in a later round:

- Generation pipeline: streaming text to clients (SSE/WebSocket), asynchronous image and audio jobs, retries, what happens when image generation fails.
- Media storage and delivery (illustrations, Narrator audio): object storage and CDN.
- Safety pipeline: checks on input (free text, prompts) and output (text and images), per Age Band.
- Enforcing the daily limit and tracking cost per Account.
- Repo layout (monorepo, shared types between client and backend), testing strategy, CI, observability, deployment.
