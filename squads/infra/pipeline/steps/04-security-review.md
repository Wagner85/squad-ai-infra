<!-- Author: Wagner Oliveira -->

# Step 04 — Security Review

## Agent
Cyber Security Engineer

## Input
- Execution output

## Process
1. Review infrastructure for security issues
2. Verify IAM policies and access controls
3. Check compliance requirements

## Output
- `squads/infra/output/security-review.md`

## Veto Conditions

Rejeitar e refazer se QUALQUER condição for verdadeira:
1. Vulnerabilidades de segurança identificadas não foram documentadas
2. Verificação de compliance (LGPD, SOC2, ISO) não foi realizada
3. Políticas IAM/ACL não foram revisadas

## Execution
- mode: subagent
- model_tier: powerful