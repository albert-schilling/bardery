output "name_servers" {
  description = "Enter these at united-domains to delegate bardery.app to Azure DNS."
  value       = azurerm_dns_zone.bardery.name_servers
}

output "github_actions" {
  description = "Set these as repository variables (Settings → Secrets and variables → Actions → Variables); they aren't secrets."
  value = {
    AZURE_CLIENT_ID       = azuread_application.github.client_id
    AZURE_TENANT_ID       = data.azurerm_client_config.current.tenant_id
    AZURE_SUBSCRIPTION_ID = data.azurerm_client_config.current.subscription_id
  }
}
