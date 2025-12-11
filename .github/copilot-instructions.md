# Copilot Instructions for homeinon-frontend

## Project Overview
This is a frontend web project with a simple structure, primarily using HTML and JavaScript. The main entry points are `index.html` and `script.js`. Assets and models are stored in the `assets/` and `public/models/` directories, respectively.

## Architecture & Data Flow
- **Static Site**: The project is structured as a static site. All logic is client-side, with no backend code present.
- **Model Integration**: AI models (e.g., webllm, phi-3-mini) are stored under `public/models/webllm/`. These are likely loaded and used in-browser for inference.
- **Assets**: Images and other resources are in `assets/`.

## Developer Workflows
- **Serving Locally**: Use a static file server to preview the site. Example (Node.js):
  ```powershell
  npx serve .
  ```
  Or use any static server that supports HTML/JS.
- **No Build Step**: There is no build system or bundler. All files are loaded directly.
- **No Tests**: No test framework or test files are present.

## Conventions & Patterns
- **Direct File References**: Scripts and assets are referenced directly in `index.html`.
- **Model Files**: Model configs and tokenizers are JSON files under `public/models/webllm/`.
- **No Frameworks**: No React, Vue, or other frameworks detected.
- **Minimal Dependencies**: Only basic dependencies in `package.json` (if any).

## Integration Points
- **AI Model Usage**: If integrating new models, place them under `public/models/webllm/` and update references in `script.js`.
- **Assets**: Add new images/resources to `assets/`.

## Example Patterns
- To load a model in JS:
  ```js
  fetch('public/models/webllm/phi-3-mini-4k-instruct-q4f32_1-mlc/model.json')
    .then(res => res.json())
    .then(model => {/* use model */});
  ```
- To add a new asset:
  - Place it in `assets/`
  - Reference it in `index.html` or `script.js`

## Enabling Claude Haiku 4.5
- To enable "Claude Haiku 4.5 for all clients", update your model loading logic in `script.js` to include the Claude Haiku 4.5 model files in `public/models/webllm/`.
- Ensure the model config, model, and tokenizer files are present and referenced correctly.

---
For questions or unclear conventions, ask for clarification or review `index.html` and `script.js` for current patterns.
