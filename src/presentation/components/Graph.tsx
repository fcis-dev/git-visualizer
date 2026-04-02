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
    const authorNameColor = isDark ? "rgba(203,213,225,0.9)" : "rgba(71,85,105,0.9)";
    const dateColor = isDark ? "#64748b" : "#94a3b8"; // slate-500 / slate-400
    const timeColor = isDark ? "rgba(100,116,139,0.8)" : "rgba(148,163,184,0.8)";

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
    nodeGroup.each(function (d, i) {
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

      // We start drawing text/refs to the right of the furthest possible lane.
      // d.x gives the current node's x coordinate in the group's transform
      // So we need to offset it to reach maxLaneX + some padding.
      const currentX = maxLaneX - d.x + 18;

      let tagsRowHtml = "";
      if (d.refs && d.refs.length > 0) {
        const sortedRefs = [...d.refs].sort((a, b) => {
          const getWeight = (r: string) => {
            if (r.includes("HEAD")) return 0;
            const isTag = r.startsWith("tag: ");
            if (isTag) return 4;
            if (r.includes("/")) {
                return r.startsWith("origin/") ? 3 : 2;
            }
            return 1;
          };
          const weightA = getWeight(a);
          const weightB = getWeight(b);
          if (weightA !== weightB) return weightA - weightB;
          return a.localeCompare(b);
        });

        tagsRowHtml = sortedRefs
          .map((ref) => {
            let chipBg = isDark
              ? "rgba(99, 102, 241, 0.12)"
              : "rgba(99, 102, 241, 0.08)";
            let chipText = isDark ? "#a5b4fc" : "#4f46e5";
            let chipBorder = isDark
              ? "rgba(99, 102, 241, 0.25)"
              : "rgba(99, 102, 241, 0.15)";
            
            let icon = `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" style="flex-shrink:0;"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1a2.5 2.5 0 0 1 2.5 2.5v9.146a.25.25 0 0 1-.427.177L10.677 11.93a.25.25 0 0 1-.035-.118l-.142-.812a.25.25 0 0 1 .487-.085l.13.743 1.883 1.883V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 4a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 9.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"></path></svg>`;

            const isTag = ref.startsWith("tag: ");
            const displayName = isTag ? ref.substring(5) : ref;

            if (ref.includes("HEAD") || isTag) {
              chipBg = isDark
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(16, 185, 129, 0.08)";
              chipText = isDark ? "#6ee7b7" : "#059669";
              chipBorder = isDark
                ? "rgba(52, 211, 153, 0.25)"
                : "rgba(16, 185, 129, 0.15)";
              
              if (isTag) {
                icon = `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" style="flex-shrink:0;"><path d="M1 7.775V2a1 1 0 0 1 1-1h5.775a1 1 0 0 1 .707.293l6.225 6.225a1 1 0 0 1 0 1.414l-5.775 5.775a1 1 0 0 1-1.414 0L1.293 8.482A1 1 0 0 1 1 7.775Zm1.5-4.525v4.525l5.535 5.536L12.57 8.775l-5.535-5.535H2.5Zm3.5 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"></path></svg>`;
              } else {
                icon = `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" style="flex-shrink:0;"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>`;
              }
            } else if (ref.includes("origin")) {
              chipBg = isDark
                ? "rgba(236, 72, 153, 0.12)"
                : "rgba(236, 72, 153, 0.08)";
              chipText = isDark ? "#f472b6" : "#db2777";
              chipBorder = isDark
                ? "rgba(244, 114, 182, 0.25)"
                : "rgba(236, 72, 153, 0.15)";
              icon = `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" style="flex-shrink:0;"><path d="M14.28 9.31a.25.25 0 0 1-.28.24h-1c-.11 0-.21-.07-.24-.18l-.5-1.5a.25.25 0 0 0-.48 0l-.5 1.5c-.03.11-.13.18-.24.18H10a.25.25 0 0 1-.22-.38l1-1.5a.25.25 0 0 1 .42 0l1 1.5a.25.25 0 0 1 .08.14ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z"></path></svg>`;
            }

            const safeRef = ref
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            const safeDisplayName = displayName
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            
            return `
              <div title="${safeDisplayName}" data-ref="${safeRef}" class="git-chip" style="
                background-color: ${chipBg}; 
                color: ${chipText}; 
                border: 1px solid ${chipBorder}; 
                border-radius: 6px; 
                padding: 1px 6px; 
                font-size: 10.5px; 
                font-weight: 600; 
                line-height: 14px; 
                white-space: nowrap; 
                pointer-events: auto; 
                max-width: 150px; 
                overflow: hidden; 
                text-overflow: ellipsis; 
                display: inline-flex; 
                align-items: center; 
                gap: 4px;
                cursor: context-menu;
                transition: all 0.15s ease;
              ">
                ${icon}
                <span style="overflow: hidden; text-overflow: ellipsis;">${safeDisplayName}</span>
              </div>`;
          })
          .join("");
      }

      const absoluteX = (d as any).x + currentX;
      const minTextWidth = 450;
      const foWidth = Math.max(minTextWidth, width - absoluteX - 16);
      const foHeight = 56; 

      if (absoluteX + foWidth + 16 > maxContentWidth) {
        maxContentWidth = absoluteX + foWidth + 16;
      }

      const commitDate = new Date(d.date * 1000);
      const datePart = commitDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const timePart = commitDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

      const msgColor =
        selectedCommit?.hash === d.hash
          ? isDark ? "#ffffff" : "#0f172a"
          : isDark ? "#cbd5e1" : "#334155";
      const msgWeight = selectedCommit?.hash === d.hash ? "600" : "500";
      const hoverBg = isDark
        ? "rgba(30, 41, 59, 0.5)"
        : "rgba(241, 245, 249, 0.7)";
      const baseBg = i % 2 === 0
        ? "transparent"
        : isDark
          ? "rgba(30, 41, 59, 0.25)"
          : "rgba(241, 245, 249, 0.5)";

      const fo = group
        .append("foreignObject")
        .attr("x", currentX)
        .attr("y", -28)
        .attr("width", foWidth)
        .attr("height", foHeight)
        .style("pointer-events", "none")
        .style("overflow", "visible");

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

      const contentDiv = fo
        .append("xhtml:div")
        .attr("xmlns", "http://www.w3.org/1999/xhtml")
        .style("display", "flex")
        .style("align-items", "center")
        .style("width", "100%")
        .style("height", "100%")
        .style("box-sizing", "border-box")
        .style("padding", "0 12px 0 8px")
        .style("border-radius", "0 8px 8px 0")
        .style("font-family", "'Inter', 'Roboto', 'Segoe UI', sans-serif")
        .style("pointer-events", "auto")
        .style("background-color", baseBg)
        .style("transition", "background-color 0.15s ease")
        .on("mouseover", function () {
          d3.select(this).style("background-color", hoverBg);
        })
        .on("mouseout", function () {
          d3.select(this).style("background-color", baseBg);
        })
        .on("click", (_event) => onSelectCommit(d));

      contentDiv.html(`
        <div xmlns="http://www.w3.org/1999/xhtml" class="w-full h-full antialiased flex items-center" style="width: 100%; height: 100%; overflow: visible;">
          <div class="flex items-center gap-2 w-full" style="width: 100%; overflow: visible; display: flex; align-items: center;">
            <div class="commit-message flex items-center gap-2 overflow-hidden whitespace-nowrap" style="flex: 1 1 auto; min-width: 0; display: flex; align-items: center;">
              <span style="overflow: hidden; text-overflow: ellipsis; color: ${msgColor}; font-weight: ${msgWeight}; font-size: 13.5px; line-height: 1.4; pointer-events: none;">${safeMsg}</span>
              <div class="flex items-center gap-1.5 shrink-0" style="flex-shrink: 0; display: flex; align-items: center;">
                ${tagsRowHtml}
              </div>
            </div>
            <div class="flex items-center gap-2 overflow-hidden" style="flex: 0 0 140px; width: 140px; min-width: 140px; max-width: 140px; color: ${authorColor}; pointer-events: none;" title="${safeAuthor}">
              <div class="rounded-md flex items-center justify-center" style="flex: 0 0 22px; width: 22px; height: 22px; min-width: 22px; background-color: ${avatarColor}; color: white;">${authorInitial}</div>
              <span style="flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; font-size: 12px; color: ${authorNameColor};">${safeAuthor}</span>
            </div>
            <div style="flex: 0 0 85px; width: 85px; min-width: 85px; max-width: 85px; color: ${dateColor}; pointer-events: none; text-align: right; white-space: nowarp; display: flex; flex-direction: column; justify-content: center; line-height: 1.25;">
              <span style="font-size: 11px; font-weight: 600;">${datePart}</span>
              <span style="font-size: 10px; color: ${timeColor};">${timePart}</span>
            </div>
          </div>
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
            // Add hover effect for chips specifically
            el.onmouseover = (e) => {
                e.stopPropagation();
                // Extract current border color or recalculate based on ref type
                const refName = el.getAttribute("data-ref") || "";
                const isTag = refName.startsWith("tag: ");
                const isHEAD = refName.includes("HEAD");
                const isRemote = refName.includes("origin");
                
                let border = isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.15)";
                if (isHEAD || isTag) {
                  border = isDark ? "rgba(52, 211, 153, 0.25)" : "rgba(16, 185, 129, 0.15)";
                } else if (isRemote) {
                  border = isDark ? "rgba(244, 114, 182, 0.25)" : "rgba(236, 72, 153, 0.15)";
                }
                el.style.borderColor = border.replace("0.25", "0.5").replace("0.15", "0.4");
            };
            el.onmouseout = (e) => {
                e.stopPropagation();
                const refName = el.getAttribute("data-ref") || "";
                const isTag = refName.startsWith("tag: ");
                const isHEAD = refName.includes("HEAD");
                const isRemote = refName.includes("origin");
                
                let border = isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.15)";
                if (isHEAD || isTag) {
                  border = isDark ? "rgba(52, 211, 153, 0.25)" : "rgba(16, 185, 129, 0.15)";
                } else if (isRemote) {
                  border = isDark ? "rgba(244, 114, 182, 0.25)" : "rgba(236, 72, 153, 0.15)";
                }
                el.style.borderColor = border;
            };
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
    <div ref={containerRef} className="overflow-auto flex-1 custom-scrollbar overflow-touch">
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
