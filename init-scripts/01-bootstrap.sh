#!/bin/bash
set -euo pipefail

echo "Running LocalStack init scripts..."

awslocal s3 mb s3://mart-assets || true
awslocal s3 mb s3://project-a-assets || true

awslocal sqs create-queue --queue-name mart-orders || true
awslocal sqs create-queue --queue-name project-a-events || true

awslocal dynamodb create-table \
  --table-name products \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST || true

awslocal sns create-topic --name payment-notifications || true

echo "LocalStack init complete."
