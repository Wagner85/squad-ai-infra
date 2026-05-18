---
name: Incident Management
type: best-practice
tags: [incident, sre, runbook, post-mortem, oncall, pagerduty, alert]
---

# Incident Management Best Practices

## Ciclo de Vida de um Incidente

```
Detecção → Triagem → Resposta → Mitigação → Resolução → Post-Mortem
    ↓          ↓         ↓           ↓            ↓            ↓
  Alerta   Severidade  Escalação  Workaround    Correção   Aprendizagem
```

---

## Matriz de Severidade (SEV)

| SEV | Impacto | Response Time | Resolution Target | Exemplos |
|-----|---------|:------------:|:-----------------:|---------|
| **SEV1** | Outage total / Perda de dados | **≤ 5 min** | ≤ 1h | Banco fora do ar, site indisponível |
| **SEV2** | Funcionalidade crítica degradada | **≤ 15 min** | ≤ 4h | API lenta 5x, autenticação com falha |
| **SEV3** | Funcionalidade secundária com falha | **≤ 1h** | ≤ 24h | Dashboard com erro, notificações atrasadas |
| **SEV4** | Cosmético / Não urgente | **≤ 24h** | ≤ 1 semana | Texto errado, link quebrado |

---

## Matriz de Escalação

```
SEV1 → Alert → PD (5min) → Tech Lead (10min) → CTO (20min)
SEV2 → Alert → PD (15min) → Tech Lead (30min)
SEV3 → Ticket + Alert ao responsável
SEV4 → Ticket Jira / GitHub Issue
```

---

## Runbook Template

```markdown
# Runbook: [Nome do Serviço/Problema]

**Severidade sugerida:** SEV[X]  
**Owner:** [Time responsável]  
**Última revisão:** YYYY-MM-DD

## Sintomas
- Alerta disparado: [nome do alerta]
- Observação: [o que o usuário está vendo]

## Diagnóstico Rápido (< 5 min)

1. Verificar saúde do serviço:
   ```bash
   kubectl get pods -n production | grep <service>
   kubectl describe pod <pod> -n production
   ```

2. Checar logs dos últimos 5 min:
   ```bash
   kubectl logs deployment/<service> --since=5m -n production
   ```

3. Verificar métricas no Grafana:
   - Dashboard: [link]
   - Métrica-chave: [ex: http_error_rate]

## Mitigação / Ações Imediatas

### Opção A — Restart
```bash
kubectl rollout restart deployment/<service> -n production
kubectl rollout status deployment/<service> -n production
```

### Opção B — Rollback
```bash
kubectl rollout undo deployment/<service> -n production
```

### Opção C — Scale-up
```bash
kubectl scale deployment/<service> --replicas=10 -n production
```

## Resolução Definitiva
[Passos para fix permanente]

## Verificação Pós-Fix
- [ ] Alerta não voltou a disparar por 30 min
- [ ] Métricas retornaram ao baseline
- [ ] Usuários não reportam mais erros

## Comunicação
- Status Page atualizado: link
- Time notificado via Slack: #incidents
```

---

## Post-Mortem Template

```markdown
# Post-Mortem: [Título do Incidente]

**Data:** YYYY-MM-DD  
**Duração:** X horas Y minutos  
**Severidade:** SEV[X]  
**Impacto:** [Usuários afetados / Receita / SLO consumido]

## Resumo Executivo
[2-3 frases descrevendo o que aconteceu, impacto e resolução]

## Timeline
| Hora | Evento |
|------|--------|
| 10:00 | Alerta disparado — high error rate em api-gateway |
| 10:05 | Engenheiro on-call acionado via PagerDuty |
| 10:12 | Causa identificada: deploy com OOM nos pods |
| 10:18 | Rollback executado |
| 10:22 | Serviço estabilizado — alerta resolvido |

## Causa Raiz
[Explicação técnica detalhada — sem culpar pessoas]

**5 Porquês:**
1. Por que o serviço ficou fora? → OOM kill nos pods
2. Por que OOM? → memory limit abaixo do necessário
3. Por que o limit estava errado? → estimativa incorreta no sizing
4. Por que a estimativa estava errada? → teste de carga não feito
5. Por que não houve teste de carga? → sem processo obrigatório pre-deploy

## O que foi bem
- Alerta disparou dentro do SLO de detecção
- Rollback executado sem hesitação
- Comunicação clara com stakeholders

## O que pode melhorar
- Adicionar teste de carga no pipeline antes de prod
- Aumentar memória para serviços críticos com margem de 30%
- Runbook estava desatualizado

## Action Items
| Ação | Owner | Prazo | Status |
|------|-------|-------|--------|
| Criar teste de carga obrigatório no CI | @devops | 2026-06-01 | 🔜 |
| Rever memory limits de todos os serviços | @sre | 2026-05-25 | 🔜 |
| Atualizar runbook api-gateway | @docs | 2026-05-20 | 🔜 |

## Error Budget Consumido
- SLO: 99.9% / 30 dias → 43.8 min disponíveis
- Incidente consumiu: 22 min (50% do budget restante)
```

---

## Ferramentas de On-Call

| Ferramenta | Função | Integração |
|-----------|--------|-----------|
| PagerDuty | On-call routing, escalação | Alertmanager, Grafana |
| OpsGenie | Gestão de alertas e escalação | Jira, Slack |
| Squadcast | Alternativa open-budget | Prometheus |
| Rootly | Post-mortem e Slack-first | Jira, GitHub |

---

## Anti-Patterns

- ❌ Culpar indivíduos — foco em sistemas, não pessoas
- ❌ Pular post-mortem para SEV1/2
- ❌ Esconder incidentes dos stakeholders
- ❌ Alertas sem runbook associado
- ❌ "Works on my machine" — produção é o ambiente real
- ❌ Resolver sintoma sem investigar causa raiz