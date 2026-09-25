# Bardery

Yet another AI storytelling app, but this time you decide how the story continues.

## Vision

Each part of the story ends in a decision. Pick one of the suggested paths or describe your own, and Bardery writes and illustrates what happens next. You can go back to any earlier decision and branch off a new version of the story, or have the story read aloud.

<table>
  <tr>
    <td align="center" valign="top"><img src="docs/design/screens/03-home.png" width="200" alt="Home screen with the profile's stories and heroes"><br><sub>Your stories and heroes</sub></td>
    <td align="center" valign="top"><img src="docs/design/screens/07-story-decision-selected.jpg" width="200" alt="Illustrated story ending in a decision"><br><sub>Decide how the story continues</sub></td>
    <td align="center" valign="top"><img src="docs/design/screens/08-decisions.png" width="200" alt="Timeline of the decisions made in a story"><br><sub>Revisit decisions and branch off</sub></td>
    <td align="center" valign="top"><img src="docs/design/screens/11-audio-mode.png" width="200" alt="Listening mode with voice and speed options"><br><sub>Listen with narration</sub></td>
  </tr>
</table>

These are early UI prototypes. See [`docs/design/`](docs/design/) for all screens.

## Goal

Bardery is a public reference for building a production-ready, AI-powered full-stack application: an Expo app for iOS, Android and web, a TypeScript backend, and AI generation of text, illustrations and narration, all running in the EU on Azure. Beyond the features, it shows the engineering around them: a clean layered architecture, tests, evaluations for the AI workflows, observability, infrastructure as code and CI/CD.

## Documentation

- [`CONTEXT.md`](CONTEXT.md): the domain glossary.
- [`docs/adr/`](docs/adr/): architecture decision records.
- [`docs/grilling/`](docs/grilling/): the design sessions behind the product and technical decisions.
- [`docs/design/`](docs/design/): the UI prototype.

## Licence

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html).
