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

# Q38: one Container Apps environment per environment, on the consumption plan.
resource "azurerm_container_app_environment" "staging" {
  name                = "bardery-staging"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
}

# Serves apps/web with nginx. Q69 puts it on Static Web Apps, but westeurope, its only EU region,
# doesn't accept new customers, so this stands in until #22 moves it back.
resource "azurerm_container_app" "web" {
  name                         = "web"
  container_app_environment_id = azurerm_container_app_environment.staging.id
  resource_group_name          = azurerm_resource_group.staging.name
  revision_mode                = "Single"

  template {
    container {
      name   = "web"
      image  = "ghcr.io/albert-schilling/bardery-web:latest"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  lifecycle {
    # Deploys set the image (by hand for now, CI in #4), so Terraform only sets the first one.
    ignore_changes = [template[0].container[0].image]
  }
}

resource "azurerm_dns_cname_record" "web" {
  name                = "staging"
  zone_name           = data.azurerm_dns_zone.bardery.name
  resource_group_name = data.azurerm_dns_zone.bardery.resource_group_name
  ttl                 = 3600
  record              = azurerm_container_app.web.ingress[0].fqdn
}

# Proves to Container Apps that we own staging.bardery.app.
resource "azurerm_dns_txt_record" "web_verification" {
  name                = "asuid.staging"
  zone_name           = data.azurerm_dns_zone.bardery.name
  resource_group_name = data.azurerm_dns_zone.bardery.resource_group_name
  ttl                 = 3600

  record {
    value = azurerm_container_app.web.custom_domain_verification_id
  }
}

# Without a certificate ID, Container Apps issues and renews a free managed certificate.
resource "azurerm_container_app_custom_domain" "web" {
  name             = trimsuffix(azurerm_dns_cname_record.web.fqdn, ".")
  container_app_id = azurerm_container_app.web.id

  depends_on = [azurerm_dns_txt_record.web_verification]

  lifecycle {
    # Azure sets both once the managed certificate is bound; the provider docs require ignoring them.
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }
}
