---
name: CI/CD Pipeline
type: best-practice
tags: [cicd, gitops, devops, automation, github-actions, argocd]
---

# CI/CD Pipeline Best Practices

## Princípios Fundamentais

1. **Imutabilidade**: Toda mudança vai via controle de versão — nunca manual em produção
2. **Feedback Rápido**: Lint/format < 30s | Unit tests < 2min | Integration tests < 10min
3. **Shift-Left Security**: IAM scan, dependency check e SAST em pull requests
4. **Idempotência**: Pipelines repetem a qualquer momento sem efeitos colaterais

---

## Estrutura de Estágios

| Estágio | Ferramentas | Duração alvo |
|---------|-------------|:------------:|
| Lint & Format | ruff, eslint, gofmt | < 30s |
| Unit Tests | pytest, jest, go test | < 2min |
| SAST / Security | trivy, gitleaks, snyk | < 3min |
| Build | docker buildx, kaniko | < 5min |
| Integration Tests | pytest-integration, k6 | < 10min |
| Build Image | kaniko, buildah | < 5min |
| Deploy (staging) | ArgoCD, Flux, kubectl | < 3min |
| Smoke Tests | curl, k6, playwright | < 2min |
| Deploy (prod) | ArgoCD, Flux, kubectl | < 5min |

---

## GitHub Actions — Template Base

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run linter
        run: |
          pip install ruff
          ruff check .

  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: pytest --cov=. --cov-report=xml

  security:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          severity: CRITICAL,HIGH

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via ArgoCD
        run: |
          argocd app sync my-app-staging --revision ${{ github.sha }}
          argocd app wait my-app-staging --health

  deploy-prod:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy via ArgoCD
        run: |
          argocd app sync my-app-prod --revision ${{ github.sha }}
          argocd app wait my-app-prod --health
```

---

## GitOps com ArgoCD

```yaml
# Application CRD — ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/infra-gitops
    targetRevision: HEAD
    path: apps/my-app/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

---

## Estratégias de Deploy

### Blue/Green
```bash
# Criar novo deployment "green"
kubectl apply -f deployment-green.yaml
# Aguardar rollout completo
kubectl rollout status deployment/my-app-green
# Redirecionar tráfego
kubectl patch service my-app -p '{"spec":{"selector":{"version":"green"}}}'
# Remover "blue" após validar
kubectl delete deployment my-app-blue
```

### Canary (percentual progressivo)
```yaml
# Com Argo Rollouts
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10   # 10% canary
        - pause: {duration: 5m}
        - setWeight: 50
        - pause: {duration: 10m}
        - setWeight: 100  # 100% = promoção
```

### Rollback Instantâneo
```bash
# Via ArgoCD
argocd app rollback my-app-prod

# Via kubectl
kubectl rollout undo deployment/my-app -n production

# Para versão específica
kubectl rollout undo deployment/my-app --to-revision=3
```

---

## Checklist de Pipeline Saudável

- [ ] Tempo total do pipeline < 15min
- [ ] Nenhum segredo hardcoded (use secrets manager)
- [ ] Scan de dependências e imagem Docker habilitado
- [ ] Rollback documentado e testado
- [ ] Notificações de falha configuradas (Slack, Teams, PagerDuty)
- [ ] Artifacts de build versionados com SHA do commit
- [ ] Branch protection rules ativadas (require PR + passing checks)
- [ ] Audit log de deploys em produção

---

## Anti-Patterns

- ❌ Credenciais hardcoded no YAML do pipeline
- ❌ Pular testes para ganhar velocidade
- ❌ Deploy manual direto em produção
- ❌ Pipeline sem notificação de falha
- ❌ Build sem tag ou versão rastreável
- ❌ Merge sem code review em branches protegidas