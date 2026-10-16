output "web_fqdn" {
  description = "The web Container App's own hostname, which staging.bardery.app points to."
  value       = azurerm_container_app.web.ingress[0].fqdn
}

output "api_fqdn" {
  description = "The api Container App's own hostname, which api.staging.bardery.app points to."
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "communication_service_id" {
  description = "The scope to give the api's identity the \"Communication and Email Service Owner\" role on (infra/README.md, Staging email)."
  value       = azurerm_communication_service.staging.id
}
