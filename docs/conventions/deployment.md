# Deployment

- A deployed build never falls back to a local address. Local defaults for Vite go in `.env.development`, not `.env`, which Vite also loads for production builds. A build that lacks a required value fails, or shows an error state, instead of calling localhost.
- Values that differ per deployment, such as the api's URL, live in the GitHub environment's variables (`vars.*`), not written into the workflow.
