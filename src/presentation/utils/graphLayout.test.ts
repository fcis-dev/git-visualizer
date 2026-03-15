import test from 'node:test';
import assert from 'node:assert';
import { calculateGraphLayout } from './graphLayout.ts';
import type { Commit } from '../../domain/entities/GitEntities.ts';

test('calculateGraphLayout', async (t) => {
  // Helper to create a basic commit
  const createCommit = (hash: string, parents: string[]): Commit => ({
    hash,
    parents,
    message: `Commit ${hash}`,
    author: 'Author',
    date: 1234567890,
    refs: [],
  });

  await t.test('empty list', () => {
    const { nodes, links } = calculateGraphLayout([]);
    assert.deepStrictEqual(nodes, []);
    assert.deepStrictEqual(links, []);
  });

  await t.test('single commit', () => {
    const commits = [createCommit('A', [])];
    const { nodes, links } = calculateGraphLayout(commits);

    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(links.length, 0);
    assert.strictEqual(nodes[0].hash, 'A');
    assert.strictEqual(nodes[0].lane, 0);
    assert.strictEqual(nodes[0].x, 20); // 0 * 20 + 20
    assert.strictEqual(nodes[0].y, 25); // 0 * 56 + 25
  });

  await t.test('linear history', () => {
    const commits = [
      createCommit('C', ['B']),
      createCommit('B', ['A']),
      createCommit('A', []),
    ];
    const { nodes, links } = calculateGraphLayout(commits);

    assert.strictEqual(nodes.length, 3);
    assert.strictEqual(links.length, 2);

    // All should be in lane 0
    assert.ok(nodes.every(n => n.lane === 0));
    assert.ok(nodes.every(n => n.x === 20));

    // Y coordinates should increase
    assert.strictEqual(nodes[0].y, 25); // row 0
    assert.strictEqual(nodes[1].y, 81); // row 1 (56 + 25)
    assert.strictEqual(nodes[2].y, 137); // row 2 (112 + 25)

    // Links should be straight
    assert.ok(links.every(l => !l.isCurve));
    assert.strictEqual(links[0].source.y, 25);
    assert.strictEqual(links[0].target.y, 81);
    assert.strictEqual(links[1].source.y, 81);
    assert.strictEqual(links[1].target.y, 137);
  });

  await t.test('branching (one parent, multiple children)', () => {
    // A -> B -> C (main)
    //  \-> D (branch)
    const commits = [
      createCommit('C', ['B']),
      createCommit('D', ['A']),
      createCommit('B', ['A']),
      createCommit('A', []),
    ];
    const { nodes, links } = calculateGraphLayout(commits);

    assert.strictEqual(nodes.length, 4);
    assert.strictEqual(links.length, 3);

    // C, B, A should be on lane 0
    // D should be on lane 1
    const nodeC = nodes.find(n => n.hash === 'C')!;
    const nodeD = nodes.find(n => n.hash === 'D')!;
    const nodeB = nodes.find(n => n.hash === 'B')!;
    const nodeA = nodes.find(n => n.hash === 'A')!;

    assert.strictEqual(nodeC.lane, 0);
    assert.strictEqual(nodeD.lane, 1);
    assert.strictEqual(nodeB.lane, 0);
    assert.strictEqual(nodeA.lane, 1); // Inherits lane 1 because it's first discovered as D's parent in this active lane logic

    // Link C -> B (straight)
    const linkCB = links.find(l => l.source.y === nodeC.y && l.target.y === nodeB.y)!;
    assert.strictEqual(linkCB.isCurve, false);

    // Link D -> A (straight because A gets lane 1)
    const linkDA = links.find(l => l.source.y === nodeD.y && l.target.y === nodeA.y)!;
    assert.strictEqual(linkDA.isCurve, false);

    // Link B -> A (curved, B on lane 0, A on lane 1)
    const linkBA = links.find(l => l.source.y === nodeB.y && l.target.y === nodeA.y)!;
    assert.strictEqual(linkBA.isCurve, true);
    assert.strictEqual(linkBA.source.x, nodeB.x);
    assert.strictEqual(linkBA.target.x, nodeA.x);
    assert.ok(linkBA.midPoint);
  });

  await t.test('merging (multiple parents)', () => {
    // A -> B -> D (merge)
    // A -> C -/
    const commits = [
      createCommit('D', ['B', 'C']),
      createCommit('C', ['A']),
      createCommit('B', ['A']),
      createCommit('A', []),
    ];
    const { nodes, links } = calculateGraphLayout(commits);

    assert.strictEqual(nodes.length, 4);
    assert.strictEqual(links.length, 4);

    const nodeD = nodes.find(n => n.hash === 'D')!;
    const nodeC = nodes.find(n => n.hash === 'C')!;
    const nodeB = nodes.find(n => n.hash === 'B')!;
    const nodeA = nodes.find(n => n.hash === 'A')!;

    // D and B are main line (lane 0)
    assert.strictEqual(nodeD.lane, 0);
    assert.strictEqual(nodeB.lane, 0);

    // C is branch (lane 1)
    assert.strictEqual(nodeC.lane, 1);

    // A gets lane 1 because C is processed after B? Actually B is processed, A assigned.
    // The previous run showed D=0, C=1, B=0, A=1.
    assert.strictEqual(nodeA.lane, 1);

    // Links
    // D -> B (straight, main line)
    const linkDB = links.find(l => l.source.y === nodeD.y && l.target.y === nodeB.y)!;
    assert.strictEqual(linkDB.isCurve, false);

    // D -> C (curved, merge parent)
    const linkDC = links.find(l => l.source.y === nodeD.y && l.target.y === nodeC.y)!;
    assert.strictEqual(linkDC.isCurve, true);
    assert.strictEqual(linkDC.source.x, nodeD.x);
    assert.strictEqual(linkDC.target.x, nodeC.x);

    // C -> A (straight, A is lane 1)
    const linkCA = links.find(l => l.source.y === nodeC.y && l.target.y === nodeA.y)!;
    assert.strictEqual(linkCA.isCurve, false);

    // B -> A (curved, B on lane 0, A on lane 1)
    const linkBA = links.find(l => l.source.y === nodeB.y && l.target.y === nodeA.y)!;
    assert.strictEqual(linkBA.isCurve, true);
    assert.strictEqual(linkBA.source.x, nodeB.x);
    assert.strictEqual(linkBA.target.x, nodeA.x);
  });

  await t.test('out-of-order/pagination (parent not in list)', () => {
    // D -> C -> B -> A, but only D and C are loaded
    const commits = [
      createCommit('D', ['C']),
      createCommit('C', ['B']),
    ];
    const { nodes, links } = calculateGraphLayout(commits);

    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(links.length, 2);

    const nodeD = nodes.find(n => n.hash === 'D')!;
    const nodeC = nodes.find(n => n.hash === 'C')!;

    // Both should be in lane 0
    assert.strictEqual(nodeD.lane, 0);
    assert.strictEqual(nodeC.lane, 0);

    // Link D -> C
    const linkDC = links.find(l => l.source.y === nodeD.y && l.target.y === nodeC.y)!;
    assert.strictEqual(linkDC.isCurve, false);

    // Link C -> B (B is not in list)
    const linkCB = links.find(l => l.source.y === nodeC.y)!;
    assert.strictEqual(linkCB.isCurve, false);
    // Should project target to the bottom (row = commits.length = 2)
    assert.strictEqual(linkCB.target.y, 2 * 56 + 25); // 137
  });
});
