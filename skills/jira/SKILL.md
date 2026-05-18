---
name: Jira Project Management
description: Integração com o Jira Cloud/On-Premise para criar, listar, atualizar tarefas e gerar relatórios de incidentes ou sprints.
type: hybrid
version: 1.0.0
mcp:
  server_name: jira-mcp
  command: npx
  args:
    - -y
    - "@modelcontextprotocol/server-jira"
  transport: stdio
script:
  path: scripts/jira_helper.py
  runtime: python
  dependencies:
    - jira
    - python-dotenv
env:
  - JIRA_URL
  - JIRA_EMAIL
  - JIRA_TOKEN
categories:
  - automation
  - management
  - reports
---

# Jira Project Management Skill

Esta skill fornece capacidade total de automação sobre o quadro do Jira. Permite criar issues de incidentes (bugs), atualizar status de tarefas de infraestrutura e gerar sumários executivos de sprints ou demandas pendentes.

## Instruções de Uso para o Agente

### 1. Criar Issue de Incidente (Exemplo: SEV1 Outage)
Ao identificar uma falha crítica ou ser notificado por um alerta do Zabbix/Grafana:
- Crie um ticket do tipo `Bug` ou `Incident` no projeto apropriado.
- Preencha o sumário, a descrição técnica detalhada (logs, causa provável) e defina a prioridade correspondente (`Highest` para SEV1).

### 2. Atualizar Status de Tasks
Sempre que uma tarefa do pipeline for concluída com sucesso:
- Transicione o ticket no Jira para `In Progress` ou `Done`.
- Deixe um comentário detalhado contendo as evidências (ex: link do PR, logs do CI/CD ou plan do Terraform).

### 3. Formato de Descrição Recomendado
```markdown
*Componente:* API Gateway
*Impacto:* 100% de perda de tráfego na rota /checkout
*Severidade:* SEV1 - Crítico
*Logs de Erro:*
{code:json}
{
  "status": 504,
  "error": "Gateway Timeout"
}
{code}
```
