import React, { useRef, useEffect, useImperativeHandle } from "react";
import * as d3 from "d3";
import { Commit } from "../../domain/entities/GitEntities";
import { calculateGraphLayout, LANE_COLORS } from "../utils/graphLayout";
import { useTheme } from "../context/ThemeContext";

export interface GraphHandle {
  scrollToTop: () => void;
  scrollToHash: (hash: string) => boolean; // returns false if hash not in current commits
}

interface GraphProps {
  commits: Commit[];
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  isSearchResult?: boolean;
  onBranchContextMenu?: (refName: string, x: number, y: number) => void;
}

export const Graph = React.forwardRef<GraphHandle, GraphProps>(function Graph({
  commits,
  selectedCommit,
  onSelectCommit,
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
  isSearchResult = false,
  onBranchContextMenu,
}, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Row layout constants must match graphLayout.ts
  const ROW_HEIGHT = 56;
  const PADDING_Y = 25;

  useImperativeHandle(ref, () => ({
    scrollToTop: () => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
    scrollToHash: (hash: string) => {
      const idx = commits.findIndex((c) => c.hash === hash);
      if (idx === -1) return false;
      const y = idx * ROW_HEIGHT + PADDING_Y;
      const container = containerRef.current;
      if (!container) return false;
      const center = y - container.clientHeight / 2 + ROW_HEIGHT / 2;
      container.scrollTo({ top: Math.max(0, center), behavior: "smooth" });
      return true;
    },
  }));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const [containerWidth, setContainerWidth] = React.useState(800);

  useEffect(() => {
    if (!containerRef.current) return;

    let timeoutId: number;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          setContainerWidth(Math.max(800, entry.contentRect.width));
        }, 150);
      }
    });

    observer.observe(containerRef.current);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  // IntersectionObserver: fires onLoadMore when the sentinel at the bottom enters the viewport
  useEffect(() => {
    if (!sentinelRef.current || !onLoadMore) return;
    const sentinel = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { root: containerRef.current, threshold: 0.1 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [onLoadMore]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Always clear existing graph first
    svg.selectAll("*").remove();

    if (!commits.length) {
      return;
    }

    // When showing search results, strip parent relationships so the layout
    // renders a flat list instead of trying to draw edges to missing commits.
    const commitsForLayout = isSearchResult
      ? commits.map((c) => ({ ...c, parents: [] }))
      : commits;
    const { nodes, links } = calculateGraphLayout(commitsForLayout);

    // Ensure row height matches `ROW_HEIGHT` in `graphLayout.ts` (56px)
    const rowHeight = 56;
    // Dynamic width based on state from ResizeObserver
    const width = containerWidth;
    // Calculate total height needed. nodes.length gives total rows.
    const height = nodes.length * rowHeight + rowHeight + 20; // Extra padding at bottom

    svg.attr("width", width).attr("height", height);

    // Dynamic colors based on theme
    const isDark = theme === "dark";
    // const textColor = isDark ? "#e2e8f0" : "#1e293b"; // slate-200 / slate-800
    const mutedColor = isDark ? "#64748b" : "#94a3b8"; // slate-500 / slate-400
    const authorColor = isDark ? "#94a3b8" : "#64748b"; // slate-400 / slate-500
    const dateColor = isDark ? "#475569" : "#cbd5e1"; // slate-600 / slate-300

    // Group links by color to drastically reduce DOM elements
    const groupedLinks = new Map<string, typeof links>();
    links.forEach((link) => {
      if (!groupedLinks.has(link.color)) {
        groupedLinks.set(link.color, []);
      }
      groupedLinks.get(link.color)!.push(link);
    });
    const groupedLinksArray = Array.from(groupedLinks.entries());

    // Helper to generate path string for a group of segments
    const generatePathData = (segments: typeof links) => {
      const pathGen = d3.path();
      segments.forEach((d) => {
        pathGen.moveTo(d.source.x, d.source.y);
        if (!d.isCurve || !d.midPoint) {
          pathGen.lineTo(d.target.x, d.target.y);
        } else {
          // The distance to shift lanes diagonally
          const dy = d.midPoint.y - d.source.y;
          pathGen.bezierCurveTo(
            d.source.x,
            d.source.y + dy / 2,
            d.midPoint.x,
            d.midPoint.y - dy / 2,
            d.midPoint.x,
            d.midPoint.y,
          );
          // If there is still vertical distance to cover after the shift (e.g. projecting downwards past intermediate commits)
          if (d.midPoint.y < d.target.y) {
            pathGen.lineTo(d.target.x, d.target.y);
          }
        }
      });
      return pathGen.toString();
    };

    // Draw link backgrounds (thicker stroke to create gap effect)
    svg
      .append("g")
      .selectAll("path.bg")
      .data(groupedLinksArray)
      .enter()
      .append("path")
      .attr("class", "bg")
      .attr("d", (d) => generatePathData(d[1]))
      .attr("stroke", isDark ? "#0f172a" : "#ffffff") // Matches background to create gap
      .attr("stroke-width", 6)
      .attr("fill", "none")
      .attr("opacity", 1);

    // Draw links
    svg
      .append("g")
      .selectAll("path.fg")
      .data(groupedLinksArray)
      .enter()
      .append("path")
      .attr("class", "fg")
      .attr("d", (d) => generatePathData(d[1]))
      .attr("stroke", (d) => d[0])
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("opacity", 0.9)
      .style("transition", "stroke-width 0.2s ease")
      .on("mouseover", function () {
        d3.select(this).attr("stroke-width", 3).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 2).attr("opacity", 0.9);
      });

    // Draw nodes
    const nodeGroup = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_event, d) => onSelectCommit(d))
      .on("mouseover", function () {
        d3.select(this).select("circle").attr("r", 8).attr("stroke-width", 4);
        d3.select(this)
          .select(".commit-message")
          .style("color", isDark ? "#fff" : "#000"); // Highlight text
      })
      .on("mouseout", function () {
        // Reset to normal size if not selected
        const data = d3.select(this).datum() as any;
        const isSelected = selectedCommit?.hash === data.hash;
        if (!isSelected) {
          d3.select(this).select("circle").attr("r", 6).attr("stroke-width", 3);
          d3.select(this).select(".commit-message").style("color", mutedColor);
        }
      });

    const bgFill = isDark ? "#0f172a" : "#ffffff";

    // Node Circle
    nodeGroup
      .append("circle")
      .attr("r", (d) => (selectedCommit?.hash === d.hash ? 8 : 6))
      .attr("fill", bgFill)
      .attr("stroke", (d) => LANE_COLORS[d.lane % LANE_COLORS.length])
      .attr("stroke-width", (d) => (selectedCommit?.hash === d.hash ? 4 : 3))
      .style("transition", "all 0.2s ease");

    let maxContentWidth = containerWidth;

    // Commit Message and Refs
    nodeGroup.each(function (d) {
      const group = d3.select(this);
      // Find max lane among all nodes to determine common starting X
      const maxLane =
        nodes.length > 0 ? Math.max(...nodes.map((n) => n.lane || 0)) : 0;
      const maxLaneX = maxLane * 20 + 20;

      // We start drawing text/refs to the right of the furthest possible lane.
      // d.x gives the current node's x coordinate in the group's transform
      // So we need to offset it to reach maxLaneX + some padding.
      // Wait, the group is translated to d.x. So an offset of (maxLaneX - d.x + padding) is needed.
      const currentX = maxLaneX - d.x + 18;

      let tagsHtml = "";
      if (d.refs && d.refs.length > 0) {
        const tags = d.refs
          .map((ref) => {
            let bgFill = isDark ? "#312e81" : "#e0e7ff";
            let textFill = isDark ? "#e0e7ff" : "#4338ca";
            let border = isDark ? "#3730a3" : "#c7d2fe";

            const isTag = ref.startsWith("tag: ");
            const displayName = isTag ? ref.substring(5) : ref;

            if (ref.includes("HEAD") || isTag) {
              bgFill = isDark ? "#064e3b" : "#d1fae5";
              textFill = isDark ? "#d1fae5" : "#059669";
              border = isDark ? "#065f46" : "#6ee7b7";
            } else if (ref.includes("origin")) {
              bgFill = isDark ? "#3730a3" : "#c7d2fe";
              textFill = isDark ? "#e0e7ff" : "#3730a3";
              border = isDark ? "#4338ca" : "#a5b4fc";
            }

            const safeDisplayName = displayName
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            // data-ref stores the raw ref string so we can read it from the DOM event
            return `<div data-ref="${safeDisplayName}" style="background-color: ${bgFill}; color: ${textFill}; border: 1px solid ${border}; border-radius: 4px; padding: 1px 6px; font-size: 10px; line-height: 14px; white-space: nowrap; pointer-events: auto; max-width: 150px; overflow: hidden; text-overflow: ellipsis; display: inline-block; cursor: context-menu;">${safeDisplayName}</div>`;
          })
          .join("");

        tagsHtml = `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">${tags}</div>`;
      }

      const absoluteX = (d as any).x + currentX;
      const minTextWidth = 450;
      const foWidth = Math.max(minTextWidth, width - absoluteX - 16);
      const foHeight = 88; // Increased heavily to allow wrapping of tags without clipping

      if (absoluteX + foWidth + 16 > maxContentWidth) {
        maxContentWidth = absoluteX + foWidth + 16;
      }

      const commitDate = new Date(d.date * 1000);

      const datePart = commitDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const timePart = commitDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

      const msgColor =
        selectedCommit?.hash === d.hash
          ? isDark
            ? "#fff"
            : "#000"
          : mutedColor;
      const msgWeight = selectedCommit?.hash === d.hash ? "bold" : "normal";

      const fo = group
        .append("foreignObject")
        .attr("x", currentX)
        .attr("y", -16) // Shifted up slightly
        .attr("width", foWidth)
        .attr("height", foHeight)
        .style("pointer-events", "none")
        .style("overflow", "visible"); // Allow overflow just in case

      // Use standard double quotes for the template string and escape quotes in data
      const safeMsg = d.message
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const safeAuthor = d.author
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      fo
        .append("xhtml:div")
        .style("display", "flex")
        .style("align-items", "flex-start")
        .style("gap", "16px")
        .style("width", "100%")
        .style(
          "font-family",
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        )
        .style("font-size", "12px").html(`
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
                <div class="commit-message" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; color: ${msgColor}; font-weight: ${msgWeight}; pointer-events: auto; transition: color 0.1s;" title="${safeMsg}">
                  ${safeMsg}
                </div>
                ${tagsHtml}
            </div>
            <div style="width: 130px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${authorColor}; text-align: left; pointer-events: auto;" title="${safeAuthor}">
              ${safeAuthor}
            </div>
            <div style="width: 100px; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; color: ${dateColor}; pointer-events: auto; white-space: nowrap;" title="${datePart} ${timePart}">
              <span>${datePart}</span>
              <span style="font-size: 10px; opacity: 0.7;">${timePart}</span>
            </div>
          `);

      // Attach contextmenu listeners to ref badge divs after HTML is injected
      if (onBranchContextMenu) {
        const foNode = fo.node() as Element | null;
        if (foNode) {
          foNode.querySelectorAll<HTMLElement>("[data-ref]").forEach((el) => {
            el.addEventListener("contextmenu", (evt) => {
              evt.preventDefault();
              evt.stopPropagation();
              const refName = el.getAttribute("data-ref") || "";
              onBranchContextMenu(refName, (evt as MouseEvent).clientX, (evt as MouseEvent).clientY);
            });
          });
        }
      }
    });

    // Expand the SVG canvas width if the content overflowed the container
    svg.attr("width", maxContentWidth);
  }, [commits, onSelectCommit, selectedCommit, theme, containerWidth, onBranchContextMenu]);

  return (
    <div ref={containerRef} className="overflow-auto flex-1 custom-scrollbar">
      <svg ref={svgRef} className="min-w-full block" />
      {/* Sentinel for IntersectionObserver – always rendered at the bottom */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4 text-slate-500 text-sm gap-2">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              strokeWidth="3"
              strokeDasharray="31.4 31.4"
            />
          </svg>
          Loading more commits…
        </div>
      )}
      {!hasMore && commits.length > 0 && (
        <div className="flex items-center justify-center py-3 text-slate-600 text-xs">
          · End of history ·
        </div>
      )}
    </div>
  );
});
