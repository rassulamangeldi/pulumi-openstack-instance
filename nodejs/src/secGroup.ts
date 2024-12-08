import * as openstack from "@pulumi/openstack";
import * as pulumi from "@pulumi/pulumi";

export interface CustomSecGroupRuleArgs extends Omit<openstack.networking.SecGroupRuleArgs, 'direction' | 'ethertype' | 'securityGroupId' | 'remoteIpPrefix'> {
    ethertype?: 'IPv4' | 'IPv6';
    remoteIpPrefix?: string[];
};

export interface CustomSecGroupArgs {
    ingress: CustomSecGroupRuleArgs[];
    egress?: CustomSecGroupRuleArgs[];
};

export interface BaseSecGroupArgs extends openstack.networking.SecGroupArgs {
    name: string;
    rules: CustomSecGroupArgs;
    allowSelfIPv4?: boolean;
    allowSelfIPv6?: boolean;
};

export class SecGroup extends pulumi.ComponentResource {

    secGroup!: openstack.networking.SecGroup;

    constructor(name: string, args: BaseSecGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        super("okassov:openstack:SecGroup", name, {}, opts);

        /**
         * Create SecGroup
         */
        this.secGroup = this.createSecGroup(args.name, args, opts?.provider)
            
        /**
         * Create Self Rules
         */
        if (args.allowSelfIPv4) {

            this.createSecGroupRule(`${args.name}-self-ipv4-allow`, {
                direction: "ingress",
                ethertype: "IPv4",
                securityGroupId: this.secGroup.id,
                description: "Allow all self IPv4 traffic",
                remoteGroupId: this.secGroup.id
            }, opts?.provider)
        }

        if (args.allowSelfIPv6) {

            this.createSecGroupRule(`${args.name}-self-ipv4-allow`, {
                direction: "ingress",
                ethertype: "IPv6",
                securityGroupId: this.secGroup.id,
                description: "Allow all self IPv6 traffic",
                remoteGroupId: this.secGroup.id
            }, opts?.provider)
        }

        if (args.rules) {

            /**
             * Create and Attach SecGroup Rules
             */
            Object.entries(args.rules).forEach(([direction, rules]) => {
                rules.forEach((rule: any, ruleCounter: number) => {
                  rule.remoteIpPrefix.forEach((prefix: any, prefixCounter: number) => {
                    const ruleName = `${args.name}-${direction}-rule-${ruleCounter}-prefix-${prefixCounter}`;
              
                    new openstack.networking.SecGroupRule(ruleName, {
                      direction,
                      ethertype: rule.ethertype,
                      securityGroupId: this.secGroup.id,
                      description: rule.description,
                      portRangeMax: rule.portRangeMax !== -1 ? rule.portRangeMax : undefined,
                      portRangeMin: rule.portRangeMin !== -1 ? rule.portRangeMin : undefined,
                      protocol: rule.protocol !== "any" ? rule.protocol : undefined,
                      region: rule.region,
                      remoteGroupId: rule.remoteGroupId,
                      tenantId: rule.tenantId,
                      remoteIpPrefix: prefix,
                    }, { parent: this.secGroup, provider: opts?.provider });
                  });
                });
              });
        }

        this.registerOutputs({});
    }

    /**
     * 
     * @param name 
     * @param args 
     * @param provider 
     * @returns 
    */
    private createSecGroup(name: string, 
        args: openstack.networking.SecGroupArgs, 
        provider: pulumi.ProviderResource | undefined): openstack.networking.SecGroup {
    
        let secGroup = new openstack.networking.SecGroup(name, {
            ...args
        }, { parent: this, provider: provider })
    
        return secGroup
    }

    /**
     * 
     * @param name 
     * @param args 
     * @param provider 
     * @returns 
     */
    private createSecGroupRule(name: string, 
        args: openstack.networking.SecGroupRuleArgs,
        provider: pulumi.ProviderResource | undefined): openstack.networking.SecGroupRule {

        let secGroupRule = new openstack.networking.SecGroupRule(name, {
            ...args
        }, { parent: this.secGroup, provider: provider })

        return secGroupRule
    }

    
}
