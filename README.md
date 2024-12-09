# Openstack Compute Instance Module for Pulumi

[![npm version](https://badge.fury.io/js/%40okassov%2Fpulumi-openstack-instance.svg)](https://badge.fury.io/js/%40okassov%2Fpulumi-openstack-instance)
[![License: MPL-2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://mozilla.org/MPL/2.0/)
[![Pulumi Registry](https://img.shields.io/badge/Pulumi-Registry-blueviolet.svg)](https://www.pulumi.com/registry/packages/openstack/)

This project provides Pulumi components for provisioning OpenStack infrastructure using TypeScript. It offers higher-level constructs on top of the Pulumi OpenStack provider, enabling you to easily create and manage:
  - [Instance](https://www.pulumi.com/registry/packages/openstack/api-docs/compute/instance)
  - [SecGroup](https://www.pulumi.com/registry/packages/openstack/api-docs/networking/secgroup/)
  - [SecGroupRule](https://www.pulumi.com/registry/packages/openstack/api-docs/networking/secgrouprule/)
  - [Port](https://www.pulumi.com/registry/packages/openstack/api-docs/networking/port/)
  - [Volume](https://www.pulumi.com/registry/packages/openstack/api-docs/blockstorage/volume/)

This module follows good practices described in the OpenStack and Pulumi documentation, and leverages the experience of the author and contributors.

A [CHANGELOG][changelog] is maintained for this project.

## Installation

### Node.js (NPM/Yarn)

Install the package via npm:

```sh
$ npm install --save '@okassov/pulumi-openstack-instance'
```

Install the package via yarn:

```sh
yarn add @okassov/pulumi-openstack-instance
```

## Requirements

- Node.js >= 14.x
- Pulumi >= 3.x
- Valid OpenStack credentials and API endpoint

## Authentication

Before using the module, ensure your OpenStack environment variables are set:

```sh
export OS_AUTH_URL=https://openstack.example.com:5000/v3
export OS_USERNAME=myuser
export OS_PASSWORD=mypass
export OS_PROJECT_NAME=myproject
```

Alternatively, configure Pulumi to use your OpenStack credentials:

```sh
pulumi config set openstack:authURL https://openstack.example.com:5000/v3
pulumi config set openstack:userName myuser
pulumi config set openstack:password mypass --secret
pulumi config set openstack:tenantName myproject
```

## Usage

How to use

```js
import * as pulumi from "@pulumi/pulumi";
import * as openstackCustom from "@okassov/pulumi-openstack-instance";
```

Example that creates an OpenStack SecurityGroup:

```js
const secGroup = new openstackCustom.SecGroup(`${resourceName}-sg`, {
    name: `${resourceName}-sg`,
    allowSelfIPv4: true,
    // allowSelfIPv6: true,
    allowEgressAllIPv4: true,
    allowEgressAllIPv6: true,
    // allowIngressAllIPv4: true,
    // allowIngressAllIPv6: true,
    rules: {
        ingress: [
            {   
                port: 22,
                protocol: "tcp",
                remoteIpPrefix: ["0.0.0.0/0"]
            },
            {
                port: 80,
                protocol: "tcp",
                remoteIpPrefix: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
            },
            {
                ethertype: "IPv4",
                description: "HTTPs Access",
                protocol: "tcp",
                portRangeMin: 443,
                portRangeMax: 443,
                remoteIpPrefix: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
            }
        ]
    }
});
```

Example that creates an OpenStack Instance:

```js
const baseVars = { env: "dev", project: "example", app: "pg" }
const resourceName = `${baseVars.env}-${baseVars.project}-${baseVars.app}`

const ubuntuImage = openstack.images.getImage({
    nameRegex: "^Ubuntu-Server-24.04-LTS.*",
    mostRecent: true,
    visibility: "public"
}).then(image => image.id);

const network = openstack.networking.getNetwork({
    name: "dev-network"
}).then(net => net.id);

const subnet = openstack.networking.getSubnet({
    cidr: "10.0.0.0/24"
}).then(sub => sub.id);

const instances = new openstackCustom.Instance(`${resourceName}-instance`, {
    sharedConfig: {
        flavorName: "d1.ram1cpu1",
        portConfig: [{ 
            networkId: network, 
            adminStateUp: true, 
            fixedIps: [{subnetId: subnet}] 
        }],
        blockDevices: [{ 
            uuid: ubuntuImage, 
            sourceType: "image", 
            volumeSize: 10, 
            destinationType: "volume", 
            volumeType: "ceph-ssd", 
            deleteOnTermination: true 
        }]
    },
    instanceConfig: [
        { name: `${resourceName}-01` },
        { name: `${resourceName}-02` },
        { name: `${resourceName}-03` },
    ]
});

export const instanceIds = instance.instanceIds;
export const instanceTags = instance.instanceTags;
export const instanceMetadata = instance.instanceMetadata;
export const instancePorts = instance.ports;
```

Example that creates an OpenStack Balancer:

```js
const baseVars = { env: "dev", project: "example", app: "pg" }
const resourceName = `${baseVars.env}-${baseVars.project}-${baseVars.app}`

const network = openstack.networking.getNetwork({
    name: "dev-network"
}).then(net => net.id);

const subnet = openstack.networking.getSubnet({
    cidr: "10.0.0.0/24"
}).then(sub => sub.id);

const balancer = new openstackCustom.LoadBalancer(`${resourceName}-balancer`, {
    name: `${resourceName}-balancer`,
    adminStateUp: true,
    vipAddress: "10.0.0.100",
    vipNetworkId: network,
    vipSubnetId: subnet,
    listeners: [
        {
            name: "HTTP",
            protocol: "TCP",
            protocolPort: 80,
            adminStateUp: true,
            pools: [
                {
                    name: "default",
                    protocol: "TCP",
                    lbMethod: "ROUND_ROBIN",
                    adminStateUp: true,
                    members: instances.createdPorts.map(port => {
                        return {
                            address: port.allFixedIps[0],
                            protocolPort: 30443,
                            subnetId: subnet,
                            adminStateUp: true
                        }
                    })
                }
            ]
        },
        {
            name: "HTTPS",
            protocol: "TCP",
            protocolPort: 443,
            adminStateUp: true,
            pools: [
                {
                    name: "default",
                    protocol: "TCP",
                    lbMethod: "ROUND_ROBIN",
                    adminStateUp: true,
                    members: instances.createdPorts.map(port => {
                        return {
                            address: port.allFixedIps[0],
                            protocolPort: 30443,
                            subnetId: subnet,
                            adminStateUp: true
                        }
                    })
                }
            ]
        },
    ]
});
```

## License

This package is licensed under the [Mozilla Public License, v2.0][mpl2].

## Contributing

Please feel free to open issues or pull requests on GitHub!

[pulumi]: https://pulumi.io
[mpl2]: https://www.mozilla.org/en-US/MPL/2.0/
[changelog]: https://github.com/okassov/pulumi-openstack-network/blob/master/CHANGELOG.md

## Authors

Okassov Marat <okasov.marat@gmail.com>
