# Contributing to Squad-AI-Infra

Obrigado por contribuir! Este guia explica como participar do projeto.

---

## Código de Conduta

- Seja respeitoso e construtivo
- Código e documentação em inglês (agentes podem manter pt-BR internamente)
- Issues e PRs bem documentados

---

## Como Contribuir

### 1. Fork e Setup

```bash
git clone https://github.com/Wagner85/squad-ai-infra.git
cd squad-ai-infra
git checkout -b feature/minha-contribuicao
```

### 2. Testes Locais

```bash
# Inicie o OpenCode
opencode .

# Execute a squad de infra
/squad-ai run infra "Teste básico de pipeline"
```

### 3. Commit e Pull Request

```bash
git add .
git commit -m "feat: descreva a mudança claramente"
git push origin feature/minha-contribuicao
```

Abra o PR com:
- **Título**: `feat:`, `fix:`, `docs:`, `refactor:` seguido da descrição
- **Corpo**: O que mudou, por quê, como testar

---

## Como Criar um Novo Agente

1. Crie o arquivo em `squads/infra/agents/<nome>.agent.md`
2. Siga o formato YAML frontmatter:

```markdown
---
author: Seu Nome
description: Descrição curta e clara do agente
mode: subagent
permission:
  edit: allow
  bash: allow
  read: allow
  write: allow
---

# Nome do Agente

[persona e responsabilidades]

## Responsabilidades
- ...

## Anti-Patterns
- NÃO faça ...
```

3. Adicione ao `squads/infra/squad.yaml` na lista `agents:`
4. Adicione uma linha ao `squads/infra/squad-party.csv`
5. Adicione ao `opencode.json` na seção `"agent":`
6. Documente no `README.md` (tabela de agentes)
7. Atualize `memories.md` com a nova contagem

---

## Como Adicionar uma Best-Practice

1. Crie o arquivo em `_squad-ai/core/best-practices/<nome>.md`
2. Inclua obrigatoriamente o YAML frontmatter:

```markdown
---
name: Nome da Best Practice
type: best-practice
tags: [tag1, tag2, tag3]
---

# Título

[conteúdo com pelo menos 150 linhas, exemplos reais, checklists]
```

3. Adicione a linha correspondente no `_squad-ai/core/CATALOG.md` (seção Best Practices)
4. Use exemplos reais: comandos `kubectl`, configs `yaml`, queries `promql`

---

## Como Criar uma Nova Squad

```bash
# Via interface interativa
/squad-ai create "Descrição da nova squad"

# Ou manualmente: crie pasta squads/<nome>/ com:
# - squad.yaml
# - squad-party.csv
# - pipeline/pipeline.yaml
# - pipeline/steps/*.md
# - agents/*.agent.md
# - _memory/memories.md
```

---

## Como Adicionar uma Skill

1. Crie `_squad-ai/core/skills/<nome>/SKILL.md`
2. Adicione no `_squad-ai/core/CATALOG.md`
3. Se for tipo `mcp`: configure em `.claude/settings.local.json`

---

## Revisão

Todos os PRs passam por:
- Revisão de conteúdo (tech lead)
- Verificação de sanitização (sem dados sensíveis)
- Validação de frontmatter e estrutura de arquivo