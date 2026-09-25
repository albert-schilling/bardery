# Separate web and native clients

Bardery has two clients: an Expo app for iOS and Android, and a React Router app for the web. This reverses session 1's plan of one Expo codebase for native and web through React Native Web. We chose this so each platform uses its own idioms without React Native Web's compromises, and so the web app, the client most reviewers of this reference project will actually open, uses a standard web stack. The web app is built first; native follows with the same features.

## Consequences

- Every screen is built twice. To keep that cost to rendering only, the API client, data hooks, view logic and UI translations live in shared packages that both apps use.
- Components stay free of logic, so most client behaviour is tested once in the shared packages.
- Styling differs by platform (React Native styles on native, stylesheets on the web). The common source for design tokens is the Figma design, not code.
