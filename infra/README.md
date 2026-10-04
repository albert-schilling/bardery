# Infrastructure

Terraform (`azurerm`) for everything on Azure, in `swedencentral` (ADR 0004).

| Folder          | What it manages                                                                                                                                                                                                                                                      | State file        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `bootstrap/`    | A script, not Terraform: resource group `bardery-tfstate` with the storage account that holds all Terraform state                                                                                                                                                    | —                 |
| `envs/shared/`  | Resource group `bardery-shared`: the `bardery.app` DNS zone and its records                                                                                                                                                                                          | `shared.tfstate`  |
| `envs/staging/` | Resource group `bardery-staging`: the Container Apps environment, the Log Analytics workspace, the `web` app serving `apps/web` at `staging.bardery.app`, the `api` app serving `apps/server` at `api.staging.bardery.app`, and their DNS records in the shared zone | `staging.tfstate` |
| `envs/prod/`    | Prod (not yet written)                                                                                                                                                                                                                                               | `prod.tfstate`    |

The state storage lives in its own resource group, outside Terraform, so no Terraform root can delete the state it runs on. It allows Entra ID access only (no account keys), keeps blob versions and soft-deleted blobs for 30 days, and has a delete lock.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux): `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash`
- [Terraform](https://developer.hashicorp.com/terraform/install) 1.16 (CI pins the same minor)
- An Owner role on the subscription.

## One-time setup

1. Sign in and pick the subscription:

   ```sh
   az login
   export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
   ```

2. Create the state storage:

   ```sh
   infra/bootstrap/bootstrap.sh
   ```

   If the name `barderytfstate` is taken, pass another name as the first argument and change `storage_account_name` in every `versions.tf`.

3. Create the DNS zone:

   ```sh
   cd infra/envs/shared
   terraform init
   terraform apply -var staging_exists=false
   terraform output name_servers
   ```

   `staging_exists=false` skips the roles on the `bardery-staging` resource group, because `envs/staging` creates that group and needs this zone first, so it doesn't exist yet. Without it the apply fails on those roles. You apply `envs/shared` again, without the flag, after staging exists (_CI/CD_ below).

   If `init` fails with a 403, the role assignment from step 2 hasn't applied yet. Wait a few minutes and retry.

4. **Delegate the domain.** At united-domains, open _bardery.app → Nameserver_, choose your own nameservers, and enter the four from the output. They look like `ns1-0X.azure-dns.com.`; enter them without the trailing dot. Delegation can take up to 48 hours to spread, usually much less. Check it with:

   ```sh
   curl -s 'https://dns.google/resolve?name=bardery.app&type=NS'
   ```

   Deleting the zone would give it new nameservers and break this delegation, so the zone has `prevent_destroy`.

5. **Email forwarding** (Q93). Switching to your own nameservers deactivates united-domains' email service and locks its forwarding settings ("Bereich gesperrt"). Reactivate the email service for the domain, then create the forwardings for `hello@`, `privacy@` and `security@` and confirm each one from the email it sends to the target inbox. The MX, SPF and DMARC records united-domains asks for are already in `envs/shared/main.tf`.

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs the checks and `terraform plan` (posted as a PR comment) on pull requests, and on merge to `main` applies `envs/staging` and deploys the web app. It signs in to Azure through OIDC, so no Azure secret is stored. Two Entra applications in `envs/shared` keep pull requests away from write access: `bardery-github-actions` (credentials for `main` and the `staging` GitHub environment) applies and deploys, and `bardery-github-actions-plan` (credential for pull requests, read-only roles) only plans, since a pull request can change the workflow that runs it. CI never applies `envs/shared`.

One-time setup, after the first `envs/staging` apply (the role assignment on `bardery-staging` needs that resource group to exist). A fresh install applies `envs/shared` once before staging, as in the setup above: that first apply creates the identity too, so pass `-var staging_exists=false` to it (step 3), and apply again as below once staging exists:

1. Apply the identity. Your `az login` needs permission to create Entra applications (Application Developer or higher):

   ```sh
   cd infra/envs/shared
   terraform init -upgrade   # adds the azuread provider to the lock file
   terraform apply
   terraform output github_actions
   ```

2. Add the four values as repository _variables_ (they aren't secrets): _Settings → Secrets and variables → Actions → Variables_: `AZURE_CLIENT_ID`, `AZURE_PLAN_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
3. Create the GitHub environment `staging`: _Settings → Environments_. The deploy job runs in it, which is the `environment:staging` federated credential's subject. Under _Deployment branches and tags_, select _Selected branches and tags_ and allow only `main`, so a pull request can't use the write identity.
4. Turn on secret scanning with push protection: _Settings → Advanced Security → Secret protection_, enable _Secret protection_ and _Push protection_.

The write identity's roles: Contributor on `bardery-staging`, DNS Zone Contributor on the `bardery.app` zone and Storage Blob Data Contributor on the state account. The plan identity has only Reader on `bardery-shared`, `bardery-staging` and the state account, Storage Blob Data Reader on the state account, a custom role that only lists Container App secrets in `bardery-staging` (the azurerm provider needs it to refresh the app, so keep Container App secrets as Key Vault references, not values), and the Graph role; plans run with `-lock=false` because it can't write the state lock. The write identity also has these additions, read-only and only so a `shared` apply can refresh its resources: Reader on `bardery-shared` and on the state account, and the Microsoft Graph `Application.Read.All` role (applying it needs admin consent, so your account needs Privileged Role Administrator or Global Administrator).

## Review decisions (#25)

- **Apply (CI).** The deploy plans fresh, stops if the plan destroys or replaces anything, then applies that saved plan. It can't apply the plan from the pull request: that one came from the read-only identity, without the state lock, against a state that may have moved since. After a stop, read the plan and apply by hand.
- **Repeated values stay.** Backend blocks can't use variables, so the state account name stays in each `versions.tf` (a prod root copies the block and changes `key`). The repository's OIDC subject IDs and the state account ID live once each, in `locals` in `envs/shared/github.tf`.
- **`staging_exists` stays.** A root can't hold a role on a resource group another root hasn't created yet, and a data source would make every plan read it. It is a one-time switch for the first apply. Prod adds a `prod_exists` the same way.
- **Two identities stay.** The write identity trusts `main` and the `staging` environment only, the plan identity trusts `pull_request` and is read-only, because a pull request can change the workflow that runs it. Prod adds a `prod` environment credential and a Contributor role on its group to the write identity, never to the plan identity.
- **The secrets-lister role stays.** The azurerm provider lists Container App secrets on every refresh, which Reader doesn't allow. Scoped to staging, and prod needs another assignment of the same role. This is why Container App secrets are Key Vault references.
- **The Graph role stays.** `Application.Read.All` lets a `shared` plan refresh the Entra objects. CI never applies `shared`, so only the plan runs there, and the write identity has it only to match.
- **Lock files.** Each lock file should hold hashes for every platform in use. `terraform init` records only the current one, so after adding or upgrading a provider run, in each root: `terraform providers lock -platform=linux_amd64 -platform=linux_arm64 -platform=darwin_arm64 -platform=darwin_amd64 -platform=windows_amd64`. CI only needs `linux_amd64`, and Terraform accepts the registry's own checksums there, so a missing hash breaks developers, not CI.

## Staging

Q69 hosts `apps/web` on Static Web Apps, but its only EU region, `westeurope`, doesn't accept new customers. Until #22 moves it back, the `web` Container App serves it with nginx (`apps/web/Dockerfile`), from the public image `ghcr.io/albert-schilling/bardery-web` (GHCR, Q38).

1. **Push the first image**, because the Container App needs one to start. Log in to GHCR with the GitHub CLI's token, which needs the `write:packages` scope. From the repository root:

   ```sh
   gh auth refresh -s write:packages
   gh auth token | docker login ghcr.io -u albert-schilling --password-stdin
   pnpm nx build web
   docker build --platform linux/amd64 -t ghcr.io/albert-schilling/bardery-web:latest apps/web
   docker push ghcr.io/albert-schilling/bardery-web:latest
   ```

   If the push says `denied`, the token lacks the scope (rerun the refresh) or you aren't logged in (check with `grep ghcr.io ~/.docker/config.json`). Without the GitHub CLI, use a personal access token (classic) with `write:packages` instead; GHCR rejects fine-grained tokens. From #4 on, CI pushes the image with the workflow's own `GITHUB_TOKEN` (`permissions: packages: write`), so this login is needed only for hand deploys.

   Then make the package public, so Container Apps pulls it without credentials: on GitHub, open _Packages → bardery-web → Package settings → Change visibility_. Also grant the workflow push access to the package, since CI's `GITHUB_TOKEN` can't push to a package pushed with a personal token otherwise: in the same settings, under _Manage Actions access_, add `albert-schilling/bardery` with the _Write_ role.

2. **Create the environment**, once `envs/shared` is applied and the domain is delegated:

   ```sh
   cd infra/envs/staging
   terraform init
   terraform apply
   ```

   The custom domain waits until Container Apps sees the `asuid.staging` TXT record. It only registers the hostname: until a certificate is bound, `https://staging.bardery.app` fails with a connection reset.

3. **Bind a free managed certificate**, once, after the apply. This creates the certificate and binds it to the hostname, and takes a few minutes:

   ```sh
   az containerapp hostname bind --hostname staging.bardery.app -n web -g bardery-staging \
     --environment bardery-staging --validation-method CNAME
   ```

   Azure renews the certificate on its own. Terraform ignores the binding, so `terraform plan` stays clean.

4. **Deploy by hand** (CI does it since #4). Each deploy pushes an image tagged with the commit and points the app at it:

   ```sh
   pnpm nx build web
   TAG=ghcr.io/albert-schilling/bardery-web:$(git rev-parse --short HEAD)
   docker build --platform linux/amd64 -t "$TAG" apps/web
   docker push "$TAG"
   az containerapp update -n web -g bardery-staging --image "$TAG"
   ```

   Terraform ignores the image, so a deploy doesn't show up as drift. Since #4, CI does all of this on every merge to `main`; hand deploys are only for emergencies.

5. **Check it**: `https://staging.bardery.app` shows the page with a valid certificate, `https://staging.bardery.app/any/path` still serves it, and `terraform plan` shows no changes. The app scales to zero, so the first request after a quiet spell takes a few seconds.

`pnpm nx test-image web` builds the image and checks that deep links serve the app and missing assets return 404. CI runs it too.

## Staging api

The `api` Container App runs `apps/server` from the public image `ghcr.io/albert-schilling/bardery-server` at `https://api.staging.bardery.app`, with min 0 replicas and startup, liveness and readiness probes on `/health`. Logs go to the `bardery-staging` Log Analytics workspace.

**Who owns the image tag: CI.** Terraform sets only the first image (`:latest`) and ignores later changes (`ignore_changes` on the image), like the `web` app. On every merge to `main`, CI builds the image once, tags it with the commit SHA, pushes it to GHCR, attaches build provenance, points the app at it with `az containerapp update` and then checks that `/health` reports the merged commit SHA. So a deploy never shows up in `terraform plan`, and Terraform never rolls a deploy back. CI builds and pushes the image before the apply, because the first apply creates the app, which needs an image to start; it also pushes `latest` for that.

One-time setup, after the first CI push of the image:

1. Make the package public, so Container Apps pulls it without credentials: _Packages → bardery-server → Package settings → Change visibility_. Under _Manage Actions access_, add `albert-schilling/bardery` with the _Write_ role if the package was not created by CI. The first merge pushes the image but its apply may fail until the package is public.
2. Apply `envs/staging` (CI does it on merge). The custom domain waits for the `asuid.api.staging` TXT record.
3. Bind the managed certificate once; Azure renews it afterwards:

   ```sh
   az containerapp hostname bind --hostname api.staging.bardery.app -n api -g bardery-staging \
     --environment bardery-staging --validation-method CNAME
   ```

4. Check it: `curl https://api.staging.bardery.app/health` returns the deployed commit SHA as `version`, and `terraform plan` shows no changes.
