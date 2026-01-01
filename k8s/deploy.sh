#!/bin/bash
set -e

# Configuration
REGISTRY="registry.jiun.dev"
NAMESPACE="selectchatgpt"
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

# Get script and project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get git commit hash for image tag
TAG=$(git -C "$PROJECT_DIR" rev-parse --short HEAD)

echo "=== SelectChatGPT K8s Deployment ==="
echo "Image tag: $TAG"
echo "KUBECONFIG: $KUBECONFIG"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Parse arguments
DEPLOY_SERVER=false
DEPLOY_WEB=false
APPLY_MANIFESTS=false

if [ $# -eq 0 ]; then
    # No arguments: do everything
    DEPLOY_SERVER=true
    DEPLOY_WEB=true
    APPLY_MANIFESTS=true
else
    for arg in "$@"; do
        case $arg in
            --server)
                DEPLOY_SERVER=true
                ;;
            --web)
                DEPLOY_WEB=true
                ;;
            --apply)
                APPLY_MANIFESTS=true
                ;;
            --help)
                echo "Usage: $0 [--server] [--web] [--apply]"
                echo "  --server  Build and deploy server"
                echo "  --web     Build and deploy web"
                echo "  --apply   Apply k8s manifests only"
                echo "  (no args) Do everything"
                exit 0
                ;;
        esac
    done
fi

# Deploy Server
if [ "$DEPLOY_SERVER" = true ]; then
    echo "==> Building server image..."
    docker build --platform linux/amd64 \
        -t $REGISTRY/selectchatgpt-server:$TAG \
        -t $REGISTRY/selectchatgpt-server:latest \
        "$PROJECT_DIR/server"

    echo "==> Pushing server image..."
    docker push $REGISTRY/selectchatgpt-server:$TAG
    docker push $REGISTRY/selectchatgpt-server:latest

    echo "==> Updating server deployment..."
    kubectl set image deployment/server server=$REGISTRY/selectchatgpt-server:$TAG -n $NAMESPACE || true
    kubectl rollout status deployment/server -n $NAMESPACE --timeout=120s || true
fi

# Deploy Web
if [ "$DEPLOY_WEB" = true ]; then
    echo "==> Building web image..."
    docker build --platform linux/amd64 \
        -t $REGISTRY/selectchatgpt-web:$TAG \
        -t $REGISTRY/selectchatgpt-web:latest \
        --build-arg NEXT_PUBLIC_API_URL=https://selectchatgpt.jiun.dev \
        --build-arg NEXT_PUBLIC_GA_ID=G-QTQ15S85X2 \
        -f "$PROJECT_DIR/web/Dockerfile" \
        "$PROJECT_DIR"

    echo "==> Pushing web image..."
    docker push $REGISTRY/selectchatgpt-web:$TAG
    docker push $REGISTRY/selectchatgpt-web:latest

    echo "==> Updating web deployment..."
    kubectl set image deployment/web web=$REGISTRY/selectchatgpt-web:$TAG -n $NAMESPACE || true
    kubectl rollout status deployment/web -n $NAMESPACE --timeout=120s || true
fi

# Apply manifests only
if [ "$APPLY_MANIFESTS" = true ]; then
    echo "==> Applying k8s manifests..."
    kubectl apply -k "$SCRIPT_DIR"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Version: $TAG"
echo ""
kubectl get pods -n $NAMESPACE
