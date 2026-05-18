---
name: ArgoCD GitOps Automation
description: Automação e sincronização de aplicativos ArgoCD para monitoramento de deployments declarativos e rollback rápido.
type: script
version: 1.0.0
script:
  path: scripts/argocd_helper.py
  runtime: python
  dependencies:
    - requests
    - python-dotenv
env:
  - ARGOCD_URL
  - ARGOCD_USER
  - ARGOCD_PASSWORD
categories:
  - gitops
  - devops
  - automation
---

# ArgoCD GitOps Automation Skill

Esta skill integra-se com a API do ArgoCD para monitorar o status de sincronização (`Synced` / `OutOfSync`) e a saúde (`Healthy` / `Degraded`) dos aplicativos instalados no cluster Kubernetes.

## Instruções de Uso para o Agente

### 1. Verificar Sincronização do Repositório Git com o Cluster
Antes de declarar que uma tarefa de deploy foi finalizada:
- Execute a query na API do ArgoCD para obter o status da aplicação correspondente.
- Garanta que a revisão atual coincide com a hash do último commit no Git.

### 2. Disparar Sincronização Manual (Sync)
Se uma alteração foi mergeada no branch principal do Git mas o ArgoCD ainda não iniciou a reconciliação automática (auto-sync delay):
- Chame a API de Sync para forçar o pull imediato do estado desejado.

### 3. Procedimento de Rollback Rápido em Emergência
Caso a aplicação fique em estado `Degraded` pós-deploy:
- Obtenha a lista de revisões históricas válidas.
- Acione o rollback imediato para a última versão estável conhecida.
- Abra um ticket no Jira (SEV1) notificando os detalhes da falha.
