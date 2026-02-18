# Contributing to lanter

## Prerequisites

- Node.js 18 or later
- npm

## Setup

```bash
git clone https://github.com/lanter-dev/lanter.git
cd lanter
npm install
```

## Development

Run linting:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

## Commit conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to drive automated versioning and releases.

Every commit message must follow this format:

```
<type>: <description>

[optional body]
```

Common types:

- `feat:` — new feature (bumps minor version)
- `fix:` — bug fix (bumps patch version)
- `docs:` — documentation only
- `chore:` — maintenance, dependencies
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests

A commit with `BREAKING CHANGE:` in the body (or `!` after the type) triggers a major version bump.

## Pull requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure `npm run lint` and `npm test` pass
4. Submit a pull request

Keep PRs focused — one feature or fix per PR.
