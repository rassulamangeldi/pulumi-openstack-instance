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

Below is a simple example that creates an OpenStack instance:

```js
import * as pulumi from "@pulumi/pulumi";
import * as openstackModule from "@okassov/pulumi-openstack-instance";

// Create a new OpenStack instance
const instance = new openstackModule.Instance("my-instance", {
  name: "web-server",
  flavorName: "m1.small",
  imageName: "ubuntu-20.04",
  networkName: "public-net"
});

export const instanceIP = instance.ipAddress;
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
