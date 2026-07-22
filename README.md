# CI-Saver

**Cut GitHub Actions runner bills by 30–50% by dynamically skipping redundant test cycles when only non-code files change.**

CI-Saver is a premium GitHub Action built for teams that want to reduce CI waste without changing their workflow structure. It inspects pull request changes and helps you avoid burning runner minutes on updates that don’t affect your code.

> Premium tool: **$15/month subscription required**

## Prerequisites

A valid Gumroad license key is strictly required to run this action.

If a license key is missing, invalid, or unpaid, the action will fail-securely and block unauthorized builds.

## Get Started

Purchase your license key here:

[Buy CI-Saver on Gumroad](https://joshua633.gumroad.com/l/wkgqwq?wanted=true)

## Usage Example

```yaml
name: PR Checks

on:
  pull\_request:

jobs:
  ci-saver:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check whether heavy CI should run
        id: ci-saver
        uses: your-org/ci-saver@v1
        with:
          license\_key: \${{ secrets.GUMROAD\_LICENSE\_KEY }}

      - name: Run heavy tests
        if: steps.ci-saver.outputs.should\_run == 'true'
        run: npm test
