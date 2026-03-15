import React, { useRef, useEffect, useImperativeHandle } from "react";
import * as d3 from "d3";
import { Commit } from "../../domain/entities/GitEntities";
import { calculateGraphLayout, LANE_COLORS } from "../utils/graphLayout";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";

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

export const Graph = React.forwardRef<GraphHandle, GraphProps>(function Graph(
  {
    commits,
    selectedCommit,
    onSelectCommit,
    onLoadMore,
    isLoadingMore = false,
    hasMore = false,
    isSearchResult = false,
    onBranchContextMenu,
  },
  ref,
) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Row layout constants must match graphLayout.ts
  const ROW_HEIGHT = 56;
  const PADDING_Y = 25;

  useImperativeHandle(ref, () => ({
    scrollToTop: () =>
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
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
    const mutedColor = isDark ? "#94a3b8" : "#64748b"; // slate-400 / slate-500
    const authorColor = isDark ? "#cbd5e1" : "#475569"; // slate-300 / slate-600
    const dateColor = isDark ? "#64748b" : "#94a3b8"; // slate-500 / slate-400

    const getAvatarColor = (name: string) => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const h = Math.abs(hash) % 360;
      const s = isDark ? 65 : 75;
      const l = isDark ? 45 : 55;
      return `hsl(${h}, ${s}%, ${l}%)`;
    };

    // Add filter definitions for glow effect
    const defs = svg.append("defs");
    const filter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "2.5")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

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
        d3.select(this).select("circle").attr("r", 7).attr("stroke-width", 4);
        d3.select(this)
          .select(".commit-message")
          .style("color", isDark ? "#ffffff" : "#0f172a"); // Highlight text
      })
      .on("mouseout", function () {
        // Reset to normal size if not selected
        const data = d3.select(this).datum() as any;
        const isSelected = selectedCommit?.hash === data.hash;
        if (!isSelected) {
          d3.select(this).select("circle").attr("r", 5).attr("stroke-width", 3);
          d3.select(this)
            .select(".commit-message")
            .style("color", authorColor);
        }
      });

    const bgFill = isDark ? "#0f172a" : "#ffffff";

    // Node Circle
    nodeGroup
      .append("circle")
      .attr("r", (d) => (selectedCommit?.hash === d.hash ? 7 : 5))
      .attr("fill", bgFill)
      .attr("stroke", (d) => LANE_COLORS[d.lane % LANE_COLORS.length])
      .attr("stroke-width", (d) => (selectedCommit?.hash === d.hash ? 5 : 3))
      .style("filter", (d) =>
        selectedCommit?.hash === d.hash ? "url(#glow)" : "none",
      )
      .style("transition", "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)");

    let maxContentWidth = containerWidth;

    // Commit Message and Refs
    nodeGroup.each(function (d) {
      const group = d3.select(this);
      
      // Add right-click listener to the whole row
      group.on("contextmenu", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (onBranchContextMenu) {
            // Pass the commit hash as the context reference. 
            // We use a prefix 'commit:' so the handler knows it's a commit and not a branch name
            onBranchContextMenu(`commit:${d.hash}`, evt.clientX, evt.clientY);
        }
      });
      // Find max lane among all nodes to determine common starting X
      const maxLane =
        nodes.length > 0 ? Math.max(...nodes.map((n) => n.lane || 0)) : 0;
      const maxLaneX = maxLane * 20 + 20;

      // Calculate offset to position text and refs to the right of the maximum lane.
      const currentX = maxLaneX - d.x + 18;

      let tagsRowHtml = "";
      if (d.refs && d.refs.length > 0) {
        tagsRowHtml = d.refs
          .map((ref) => {
            let chipBg = isDark
              ? "rgba(79, 70, 229, 0.15)"
              : "rgba(99, 102, 241, 0.1)";
            let chipText = isDark ? "#818cf8" : "#4338ca";
            let chipBorder = isDark
              ? "rgba(99, 102, 241, 0.3)"
              : "rgba(99, 102, 241, 0.2)";

            const isTag = ref.startsWith("tag: ");
            const displayName = isTag ? ref.substring(5) : ref;

            if (ref.includes("HEAD") || isTag) {
              chipBg = isDark
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(16, 185, 129, 0.1)";
              chipText = isDark ? "#34d399" : "#059669";
              chipBorder = isDark
                ? "rgba(52, 211, 153, 0.3)"
                : "rgba(16, 185, 129, 0.2)";
            } else if (ref.includes("origin")) {
              chipBg = isDark
                ? "rgba(236, 72, 153, 0.15)"
                : "rgba(236, 72, 153, 0.1)";
              chipText = isDark ? "#f472b6" : "#db2777";
              chipBorder = isDark
                ? "rgba(244, 114, 182, 0.3)"
                : "rgba(236, 72, 153, 0.2)";
            }

            const safeRef = ref
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            const safeDisplayName = displayName
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return `<div data-ref="${safeRef}" style="background-color: ${chipBg}; color: ${chipText}; border: 1px solid ${chipBorder}; border-radius: 9999px; padding: 1px 8px; font-size: 10px; font-weight: 500; line-height: 14px; white-space: nowrap; pointer-events: auto; max-width: 130px; overflow: hidden; text-overflow: ellipsis; display: inline-block; cursor: context-menu; backdrop-filter: blur(4px); box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: transform 0.15s ease, filter 0.15s ease;" onmouseover="this.style.transform='scale(1.05)'; this.style.filter='brightness(1.1)'" onmouseout="this.style.transform='scale(1)'; this.style.filter='brightness(1)'">${safeDisplayName}</div>`;
          })
          .join("");
      }

      const absoluteX = (d as any).x + currentX;
      const minTextWidth = 450;
      const foWidth = Math.max(minTextWidth, width - absoluteX - 16);
      const foHeight = 56; // Constrain to exactly the row height to prevent overlapping adjacent rows

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
            ? "#ffffff"
            : "#0f172a"
          : authorColor;
      const msgWeight = selectedCommit?.hash === d.hash ? "600" : "500";
      const hoverBg = isDark
        ? "rgba(30, 41, 59, 0.5)"
        : "rgba(241, 245, 249, 0.7)";

      const fo = group
        .append("foreignObject")
        .attr("x", currentX)
        .attr("y", -24)
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

      const authorInitial = safeAuthor.charAt(0).toUpperCase();
      const avatarColor = getAvatarColor(safeAuthor);

      // Use display:block + explicit row heights to avoid WebKit foreignObject column-flex bug
      const contentDiv = fo
        .append("xhtml:div")
        .style("display", "block")
        .style("width", "100%")
        .style("height", "56px")
        .style("-webkit-box-sizing", "border-box")
        .style("box-sizing", "border-box")
        .style("padding", "2px 12px 2px 8px")
        .style("border-radius", "8px")
        .style("font-family", "'Inter', 'Roboto', 'Segoe UI', sans-serif")
        .style("font-size", "13px")
        .style("pointer-events", "auto")
        .style(
          "transition",
          "background-color 0.15s ease",
        )
        .on("mouseover", function () {
          d3.select(this).style("background-color", hoverBg);
        })
        .on("mouseout", function () {
          d3.select(this).style("background-color", "transparent");
        })
        .on("click", (_event) => onSelectCommit(d));

      // Row 1 (top): branch chips + time
      // Row 2 (bottom): commit message + author avatar + author name + date (no time)
      // Note: All flex containers use full webkit prefixes to fix Safari/WKWebView foreignObject rendering
      contentDiv.html(`
        <div style="height: 24px; overflow: hidden; display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-orient: horizontal; -webkit-flex-direction: row; flex-direction: row; -webkit-box-align: center; -webkit-align-items: center; align-items: center; gap: 6px;">
          <div style="-webkit-box-flex: 1; -webkit-flex: 1; flex: 1; min-width: 0; overflow: hidden; display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-orient: horizontal; -webkit-flex-direction: row; flex-direction: row; -webkit-box-align: center; -webkit-align-items: center; align-items: center; gap: 5px;">
            ${tagsRowHtml}
          </div>
          <div style="-webkit-flex-shrink: 0; flex-shrink: 0; font-size: 11px; color: ${dateColor}; white-space: nowrap; opacity: 0.8; pointer-events: none;">${timePart}</div>
        </div>
        <div style="height: 28px; overflow: hidden; display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-orient: horizontal; -webkit-flex-direction: row; flex-direction: row; -webkit-box-align: center; -webkit-align-items: center; align-items: center; gap: 8px;">
          <div class="commit-message" style="-webkit-box-flex: 1; -webkit-flex: 1; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${msgColor}; font-weight: ${msgWeight}; font-size: 13px; line-height: 1.4; pointer-events: none; transition: color 0.15s;">${safeMsg}</div>
          <div style="width: 150px; -webkit-flex-shrink: 0; flex-shrink: 0; overflow: hidden; display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-orient: horizontal; -webkit-flex-direction: row; flex-direction: row; -webkit-box-align: center; -webkit-align-items: center; align-items: center; gap: 6px; color: ${authorColor}; pointer-events: none;" title="${safeAuthor}">
            <div style="width: 20px; height: 20px; -webkit-flex-shrink: 0; flex-shrink: 0; border-radius: 50%; background-color: ${avatarColor}; color: white; display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: center; -webkit-align-items: center; align-items: center; -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center; font-size: 10px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.15);">${authorInitial}</div>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; font-size: 12px;">${safeAuthor}</span>
          </div>
          <div style="width: 78px; -webkit-flex-shrink: 0; flex-shrink: 0; text-align: right; color: ${dateColor}; white-space: nowrap; font-size: 11px; font-weight: 500; pointer-events: none;" title="${datePart} ${timePart}">${datePart}</div>
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
              onBranchContextMenu(
                refName,
                (evt as MouseEvent).clientX,
                (evt as MouseEvent).clientY,
              );
            });
          });
        }
      }
    });

    // Expand the SVG canvas width if the content overflowed the container
    svg.attr("width", maxContentWidth);
  }, [
    commits,
    onSelectCommit,
    selectedCommit,
    theme,
    containerWidth,
    onBranchContextMenu,
  ]);

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
          {t("graph.loadingMore")}
        </div>
      )}
      {!hasMore && commits.length > 0 && (
        <div className="flex items-center justify-center py-3 text-slate-600 text-xs">
          {t("graph.endOfHistory")}
        </div>
      )}
    </div>
  );
});
