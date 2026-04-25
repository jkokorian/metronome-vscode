# Metronome for VS Code

A visual and audible metronome that reads BPM from markdown headings. Designed for musicians who maintain setlists or song notes in markdown files — place your cursor under a song heading and the metronome automatically picks up the tempo.

## How it works

The extension scans for `##` headings with a BPM annotation in parentheses:

```markdown
## Gavin DeGraw - I Don't Wanna Be (155bpm)
Capo 3, start with intro riff
...

## Goldband - Noodgeval
No tempo specified — metronome stops
...

## Kings of Leon - Use Somebody (135bpm*)
Asterisk indicates approximate tempo
```

When the metronome is active, moving your cursor between songs automatically updates the tempo. Headings without a BPM annotation will stop the metronome.

## Usage

- **Toggle**: `Ctrl+Shift+M` (macOS: `Cmd+Shift+M`), or run `Metronome: Toggle` from the command palette
- The status bar shows the current BPM (or `--` when no tempo is detected)
- A webview panel opens beside your editor with a visual beat indicator and volume control

## Project structure

```
src/
  extension.ts      — Extension entry point, cursor tracking, VS Code integration
  bpmParser.ts      — BPM parsing logic (framework-independent)
  metronomePanel.ts — Webview panel with visual/audio metronome (Web Audio API)
test/
  bpmParser.test.ts — Unit tests for BPM parsing
```

## Tech stack

- **TypeScript** — all source code
- **VS Code Extension API** — activation, commands, status bar, webview panels
- **Web Audio API** — click sound generation in the webview
- **Jest + ts-jest** — unit testing

## Development

```bash
npm install          # Install dependencies
npm run compile      # Build once
npm run watch        # Build on file changes
npm test             # Run tests
```

Press `F5` in VS Code to launch a development Extension Host with the extension loaded.

## Packaging

```bash
npm run package      # Creates a .vsix file (requires vsce)
```
