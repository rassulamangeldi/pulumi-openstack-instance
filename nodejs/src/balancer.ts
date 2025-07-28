import * as openstack from "@pulumi/openstack";
import * as pulumi from "@pulumi/pulumi";

export interface CustomMembersArgs extends Omit<openstack.loadbalancer.MemberArgs, 'poolId'> {};

export interface CustomPoolArgs extends openstack.loadbalancer.PoolArgs {
    name: string;
    members: CustomMembersArgs[];
};

export interface CustomListenerArgs extends Omit<openstack.loadbalancer.ListenerArgs, 'loadbalancerId'> {
    name: string;
    pools: CustomPoolArgs[];
};

export interface BaseLoadBalancerArgs extends Omit<openstack.loadbalancer.LoadBalancerArgs, "name"> {
    name: string;
    listeners: CustomListenerArgs[];
};

export class LoadBalancer extends pulumi.ComponentResource {

    loadBalancer: openstack.loadbalancer.LoadBalancer;
    listener!: openstack.loadbalancer.Listener;
    pool!: openstack.loadbalancer.Pool;

    constructor(name: string, args: BaseLoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        super("okassov:openstack:LoadBalancer", name, {}, opts);
    
        this.loadBalancer = this.createLoadBalancer(args.name, args, opts?.provider);
        
        args.listeners.forEach((listener: any) => {

            /**
             * Create LoadBalancer Listeners
             */
            this.listener = this.createListener(
                `${args.name}-${listener.name}`, 
                { ...listener, loadbalancerId: this.loadBalancer.id }, 
                opts?.provider
            );

            listener.pools.forEach((pool: any) => {

                /**
                 * Create LoadBalancer Pools
                 */
                this.pool = this.createPool(
                    `${args.name}-${listener.name}-${pool.name}`, 
                    { ...pool, listenerId: this.listener.id }, 
                    opts?.provider
                );

                /**
                 * Create Pool Members
                 */
                this.createMembers(
                    `${args.name}-${listener.name}-${pool.name}`, 
                    { members: pool.members, poolId: this.pool.id }, 
                    opts?.provider
                );

            });

        });

    }


    /**
     * 
     * @param name 
     * @param args
     * @param provider 
     * @returns 
     */
    private createLoadBalancer(name: string,
        args: openstack.loadbalancer.LoadBalancerArgs,
        provider: pulumi.ProviderResource | undefined): openstack.loadbalancer.LoadBalancer {

        return new openstack.loadbalancer.LoadBalancer(name, args, { parent: this, provider: provider });
    };

    /**
     * 
     * @param name 
     * @param args
     * @param provider 
     * @returns 
     */
    private createListener(name: string,
        args: openstack.loadbalancer.ListenerArgs,
        provider: pulumi.ProviderResource | undefined): openstack.loadbalancer.Listener {

        return new openstack.loadbalancer.Listener(name, args, { parent: this.loadBalancer, provider: provider });
    };

    /**
     * 
     * @param name 
     * @param args
     * @param provider 
     * @returns 
     */
    private createPool(name: string,
        args: openstack.loadbalancer.PoolArgs,
        provider: pulumi.ProviderResource | undefined): openstack.loadbalancer.Pool {

        return new openstack.loadbalancer.Pool(name, args, { parent: this.listener, provider: provider });
    };

    /**
     * 
     * @param name 
     * @param args
     * @param provider 
     * @returns 
     */
    private createMembers(name: string,
        args: openstack.loadbalancer.MembersArgs,
        provider: pulumi.ProviderResource | undefined): openstack.loadbalancer.Members {

        return new openstack.loadbalancer.Members(name, args, { parent: this.pool, provider: provider });
    };

}
