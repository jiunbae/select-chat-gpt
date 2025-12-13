#!/bin/bash
set -e

# Configuration
REGISTRY="registry.im-si.org"
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
BUILD_IMAGES=false
APPLY_MANIFESTS=false

if [ $# -eq 0 ]; then
    # No arguments: do everything
    BUILD_IMAGES=true
    APPLY_MANIFESTS=true
else
    for arg in "$@"; do
        case $arg in
            --build)
                BUILD_IMAGES=true
                ;;
            --apply)
                APPLY_MANIFESTS=true
                ;;
            --help)
                echo "Usage: $0 [--build] [--apply]"
                echo "  --build   Build and push Docker images"
                echo "  --apply   Apply k8s manifests and update deployments"
                echo "  (no args) Do both build and apply"
                exit 0
                ;;
        esac
    done
fi

# Build and push images
if [ "$BUILD_IMAGES" = true ]; then
    echo "==> Building images..."

    # Server 빌드
    docker build --platform linux/amd64 \
        -t $REGISTRY/selectchatgpt-server:$TAG \
        -t $REGISTRY/selectchatgpt-server:latest \
        "$PROJECT_DIR/server"

    # Web 빌드 (루트 컨텍스트에서 web/Dockerfile 사용 - pnpm workspace 구조)
    docker build --platform linux/amd64 \
        --build-arg NEXT_PUBLIC_API_URL=https://selectchatgpt.im-si.org \
        --build-arg NEXT_PUBLIC_GA_ID=G-QTQ15S85X2 \
        -f "$PROJECT_DIR/web/Dockerfile" \
        -t $REGISTRY/selectchatgpt-web:$TAG \
        -t $REGISTRY/selectchatgpt-web:latest \
        "$PROJECT_DIR"

    echo "==> Pushing images..."
    docker push $REGISTRY/selectchatgpt-server:$TAG
    docker push $REGISTRY/selectchatgpt-server:latest
    docker push $REGISTRY/selectchatgpt-web:$TAG
    docker push $REGISTRY/selectchatgpt-web:latest
fi

# Apply manifests and update deployments
if [ "$APPLY_MANIFESTS" = true ]; then
    echo "==> Applying k8s manifests..."
    kubectl apply -k "$SCRIPT_DIR"

    echo "==> Updating deployments with new image tag..."
    kubectl set image deployment/server server=$REGISTRY/selectchatgpt-server:$TAG -n $NAMESPACE
    kubectl set image deployment/web web=$REGISTRY/selectchatgpt-web:$TAG -n $NAMESPACE

    echo "==> Waiting for rollout..."
    kubectl rollout status deployment/server -n $NAMESPACE --timeout=120s
    kubectl rollout status deployment/web -n $NAMESPACE --timeout=120s

    echo ""
    echo "=== Deployment Complete ==="
    echo "Version: $TAG"
    echo ""
    kubectl get pods -n $NAMESPACE
    echo ""
    kubectl get svc -n $NAMESPACE
fi
