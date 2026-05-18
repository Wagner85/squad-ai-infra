---
name: Networking
type: best-practice
tags: [networking, vpc, security-groups, dns, cdn, zero-trust, vpn, firewall]
---

# Networking Best Practices

## Princípios Fundamentais

1. **Zero Trust**: "Nunca confie, sempre verifique" — toda comunicação autenticada e autorizada
2. **Defense in Depth**: Múltiplas camadas de segurança (WAF → ALB → Security Group → NetworkPolicy)
3. **Least Privilege**: Libere apenas o tráfego necessário, na porta certa, para o IP correto
4. **Imutabilidade**: Mudanças de rede via IaC (Terraform), nunca via console

---

## VPC Design (3-Tier Architecture)

```
Internet
   │
[IGW — Internet Gateway]
   │
┌─────────────────────────────────────────┐
│  VPC: 10.0.0.0/16                       │
│                                          │
│  ┌──────────────────┐                   │
│  │  Public Subnet   │  10.0.1.0/24      │
│  │  ALB, NAT GW     │  (Multi-AZ)       │
│  └────────┬─────────┘                   │
│            │                             │
│  ┌──────────────────┐                   │
│  │  Private Subnet  │  10.0.2.0/24      │
│  │  App Servers     │  (Multi-AZ)       │
│  │  EKS Nodes       │                   │
│  └────────┬─────────┘                   │
│            │                             │
│  ┌──────────────────┐                   │
│  │  Data Subnet     │  10.0.3.0/24      │
│  │  RDS, ElastiCache│  (Multi-AZ)       │
│  │  Redis           │  Sem internet     │
│  └──────────────────┘                   │
└─────────────────────────────────────────┘
```

### Terraform — VPC Base

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "my-vpc-prod"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  database_subnets = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false  # HA: um NAT por AZ
  enable_vpn_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

---

## Security Groups (Menor Privilégio)

```hcl
# ALB — aceita só HTTPS da internet
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "ALB — allow HTTPS from internet"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

# App Servers — aceitam só do ALB
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "App — allow traffic from ALB only"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }
}
```

---

## DNS e CDN

```hcl
# Route 53 — Health Check + Failover
resource "aws_route53_health_check" "api" {
  fqdn              = "api.mycompany.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.mycompany.com"
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.api.id
  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}
```

---

## Zero Trust — Checklist

| Controle | Implementação |
|----------|--------------|
| Identidade | IAM Roles, OIDC, AWS SSO |
| Autenticação mútua | mTLS entre microsserviços |
| Micro-segmentação | Kubernetes NetworkPolicy |
| Least privilege | IAM Policies mínimas, no `*` |
| Cifração em trânsito | TLS 1.2+ obrigatório |
| Cifração em repouso | KMS managed keys |
| Auditoria | CloudTrail, VPC Flow Logs |
| Acesso privilegiado | AWS Session Manager (sem SSH direto) |

---

## VPN e Conectividade Híbrida

```
On-Premises ──── [Site-to-Site VPN] ─── [VGW] ─── VPC
              └── [Direct Connect]  ─────────────┘
                  (1Gbps dedicado)

Alternativa: Transit Gateway para multi-VPC
┌─────────────────────────────────┐
│  Transit Gateway (hub central)  │
│  VPC-A ─── TGW ─── VPC-B        │
│             │                    │
│            VPN ─── On-Premises  │
└─────────────────────────────────┘
```

---

## VPC Flow Logs (Auditoria)

```bash
# Habilitar VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxxxxx \
  --traffic-type ALL \
  --log-group-name /aws/vpc/flow-logs \
  --deliver-logs-permission-arn arn:aws:iam::ACCOUNT:role/FlowLogsRole

# Query Athena para IPs com muitas rejeições
SELECT srcaddr, count(*) as rejects
FROM vpc_flow_logs
WHERE action='REJECT'
GROUP BY srcaddr
ORDER BY rejects DESC
LIMIT 20;
```

---

## Anti-Patterns

- ❌ `0.0.0.0/0` em security group de banco de dados
- ❌ Databases com IP público ou em subnet pública
- ❌ Usar public endpoints quando PrivateLink existe
- ❌ SSH direto para instâncias (use Session Manager)
- ❌ Credenciais de rede hardcoded (use Secrets Manager)
- ❌ Subnet única para all workloads (sem isolamento)
- ❌ VPC Flow Logs desabilitado (sem auditoria)