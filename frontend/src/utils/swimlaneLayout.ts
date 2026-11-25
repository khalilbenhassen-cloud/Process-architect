import { ProcessEdge, ProcessNode } from '../types/process';

export interface SwimlaneBand {
  id: string;
  role: string;
  index: number;
  poolId: string;
  isExternal: boolean;
  y: number;
  height: number;
  accentColor: string;
  nodeCount: number;
}

export interface SwimlanePool {
  id: string;
  label: string;
  isExternal: boolean;
  y: number;
  height: number;
  lanes: SwimlaneBand[];
}

export interface SwimlaneLayoutResult {
  pools: SwimlanePool[];
  lanes: SwimlaneBand[];
  nodePositions: Record<string, { x: number; y: number }>;
  nodeLaneIndex: Record<string, number>;
  handoffCount: number;
  headerWidth: number;
  totalWidth: number;
  totalHeight: number;
}

const LANE_ACCENTS = [
  '#007AFF', // Apple Blue
  '#34C759', // Apple Green
  '#FF9500', // Apple Orange
  '#5856D6', // Apple Indigo
  '#AF52DE', // Apple Purple
  '#00B4D8', // Cyan
  '#FF2D55', // Rose
];

export const SWIMLANE_HEADER_WIDTH = 196;
const POOL_STRIP_WIDTH = 34;
const COL_START_X = SWIMLANE_HEADER_WIDTH + 54;
const COL_GAP = 408;
const BASE_LANE_HEIGHT = 152;
const STACK_ROW_GAP = 104;
const POOL_GAP = 26;

/**
 * Détecte si un acteur est externe à l'organisation (Client, Adhérent, Assuré, Emprunteur, Fournisseur...)
 * afin de le placer dans un Pool BPMN 2.0 distinct.
 */
export function isExternalActorRole(role: string): boolean {
  const lower = (role || '').toLowerCase();
  return /client|adhérent|adherent|assuré|assure|emprunteur|demandeur|fournisseur|partenaire|externe|notaire|tiers/.test(
    lower
  );
}

/**
 * Calcule un layout BPMN 2.0 Swimlanes (Pools & Lanes par acteur/rôle) :
 * - Acteurs externes isolés dans leur propre Pool BPMN distinct (ex. Pool Client)
 * - Acteurs internes regroupés en Lanes dans le Pool Organisation
 * - Ordre chronologique gauche -> droite (cycle-safe)
 * - Les étapes de Fin héritent du couloir de leur étape précédente
 */
export function computeSwimlaneLayout(
  nodes: ProcessNode[],
  edges: ProcessEdge[]
): SwimlaneLayoutResult {
  if (nodes.length === 0) {
    return {
      pools: [],
      lanes: [],
      nodePositions: {},
      nodeLaneIndex: {},
      handoffCount: 0,
      headerWidth: SWIMLANE_HEADER_WIDTH,
      totalWidth: 900,
      totalHeight: 360,
    };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const outById = new Map<string, string[]>();
  const inById = new Map<string, string[]>();
  nodes.forEach((n) => {
    outById.set(n.id, []);
    inById.set(n.id, []);
  });

  edges.forEach((e) => {
    if (
      nodeIds.has(e.sourceNodeId) &&
      nodeIds.has(e.targetNodeId) &&
      e.sourceNodeId !== e.targetNodeId
    ) {
      outById.get(e.sourceNodeId)!.push(e.targetNodeId);
      inById.get(e.targetNodeId)!.push(e.sourceNodeId);
    }
  });

  // 1. Cycle-safe DAG edge extraction (3-color DFS)
  const color = new Map<string, 0 | 1 | 2>();
  nodes.forEach((n) => color.set(n.id, 0));
  const dagOut = new Map<string, string[]>();
  const dagInDeg = new Map<string, number>();
  nodes.forEach((n) => {
    dagOut.set(n.id, []);
    dagInDeg.set(n.id, 0);
  });

  const roots = nodes.filter(
    (n) => n.type === 'start' || (inById.get(n.id)?.length || 0) === 0
  );
  const dfsOrder = [
    ...roots.map((n) => n.id),
    ...nodes.map((n) => n.id).filter((id) => !roots.some((r) => r.id === id)),
  ];

  const dfs = (u: string) => {
    color.set(u, 1);
    for (const v of outById.get(u) || []) {
      const c = color.get(v) ?? 0;
      if (c === 1) continue; // back-edge (cycle) ignored for ranking
      dagOut.get(u)!.push(v);
      dagInDeg.set(v, (dagInDeg.get(v) ?? 0) + 1);
      if (c === 0) dfs(v);
    }
    color.set(u, 2);
  };
  dfsOrder.forEach((id) => {
    if ((color.get(id) ?? 0) === 0) dfs(id);
  });

  // 2. Topological longest-path rank (X column)
  const rank = new Map<string, number>();
  const queue: string[] = [];
  const inDegCopy = new Map(dagInDeg);
  nodes.forEach((n) => {
    if ((inDegCopy.get(n.id) ?? 0) === 0) {
      rank.set(n.id, 0);
      queue.push(n.id);
    }
  });

  while (queue.length > 0) {
    const u = queue.shift()!;
    const ru = rank.get(u) ?? 0;
    for (const v of dagOut.get(u) || []) {
      rank.set(v, Math.max(rank.get(v) ?? 0, ru + 1));
      const nextDeg = (inDegCopy.get(v) ?? 1) - 1;
      inDegCopy.set(v, nextDeg);
      if (nextDeg === 0) queue.push(v);
    }
  }

  nodes.forEach((n) => {
    if (!rank.has(n.id)) rank.set(n.id, 0);
  });

  // Compact column indices (eliminate empty gaps)
  const uniqueRanks = Array.from(new Set(rank.values())).sort((a, b) => a - b);
  const rankToCol = new Map<number, number>();
  uniqueRanks.forEach((r, idx) => rankToCol.set(r, idx));
  const colById = new Map<string, number>();
  nodes.forEach((n) => colById.set(n.id, rankToCol.get(rank.get(n.id) ?? 0) ?? 0));

  // 3. Resolve actor/role per node (End nodes inherit predecessor's lane!)
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const rawRoleById = new Map<string, string>();
  nodes.forEach((n) => {
    const trimmed = (n.ownerRole || '').trim();
    if (n.type !== 'end') {
      rawRoleById.set(
        n.id,
        trimmed || (n.type === 'start' ? 'Client / Déclencheur' : 'Non assigné')
      );
    }
  });

  const resolveEndRole = (nodeId: string, visited = new Set<string>()): string => {
    if (visited.has(nodeId)) return 'Non assigné';
    visited.add(nodeId);
    const preds = inById.get(nodeId) || [];
    for (const predId of preds) {
      const predRole = rawRoleById.get(predId);
      if (predRole) return predRole;
    }
    for (const predId of preds) {
      const inherited = resolveEndRole(predId, visited);
      if (inherited !== 'Non assigné') return inherited;
    }
    const self = (nodeById.get(nodeId)?.ownerRole || '').trim();
    return self || 'Non assigné';
  };

  nodes.forEach((n) => {
    if (n.type === 'end') {
      rawRoleById.set(n.id, resolveEndRole(n.id));
    }
  });

  // 4. Separate external roles (distinct Pools) from internal roles (Organization Pool Lanes)
  const roleFirstCol = new Map<string, number>();
  const roleNodes = new Map<string, ProcessNode[]>();
  nodes.forEach((n) => {
    const r = rawRoleById.get(n.id) || 'Non assigné';
    const c = colById.get(n.id) ?? 0;
    if (!roleFirstCol.has(r) || c < roleFirstCol.get(r)!) {
      roleFirstCol.set(r, c);
    }
    if (!roleNodes.has(r)) roleNodes.set(r, []);
    roleNodes.get(r)!.push(n);
  });

  const sortRoles = (a: string, b: string) => {
    const ca = roleFirstCol.get(a) ?? 0;
    const cb = roleFirstCol.get(b) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b, 'fr');
  };

  const allRoles = Array.from(roleNodes.keys());
  const externalRoles = allRoles.filter(isExternalActorRole).sort(sortRoles);
  const internalRoles = allRoles.filter((r) => !isExternalActorRole(r)).sort(sortRoles);

  // Build Pool groups: each external actor gets its own Pool at the top; all internal actors share the Organization Pool
  const poolSpecs: Array<{
    id: string;
    label: string;
    isExternal: boolean;
    roles: string[];
  }> = [];

  externalRoles.forEach((extRole, idx) => {
    poolSpecs.push({
      id: `pool-ext-${idx}`,
      label: 'Externe',
      isExternal: true,
      roles: [extRole],
    });
  });

  if (internalRoles.length > 0) {
    poolSpecs.push({
      id: 'pool-org',
      label: 'Organisation',
      isExternal: false,
      roles: internalRoles,
    });
  }

  const hasMultiplePools = poolSpecs.length > 1;
  const effectiveHeaderWidth = hasMultiplePools
    ? SWIMLANE_HEADER_WIDTH + POOL_STRIP_WIDTH
    : SWIMLANE_HEADER_WIDTH;
  const effectiveColStartX = effectiveHeaderWidth + 54;

  // 5. Compute Pool & Lane geometry + collision-free node positions
  const pools: SwimlanePool[] = [];
  const lanes: SwimlaneBand[] = [];
  const nodePositions: Record<string, { x: number; y: number }> = {};
  const nodeLaneIndex: Record<string, number> = {};

  let cursorY = 0;
  let globalLaneIdx = 0;
  let maxCol = 0;

  poolSpecs.forEach((spec, pIdx) => {
    if (pIdx > 0) {
      cursorY += POOL_GAP;
    }
    const poolStartY = cursorY;
    const poolLanes: SwimlaneBand[] = [];

    spec.roles.forEach((role) => {
      const laneNodes = roleNodes.get(role) || [];
      const byCol = new Map<number, ProcessNode[]>();
      laneNodes.forEach((n) => {
        const col = colById.get(n.id) ?? 0;
        if (col > maxCol) maxCol = col;
        if (!byCol.has(col)) byCol.set(col, []);
        byCol.get(col)!.push(n);
        nodeLaneIndex[n.id] = globalLaneIdx;
      });

      let maxStackInLane = 1;
      byCol.forEach((arr) => {
        if (arr.length > maxStackInLane) maxStackInLane = arr.length;
      });

      const laneHeight =
        maxStackInLane <= 1
          ? BASE_LANE_HEIGHT
          : BASE_LANE_HEIGHT + (maxStackInLane - 1) * STACK_ROW_GAP;

      const band: SwimlaneBand = {
        id: `lane-${globalLaneIdx}`,
        role,
        index: globalLaneIdx,
        poolId: spec.id,
        isExternal: spec.isExternal,
        y: cursorY,
        height: laneHeight,
        accentColor: LANE_ACCENTS[globalLaneIdx % LANE_ACCENTS.length],
        nodeCount: laneNodes.length,
      };
      lanes.push(band);
      poolLanes.push(band);

      byCol.forEach((arr, col) => {
        const blockHeight = (arr.length - 1) * STACK_ROW_GAP;
        arr.forEach((n, stackIdx) => {
          const isTerm = n.type === 'start' || n.type === 'end';
          const w = isTerm ? 54 : 244;
          const h = isTerm ? 54 : 88;
          const centerX = effectiveColStartX + col * COL_GAP + 122;
          const centerY =
            cursorY +
            laneHeight / 2 -
            blockHeight / 2 +
            stackIdx * STACK_ROW_GAP -
            (isTerm ? 14 : 0);
          nodePositions[n.id] = {
            x: Math.round(centerX - w / 2),
            y: Math.round(centerY - h / 2),
          };
        });
      });

      cursorY += laneHeight;
      globalLaneIdx += 1;
    });

    pools.push({
      id: spec.id,
      label: spec.label,
      isExternal: spec.isExternal,
      y: poolStartY,
      height: cursorY - poolStartY,
      lanes: poolLanes,
    });
  });

  // 6. Count handoffs (edges crossing between different lanes)
  let handoffCount = 0;
  edges.forEach((e) => {
    const lSrc = nodeLaneIndex[e.sourceNodeId];
    const lTgt = nodeLaneIndex[e.targetNodeId];
    if (lSrc !== undefined && lTgt !== undefined && lSrc !== lTgt) {
      handoffCount += 1;
    }
  });

  const totalWidth = Math.max(
    900,
    effectiveColStartX + (maxCol + 1) * COL_GAP + 60
  );
  const totalHeight = Math.max(240, cursorY);

  return {
    pools,
    lanes,
    nodePositions,
    nodeLaneIndex,
    handoffCount,
    headerWidth: effectiveHeaderWidth,
    totalWidth,
    totalHeight,
  };
}
