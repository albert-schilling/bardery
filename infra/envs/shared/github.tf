# The identities GitHub Actions uses to reach Azure (Q41): one that writes, for trusted runs on
# main, and one that only reads, for pull requests. It lives here, not in CI's own roots,
# because CI can't create its own identity: you apply this root by hand (infra/README.md).
# Federated credentials mean no secret is stored anywhere.

locals {
  # This repository's OIDC subject claim carries immutable owner and repository IDs, not just
  # names (e.g. `repo:albert-schilling@59568178/bardery@1383190090:pull_request`), and Entra
  # matches the subject exactly. Find the format a run presents in the AADSTS700213 error.
  repository = "albert-schilling@59568178/bardery@1383190090"

  # Not a data source or a reference: this root creates the roles on it before it exists
  # (staging_exists), and a plan would need read access to look it up.
  staging_scope = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/bardery-staging"
}

data "azurerm_client_config" "current" {}

resource "azuread_application" "github" {
  display_name = "bardery-github-actions"
}

resource "azuread_service_principal" "github" {
  client_id = azuread_application.github.client_id
}

# A workflow job gets one subject, chosen by how it runs: a job with `environment:` gets the
# environment subject only. This identity can write, so it only trusts main and the `staging`
# environment, whose deployment branches must be limited to main (infra/README.md).
resource "azuread_application_federated_identity_credential" "github" {
  for_each = {
    main    = "ref:refs/heads/main"
    staging = "environment:staging"
  }

  application_id = azuread_application.github.id
  display_name   = "github-${each.key}"
  description    = "GitHub Actions on ${each.key}"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${local.repository}:${each.value}"
}

# Created by envs/staging, which needs the DNS zone from this root first. So the first apply of
# this root sets staging_exists=false, and the next one (after staging) leaves it true.
variable "staging_exists" {
  description = "Whether envs/staging has been applied. Set false for the first apply of this root."
  type        = bool
  default     = true
}

# Applies and deploys staging.
resource "azurerm_role_assignment" "github_staging" {
  count = var.staging_exists ? 1 : 0

  scope                = local.staging_scope
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.github.object_id
}

locals {
  # Built from the name, not read with a data source: a plan would then need read access to it.
  state_account_id = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/bardery-tfstate/providers/Microsoft.Storage/storageAccounts/barderytfstate"
}

# Staging's DNS records live in the shared zone.
resource "azurerm_role_assignment" "github_dns" {
  scope                = azurerm_dns_zone.bardery.id
  role_definition_name = "DNS Zone Contributor"
  principal_id         = azuread_service_principal.github.object_id
}

# The state storage allows Entra ID access only, so every `terraform` run needs this.
resource "azurerm_role_assignment" "github_state" {
  scope                = local.state_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_service_principal.github.object_id
}

# Beyond the issue's list, so the shared plan can refresh the state account's role assignment:
# Storage Blob Data Contributor reads blobs only, not the account or its role assignments.
resource "azurerm_role_assignment" "github_state_reader" {
  scope                = local.state_account_id
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.github.object_id
}

# Beyond the issue's list: `terraform plan` on `shared` refreshes the resource group, which
# neither DNS Zone Contributor (zone only) nor Contributor on staging covers. Read-only, one group.
resource "azurerm_role_assignment" "github_shared_reader" {
  scope                = azurerm_resource_group.shared.id
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.github.object_id
}

# Beyond the issue's list: the shared plan also refreshes the Entra application, service principal
# and credentials through Microsoft Graph, which Azure roles don't cover. Read-only. Granting it
# needs admin consent, so whoever applies this root needs a role that can (Privileged Role
# Administrator or Global Administrator).
data "azuread_application_published_app_ids" "well_known" {}

resource "azuread_service_principal" "msgraph" {
  client_id    = data.azuread_application_published_app_ids.well_known.result["MicrosoftGraph"]
  use_existing = true
}

resource "azuread_app_role_assignment" "github_graph_read" {
  app_role_id         = azuread_service_principal.msgraph.app_role_ids["Application.Read.All"]
  principal_object_id = azuread_service_principal.github.object_id
  resource_object_id  = azuread_service_principal.msgraph.object_id
}

# Pull requests run workflow code that the PR itself can change, with no approval before it runs.
# So they get their own identity that can't write anything: the write identity above never trusts
# the `pull_request` subject.
resource "azuread_application" "github_plan" {
  display_name = "bardery-github-actions-plan"
}

resource "azuread_service_principal" "github_plan" {
  client_id = azuread_application.github_plan.client_id
}

resource "azuread_application_federated_identity_credential" "github_plan" {
  application_id = azuread_application.github_plan.id
  display_name   = "github-pull-requests"
  description    = "GitHub Actions on pull requests"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${local.repository}:pull_request"
}

# Reads everything a plan refreshes. Reader on the groups covers the zone and its records too.
resource "azurerm_role_assignment" "github_plan_shared" {
  scope                = azurerm_resource_group.shared.id
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.github_plan.object_id
}

resource "azurerm_role_assignment" "github_plan_staging" {
  count = var.staging_exists ? 1 : 0

  scope                = local.staging_scope
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.github_plan.object_id
}

# The azurerm provider lists the secrets of a Container App and a Container Apps job on every
# refresh, actions Reader doesn't include. This role adds only those, on the staging group.
# Trade-off: a pull request's plan can then read those secrets, so Container App secrets should be
# Key Vault references, not values.
resource "azurerm_role_definition" "container_app_secrets_lister" {
  name  = "bardery-container-app-secrets-lister"
  scope = "/subscriptions/${data.azurerm_client_config.current.subscription_id}"

  description = "List Container App and job secrets, so terraform plan can refresh them."

  permissions {
    actions = [
      "Microsoft.App/containerApps/listSecrets/action",
      "Microsoft.App/jobs/listSecrets/action",
    ]
  }

  assignable_scopes = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}"]
}

resource "azurerm_role_assignment" "github_plan_staging_secrets" {
  count = var.staging_exists ? 1 : 0

  scope              = local.staging_scope
  role_definition_id = azurerm_role_definition.container_app_secrets_lister.role_definition_resource_id
  principal_id       = azuread_service_principal.github_plan.object_id
}

resource "azurerm_role_assignment" "github_plan_state" {
  for_each = toset(["Reader", "Storage Blob Data Reader"])

  scope                = local.state_account_id
  role_definition_name = each.key
  principal_id         = azuread_service_principal.github_plan.object_id
}

resource "azuread_app_role_assignment" "github_plan_graph_read" {
  app_role_id         = azuread_service_principal.msgraph.app_role_ids["Application.Read.All"]
  principal_object_id = azuread_service_principal.github_plan.object_id
  resource_object_id  = azuread_service_principal.msgraph.object_id
}
