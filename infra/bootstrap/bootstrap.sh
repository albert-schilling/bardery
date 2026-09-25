#!/usr/bin/env bash
# Creates the storage account that holds Terraform state for every root in infra/envs/.
# Run once per subscription, by hand, after `az login`. Safe to re-run.
set -euo pipefail

LOCATION=swedencentral
RESOURCE_GROUP=bardery-tfstate
ACCOUNT=${1:-barderytfstate}
CONTAINER=tfstate

az account show --query '{subscription: name, id: id, user: user.name}' -o table
read -rp "Create Terraform state in this subscription? [y/N] " answer
[[ $answer == [yY] ]] || exit 1

echo "Registering the Storage resource provider (can take a few minutes on a new subscription)..."
az provider register --namespace Microsoft.Storage --wait

echo "Creating resource group $RESOURCE_GROUP..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

echo "Creating storage account $ACCOUNT..."
if ! az storage account show --name "$ACCOUNT" --resource-group "$RESOURCE_GROUP" -o none 2>/dev/null; then
  if [[ $(az storage account check-name --name "$ACCOUNT" --query nameAvailable -o tsv) != true ]]; then
    echo "Storage account name '$ACCOUNT' is taken. Pass another name as the first argument." >&2
    exit 1
  fi
  # Entra ID only: no account keys, no public blobs.
  az storage account create \
    --name "$ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_ZRS \
    --kind StorageV2 \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false \
    --allow-shared-key-access false \
    -o none
fi

echo "Enabling versioning and soft delete..."
# Versioning and soft delete let us recover a corrupted or deleted state file.
az storage account blob-service-properties update \
  --account-name "$ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --enable-versioning true \
  --enable-delete-retention true --delete-retention-days 30 \
  --enable-container-delete-retention true --container-delete-retention-days 30 \
  -o none

echo "Creating container $CONTAINER..."
# Created through the management plane, so it works before the data role below has propagated.
az storage container-rm create \
  --storage-account "$ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER" \
  -o none

echo "Granting you Storage Blob Data Contributor..."
account_id=$(az storage account show --name "$ACCOUNT" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
user_id=$(az ad signed-in-user show --query id -o tsv)
if [[ -z $(az role assignment list --assignee "$user_id" --role "Storage Blob Data Contributor" --scope "$account_id" --query '[].id' -o tsv) ]]; then
  az role assignment create \
    --assignee-object-id "$user_id" \
    --assignee-principal-type User \
    --role "Storage Blob Data Contributor" \
    --scope "$account_id" \
    -o none
fi

echo "Adding a delete lock..."
az lock create --name do-not-delete --lock-type CanNotDelete --resource-group "$RESOURCE_GROUP" -o none

echo "Terraform state: $ACCOUNT/$CONTAINER in $RESOURCE_GROUP."
echo "Role assignments can take a few minutes to apply before 'terraform init' succeeds."
