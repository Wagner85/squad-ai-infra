# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-17

### Security
- Removidas todas as referências corporativas sensíveis de 19 arquivos de agente (`.agent.md`)
- Substituídas credenciais hardcoded por variáveis de ambiente via `config.env`
- Sanitizados arquivos em `.opencode/agents/` que mantinham referências residuais
- Zerado histórico de commits do GitHub para eliminar metadados sensíveis em commits anteriores

### Added
- Injesão de Chain of Thought (CoT) e proteção anti-alucinação em todos os agentes
- Diretiva de autonomia zero-shot: agentes criam scripts do zero em `scripts/`
- Templates de exemplo para `_memory/company.md.example` e `_memory/preferences.md.example`
- Arquivo `.mailmap` para consolidação de identidade de autor no Git

### Changed
- `opencode.json`: modelo padrão atualizado de `groq/llama-3.1-8b-instant` para `google/gemini-2.0-flash`
- `opencode.json`: adicionadas configurações de permissions para todos os 18 agentes
- `pipeline.yaml`: reescrito com 6 estágios completos, `inputFile`/`outputFile` encadeados e `execution` mode
- `_memory/memories.md`: reescrito com dados corretos (18 agentes, 6 estágios), removido texto corrompido
- `README.md`: corrigida contagem de agentes (19→18), corrigido typo de caractere japonês
- Expandidas 5 best-practices de ~50 linhas para 200+ linhas com exemplos reais:
  - `ci-cd-pipeline.md`: GitHub Actions, ArgoCD, Blue/Green, Canary
  - `kubernetes-operations.md`: RBAC, NetworkPolicy, HPA, ResourceQuota
  - `incident-management.md`: Matriz SEV, escalação, runbook e post-mortem templates
  - `monitoring-observability.md`: PromQL, LogQL, AlertManager, OpenTelemetry
  - `networking.md`: VPC design, Terraform, Security Groups, Zero Trust, VPN

### Fixed
- Inconsistência de contagem de agentes entre README, squad.yaml e memories.md
- Texto corrompido com caracteres cirílicos em `memories.md`
- Best-practices sem YAML frontmatter padronizado

### Removed
- Scripts Python pré-construídos em `scripts/` (substituídos por autonomia zero-shot dos agentes)

---

## [1.0.0] - 2026-05-17

### Added

- Sistema inicial de squads de agentes AI
- Pipeline de 6 estágios: Analysis, Planning, Execution, Security Review, Documentation, Review
- 18 agentes especializados (DevOps, SRE, Network, Security, Tech Lead, etc.)
- Sistema de condições de veto para garantia de qualidade
- Engine de skills com catálogo de assets
- Sistema de memória que aprende com feedback explícito do usuário
- Suporte multi-plataforma (Windows, Linux, macOS)
- Arquitetura de pipeline sequencial com checkpoint final

---

Para versões anteriores, consulte o histórico de commits.