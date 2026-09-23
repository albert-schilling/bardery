# Story text is the source of truth

Everything the AI needs to continue a Story, illustrate a Part, or bring a Hero into a new Story is derived at generation time from Stories that already exist (Part text and previous illustrations). There is no separate story bible, fact store, character sheet or Hero memory. We chose this to keep the system small and to avoid derived state drifting out of sync with branching Storylines. The cost is prompts that grow with Story and Hero history.

The only stored derived data is what the Hero screen needs: a Hero's name, short description and portrait, generated when the Hero first appears.

## Consequences

- A Hero's evolution comes from the full text of the most recently finished Storyline of each Story it starred in. If a Story has no finished Storyline, its most recently extended Storyline is used instead.
- Images are generated from the Storyline text so far plus the Hero portraits and all earlier illustrations in the Storyline. They depict only what the text states, so early images are sparse because little is established yet.
- Summaries are a possible later optimization if prompts get too large. Adding them should be recorded as a new ADR that supersedes this one.
