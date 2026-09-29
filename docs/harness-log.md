# Harness log

One entry per merged PR: what the coding agent got wrong or needed to be told, and what changed in the harness so it won't happen again. See the [walking skeleton PRD](prd/walking-skeleton.md#harness-log).

| PR                                                         | What went wrong                                                                                                                                                                                | Harness change                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [#16](https://github.com/albert-schilling/bardery/pull/16) | The comment on `skipLibCheck` in `tsconfig.base.json` said it only skips declaration files in `node_modules`; it skips all of them, the project's own `.d.ts` files included. Fixed in review. | None: a one-off factual slip in a comment, which review caught. No check would catch it cheaply. |
