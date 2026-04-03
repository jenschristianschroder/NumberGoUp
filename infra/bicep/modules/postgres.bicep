param prefix string
param location string
param tags object

@secure()
param administratorPassword string

var serverName = '${prefix}-pg'
var administratorLogin = 'ngu_admin'

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'numbergoUp'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.UTF8'
  }
}

output serverName string = postgresServer.name
output fqdn string = postgresServer.properties.fullyQualifiedDomainName
output connectionString string = 'postgresql://${administratorLogin}:${administratorPassword}@${postgresServer.properties.fullyQualifiedDomainName}/numbergoUp?sslmode=require'
