import { JSDOM } from 'jsdom';
import * as d3 from 'd3';
import { performance } from 'perf_hooks';

const dom = new JSDOM(`<!DOCTYPE html><html><body><svg id="svg"></svg></body></html>`);
global.document = dom.window.document;
global.window = dom.window;

// Create dummy commits
const commits = Array.from({ length: 5000 }).map((_, i) => ({
  hash: `hash${i}`,
  refs: [`tag: v${i}`, `branch${i}`, `remote/branch${i}`],
  message: `Message ${i}`,
  author: `Author ${i}`,
  date: Date.now() / 1000
}));

const svg = d3.select(document.getElementById('svg'));

// Nodes baseline
const nodes = commits.map(c => ({ ...c, x: 0, y: 0, lane: 0 }));

function runBaseline() {
  svg.selectAll("*").remove();

  const start = performance.now();

  const nodeGroup = svg.append("g").selectAll("g").data(nodes).enter().append("g");

  nodeGroup.each(function(d) {
    const group = d3.select(this);

    group.on("contextmenu", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
    });

    let tagsRowHtml = d.refs.map(ref => `<div data-ref="${ref}"></div>`).join("");

    const fo = group.append("foreignObject");
    const contentDiv = fo.append("xhtml:div");
    contentDiv.html(`<div>${tagsRowHtml}</div>`);

    const foNode = fo.node();
    if (foNode) {
      foNode.querySelectorAll("[data-ref]").forEach((el) => {
        el.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        });
      });
    }
  });

  return performance.now() - start;
}

function runOptimized() {
  svg.selectAll("*").remove();

  const start = performance.now();

  const nodeGroup = svg.append("g").selectAll("g").data(nodes).enter().append("g")
    .on("contextmenu", (evt, d) => {
        evt.preventDefault();
        evt.stopPropagation();
        const target = evt.target;
        const refNode = target.closest && target.closest("[data-ref]");
        if (refNode) {
           // ref clicked
        } else {
           // group clicked
        }
    });

  nodeGroup.each(function(d) {
    const group = d3.select(this);

    let tagsRowHtml = d.refs.map(ref => `<div data-ref="${ref}"></div>`).join("");

    const fo = group.append("foreignObject");
    const contentDiv = fo.append("xhtml:div");
    contentDiv.html(`<div>${tagsRowHtml}</div>`);
  });

  return performance.now() - start;
}

// Warmup
for (let i = 0; i < 5; i++) runBaseline();
for (let i = 0; i < 5; i++) runOptimized();

let baseTotal = 0;
let optTotal = 0;
const ITERS = 50;

for (let i = 0; i < ITERS; i++) {
  baseTotal += runBaseline();
  optTotal += runOptimized();
}

console.log(`Baseline: ${(baseTotal / ITERS).toFixed(2)} ms`);
console.log(`Optimized: ${(optTotal / ITERS).toFixed(2)} ms`);
console.log(`Improvement: ${((baseTotal - optTotal) / baseTotal * 100).toFixed(2)}%`);
