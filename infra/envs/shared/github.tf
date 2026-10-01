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
    pull-requests    = "pull_request"
    staging       = "environment:staging"
  }

  application_id = azuread_application.github.id
  display_name   = "github-${each.key}"
  description    = "GitHub Actions on ${each.key}"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${local.repository}:${each.value}"
}

# Created by envs/staging, so this only applies once staging exists (infra/README.md).
data "azurerm_resource_group" "staging" {
  name = "bardery-staging"
}

data "azurerm_storage_account" "state" {
  name                = "barderytfstate"
  resource_group_name = "bardery-tfstate"
}

# Applies and deploys staging.
resource "azurerm_role_assignment" "github_staging" {
  scope                = data.azurerm_resource_group.staging.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.github.object_id
}

# Staging's DNS records live in the shared zone.
resource "azurerm_role_assignment" "github_dns" {
  scope                = azurerm_dns_zone.bardery.id
  role_definition_name = "DNS Zone Contributor"
  principal_id         = azuread_service_principal.github.object_id
}

# The state storage allows Entra ID access only, so every `terraform` run needs this.
resource "azurerm_role_assignment" "github_state" {
  scope                = data.azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_service_principal.github.object_id
}

# Beyond the issue's list: `terraform plan` on `shared` refreshes the resource group, which
# neither DNS Zone Contributor (zone only) nor Contributor on staging covers. Read-only, one group.
resource "azurerm_role_assignment" "github_shared_reader" {
  scope                = azurerm_resource_group.shared.id
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.github.object_id
}
