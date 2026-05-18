<!-- Author: Wagner Oliveira -->

# Step 01 — Analysis

## Agent
SRE Engineer

## Input
[Provided by user at runtime]

## Process
1. Analyze the current infrastructure state
2. Identify key metrics and monitoring requirements
3. Document current observability gaps

## Output
- `squads/infra/output/analysis.md`

## Veto Conditions

Rejeitar e refazer se QUALQUER condição for verdadeira:
1. Output não contém métricas ou dados concretos do ambiente analisado
2. Nenhum gap de observabilidade foi identificado
3. Análise não inclui recomendações acionáveis

## Execution
- mode: subagent
- model_tier: powerful