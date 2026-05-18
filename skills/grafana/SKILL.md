---
name: Grafana Observability
description: Integração com Grafana para consulta de dashboards, métricas de CPU/Memória, criação de anotações e análise de logs.
type: hybrid
version: 1.0.0
mcp:
  server_name: grafana-mcp
  command: npx
  args:
    - -y
    - "@modelcontextprotocol/server-grafana"
  transport: stdio
script:
  path: scripts/query_grafana.py
  runtime: python
  dependencies:
    - requests
    - python-dotenv
env:
  - GRAFANA_URL
  - GRAFANA_TOKEN
categories:
  - observability
  - monitoring
  - sre
---

# Grafana Observability Skill

Esta skill permite ao agente interagir diretamente com instâncias do Grafana para consultar métricas, inspecionar painéis de dashboards e criar anotações de eventos ou incidentes.

## Instruções de Uso para o Agente

### 1. Obter Métricas de Recursos (CPU e Memória)
Sempre que precisar obter métricas em tempo real de nodes ou pods no Kubernetes (EKS):
- Use a API do Grafana (`/api/datasources/proxy/{datasource_id}/api/v1/query_range` ou similar para Prometheus).
- Analise a utilização com base em percentuais médios e p99.

### 2. Criar Anotações (Annotations) durante Incidentes
Ao iniciar ou mitigar um incidente (SEV1, SEV2):
- Envie uma anotação para o Grafana para marcar o exato momento do deploy ou alteração no dashboard correspondente.
- Endpoint: `/api/annotations`
- Payload:
  ```json
  {
    "text": "Mitigação aplicada pelo SRE: Reinício do pod api-gateway",
    "tags": ["incident", "mitigation", "sre"],
    "time": 1716120000000
  }
  ```

### 3. Evitar Alucinação de Dados
- Se o Grafana retornar erro de conexão ou sem dados (empty dataset), relate imediatamente que as métricas estão indisponíveis para o intervalo selecionado.
- Não invente valores de consumo de CPU/Memória.
