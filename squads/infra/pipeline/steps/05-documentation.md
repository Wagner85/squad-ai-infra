<!-- Author: Wagner Oliveira -->

# Step 05 — Documentation

## Agent
Docs Specialist

## Input
- Execution and Security Review outputs

## Process
1. Create runbooks for all procedures
2. Document architecture decisions
3. Update infrastructure documentation

## Output
- `squads/infra/output/documentation.md`

## Veto Conditions

Rejeitar e refazer se QUALQUER condição for verdadeira:
1. Runbook para procedures críticas está ausente
2. Documentação não inclui pré-requisitos ou steps de validação
3. Decisões arquiteturais não foram documentadas com rationale

## Execution
- mode: subagent
- model_tier: fast