---
name: squad-ai-core
description: Core system for managing and running AI agent squads. Use when the user mentions squads, agents, pipelines, squad-ai, or any /squad-ai command.
---

# squad-ai Core

This skill provides the core knowledge about the squad-ai system installed in this project.

## Project Structure
- `_squad-ai/` — Core system (memory, config, core engine, pipeline runner)
- `Agents/` — 18 agent definitions (.agent.md files)
- `squads/` — Squad definitions and pipelines
  - `squads/infra/` — Infra squad (6-stage pipeline, 18 agents)
- `.opencode/` — opencode integration (agents, skills, plugins)

## squad-ai Architecture
- **Architect**: Creates and edits squads
- **Pipeline Runner**: Executes squad pipelines step by step
- **Skills Engine**: Manages skill installations from catalog (945 skills available)
- **Agents**: AI personas with defined roles, expertise, and voice

## Infra Squad Pipeline
1. **Analysis** (SRE) — Analyze infrastructure state and metrics
2. **Planning** (Solution Architect) — Technical planning
3. **Execution** (DevOps Engineer) — Execute tasks
4. **Security Review** (Cyber Security) — Security review
5. **Documentation** (Docs) — Runbooks and docs
6. **Review** (Tech Lead) — Final review

## Available Agents
18 agents available: devops-engineer, sre, network-engineer, cyber-security, tech-lead, solution-architect, project-manager, product-owner, fullstack-dev, data-engineer, ai-automation, docs, l1-support, report-master, jira-reporter, business-exec, git-analyst, obsidian-brain

## Commands
- `/squad-ai` or `/squad-ai menu` — Show main menu
- `/squad-ai create <desc>` — Create a new squad
- `/squad-ai run <name>` — Run a squad's pipeline
- `/squad-ai list` — List all squads
- `/squad-ai edit <name> <changes>` — Edit a squad
- `/squad-ai delete <name>` — Delete a squad
- `/squad-ai skills` — Skills management
- `/squad-ai settings` — View/edit preferences
- `/squad-ai show-company` — Show company profile
