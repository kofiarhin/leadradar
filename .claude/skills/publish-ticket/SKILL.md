---
name: publish-ticket
description: Publish one already-delivered ticket from a safe non-main Git branch by validating the delivered evidence and exact diff, presenting one explicit publish contract, then committing when needed, pushing without force, and creating a draft pull request without merging or deploying.
---

# Publish Ticket

Publish the Git work for one ticket that is already `delivered` under the active project's delivery contract.

This skill is the boundary between **delivered** and **committed / pushed / pull-requested**. It does not merge, deploy, release, or change application behaviour.

## Required input

Accept:

1. an explicit delivered ticket path;
2. a unique ticket number/basename that resolves to exactly one delivered ticket;
3. no argument only when exactly one current delivered ticket can be associated unambiguously with the active branch/diff.

If the ticket is legacy, not `delivered`, missing required delivery evidence, or ambiguous, stop. Use `/sync-project` or `/deliver-ticket` first rather than silently promoting lifecycle state.

## Preconditions

Before proposing any Git/GitHub write:

1. Read `AGENTS.md`, `CLAUDE.md`, the complete source ticket, its spec/plan when recorded, `review.md`, and relevant `context/*.md`.
2. Inspect Git status, current branch, configured remotes, upstream state, and commits ahead/behind the intended base branch.
3. Confirm the current branch is not `main`, `master`, the configured protected base branch, or another branch forbidden by project rules.
4. Confirm the ticket is `status: delivered` and its delivery evidence records the required verification/review outcome.
5. Inspect the exact branch diff and any uncommitted changes. Every file to be committed/pushed must be inside the delivered ticket's supported scope.
6. Stop if unrelated user changes, secrets, credentials, generated private data, or an unexpected protected file would be included.
7. Determine whether the branch already has a remote branch or an open pull request. Never create a duplicate PR for the same branch/base pair.
8. Confirm the intended base branch and GitHub repository from current project evidence rather than guessing.

Use [references/publish-workflow.md](references/publish-workflow.md) for detailed state handling.

## Publish states

Support these safe starting states:

### Delivered changes are uncommitted

The approved publish contract may include one scoped commit, then a normal push and draft PR.

### Delivered changes are already committed locally

Do not create a duplicate commit. The approved publish contract may push the existing in-scope commits and create the draft PR.

### Branch is already pushed

Do not force-push or rewrite history. If the remote contains the exact approved commits, create the draft PR when one does not already exist.

### Draft/open PR already exists

Do not create another PR. Report the existing PR and current publication state. Updating its title/body is a separate explicit change unless included in the approved contract.

## Publish contract

Before any commit, push, or PR creation, present one exact contract:

```text
# Ticket Publish Contract

Ticket: tickets/NNN-slug.md
Status: delivered

Repository: <owner/repo>
Current branch: <branch>
Base branch: <base>

Files/commits to publish:
- <exact files or commit range>

Commit:
- required: yes | no
- message: <message or existing commits>

Push:
- remote: <remote>
- branch: <branch>
- force: no

Draft PR:
- title: <title>
- body summary: <ticket outcome + verification + explicit exclusions>

Not included:
- merge
- deployment/release
- production configuration/data changes
- unrelated branch/history rewrites
```

Then stop for the project's required approval phrase. When no stronger project phrase exists, require:

```text
Approve publish
```

Approval covers only the listed repository, branch, base, files/commits, commit message, push target, and draft PR metadata. Any material difference invalidates approval.

## Revalidate after approval

Immediately before the first write:

- re-read Git status and current branch;
- confirm the approved file/commit set is unchanged;
- confirm base/upstream state has not materially changed;
- confirm no new unrelated or secret-bearing file would be included;
- confirm no equivalent pull request appeared after the contract was approved.

If anything material changed, stop and present a revised publish contract.

## Execution

After successful revalidation:

1. **Commit only when required.** Stage only the approved files. Do not use broad staging when it could include unrelated changes. Create the approved commit message. If commit fails, stop.
2. **Push normally.** Push the approved branch to the approved remote. Never force-push. If push fails, stop and report the local commit state; do not automatically retry a state-changing action.
3. **Create a draft PR.** Create exactly one draft pull request targeting the approved base branch. Include:
   - the delivered ticket/outcome;
   - concise implementation summary from observed evidence;
   - verification as Passed / Failed / Not run exactly as recorded;
   - remaining human-review items;
   - explicit statement that merge/deployment/release are not included.
4. Re-read the resulting branch/PR state and report the observed URL/number/head/base when available.

Do not mark the ticket delivered here; it must already be delivered before publishing.

## Permission boundary

Allowed only after explicit publish approval:

- create one scoped Git commit when needed;
- push the approved non-protected branch without force;
- create one draft pull request.

Not allowed:

- change runtime/application files;
- add/remove dependencies or modify data as part of publishing;
- amend/rebase/force-push or rewrite history unless a separate project rule explicitly authorizes a new contract;
- commit unrelated user changes;
- modify secrets/credentials;
- merge the pull request;
- deploy, release, activate production features, or mutate production data;
- delete branches or tags.

## Failure handling

Publishing can fail partially. Always report the exact observed state:

- `Delivered only` — no Git/GitHub write occurred;
- `Committed` — local commit created, not pushed;
- `Pushed` — remote branch updated, no PR created;
- `Draft PR created` — publication complete for this skill.

Never describe a later state when only an earlier state was observed.

## Completion report

Report:

- source ticket and delivered evidence checkpoint;
- current branch and base branch;
- commit SHA/message created or reused;
- push result and remote branch;
- draft PR number/URL and head/base;
- checks actually performed during publication;
- explicit confirmation that merge, deployment, release, and production/data mutation were not performed.
