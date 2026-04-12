Run lint for the current or specified workspace.

## Steps
1. Detect workspace from cwd or argument (web / web-au / superadmin)
2. Run `npm run lint --workspace <name>`
3. Report issues concisely
4. Offer to auto-fix with `--fix` if there are fixable issues
