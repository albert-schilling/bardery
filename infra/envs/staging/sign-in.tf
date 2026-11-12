# Sign-in: the Key Vault for the api's secrets. Its values are set by hand (infra/README.md, Staging
# sign-in), so they are in neither the state nor the plan, which pull requests can read.

resource "azurerm_key_vault" "staging" {
  name                = "bardery-staging"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
  # Access through Azure roles, like everything else here, instead of the vault's own access policies.
  rbac_authorization_enabled = true
  # Staging holds nothing that can't be set again, so a deleted vault may be purged at once.
  purge_protection_enabled   = false
  soft_delete_retention_days = 7
}

locals {
  # The api reads these when a revision starts; a versionless ID picks the latest value. Each must
  # exist in the vault, or the revision fails to start.
  api_secrets = {
    # Signs the session cookie. Replacing it signs everyone out.
    auth-secret = "AUTH_SECRET"
    # Who may create an Account, until invite codes replace the list; kept out of the repository.
    sign-up-allowlist = "SIGN_UP_ALLOWLIST"
  }
}
