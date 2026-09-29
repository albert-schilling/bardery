# The staging environment (Q73).

resource "azurerm_resource_group" "staging" {
  name     = "bardery-staging"
  location = "swedencentral"
}

# The bardery.app zone from envs/shared.
data "azurerm_dns_zone" "bardery" {
  name                = "bardery.app"
  resource_group_name = "bardery-shared"
}

# Hosts apps/web (Q69).
resource "azurerm_static_web_app" "web" {
  name                = "bardery-staging-web"
  resource_group_name = azurerm_resource_group.staging.name
  # Static Web Apps isn't offered in swedencentral; westeurope is its EU region.
  location = "westeurope"
  sku_tier = "Free"
  sku_size = "Free"
  # No preview environments per pull request in v1 (Q73).
  preview_environments_enabled = false
}

resource "azurerm_dns_cname_record" "web" {
  name                = "staging"
  zone_name           = data.azurerm_dns_zone.bardery.name
  resource_group_name = data.azurerm_dns_zone.bardery.resource_group_name
  ttl                 = 3600
  record              = azurerm_static_web_app.web.default_host_name
}

# Static Web Apps validates the domain through the CNAME above and issues its certificate.
resource "azurerm_static_web_app_custom_domain" "web" {
  static_web_app_id = azurerm_static_web_app.web.id
  domain_name       = trimsuffix(azurerm_dns_cname_record.web.fqdn, ".")
  validation_type   = "cname-delegation"
}
