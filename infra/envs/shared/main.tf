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

# united-domains email forwarding (Q93). Replace with mailbox.org's records when switching; the apex
# and mail.bardery.app below use the same servers.
locals {
  mail_exchangers = { 10 = "mx00.udag.de", 20 = "mx01.udag.de" }
}

resource "azurerm_dns_mx_record" "apex" {
  name                = "@"
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = 3600

  dynamic "record" {
    for_each = local.mail_exchangers
    content {
      preference = record.key
      exchange   = record.value
    }
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

# Covers subdomains too, by the standard; mail.bardery.app also has its own record (mail_dmarc below).
resource "azurerm_dns_txt_record" "dmarc" {
  name                = "_dmarc"
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = 3600

  record {
    value = "v=DMARC1; p=quarantine"
  }
}

# Email (docs/grilling/2026-09-24-technical-session.md, Email addresses). The Email Communication Service
# and its domain are shared, not per environment: a sender domain is verified once, and each environment
# links its own Communication Service to it (envs/staging/email.tf). So staging and prod send from the same
# `noreply@mail.bardery.app` without a second verification.
resource "azurerm_email_communication_service" "bardery" {
  name                = "bardery"
  resource_group_name = azurerm_resource_group.shared.name
  data_location       = "Europe"
}

resource "azurerm_email_communication_service_domain" "mail" {
  name              = "mail.bardery.app"
  email_service_id  = azurerm_email_communication_service.bardery.id
  domain_management = "CustomerManaged"
  # Tracking opens and clicks isn't needed, and a reader's reading is nobody's business.
  user_engagement_tracking_enabled = false
}

# Azure sends only from usernames the domain lists. A custom domain starts with none, so `noreply` has
# to be created before `noreply@mail.bardery.app` (EMAIL_FROM in apps/server/src/config.ts) is accepted.
resource "azurerm_email_communication_service_domain_sender_username" "noreply" {
  name                    = "noreply"
  email_service_domain_id = azurerm_email_communication_service_domain.mail.id
  display_name            = "Bardery"
}

locals {
  mail_verification = azurerm_email_communication_service_domain.mail.verification_records[0]

  # Azure returns two kinds of names. The domain record's is the full domain (`mail.bardery.app`), which
  # is relative to the zone once the zone's name is cut off. The DKIM names (`selector1-azurecomm-prod-net._domainkey`)
  # are relative to the domain, so they belong below `mail`.
  mail_record_name = {
    domain = trimsuffix(local.mail_verification.domain[0].name, ".bardery.app")
    dkim   = "${local.mail_verification.dkim[0].name}.mail"
    dkim2  = "${local.mail_verification.dkim2[0].name}.mail"
  }
}

# Both records sit at the name of the domain: the ownership proof and the SPF record that authorizes
# Azure to send for it. The apex SPF record doesn't cover this subdomain.
resource "azurerm_dns_txt_record" "mail" {
  name                = local.mail_record_name.domain
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = local.mail_verification.domain[0].ttl

  record {
    value = local.mail_verification.domain[0].value
  }

  record {
    value = local.mail_verification.spf[0].value
  }
}

# The sending domain must be able to receive mail too: bounces go back to it, and mail providers refuse
# or defer mail from a domain without an MX record. Without one, the first staging sign-in emails went
# undelivered: GMX refused them with a 550, and Posteo kept deferring them.
resource "azurerm_dns_mx_record" "mail" {
  name                = "mail"
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = 3600

  dynamic "record" {
    for_each = local.mail_exchangers
    content {
      preference = record.key
      exchange   = record.value
    }
  }
}

# The DKIM keys. The DMARC policy needs DKIM or SPF alignment, and the keys make the mail pass DKIM
# with the domain mail.bardery.app, aligned with the From address.
resource "azurerm_dns_cname_record" "mail_dkim" {
  name                = local.mail_record_name.dkim
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = local.mail_verification.dkim[0].ttl
  record              = local.mail_verification.dkim[0].value
}

resource "azurerm_dns_cname_record" "mail_dkim2" {
  name                = local.mail_record_name.dkim2
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = local.mail_verification.dkim2[0].ttl
  record              = local.mail_verification.dkim2[0].value
}

# The sending domain's own DMARC policy, the same as the apex's. The apex record should cover it, but
# a receiver that doesn't look up the parent domain finds no policy: Posteo reported `dmarc=none` for
# mail from mail.bardery.app while the apex had `p=quarantine`.
resource "azurerm_dns_txt_record" "mail_dmarc" {
  name                = "_dmarc.mail"
  zone_name           = azurerm_dns_zone.bardery.name
  resource_group_name = azurerm_resource_group.shared.name
  ttl                 = 3600

  record {
    value = "v=DMARC1; p=quarantine"
  }
}
