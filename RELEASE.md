# Release Guide

This repo uses GitHub Actions to publish to npm when a `vX.Y.Z` tag is pushed.

## One-time setup

1. Create a granular npm token with publish rights.
2. Add it to GitHub repo secrets as `NPM_TOKEN`.

## Release steps

1. Make sure everything is committed and tests pass.
2. Bump version and create a git tag:

```bash
npm run release:patch
# or
npm run release:minor
npm run release:major
```

3. Push commit + tag:

```bash
git push origin main --tags
```

## What happens next

GitHub Actions will:
- install dependencies
- run tests
- verify the tag matches `package.json`
- publish the package to npm

If the tag does not match `package.json` version, the release fails safely.
