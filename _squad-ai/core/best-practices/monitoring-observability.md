---
name: Monitoring & Observability
type: best-practice
tags: [monitoring, observability, prometheus, grafana, loki, alertmanager, sre, slo]
---

# Monitoring & Observability Best Practices

## Os Três Pilares da Observabilidade

```
Métricas ────── O QUE está acontecendo (CPU, latência, erros)
Logs ─────────── POR QUE está acontecendo (mensagens, stack traces)
Traces ─────────── ONDE está acontecendo (span, servico, dependência)
```

---

## 1. Métricas (Prometheus + Grafana)

### SLI/SLO Framework

| SLI (Indicador) | SLO (Objetivo) | SLA (Contratual) |
|-----------------|---------------|-----------------|
| Availability | 99.9% / 30 dias | 99.5% |
| Latência p99 | < 200ms | < 500ms |
| Success Rate | > 99.5% | > 99% |
| Error Rate | < 0.5% | < 1% |

### Error Budget

```python
slo_target = 0.999          # 99.9%
window_seconds = 30 * 24 * 3600   # 30 dias
error_budget_seconds = window_seconds * (1 - slo_target)
# = 2592 segundos ≈ 43 minutos de downtime permitido

# Se consumir mais: freeze deployments, foco em reliability
```

### Queries PromQL Essenciais

```promql
# Error Rate (5xx) por serviço
sum by (service) (
  rate(http_requests_total{status_code=~"5.."}[5m])
) /
sum by (service) (
  rate(http_requests_total[5m])
)

# Latência p99
histogram_quantile(0.99,
  sum by (le, service) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# CPU Usage por pod
sum by (pod) (
  rate(container_cpu_usage_seconds_total{container!=""}[5m])
)

# SLO Burn Rate (alerta antecipado)
sum(rate(http_requests_total{status_code=~"5.."}[1h])) /
sum(rate(http_requests_total[1h])) > 0.001 * 14.4
```

### Configuração de Alertas (AlertManager)

```yaml
# alertmanager.yaml — rotas e integrações
route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-warning'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        severity: warning
      receiver: 'slack-warning'

receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: <PAGERDUTY_KEY>
        description: '{{ .CommonAnnotations.summary }}'

  - name: 'slack-warning'
    slack_configs:
      - api_url: <SLACK_WEBHOOK>
        channel: '#alerts'
        text: 'Alert: {{ .CommonAnnotations.summary }}'

# Regras de alerta recomendadas
groups:
  - name: infra.rules
    rules:
      - alert: HighErrorRate
        expr: error_rate > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate acima de 1%"

      - alert: HighLatency
        expr: histogram_quantile(0.99, http_request_duration_seconds_bucket) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latência > 500ms"

      - alert: PodCrashLooping
        expr: increase(kube_pod_container_status_restarts_total[1h]) > 5
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Pod em crash loop: {{ $labels.pod }}"
```

---

## 2. Logs (Loki + Grafana ou ELK)

### Formato de Log Estruturado (JSON)

```json
{
  "timestamp": "2026-05-17T20:00:00Z",
  "level": "error",
  "service": "api-gateway",
  "trace_id": "abc123def456",
  "span_id": "xyz789",
  "user_id": "usr_42",
  "method": "POST",
  "path": "/api/orders",
  "status_code": 500,
  "duration_ms": 1234,
  "error": "connection timeout to database",
  "environment": "production"
}
```

### Configuração Loki (via Helm)

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true \
  --set grafana.enabled=false
```

### Queries LogQL Essenciais

```logql
# Erros do serviço api-gateway na última hora
{service="api-gateway"} |= "error" | json | level="error"

# Latência de requests acima de 1s
{service="api"} | json | duration_ms > 1000

# Rastrear uma requisição específica
{job="kubernetes-pods"} |= "trace_id=abc123"

# Contagem de erros por minuto
sum by (service) (
  rate({job="kubernetes-pods"} |= "error" [1m])
)
```

---

## 3. Traces (OpenTelemetry + Jaeger/Tempo)

### Instrumentação (Python)
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

provider = TracerProvider()
exporter = JaegerExporter(
    agent_host_name="jaeger",
    agent_port=6831,
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("database-query") as span:
    span.set_attribute("db.table", "orders")
    span.set_attribute("db.rows", 150)
    # execute query
```

---

## Dashboards Essenciais (Grafana)

| Dashboard | Métricas | Audiência |
|-----------|----------|-----------|
| Executive | Uptime %, error budget, receita impactada | C-Level |
| Operations | Error rate, latência p99, active alerts | SRE/DevOps |
| Infrastructure | CPU/Memory nodes, pod status, network | PlataformEng |
| Service Map | Dependências, throughput, health | Todos |

---

## Anti-Patterns

- ❌ Alertas sem runbook associado → alerta inútil que gera alarm fatigue
- ❌ Retenção de logs indefinida → custo e LGPD
- ❌ Sampling uniforme de 100% → custo de traces explosivo
- ❌ Métricas de alta cardinalidade sem `recording rules` → degrada Prometheus
- ❌ Dashboard sem SLO burn rate → você descobre incidentes por usuários
- ❌ Ignorar p99 e focar só em média → médias mascaram outliers críticos