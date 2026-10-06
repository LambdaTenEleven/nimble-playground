# Nimble Playground

A small local workspace for experimenting with Nimble decision models through Ollama. Write a question, define its answers, and inspect the probabilities. Save useful prompts and move them between computers as JSON.

![Nimble Playground](docs/screenshot.png)

## Start locally

You need **Node.js 22.12+ (22 or 24 LTS)**, **Ollama 0.35+**, and the **Nimble** model. Use a current desktop browser.

1. [Install or update Ollama](https://ollama.com/download), then open the Ollama desktop app. With a CLI-only installation, start `ollama serve` in a separate terminal.
2. Download the model:

   ```sh
   ollama pull nimble
   ```

3. In this repository, install the locked dependencies and start the frontend:

   ```sh
   npm ci
   npm run dev
   ```

4. Open **http://127.0.0.1:5173**. Choose an example and select **Run decision**.

The first decision may take longer while the model loads. The app detects a missing model, an outdated Ollama, or an unreachable service, and offers setup instructions. It cannot install software or launch Ollama from the browser.

## What you can do

- **Choose one:** classify text using named answers and optional descriptions.
- **Yes / no:** estimate the probability that a statement is true (`noul`).
- **Score:** evaluate an ordered scale starting at zero. The weighted score and the most likely level are shown separately.
- Inspect answer probabilities, request time, token usage, and response JSON.
- Save, rename, update, duplicate, load, or delete named prompts in the browser.
- Import and export prompt libraries as versioned JSON files.
- Keep Nimble loaded for 5 or 30 minutes, unload after a run, or select **Unload model** to release its memory immediately. This does not delete the model.
- Switch between light and dark themes. The layout adapts to narrow screens.

This is a decision playground, not a chat interface. It evaluates one named question per run. Results are model estimates and can be wrong.

Text requests are limited to 64 KiB by Ollama. The app checks the encoded size of the full request before sending; a saved draft may be larger and need shortening before it can run.

## Where prompts live

Select **Save** in the editor to save the input text, question, answer format, and answer definitions. Incomplete drafts are allowed. To update or rename a prompt, load it and open **Save** again; **Save a copy** needs a new name.

The library is stored in `localStorage`, scoped to the browser and origin. `localhost:5173`, `127.0.0.1:5173`, and `127.0.0.1:4173` each have separate libraries. Clearing browser data removes saved prompts. Unsaved editor changes are not restored after a reload.

Use **Export** for a portable backup, then **Download JSON** or **Copy JSON**. The file contains your input text, so review it before sharing. **Import** adds prompts with fresh IDs and renames duplicate names; it never replaces existing prompts. Files are validated before importing, with limits of 100 prompts and 2 MB for the entire library. Unsupported formats or versions are rejected. A sample file is included in [examples/prompts.json](examples/prompts.json).

If storage is full or blocked, changes remain in the current tab and the app asks you to export them. A corrupt existing library is preserved rather than overwritten.

## Stack and architecture

| Part                    | Technology                                    |
| ----------------------- | --------------------------------------------- |
| Interface               | React 19 + TypeScript                         |
| Build and local serving | Vite                                          |
| Styling                 | Tailwind CSS 4 + daisyUI 5                    |
| State and storage       | React hooks + browser localStorage            |
| Ollama client           | Native fetch + AbortController                |
| Verification            | Vitest, Testing Library, TypeScript, Prettier |

React and React DOM are the only production JavaScript dependencies. daisyUI supplies CSS; it does not add a JavaScript component runtime. There is no router, state-management package, model SDK, database, Python service, or custom backend.

```text
Browser frontend  ──direct HTTP──>  Ollama on 127.0.0.1:11434  ──>  Nimble
       │
       └── localStorage / JSON prompt files
```

Vite serves the frontend files during development. Ollama handles inference. The frontend calls `/api/version`, `/api/tags`, `/api/ps`, `/v1/systemone`, and `/api/generate` directly. It only selects installed local `nimble` tags; cloud models are excluded. No prompt requests pass through Vite, and there is no proxy configuration.

- `src/domain.ts`: prompt types, examples, request validation, decision serialization and response interpretation.
- `src/ollama.ts`: typed boundary around the Ollama HTTP API, error handling, cancellation and timeouts.
- `src/storage.ts`: validated prompt files and browser persistence.
- `src/useConnection.ts`: service discovery and status refresh while the page is visible.
- `src/components/`: editor, library, results, setup guide and accessible dialogs.
- `src/App.tsx`: workspace state and user workflows.

Design follows the [official daisyUI UI design skill](https://daisyui.com/codex/ui-design-skill/): semantic theme colors, native form controls and dialogs, responsive layouts, and one primary action. Fonts and icons are bundled/local; the app has no analytics or external runtime assets.

## Development

```sh
npm run check         # TypeScript checks
npm test              # Protocol, storage, HTTP boundary, and UI workflow tests
npm run format:check  # Formatting
npm run format        # Format source
npm run build         # Type-check and build static assets into dist/
npm run preview       # Inspect the build at http://127.0.0.1:4173
```

Tests mock Ollama and do not need a GPU or model download. CI runs formatting, tests, and the production build on Linux and Windows. CI is ready for a future GitHub push; it does not publish a website.

The build produces ordinary static files. Serve them over local HTTP; opening `dist/index.html` as a `file://` URL is unsupported. Keep the frontend local so it can reach the user's Ollama installation. Vite's preview command is intended for checking a build.

## Troubleshooting

- **Cannot reach Ollama:** open the Ollama app or run `ollama serve`. The expected address is `http://127.0.0.1:11434`. The browser cannot distinguish a stopped service from a missing installation or blocked connection.
- **Nimble missing:** run `ollama pull nimble`, wait for completion, then select **Refresh**.
- **Decision endpoint missing:** update Ollama to 0.35 or newer. Check `ollama --version` and restart the app after updating.
- **Browser blocks the request:** allow local-network access when asked. Use the localhost/loopback URLs above. If you customized `OLLAMA_ORIGINS`, include the exact frontend origin and restart Ollama. Do not expose Ollama to your network just to use this app.
- **Port 5173 already used:** stop the other frontend process, or deliberately change the port in the `dev` script. The strict port setting prevents accidentally opening a different prompt-storage origin.
- **Slow first run or memory pressure:** allow time for loading, close other GPU workloads, or unload Nimble. The app allows 3 minutes per decision. Cancelling aborts the browser request; Ollama may take a moment to stop processing.
- **Export did not appear:** check the browser's download list and download permissions. Some embedded browsers do not handle file downloads. Use **Copy JSON**, paste it into a text editor, and save it as a `.json` file. The visible JSON remains selectable even if clipboard access is blocked.

## References and license

- [Ollama decision API announcement and protocol examples](https://ollama.com/blog/ollama-now-supports-jev-style-decision-models)
- [Nimble model on Ollama](https://ollama.com/library/nimble)
- [Ollama API reference](https://docs.ollama.com/api)
- [daisyUI](https://daisyui.com/)

MIT license for this application; see [LICENSE](LICENSE). Ollama, Nimble and dependencies retain their own licenses. This is an independent playground, not an official Ollama or Bespoke Labs application.
