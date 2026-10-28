# Analytics Operations Runbook (Standard Operating Procedure)

This runbook documents operational procedures for Google Analytics 4 (GA4) tracking, the Transactional Outbox Worker, synthetic traffic simulations, and the Commerce Analytics Quality Gate (CAQG) for **ZilaCart (`mart_ke`)**.

---

## 1. Property & Stream Architecture

* **Production / Primary Store**: `mart_ke`
* **GA4 Property ID**: `558077199`
* **Measurement ID**: `G-09S1NJ6W15` (Web Stream / Firebase App `mart-ke`)
* **Secret Parameter**: `GA4_API_SECRET`
* **Reporting Timezone**: `Africa/Nairobi`

All client-side tracking (`GoogleAnalytics.tsx`), background outbox dispatches (`analytics-worker.ts`), and synthetic journey simulations (`simulate-multiuser-journey.ts`) MUST direct events to `G-09S1NJ6W15`.

---

## 2. Emergency Pause & Kill-Switch

If the outbox worker needs to be paused immediately due to external API errors, quota exhaustion, or incorrect tracking configurations:

### Option A: Environment Variable (Fastest)
Set the environment variable:
```bash
ANALYTICS_WORKER_PAUSED=true
```
When set, all subsequent batches in `processOutboxBatch()` will log a warning and exit without claiming or dispatching records.

### Option B: Runtime Firestore Toggle (No Redeploy Required)
In the Firestore console or via Admin script:
* Collection: `system_config`
* Document: `analytics_settings`
* Field: `isPaused: true` (boolean)

To unpause, update `isPaused: false`.

---

## 3. Worker Operations & Dead-Letter Resolution

### Running the Outbox Worker
```bash
# Run standalone worker loop
npm run worker:analytics
```

### Inspecting Outbox Statuses
```typescript
// Query dead-letter or suppressed records
const deadLetters = await db.collection('analytics_outbox')
  .where('status', '==', 'dead_letter')
  .get();

deadLetters.forEach(doc => {
  const data = doc.data();
  console.log(doc.id, 'Error:', data.lastErrorMessage, 'Attempts:', data.attemptCount);
});
```

### Reprocessing Dead-Letter Records
To reset dead-letter records back to `pending` after fixing upstream configuration issues:
```typescript
await db.collection('analytics_outbox').doc('<DOC_ID>').update({
  status: 'pending',
  attemptCount: 0,
  nextAttemptAt: admin.firestore.Timestamp.now(),
  lastErrorMessage: null,
});
```

---

## 4. Synthetic Traffic Isolation

To protect real production conversion dashboards from simulated test runs:
* Synthetic orders are generated with:
  * `orderId` prefixed with `SIM_`
  * `is_synthetic: 1`
  * `traffic_type: 'simulated'`
* In GA4 Explore or Looker Studio, configure a report filter:
  * Exclude `traffic_type = 'simulated'` OR `is_synthetic = 1`.

---

## 5. CAQG Quality Gate Audits

Run deterministic contract evaluation and GA4 Data API reconciliation:
```bash
# Dry run without opening GitHub issues
PYTHONPATH=caqg/src caqg/.venv/bin/python -m caqg.orchestration.runner --config caqg/config/properties.yml --property mart_ke --dry-run

# Run unit & contract tests
PYTHONPATH=caqg/src caqg/.venv/bin/python -m pytest caqg/tests/
```
Report snapshots and envelopes are preserved under `caqg/reports/mart_ke/`.

