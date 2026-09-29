output "web_default_host_name" {
  description = "The Static Web App's own hostname, which staging.bardery.app points to."
  value       = azurerm_static_web_app.web.default_host_name
}
