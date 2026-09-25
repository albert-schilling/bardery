output "name_servers" {
  description = "Enter these at united-domains to delegate bardery.app to Azure DNS."
  value       = azurerm_dns_zone.bardery.name_servers
}
