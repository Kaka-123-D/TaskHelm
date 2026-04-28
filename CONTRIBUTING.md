# Contributing to TaskHelm

Thank you for your interest in contributing to TaskHelm.

## Prerequisites

- Node.js 20 or 22
- pnpm 9+
- Git

## Development Setup

```bash
git clone https://github.com/your-org/taskhelm.git
cd taskhelm
pnpm install
pnpm run build
```

## Project Structure

TaskHelm is a pnpm monorepo managed by Turborepo:

| Package | Description |
|---------|-------------|
| `packages/core` | Domain model, SQLite repositories, workspace utilities |
| `packages/supervisor` | Dev-server pool + crash-recovery helpers |
| `packages/cli` | CLI interface (`taskhelm` command) |
| `packages/web` | Next.js web dashboard |

## Common Commands

```bash
# Typecheck all packages
pnpm run typecheck

# Run all tests
pnpm run test

# Run tests for a specific package
pnpm --filter @taskhelm/core run test

# Build all packages
pnpm run build

# Start web dashboard dev server
pnpm --filter @taskhelm/web run dev
```

## Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write tests first (TDD)
4. Implement the feature
5. Ensure `pnpm run typecheck` and `pnpm run test` pass
6. Commit using conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
7. Open a pull request against `main`

## Code Style

- TypeScript strict mode
- Immutable patterns (no mutation)
- Small, focused files (under 800 lines)
- Functions under 50 lines
- Parameterized SQL queries (no string interpolation)

## Testing

- Unit tests with Vitest
- Minimum 80% coverage target
- Tests live alongside source in `tests/` directories per package
