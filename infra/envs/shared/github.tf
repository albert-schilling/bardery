# The identity GitHub Actions uses to reach Azure (Q41). It lives here, not in CI's own roots,
# because CI can't create its own identity: you apply this root by hand (infra/README.md).
# Federated credentials mean no secret is stored anywhere.

locals {
  repository = "albert-schilling/bardery"
}

data "azurerm_client_config" "current" {}

resource "azuread_application" "github" {
  display_name = "bardery-github-actions"
}

resource "azuread_service_principal" "github" {
  client_id = azuread_application.github.client_id
}

# A workflow job gets one subject, chosen by how it runs: a job with `environment:` gets the
# environment subject only, so the deploy job needs `staging` and the checks need the other two.
resource "azuread_application_federated_identity_credential" "github" {
  for_each = {
    main          = "ref:refs/heads/main"
    pull-requests = "pull_request"
    staging       = "environment:staging"
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

  scope                = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/bardery-staging"
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
