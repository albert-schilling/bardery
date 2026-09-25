# Infrastructure

Terraform (`azurerm`) for everything on Azure, in `swedencentral` (ADR 0004).

| Folder | What it manages | State file |
|---|---|---|
| `bootstrap/` | A script, not Terraform: resource group `bardery-tfstate` with the storage account that holds all Terraform state | — |
| `envs/shared/` | Resource group `bardery-shared`: the `bardery.app` DNS zone and its records | `shared.tfstate` |
| `envs/staging/`, `envs/prod/` | One environment each (not yet written) | `staging.tfstate`, `prod.tfstate` |

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

4. **Delegate the domain.** At united-domains, open *bardery.app → Nameserver*, choose your own nameservers, and enter the four from the output. They look like `ns1-0X.azure-dns.com.`; enter them without the trailing dot. Delegation can take up to 48 hours to spread, usually much less. Check it with:

   ```sh
   curl -s 'https://dns.google/resolve?name=bardery.app&type=NS'
   ```

   Deleting the zone would give it new nameservers and break this delegation, so the zone has `prevent_destroy`.

5. **Email forwarding** (Q93). Once the delegation is live, create the forwardings for `hello@`, `privacy@` and `security@` in united-domains' email settings, and confirm each one from the email it sends to the target inbox. The MX records they need are already in `envs/shared/main.tf`.
