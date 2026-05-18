---
name: Terraform IaC Practices
description: Diretrizes avançadas de validação, formatação e execução segura de Infrastructure as Code com Terraform.
type: prompt
version: 1.0.0
env:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_REGION
categories:
  - iac
  - terraform
  - cloud
---

# Terraform IaC Skill

Esta skill fornece um conjunto rígido de instruções comportamentais para garantir a segurança, consistência e conformidade regulatória ao gerar, manter ou revisar códigos Terraform em ambientes AWS, Azure e GCP.

## Diretrizes de Execução do Agente

### 1. Estrutura Padrão de Arquivos
Sempre estruture novos módulos do Terraform contendo no mínimo os seguintes arquivos:
- `main.tf`: Recursos e fontes de dados primários.
- `variables.tf`: Declaração rigorosa de variáveis (sempre inclua descrição e tipo explícito).
- `outputs.tf`: Outputs úteis com descrições claras para integração upstream.
- `versions.tf`: Versões mínimas exigidas dos providers e do Terraform CLI.

### 2. Boas Práticas de Segurança
- **NÃO hardcode segredos**: Nunca insira credenciais diretamente nos arquivos `.tf`. Use variables marcadas como `sensitive = true`, KMS, Secrets Manager ou variáveis de ambiente.
- **State Remoto**: Sempre configure um backend remoto seguro (ex: S3 + DynamoDB para AWS) com criptografia ativa.
- **Tags Globais**: Todo recurso que suporte tags deve conter tags de controle como `Environment`, `ManagedBy = Terraform`, `Project` e `Owner`.

### 3. Validação Rígida (Lint & Plan)
Antes de sugerir qualquer alteração de código:
- Simule a execução de `terraform validate` e `tflint`.
- Certifique-se de que os blocos de recursos seguem as melhores práticas recomendadas pelo HashiCorp Registry.
