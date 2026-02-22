import { Commit } from "../../domain/entities/GitEntities";

interface Point {
  x: number;
  y: number;
}

export interface GraphNode extends Commit {
  x: number;
  y: number;
  lane: number;
}

// Refined GraphLink with midPoint for perfect routing
export interface GraphLink {
  source: Point;
  target: Point;
  color: string;
  isCurve: boolean;
  midPoint?: Point;
}

export const LANE_COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ef4444", // Red
  "#14b8a6", // Teal
];

export function calculateGraphLayout(commits: Commit[]) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const laneMap = new Map<string, number>();
  const activeLanes: (string | null)[] = [];
  const commitRows = new Map<string, number>();

  const ROW_HEIGHT = 56;
  const COL_WIDTH = 20;
  const PADDING_Y = 25;
  const PADDING_X = 20;

  // Pass 1: Assign lanes and rows
  commits.forEach((commit, index) => {
    let lane = activeLanes.indexOf(commit.hash);
    
    if (lane === -1) {
      lane = activeLanes.findIndex((l) => l === null);
      if (lane === -1) {
        lane = activeLanes.length;
        activeLanes.push(null);
      }
    }

    laneMap.set(commit.hash, lane);
    commitRows.set(commit.hash, index);
    activeLanes[lane] = null; // Node placed here, consuming the lane expectation

    commit.parents.forEach((pHash, i) => {
      if (activeLanes.indexOf(pHash) === -1) {
        let pLane = -1;
        if (i === 0 && activeLanes[lane] === null) {
          pLane = lane; // Primary parent keeps the main line straight
        } else {
          pLane = activeLanes.findIndex((l) => l === null);
          if (pLane === -1) {
            pLane = activeLanes.length;
            activeLanes.push(null);
          }
        }
        activeLanes[pLane] = pHash;
        laneMap.set(pHash, pLane); // Lock the parent to this lane column
      }
    });
  });

  // Pass 2: Create Nodes and routing Links
  commits.forEach((commit, index) => {
    const lane = laneMap.get(commit.hash)!;
    
    nodes.push({
      ...commit,
      x: lane * COL_WIDTH + PADDING_X,
      y: index * ROW_HEIGHT + PADDING_Y,
      lane,
    });

    const source = { x: lane * COL_WIDTH + PADDING_X, y: index * ROW_HEIGHT + PADDING_Y };

    commit.parents.forEach((pHash) => {
       const pLane = laneMap.get(pHash);
       if (pLane === undefined) return;

       const pRow = commitRows.get(pHash);
       const isParentInView = pRow !== undefined;
       
       // If parent is outside the loaded commits, project it to the bottom
       const targetRow = isParentInView ? pRow : commits.length;
       const target = { x: pLane * COL_WIDTH + PADDING_X, y: targetRow * ROW_HEIGHT + PADDING_Y };
       
       if (lane === pLane) {
         // Straight vertical line connection
         links.push({
           source,
           target,
           color: LANE_COLORS[pLane % LANE_COLORS.length],
           isCurve: false
         });
       } else {
         // Diagonal branching/merging connection
         const midPoint = { x: pLane * COL_WIDTH + PADDING_X, y: (index + 1) * ROW_HEIGHT + PADDING_Y };
         links.push({
           source,
           target,
           color: LANE_COLORS[pLane % LANE_COLORS.length],
           isCurve: true,
           midPoint
         });
       }
    });
  });

  return { nodes, links };
}
