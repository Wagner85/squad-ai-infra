<!-- Author: Wagner Oliveira -->

# Step 03 — Execution

## Agent
DevOps Engineer

## Input
- Planning document

## Process
1. Execute infrastructure tasks according to plan
2. Implement CI/CD pipelines
3. Configure monitoring and alerting

## Output
- `squads/infra/output/execution.md`

## Veto Conditions

Rejeitar e refazer se QUALQUER condição for verdadeira:
1. Alterações executadas sem plano de rollback documentado
2. Nenhuma validação pós-execução foi realizada
3. Comandos destrutivos executados sem aprovação explícita

## Execution
- mode: subagent
- model_tier: powerful