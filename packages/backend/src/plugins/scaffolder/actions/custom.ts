import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { ContainerServiceClient, ManagedCluster } from '@azure/arm-containerservice';
import { DefaultAzureCredential } from '@azure/identity';
import { z } from 'zod';

export const createDeployAksClusterAction = () => {
  return createTemplateAction({
    id: 'aks:deploy',
    schema: {
      input: z.object({
        clusterName: z.string(),
        region: z.string(),
        nodeSize: z.string()
      }),
    },
    async handler(ctx) {
    console.log("Received input:", ctx.input);
    const { clusterName, region, nodeSize } = ctx.input;

    const subscriptionId = process.env['CONTAINERSERVICE_SUBSCRIPTION_ID'] || "16b66c5a-8811-4a39-8637-21e471da8324";
    const resourceGroupName = process.env['CONTAINERSERVICE_RESOURCE_GROUP'] || "aks_rg";
    const nodeCount = 1
      
      

      const parameters: ManagedCluster = {
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
        identity: {
            type: "SystemAssigned",
          },
        // Further configuration as required
      };

      const credential = new DefaultAzureCredential();
      const client = new ContainerServiceClient(credential, subscriptionId);

      try {
        const result = await client.managedClusters.beginCreateOrUpdateAndWait(
          resourceGroupName,
          clusterName,
          parameters
        );
        console.log(`AKS cluster '${clusterName}' deployment successful.`, result);
        ctx.output('clusterId', result.id);
      } catch (error) {
        console.error(`Failed to deploy AKS cluster '${clusterName}': ${error}`);
        throw new Error(`Deployment failed: ${error} }`);
      }
    },
  });
};
