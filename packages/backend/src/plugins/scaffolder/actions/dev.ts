import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { DefaultAzureCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { ContainerServiceClient } from '@azure/arm-containerservice';
import { PostgreSQLManagementFlexibleServerClient } from '@azure/arm-postgresql-flexible';
import { z } from 'zod';

export const createDeployDevEnvAction = () => {
  return createTemplateAction({
    id: 'dev-env:deploy',
    schema: {
      input: z.object({
        clusterName: z.string(),
        region: z.string(),
        nodeSize: z.string(),
        rgName: z.string(),
        rgRegion: z.string(),
        pgServerName: z.string(),
        pgSku: z.string(),
        pgVersion: z.string(),
        pgAdminUsername: z.string(),
        pgAdminPassword: z.string(),
      }),
    },
    async handler(ctx) {
      console.log("Received input:", ctx.input);
      const {
        clusterName,
        region,
        nodeSize,
        rgName,
        rgRegion,
        pgServerName,
        pgSku,
        pgVersion,
        pgAdminUsername,
        pgAdminPassword,
      } = ctx.input;

      const subscriptionId = process.env['CONTAINERSERVICE_SUBSCRIPTION_ID'] || "your-subscription-id";
      let nodeCount = 3
      
      const credential = new DefaultAzureCredential();
      const resourceClient = new ResourceManagementClient(credential, subscriptionId);
      const containerServiceClient = new ContainerServiceClient(credential, subscriptionId);
      const postgreSQLFlexibleClient = new PostgreSQLManagementFlexibleServerClient(credential, subscriptionId);

      try {
        // Create Resource Group
        const resourceGroupParams = { location: rgRegion };
        await resourceClient.resourceGroups.createOrUpdate(rgName, resourceGroupParams);
        
        // AKS Cluster Parameters
        const aksParameters = {
          location: region,
          dnsPrefix: `${clusterName}-dns`,
          agentPoolProfiles: [{
            name: "nodepool1",
            count: nodeCount,
            vmSize: nodeSize,
            osType: "Linux",
            mode: "System",
            type: "VirtualMachineScaleSets",
          }],
          identity: { type: "SystemAssigned" },
        };

        // Create AKS Cluster
        await containerServiceClient.managedClusters.beginCreateOrUpdateAndWait(rgName, clusterName, aksParameters);
        console.log('AKS cluster created or updated successfully');

        // PostgreSQL Server Parameters
        const pgParameters = {
          administratorLogin: pgAdminUsername,
          administratorLoginPassword: pgAdminPassword,
          availabilityZone: "1",
          backup: { backupRetentionDays: 7, geoRedundantBackup: "Disabled" },
          createMode: "Create",
          location: rgRegion,
          sku: { name: pgSku, tier: "burstable" }, // Ensure this matches your requirements
          storage: { storageSizeGB: 512 },
          tags: { elasticServer: "1" },
          version: pgVersion,
        };

        // Create PostgreSQL Server
        const serverResult = await postgreSQLFlexibleClient.servers.beginCreateAndWait(rgName, pgServerName, pgParameters);
        console.log('PostgreSQL Server created successfully:', serverResult);

        console.log('Dev environment deployment completed successfully.');
      } catch (error) {
        console.error('Failed to deploy dev environment:', error);
        throw new Error(`Deployment failed: ${error}`);
      }
    },
  });
};
