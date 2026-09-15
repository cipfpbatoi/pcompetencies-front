# Programacions

Per a provar l'aplicació (recorda que està en desenvolupament):
- descarrega el repositori
- instal·la les dependències: `npm i`
- si no tens instal·lat json-server instal·La-ho amb: `npm i -D json-server`
- executa `json-server JSON/pcompetencies.json`
- executa `npm run dev`
- obri la pàgina en el navegador

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Cypress](https://www.cypress.io/)

```sh
npm run test:e2e:dev
```

This runs the end-to-end tests against the Vite development server.
It is much faster than the production build.

But it's still recommended to test the production build with `test:e2e` before deploying (e.g. in CI environments):

```sh
npm run build
npm run test:e2e
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Flux intern PCC Intermodular (actualitzat)

- **Part 1 (distribució de RA de projecte):** si hi ha projecte en 1r i 2n, cada RA base es distribueix en `1r`, `2n` o `1r+2n`; si només hi ha projecte en un curs, la vista és informativa.
- **Part 2 (participants i orientacions):** es gestionen mòduls participants per curs i orientacions úniques per `moduleCode + courseLevel`.
- En curs objectiu `1r` només es poden seleccionar mòduls de `1r`; en curs objectiu `2n` es poden seleccionar mòduls de `1r` i `2n`; els mòduls de projecte no són elegibles com a suport.
- Les orientacions guarden `supportLearningResultIds[]`, `evaluationCriteriaIds[]` i `supportActivitiesGuidance` obligatori.
- Endpoints utilitzats:
  - `POST /pcc/{id}/intermodular-project-guide/distributions`
  - `DELETE /pcc/{id}/intermodular-project-guide/distributions/{learningResultId}/{courseLevel}`
  - `POST /pcc/{id}/intermodular-project-guide/participants`
  - `DELETE /pcc/{id}/intermodular-project-guide/participants/{moduleCode}/{courseLevel}`
  - `POST /pcc/{id}/intermodular-project-guide/orientations`
  - `DELETE /pcc/{id}/intermodular-project-guide/orientations/{moduleCode}/{courseLevel}`
