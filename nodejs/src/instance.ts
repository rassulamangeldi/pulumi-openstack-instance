import * as openstack from "@pulumi/openstack";
import * as pulumi from "@pulumi/pulumi";

export interface CustomInstanceArgs extends openstack.compute.InstanceArgs {
    name: string;
    portConfig?: openstack.networking.PortArgs[];
    dataVolumesConfig?: openstack.blockstorage.VolumeArgs[];
    secondaryPortConfig?: openstack.networking.PortArgs[];
};

export interface SharedInstanceArgs extends openstack.compute.InstanceArgs {
    name?: string;
    portConfig?: openstack.networking.PortArgs[];
    dataVolumesConfig?: openstack.blockstorage.VolumeArgs[];
    secondaryPortConfig?: openstack.networking.PortArgs[];
};

export interface BaseInstanceArgs {
    sharedConfig?: SharedInstanceArgs;
    instanceConfig: CustomInstanceArgs[];
};

export class Instance extends pulumi.ComponentResource {

    createdInstances: openstack.compute.Instance[] = [];
    createdPorts: openstack.networking.Port[] = [];

    constructor(name: string, args: BaseInstanceArgs, opts?: pulumi.ComponentResourceOptions) {
        super("okassov:openstack:Instance", name, {}, opts);

        /**
         * Create Openstack Compute Instances
         */
        for (let i = 0; i < args.instanceConfig?.length; i++) {

            let instanceArgs = Object.assign({}, args.sharedConfig, args.instanceConfig[i]);
            let instance: openstack.compute.Instance;

            // Create Network Port
            var port: openstack.networking.Port;
            if (instanceArgs.portConfig) {

                let portCounter = 0
                let networks: { port: pulumi.Output<string> }[] = []
                for (let portArgs of instanceArgs.portConfig) {

                    let portName: string = `${instanceArgs.name}-port-${portCounter}`

                    port = this.createPort(portName, portArgs, opts?.provider)
                    this.createdPorts.push(port)

                    networks.push({ port: port.id })

                    portCounter += 1
                }

                instanceArgs["networks"] = networks
            };

            // Create Instance
            if (!instanceArgs.name) {
                throw new Error("Name is required");
            };

            instance = this.createInstance(instanceArgs.name, instanceArgs, opts?.provider);
            this.createdInstances.push(instance);

            // Create Data Volume
            if (instanceArgs.dataVolumesConfig) {

                let volumeCounter = 0
                for (let volumeArgs of instanceArgs.dataVolumesConfig) {

                    let volumeName: string = `${instanceArgs.name}-dataVolume-${volumeCounter}`
                    let volume = this.createVolume(volumeName, volumeArgs, instance, opts?.provider)

                    new openstack.compute.VolumeAttach(`${volumeName}-attach`, {
                        instanceId: instance.id,
                        volumeId: volume.id
                    }, { parent: volume, provider: opts?.provider })

                    volumeCounter += 1
                }
            };

            if (instanceArgs.secondaryPortConfig) {

                let portCounter = 0
                for (let portArgs of instanceArgs.secondaryPortConfig) {

                    let portName: string = `${instanceArgs.name}-secondary-port-${portCounter}`

                    let secondary_port = this.createPort(portName, portArgs, opts?.provider)

                    new openstack.compute.InterfaceAttach(`${portName}-attach`, {
                        instanceId: instance.id,
                        portId: secondary_port.id
                    }, { parent: secondary_port, provider: opts?.provider })

                    portCounter += 1
                }
            };
        }

        this.registerOutputs({});
    };


    /**
     * 
     * @param name 
     * @param args
     * @param instance 
     * @param provider 
     * @returns 
     */
    private createVolume(name: string,
        args: openstack.blockstorage.VolumeArgs,
        instance: openstack.compute.Instance,
        provider: pulumi.ProviderResource | undefined): openstack.blockstorage.Volume {

        return new openstack.blockstorage.Volume(name, { name: name, ...args }, { parent: instance, provider: provider });
    };

    /**
     * 
     * @param name
     * @param args
     * @param provider 
     * @returns
     */
    private createPort(name: string,
        args: openstack.networking.PortArgs,
        provider: pulumi.ProviderResource | undefined): openstack.networking.Port {

        return new openstack.networking.Port(name, { name: name, ...args }, { parent: this, provider: provider });
    };

    /**
     * 
     * @param name
     * @param args
     * @param provider
     * @returns
     */
    private createInstance(name: string, args: CustomInstanceArgs,
        provider: pulumi.ProviderResource | undefined): openstack.compute.Instance {

        return new openstack.compute.Instance(name, args, { parent: this, provider: provider });
    };

    /**
     * Outputs
     */
    public instanceIds(): pulumi.Output<string>[] {
        return this.createdInstances.map(x => x.id)
    };

    public instanceTags(): pulumi.Output<string[]>[] {
        return this.createdInstances.map(x => x.allTags)
    };

    public instanceMetadata(): pulumi.Output<{ [key: string]: any }>[] {
        return this.createdInstances.map(x => x.allMetadata)
    };

    public ports(): openstack.networking.Port[] {
        return this.createdPorts
    };

}