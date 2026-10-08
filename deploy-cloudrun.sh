#!/usr/bin/env bash
set -e

echo "========================================================"
echo "       GitRoast - Google Cloud Run Deployment"
echo "========================================================"
echo ""

# Verify gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: 'gcloud' CLI is not found in PATH."
    echo "Please run this inside Google Cloud Shell or install Google Cloud SDK."
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
fi

REGION="us-central1"
read -p "Enter deployment region (default: us-central1): " USER_REGION
if [ -n "$USER_REGION" ]; then
    REGION="$USER_REGION"
fi

echo ""
echo "🚀 Deploying GitRoast container to Cloud Run..."
echo "Project: $PROJECT_ID | Region: $REGION"
echo ""

gcloud run deploy gitroast \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars ENABLE_OFFLINE_AI_FALLBACK=True

echo ""
echo "🎉 GitRoast successfully deployed! Anyone can access the generated HTTPS URL on any device worldwide."
