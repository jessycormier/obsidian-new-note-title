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
| **Default filename** | Name used for new notes. Defaults to `Untitled`. |
| **Use UUID** | When enabled, ignores the default filename and uses a UUID v4 instead. |
| **Watched folders** | One folder per line. Only new notes created in these folders (or their subfolders) are renamed. Empty = apply everywhere. |

## Credits

Forked from [obsidian-uuid-title](https://github.com/TheLoneWanderer4/obsidian-uuid-title) by TheLoneWanderer4.
