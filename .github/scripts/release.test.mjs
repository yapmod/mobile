import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ManualChangelog, section } from "./manual-changelog.mjs";
import { parseConventionalCommits } from "release-please/build/src/commit.js";
import { Merge } from "release-please/build/src/plugins/merge.js";

const notes = "### Added\n\n- Choose where to save downloaded files.";
const log = `# Changelog\n\n## [Unreleased]\n\n${notes}\n`;

test("release proposal synchronizes npm versions and preserves authored notes", async () => {
  const github = {
    repository: { owner: "yapmod", repo: "mobile" },
    getFileContentsOnBranch: async (path) => ({
      parsedContent: path === "CHANGELOG.md" ? log : readFileSync(path, "utf8"),
    }),
  };
  const strategy = new ManualChangelog({
    github,
    targetBranch: "main",
    includeComponentInTag: false,
    initialVersion: "0.1.0",
  });
  const pr = await strategy.buildReleasePullRequest(
    parseConventionalCommits([
      { sha: "abc", message: "feat: automated wording", files: ["src/screens/Settings.tsx"] },
    ]),
  );
  assert.equal(pr.version.toString(), "0.1.0");
  assert.ok(pr.body.toString().includes(notes));
  assert.ok(!pr.body.toString().includes("automated wording"));
  for (const path of ["package.json", "package-lock.json"]) {
    const old = JSON.parse(readFileSync(path, "utf8"));
    old.version = "0.0.0";
    if (old.packages) old.packages[""].version = old.version;
    const updated = pr.updates
      .find((update) => update.path === path)
      .updater.updateContent(JSON.stringify(old));
    const result = JSON.parse(updated);
    assert.equal(result.version, "0.1.0");
    if (result.packages) assert.equal(result.packages[""].version, result.version);
  }
  const updated = pr.updates
    .find((update) => update.path === "CHANGELOG.md")
    .updater.updateContent(log);
  assert.equal(section(updated, "Unreleased").body, "");
  assert.equal(section(updated, "0.1.0").body, notes);
  github.getFileContentsOnBranch = async (_path, ref) => {
    assert.equal(ref, "approved");
    return { parsedContent: updated };
  };
  // Production merges candidates into a componentless manifest PR.
  const [candidate] = await new Merge(github, "main", {
    ".": { releaseType: "manual-node" },
  }, { forceMerge: true }).run([{ path: ".", config: { releaseType: "manual-node" }, pullRequest: pr }]);
  const merged = candidate.pullRequest;
  assert.equal(merged.headRefName, "release-please--branches--main");
  const release = await strategy.buildRelease({
    title: merged.title.toString(),
    body: merged.body.toString(),
    headBranchName: merged.headRefName,
    sha: "approved",
  });
  assert.ok(release, "The merged manifest PR must produce a release");
  assert.equal(release.tag.toString(), "v0.1.0");
  assert.equal(release.sha, "approved");
  assert.ok(release.notes.endsWith(notes));
});
