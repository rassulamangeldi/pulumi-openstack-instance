import * as openstack from "@pulumi/openstack";
import * as pulumi from "@pulumi/pulumi";
export { SecGroup } from "./secGroup";
export { Instance } from "./instance"

// export interface CustomSecGroupRuleArgs extends Omit<openstack.networking.SecGroupRuleArgs, 'direction' | 'ethertype' | 'securityGroupId' | 'remoteIpPrefix'> {
//     ethertype?: 'IPv4' | 'IPv6';
//     remoteIpPrefix?: string[];
// };

// export interface CustomSecGroupArgs {
//     ingress: CustomSecGroupRuleArgs[];
//     egress?: CustomSecGroupRuleArgs[];
// };

// export interface BaseSecGroupArgs {
//     name: string;
//     config: CustomSecGroupArgs;
//     tags?: string[];
// };

// export interface CustomInstanceArgs extends openstack.compute.InstanceArgs {
//     name: string;
//     portConfig?: openstack.networking.PortArgs[];
//     dataVolumesConfig?: openstack.blockstorage.VolumeArgs[];
//     secondaryPortConfig?: openstack.networking.PortArgs[];
// };

// export interface SharedInstanceArgs extends openstack.compute.InstanceArgs {
//     name?: string;
//     portConfig?: openstack.networking.PortArgs[];
//     dataVolumesConfig?: openstack.blockstorage.VolumeArgs[];
//     secondaryPortConfig?: openstack.networking.PortArgs[];
// };

// export interface BaseInstanceArgs {
//     sharedConfig?: SharedInstanceArgs;
//     instanceConfig: CustomInstanceArgs[];
//     tags?: string[];
// };


// function getIndex(counter: number): string {
//     return (counter + 1).toString().padStart(2, '0');
// }

// export class SecGroup extends pulumi.ComponentResource {

//     secGroup!: openstack.networking.SecGroup;

//     constructor(name: string, args: BaseSecGroupArgs, opts?: pulumi.ComponentResourceOptions) {
//         super("okassov:openstack:SecGroup", name, {}, opts);

//         if (args.config) {

//             let secGroupName = args.name

//             /**
//              * Create SecGroup
//              */
//             this.secGroup = this.createSecGroup(secGroupName, 
//                 { deleteDefaultRules: true }, args.tags ?? [], opts?.provider)

//             /**
//              * Create and Attach SecGroup Rules
//              */
//             Object.entries(args.config).forEach(([direction, rules]) => {
//                 rules.forEach((rule: any, ruleCounter: number) => {
//                   rule.remoteIpPrefix.forEach((prefix: any, prefixCounter: number) => {
//                     const ruleName = `${secGroupName}-${direction}-rule-${ruleCounter}-prefix-${prefixCounter}`;
              
//                     new openstack.networking.SecGroupRule(ruleName, {
//                       direction,
//                       ethertype: rule.ethertype,
//                       securityGroupId: this.secGroup.id,
//                       description: rule.description,
//                       portRangeMax: rule.portRangeMax !== -1 ? rule.portRangeMax : undefined,
//                       portRangeMin: rule.portRangeMin !== -1 ? rule.portRangeMin : undefined,
//                       protocol: rule.protocol !== "any" ? rule.protocol : undefined,
//                       region: rule.region,
//                       remoteGroupId: rule.remoteGroupId,
//                       tenantId: rule.tenantId,
//                       remoteIpPrefix: prefix,
//                     }, { parent: this.secGroup, provider: opts?.provider });
//                   });
//                 });
//               });
//         }

//         this.registerOutputs({});
//     }

//     /**
//      * 
//      * @param name 
//      * @param secGroupArgs 
//      * @param tags 
//      * @param provider 
//      * @returns 
//     */
//     private createSecGroup(name: string, 
//         secGroupArgs: openstack.networking.SecGroupArgs, 
//         tags: string[], provider: pulumi.ProviderResource | undefined): openstack.networking.SecGroup {
    
//         let secGroup = new openstack.networking.SecGroup(name, {
//             name: name,
//             deleteDefaultRules: secGroupArgs.deleteDefaultRules,
//             description: secGroupArgs.description,
//             region: secGroupArgs.region,
//             tenantId: secGroupArgs.tenantId,
//             tags: tags
//         }, { parent: this, provider: provider })
    
//         return secGroup
//     }

    
// }


// export class Instance extends pulumi.ComponentResource {

//     createdInstances: openstack.compute.Instance[] = [];

//     constructor(name: string, args: BaseInstanceArgs, opts?: pulumi.ComponentResourceOptions) {
//         super("okassov:openstack:Instance", name, {}, opts);

//         let tags: any = [];

//         if (args.sharedConfig?.tags) {
//             tags = args.sharedConfig.tags
//         }

//         /**
//          * Create Openstack Compute Instances
//          */
//         for (let i = 0; i < args.instanceConfig?.length; i++) {
            
//             let instanceArgs = Object.assign({}, args.sharedConfig, args.instanceConfig[i])
//             let instance: openstack.compute.Instance;

//             // Create Network Port
//             var port: openstack.networking.Port;
//             if (instanceArgs.portConfig) {

//                 let portCounter = 0
//                 let networks = []
//                 for (let portArgs of instanceArgs.portConfig) {

//                     let portName: string = `${instanceArgs.name}-port-${portCounter}`

//                     port = this.createPort(portName, portArgs, opts?.provider)

//                     networks.push({ port: port.id })

//                     portCounter += 1
//                 }

//                 instanceArgs["networks"] = networks
//             }
 
//             // Create Instance
//             if (!instanceArgs.name) {
//                 throw new Error("Name is required");
//             }

//             instance = this.createInstance(instanceArgs.name, instanceArgs, opts?.provider)
//             this.createdInstances.push(instance)

//             // Create Data Volume
//             if (instanceArgs.dataVolumesConfig) {

//                 let volumeCounter = 0
//                 for (let volumeArgs of instanceArgs.dataVolumesConfig) {

//                     let volumeName: string = `${instanceArgs.name}-dataVolume-${volumeCounter}`
//                     let volume = this.createVolume(volumeName, volumeArgs, instance, opts?.provider)

//                     // Attach Openstack Volume to Compute Instance
//                     new openstack.compute.VolumeAttach(`${volumeName}-attach`, {
//                         instanceId: instance.id,
//                         volumeId: volume.id
//                     }, { parent: volume , provider: opts?.provider })

//                     volumeCounter += 1
//                 }
//             }

//             if (instanceArgs.secondaryPortConfig) {

//                 let portCounter = 0
//                 for (let portArgs of instanceArgs.secondaryPortConfig) {

//                     let portName: string = `${instanceArgs.name}-secondary-port-${portCounter}`

//                     let secondary_port = this.createPort(portName, portArgs, opts?.provider)

//                     // Attach Secondary Openstack Network Port to Compute Instance
//                     new openstack.compute.InterfaceAttach(`${portName}-attach`, {
//                         instanceId: instance.id,
//                         portId: secondary_port.id
//                     }, { parent: secondary_port , provider: opts?.provider })

//                     portCounter += 1
//                 }
//             }
//         }

//         this.registerOutputs({});
//     }


//     /**
//      * 
//      * @param name 
//      * @param volumeArgs 
//      * @param tags 
//      * @param instance 
//      * @param provider 
//      * @returns 
//      */
//     private createVolume(name: string,
//         volumeArgs: openstack.blockstorage.VolumeArgs,
//         instance: openstack.compute.Instance, 
//         provider: pulumi.ProviderResource | undefined): openstack.blockstorage.Volume {

//             let volume = new openstack.blockstorage.Volume(name, {
//                 name: name,
//                 size: volumeArgs.size,
//                 availabilityZone: volumeArgs.availabilityZone,
//                 consistencyGroupId: volumeArgs.consistencyGroupId,
//                 description: volumeArgs.description,
//                 imageId: volumeArgs.imageId,
//                 metadata: volumeArgs.metadata,
//                 region: volumeArgs.region,
//                 schedulerHints: volumeArgs.schedulerHints,
//                 snapshotId: volumeArgs.snapshotId,
//                 sourceReplica: volumeArgs.sourceReplica,
//                 sourceVolId: volumeArgs.sourceVolId,
//                 volumeType: volumeArgs.volumeType
//             }, { parent: instance, provider: provider})

//             return volume
//         }


//     /**
//      * 
//      * @param name 
//      * @param portArgs 
//      * @param tags 
//      * @param provider 
//      * @returns 
//      */
//     private createPort(name: string, 
//         portArgs: openstack.networking.PortArgs, 
//         provider: pulumi.ProviderResource | undefined): openstack.networking.Port {
        
//         let port = new openstack.networking.Port(name, {
//             name: name,
//             networkId: portArgs.networkId,
//             adminStateUp: portArgs.adminStateUp,
//             allowedAddressPairs: portArgs.allowedAddressPairs,
//             binding: portArgs.binding,
//             description: portArgs.description,
//             deviceId: portArgs.deviceId,
//             deviceOwner: portArgs.deviceOwner,
//             dnsName: portArgs.dnsName,
//             extraDhcpOptions: portArgs.extraDhcpOptions,
//             fixedIps: portArgs.fixedIps,
//             macAddress: portArgs.macAddress,
//             noFixedIp: portArgs.noFixedIp,
//             noSecurityGroups: portArgs.noSecurityGroups,
//             portSecurityEnabled: portArgs.portSecurityEnabled,
//             qosPolicyId: portArgs.qosPolicyId,
//             region: portArgs.region,
//             securityGroupIds: portArgs.securityGroupIds,
//             tenantId: portArgs.tenantId,
//             valueSpecs: portArgs.valueSpecs,
//             tags: portArgs.tags
//         }, { parent: this , provider: provider })

//         return port
//     }

    
//     /**
//      * 
//      * @param name 
//      * @param instanceArgs 
//      * @param tags 
//      * @param provider 
//      * @returns 
//      */
//     private createInstance(name: string, instanceArgs: CustomInstanceArgs, 
//         provider: pulumi.ProviderResource | undefined): openstack.compute.Instance {

//         let instance = new openstack.compute.Instance(name, {
//             name: name,
//             accessIpV4: instanceArgs.accessIpV4,
//             accessIpV6: instanceArgs.accessIpV6,
//             adminPass: instanceArgs.adminPass,
//             availabilityZone: instanceArgs.availabilityZone,
//             availabilityZoneHints: instanceArgs.availabilityZoneHints,
//             blockDevices: instanceArgs.blockDevices,
//             configDrive: instanceArgs.configDrive,
//             flavorId: instanceArgs.flavorId,
//             flavorName: instanceArgs.flavorName,
//             forceDelete: instanceArgs.forceDelete,
//             imageId: instanceArgs.imageId,
//             imageName: instanceArgs.imageName,
//             keyPair: instanceArgs.keyPair,
//             metadata: instanceArgs.metadata,
//             networkMode: instanceArgs.networkMode,
//             networks: instanceArgs.networks,
//             personalities: instanceArgs.personalities,
//             powerState: instanceArgs.powerState,
//             region: instanceArgs.region,
//             schedulerHints: instanceArgs.schedulerHints,
//             securityGroups: instanceArgs.securityGroups,
//             stopBeforeDestroy: instanceArgs.stopBeforeDestroy,
//             userData: instanceArgs.userData,
//             vendorOptions: instanceArgs.vendorOptions,
//             tags: instanceArgs.tags,
//         }, { parent: this, provider: provider })

//         return instance
//     }

    


//     /**
//      * Outputs
//      */
//     public instanceIds(): pulumi.Output<string>[] {
//         return this.createdInstances.map(x => x.id )
//     }

//     public instanceTags(): pulumi.Output<string[]>[] {
//         return this.createdInstances.map(x => x.allTags )
//     }

//     public instanceMetadata(): pulumi.Output<{ [key: string]: any }>[] {
//         return this.createdInstances.map(x => x.allMetadata )
//     }

// }
