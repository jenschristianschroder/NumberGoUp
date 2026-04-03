// Main entry-point for the NumberGoUp Azure infrastructure.
// Deploys all modules into a single resource group.

targetScope = 'resourceGroup'

@description('Environment name (dev, staging, prod)')
param environmentName string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

// ─── Shared variables ─────────────────────────────────────────────────────────

var prefix = 'ngu-${environmentName}'
var tags = {
  project: 'NumberGoUp'
  environment: environmentName
}

// ─── Managed Identity ─────────────────────────────────────────────────────────

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    prefix: prefix
    location: location
    tags: tags
  }
}

// ─── Key Vault ────────────────────────────────────────────────────────────────

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    prefix: prefix
    location: location
    tags: tags
    managedIdentityPrincipalId: identity.outputs.principalId
  }
}

// ─── Storage ──────────────────────────────────────────────────────────────────

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    prefix: prefix
    location: location
    tags: tags
  }
}

// ─── Service Bus ──────────────────────────────────────────────────────────────

module serviceBus 'modules/servicebus.bicep' = {
  name: 'servicebus'
  params: {
    prefix: prefix
    location: location
    tags: tags
  }
}

// ─── PostgreSQL ───────────────────────────────────────────────────────────────

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    prefix: prefix
    location: location
    tags: tags
    administratorPassword: postgresAdminPassword
  }
}

// ─── Container Apps Environment ───────────────────────────────────────────────

module containerEnv 'modules/container-env.bicep' = {
  name: 'container-env'
  params: {
    prefix: prefix
    location: location
    tags: tags
  }
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    prefix: prefix
    location: location
    tags: tags
  }
}

// ─── API App ──────────────────────────────────────────────────────────────────

module apiApp 'modules/api-app.bicep' = {
  name: 'api-app'
  params: {
    prefix: prefix
    location: location
    tags: tags
    containerEnvId: containerEnv.outputs.environmentId
    managedIdentityId: identity.outputs.identityId
    databaseUrl: postgres.outputs.connectionString
    keyVaultUri: keyVault.outputs.uri
    appInsightsConnectionString: monitoring.outputs.connectionString
  }
}

// ─── Worker App ───────────────────────────────────────────────────────────────

module workerApp 'modules/worker-app.bicep' = {
  name: 'worker-app'
  params: {
    prefix: prefix
    location: location
    tags: tags
    containerEnvId: containerEnv.outputs.environmentId
    managedIdentityId: identity.outputs.identityId
    databaseUrl: postgres.outputs.connectionString
    serviceBusConnectionString: serviceBus.outputs.connectionString
    keyVaultUri: keyVault.outputs.uri
    appInsightsConnectionString: monitoring.outputs.connectionString
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output apiUrl string = apiApp.outputs.url
output workerAppName string = workerApp.outputs.appName
