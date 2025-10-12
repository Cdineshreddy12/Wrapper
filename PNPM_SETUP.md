# PNPM Setup Guide

This project requires **pnpm** as the package manager. This ensures consistent dependency resolution and faster installs across the team.

## Why PNPM?

- **Faster installs**: PNPM uses hard links and a global store, making installs much faster
- **Disk space efficient**: Shared dependencies across projects
- **Strict dependency resolution**: Prevents phantom dependencies
- **Better monorepo support**: Native workspace support

## Installation

### Install PNPM globally

```bash
# Using npm
npm install -g pnpm

# Using yarn
yarn global add pnpm

# Using corepack (Node 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Verify installation

```bash
pnpm --version
```

## Usage

### Install dependencies

```bash
# Install all dependencies (root + workspaces)
pnpm install

# Install dependencies for specific workspace
pnpm --filter frontend install
pnpm --filter backend install
```

### Development

```bash
# Run all services
pnpm dev

# Run specific service
pnpm dev:frontend
pnpm dev:backend
```

### Adding dependencies

```bash
# Add to root
pnpm add <package>

# Add to specific workspace
pnpm --filter frontend add <package>
pnpm --filter backend add <package>

# Add dev dependency
pnpm --filter frontend add -D <package>
```

## Enforcement

The project includes automatic enforcement scripts that will:

1. **Check package manager**: Prevents using npm/yarn
2. **Verify pnpm installation**: Ensures pnpm is available globally
3. **Exit with error**: If wrong package manager is detected

### Error messages

If you see these errors, you need to use pnpm:

```
❌ Please use pnpm instead of npm
❌ Please use pnpm instead of yarn
❌ pnpm is not installed globally
```

## Troubleshooting

### Clear cache and reinstall

```bash
pnpm store prune
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
pnpm install
```

### Update pnpm

```bash
pnpm add -g pnpm@latest
```

## Team Setup

Make sure all team members:

1. Install pnpm globally
2. Use `pnpm install` instead of `npm install` or `yarn install`
3. Use `pnpm` commands for all package management

## VS Code Integration

Install the "pnpm" extension for better IDE support.
