# Setup

Everything you need to run the project locally. There is little to configure today; this file is where setup steps will grow (environment variables, packaging, CI).

## Requirements

- Node.js 20 or newer and npm
- A Chromium-based browser for PDF export: Playwright's bundled Chromium, or Google Chrome installed on the machine

## Install and run

```bash
npm install
npx playwright install chromium   # optional if Google Chrome is installed
npm run dev
```

Open http://localhost:5173 (the next free port is used if 5173 is taken; the terminal prints the address). The playground autosaves your template in the browser's local storage.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Playground editor plus the dev server API (`/api/pdf`, `/api/custom-components`) |
| `npm run build` | Production build into `dist/` |
| `npm start` | Serves the production build and API (`NODE_ENV=production`) |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

## Configuration

None required. The server reads `PORT` (default 5173). Saved custom components are written to `./custom-components/`.

## Troubleshooting

- **PDF export fails:** run `npx playwright install chromium`, or install Google Chrome. The error from the browser launch is shown in the terminal.
- **Port already in use:** set `PORT=5180 npm run dev`.
- **Start over:** clear the site's local storage in the browser to drop the autosaved template.

## Security note

The dev server has no authentication. Do not expose it to a network you do not trust. See the README.
