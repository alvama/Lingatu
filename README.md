[Español](README.es.md)

# Lingatu

Your bookmarks, in a file you own — no account, no cloud, no server.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.9.0-blue.svg)](https://github.com/alvama/Lingatu/releases/tag/v1.9.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/kljfmjpiflhpedkbcldmkomhmepnimdl.svg)](https://chromewebstore.google.com/detail/lingatu-connector/kljfmjpiflhpedkbcldmkomhmepnimdl)

![Importing bookmarks into Lingatu by dragging a browser export file onto the page](docs/img/import.gif)

### [**Try the live demo →**](https://nlevia.org/lingatu/app/)

No install, no sign-up — it just opens.

## Why Lingatu

- **One HTML file, nothing else.** No server, no build step, no framework, no external dependency. Open `lingatu.html` and it works.
- **No account, no sign-up.** Your links live in your browser's `localStorage`, not on anyone's server.
- **Works offline**, except for favicon icons (see [Privacy](#privacy) below).
- **Import from any browser**: drag the bookmarks HTML file any browser exports straight onto the page.
- **MIT licensed.**

## Features

- Full link management: create, edit, delete, duplicate, manual drag-and-drop reordering, automatic favicons.
- Categories and tags with custom colors and icons, manually reordered.
- Search operators — `cat:`, `#tag`, `site:`, `is:active`/`is:inactive`, `"exact phrase"`, `-` to exclude.
- Saved views: a reusable combination of filters, or a specific hand-picked list of links.
- Per-link notes, written and read back rendered in Markdown.
- Cleanup panel that flags duplicates, broken URLs, untagged links, and more — without changing anything.
- Command palette (`Ctrl+K` / `Cmd+K`) across actions, links, categories, views, and tags.
- Multi-select with bulk actions, dark mode, and keyboard shortcuts.

Full functional and technical detail in [`docs/ESPECIFICACIONES.md`](docs/ESPECIFICACIONES.md) (Spanish).

![Comfortable view with three categories, showing links with favicons, descriptions, and tags](docs/img/vista-comoda.png)

![Cleanup panel flagging a category with a single link, with a "View these" shortcut into the filtered results](docs/img/panel-limpieza.png)

## Quick start

1. Download [`lingatu.html`](lingatu.html).
2. Open it in your browser (double-click it, or drag it into a tab).
3. To bring in your existing bookmarks, export them from your browser as HTML and drag that file onto the page.

## Browser extension

The optional **[Lingatu Connector](https://chromewebstore.google.com/detail/lingatu-connector/kljfmjpiflhpedkbcldmkomhmepnimdl)** extension adds a one-click "save this tab" button: it captures the active tab's URL, title, and description, checks whether it's already in Lingatu, and opens the add-link form pre-filled if it isn't.

Because `lingatu.html` runs on `file://`, the extension needs one extra permission after installing it:

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Open the **Lingatu Connector** card → **Details**.
3. Enable **"Allow access to file URLs"**.

Without this step, the extension can't detect or open your `lingatu.html`.

## Privacy

- Your data lives in your browser's `localStorage`. Nothing is sent to any server Lingatu controls.
- **One declared exception**: favicons are fetched from `google.com/s2/favicons`, so the domain of every link you've saved is sent to Google on each page load. Without a connection, links still display, just without an icon.

## FAQ

**Where is my data stored?**
In your browser's `localStorage`, tied to the browser profile where you opened `lingatu.html`.

**What happens if I clear my browser data?**
You lose your collection unless you've exported a backup file first. Lingatu warns you before you go too long without exporting, but the only copy that survives a browser data wipe is one you've exported yourself.

**Does it work without an internet connection?**
Yes — everything works offline except favicon icons, which need a connection to load.

**Can I use it on more than one computer?**
There's no built-in sync. Export a JSON file from one machine and import it on the other to move your collection across.

## Contributing

Contributions are welcome. The project follows a strict architecture constraint — single self-contained HTML file, no build step, no dependencies, ES5-style syntax — documented in full in [`docs/ESPECIFICACIONES.md`](docs/ESPECIFICACIONES.md). Read it before touching `lingatu.html`.

## License

[MIT](LICENSE) © 2026 A. Vazquez ([NLevia.org](https://www.nlevia.org))
