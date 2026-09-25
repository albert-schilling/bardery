terraform {
  required_version = "~> 1.16"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.7"
    }
  }

  backend "azurerm" {
    resource_group_name  = "bardery-tfstate"
    storage_account_name = "barderytfstate"
    container_name       = "tfstate"
    key                  = "shared.tfstate"
    use_azuread_auth     = true
  }
}

# The subscription comes from ARM_SUBSCRIPTION_ID.
provider "azurerm" {
  features {}
  resource_providers_to_register = ["Microsoft.Network"]
}
