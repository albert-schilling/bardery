# The staging environment.

resource "azurerm_resource_group" "staging" {
  name     = "bardery-staging"
  location = "swedencentral"
}

# The bardery.app zone from envs/shared.
data "azurerm_dns_zone" "bardery" {
  name                = "bardery.app"
  resource_group_name = "bardery-shared"
}

resource "azurerm_log_analytics_workspace" "staging" {
  name                = "bardery-staging"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# One Container Apps environment per environment, on the consumption plan. The provider accepts a
# workspace only when logs_destination is log-analytics, so that is set explicitly.
resource "azurerm_container_app_environment" "staging" {
  name                       = "bardery-staging"
  location                   = azurerm_resource_group.staging.location
  resource_group_name        = azurerm_resource_group.staging.name
  logs_destination           = "log-analytics"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.staging.id

  # Azure adds this profile to every environment, and the provider then wanted to remove it from
  # the environment and the app (an in-place change on every plan). Declaring it matches Azure.
  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }
}

# Serves apps/web with nginx. docs/grilling/2026-09-24-technical-session.md puts it on Static Web Apps, but westeurope, its only EU region,
# doesn't accept new customers, so this stands in until #22 moves it back.
resource "azurerm_container_app" "web" {
  name                         = "web"
  container_app_environment_id = azurerm_container_app_environment.staging.id
  resource_group_name          = azurerm_resource_group.staging.name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

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

# Only registers the hostname with no certificate bound. Azure creates a managed certificate once the
# hostname is on the app, so it is created and bound with `az containerapp hostname bind` (infra/README.md);
# doing it here would make this resource and the certificate depend on each other.
resource "azurerm_container_app_custom_domain" "web" {
  name             = trimsuffix(azurerm_dns_cname_record.web.fqdn, ".")
  container_app_id = azurerm_container_app.web.id

  depends_on = [azurerm_dns_txt_record.web_verification]

  lifecycle {
    # `az containerapp hostname bind` sets both; the provider docs require ignoring them.
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }
}

# The server (apps/server) at api.staging.bardery.app. Min 0 replicas in staging; the first
# request after a quiet spell waits for a cold start.
resource "azurerm_container_app" "api" {
  name                         = "api"
  container_app_environment_id = azurerm_container_app_environment.staging.id
  resource_group_name          = azurerm_resource_group.staging.name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "api"
      image  = "ghcr.io/albert-schilling/bardery-server:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      startup_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/health"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/health"
      }

      readiness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/health"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  lifecycle {
    # CI owns the image tag: it deploys the commit's image with `az containerapp update`, so
    # Terraform only sets the first image and a deploy never shows up as drift (infra/README.md).
    ignore_changes = [template[0].container[0].image]
  }
}

resource "azurerm_dns_cname_record" "api" {
  name                = "api.staging"
  zone_name           = data.azurerm_dns_zone.bardery.name
  resource_group_name = data.azurerm_dns_zone.bardery.resource_group_name
  ttl                 = 3600
  record              = azurerm_container_app.api.ingress[0].fqdn
}

# Proves to Container Apps that we own api.staging.bardery.app.
resource "azurerm_dns_txt_record" "api_verification" {
  name                = "asuid.api.staging"
  zone_name           = data.azurerm_dns_zone.bardery.name
  resource_group_name = data.azurerm_dns_zone.bardery.resource_group_name
  ttl                 = 3600

  record {
    value = azurerm_container_app.api.custom_domain_verification_id
  }
}

# Registers the hostname only; the managed certificate is bound once by hand, like the web app's.
resource "azurerm_container_app_custom_domain" "api" {
  name             = trimsuffix(azurerm_dns_cname_record.api.fqdn, ".")
  container_app_id = azurerm_container_app.api.id

  depends_on = [azurerm_dns_txt_record.api_verification]

  lifecycle {
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }
}
