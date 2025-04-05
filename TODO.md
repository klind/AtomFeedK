# Kubernetes Cluster Restart Checklist

## 1. Initial Cluster Setup
- [ ] Navigate to terraform directory: `cd terraform-eks-split`
- [ ] Initialize if needed: `terraform init`
- [ ] Apply Terraform: `terraform apply`
- [ ] Configure kubectl: `aws eks update-kubeconfig --name your-cluster-name --region eu-north-1`
- [ ] Verify connection: `kubectl get nodes`

## 2. Container Images
- [ ] Ensure frontend Dockerfile has correct API URL:
  ```dockerfile
  # In frontend/Dockerfile
  ARG REACT_APP_API_URL=http://hcm-developer-util-backend
  ```
- [ ] Build frontend image:
  ```bash
  cd frontend
  docker build --build-arg REACT_APP_API_URL=http://hcm-developer-util-backend -t 084828595145.dkr.ecr.eu-north-1.amazonaws.com/hcm-developer-util-frontend:latest .
  ```
- [ ] Build backend image:
  ```bash
  cd backend
  docker build -t 084828595145.dkr.ecr.eu-north-1.amazonaws.com/hcm-developer-util-backend:latest .
  ```
- [ ] Login to ECR:
  ```bash
  aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 084828595145.dkr.ecr.eu-north-1.amazonaws.com
  ```
- [ ] Push images:
  ```bash
  docker push 084828595145.dkr.ecr.eu-north-1.amazonaws.com/hcm-developer-util-frontend:latest
  docker push 084828595145.dkr.ecr.eu-north-1.amazonaws.com/hcm-developer-util-backend:latest
  ```

## 3. Configuration Review
- [ ] Check backend deployment for health check path:
  ```yaml
  # In k8s/backend-deployment.yaml, ingress section:
  alb.ingress.kubernetes.io/healthcheck-path: "/api-docs"  # NOT /health
  ```
- [ ] Ensure frontend config correctly loads from backend URL:
  ```yaml
  # In k8s/frontend-deployment.yaml, verify environment variables
  - name: REACT_APP_ENVIRONMENT
    value: "dev"
  ```

## 4. Deploy Applications
- [ ] Deploy backend: `kubectl apply -f k8s/backend-deployment.yaml`
- [ ] Verify backend pods: `kubectl get pods -l app=hcm-developer-util-backend`
- [ ] Deploy frontend: `kubectl apply -f k8s/frontend-deployment.yaml`
- [ ] Verify frontend pods: `kubectl get pods -l app=hcm-developer-util-frontend`
- [ ] Check ingress resources: `kubectl get ingress`
- [ ] Wait for ALB addresses to populate (can take 3-5 minutes)

## 5. Verification
- [ ] Test backend health check: `kubectl port-forward svc/hcm-developer-util-backend 5000:80` then visit http://localhost:5000/api-docs
- [ ] Access frontend through ALB URL: http://<frontend-ingress-address>
- [ ] Check browser console for API connectivity errors
- [ ] Verify frontend can load data from backend

## 6. Local Development
If you need to work locally with port-forwarding:
- [ ] Forward backend with correct port mapping:
  ```bash
  kubectl port-forward deployment/hcm-developer-util-backend 5000:5000
  ```
- [ ] Forward frontend:
  ```bash
  kubectl port-forward deployment/hcm-developer-util-frontend 8080:80
  ```
- [ ] Access at http://localhost:8080

## 7. Future Environment Improvements
Consider implementing:
- [ ] Runtime configuration injection for frontend to avoid rebuilding images
- [ ] Kubernetes ConfigMaps for environment-specific settings
- [ ] Separate dev/staging/prod configuration files

## 8. Cluster Shutdown
When finished:
- [ ] Scale down to save costs: 
  ```bash
  kubectl scale deployment hcm-developer-util-frontend --replicas=0
  kubectl scale deployment hcm-developer-util-backend --replicas=0
  ```
- [ ] Or destroy completely: `cd terraform-eks-split && terraform destroy`

## Notes
- Backend health checks use `/api-docs` NOT `/health`
- Frontend hardcodes API URL during build time, not at runtime
- ALB provisioning can take several minutes
- For local development, you need both port-forwards (backend on 5000, frontend on another port) 