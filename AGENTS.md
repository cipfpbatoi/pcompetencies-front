# AGENTS.md

This repository is a Vue 3 + Vite app (JavaScript, Options API) with Pinia,
Axios, Bootstrap, Vitest, and Cypress. Follow the conventions below when
building features or fixes.

## Commands

### Install

- `npm install`

### Dev server

- `npm run dev` (Vite dev server)

### Build/preview

- `npm run build`
- `npm run preview` (preview build on `http://localhost:4173`)

### Lint/format

- `npm run lint` (ESLint, auto-fix enabled)
- `npm run format` (Prettier on `src/`)

### Unit tests (Vitest)

- `npm run test:unit`

Run a single test file:

- `npm run test:unit -- --run src/components/__tests__/HelloWorld.spec.js`

Run tests matching a name:

- `npm run test:unit -- -t "renders properly"`

### E2E tests (Cypress)

- `npm run test:e2e:dev` (opens Cypress with dev server)
- `npm run test:e2e` (build + preview + `cypress run --e2e`)

Run a single E2E spec (dev server already running on 4173):

- `npx cypress run --e2e --spec cypress/e2e/example.cy.js`

Open a single E2E spec in interactive mode:

- `npx cypress open --e2e --spec cypress/e2e/example.cy.js`

### API mock data

- The README mentions `json-server JSON/pcompetencies.json` for local data.

## Code style and conventions

### Language and framework

- JavaScript (ES modules). No TypeScript in this repo.
- Vue 3 Options API with `<script>` blocks, not `<script setup>`.
- Components are `.vue` files with `<script>`, `<template>`, `<style>`.

### Formatting (Prettier)

- Prettier config: `semi: false`, `singleQuote: true`, `printWidth: 100`,
  `tabWidth: 2`, `trailingComma: none`.
- Prefer Prettier formatting over manual alignment.

### ESLint

- Uses `plugin:vue/vue3-essential`, `eslint:recommended`, and
  `@vue/eslint-config-prettier/skip-formatting`.
- Cypress specs under `cypress/` use `plugin:cypress/recommended`.

### Imports

- Use ESM `import`/`export`.
- Third-party imports first, then local imports.
- Use relative paths (no aliases configured).
- Keep `.vue` imports explicit (e.g., `../views/HomeView.vue`).

### Naming

- Components: `PascalCase` filenames and component names.
- Stores: `useXStore` (Pinia), file names in `camelCase` or `lowercase`.
- Variables/functions: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` for module-level constants.
- CSS classes: match Bootstrap conventions or `kebab-case` for custom classes.

### Vue patterns

- Map Pinia state/actions using `mapState` and `mapActions`.
- Prefer computed properties for derived data (see `HomeView.vue`).
- Use `props: true` in routes when passing path params.
- Use `v-model` for form bindings.

### API layer

- `src/repositories/api.js` is the single source of API calls.
- Axios instance adds the JWT token in a request interceptor.
- 401 responses redirect to `/login` and clear `localStorage` token.
- When adding endpoints, keep them grouped by domain like existing sections.

### Error handling

- Wrap async actions in `try/catch` and surface errors through
  `useDataStore().addMessage('error', error)`.
- For validation errors (422), many actions skip global error messages; follow
  that pattern where appropriate.
- Return `error` from actions when callers need to inspect it.

### State management

- `src/stores/data.js` is the main store; use it instead of ad-hoc global state.
- Avoid writing to `localStorage` outside the store unless required for auth.
- Keep state objects initialized to empty objects/arrays, not `null`.

### Routing

- Routes live in `src/router/index.js`.
- Auth guard uses `to.meta.requiresAuth` and `localStorage.token`.
- When adding routes, set `meta.requiresAuth` consistently.

### Templates and HTML

- Use Bootstrap classes for layout and components.
- Use Vue directives consistently (`v-if`, `v-for`, `:key`).
- Avoid complex inline JS; move logic to computed or methods.

### Tests

- Unit tests live under `src/**/__tests__` and use Vitest + @vue/test-utils.
- Cypress specs live under `cypress/e2e/` with `.cy.js` or `.spec.js`.

## Cursor/Copilot rules

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`
  files were found in this repository.

## Notes for agents

- Follow existing code style even when inconsistent with the Prettier config.
- Do not introduce TypeScript or new build tooling without prior discussion.
- Prefer small, focused changes and reuse existing store/actions when possible.
