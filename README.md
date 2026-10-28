# gitops-application

Node.js application demonstrating an end-to-end **CI/CD and GitOps delivery workflow** using GitHub Actions, Docker, GitHub Container Registry, Kubernetes (k3s), Argo CD and Flux CD.

This repository contains the **application and CI layer** of the project.

The Kubernetes manifests and GitOps configuration are maintained separately in:

**Deployment repository:**  
https://github.com/Asmaebl/gitops-deployment

---

## Architecture

```text
Developer
   │
   │ push to main
   ▼
┌──────────────────────────────┐
│      gitops-application      │
│                              │
│  Node.js / Hono application  │
│  Tests                       │
│  Dockerfile                  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        GitHub Actions        │
│                              │
│  npm ci                      │
│  npm test                    │
│  Docker build                │
│  Push image to GHCR          │
└──────────────┬───────────────┘
               │
               │ update image SHA
               ▼
┌──────────────────────────────┐
│       gitops-deployment      │
│                              │
│  Kubernetes desired state    │
│  Argo CD / Flux CD config    │
└──────────────┬───────────────┘
               │
               │ reconciliation
               ▼
┌──────────────────────────────┐
│      Argo CD / Flux CD       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         k3s cluster          │
│      Application Pods        │
└──────────────────────────────┘
```

A key design principle is that **GitHub Actions does not access the Kubernetes cluster directly**.

CI builds and publishes the application artifact, then updates the desired image version stored in Git. The GitOps controller running inside the cluster detects the Git change and reconciles the Kubernetes resources.

---

## Tech stack

- Node.js 22
- Hono
- Docker
- GitHub Actions
- GitHub Container Registry (GHCR)
- Kubernetes
- k3s
- Argo CD
- Flux CD
- Git

---

## Repository structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── app.js
│   └── server.js
├── test/
│   └── app.test.js
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

### Main components

| Path | Purpose |
| --- | --- |
| `src/app.js` | Hono application and HTTP routes |
| `src/server.js` | Node.js HTTP server entry point |
| `test/app.test.js` | Automated application tests |
| `Dockerfile` | Multi-stage container image definition |
| `.github/workflows/ci.yml` | CI and GitOps update workflow |
| `package.json` | Node.js dependencies and scripts |

---

## Requirements

For local development:

- Node.js >= 22
- npm
- Git

For local container testing:

- Docker

Verify the installed versions with:

```bash
node --version
npm --version
git --version
docker --version
```

---

## Clone the repository

```bash
git clone git@github.com:Asmaebl/gitops-application.git
cd gitops-application
```

Install the dependencies:

```bash
npm ci
```

---

## Run locally

Start the application with:

```bash
npm start
```

By default, the service listens on port `3000`.

It can be accessed at:

```text
http://localhost:3000
```

For development with automatic restart when source files change:

```bash
npm run dev
```

---

## Automated tests

The project uses the Node.js built-in test runner.

Run the complete test suite with:

```bash
npm test
```

The test suite validates:

- the main application endpoint
- the liveness endpoint
- the readiness endpoint
- the behaviour of unknown routes

A successful run should finish with all tests passing.

---

## HTTP endpoints

| Endpoint | Purpose | Expected response |
| --- | --- | --- |
| `/` | Application and runtime information | JSON |
| `/version` | Application version and Git revision | JSON |
| `/healthz` | Kubernetes liveness endpoint | `ok` |
| `/readyz` | Kubernetes readiness endpoint | `ready` |

### Main endpoint

```bash
curl http://localhost:3000/
```

The endpoint reports information about the running application instance.

### Version endpoint

```bash
curl http://localhost:3000/version
```

Example during local development:

```json
{
  "version": "0.1.0",
  "commit": "dev"
}
```

Images produced by CI receive the Git commit SHA at build time.

Example for a CI-built image:

```json
{
  "version": "0.1.0",
  "commit": "<git-commit-sha>"
}
```

This provides traceability between the source code, container image and deployed workload.

### Health endpoint

```bash
curl http://localhost:3000/healthz
```

Expected response:

```text
ok
```

### Readiness endpoint

```bash
curl http://localhost:3000/readyz
```

Expected response:

```text
ready
```

The `/healthz` and `/readyz` endpoints are used by Kubernetes probes in the deployment manifests.

---

## Environment variables

| Variable | Description | Default / source |
| --- | --- | --- |
| `PORT` | HTTP server port | `3000` |
| `GIT_SHA` | Git revision associated with the image | `dev` locally |
| `POD_NAME` | Name of the Kubernetes Pod | Kubernetes |
| `POD_NAMESPACE` | Kubernetes namespace | Kubernetes |
| `NODE_NAME` | Kubernetes node hosting the Pod | Kubernetes |

Runtime Kubernetes information is injected by the deployment configuration stored in the GitOps repository.

`GIT_SHA` is injected during the Docker build so that the running application can expose its source revision through `/version`.

---

## Docker

The application is packaged using a multi-stage Dockerfile.

### Build locally

```bash
docker build \
  --build-arg GIT_SHA="$(git rev-parse HEAD)" \
  -t gitops-application:dev .
```

### Run locally

```bash
docker run --rm \
  -p 3000:3000 \
  gitops-application:dev
```

The application can then be tested with:

```bash
curl http://localhost:3000/
curl http://localhost:3000/version
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
```

### Container security

The runtime stage executes the application as the non-root `node` user.

The image contains only the dependencies required to run the application.

---

## GitHub Container Registry

GitHub Actions publishes application images to:

```text
ghcr.io/asmaebl/gitops-application:<git-sha>
```

Images use an immutable Git SHA tag rather than a mutable deployment tag.

Example:

```text
ghcr.io/asmaebl/gitops-application:<full-commit-sha>
```

This provides traceability between:

```text
Git commit
    ↓
Container image
    ↓
GitOps desired state
    ↓
Running application
```

The same revision can also be observed through the application's `/version` endpoint.

---

## Continuous Integration

The CI workflow is defined in:

```text
.github/workflows/ci.yml
```

It runs on pushes to the `main` branch.

The pipeline performs the following sequence:

```text
Push to main
      │
      ▼
Checkout source
      │
      ▼
Setup Node.js 22
      │
      ▼
npm ci
      │
      ▼
npm test
      │
      ▼
Authenticate to GHCR
      │
      ▼
Build Docker image
      │
      ▼
Push image tagged with Git SHA
      │
      ▼
Clone gitops-deployment
      │
      ▼
Update deployment image tag
      │
      ▼
Commit and push GitOps change
```

### Image build

The image is built and pushed as:

```text
ghcr.io/asmaebl/gitops-application:${GITHUB_SHA}
```

The same Git SHA is passed to the Docker build through:

```text
GIT_SHA=${GITHUB_SHA}
```

This makes the application revision visible at runtime.

### Updating the GitOps repository

After publishing the image, CI updates:

```text
base/deployment.yaml
```

inside:

```text
Asmaebl/gitops-deployment
```

with the newly generated image tag.

The update is committed automatically by:

```text
github-actions[bot]
```

and pushed to the `main` branch of the GitOps repository.

From this point onward, deployment is handled by the GitOps controller rather than GitHub Actions.

---

## CI security model

The CI pipeline intentionally does **not** contain credentials for the Kubernetes cluster.

GitHub Actions requires only the permissions and credentials necessary to:

1. read the application repository;
2. publish the image to GHCR;
3. update the GitOps repository.

GHCR authentication uses the GitHub Actions `GITHUB_TOKEN`.

Access to the GitOps repository is provided through a dedicated SSH deploy key stored as the GitHub Actions secret:

```text
GITOPS_DEPLOY_KEY
```

The corresponding public deploy key is configured on `gitops-deployment` with write access.

Sensitive credentials are not committed to the repository.

The architecture follows:

```text
CI
 │
 ▼
Git
 │
 ▼
GitOps Controller
 │
 ▼
Kubernetes
```

rather than:

```text
CI
 │
 ▼
Kubernetes
```

This separation keeps deployment credentials inside the cluster and preserves the GitOps model.

---

## GitOps deployment

The desired Kubernetes state is stored in:

**https://github.com/Asmaebl/gitops-deployment**

The GitOps repository contains:

- Kubernetes Deployment configuration
- Kubernetes Service configuration
- container image reference
- liveness and readiness probes
- runtime configuration
- Argo CD configuration
- Flux CD configuration

The project evaluates two GitOps controllers.

### Argo CD

Argo CD was configured to reconcile the Kubernetes manifests from the GitOps repository.

Automated synchronization, pruning and self-healing were enabled.

A self-healing test was performed by manually changing the live Deployment replica count.

Argo CD detected the drift and restored the replica count declared in Git.

### Flux CD

Flux CD was bootstrapped against the same GitOps repository.

A Flux `GitRepository` provides the Git source and a Flux `Kustomization` reconciles the application manifests.

Automated reconciliation and self-healing were also validated with Flux.

> Argo CD and Flux CD were evaluated successively. They were not used simultaneously to manage the same application resources.

---

## Self-healing

Git remains the source of truth for the cluster.

For example, changing the live replica count manually introduces configuration drift:

```bash
kubectl scale deployment gitops-application --replicas=1
```

When Git still declares two replicas, the active GitOps controller detects the difference and restores the desired state automatically.

This behaviour was validated with both Argo CD and Flux CD during the project.

---

## Rollback strategy

Rollback is performed through Git history instead of manually modifying running Kubernetes resources.

A rollback scenario was tested by:

1. adding a temporary application endpoint;
2. running the automated tests;
3. pushing the change;
4. allowing CI to build and publish a new image;
5. allowing GitOps to deploy the new version;
6. verifying the new endpoint;
7. reverting the application commit;
8. pushing the revert commit;
9. allowing the normal CI/GitOps pipeline to deploy the reverted state;
10. verifying that the previous application behaviour was restored.

The rollback command follows the standard Git workflow:

```bash
git revert <commit>
git push portfolio main
```

`git revert` creates a new commit that reverses the selected change without rewriting published Git history.

The revert follows the same delivery path as any normal application change:

```text
git revert
    ↓
GitHub Actions
    ↓
Automated tests
    ↓
New container image
    ↓
GitOps repository update
    ↓
GitOps reconciliation
    ↓
Reverted application state
```

This keeps Git as the source of truth throughout the rollback process.

---

## Argo CD and Flux CD evaluation

Both GitOps solutions successfully reconciled the application during the project.

The evaluation focused on:

- installation and configuration
- Git reconciliation
- automatic synchronization
- self-healing
- rollback workflow
- operational visibility
- Kubernetes integration
- resource footprint

### Argo CD

Argo CD provides an application-oriented model and an integrated web interface useful for visualizing:

- application resources
- synchronization state
- health status
- configuration drift

### Flux CD

Flux CD provides a Kubernetes-native controller model centered around resources such as:

- `GitRepository`
- `Kustomization`

Both solutions were successfully tested in the project.

---

## Reproducing the complete deployment

This repository contains only the application and CI part of the project.

To reproduce the complete environment:

1. Clone `gitops-application`.
2. Install the dependencies.
3. Run the automated tests.
4. Build and test the container image.
5. Prepare a k3s cluster.
6. Clone `gitops-deployment`.
7. Configure GHCR access if the image is private.
8. Install Argo CD or Flux CD.
9. Configure access to the GitOps repository.
10. Reconcile the Kubernetes manifests.
11. Verify the Deployment, Pods and Service.
12. Test `/healthz`, `/readyz` and `/version`.

The Kubernetes and GitOps configuration is maintained in:

**https://github.com/Asmaebl/gitops-deployment**

---

## Useful commands

Run tests:

```bash
npm test
```

Start locally:

```bash
npm start
```

Build the container:

```bash
docker build \
  --build-arg GIT_SHA="$(git rev-parse HEAD)" \
  -t gitops-application:dev .
```

Run the container:

```bash
docker run --rm \
  -p 3000:3000 \
  gitops-application:dev
```

Check the application:

```bash
curl http://localhost:3000/
curl http://localhost:3000/version
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
```

---

## Related repository

### Kubernetes and GitOps configuration

**gitops-deployment**

https://github.com/Asmaebl/gitops-deployment

---

## Project goal

This project demonstrates the complete path from a source-code change to a Kubernetes workload managed through GitOps:

```text
Application change
      ↓
Automated tests
      ↓
Docker image
      ↓
GitHub Container Registry
      ↓
GitOps repository update
      ↓
Argo CD / Flux CD
      ↓
Kubernetes reconciliation
      ↓
Running application
```

The project keeps **Git as the source of truth**, separates CI from cluster deployment and demonstrates automated delivery, traceability, self-healing and Git-based rollback.