# New Note Title

Obsidian plugin that controls the filename given to new markdown notes.

## Features

- Set a custom default filename for new notes (instead of Obsidian's built-in "Untitled")
- Optionally generate a UUID as the filename for every new note
- Limit behaviour to specific folders — subfolders included; leave blank to apply everywhere
- Collision-safe: appends a number if a file with that name already exists

## Settings

| Setting | Description |
|---|---|
| **File name pattern** | Pattern for new note filenames. Supports `{{date}}` and `{{uuid}}` tokens. Defaults to `Untitled`. |
| **Date format** | [Moment.js format](https://momentjs.com/docs/#/displaying/format/) used for `{{date}}`. Defaults to `YYYY-MM-DD`. |
| **Watched folders** | Only rename notes in these folders (includes subfolders). Leave empty to apply everywhere. |

### Tokens

| Token | Output |
|---|---|
| `{{date}}` | Current date using the configured date format |
| `{{uuid}}` | Random UUID v4 |

## Disclosures

This plugin reads file and folder information from your vault. Here's what it accesses and why:

- **Your note filenames** - read via Obsidian's API when creating a new note to avoid duplicate filenames. For example, if `My Note` already exists, the new note becomes `My Note 1`.
- **Your folder names** - read via Obsidian's API to power the folder picker in settings, so you can select which folders the plugin applies to.

No data leaves your device. Everything stays local within Obsidian.

## Credits

Forked from [obsidian-uuid-title](https://github.com/TheLoneWanderer4/obsidian-uuid-title) by TheLoneWanderer4.

UUID generation uses the [uuid](https://github.com/uuidjs/uuid) package (MIT).
