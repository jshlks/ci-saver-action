# CI-Saver

## Automatically cut 30–50% from your GitHub Actions bill by skipping unnecessary runs

**CI-Saver** helps teams avoid wasting minutes on workflows that don’t need to run, so your CI stays fast, focused, and cost-efficient.

## Paid License Required

A valid **paid license key is strictly required** to use CI-Saver.

Without an active license, the action will stop with an access-denied message and will not proceed with workflow inspection.

## How It Works

CI-Saver checks your pull request changes and determines whether your workflow should run. It is ideal for teams that want to reduce spend while keeping automation in place.

## How to Buy

Get your license here:

[Buy CI-Saver on Gumroad](https://gumroad.com/YOUR-PLACEHOLDER-URL)

After purchase, you’ll receive a license key to use in your GitHub repository secrets.

## Installation

Add CI-Saver to your workflow like this:

```yaml
name: CI

on:
  pull\_request:
    branches:
      - main

jobs:
  inspect:
    runs-on: ubuntu-latest
    outputs:
      should\_run: \${{ steps.ci\_saver.outputs.should\_run }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: CI-Saver Code Inspector
        id: ci\_saver
        uses: your-org/ci-saver@v1
        with:
          license\_key: \${{ secrets.GUMROAD\_LICENSE\_KEY }}

  build:
    needs: inspect
    if: needs.inspect.outputs.should\_run == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build
        run: npm ci && npm test
