# lanter

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@lanter/lanter)](https://www.npmjs.com/package/@lanter/lanter)

CLI tool that uses agentic AI to convert codebases between programming languages.

> **Early stage** — This project is under active development. Expect breaking changes.

## Install

```bash
npm install -g @lanter/lanter
```

## Getting started

### 1. Configure a provider

Lanter supports three AI providers: **OpenAI**, **Anthropic**, and **Ollama**.

Set your provider, base URL, API key, and model:

```bash
lanter config set provider ollama
lanter config set ollama.baseUrl https://ollama.com/v1/
lanter config set ollama.apiKey gw_XXXXXX
lanter config set model glm-5
```

### 3. Evaluate a codebase

Before converting, run an evaluation to assess feasibility, risks, and effort:

```bash
lanter evaluate -i ./my-project -d python
```

| Flag | Description |
|------|-------------|
| `-i, --input <dir>` | Source code directory (required) |
| `-d, --destination <language>` | Target language (required) |

This produces an evaluation report with a verdict, effort estimate, risks, and blockers.

### 4. Run the conversion

Once satisfied with the evaluation, run the actual conversion:

```bash
lanter run -i ./my-project -o ./my-project-python -d python
```

| Flag | Description |
|------|-------------|
| `-i, --input <dir>` | Source code directory (required) |
| `-o, --output <dir>` | Output directory for converted code (required) |
| `-d, --destination <language>` | Target language (required) |

## Configuration

Configuration is stored at `~/.lanter/config.json`. You can manage it with the CLI:

```bash
lanter config set <key> <value>   # Set a value
lanter config get <key>           # Get a value
lanter config list                # Show all settings
lanter config model               # Interactive model picker
```

Config precedence (highest to lowest):
1. CLI flags (`--provider`, `--model`)
2. Environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`, etc.)
3. Config file (`~/.lanter/config.json`)
4. Defaults (OpenAI, `gpt-4.1`)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
