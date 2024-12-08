"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = exports.SecGroup = void 0;
const openstack = require("@pulumi/openstack");
const pulumi = require("@pulumi/pulumi");
// function getIndex(counter: number): string {
//     return (counter + 1).toString().padStart(2, '0');
// }
class SecGroup extends pulumi.ComponentResource {
    constructor(name, args, opts) {
        var _a;
        super("okassov:openstack-secgroup", name, {}, opts);
        if (args.config) {
            let secGroupName = args.name;
            /**
             * Create SecGroup
             */
            this.secGroup = this.createSecGroup(secGroupName, { deleteDefaultRules: true }, (_a = args.tags) !== null && _a !== void 0 ? _a : [], opts === null || opts === void 0 ? void 0 : opts.provider);
            /**
             * Create and Attach SecGroup Rules
             */
            for (let [direction, rules] of Object.entries(args.config)) {
                let ruleCounter = 0;
                for (let rule of rules) {
                    let prefixCounter = 0;
                    for (let prefix of rule.remoteIpPrefix) {
                        let ruleName = `${secGroupName}-${direction}-rule-${ruleCounter}-prefix-${prefixCounter}`;
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
                        }, { parent: this.secGroup, provider: opts === null || opts === void 0 ? void 0 : opts.provider });
                        prefixCounter += 1;
                    }
                    ruleCounter += 1;
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
    createSecGroup(name, secGroupArgs, tags, provider) {
        let secGroup = new openstack.networking.SecGroup(name, {
            name: name,
            deleteDefaultRules: secGroupArgs.deleteDefaultRules,
            description: secGroupArgs.description,
            region: secGroupArgs.region,
            tenantId: secGroupArgs.tenantId,
            tags: tags
        }, { parent: this, provider: provider });
        return secGroup;
    }
}
exports.SecGroup = SecGroup;
class Instance extends pulumi.ComponentResource {
    constructor(name, args, opts) {
        var _a, _b;
        super("okassov:openstack-instance", name, {}, opts);
        this.createdInstances = [];
        let tags = [];
        if ((_a = args.sharedConfig) === null || _a === void 0 ? void 0 : _a.tags) {
            tags = args.sharedConfig.tags;
        }
        /**
         * Create Openstack Compute Instances
         */
        for (let i = 0; i < ((_b = args.instanceConfig) === null || _b === void 0 ? void 0 : _b.length); i++) {
            let instanceArgs = Object.assign({}, args.sharedConfig, args.instanceConfig);
            let instance;
            // Create Network Port
            var port;
            if (instanceArgs.portConfig) {
                let portCounter = 0;
                let networks = [];
                for (let portArgs of instanceArgs.portConfig) {
                    let portName = `${instanceArgs.name}-port-${portCounter}`;
                    port = this.createPort(portName, portArgs, opts === null || opts === void 0 ? void 0 : opts.provider);
                    networks.push({ port: port.id });
                    portCounter += 1;
                }
                instanceArgs["networks"] = networks;
            }
            // Create Instance
            instance = this.createInstance(instanceArgs.name, instanceArgs, opts === null || opts === void 0 ? void 0 : opts.provider);
            this.createdInstances.push(instance);
            // Create Data Volume
            if (instanceArgs.dataVolumesConfig) {
                let volumeCounter = 0;
                for (let volumeArgs of instanceArgs.dataVolumesConfig) {
                    let volumeName = `${instanceArgs.name}-dataVolume-${volumeCounter}`;
                    let volume = this.createVolume(volumeName, volumeArgs, instance, opts === null || opts === void 0 ? void 0 : opts.provider);
                    // Attach Openstack Volume to Compute Instance
                    new openstack.compute.VolumeAttach(`${volumeName}-attach`, {
                        instanceId: instance.id,
                        volumeId: volume.id
                    }, { parent: volume, provider: opts === null || opts === void 0 ? void 0 : opts.provider });
                    volumeCounter += 1;
                }
            }
            if (instanceArgs.secondaryPortConfig) {
                let portCounter = 0;
                for (let portArgs of instanceArgs.secondaryPortConfig) {
                    let portName = `${instanceArgs.name}-secondary-port-${portCounter}`;
                    let secondary_port = this.createPort(portName, portArgs, opts === null || opts === void 0 ? void 0 : opts.provider);
                    // Attach Secondary Openstack Network Port to Compute Instance
                    new openstack.compute.InterfaceAttach(`${portName}-attach`, {
                        instanceId: instance.id,
                        portId: secondary_port.id
                    }, { parent: secondary_port, provider: opts === null || opts === void 0 ? void 0 : opts.provider });
                    portCounter += 1;
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
    createVolume(name, volumeArgs, instance, provider) {
        let volume = new openstack.blockstorage.Volume(name, {
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
        }, { parent: instance, provider: provider });
        return volume;
    }
    /**
     *
     * @param name
     * @param portArgs
     * @param tags
     * @param provider
     * @returns
     */
    createPort(name, portArgs, provider) {
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
            tags: portArgs.tags
        }, { parent: this, provider: provider });
        return port;
    }
    /**
     *
     * @param name
     * @param instanceArgs
     * @param tags
     * @param provider
     * @returns
     */
    createInstance(name, instanceArgs, provider) {
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
            tags: instanceArgs.tags,
        }, { parent: this, provider: provider });
        return instance;
    }
    /**
     * Outputs
     */
    instanceIds() {
        return this.createdInstances.map(x => x.id);
    }
    instanceTags() {
        return this.createdInstances.map(x => x.allTags);
    }
    instanceMetadata() {
        return this.createdInstances.map(x => x.allMetadata);
    }
}
exports.Instance = Instance;
//# sourceMappingURL=index.js.map