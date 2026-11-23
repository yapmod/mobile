import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { hasNotes, section } from "./manual-changelog.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const base = process.env.CHANGELOG_BASE;
if (!base) throw new Error("CHANGELOG_BASE is required");
const pending = section(readFileSync("CHANGELOG.md", "utf8"), "Unreleased").body;
const files = git("diff", "--name-only", `${base}...HEAD`).split("\n");
const productChange = files.some(
  (file) =>
    /^(src\/|assets\/|vendor\/|plugin\/|App\.tsx$|app\.config\.js$|index\.ts$)/.test(file) &&
    !file.endsWith(".test.mjs"),
);
if (productChange) {
  const ancestor = git("merge-base", base, "HEAD");
  const previous = git("ls-tree", "--name-only", ancestor, "CHANGELOG.md")
    ? section(git("show", `${ancestor}:CHANGELOG.md`), "Unreleased").body : "";
  if (!hasNotes(pending) || pending === previous) {
    throw new Error("Add hand-written user-facing notes under ## [Unreleased] in CHANGELOG.md.");
  }
}
