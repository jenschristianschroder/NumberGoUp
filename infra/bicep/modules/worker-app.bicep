param prefix string
param location string
param tags object
param containerEnvId string
param managedIdentityId string
param databaseUrl string
param serviceBusConnectionString string
param keyVaultUri string

@description('Application Insights connection string for telemetry')
param appInsightsConnectionString string = ''

@description('Container image to deploy (format: registry/image:tag)')
param imageName string = 'ghcr.io/jenschristianschroder/numbergoUp/worker:latest'

resource workerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-worker'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnvId
    configuration: {
      // Worker has no external ingress
      secrets: [
        {
          name: 'database-url'
          value: databaseUrl
        }
        {
          name: 'servicebus-connection'
          value: serviceBusConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: imageName
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'SERVICE_BUS_CONNECTION_STRING'
              secretRef: 'servicebus-connection'
            }
            {
              name: 'SERVICE_BUS_QUEUE'
              value: 'player-commands'
            }
            {
              name: 'KEY_VAULT_URI'
              value: keyVaultUri
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsightsConnectionString
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

output appName string = workerApp.name
