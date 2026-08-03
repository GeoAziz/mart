# Disaster Recovery Plan - ZilaCart

**Last Updated:** 2026-06-24  
**Owner:** DevOps Team  
**Classification:** Internal

## Executive Summary

This document outlines the disaster recovery (DR) strategy for ZilaCart, including Recovery Time Objectives (RTO), Recovery Point Objectives (RPO), and step-by-step recovery procedures.

### RTO & RPO Targets

| Service | RTO | RPO | Impact |
|---------|-----|-----|--------|
| Firebase/Firestore | 4 hours | 1 day | Critical - All customer data |
| API Services | 1 hour | 15 min | High - Customer-facing |
| Cache Layer (Redis) | 30 min | None (ephemeral) | Medium - Performance degradation |
| Payment Processing | 4 hours | 1 hour | Critical - Revenue impact |
| Search/Analytics | 8 hours | 1 day | Low - Operational only |

## Current State Assessment

### ✅ What We Have

- **Multi-region capable**: Firebase Firestore can be configured for multi-region
- **Infrastructure as Code**: Terraform configurations for all AWS resources
- **Database Schemas**: Defined in `firestore-indexes.json` and `firestore.rules`
- **API Documentation**: Clear REST API contracts
- **Automated CI/CD**: GitHub Actions workflows for deployment

### ⚠️ What's Missing

- **Automated backups**: No scheduled Firestore exports
- **Multi-region deployment**: Currently single-region (Cloud Firestore primary region)
- **Backup verification**: No automated restore testing
- **Detailed runbooks**: Recovery procedures not documented
- **Communication plan**: No escalation or notification procedures

## Backup Strategy

### Firestore Backups

**Frequency:** Daily at 02:00 UTC

```bash
# Create scheduled export to Cloud Storage
gcloud firestore export gs://mart-backups/daily-$(date +%Y%m%d) \
  --async

# Retention: Keep 30 days of daily backups
```

**Implementation:**
```
- Create Cloud Scheduler job (daily)
- Export to GCS bucket: `mart-backups`
- Lambda/Cloud Function to clean up old backups
- Automated restore test weekly
```

### Cloud Storage Backups

**Strategy:** Cross-region replication

```yaml
# Enable versioning
gsutil versioning set on gs://mart-uploads

# Enable cross-region replication
gsutil replication set '{rules: [{action: "RESTORE", origin: ["US"], destination: ["EU"]}]}' gs://mart-uploads
```

### Database State Snapshots

**For LocalStack/DynamoDB (dev only):**
```bash
# Backup local state
docker exec mart-localstack tar czf /backups/localstack-$(date +%Y%m%d-%H%M%S).tar.gz /tmp/localstack/data

# Retention: Keep 7 days in development
```

## Recovery Procedures

### Scenario 1: Firestore Complete Data Loss

**RTO:** 4 hours | **RPO:** 1 day | **Severity:** Critical

#### Prerequisites
- Google Cloud Admin access
- Latest backup verified in Cloud Storage
- Terraform state backup

#### Steps

1. **Assess Damage (15 min)**
   ```bash
   gcloud firestore databases describe --database=default
   gcloud firestore backup list
   ```

2. **Identify Latest Valid Backup (5 min)**
   ```bash
   gsutil ls -l gs://mart-backups/
   # Choose backup from < 24 hours ago
   ```

3. **Restore Firestore (2-3 hours)**
   ```bash
   gcloud firestore restore \
     --backup gs://mart-backups/daily-20260623 \
     --database default \
     --async
   
   # Monitor progress
   gcloud firestore operations describe [OPERATION_ID]
   ```

4. **Verify Data Integrity (15 min)**
   ```bash
   # Check document counts by collection
   gcloud firestore export gs://mart-backups/verify-$(date +%s)
   
   # Run data validation queries
   npm run scripts/validate-firestore-recovery.ts
   ```

5. **Redeploy Application (30 min)**
   ```bash
   cd terraform
   terraform plan
   terraform apply -auto-approve
   
   # Verify connectivity
   curl https://api.zilamart.local/api/health
   ```

6. **Notify Stakeholders (ongoing)**
   - Slack: #incident-response
   - Status page: incident.zilamart.local
   - Email: vendors@zilamart.local

### Scenario 2: Region-Wide Outage

**RTO:** 4 hours | **RPO:** 1 day | **Severity:** Critical

#### Steps

1. **Failover to Secondary Region (if configured)**
   ```bash
   # Update DNS to point to backup region
   gcloud dns record-sets update api.zilamart.local \
     --rrdatas="[BACKUP_REGION_IP]" \
     --ttl=60 \
     --zone="zilamart-dns"
   
   # Verify failover
   dig api.zilamart.local
   ```

2. **Restore from Backup (2-3 hours)**
   - Follow "Scenario 1: Firestore Complete Data Loss"
   - Deploy to backup region

3. **Restore Object Storage**
   ```bash
   # Copy from cross-region replica
   gsutil -m cp -r gs://mart-uploads-backup/* gs://mart-uploads-restored/
   ```

### Scenario 3: API Service Degradation

**RTO:** 1 hour | **RPO:** 15 min | **Severity:** High

#### Steps

1. **Diagnose Issue (10 min)**
   ```bash
   # Check service health
   kubectl get pods -n production
   kubectl logs -n production [POD_NAME]
   
   # Check metrics
   # Go to: https://grafana.internal/d/app-performance
   ```

2. **Rollback to Last Known Good State**
   ```bash
   git log --oneline | head -10
   git revert [BAD_COMMIT]
   git push origin main
   
   # CI/CD will automatically redeploy
   ```

3. **Scale Up Services if Needed**
   ```bash
   kubectl scale deployment/api-server --replicas=5 -n production
   kubectl scale deployment/websocket --replicas=3 -n production
   ```

4. **Monitor Recovery**
   ```bash
   watch kubectl get pods -n production
   # Wait for all pods to be in Running state
   ```

### Scenario 4: Payment Processing Failure

**RTO:** 4 hours | **RPO:** 1 hour | **Severity:** Critical

#### Steps

1. **Check Payment Queue**
   ```bash
   # LocalStack (dev)
   awslocal sqs receive-message \
     --queue-url http://localstack:4566/000000000000/payment-queue.fifo
   ```

2. **Replay Failed Transactions**
   ```bash
   # Run recovery script
   npm run scripts/replay-failed-payments.ts
   ```

3. **Manual Reconciliation**
   - Export payment ledger: `firestore → payment_logs`
   - Compare with Stripe/PayPal reconciliation reports
   - Process discrepancies manually

4. **Verify Recovery**
   - Confirm all payments processed
   - Reconcile vendor payouts
   - Send receipt emails to customers

## Testing & Validation

### Monthly Restore Testing

**First Friday of each month at 14:00 UTC**

```bash
#!/bin/bash
# scripts/test-disaster-recovery.sh

set -e

echo "Starting DR test..."

# 1. Create test environment
terraform workspace new dr-test

# 2. Restore from latest backup
gcloud firestore restore \
  --backup $(gsutil ls -l gs://mart-backups/ | tail -1 | awk '{print $NF}') \
  --database default

# 3. Run validation tests
npm run test:dr

# 4. Cleanup
terraform workspace delete dr-test

echo "DR test complete!"
```

### Backup Verification Checklist

- [ ] Backup file exists in Cloud Storage
- [ ] Backup size is reasonable (> 100MB, < 10GB)
- [ ] Firestore export can be read
- [ ] All collection data present
- [ ] No corruption detected
- [ ] Timestamp is recent (< 24h)

## Prevention & Monitoring

### Automated Alerts

Monitor these metrics in Grafana:

```promql
# Firestore connectivity
up{job="firestore"} == 0  → Page on-call

# High error rate
rate(http_request_errors_total[5m]) > 0.1  → Slack alert

# Payment failures
rate(payments_processed_total{status="failed"}[1h]) > 0.05  → Critical alert
```

### Regular Maintenance

| Task | Frequency | Owner |
|------|-----------|-------|
| Review backup status | Weekly | DevOps |
| Test restore procedure | Monthly | DevOps |
| Update runbooks | Quarterly | DevOps |
| Disaster recovery drill | Semi-annual | Engineering Lead |

## Escalation & Communication

### Incident Levels

**Level 1 (Low):** < 1 hour degradation
- Notify: #general Slack
- No customer communication needed

**Level 2 (Medium):** 1-4 hours degradation
- Notify: #incident-response + on-call
- Update: status.zilamart.local
- Email: key vendors

**Level 3 (Critical):** > 4 hours or data loss
- Notify: CEO + all stakeholders
- Press release if public impact
- Post-incident review within 24h

### Communication Template

```
🚨 INCIDENT: [SERVICE] - [STATUS]

What: [Brief description]
Impact: ~[N] customers/vendors affected
Duration: ~[HH:MM] (estimated RTO: [TIME])
Next Update: [TIMESTAMP]

Current Actions:
- [ ] Restoring from backup
- [ ] Verifying data integrity
- [ ] Redeploying services

Status Page: incident.zilamart.local
```

## Contact Information

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| DevOps Lead | [Name] | @devops-lead | +254... |
| On-Call | [Rotates weekly] | @on-call | [Calendar] |
| CEO | [Name] | @ceo | [Direct] |

## References

- [Firestore Backup & Restore](https://cloud.google.com/firestore/docs/manage-data/export-import)
- [GKE Disaster Recovery](https://cloud.google.com/kubernetes-engine/docs/concepts/maintenance-windows)
- [Payment Reconciliation Guide](./docs/PAYMENT-RECONCILIATION.md)
- [Incident Response Playbook](./docs/INCIDENT-RESPONSE.md)

---

**Approved by:** [Engineering Lead]  
**Last Tested:** [DATE]  
**Next Review:** [DATE]
