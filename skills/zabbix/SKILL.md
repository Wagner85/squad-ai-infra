---
name: Zabbix Monitoring
description: Script helper para consultar triggers ativos, inventário de hosts e logs de monitoramento legados no Zabbix Server.
type: script
version: 1.0.0
script:
  path: scripts/zabbix_query.py
  runtime: python
  dependencies:
    - pyzabbix
    - python-dotenv
env:
  - ZABBIX_URL
  - ZABBIX_USER
  - ZABBIX_PASSWORD
categories:
  - monitoring
  - security
  - infrastructure
---

# Zabbix Monitoring Skill

Esta skill permite a integração programática com o Zabbix Server. É amplamente utilizada para extrair alertas em tempo real de servidores, switches de rede e banco de dados legados que não estão no ecossistema Kubernetes.

## Instruções de Uso para o Agente

### 1. Consultar Triggers Ativos (Alertas Ativos)
Sempre que precisar avaliar a saúde geral da rede ou infraestrutura física/legacy:
- Execute o script para listar todas as triggers ativas com prioridade superior a `Average` (Severidades 3, 4 e 5).
- Agrupe por host e traga a descrição do problema e o tempo decorrido desde a ativação.

### 2. Filtrar Falsos Positivos
- Triggers ativas por menos de 2 minutos devem ser monitoradas, mas não devem gerar a criação de incidentes de alto nível (evitar alerta falso/noise).
- Sempre correlacione os alertas do Zabbix com o Grafana (se disponível) para validar a persistência da degradação.
