# ClipForge

ClipForge is a lightweight, privacy-first clipboard history manager for Windows, built with Electron.

## Features

- Automatically keeps a local history of copied text
- Search clipboard history
- Pin important entries
- Copy an entry back to the clipboard
- Delete individual entries or clear history
- Pause/resume clipboard monitoring
- Global shortcut: `Ctrl + Shift + V`
- Local storage on your computer

## Requirements

- Node.js (LTS recommended)
- npm

## Run locally

```bash
npm install
npm start
```

## Build the Windows installer

```bash
npm run dist
```

The installer is generated in the `release/` directory. The Windows application and installer use the icon at `build/clipforge.ico`.

## Privacy

Clipboard history is stored locally in Electron's application data folder. Do not copy sensitive passwords or private information into clipboard history unless you understand the risks.

## License

MIT
