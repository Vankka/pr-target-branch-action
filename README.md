# PR Target Branch Action

A GitHub action to check that a PR's target branch is correct, commenting and/or changing it if required

## Example usage

**Please note** using `pull_request_target` can be dangerous, read [GitHub's security article here](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/) before using examples with it

```yaml
name: Make sure new PRs are sent to development

on:
  pull_request_target: # Please read https://securitylab.github.com/research/github-actions-preventing-pwn-requests/ before using
    types: [opened, edited]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: Vankka/pr-target-branch-action@v1.1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          target: main
          exclude: development # Don't prevent going from development -> main
          change-to: development
          comment: |
              Your PR was set to target `main`, PRs should be target `development`
              The base branch of this PR has been automatically changed to `development`, please check that there are no merge conflicts
```

When `change-to`, `comment`, `already-exists-action`, `already-exists-comment` and `already-exists-other-comment` are not used, pull_request_target and the GITHUB_TOKEN are not required. The Action will just fail (instead of changing the base branch or commenting) when the target branch is wrong.
```yaml
name: Make sure new PRs are sent to development

on:
  pull_request:
    types: [opened, edited]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: Vankka/pr-target-branch-action@v1.1
        with:
          target: main
          exclude: development # Don't prevent going from development -> main
```


### Full example

Contains all the options, not necessarily a good configuration - see `already-exists-action` for more details

```yaml
name: Make sure new PRs are sent to development

on:
  pull_request_target:
    types: [opened, edited]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: Vankka/pr-target-branch-action@v1.1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          target: main
          exclude: development # Don't prevent going from development -> main
          change-to: development
          comment: |
              Your PR was set to target `main`, PRs should be target `development`
              The base branch of this PR has been automatically changed to `development`, please check that there are no merge conflicts
          already-exists-action: close_other_continue
          already-exists-comment: "Closing {url} as it has the same base branch"
          already-exists-other-comment: "This PR was closed in favor of {url}"
```

# Variables

## target (Required)

The base branch this action will check for, this also accepts a Regular Expression (pre- and suffixed with /, the pattern should match only the branch name), example values:
```
# Only matches the development branch
development

# Match all branches matching the pattern: feature-\w+
/feature-\\w+/
```

Multiple values can be provided with a string of values separated by spaces, example:
```
include: "main development v1"
```

## include

Head (or compare) branch(es) that are subject to checking, can be provided with a branch name, `organization/owner name:branch name` or a Regular Expression matching the latter. Also supports providing multiple targets by using spaces. Example values:
```
# Match the target project's branch called development
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

## exclude

Head (or compare) branch(es) that will **not** be checked, can be provided with a branch name, `organization/owner name:branch name` or a Regular Expression matching the latter. Also supports providing multiple targets by using spaces. Example values:
```
# Match the target project's branch called development
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

## change-to

What the PRs base branch should be changed to if the base branched matches the given criteria.

Requires using the `pull_request_target` event and including the `GITHUB_TOKEN` environment variable

## comment

The comment to post if the base branch matches the given criteria.

Requires using the `pull_request_target` event and including the `GITHUB_TOKEN` environment variable

## already-exists-action

**Only if change-to is specified,** the action to take if another open PR with the same head & base branches exists

### error

The action simply fails, this is the default value

### close_this

Closes this PR

### close_other

Closes the other PR. Keep in mind this ignores if the other pr was created by someone else.

### close_other_continue

Closes the other PR, and processes `change-to` and `comment` as normal. Keep in mind this ignores if the other pr was created by someone else.

### nothing

Nothing special happens, `already-exists-comment` will be posted if it is specified

## already-exists-comment

**Only if change-to is specified,** the comment to post if another open PR with the same head & base branches exists. 

Use {number} to get the pull request number or {url} to get the pull request link for the other pr.

## already-exists-other-comment

The comment to post on the other pr if a pr is closed due to `already-exists-action` being set to `close_other` or `close_other_continue`.

Use {number} to get the pull request number or {url} to get the pull request link for the pr that wasn't closed.
