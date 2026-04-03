param prefix string
param location string
param tags object

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${prefix}-sb'
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {}
}

resource playerCommandsQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'player-commands'
  properties: {
    maxDeliveryCount: 5
    deadLetteringOnMessageExpiration: true
    lockDuration: 'PT2M'
    defaultMessageTimeToLive: 'P7D'
  }
}

resource scheduledEventsTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'scheduled-events'
  properties: {
    defaultMessageTimeToLive: 'P7D'
  }
}

resource scheduledEventsSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  parent: scheduledEventsTopic
  name: 'orchestrator'
  properties: {
    maxDeliveryCount: 5
    deadLetteringOnMessageExpiration: true
  }
}

resource authRule 'Microsoft.ServiceBus/namespaces/AuthorizationRules@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'worker-rule'
  properties: {
    rights: ['Listen', 'Send']
  }
}

output namespaceName string = serviceBusNamespace.name
output connectionString string = authRule.listKeys().primaryConnectionString
