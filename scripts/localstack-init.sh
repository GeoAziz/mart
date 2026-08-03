#!/bin/bash
# LocalStack initialization script
# Creates queues, buckets, and tables needed for local development

set -e

echo "Initializing LocalStack resources..."

# S3 Buckets
echo "Creating S3 buckets..."
awslocal s3 mb s3://mart-uploads || true
awslocal s3 mb s3://mart-assets || true
awslocal s3 mb s3://mart-backups || true

# DynamoDB Tables
echo "Creating DynamoDB tables..."

# Sessions table
awslocal dynamodb create-table \
  --table-name sessions \
  --attribute-definitions AttributeName=sessionId,AttributeType=S \
  --key-schema AttributeName=sessionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST || true

# Cache table
awslocal dynamodb create-table \
  --table-name cache \
  --attribute-definitions AttributeName=cacheKey,AttributeType=S \
  --key-schema AttributeName=cacheKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --time-to-live-specification Enabled=true,AttributeName=ttl || true

# SQS Queues (FIFO for guaranteed ordering)
echo "Creating SQS queues..."

# Order queue
awslocal sqs create-queue \
  --queue-name order-queue.fifo \
  --attributes 'FifoQueue=true,ContentBasedDeduplication=true,VisibilityTimeout=300,MessageRetentionPeriod=1209600' || true

# Product queue
awslocal sqs create-queue \
  --queue-name product-queue.fifo \
  --attributes 'FifoQueue=true,ContentBasedDeduplication=true,VisibilityTimeout=300,MessageRetentionPeriod=1209600' || true

# Payment queue
awslocal sqs create-queue \
  --queue-name payment-queue.fifo \
  --attributes 'FifoQueue=true,ContentBasedDeduplication=true,VisibilityTimeout=300,MessageRetentionPeriod=1209600' || true

# Notification queue
awslocal sqs create-queue \
  --queue-name notification-queue.fifo \
  --attributes 'FifoQueue=true,ContentBasedDeduplication=true,VisibilityTimeout=300,MessageRetentionPeriod=1209600' || true

# SNS Topics
echo "Creating SNS topics..."

awslocal sns create-topic --name orders || true
awslocal sns create-topic --name products || true
awslocal sns create-topic --name payments || true
awslocal sns create-topic --name notifications || true

echo "LocalStack initialization complete!"
echo ""
echo "Resources created:"
echo "- S3 Buckets: mart-uploads, mart-assets, mart-backups"
echo "- DynamoDB: sessions, cache"
echo "- SQS Queues: order-queue.fifo, product-queue.fifo, payment-queue.fifo, notification-queue.fifo"
echo "- SNS Topics: orders, products, payments, notifications"
