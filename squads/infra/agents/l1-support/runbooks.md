# 📋 Templates e Runbooks do Analista N1 (L1 Support)

> Este arquivo contém os templates de escalação, notificação e fluxos operacionais
> referenciados pelo agente `l1-support.agent.md`. Carregado sob demanda pelo Pipeline Runner.

---

## Template de Escalação de Incidente

```markdown
## 🚨 ESCALACÃO DE INCIDENTE

**Ticket:** [PRJ_SD-XXX] / [Alert Name]
**Severidade:** P1/P2
**Origem:** Grafana / Zabbix
**Data/Hora:** [timestamp]

### Descrição
[Descrição curta do problema]

### Impacto
- Hosts/Serviços afetados: [lista]
- Usuários impactados: [quantidade]
- Receita/SLA impactado: [sim/não]

### Dados Coletados
[Metrics, logs, screenshots]

### Escalado Para
- [ ] SRE (@sre)
- [ ] DevOps (@devops)
- [ ] Network (@network)
- [ ] Cyber (@cyber)
- [ ] Tech Lead (@tech-lead)

### Ações Tomadas
1. [x] Ação 1
2. [x] Ação 2

### Próximos Passos
- [ ] Próxima ação
- [ ] Responsável: [nome]
- [ ] Prazo: [hora]
```

---

## Template de Notificação Tech Lead

```markdown
## 📋 NOTIFICAÇÃO - TECH LEAD

**Incidente:** [Nome/Ticket]
**Status:** [Investigando/Escalado/Resolvendo]
**Severidade:** P1/P2

### Resumo
[2-3 linhas do que está acontecendo]

### Ações em Andamento
1. [ação em curso]

### Escalação Feita
- SRE: [sim/não] - [detalhe]
- DevOps: [sim/não] - [detalhe]
- Network: [sim/não] - [detalhe]
- Cyber: [sim/não] - [detalhe]

### Necessita Decisão
- [ ] Sim: [decisão necessária]
- [ ] Não

### ETA Resolução
[Estimate]
```

---

## Template de Escalação L1 → SRE

```markdown
## 🚨 ESCALACÃO L1 → SRE

**Origem:** Uptime Kuma - Status Page
**Severidade:** P1
**Data/Hora:** {timestamp}
**Monitor:** {nome do monitor}
**Grupo:** {grupo do monitor}

### Descrição do Problema
{descrição curta}

### Cruzamento de Dados
- Zabbix: {status/resultado}
- Grafana: {métricas observadas}

### Solicitação
Analisar causa raiz e definir plano de ação.
```

---

## Template de Escalação Genérica

```markdown
## 🚨 ESCALACÃO

**Origem:** Grafana / Zabbix
**Severidade:** P1
**Data/Hora:** [timestamp]

**Descrição:** [nome do alerta]

**Host/Serviço:** [affected]

**Ações tomadas:** [investigação inicial]

**Escalado para:**
- [ ] SRE
- [ ] DevOps
- [ ] Network
- [ ] Cyber
```

---

## Fluxo de Escalação Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                    L1 - N1 SUPPORT                               │
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐                          │
│   │   GRAFANA   │     │   ZABBIX    │                          │
│   │  51 boards  │     │  31 hosts   │                          │
│   │  8 sources  │     │  22 triggers│                          │
│   └──────┬──────┘     └──────┬──────┘                          │
│          │                    │                                  │
│          └────────┬─────────┘                                  │
│                   ▼                                             │
│          ┌─────────────────┐                                     │
│          │   TRIAGEM N1   │                                     │
│          │  Classificar   │                                     │
│          │  Severidade    │                                     │
│          └────────┬───────┘                                     │
│                   ▼                                             │
│   ┌─────────────────────────────────────────────┐              │
│   │           MATRIZ DE ESCALACÃO                │              │
│   └─────────────────────────────────────────────┘              │
│                                                                 │
│   P1/P2 (Crítico) ──► AGENTES ESPECIALISTAS                 │
│         │                                                     │
│         ├──► SRE ─────────► Infraestrutura/Kubernetes           │
│         ├──► DevOps ──────► Pipelines/Deploy                  │
│         ├──► Network ─────► VPN/Conectividade                │
│         ├──► Cyber ───────► Segurança                        │
│         │                                                     │
│         └──► Tech Lead ───► NOTIFICAÇÃO OBRIGATÓRIA          │
│                                                                 │
│   P3/P4 (Médio) ────► Tentar resolver com runbook            │
│                                                                 │
│   P5 (Info) ────────► Monitorar, documentar                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Trabalho L1 — Checkup Rotina

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHECKUP L1 - ROTINA                          │
│                                                                 │
│  1. EXECUTAR CHECKUP                                           │
│                           ↓                                      │
│  2. ANALISAR RESULTADO                                          │
│     - P1/P2: Escalação imediata para SRE                        │
│     - P3/P4: Investigar                                        │
│     - OK: Documentar                                            │
│                           ↓                                      │
│  3. ESCALAR (se necessário)                                     │
│     → SRE: Enviar notificação de escalação                      │
│                           ↓                                      │
│  4. AGUARDAR ANÁLISE DO SRE                                    │
│                           ↓                                      │
│  5. SRE ESCALA PARA DEVOPS (se necessário)                    │
│                           ↓                                      │
│  6. DEVOPS MONTA PLANO DE AÇÃO                                 │
│                           ↓                                      │
│  7. TECH LEAD VALIDA E SOLICITA APROVAÇÃO                       │
│                           ↓                                      │
│  8. USUÁRIO APROVA TASK/INCIDENTE/MELHORIA                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Indisponibilidade (Status Page)

```
┌─────────────────────────────────────────────────────────────────┐
│           FLUXO: INDISPONIBILIDADE DETECTADA                   │
└─────────────────────────────────────────────────────────────────┘

1. L1 DETECTA
   └─ Monitor DOWN no Uptime Kuma
   └─ Classifica severidade (P1-P4)
   └─ Cruzado com Zabbix e Grafana

2. L1 ESCALA PARA SRE
   └─ Notificação via Google Chat
   └─ Template: "ESCALACÃO L1 → SRE"

3. SRE ANALISA
   └─ Cruza dados Zabbix + Grafana
   └─ Identifica causa raiz
   └─ Decide se escala para DevOps

4. DEVOPS (se escalado)
   └─ Analisa impacto
   └─ Monta plano de ação
   └─ Envia para Tech Lead

5. TECH LEAD
   └─ Valida plano
   └─ Define tipo: TASK / INCIDENTE / PROJETO
   └─ Solicita aprovação do usuário

6. USUÁRIO APROVA
   └─ TASK → Cria ticket Jira
   └─ INCIDENTE → Abre incidente
   └─ PROJETO → Cria projeto de melhoria
```
