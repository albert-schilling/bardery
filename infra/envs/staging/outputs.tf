output "web_fqdn" {
  description = "The web Container App's own hostname, which staging.bardery.app points to."
  value       = azurerm_container_app.web.ingress[0].fqdn
}
