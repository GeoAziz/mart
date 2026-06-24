LocalStack for Infrastructure (Local-only)

This folder documents how to run LocalStack for local IaC testing and how to use the Terraform configuration in `terraform/` against LocalStack.

Quick start

1. Start LocalStack via Docker Compose:

```bash
docker compose -f docker-compose.localstack.yml up -d
```

This LocalStack profile only enables the services Terraform uses here: `s3` and `dynamodb`.

If you want one command to do both the background start and the Terraform apply, use:

```bash
python3 scripts/localstack_terraform.py apply
```

That helper starts Docker in the background, polls readiness, and then runs Terraform.

2. Confirm LocalStack is healthy:

```bash
docker logs localstack --tail 50
```

3. Initialize Terraform against LocalStack (from repo root):

```bash
# Shows plan
./scripts/terraform_local_init.sh plan terraform

# Apply resources to LocalStack
./scripts/terraform_local_init.sh apply terraform
```

Notes
- The Terraform provider in `terraform/provider.tf` is configured to use `var.localstack_endpoint`. The default in `terraform/variables.tf` is `http://host.docker.internal:4566`. On Linux, if `host.docker.internal` is not available, replace with the Docker host IP or use `network_mode: host` in compose.
- This setup is strictly local and intended for development/testing only. Do NOT use LocalStack state or endpoints for production.
