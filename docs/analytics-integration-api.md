# Analytics Integration API Documentation

## Endpoints

### Export Data
```http
POST /api/vendors/me/analytics/integrations
Content-Type: application/json

{
    "action": "export",
    "format": "csv" | "json" | "xlsx",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z"
}
```

### Import Data
```http
POST /api/vendors/me/analytics/integrations
Content-Type: application/json

{
    "action": "import",
    "provider": "string",
    "data": [
        {
            "timestamp": number,
            "metrics": {
                "sales": number,
                "revenue": number,
                "visitors": number
            }
        }
    ]
}
```

### Connect to Third-party
```http
POST /api/vendors/me/analytics/integrations
Content-Type: application/json

{
    "action": "connect",
    "provider": "google-analytics" | "mixpanel",
    "credentials": {
        // Provider-specific credentials
    }
}
```

### Custom Report
```http
POST /api/vendors/me/analytics/integrations
Content-Type: application/json

{
    "action": "customReport",
    "config": {
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z",
        "filters": [
            {
                "field": "string",
                "operator": "eq" | "gt" | "lt",
                "value": number
            }
        ],
        "aggregations": [
            {
                "field": "string",
                "function": "sum" | "avg" | "min" | "max"
            }
        ]
    }
}
```

## WebSocket Integration

For real-time updates, connect to:
```
ws://localhost:8080
```

Messages are sent in JSON format:
```json
{
    "type": "import" | "update",
    "source": "string",
    "count": number
}
```
