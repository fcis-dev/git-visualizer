import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Commit } from '../../domain/entities/GitEntities';
import { calculateGraphLayout } from '../utils/graphLayout';
import { useTheme } from '../context/ThemeContext';

interface GraphProps {
  commits: Commit[];
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit) => void;
}

export const Graph: React.FC<GraphProps> = ({ commits, selectedCommit, onSelectCommit }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

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

    // Dynamic colors based on theme
    const isDark = theme === 'dark';
    // const textColor = isDark ? "#e2e8f0" : "#1e293b"; // slate-200 / slate-800
    const mutedColor = isDark ? "#64748b" : "#94a3b8"; // slate-500 / slate-400
    const strokeColor = isDark ? "#0f172a" : "#ffffff"; // slate-950 / white

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
        d3.select(this).select("text").attr("fill", isDark ? "#fff" : "#000"); // Highlight text
      })
      .on("mouseout", function() {
        // Reset to normal size if not selected
        const data = d3.select(this).datum() as any;
        const isSelected = selectedCommit?.hash === data.hash;
        if (!isSelected) {
           d3.select(this).select("circle").attr("r", 7).attr("stroke-width", 2);
           d3.select(this).select("text").attr("fill", mutedColor);
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
      .attr("stroke", d => (selectedCommit?.hash === d.hash ? (isDark ? "#fff" : "#000") : strokeColor))
      .attr("stroke-width", d => (selectedCommit?.hash === d.hash ? 3 : 2));

    // Commit Message and Refs
    nodeGroup.each(function(d) {
        const group = d3.select(this);
        let currentX = 18;

        if (d.refs && d.refs.length > 0) {
             d.refs.forEach(ref => {
                 const g = group.append("g");
                 
                 // Determine color based on ref type (simple heuristic)
                 // HEAD: Green/Bold
                 // Remote: Blue/Purple
                 // Tag: Yellow/Orange
                 // Local: Default
                 
                 let bgFill = isDark ? "#334155" : "#e2e8f0";
                 let textFill = isDark ? "#fff" : "#0f172a";
                 let border = isDark ? "#475569" : "#cbd5e1";

                 if (ref.includes("HEAD")) {
                     bgFill = isDark ? "#065f46" : "#d1fae5"; // emerald-800 / emerald-100
                     textFill = isDark ? "#d1fae5" : "#065f46";
                     border = isDark ? "#047857" : "#6ee7b7";
                 } else if (ref.includes("origin")) {
                     bgFill = isDark ? "#1e3a8a" : "#dbeafe"; // blue-900 / blue-100
                     textFill = isDark ? "#dbeafe" : "#1e40af";
                     border = isDark ? "#1d4ed8" : "#93c5fd";
                 }

                 const text = g.append("text")
                    .text(ref)
                    .attr("font-size", "10px")
                    .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace")
                    .attr("fill", textFill)
                    .attr("y", 3);
                 
                 const bbox = text.node()?.getBBox();
                 const paddingX = 8;
                 const width = (bbox?.width || 0) + paddingX;
                 
                 g.insert("rect", "text")
                    .attr("x", 0)
                    .attr("y", -8)
                    .attr("width", width)
                    .attr("height", 15)
                    .attr("rx", 3)
                    .attr("fill", bgFill)
                    .attr("stroke", border)
                    .attr("stroke-width", 1);
                 
                 text.attr("x", paddingX / 2);
                 
                 g.attr("transform", `translate(${currentX}, 0)`);
                 
                 currentX += width + 6;
            });
        }

        group.append("text")
          .attr("x", currentX)
          .attr("y", 5)
          .text(d.message)
          .attr("fill", (selectedCommit?.hash === d.hash ? (isDark ? "#fff" : "#000") : mutedColor))
          .attr("font-size", "13px")
          .attr("font-weight", (selectedCommit?.hash === d.hash ? "bold" : "normal"))
          .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace")
          .style("pointer-events", "all");
    });

  }, [commits, onSelectCommit, selectedCommit, theme]);

  return (
    <div ref={containerRef} className="overflow-auto flex-1 custom-scrollbar">
      <svg ref={svgRef} className="w-full block" />
    </div>
  );
};
