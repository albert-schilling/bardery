# The database (docs/adr/0002): Postgres Flexible Server with pgvector. The api and the migrations job
# sign in as the managed identity below, with Entra tokens; the server has no password.

data "azurerm_client_config" "current" {}

# The api's identity, which the migrations job shares, as it runs the same image and owns the schema.
resource "azurerm_user_assigned_identity" "api" {
  name                = "bardery-staging-api"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
}

resource "azurerm_postgresql_flexible_server" "staging" {
  name                = "bardery-staging"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  # The major version docker-compose.yml runs, for development and the tests; change both together.
  version               = "18"
  sku_name              = "B_Standard_B1ms"
  storage_mb            = 32768
  backup_retention_days = 7
  # Reached over the internet, limited to Azure services by the firewall rule below: a private
  # network would need a virtual network for the Container Apps environment too.
  public_network_access_enabled = true

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = false
    tenant_id                     = data.azurerm_client_config.current.tenant_id
  }

  lifecycle {
    # Azure picks the availability zone; without this, every plan would try to unset it.
    ignore_changes = [zone]
  }
}

# The server's Entra administrator, so the identity can create the schema and use it.
resource "azurerm_postgresql_flexible_server_active_directory_administrator" "api" {
  server_name         = azurerm_postgresql_flexible_server.staging.name
  resource_group_name = azurerm_resource_group.staging.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = azurerm_user_assigned_identity.api.principal_id
  principal_name      = azurerm_user_assigned_identity.api.name
  principal_type      = "ServicePrincipal"
}

resource "azurerm_postgresql_flexible_server_database" "bardery" {
  name      = "bardery"
  server_id = azurerm_postgresql_flexible_server.staging.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow-lists pgvector, so the first migration can create the extension.
resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.staging.id
  value     = "VECTOR"
}

# On by default; set here so it stays on.
resource "azurerm_postgresql_flexible_server_configuration" "require_tls" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.staging.id
  value     = "on"
}

# 0.0.0.0 is Azure's marker for "Azure services": Container Apps on the consumption plan have no fixed
# outbound address. It admits other Azure tenants too, so Entra sign-in is what keeps them out.
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAllAzureServicesAndResourcesWithinAzureIps"
  server_id        = azurerm_postgresql_flexible_server.staging.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

locals {
  # No password: the server signs in with a token for AZURE_CLIENT_ID (apps/server/src/db/client.ts).
  database_env = {
    DATABASE_URL    = "postgres://${azurerm_user_assigned_identity.api.name}@${azurerm_postgresql_flexible_server.staging.fqdn}:5432/${azurerm_postgresql_flexible_server_database.bardery.name}?sslmode=verify-full"
    AZURE_CLIENT_ID = azurerm_user_assigned_identity.api.client_id
  }
}

# Applies the migrations with the api image's `node dist/migrate.mjs`. CI starts it after each apply
# and deploys the new api image only once it succeeds.
resource "azurerm_container_app_job" "migrations" {
  name                         = "migrations"
  location                     = azurerm_resource_group.staging.location
  resource_group_name          = azurerm_resource_group.staging.name
  container_app_environment_id = azurerm_container_app_environment.staging.id
  workload_profile_name        = "Consumption"
  replica_timeout_in_seconds   = 300
  # A failed migration needs a person; a retry would fail the same way.
  replica_retry_limit = 0

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  template {
    container {
      name    = "migrations"
      image   = "ghcr.io/albert-schilling/bardery-server:latest"
      command = ["node", "dist/migrate.mjs"]
      cpu     = 0.25
      memory  = "0.5Gi"

      dynamic "env" {
        for_each = local.database_env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  lifecycle {
    # CI owns the image tag, as for the api app: it sets the commit's image before each run.
    ignore_changes = [template[0].container[0].image]
  }
}
