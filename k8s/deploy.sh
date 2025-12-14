#!/bin/bash
set -e

# Configuration
REGISTRY="registry.im-si.org"
NAMESPACE="selectchatgpt"
STATIC_NAMESPACE="static-sites"
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
                echo "  --web     Build and deploy web static files"
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
    kubectl set image deployment/server server=$REGISTRY/selectchatgpt-server:$TAG -n $NAMESPACE
    kubectl rollout status deployment/server -n $NAMESPACE --timeout=120s
fi

# Deploy Web (static files to shared nginx)
if [ "$DEPLOY_WEB" = true ]; then
    echo "==> Building web static files..."
    cd "$PROJECT_DIR"
    NEXT_PUBLIC_API_URL=https://selectchatgpt.im-si.org \
    NEXT_PUBLIC_GA_ID=G-QTQ15S85X2 \
    pnpm --filter select-chatgpt-web build

    echo "==> Deploying to static-nginx..."
    POD=$(kubectl get pod -n $STATIC_NAMESPACE -l app=static-nginx -o jsonpath='{.items[0].metadata.name}')
    if [ -z "$POD" ]; then
        echo "Error: static-nginx pod not found in $STATIC_NAMESPACE namespace"
        exit 1
    fi

    # Use tar to preserve special characters in paths (e.g., [[...id]])
    kubectl exec -n $STATIC_NAMESPACE "$POD" -- rm -rf /var/www/selectchatgpt
    kubectl exec -n $STATIC_NAMESPACE "$POD" -- mkdir -p /var/www/selectchatgpt
    tar -cf - -C "$PROJECT_DIR/web/out" . | kubectl exec -i -n $STATIC_NAMESPACE "$POD" -- tar -xf - -C /var/www/selectchatgpt/

    echo "==> Web deployment complete (static files copied)"
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
echo ""
kubectl get pods -n $STATIC_NAMESPACE -l app=static-nginx
