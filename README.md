# Setup

## pnpm

1. Install [pnpm](https://pnpm.js.org/en/installation)
1. Run `pnpm install`

## Visual Studio Code

1. Install [Visual Studio Code](https://code.visualstudio.com/docs/setup/setup-overview)
1. Run the command `Tasks: Allow Automatic Tasks in Folder`

## CockroachDB

1. Install [CockroachDB](https://www.cockroachlabs.com/docs/stable/install-cockroachdb.html)
1. Run `mkdir -p .crdb/certs && mkdir -p .crdb/ca`
1. Run `cockroach cert create-ca --certs-dir=.crdb/certs --ca-key=.crdb/ca/ca.key`
1. Run `cockroach cert create-node localhost --certs-dir=.crdb/certs --ca-key=.crdb/ca/ca.key`
1. Run `cockroach cert create-client root --certs-dir=.crdb/certs --ca-key=.crdb/ca/ca.key`
1. Run `cockroach cert create-client api --certs-dir=.crdb/certs --ca-key=.crdb/ca/ca.key`

# Development

## `pnpm start`

Runs the development server

## `pnpm fmt`

Formats all source code

## `pnpm build`

Compiles all source code
