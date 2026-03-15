import test from "node:test";
import assert from "node:assert";
import { buildBranchTree, sortTreeNodes } from "./branchTreeUtils.ts";

test("buildBranchTree - empty array", () => {
  const result = buildBranchTree([], (x) => x);
  assert.strictEqual(result.name, "root");
  assert.strictEqual(result.path, "");
  assert.strictEqual(result.isLeaf, false);
  assert.deepStrictEqual(result.children, {});
  assert.strictEqual(result.data, undefined);
});

test("buildBranchTree - flat branches", () => {
  const result = buildBranchTree(["main", "develop"], (x) => x);
  assert.strictEqual(Object.keys(result.children).length, 2);

  const mainNode = result.children["main"];
  assert.strictEqual(mainNode.name, "main");
  assert.strictEqual(mainNode.path, "main");
  assert.strictEqual(mainNode.isLeaf, true);
  assert.strictEqual(mainNode.data, "main");
  assert.deepStrictEqual(mainNode.children, {});

  const devNode = result.children["develop"];
  assert.strictEqual(devNode.name, "develop");
  assert.strictEqual(devNode.path, "develop");
  assert.strictEqual(devNode.isLeaf, true);
  assert.strictEqual(devNode.data, "develop");
  assert.deepStrictEqual(devNode.children, {});
});

test("buildBranchTree - nested branches", () => {
  const result = buildBranchTree(["feature/login", "feature/signup"], (x) => x);
  assert.strictEqual(Object.keys(result.children).length, 1);

  const featureNode = result.children["feature"];
  assert.strictEqual(featureNode.name, "feature");
  assert.strictEqual(featureNode.path, "feature");
  assert.strictEqual(featureNode.isLeaf, false);
  assert.strictEqual(featureNode.data, undefined);
  assert.strictEqual(Object.keys(featureNode.children).length, 2);

  const loginNode = featureNode.children["login"];
  assert.strictEqual(loginNode.name, "login");
  assert.strictEqual(loginNode.path, "feature/login");
  assert.strictEqual(loginNode.isLeaf, true);
  assert.strictEqual(loginNode.data, "feature/login");

  const signupNode = featureNode.children["signup"];
  assert.strictEqual(signupNode.name, "signup");
  assert.strictEqual(signupNode.path, "feature/signup");
  assert.strictEqual(signupNode.isLeaf, true);
  assert.strictEqual(signupNode.data, "feature/signup");
});

test("buildBranchTree - deep nesting", () => {
  const result = buildBranchTree(["a/b/c/d"], (x) => x);

  const aNode = result.children["a"];
  assert.strictEqual(aNode.isLeaf, false);
  assert.strictEqual(aNode.path, "a");

  const bNode = aNode.children["b"];
  assert.strictEqual(bNode.isLeaf, false);
  assert.strictEqual(bNode.path, "a/b");

  const cNode = bNode.children["c"];
  assert.strictEqual(cNode.isLeaf, false);
  assert.strictEqual(cNode.path, "a/b/c");

  const dNode = cNode.children["d"];
  assert.strictEqual(dNode.isLeaf, true);
  assert.strictEqual(dNode.path, "a/b/c/d");
  assert.strictEqual(dNode.data, "a/b/c/d");
});

test("buildBranchTree - mixed hierarchy", () => {
  const result = buildBranchTree(["main", "feature/a"], (x) => x);
  assert.strictEqual(Object.keys(result.children).length, 2);

  const mainNode = result.children["main"];
  assert.strictEqual(mainNode.isLeaf, true);

  const featureNode = result.children["feature"];
  assert.strictEqual(featureNode.isLeaf, false);
  assert.strictEqual(featureNode.children["a"].isLeaf, true);
});

test("buildBranchTree - overlapping branches", () => {
  // Scenario where "feature" is a folder, but what if there's a branch named "feature"?
  // git doesn't allow this, but let's test how the tree builder handles it.
  const result = buildBranchTree(["feature", "feature/a"], (x) => x);
  const featureNode = result.children["feature"];

  // It should have become a leaf when "feature" was added, and it has children when "feature/a" was added.
  // The order might matter.
  assert.strictEqual(featureNode.isLeaf, true);
  assert.strictEqual(featureNode.data, "feature");
  assert.strictEqual(Object.keys(featureNode.children).length, 1);
  assert.strictEqual(featureNode.children["a"].isLeaf, true);
  assert.strictEqual(featureNode.children["a"].data, "feature/a");
});

test("buildBranchTree - objects as items", () => {
  const items = [
    { id: 1, ref: "refs/heads/main" },
    { id: 2, ref: "refs/heads/feature/xyz" }
  ];
  const result = buildBranchTree(items, (item) => item.ref.replace("refs/heads/", ""));

  assert.strictEqual(result.children["main"].data, items[0]);

  const featureNode = result.children["feature"];
  assert.strictEqual(featureNode.data, undefined); // Intermediate nodes shouldn't have data
  assert.strictEqual(featureNode.children["xyz"].data, items[1]);
});

test("sortTreeNodes - directories first, then leaves alphabetically", () => {
  // Constructing a dummy node with mixed children
  const root = buildBranchTree(["z_branch", "a_branch", "folder_b/1", "folder_a/1"], (x) => x);

  const sorted = sortTreeNodes(root);

  assert.strictEqual(sorted.length, 4);

  // Folders first: folder_a, folder_b
  assert.strictEqual(sorted[0].name, "folder_a");
  assert.strictEqual(sorted[1].name, "folder_b");

  // Then leaves alphabetically: a_branch, z_branch
  assert.strictEqual(sorted[2].name, "a_branch");
  assert.strictEqual(sorted[3].name, "z_branch");
});

test("sortTreeNodes - only directories", () => {
  const root = buildBranchTree(["folder_c/1", "folder_a/1", "folder_b/1"], (x) => x);
  const sorted = sortTreeNodes(root);

  assert.strictEqual(sorted.length, 3);
  assert.strictEqual(sorted[0].name, "folder_a");
  assert.strictEqual(sorted[1].name, "folder_b");
  assert.strictEqual(sorted[2].name, "folder_c");
});

test("sortTreeNodes - only leaves", () => {
  const root = buildBranchTree(["c", "a", "b"], (x) => x);
  const sorted = sortTreeNodes(root);

  assert.strictEqual(sorted.length, 3);
  assert.strictEqual(sorted[0].name, "a");
  assert.strictEqual(sorted[1].name, "b");
  assert.strictEqual(sorted[2].name, "c");
});

test("sortTreeNodes - empty children", () => {
  const root = buildBranchTree([], (x) => x);
  const sorted = sortTreeNodes(root);

  assert.strictEqual(sorted.length, 0);
  assert.deepStrictEqual(sorted, []);
});
