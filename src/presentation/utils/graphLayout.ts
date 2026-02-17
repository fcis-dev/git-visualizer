import { Commit } from '../../domain/entities/GitEntities';

interface Point {
  x: number;
  y: number;
}

export interface GraphNode extends Commit {
  x: number;
  y: number;
  lane: number;
}

export interface GraphLink {
  source: Point;
  target: Point;
  color: string;
}

const COLORS = [
  "#F64747", "#F9690E", "#F9BF3B", "#26C281", "#1BA39C", "#22A7F0", "#89C4F4",
  "#9B59B6", "#AEA8D3", "#FFE6E6", "#DCC6E0", "#E87E04", "#F4D03F",
  "#2ECC71", "#1BBC9B", "#4B77BE", "#2C3E50"
];

export function calculateGraphLayout(commits: Commit[]) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Maps commit hash to its assigned lane
  const laneMap = new Map<string, number>();
  // Tracks used lanes at current row
  const activeLanes: (string | null)[] = [];

  commits.forEach((commit, index) => {
    let lane = -1;

    // Check if this commit is already expected in a lane (because a child pointed to it)
    // We treat the first parent as the "main" continuation of the lane.
    // If commit hash is in activeLanes, we reuse that lane.

    // Simplification: just find if this commit hash is in activeLanes
    const existingLaneIndex = activeLanes.indexOf(commit.hash);

    if (existingLaneIndex !== -1) {
      lane = existingLaneIndex;
      activeLanes[existingLaneIndex] = null; // Consume the expectation
    } else {
      // New branch tip or detached
      // Find first empty lane
      lane = activeLanes.findIndex(l => l === null || l === undefined);
      if (lane === -1) {
        lane = activeLanes.length;
        activeLanes.push(null);
      }
    }

    laneMap.set(commit.hash, lane);
    activeLanes[lane] = null; // Occupied by current commit temporarily

    // Prepare for parents
    // Parent 0 continues the current lane (usually)
    // Parent 1+ are merges, they might be in other lanes or need new lanes

    commit.parents.forEach((parentHash, i) => {
      if (i === 0) {
        // Primary parent keeps the lane if possible
        if (activeLanes[lane] === null) {
          activeLanes[lane] = parentHash;
        } else {
          // Lane occupied? (Should not happen in simple logic, but maybe)
          // If occupied, we might need to branch out, but here we are going down.
          // Actually parent 0 *should* take the lane.
          // If multiple children point to same parent, the first one seen (newest) takes it.
          // Subsequent children pointing to same parent will find it already in a lane? 
          // Wait, if P is in activeLanes, it means it's already "taken".
          // If P is already in activeLanes, we connect to it.
          // This logic needs to be careful about not duplicating activeLanes entries for same parent.
        }
      } else {
        // Verify if parent is already active
        if (!activeLanes.includes(parentHash)) {
          // Assign a new lane or find empty
          let targetLane = activeLanes.findIndex(l => l === null);
          if (targetLane === -1) {
            targetLane = activeLanes.length;
            activeLanes.push(parentHash);
          } else {
            activeLanes[targetLane] = parentHash;
          }
        }
      }
    });

    // If multiple parents point to same hash, ensure we don't duplicate. 
    // The simplified logic above might overwrite.
    // Better:
    // clear current commit from activeLanes (done)
    // For each parent:
    //   if parent is already in activeLanes: calculate link to it
    //   else: place parent in a lane (current lane for p0, new/empty for others)

    // Refined step:
    // 1. Identify lane for current commit C. (Done above)
    // 2. Create Node C.
    // 3. For each parent P:
    //    3a. Check if P is already in activeLanes (seen by a sibling of C? No, C's siblings would be processed earlier if they are newer? No, siblings merges...
    //        Actually if multiple branches merge into P, P is parent of multiple children.
    //        The first child processed will assign P to a lane.
    //        Subsequent children will find P in activeLanes.

    // Redo loop for parents to set strict "next" state

    // We need to know which lane parents end up in to draw lines.

    // Re-eval activeLanes update:

    const parentLanes: number[] = [];

    commit.parents.forEach((parentHash, i) => {
      let pLane = activeLanes.indexOf(parentHash);
      if (pLane === -1) {
        if (i === 0 && activeLanes[lane] === null) {
          pLane = lane;
          activeLanes[lane] = parentHash;
        } else {
          pLane = activeLanes.findIndex(l => l === null);
          if (pLane === -1) {
            pLane = activeLanes.length;
            activeLanes.push(parentHash);
          } else {
            activeLanes[pLane] = parentHash;
          }
        }
      }
      parentLanes.push(pLane);

      // Link
      links.push({
        source: { x: lane * 20 + 20, y: index * 40 + 25 },
        target: { x: pLane * 20 + 20, y: (index + 1) * 40 + 25 },
        color: COLORS[lane % COLORS.length]
      });
    });

    // If no parents (initial commit), lane becomes empty (activeLanes[lane] is null) - correct.

    nodes.push({
      ...commit,
      x: lane * 20 + 20,
      y: index * 40 + 25,
      lane
    });
  });

  return { nodes, links };
}
