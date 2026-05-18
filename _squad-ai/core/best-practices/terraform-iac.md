---
name: Terraform Infrastructure as Code
type: best-practice
tags: [terraform, iac, devops, aws, cloud]
---

# Terraform Best Practices

## Estrutura de Diretórios

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── backend.tf
│   ├── staging/
│   └── prod/
├── modules/
│   ├── vpc/
│   ├── eks/
│   ├── rds/
│   └── s3/
└── README.md
```

## Princípios

### 1. State Remoto
```hcl
terraform {
  backend "s3" {
    bucket = "terraform-state-prod"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### 2. Variáveis com Defaults
```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
  validation {
    condition     = contains(["t3.small", "t3.medium", "t3.large"], var.instance_type)
    error_message = "Instance type must be t3.small, t3.medium, or t3.large"
  }
}
```

### 3. Módulos Reutilizáveis
-命名: `module-<resource>-<purpose>`
- Documentar inputs/outputs
- Versionar com git tags

### 4. Security
- Nunca commit credentials
- Usar vault para secrets
- Habilitar audit logging
- State encryption

## GitOps

- Pull Requests para mudanças
- CODEOWNERS para review
- drifts detection automático