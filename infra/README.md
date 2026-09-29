# Infrastructure

Terraform (`azurerm`) for everything on Azure, in `swedencentral` (ADR 0004). The one exception is the Static Web App: the service isn't offered in `swedencentral`, so it runs in `westeurope`, its EU region.

| Folder          | What it manages                                                                                                                     | State file        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `bootstrap/`    | A script, not Terraform: resource group `bardery-tfstate` with the storage account that holds all Terraform state                   | —                 |
| `envs/shared/`  | Resource group `bardery-shared`: the `bardery.app` DNS zone and its records                                                         | `shared.tfstate`  |
| `envs/staging/` | Resource group `bardery-staging`: the Static Web App for `apps/web` at `staging.bardery.app`, and its DNS record in the shared zone | `staging.tfstate` |
| `envs/prod/`    | Prod (not yet written)                                                                                                              | `prod.tfstate`    |

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

1. Create the environment, once `envs/shared` is applied and the domain is delegated:

   ```sh
   cd infra/envs/staging
   terraform init
   terraform apply
   ```

   The custom domain waits until Static Web Apps has validated the `staging` CNAME, which can take several minutes. The certificate follows on its own, also within minutes.

2. **Deploy the web app by hand** until CI does it (#4). From the repository root:

   ```sh
   pnpm nx build web
   TOKEN=$(az staticwebapp secrets list --name bardery-staging-web --query properties.apiKey -o tsv)
   pnpm dlx @azure/static-web-apps-cli deploy apps/web/build/client --deployment-token "$TOKEN" --env production
   ```

   `--env production` targets the app's only environment; preview environments are turned off (Q73). `apps/web/public/staticwebapp.config.json` is copied into the build and makes every path fall back to `index.html`, so reloading a deep link works.

3. Check it: `https://staging.bardery.app` shows the page with a valid certificate, `https://staging.bardery.app/any/path` still serves it, and `terraform plan` shows no changes.
