# Sending email: this environment's Communication Service, linked to the sender domain that envs/shared
# verified. See envs/shared/main.tf for why the domain is shared.

# The sender domain from envs/shared.
data "azurerm_email_communication_service_domain" "mail" {
  name                = "mail.bardery.app"
  email_service_name  = "bardery"
  resource_group_name = "bardery-shared"
}

resource "azurerm_communication_service" "staging" {
  name                = "bardery-staging"
  resource_group_name = azurerm_resource_group.staging.name
  data_location       = "Europe"
}

resource "azurerm_communication_service_email_domain_association" "staging" {
  communication_service_id = azurerm_communication_service.staging.id
  email_service_domain_id  = data.azurerm_email_communication_service_domain.mail.id
}

locals {
  # The address the server sends through (AZURE_COMMUNICATION_ENDPOINT). Azure builds it from the
  # service's name and data location.
  communication_endpoint = "https://${azurerm_communication_service.staging.name}.europe.communication.azure.com"
}

# The api's identity needs the role "Communication and Email Service Owner" on the Communication
# Service to send through it with no connection string. It isn't assigned here: CI's Contributor role
# can't create role assignments, and widening it would let a compromised workflow grant itself anything
# on staging. It's assigned once by hand (infra/README.md, Staging email).
