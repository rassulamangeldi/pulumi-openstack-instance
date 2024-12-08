import * as openstack from "@pulumi/openstack";
import * as common from "@qcloudy/pulumi-common"
import {
    ProviderResource,
    ComponentResource, 
    ComponentResourceOptions, 
    Output } from "@pulumi/pulumi";

const path = require("path");

export interface BaseArgs {
    env: string;
    project: string;
}

export interface CustomRuleArgs {
    ethertype: 'IPv4' | 'IPv6';
    protocol?: string;
    description?: string;
    portRangeMin?: number;
    portRangeMax?: number;
    remoteIpPrefix?: string[];
    region?: string;
    remoteGroupId?: string;
    tennantId?: string;
}

export interface SecGroupArgs {
    ingress: CustomRuleArgs[];
    egress?: CustomRuleArgs[];
}

export interface CustomInstanceArgs extends openstack.compute.InstanceArgs {
    vmName?: string;
    portConfig?: openstack.networking.PortArgs[];
    secGroupConfig?: SecGroupArgs;
    dataVolumesConfig?: openstack.blockstorage.VolumeV2Args[];
    secondaryPortConfig?: openstack.networking.PortArgs[];
}

export interface SharedArgs extends CustomInstanceArgs {
    vmCount?: number;
}

export interface BaseInstanceArgs {
    baseConfig: BaseArgs;
    sharedConfig: SharedArgs;
    instanceConfig?: CustomInstanceArgs[];
    baseTags?: string[];
}

export interface BaseSecGroupArgs extends Omit<BaseInstanceArgs, 'instanceConfig' | 'sharedConfig'> {
    config?: SecGroupArgs;
}


export class SecGroup extends ComponentResource {

    secGroup!: openstack.networking.SecGroup;

    constructor(name: string, args: BaseSecGroupArgs, opts?: ComponentResourceOptions) {
        super("qCloudy:openstack-secgroup", name, {}, opts);

        let config = new common.Common(
            { env: args.baseConfig.env, project: args.baseConfig.project }, 
            'Openstack', args.baseTags)

        // Base and Default variables
        let baseNamePrefix = config.getBaseName()
        let baseTags = config.getBaseTags()

         if (args.config) {

            let secGroupName = `${baseNamePrefix}-${name}-secGroup`
            let secGroupTags = baseTags.concat([secGroupName])

            /**
             * Create SecGroup
             */
            this.secGroup = this.createSecGroup(secGroupName, 
                { deleteDefaultRules: true }, secGroupTags, opts?.provider)
            

            /**
             * Create and Attach SecGroup Rules
             */
            for (let [direction, rules] of Object.entries(args.config)) {

                let ruleCounter = 0
                for (let rule of rules) {

                    let ruleIndex = common.getIndex(ruleCounter)

                    let prefixCounter = 0
                    for (let prefix of rule.remoteIpPrefix ) {

                        let prefixIndex = common.getIndex(prefixCounter)

                        let ruleName = `${secGroupName}-${direction}-rule-${ruleIndex}-prefix-${prefixIndex}`

                        new openstack.networking.SecGroupRule(ruleName, {
                            direction: direction,
                            ethertype: rule.ethertype,
                            securityGroupId: this.secGroup.id,
                            description: rule.description,
                            portRangeMax: rule.portRangeMax != -1 ? rule.portRangeMax : undefined,
                            portRangeMin: rule.portRangeMin != -1 ? rule.portRangeMin : undefined,
                            protocol: rule.protocol != "any" ? rule.protocol : undefined,
                            region: rule.region,
                            remoteGroupId: rule.remoteGroupId,
                            tenantId: rule.tenantId,
                            remoteIpPrefix: prefix
                        }, { parent: this.secGroup, provider: opts?.provider})

                        prefixCounter += 1
                    }

                    ruleCounter += 1
                }
            }
        }

        this.registerOutputs({});
    }

    /**
     * 
     * @param name 
     * @param secGroupArgs 
     * @param tags 
     * @param provider 
     * @returns 
    */
    private createSecGroup(name: string, 
        secGroupArgs: openstack.networking.SecGroupArgs, 
        tags: string[], provider: ProviderResource | undefined): openstack.networking.SecGroup {
    
        let secGroup = new openstack.networking.SecGroup(name, {
            name: name,
            deleteDefaultRules: secGroupArgs.deleteDefaultRules,
            description: secGroupArgs.description,
            region: secGroupArgs.region,
            tenantId: secGroupArgs.tenantId,
            tags: tags
        }, { parent: this, provider: provider })
    
        return secGroup
    }

    
}

export class Instance extends ComponentResource {

    createdInstances: openstack.compute.Instance[] = [];

    constructor(name: string, args: BaseInstanceArgs, opts?: ComponentResourceOptions) {
        super("qCloudy:openstack-instance", name, {}, opts);

        let config = new common.Common(
            { env: args.baseConfig.env, project: args.baseConfig.project }, 
            'Openstack', args.baseTags)

        // Base and Default variables
        let baseNamePrefix = config.getBaseName()
        let baseTags = config.getBaseTags()

        /**
         * Validations
         */
        if (!args.sharedConfig?.vmCount && !args.instanceConfig) {
            throw new Error(`sharedConfig.vmCount or instanceConfig options must be defined.`);
        }

        /**
         * Defining VM Group Name
         */
        let vmGroupName: string;
        if (args.sharedConfig.vmName) {
            vmGroupName = args.sharedConfig.vmName
        } else {
            vmGroupName = path.basename(path.resolve())
        }
        
        /**
         * Defining VM Count
         */
        let vmCount: number = 0
        
        if (args.sharedConfig?.vmCount && args.instanceConfig) {

            if (args.sharedConfig.vmCount > args.instanceConfig.length) {
                vmCount = args.sharedConfig.vmCount
            } else if (args.sharedConfig.vmCount === args.instanceConfig.length) {
                vmCount = args.sharedConfig.vmCount
            } else {
                vmCount = args.instanceConfig.length
            }
        }

        if (!args.sharedConfig?.vmCount && args.instanceConfig) {
            vmCount = args.instanceConfig.length
        }

        if (args.sharedConfig?.vmCount && !args.instanceConfig) {
            vmCount = args.sharedConfig.vmCount
        }


        /**
         * Create Openstack Compute Instances
         */
        for (let i = 0; i < vmCount; i++) {

            let vmIndex = common.getIndex(i)
            
            // Defining Openstack Instance Args
            let vmName: string = `${baseNamePrefix}-${vmGroupName}-${vmIndex}`
            let instanceVars: CustomInstanceArgs = {};

            if (args.instanceConfig) {

                if (args.instanceConfig[i]) {

                    instanceVars = args.instanceConfig[i]

                    if (args.instanceConfig[i].hasOwnProperty('vmName')) {
                        vmName = args.instanceConfig[i].vmName!
                    }
                } 
            } 
            
            let tags = baseTags.concat([vmName])
            let instanceArgs = Object.assign({}, args.sharedConfig, instanceVars)
            let instance: openstack.compute.Instance;

            // Create Network Port
            var port: openstack.networking.Port;
            if (instanceArgs.portConfig) {

                let portCounter = 0
                let networks = []
                for (let portArgs of instanceArgs.portConfig) {

                    let portIndex = common.getIndex(portCounter)
                    let portName: string = `${baseNamePrefix}-${vmGroupName}-${vmIndex}-port-${portIndex}`

                    port = this.createPort(portName, portArgs, tags, opts?.provider)

                    networks.push({ port: port.id })

                    portCounter += 1
                }

                instanceArgs["networks"] = networks
            }
 
            // Create Instance
            instance = this.createInstance(vmName, instanceArgs, tags, opts?.provider)
            this.createdInstances.push(instance)

            // Create Data Volume
            if (instanceArgs.dataVolumesConfig) {

                let volumeCounter = 0
                for (let volumeArgs of instanceArgs.dataVolumesConfig) {
                    let volumeIndex = common.getIndex(volumeCounter)

                    let volumeName: string = `${baseNamePrefix}-${vmGroupName}-${vmIndex}-dataVolume-${volumeIndex}`
                    let volume = this.createVolume(volumeName, volumeArgs, tags, instance, opts?.provider)

                    // Attach Openstack VolumeV2 to Compute Instance
                    new openstack.compute.VolumeAttach(`${volumeName}-attach`, {
                        instanceId: instance.id,
                        volumeId: volume.id
                    }, { parent: volume , provider: opts?.provider })

                    volumeCounter += 1
                }
            }

            if (instanceArgs.secondaryPortConfig) {

                let portCounter = 0
                for (let portArgs of instanceArgs.secondaryPortConfig) {

                    let portIndex = common.getIndex(portCounter)
                    let portName: string = `${baseNamePrefix}-${vmGroupName}-${vmIndex}-secondary-port-${portIndex}`

                    let secondary_port = this.createPort(portName, portArgs, tags, opts?.provider)

                    // Attach Secondary Openstack Network Port to Compute Instance
                    new openstack.compute.InterfaceAttach(`${portName}-attach`, {
                        instanceId: instance.id,
                        portId: secondary_port.id
                    }, { parent: secondary_port , provider: opts?.provider })

                    portCounter += 1
                }
            }
        }

        this.registerOutputs({});
    }


    /**
     * 
     * @param name 
     * @param volumeArgs 
     * @param tags 
     * @param instance 
     * @param provider 
     * @returns 
     */
    private createVolume(name: string,
        volumeArgs: openstack.blockstorage.VolumeV2Args,
        tags: string[], instance: openstack.compute.Instance, 
        provider: ProviderResource | undefined): openstack.blockstorage.VolumeV2 {

            let volume = new openstack.blockstorage.VolumeV2(name, {
                name: name,
                size: volumeArgs.size,
                availabilityZone: volumeArgs.availabilityZone,
                consistencyGroupId: volumeArgs.consistencyGroupId,
                description: volumeArgs.description,
                imageId: volumeArgs.imageId,
                metadata: volumeArgs.metadata,
                region: volumeArgs.region,
                schedulerHints: volumeArgs.schedulerHints,
                snapshotId: volumeArgs.snapshotId,
                sourceReplica: volumeArgs.sourceReplica,
                sourceVolId: volumeArgs.sourceVolId,
                volumeType: volumeArgs.volumeType
            }, { parent: instance, provider: provider})

            return volume
        }


    /**
     * 
     * @param name 
     * @param portArgs 
     * @param tags 
     * @param provider 
     * @returns 
     */
    private createPort(name: string, 
        portArgs: openstack.networking.PortArgs, 
        tags: string[], provider: ProviderResource | undefined): openstack.networking.Port {
        
        let port = new openstack.networking.Port(name, {
            name: name,
            networkId: portArgs.networkId,
            adminStateUp: portArgs.adminStateUp,
            allowedAddressPairs: portArgs.allowedAddressPairs,
            binding: portArgs.binding,
            description: portArgs.description,
            deviceId: portArgs.deviceId,
            deviceOwner: portArgs.deviceOwner,
            dnsName: portArgs.dnsName,
            extraDhcpOptions: portArgs.extraDhcpOptions,
            fixedIps: portArgs.fixedIps,
            macAddress: portArgs.macAddress,
            noFixedIp: portArgs.noFixedIp,
            noSecurityGroups: portArgs.noSecurityGroups,
            portSecurityEnabled: portArgs.portSecurityEnabled,
            qosPolicyId: portArgs.qosPolicyId,
            region: portArgs.region,
            securityGroupIds: portArgs.securityGroupIds,
            tenantId: portArgs.tenantId,
            valueSpecs: portArgs.valueSpecs,
            tags: tags
        }, { parent: this , provider: provider })

        return port
    }

    
    /**
     * 
     * @param name 
     * @param instanceArgs 
     * @param tags 
     * @param provider 
     * @returns 
     */
    private createInstance(name: string, instanceArgs: CustomInstanceArgs, 
        tags: string[], provider: ProviderResource | undefined): openstack.compute.Instance {

        let instance = new openstack.compute.Instance(name, {
            name: name,
            accessIpV4: instanceArgs.accessIpV4,
            accessIpV6: instanceArgs.accessIpV6,
            adminPass: instanceArgs.adminPass,
            availabilityZone: instanceArgs.availabilityZone,
            availabilityZoneHints: instanceArgs.availabilityZoneHints,
            blockDevices: instanceArgs.blockDevices,
            configDrive: instanceArgs.configDrive,
            flavorId: instanceArgs.flavorId,
            flavorName: instanceArgs.flavorName,
            forceDelete: instanceArgs.forceDelete,
            imageId: instanceArgs.imageId,
            imageName: instanceArgs.imageName,
            keyPair: instanceArgs.keyPair,
            metadata: instanceArgs.metadata,
            networkMode: instanceArgs.networkMode,
            networks: instanceArgs.networks,
            personalities: instanceArgs.personalities,
            powerState: instanceArgs.powerState,
            region: instanceArgs.region,
            schedulerHints: instanceArgs.schedulerHints,
            securityGroups: instanceArgs.securityGroups,
            stopBeforeDestroy: instanceArgs.stopBeforeDestroy,
            userData: instanceArgs.userData,
            vendorOptions: instanceArgs.vendorOptions,
            tags: tags,
        }, { parent: this, provider: provider })

        return instance
    }

    
    /**
     * Outputs
     */
    public instanceIds(): Output<string>[] {
        return this.createdInstances.map(x => x.id )
    }

    public instanceTags(): Output<string[]>[] {
        return this.createdInstances.map(x => x.allTags )
    }

    public instanceMetadata(): Output<{ [key: string]: any }>[] {
        return this.createdInstances.map(x => x.allMetadata )
    }

}
