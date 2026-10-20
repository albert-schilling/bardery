# Sending email: this environment's Communication Service, linked to the sender domain that envs/shared
# verified. See envs/shared/main.tf for why the domain is shared.

locals {
  # The sender domain from envs/shared, built from its names: the provider has no data source for it,
  # and a plan would otherwise need read access to look it up. The names must match envs/shared/main.tf:
  # the resource group, azurerm_email_communication_service.bardery and azurerm_email_communication_service_domain.mail.
  mail_domain_id = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/bardery-shared/providers/Microsoft.Communication/emailServices/bardery/domains/mail.bardery.app"
}

resource "azurerm_communication_service" "staging" {
  name                = "bardery-staging"
  resource_group_name = azurerm_resource_group.staging.name
  data_location       = "Europe"
}

resource "azurerm_communication_service_email_domain_association" "staging" {
  communication_service_id = azurerm_communication_service.staging.id
  email_service_domain_id  = local.mail_domain_id
}

locals {
  # The address the server sends through (AZURE_COMMUNICATION_ENDPOINT).
  communication_endpoint = "https://${azurerm_communication_service.staging.hostname}"
}

# The api's identity needs the role "Communication and Email Service Owner" on the Communication
# Service to send through it with no connection string. It isn't assigned here: CI's Contributor role
# can't create role assignments, and widening it would let a compromised workflow grant itself anything
# on staging. It's assigned once by hand (infra/README.md, Staging email).

# The send and delivery-status logs of the Communication Service, which Azure Monitor's email views and
# queries read; without them nothing records what happened to a message after Azure accepted it.
# The category names are looked up from the resource, because the exact names aren't something to guess:
# a wrong one fails the apply. They match on "SendMail" and "StatusUpdate" (tables ACSEmailSendMailOperational
# and ACSEmailStatusUpdateOperational).
data "azurerm_monitor_diagnostic_categories" "communication" {
  resource_id = azurerm_communication_service.staging.id
}

resource "azurerm_monitor_diagnostic_setting" "communication" {
  name                       = "email-logs"
  target_resource_id         = azurerm_communication_service.staging.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.staging.id

  # One table per kind of log (ACSEmail…), not the shared AzureDiagnostics table.
  log_analytics_destination_type = "Dedicated"

  dynamic "enabled_log" {
    for_each = toset(["SendMail", "StatusUpdate"])
    content {
      category = one([
        for category in data.azurerm_monitor_diagnostic_categories.communication.log_category_types :
        category if strcontains(category, enabled_log.value)
      ])
    }
  }
}
