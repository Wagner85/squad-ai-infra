# Squad-AI — Instruções para Claude Code

> Este arquivo garante compatibilidade com **Claude Code** (`claude` CLI).
> A lógica completa do sistema está em `AGENTS.md` — leia-o integralmente.

## Inicialização

Ao ser ativado neste projeto, leia imediatamente:

1. `AGENTS.md` — instruções completas do sistema squad-ai
2. `_squad-ai/_memory/company.md` — contexto da empresa
3. `_squad-ai/_memory/preferences.md` — preferências do usuário

Se `company.md` contiver `<!-- NOT CONFIGURED -->`, inicie o fluxo de onboarding descrito em `AGENTS.md`.

## Comando Principal

```
/squad-ai
```

Rota para o menu principal. Todas as ações estão documentadas em `AGENTS.md`.

## Contexto do Projeto

- **Stack**: Multi-agent orchestration para times de infraestrutura
- **Motor**: `_squad-ai/core/runner.pipeline.md`
- **Agentes**: `squads/infra/agents/*.agent.md` (18 agentes)
- **Pipeline**: `squads/infra/pipeline/pipeline.yaml` (6 estágios)
- **Skills**: `_squad-ai/core/best-practices/` + `_squad-ai/core/prompts/`

## Regras Críticas

- NUNCA pule o onboarding se `company.md` não estiver configurado
- SEMPRE carregue o contexto da empresa antes de executar qualquer squad
- SEMPRE apresente checkpoints ao usuário — nunca os pule
- Ao trocar de persona (execução inline), anuncie claramente qual agente está falando
