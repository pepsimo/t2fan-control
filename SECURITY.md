# Security policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private reporting instead: go to the **Security** tab of this repository and click **Report a vulnerability**. Include:

- what the problem is and what an attacker could do with it;
- the steps to reproduce it;
- your Linux distribution, Cinnamon version and Mac model.

You will get an answer as soon as possible. Once a fix is released, the report can be made public, with credit to you if you wish.

## Design notes

The applet runs as your normal user. Only the helper script `/usr/local/bin/t2fan-control` runs as root, through a sudoers rule limited to five exact commands. See the [Security section of the README](README.md#security) for details.
