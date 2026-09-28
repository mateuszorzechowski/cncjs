const { execFileSync } = require('child_process');

/**
 * The panel's version: this fork's builds, not cncjs's `package.json`.
 *
 * Our releases are tags named `panel-…` (`panel-2026.09.28`); the upstream
 * `v1.x` tags in the same repository are not ours and are never matched. A
 * build of a tagged commit is that tag. A build between tags is the last tag
 * and the commit it was built from; with no tag yet, just the commit.
 * Built from a working tree with changes in it, it says so — that build is
 * no commit at all.
 *
 * `id` is what two builds are compared by: the commit, and for a build with
 * local changes also the moment it was built, since two of those from the
 * same commit are still different panels.
 */
const TAG = 'panel-*';

const describe = ({ tag, exact, commit, dirty, builtAt }) => {
  let label = commit;
  if (tag) {
    label = exact ? tag : `${tag} · ${commit}`;
  }
  return {
    label,
    tag: tag || null,
    commit,
    dirty,
    builtAt,
    id: dirty ? `${commit}+${builtAt}` : commit,
  };
};

const git = (args, cwd) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (err) {
    return null;
  }
};

/** Read from git in `cwd`; `fallback` (the package version) when there is no git to ask. */
const readVersion = (cwd, fallback, now = new Date()) => {
  const commit = git(['rev-parse', '--short=7', 'HEAD'], cwd);
  if (!commit) {
    return describe({ tag: fallback, exact: true, commit: fallback, dirty: false, builtAt: now.toISOString() });
  }
  const tag = git(['describe', '--tags', '--abbrev=0', '--match', TAG, 'HEAD'], cwd);
  const exact = Boolean(tag) && git(['describe', '--tags', '--exact-match', '--match', TAG, 'HEAD'], cwd) === tag;
  const dirty = git(['status', '--porcelain', '--untracked-files=no'], cwd) !== '';
  return describe({ tag, exact, commit, dirty, builtAt: now.toISOString() });
};

module.exports = { describe, readVersion };
