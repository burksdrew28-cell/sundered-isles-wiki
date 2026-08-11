# Publishing the Sundered Isles Wiki

## The normal workflow

1. Edit and save your notes in Obsidian.
2. Double-click `Publish Wiki.cmd` in this folder.
3. Wait for the green `Published` message. GitHub Pages will rebuild the site automatically, usually within a few minutes.

The launcher copies your saved vault into this project's real `content` folder immediately before publishing. This is necessary because GitHub cannot publish a Windows folder link. Do all editing in Obsidian; do not edit the generated `content` copy.

## Make it a button inside Obsidian (optional)

Install the community **Shell commands** plugin in Obsidian, then add a command that runs:

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\carle\OneDrive\Desktop\Sundered Isles Wiki\quartz\publish-wiki.ps1"
```

Assign that command a ribbon icon or hotkey. It will do the same publish action without leaving Obsidian.

## What the button does

It copies your vault, saves all changed wiki files to the GitHub repository in one commit, pulls any GitHub-side changes safely, and pushes to `main`. The existing GitHub Actions workflow then builds and deploys the site.

If the launcher reports a conflict, it stops without deleting notes. Keep the message it shows and resolve the conflict before publishing again.
