# Contributing to StaticDesk

Thanks for your interest in StaticDesk!

## Getting started

1. Fork and clone the repository.
2. Install dependencies with `npm install` (Node.js 22+, npm 10).
3. Start the app with `npm run dev`.

## Before opening a pull request

- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
- Add or update tests for the behavior you change.
- If you change a published package (`packages/*`), add a changeset with `npm run changeset`.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
  (`feat:`, `fix:`, `docs:`, `chore:`…).

## Reporting bugs and requesting features

Open an issue using the matching template. For questions, use GitHub Discussions.

## License

By contributing, you agree that your contributions are licensed under the
[AGPL-3.0](LICENSE), except for contributions to `packages/widget` and
`packages/integrations/*`, which are licensed under the MIT license (see the
`LICENSE` file of each package).
