# Resources used by both staging and prod.

resource "azurerm_resource_group" "shared" {
  name     = "bardery-shared"
  location = "swedencentral"
}

# Deleting the zone would give it new nameservers and break the delegation at united-domains.
resource "azurerm_dns_zone" "bardery" {
  name                = "bardery.app"
  resource_group_name = azurerm_resource_group.shared.name

  lifecycle {
    prevent_destroy = true
  }
}

# united-domains email forwarding (Q93). Replace with mailbox.org's records when switching.
resource "azurerm_dns_mx_record" "apex" {
  name                = "@"
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = 3600

  record {
    preference = 10
    exchange   = "mx00.udag.de"
  }

  record {
    preference = 20
    exchange   = "mx01.udag.de"
  }
}

# Recommended by united-domains for its mail servers.
resource "azurerm_dns_txt_record" "apex" {
  name                = "@"
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = 3600

  record {
    value = "v=spf1 include:_smtp.udag.de ~all"
  }
}

resource "azurerm_dns_txt_record" "dmarc" {
  name                = "_dmarc"
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = 3600

  record {
    value = "v=DMARC1; p=none"
  }
}
