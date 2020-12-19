# @wejendorp/semantic-release-action

This is a fork of
[cycjimmy/semantic-release-action](https://github.com/cycjimmy/semantic-release-action)
with fixed `semantic-release` version and custom `semantic-release` config to
allow publishing to other registries.

The `semantic-release/npm` plugin has no good way of publishing to custom registries,
without relying on `package.json` `publishConfig` values. Changing the package
depending on registry makes it impossible to cross-publish

By using `npm publish` directly, this action works around these limitations of
[semantic-release](https://github.com/semantic-release/semantic-release).

This action can also be used with non published packages to do github release
management.

See [action.yml](action.yml) for input/outputs.

## Example usage

```yml
steps:
  - name: 🚀 Release
    uses: wejendorp/semantic-release-action@v1
    id: semantic-release
    with:
      branches: |
        [
          '+([0-9])?(.{+([0-9]),x}).x',
          'master',
          'next',
          'next-major',
          {name: 'beta', prerelease: true},
          {name: 'alpha', prerelease: true}
        ]
      registry: https://npm.pkg.github.com/
      npm_publish: true
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
