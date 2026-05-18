---
name: Kubernetes Cluster Operations
description: Integração nativa com o Kubernetes (EKS/AKS/GKE) para listar pods, namespaces, obter logs e analisar workloads.
type: mcp
version: 1.0.0
mcp:
  server_name: kubernetes-mcp
  command: npx
  args:
    - -y
    - "@manusa/kubernetes-mcp-server"
  transport: stdio
env:
  - KUBECONFIG
categories:
  - container
  - kubernetes
  - devops
---

# Kubernetes Cluster Operations Skill

Esta skill concede ao agente a capacidade de inspecionar clusters Kubernetes usando o contexto ativo do `kubectl` local. Fornece comandos seguros para ler estados de deployments, listar recursos e inspecionar logs de pods em tempo real.

## Instruções de Uso para o Agente

### 1. Inspecionar Pods e Logs em Falha
Se for reportado que um serviço está fora do ar (ex: 502/504 Gateway Timeout):
- Liste os pods no namespace do serviço.
- Verifique se há pods em estado `CrashLoopBackOff`, `Pending` ou `Error`.
- Obtenha os logs dos últimos 50 registros dos pods afetados para identificar exceções uncaught ou falhas de inicialização.

### 2. Verificar Status de HPA (Horizontal Pod Autoscaler)
Em situações de alta carga de trabalho:
- Verifique se o HPA atingiu o limite máximo de réplicas permitidas.
- Correlacione com o consumo real de memória/CPU reportado nos nodes.

### 3. Baseline de Segurança Crítico
- **LEITURA APENAS POR PADRÃO**: Use apenas operações de leitura (`get`, `list`, `logs`). 
- **NÃO FAÇA DEPLOY DIRETO**: Qualquer alteração em manifestos YAML ou imagens de containers deve ser feita via GitOps (modificando os repositórios Git) e NUNCA rodando `kubectl apply` ou `kubectl set image` diretamente no cluster de produção, exceto em emergências extremas previamente autorizadas.
