const core = require('@actions/core');
const github = require('@actions/github');

const WRONG_TARGET_OUTPUT = "wrong-target"
const COMMENTED_POSTED_OUTPUT = "comment-posted"
const NEW_TARGET_OUTPUT = "new-target"
const PR_ALREADY_EXISTS_OUTPUT = "pr-already-exists"

async function run() {
    try {
        let context = github.context;

        function array(input) {
            return input.split(" ").filter(str => str.trim().length > 0);
        }

        let token = process.env.GITHUB_TOKEN;
        let targetBranch = array(core.getInput("target"));
        let exclude = array(core.getInput("exclude"));
        let include = array(core.getInput("include"));
        let changeTo = core.getInput("change-to");
        let comment = core.getInput("comment");
        let alreadyExistsComment = core.getInput("already-exists-comment");
        let alreadyExistsAction = core.getInput("already-exists-action");
        let alreadyExistsOtherComment = core.getInput("already-exists-other-comment");

        let usingChangeTo = changeTo.length > 0;
        let usingComment = comment.length > 0;

        if (exclude.length > 0 && include.length > 0) {
            core.setFailed("exclude and include cannot be given at the same time");
            return;
        }

        let eventName = context.eventName;
        let isPrTarget = eventName === "pull_request_target";
        if (eventName !== "pull_request" && !isPrTarget) {
            core.setFailed("The event must be pull_request or pull_request_target");
            return;
        }

        if (usingChangeTo || usingComment) {
            if (!isPrTarget) {
                core.setFailed("pull_request_target is required when using change-to or comment");
                return;
            } else if (token.length === 0) {
                core.setFailed("GITHUB_TOKEN must be set (as a environment variable) when using change-to or comment");
                return;
            }
        }

        let payload = context.payload;
        let action = payload.action;
        if (action !== "edited" && action !== "opened") {
            core.info("Ignoring action that isn't opened or edited");
            return;
        }

        let pull_request = payload.pull_request;
        let to = pull_request.base;
        let from = pull_request.head;

        let sameRepo = to.repo.id === from.repo.id;

        function checkRegex(pattern, test) {
            if (pattern.startsWith("/") && pattern.endsWith("/")) {
                let regex = new RegExp(pattern.substring(1, pattern.length - 1));
                return regex.test(test)
            }
            return false;
        }

        function isInArray(target, array, allowDifferent) {
            for (let index in array) {
                if (!array.hasOwnProperty(index)) {
                    continue;
                }

                let organizationBranch = target.label;
                let branch = target.ref;

                let value = array[index];
                if (checkRegex(value, (allowDifferent ? organizationBranch : branch))) {
                    return true;
                } else if (allowDifferent && value.indexOf(":") !== -1 && organizationBranch === value) {
                    return true;
                } else if ((sameRepo || !allowDifferent) && value === branch) {
                    return true;
                }
            }
            return false;
        }

        // Check that the target matches
        if (!isInArray(to, targetBranch, false)) {
            return;
        }

        const rightTarget = () => core.setOutput(WRONG_TARGET_OUTPUT, false);
        if (include.length > 0 && !isInArray(from, include, true)) {
            core.info("This repository/branch is not included");
            rightTarget();
            return;
        } else if (isInArray(from, exclude, true)) {
            core.info("This repository/branch is excluded");
            rightTarget();
            return;
        }
        core.setOutput(WRONG_TARGET_OUTPUT, true);

        if (usingChangeTo || usingComment) {
            let octokit = github.getOctokit(token);

            let repoOwner = to.repo.owner.login;
            let repo = to.repo.name;
            let prNumber = pull_request.number;

            let prAlreadyExists = false;
            let comments = [];

            if (usingChangeTo) {
                let list = await octokit.pulls.list({
                    owner: repoOwner,
                    repo: repo,
                    state: "open",
                    head: from.label,
                    base: changeTo
                });

                let existingPr = list.data.length !== 0 ? list.data[0] : null;
                if (existingPr != null) {
                    core.setOutput(PR_ALREADY_EXISTS_OUTPUT, true);
                    prAlreadyExists = true;

                    if (alreadyExistsComment != null && alreadyExistsComment.length > 0) {
                        let comment = alreadyExistsComment
                            .replace("{number}", existingPr.number.toString())
                            .replace("{url}", existingPr._links.html.href);

                        await octokit.issues.createComment({
                            owner: repoOwner,
                            repo: repo,
                            issue_number: prNumber,
                            body: comment
                        });
                        comments.push(comment);
                        core.setOutput(COMMENTED_POSTED_OUTPUT, comments.toString());
                    }

                    if (alreadyExistsAction != null) {
                        switch (alreadyExistsAction) {
                            case "error":
                                core.setFailed("A open PR already exists for the same head & base");
                                break;
                            case "close_this":
                                await octokit.pulls.update({
                                    owner: repoOwner,
                                    repo: repo,
                                    pull_number: prNumber,
                                    state: "closed"
                                });
                                break;
                            case "close_other":
                            case "close_other_continue":
                                if (alreadyExistsOtherComment != null && alreadyExistsOtherComment.length > 0) {
                                    let comment = alreadyExistsOtherComment
                                        .replace("{number}", pull_request.number.toString())
                                        .replace("{url}", pull_request._links.html.href);

                                    await octokit.issues.createComment({
                                        owner: repoOwner,
                                        repo: repo,
                                        issue_number: existingPr.number,
                                        body: comment
                                    });
                                }
                                await octokit.pulls.update({
                                    owner: repoOwner,
                                    repo: repo,
                                    pull_number: existingPr.number,
                                    state: "closed"
                                });
                                break;
                            case "nothing": break;
                            default: {
                                core.info("Unrecognized already-exists-action: " + alreadyExistsAction);
                            }
                        }
                    }

                    if (alreadyExistsAction !== "close_other_continue") {
                        return;
                    }
                }

                if (changeTo === from.ref) {
                    // Don't change the base & head to match
                    core.info("Not changing base because it would be the same as the head");
                    return;
                }
                await octokit.pulls.update({
                    owner: repoOwner,
                    repo: repo,
                    pull_number: prNumber,
                    base: changeTo
                });
                core.setOutput(NEW_TARGET_OUTPUT, changeTo);
                core.info("Changed the branch to " + changeTo);
            }
            if (usingComment) {
                await octokit.issues.createComment({
                    owner: repoOwner,
                    repo: repo,
                    issue_number: prNumber,
                    body: comment
                });
                comments.push(comment);
                core.setOutput(COMMENTED_POSTED_OUTPUT, comments.toString());
                core.info("Commented: " + comment);
            }

            if (!prAlreadyExists) {
                core.setOutput(PR_ALREADY_EXISTS_OUTPUT, false);
            }
        } else {
            core.setFailed("This PR was submitted to the wrong branch");
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
