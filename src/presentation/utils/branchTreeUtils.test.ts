import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { sortTreeNodes } from './branchTreeUtils.ts';

describe('sortTreeNodes', () => {
  it('should sort directories before leaves', () => {
    const node: any = {
      name: 'root',
      path: '',
      isLeaf: false,
      children: {
        'file.txt': { name: 'file.txt', path: 'file.txt', isLeaf: true, children: {} },
        'folder': { name: 'folder', path: 'folder', isLeaf: false, children: { 'a': {} as any } }
      }
    };

    const result = sortTreeNodes(node);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'folder');
    assert.strictEqual(result[1].name, 'file.txt');
  });

  it('should sort directories alphabetically', () => {
    const node: any = {
      name: 'root',
      path: '',
      isLeaf: false,
      children: {
        'folderZ': { name: 'folderZ', path: 'folderZ', isLeaf: false, children: { 'a': {} as any } },
        'folderA': { name: 'folderA', path: 'folderA', isLeaf: false, children: { 'a': {} as any } },
        'folderM': { name: 'folderM', path: 'folderM', isLeaf: false, children: { 'a': {} as any } }
      }
    };

    const result = sortTreeNodes(node);
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].name, 'folderA');
    assert.strictEqual(result[1].name, 'folderM');
    assert.strictEqual(result[2].name, 'folderZ');
  });

  it('should sort leaves alphabetically', () => {
    const node: any = {
      name: 'root',
      path: '',
      isLeaf: false,
      children: {
        'fileZ.txt': { name: 'fileZ.txt', path: 'fileZ.txt', isLeaf: true, children: {} },
        'fileA.txt': { name: 'fileA.txt', path: 'fileA.txt', isLeaf: true, children: {} },
        'fileM.txt': { name: 'fileM.txt', path: 'fileM.txt', isLeaf: true, children: {} }
      }
    };

    const result = sortTreeNodes(node);
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].name, 'fileA.txt');
    assert.strictEqual(result[1].name, 'fileM.txt');
    assert.strictEqual(result[2].name, 'fileZ.txt');
  });

  it('should sort directories alphabetically and leaves alphabetically', () => {
    const node: any = {
      name: 'root',
      path: '',
      isLeaf: false,
      children: {
        'fileZ.txt': { name: 'fileZ.txt', path: 'fileZ.txt', isLeaf: true, children: {} },
        'folderZ': { name: 'folderZ', path: 'folderZ', isLeaf: false, children: { 'a': {} as any } },
        'fileA.txt': { name: 'fileA.txt', path: 'fileA.txt', isLeaf: true, children: {} },
        'folderA': { name: 'folderA', path: 'folderA', isLeaf: false, children: { 'a': {} as any } },
        'folderM': { name: 'folderM', path: 'folderM', isLeaf: false, children: { 'a': {} as any } },
        'fileM.txt': { name: 'fileM.txt', path: 'fileM.txt', isLeaf: true, children: {} }
      }
    };

    const result = sortTreeNodes(node);
    assert.strictEqual(result.length, 6);
    assert.strictEqual(result[0].name, 'folderA');
    assert.strictEqual(result[1].name, 'folderM');
    assert.strictEqual(result[2].name, 'folderZ');
    assert.strictEqual(result[3].name, 'fileA.txt');
    assert.strictEqual(result[4].name, 'fileM.txt');
    assert.strictEqual(result[5].name, 'fileZ.txt');
  });

  it('should handle an empty children object', () => {
    const node: any = {
      name: 'root',
      path: '',
      isLeaf: false,
      children: {}
    };

    const result = sortTreeNodes(node);
    assert.strictEqual(result.length, 0);
  });
});
