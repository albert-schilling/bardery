# Infrastructure

Terraform (`azurerm`) for everything on Azure, in `swedencentral` (ADR 0004).

| Folder          | What it manages                                                                                                                                                     | State file        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `bootstrap/`    | A script, not Terraform: resource group `bardery-tfstate` with the storage account that holds all Terraform state                                                   | —                 |
| `envs/shared/`  | Resource group `bardery-shared`: the `bardery.app` DNS zone and its records                                                                                         | `shared.tfstate`  |
| `envs/staging/` | Resource group `bardery-staging`: the Container Apps environment, the `web` app serving `apps/web` at `staging.bardery.app`, and its DNS records in the shared zone | `staging.tfstate` |
| `envs/prod/`    | Prod (not yet written)                                                                                                                                              | `prod.tfstate`    |

The state storage lives in its own resource group, outside Terraform, so no Terraform root can delete the state it runs on. It allows Entra ID access only (no account keys), keeps blob versions and soft-deleted blobs for 30 days, and has a delete lock.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux): `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash`
- [Terraform](https://developer.hashicorp.com/terraform/install) 1.16
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

   If `init` fails with a 403, the role assignment from step 2 hasn't applied yet. Wait a few minutes and retry.

4. **Delegate the domain.** At united-domains, open _bardery.app → Nameserver_, choose your own nameservers, and enter the four from the output. They look like `ns1-0X.azure-dns.com.`; enter them without the trailing dot. Delegation can take up to 48 hours to spread, usually much less. Check it with:

   ```sh
   curl -s 'https://dns.google/resolve?name=bardery.app&type=NS'
   ```

   Deleting the zone would give it new nameservers and break this delegation, so the zone has `prevent_destroy`.

5. **Email forwarding** (Q93). Switching to your own nameservers deactivates united-domains' email service and locks its forwarding settings ("Bereich gesperrt"). Reactivate the email service for the domain, then create the forwardings for `hello@`, `privacy@` and `security@` and confirm each one from the email it sends to the target inbox. The MX, SPF and DMARC records united-domains asks for are already in `envs/shared/main.tf`.

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs the checks and `terraform plan` (posted as a PR comment) on pull requests, and on merge to `main` applies `envs/staging` and deploys the web app. It signs in to Azure through OIDC: the Entra application `bardery-github-actions` in `envs/shared` has federated credentials for `main`, pull requests and the `staging` GitHub environment, so no Azure secret is stored. CI never applies `envs/shared`.

One-time setup, after the first `envs/staging` apply (the role assignment on `bardery-staging` needs that resource group to exist). A fresh install applies `envs/shared` once before staging, as in the setup above: that first apply creates the identity too, so pass `-var staging_exists=false` to it (step 3), and apply again as below once staging exists:

1. Apply the identity. Your `az login` needs permission to create Entra applications (Application Developer or higher):

   ```sh
   cd infra/envs/shared
   terraform init -upgrade   # adds the azuread provider to the lock file
   terraform apply
   terraform output github_actions
   ```

2. Add the three values as repository _variables_ (they aren't secrets): _Settings → Secrets and variables → Actions → Variables_: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
3. Create the GitHub environment `staging`: _Settings → Environments_. The deploy job runs in it, which is the `environment:staging` federated credential's subject.
4. Turn on secret scanning with push protection: _Settings → Advanced Security → Secret protection_, enable _Secret protection_ and _Push protection_.

The identity's roles: Contributor on `bardery-staging`, DNS Zone Contributor on the `bardery.app` zone and Storage Blob Data Contributor on the state account. Additions, all read-only and only so a `shared` plan can refresh its resources: Reader on `bardery-shared` and on the state account, and the Microsoft Graph `Application.Read.All` role (applying it needs admin consent, so your account needs Privileged Role Administrator or Global Administrator).

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
