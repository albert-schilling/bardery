# Story text is the source of truth

Everything the AI needs to continue a Story, illustrate a Part, or bring a Hero into a new Story is derived at generation time from Stories that already exist (Part text and previous illustrations). There is no separate story bible, fact store, character sheet or Hero memory. We chose this to keep the system small and to avoid derived state drifting out of sync with branching Storylines. The cost is prompts that grow with Story and Hero history.

The only stored derived data is what the Hero screen needs: a Hero's name, short description and one portrait per Age Band. The name and description are generated when the Hero first appears. A portrait is generated the first time the Hero appears in an Age Band, from the Hero's portrait in the previous band, so the Hero looks older as its Profile grows up while staying recognisable.

## Consequences

- A Hero's evolution comes from the full text of the most recently finished Storyline of each Story it starred in. If a Story has no finished Storyline, its most recently extended Storyline is used instead.
- Images are generated from the Storyline text so far plus the Hero portraits and earlier illustrations of the Storyline. They depict only what the text states, so early images are sparse because little is established yet.
- Image models accept only a limited number of reference images. The Hero portraits always go in; the remaining slots are filled with the first illustration, the most recent one, and illustrations evenly spaced between them. The maximum depends on the image model and is configuration.
- Regenerating portraits in a new Age Band is automatic and the only kind of portrait regeneration in v1; the reader can't trigger it.
- Summaries are a possible later optimization if prompts get too large. Adding them should be recorded as a new ADR that supersedes this one.
