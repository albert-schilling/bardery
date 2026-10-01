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
   terraform apply
   terraform output name_servers
   ```

   If `init` fails with a 403, the role assignment from step 2 hasn't applied yet. Wait a few minutes and retry.

4. **Delegate the domain.** At united-domains, open _bardery.app → Nameserver_, choose your own nameservers, and enter the four from the output. They look like `ns1-0X.azure-dns.com.`; enter them without the trailing dot. Delegation can take up to 48 hours to spread, usually much less. Check it with:

   ```sh
   curl -s 'https://dns.google/resolve?name=bardery.app&type=NS'
   ```

   Deleting the zone would give it new nameservers and break this delegation, so the zone has `prevent_destroy`.

5. **Email forwarding** (Q93). Switching to your own nameservers deactivates united-domains' email service and locks its forwarding settings ("Bereich gesperrt"). Reactivate the email service for the domain, then create the forwardings for `hello@`, `privacy@` and `security@` and confirm each one from the email it sends to the target inbox. The MX, SPF and DMARC records united-domains asks for are already in `envs/shared/main.tf`.

## Staging

Q69 hosts `apps/web` on Static Web Apps, but its only EU region, `westeurope`, doesn't accept new customers. Until #22 moves it back, the `web` Container App serves it with nginx (`apps/web/Dockerfile`), from the public image `ghcr.io/albert-schilling/bardery-web` (GHCR, Q38).

1. **Push the first image**, because the Container App needs one to start. Create a GitHub personal access token (classic) with `write:packages`, then, from the repository root:

   ```sh
   echo "$GITHUB_TOKEN" | docker login ghcr.io -u albert-schilling --password-stdin
   pnpm nx build web
   docker build --platform linux/amd64 -t ghcr.io/albert-schilling/bardery-web:latest apps/web
   docker push ghcr.io/albert-schilling/bardery-web:latest
   ```

   Then make the package public, so Container Apps pulls it without credentials: on GitHub, open _Packages → bardery-web → Package settings → Change visibility_.

2. **Create the environment**, once `envs/shared` is applied and the domain is delegated:

   ```sh
   cd infra/envs/staging
   terraform init
   terraform apply
   ```

   The custom domain waits until Container Apps sees the `asuid.staging` TXT record, and the managed certificate takes a few more minutes.

3. **Deploy by hand** until CI does it (#4). Each deploy pushes an image tagged with the commit and points the app at it:

   ```sh
   pnpm nx build web
   TAG=ghcr.io/albert-schilling/bardery-web:$(git rev-parse --short HEAD)
   docker build --platform linux/amd64 -t "$TAG" apps/web
   docker push "$TAG"
   az containerapp update -n web -g bardery-staging --image "$TAG"
   ```

   Terraform ignores the image, so a deploy doesn't show up as drift.

4. **Check it**: `https://staging.bardery.app` shows the page with a valid certificate, `https://staging.bardery.app/any/path` still serves it, and `terraform plan` shows no changes. The app scales to zero, so the first request after a quiet spell takes a few seconds.

`pnpm nx test-image web` builds the image and checks that deep links serve the app and missing assets return 404. CI runs it too.
