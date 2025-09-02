import * as openstack from "@pulumi/openstack";
import * as pulumi from "@pulumi/pulumi";

export interface CustomSecGroupRuleArgs extends Omit<openstack.networking.SecGroupRuleArgs, 'direction' | 'ethertype' | 'securityGroupId' | 'remoteIpPrefix'> {
    ethertype?: 'IPv4' | 'IPv6';
    remoteIpPrefix?: pulumi.Input<string>[];
    port?: number;
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
    allowIngressAllIPv4?: boolean;
    allowIngressAllIPv6?: boolean;
    allowEgressAllIPv4?: boolean;
    allowEgressAllIPv6?: boolean;
};

export class SecGroup extends pulumi.ComponentResource {

    secGroup!: openstack.networking.SecGroup;

    constructor(name: string, args: BaseSecGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        super("okassov:openstack:SecGroup", name, {}, opts);

        /**
         * Create SecGroup
         */
        this.secGroup = this.createSecGroup(args.name, {...args, deleteDefaultRules: true}, opts?.provider);

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
        };

        if (args.allowSelfIPv6) {

            this.createSecGroupRule(`${args.name}-self-ipv6-allow`, {
                direction: "ingress",
                ethertype: "IPv6",
                securityGroupId: this.secGroup.id,
                description: "Allow all self IPv6 traffic",
                remoteGroupId: this.secGroup.id
            }, opts?.provider)
        };

        if (args.allowIngressAllIPv4) {

            this.createSecGroupRule(`${args.name}-all-ingress-ipv4-allow`, {
                direction: "ingress",
                ethertype: "IPv4",
                securityGroupId: this.secGroup.id,
                description: "Allow all Ingress IPv4 traffic",
                remoteIpPrefix: "0.0.0.0/0",
            }, opts?.provider)
        };

        if (args.allowIngressAllIPv6) {
            this.createSecGroupRule(`${args.name}-all-ingress-ipv6-allow`, {
                direction: "ingress",
                ethertype: "IPv6",
                securityGroupId: this.secGroup.id,
                description: "Allow all Ingress IPv6 traffic",
                remoteIpPrefix: "::/0",
            }, opts?.provider)
        };

        if (args.allowEgressAllIPv4) {

            this.createSecGroupRule(`${args.name}-all-egress-ipv4-allow`, {
                direction: "egress",
                ethertype: "IPv4",
                securityGroupId: this.secGroup.id,
                description: "Allow all Egress IPv4 traffic",
                remoteIpPrefix: "0.0.0.0/0",
            }, opts?.provider)
        };

        if (args.allowEgressAllIPv6) {
            this.createSecGroupRule(`${args.name}-all-egress-ipv6-allow`, {
                direction: "egress",
                ethertype: "IPv6",
                securityGroupId: this.secGroup.id,
                description: "Allow all Egress IPv6 traffic",
                remoteIpPrefix: "::/0",
            }, opts?.provider)
        };


        if (args.rules) {

            /**
             * Create and Attach SecGroup Rules
             */
            Object.entries(args.rules).forEach(([direction, rules]) => {
                rules.forEach((rule: any, ruleCounter: number) => {
                    // Sort IP prefixes to ensure consistent ordering
                    const sortedPrefixes = [...rule.remoteIpPrefix].sort();
                    sortedPrefixes.forEach((prefix: any, prefixCounter: number) => {
                        // Create deterministic rule name based on protocol, port, and IP
                        const sanitizedPrefix = prefix.toString().replace(/[^a-zA-Z0-9]/g, '-');
                        const port = rule.port || `${rule.portRangeMin || 'any'}-${rule.portRangeMax || 'any'}`;
                        const protocol = rule.protocol || 'any';
                        const ruleName = `${args.name}-${direction}-${protocol}-${port}-${sanitizedPrefix}`;

                        if (rule.port) {
                            this.createSecGroupRule(ruleName, {
                                direction: direction,
                                ethertype: rule.ethertype ?? "IPv4",
                                securityGroupId: this.secGroup.id,
                                description: rule.description,
                                portRangeMax: rule.port,
                                portRangeMin: rule.port,
                                protocol: rule.protocol,
                                region: rule.region,
                                remoteGroupId: rule.remoteGroupId,
                                remoteIpPrefix: prefix,
                                tenantId: rule.tenantId
                            }, opts?.provider)
                        } else {
                            this.createSecGroupRule(ruleName, {
                                direction: direction,
                                ethertype: rule.ethertype ?? "IPv4",
                                securityGroupId: this.secGroup.id,
                                description: rule.description,
                                portRangeMax: rule.portRangeMax,
                                portRangeMin: rule.portRangeMin,
                                protocol: rule.protocol,
                                region: rule.region,
                                remoteGroupId: rule.remoteGroupId,
                                remoteIpPrefix: prefix,
                                tenantId: rule.tenantId
                            }, opts?.provider)
                        }
                    });
                });
            });
        };

        this.registerOutputs({});
    };

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

        return new openstack.networking.SecGroup(name, args, { parent: this, provider: provider });
    };

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

        return new openstack.networking.SecGroupRule(name, args, { parent: this.secGroup, provider: provider });
    };
};
