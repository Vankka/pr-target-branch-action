# PR Target Branch Action

A GitHub action to check that a PR's target branch is correct, commenting and/or changing it if required

## Example usage

**Please note** using `pull_request_target` can be dangerous, read [GitHub's security article here](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/) before using examples with it

```yaml
name: Make sure new PRs are sent to development

on: pull_request_target

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: Vankka/pr-target-branch-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          target: main
          exclude: development # Don't prevent going from development -> main
          change-to: development
          comment: |
              Your PR was set to `main`, PRs should be sent to `development`
              The base branch of this PR has been automatically changed to `development`, please check that there are no merge conflicts
```

When `change-to` and `comment` are not used, pull_request_target and the GITHUB_TOKEN are not required. The Action will just fail (instead of changing the base branch or commenting) when the target branch is wrong.
```yaml
name: Make sure new PRs are sent to development

on: pull_request

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: Vankka/pr-target-branch-action@v1
        with:
          target: main
          exclude: development # Don't prevent going from development -> main
```

## Variables

### target (Required)

The base branch this action will check for, this also accepts a Regular Expression (pre- and suffixed with /), example values:
```
# Only matches the development branch
development

# Match all branches matching the pattern: feature-\w+
/feature-\\w+/
```

### include

Head (or compare) branch(es) that are subject to checking, can be provided with a branch name, `organization/owner name:branch name` or a Regular Expression matching the latter, example values:
```
# Match any branch called development
development

# Only match GitHub's development branch
GitHub:development

# Match PRs from all of GitHub's branches 
/GitHub:.*/
```

Multiple values can be provided with a string of values separated by spaces, example:
```
include: "main development v1"
```

### exclude

Head (or compare) branch(es) that will **not** be checked, can be provided with a branch name, `organization/owner name:branch name` or a Regular Expression matching the latter, example values:
```
# Match any branch called development
development

# Only match GitHub's development branch
GitHub:development

# Match PRs from all of GitHub's branches 
/GitHub:.*/
```

Multiple values can be provided with a string of values separated by spaces, example:
```
exclude: "main development v1"
```

### change-to

What the PRs base branch should be changed to if the base branched matches the given criteria.

Requires using the `pull_request_target` event and including the `GITHUB_TOKEN` environment variable

### comment

The comment to post if the base branch matches the given criteria.

Requires using the `pull_request_target` event and including the `GITHUB_TOKEN` environment variable
