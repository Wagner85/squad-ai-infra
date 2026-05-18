---
name: Kubernetes Operations
type: best-practice
tags: [kubernetes, k8s, devops, infrastructure, eks, aks, gke]
---

# Kubernetes Operations Best Practices

## Convenções de Namespace

```yaml
# Estrutura recomendada
namespaces:
  - production      # workloads de produção
  - staging         # pré-produção
  - development     # desenvolvimento
  - monitoring      # Prometheus, Grafana, AlertManager
  - logging         # Loki, Elasticsearch, Fluentd
  - security        # Falco, OPA, Gatekeeper
  - infra           # ArgoCD, cert-manager, ingress
```

```bash
# Criar namespace com labels
kubectl create namespace production
kubectl label namespace production env=prod tier=critical
```

---

## Resource Management (Requests & Limits)

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "100"
    services: "20"
    persistentvolumeclaims: "30"
---
# Template de container com resources
containers:
  - name: api
    image: my-api:latest
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

---

## Segurança

### Pod Security Standards
```yaml
# Proibir containers como root
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: baseline
```

### NetworkPolicy (Zero Trust)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-only-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

### RBAC Mínimo Privilegiado
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: app-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "configmaps"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: bind-app-reader
  namespace: production
subjects:
  - kind: ServiceAccount
    name: my-app-sa
roleRef:
  kind: Role
  name: app-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## Monitoring

```bash
# Prometheus stack via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword=MY_SECURE_PASS \
  --set prometheus.prometheusSpec.retention=30d
```

### Queries Essenciais (PromQL)

```promql
# CPU usage por namespace
sum by (namespace) (rate(container_cpu_usage_seconds_total[5m]))

# Memory pressure por node
100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))

# Pods não prontos
kube_pod_status_ready{condition="false"}

# Restart count alto (sinal de crash loop)
increase(kube_pod_container_status_restarts_total[1h]) > 5
```

---

## Troubleshooting Quick Reference

```bash
# Descrever pod com problema
kubectl describe pod <pod-name> -n production

# Logs de um container específico
kubectl logs <pod-name> -c <container-name> -n production --tail=200 -f

# Executar shell em pod (debug)
kubectl exec -it <pod-name> -n production -- /bin/sh

# Verificar eventos recentes
kubectl get events -n production --sort-by='.lastTimestamp'

# Top consumidores de recursos
kubectl top pods -n production --sort-by=memory
kubectl top nodes

# Ver status do cluster
kubectl get nodes -o wide
kubectl get componentstatuses

# Forçar rollout sem mudança
kubectl rollout restart deployment/my-app -n production
```

---

## HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## Anti-Patterns

- ❌ Executar containers como root (use `runAsNonRoot: true`)
- ❌ Imagens sem tag específica (`latest` é proibido em prod)
- ❌ Sem resource requests/limits definidos
- ❌ Secrets em environment variables em plaintext
- ❌ Pods sem health probes (liveness/readiness)
- ❌ Namespace único para tudo (sem isolamento)
- ❌ RBAC desnecessariamente permissivo (`cluster-admin` para todos)