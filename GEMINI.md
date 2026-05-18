# Squad-AI — Instruções para Gemini CLI / Antigravity

> Este arquivo garante compatibilidade com **Gemini CLI** e **Antigravity**.
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

## Stack de Modelos Preferida

- Principal: `gemini-2.0-flash` (velocidade + custo)
- Complexo: `gemini-2.5-pro` (raciocínio, planejamento)

## Contexto do Projeto

- **Stack**: Multi-agent orchestration para infraestrutura
- **Motor**: `_squad-ai/core/runner.pipeline.md`
- **Agentes**: `squads/infra/agents/*.agent.md`
- **Pipeline**: `squads/infra/pipeline/pipeline.yaml`

## Regras Críticas

- Use o idioma do usuário (Português Brasileiro por padrão das `preferences.md`)
- Outputs sempre em Markdown com tabelas quando estrutural
- Nunca pule checkpoints do pipeline
