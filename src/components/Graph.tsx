import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { CommitData } from '../types';
import { calculateGraphLayout } from '../utils/graphLayout';

interface GraphProps {
  commits: CommitData[];
  selectedCommit: CommitData | null;
  onSelectCommit: (commit: CommitData) => void;
}

export const Graph: React.FC<GraphProps> = ({ commits, selectedCommit, onSelectCommit }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commits.length || !svgRef.current) return;

    const { nodes, links } = calculateGraphLayout(commits);

    // Increase row height for better spacing
    const rowHeight = 44; 
    // Dynamic width based on container, but ensuring minimum
    const width = Math.max(800, containerRef.current?.clientWidth || 800);
    const height = (nodes.length + 1) * rowHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // Draw links
    svg.append("g")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("d", d => {
        const pathGen = d3.path();
        pathGen.moveTo(d.source.x, d.source.y);

        if (d.source.x === d.target.x) {
          pathGen.lineTo(d.target.x, d.target.y);
        } else {
          // Curve logic: 
          // Start vertical down, then curve to target x, then vertical to target y
          const midY = (d.source.y + d.target.y) / 2;

          pathGen.bezierCurveTo(
            d.source.x, midY,
            d.target.x, midY,
            d.target.x, d.target.y
          );
        }
        return pathGen.toString();
      })
      .attr("stroke", d => d.color)
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("opacity", 0.6);

    // Draw nodes
    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_event, d) => onSelectCommit(d))
      .on("mouseover", function() {
        d3.select(this).select("circle").attr("r", 9).attr("stroke-width", 3);
        d3.select(this).select("text").attr("fill", "#fff");
      })
      .on("mouseout", function() {
        // Reset to normal size if not selected
        const data = d3.select(this).datum() as any;
        const isSelected = selectedCommit?.hash === data.hash;
        if (!isSelected) {
           d3.select(this).select("circle").attr("r", 7).attr("stroke-width", 2);
           d3.select(this).select("text").attr("fill", "#cbd5e1");
        }
      });

    const LANE_COLORS = [
      "#6366f1", // Indigo
      "#ec4899", // Pink
      "#10b981", // Emerald
      "#f59e0b", // Amber
      "#3b82f6", // Blue
      "#8b5cf6", // Violet
      "#ef4444", // Red
      "#14b8a6", // Teal
    ];

    // Node Circle
    nodeGroup.append("circle")
      .attr("r", d => (selectedCommit?.hash === d.hash ? 9 : 7))
      .attr("fill", d => LANE_COLORS[d.lane % LANE_COLORS.length])
      .attr("stroke", d => (selectedCommit?.hash === d.hash ? "#fff" : "#0f172a"))
      .attr("stroke-width", d => (selectedCommit?.hash === d.hash ? 3 : 2));

    // Commit Message Text
    nodeGroup.append("text")
      .attr("x", 18)
      .attr("y", 5)
      .text(d => d.message)
      .attr("fill", d => (selectedCommit?.hash === d.hash ? "#fff" : "#cbd5e1"))
      .attr("font-size", "13px")
      .attr("font-weight", d => (selectedCommit?.hash === d.hash ? "bold" : "normal"))
      .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace")
      .style("pointer-events", "all");

  }, [commits, onSelectCommit, selectedCommit]);

  return (
    <div ref={containerRef} className="overflow-auto flex-1 custom-scrollbar">
      <svg ref={svgRef} className="w-full block" />
    </div>
  );
};
