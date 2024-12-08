import * as openstack from "@pulumi/openstack";
import * as pulumi from "@pulumi/pulumi";
export interface CustomRuleArgs extends Omit<openstack.networking.SecGroupRuleArgs, 'direction' | 'ethertype' | 'securityGroupId'> {
}
export interface SecGroupArgs {
    ingress: CustomRuleArgs[];
    egress?: CustomRuleArgs[];
}
export interface CustomInstanceArgs extends openstack.compute.InstanceArgs {
    name: string;
    portConfig?: openstack.networking.PortArgs[];
    secGroupConfig?: SecGroupArgs;
    dataVolumesConfig?: openstack.blockstorage.VolumeArgs[];
    secondaryPortConfig?: openstack.networking.PortArgs[];
}
export interface SharedArgs extends Omit<CustomInstanceArgs, 'name'> {
}
export interface BaseInstanceArgs {
    sharedConfig?: SharedArgs;
    instanceConfig: CustomInstanceArgs[];
    tags?: string[];
}
export interface BaseSecGroupArgs {
    name: string;
    config?: SecGroupArgs;
    tags?: string[];
}
export declare class SecGroup extends pulumi.ComponentResource {
    secGroup: openstack.networking.SecGroup;
    constructor(name: string, args: BaseSecGroupArgs, opts?: pulumi.ComponentResourceOptions);
    /**
     *
     * @param name
     * @param secGroupArgs
     * @param tags
     * @param provider
     * @returns
    */
    private createSecGroup;
}
export declare class Instance extends pulumi.ComponentResource {
    createdInstances: openstack.compute.Instance[];
    constructor(name: string, args: BaseInstanceArgs, opts?: pulumi.ComponentResourceOptions);
    /**
     *
     * @param name
     * @param volumeArgs
     * @param tags
     * @param instance
     * @param provider
     * @returns
     */
    private createVolume;
    /**
     *
     * @param name
     * @param portArgs
     * @param tags
     * @param provider
     * @returns
     */
    private createPort;
    /**
     *
     * @param name
     * @param instanceArgs
     * @param tags
     * @param provider
     * @returns
     */
    private createInstance;
    /**
     * Outputs
     */
    instanceIds(): pulumi.Output<string>[];
    instanceTags(): pulumi.Output<string[]>[];
    instanceMetadata(): pulumi.Output<{
        [key: string]: any;
    }>[];
}
