import { Process, ProcessEdge, ProcessNode } from '../types/process';
import { resolveBpmnGatewayKind, resolveBpmnTaskKind } from './bpmnTaskKind';
import { computeSwimlaneLayout, isExternalActorRole } from './swimlaneLayout';

interface BoxBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function escXml(val: string): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeId(prefix: string, raw: string): string {
  const cleaned = (raw || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `${prefix}_${cleaned}`;
}

function bpmnTagForNode(node: ProcessNode): string {
  if (node.type === 'start') return 'bpmn:startEvent';
  if (node.type === 'end') return 'bpmn:endEvent';
  if (node.type === 'subprocess') return 'bpmn:subProcess';
  if (node.type === 'decision') {
    const gw = resolveBpmnGatewayKind(node);
    if (gw === 'event_based') return 'bpmn:eventBasedGateway';
    if (gw === 'and') return 'bpmn:parallelGateway';
    if (gw === 'or') return 'bpmn:inclusiveGateway';
    return 'bpmn:exclusiveGateway';
  }
  const lower = `${node.label || ''} ${node.description || ''}`.toLowerCase();
  if (/notifier|relance|demander les pièces|demander les pieces|recommandé|recommande/.test(lower)) {
    return 'bpmn:sendTask';
  }
  const kind = resolveBpmnTaskKind(node);
  if (kind === 'service') return 'bpmn:serviceTask';
  if (kind === 'manual') return 'bpmn:manualTask';
  if (kind === 'business_rule') return 'bpmn:businessRuleTask';
  return 'bpmn:userTask';
}

function emitsExternalMessage(node: ProcessNode): boolean {
  if (node.type !== 'task') return false;
  if (bpmnTagForNode(node) === 'bpmn:sendTask') return true;
  const lower = `${node.label || ''} ${node.description || ''}`.toLowerCase();
  return /émettre avis|emettre avis|avis de virement|clôturer.*forclusion|cloturer.*forclusion|avis de caducit/.test(
    lower
  );
}

function isTimerCatchBranch(label: string): boolean {
  const lower = (label || '').toLowerCase();
  if (/reçu|recu|réception|reception|réponse|reponse|retour|transmis/.test(lower)) {
    return false;
  }
  return /expir|dépass|depass|forclu|caduc|timeout|échéance|echeance|>\s*\d+/.test(lower);
}

function extractIsoDuration(text: string): string {
  const dayMatch = text.match(/(\d+)\s*(?:jours?|j\b)/i);
  if (dayMatch) return `P${dayMatch[1]}D`;
  const hourMatch = text.match(/(\d+)\s*(?:heures?|h\b)/i);
  if (hourMatch) return `PT${hourMatch[1]}H`;
  const minMatch = text.match(/(\d+)\s*(?:minutes?|min\b)/i);
  if (minMatch) return `PT${minMatch[1]}M`;
  return 'P30D';
}

function isNegativeBranchLabel(label: string): boolean {
  const lower = (label || '').toLowerCase();
  return (
    lower.includes('rejet') ||
    lower.includes('refus') ||
    lower.includes('inéligible') ||
    lower.includes('ineligible') ||
    lower.includes('incomplet') ||
    lower.includes('expiré') ||
    lower.includes('expire') ||
    lower.includes('supérieur') ||
    lower.includes('superieur') ||
    lower === 'non' ||
    lower.startsWith('non ')
  );
}

/**
 * Finds a vertical corridor X between yTop and yBottom that does not intersect any node box.
 */
function findClearVerticalX(
  preferredX: number,
  yTop: number,
  yBottom: number,
  allBounds: Map<string, BoxBounds>,
  excludeIds: Set<string>,
  usedCorridors: number[]
): number {
  const minY = Math.min(yTop, yBottom) + 4;
  const maxY = Math.max(yTop, yBottom) - 4;
  const margin = 14;

  const isFree = (cx: number): boolean => {
    if (cx < 45) return false;
    if (usedCorridors.some((u) => Math.abs(u - cx) < 16)) return false;
    for (const [id, b] of allBounds.entries()) {
      if (excludeIds.has(id)) continue;
      const yOverlap = b.y < maxY && b.y + b.h > minY;
      if (yOverlap && cx >= b.x - margin && cx <= b.x + b.w + margin) {
        return false;
      }
    }
    return true;
  };

  if (isFree(preferredX)) {
    usedCorridors.push(preferredX);
    return preferredX;
  }

  for (let step = 1; step <= 24; step++) {
    const rightCandidate = Math.round(preferredX + step * 26);
    if (isFree(rightCandidate)) {
      usedCorridors.push(rightCandidate);
      return rightCandidate;
    }
    const leftCandidate = Math.round(preferredX - step * 26);
    if (isFree(leftCandidate)) {
      usedCorridors.push(leftCandidate);
      return leftCandidate;
    }
  }

  usedCorridors.push(preferredX);
  return preferredX;
}

interface SyntheticCatchEvent {
  catchId: string;
  toCatchFlowId: string;
  fromCatchFlowId: string;
  gatewayNodeId: string;
  gatewayXmlId: string;
  targetXmlId: string;
  laneIndex: number;
  label: string;
  kind: 'timer' | 'message';
  isoDuration: string;
  siblingIndex: number;
  siblingCount: number;
}

/**
 * Génère un fichier XML BPMN 2.0 standard (OMG ISO 19510) avec :
 * - <bpmn:collaboration>, Participants (Pool Externe boîte noire + Pool Organisation) & <bpmn:messageFlow> bidirectionnels
 * - <bpmn:messageEventDefinition /> sur le startEvent déclenché par l'externe
 * - <bpmn:eventBasedGateway> avec <bpmn:intermediateCatchEvent> (Timer ISO-8601 & Message)
 * - default="..." et <bpmn:conditionExpression> sur les exclusiveGateways
 * - Routage BPMNDI anti-collision pour les flux de message
 */
export function buildBpmn20Xml(process: Process): string {
  const nodes = process.nodes || [];
  const edges = process.edges || [];
  const rulesById = new Map((process.businessRules || []).map((r) => [r.id, r]));

  const baseSlug = (process.id || 'main').replace(/[^a-zA-Z0-9_-]/g, '_') || 'main';
  const procXmlId = `Process_${baseSlug}`;
  const collabId = `Collaboration_${baseSlug}`;
  const orgParticipantId = `Participant_Org_${baseSlug}`;
  const extParticipantId = `Participant_Ext_${baseSlug}`;

  const layout = computeSwimlaneLayout(nodes, edges);

  const externalPool = layout.pools.find((p) => p.isExternal);
  const startNode = nodes.find((n) => n.type === 'start');
  const hasExternalTrigger = Boolean(
    externalPool &&
      startNode &&
      isExternalActorRole(
        (startNode.ownerRole || '').trim() || externalPool.lanes[0]?.role || ''
      )
  );
  const externalActorName =
    externalPool?.lanes[0]?.role || startNode?.ownerRole || 'Client / Externe';

  const nodeIdMap = new Map<string, string>();
  nodes.forEach((n, idx) => {
    nodeIdMap.set(n.id, safeId(`Node_${idx + 1}`, n.id));
  });

  const edgeIdMap = new Map<string, string>();
  edges.forEach((e, idx) => {
    edgeIdMap.set(e.id, safeId(`Flow_${idx + 1}`, e.id));
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const incomingByNode = new Map<string, string[]>();
  const outgoingEdgesByNode = new Map<string, ProcessEdge[]>();
  edges.forEach((e) => {
    const fid = edgeIdMap.get(e.id)!;
    if (!outgoingEdgesByNode.has(e.sourceNodeId)) {
      outgoingEdgesByNode.set(e.sourceNodeId, []);
    }
    if (!incomingByNode.has(e.targetNodeId)) {
      incomingByNode.set(e.targetNodeId, []);
    }
    outgoingEdgesByNode.get(e.sourceNodeId)!.push(e);
    incomingByNode.get(e.targetNodeId)!.push(fid);
  });

  // Expand outgoing edges of eventBasedGateways into OMG-compliant intermediateCatchEvents
  const catchByEdgeId = new Map<string, SyntheticCatchEvent>();
  const syntheticCatches: SyntheticCatchEvent[] = [];

  nodes.forEach((n) => {
    if (n.type === 'decision' && resolveBpmnGatewayKind(n) === 'event_based') {
      const outs = outgoingEdgesByNode.get(n.id) || [];
      outs.forEach((e, idx) => {
        const fid = edgeIdMap.get(e.id)!;
        const tgtXmlId = nodeIdMap.get(e.targetNodeId);
        if (!tgtXmlId) return;
        const isTimer = isTimerCatchBranch(e.label || '');
        const catchEvt: SyntheticCatchEvent = {
          catchId: `Catch_${fid}`,
          toCatchFlowId: `Flow_ToCatch_${fid}`,
          fromCatchFlowId: fid,
          gatewayNodeId: n.id,
          gatewayXmlId: nodeIdMap.get(n.id)!,
          targetXmlId: tgtXmlId,
          laneIndex: layout.nodeLaneIndex[n.id] ?? 0,
          label: e.label || (isTimer ? 'Délai expiré' : 'Message reçu'),
          kind: isTimer ? 'timer' : 'message',
          isoDuration: extractIsoDuration(`${n.label || ''} ${n.description || ''} ${e.label || ''}`),
          siblingIndex: idx,
          siblingCount: outs.length,
        };
        catchByEdgeId.set(e.id, catchEvt);
        syntheticCatches.push(catchEvt);
      });
    }
  });

  // Determine default sequenceFlow for every exclusiveGateway ONLY (never eventBasedGateway)
  const defaultFlowIdByGateway = new Map<string, string>();
  const defaultFlowIdSet = new Set<string>();
  nodes.forEach((n) => {
    if (n.type === 'decision' && resolveBpmnGatewayKind(n) === 'xor') {
      const outs = outgoingEdgesByNode.get(n.id) || [];
      if (outs.length >= 2) {
        const nominal =
          outs.find((e) => !isNegativeBranchLabel(e.label || '')) || outs[0];
        const fid = edgeIdMap.get(nominal.id)!;
        defaultFlowIdByGateway.set(n.id, fid);
        defaultFlowIdSet.add(fid);
      }
    }
  });

  // Internal Lanes
  const internalLanes = hasExternalTrigger
    ? layout.lanes.filter((l) => !l.isExternal)
    : layout.lanes;
  const firstInternalLaneIdx = internalLanes[0]?.index;

  const lanesXml = internalLanes
    .map((lane) => {
      const laneXmlId = `Lane_${safeId('L', lane.id)}`;
      const nodeRefs = nodes
        .filter((n) => {
          const idx = layout.nodeLaneIndex[n.id];
          if (hasExternalTrigger && n.id === startNode?.id) {
            return lane.index === firstInternalLaneIdx;
          }
          return idx === lane.index;
        })
        .map((n) => `        <bpmn:flowNodeRef>${nodeIdMap.get(n.id)}</bpmn:flowNodeRef>`);

      const catchRefs = syntheticCatches
        .filter((c) => c.laneIndex === lane.index)
        .map((c) => `        <bpmn:flowNodeRef>${c.catchId}</bpmn:flowNodeRef>`);

      const refs = [...nodeRefs, ...catchRefs].join('\n');
      return `      <bpmn:lane id="${laneXmlId}" name="${escXml(lane.role)}">\n${refs}\n      </bpmn:lane>`;
    })
    .join('\n');

  // FlowNodes XML
  const flowNodesXml = nodes
    .map((n) => {
      const tag = bpmnTagForNode(n);
      const nid = nodeIdMap.get(n.id)!;
      const defaultAttr =
        defaultFlowIdByGateway.has(n.id)
          ? ` default="${defaultFlowIdByGateway.get(n.id)}"`
          : '';

      const ins = (incomingByNode.get(n.id) || [])
        .map((fid) => `      <bpmn:incoming>${fid}</bpmn:incoming>`)
        .join('\n');
      const outs = (outgoingEdgesByNode.get(n.id) || [])
        .map((e) => {
          const catchEvt = catchByEdgeId.get(e.id);
          const outFid = catchEvt ? catchEvt.toCatchFlowId : edgeIdMap.get(e.id);
          return `      <bpmn:outgoing>${outFid}</bpmn:outgoing>`;
        })
        .join('\n');

      const docParts: string[] = [];
      if (n.description) docParts.push(n.description);
      if (n.ownerRole) docParts.push(`Acteur : ${n.ownerRole}`);
      if (n.estimatedDurationMinutes) {
        docParts.push(`Durée estimée : ${n.estimatedDurationMinutes} min`);
      }
      if (n.ruleIds && n.ruleIds.length > 0) {
        const rLabels = n.ruleIds.map((rid) => {
          const r = rulesById.get(rid);
          return r ? `${r.id} (${r.title})` : rid;
        });
        docParts.push(`Règles métier : ${rLabels.join(' ; ')}`);
      }
      const docXml =
        docParts.length > 0
          ? `      <bpmn:documentation>${escXml(docParts.join(' | '))}</bpmn:documentation>`
          : '';

      const msgEventDefXml =
        hasExternalTrigger && n.id === startNode?.id
          ? `      <bpmn:messageEventDefinition id="MsgEventDef_${nid}" />`
          : '';

      const inner = [docXml, ins, outs, msgEventDefXml].filter(Boolean).join('\n');
      return inner
        ? `    <${tag} id="${nid}" name="${escXml(n.label || '')}"${defaultAttr}>\n${inner}\n    </${tag}>`
        : `    <${tag} id="${nid}" name="${escXml(n.label || '')}"${defaultAttr} />`;
    })
    .join('\n');

  // Synthetic IntermediateCatchEvents XML (Timer & Message after Event-Based Gateways)
  const catchNodesXml = syntheticCatches
    .map((c) => {
      const defXml =
        c.kind === 'timer'
          ? `      <bpmn:timerEventDefinition id="TimerDef_${c.catchId}">
        <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${escXml(c.isoDuration)}</bpmn:timeDuration>
      </bpmn:timerEventDefinition>`
          : `      <bpmn:messageEventDefinition id="MsgCatchDef_${c.catchId}" />`;
      return `    <bpmn:intermediateCatchEvent id="${c.catchId}" name="${escXml(c.label)}">
      <bpmn:incoming>${c.toCatchFlowId}</bpmn:incoming>
      <bpmn:outgoing>${c.fromCatchFlowId}</bpmn:outgoing>
${defXml}
    </bpmn:intermediateCatchEvent>`;
    })
    .join('\n');

  // SequenceFlows XML
  const flowsXml = edges
    .map((e) => {
      const fid = edgeIdMap.get(e.id)!;
      const src = nodeIdMap.get(e.sourceNodeId);
      const tgt = nodeIdMap.get(e.targetNodeId);
      if (!src || !tgt) return '';

      const catchEvt = catchByEdgeId.get(e.id);
      if (catchEvt) {
        return [
          `    <bpmn:sequenceFlow id="${catchEvt.toCatchFlowId}" sourceRef="${src}" targetRef="${catchEvt.catchId}" />`,
          `    <bpmn:sequenceFlow id="${fid}" sourceRef="${catchEvt.catchId}" targetRef="${tgt}" />`,
        ].join('\n');
      }

      const srcNode = nodeById.get(e.sourceNodeId);
      const nameAttr = e.label ? ` name="${escXml(e.label)}"` : '';
      const needsCondition =
        srcNode?.type === 'decision' &&
        resolveBpmnGatewayKind(srcNode) === 'xor' &&
        !defaultFlowIdSet.has(fid) &&
        Boolean(e.label?.trim());

      if (needsCondition) {
        return `    <bpmn:sequenceFlow id="${fid}" sourceRef="${src}" targetRef="${tgt}"${nameAttr}>
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escXml(e.label || '')}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>`;
      }
      return `    <bpmn:sequenceFlow id="${fid}" sourceRef="${src}" targetRef="${tgt}"${nameAttr} />`;
    })
    .filter(Boolean)
    .join('\n');

  // Collaboration XML (Black-Box External Participant + Bidirectional MessageFlows)
  const msgFlowId = `MessageFlow_Start_${baseSlug}`;
  const outboundMsgNodes = hasExternalTrigger
    ? nodes.filter((n) => emitsExternalMessage(n))
    : [];
  const inboundCatchMessages = hasExternalTrigger
    ? syntheticCatches.filter((c) => c.kind === 'message')
    : [];

  const extraMsgFlowsXml = [
    ...outboundMsgNodes.map((n) => {
      const nid = nodeIdMap.get(n.id)!;
      const mfId = `MessageFlow_Send_${nid}`;
      return `    <bpmn:messageFlow id="${mfId}" name="${escXml(n.label || 'Notification')}" sourceRef="${nid}" targetRef="${extParticipantId}" />`;
    }),
    ...inboundCatchMessages.map((c) => {
      const mfId = `MessageFlow_Catch_${c.catchId}`;
      return `    <bpmn:messageFlow id="${mfId}" name="${escXml(c.label)}" sourceRef="${extParticipantId}" targetRef="${c.catchId}" />`;
    }),
  ].join('\n');

  const orgParticipantName = process.owner
    ? `Organisation — ${process.owner}`
    : 'Organisation';

  const collaborationXml =
    hasExternalTrigger && startNode
      ? `  <bpmn:collaboration id="${collabId}">
    <bpmn:participant id="${extParticipantId}" name="${escXml(externalActorName)}" />
    <bpmn:participant id="${orgParticipantId}" name="${escXml(orgParticipantName)}" processRef="${procXmlId}" />
    <bpmn:messageFlow id="${msgFlowId}" name="${escXml(startNode.label || 'Demande entrante')}" sourceRef="${extParticipantId}" targetRef="${nodeIdMap.get(startNode.id)}" />${
          extraMsgFlowsXml ? `\n${extraMsgFlowsXml}` : ''
        }
  </bpmn:collaboration>\n`
      : '';

  // BPMNDI Shapes & Edges
  const boundsByXmlId = new Map<string, BoxBounds>();
  const shapesXml: string[] = [];

  const extPoolHeight = 96;
  const orgPoolTopY = hasExternalTrigger ? extPoolHeight + 44 : 0;
  const internalPoolOriginY = internalLanes[0]?.y ?? 0;
  const orgPoolHeight = internalLanes.reduce((sum, l) => sum + l.height, 0) || 320;
  const totalWidth = Math.round(layout.totalWidth + 80);

  if (hasExternalTrigger) {
    shapesXml.push(
      `      <bpmndi:BPMNShape id="${extParticipantId}_di" bpmnElement="${extParticipantId}" isHorizontal="true">
        <dc:Bounds x="0" y="0" width="${totalWidth}" height="${extPoolHeight}" />
      </bpmndi:BPMNShape>`
    );
    shapesXml.push(
      `      <bpmndi:BPMNShape id="${orgParticipantId}_di" bpmnElement="${orgParticipantId}" isHorizontal="true">
        <dc:Bounds x="0" y="${orgPoolTopY}" width="${totalWidth}" height="${Math.round(orgPoolHeight)}" />
      </bpmndi:BPMNShape>`
    );
  }

  internalLanes.forEach((lane) => {
    const laneXmlId = `Lane_${safeId('L', lane.id)}`;
    const laneY = Math.round(orgPoolTopY + (lane.y - internalPoolOriginY));
    shapesXml.push(
      `      <bpmndi:BPMNShape id="${laneXmlId}_di" bpmnElement="${laneXmlId}" isHorizontal="true">
        <dc:Bounds x="${hasExternalTrigger ? 30 : 0}" y="${laneY}" width="${
          totalWidth - (hasExternalTrigger ? 30 : 0)
        }" height="${Math.round(lane.height)}" />
      </bpmndi:BPMNShape>`
    );
  });

  nodes.forEach((n) => {
    const nid = nodeIdMap.get(n.id)!;
    const rawPos = layout.nodePositions[n.id] || n.position || { x: 120, y: 120 };
    const isTerm = n.type === 'start' || n.type === 'end';
    const isGw = n.type === 'decision';
    const w = isTerm ? 36 : isGw ? 50 : 140;
    const h = isTerm ? 36 : isGw ? 50 : 80;
    const x = Math.round(rawPos.x + (isTerm ? 9 : isGw ? 97 : 52));
    const y =
      hasExternalTrigger && n.id === startNode?.id
        ? Math.round(orgPoolTopY + (internalLanes[0]?.height || 152) / 2 - h / 2)
        : Math.round(orgPoolTopY + (rawPos.y - internalPoolOriginY) + (isTerm ? 9 : isGw ? 19 : 4));

    boundsByXmlId.set(nid, { x, y, w, h });
    shapesXml.push(
      `      <bpmndi:BPMNShape id="${nid}_di" bpmnElement="${nid}"${
        isGw && resolveBpmnGatewayKind(n) === 'xor' ? ' isMarkerVisible="true"' : ''
      }>
        <dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}" />
      </bpmndi:BPMNShape>`
    );
  });

  // Shapes for Synthetic IntermediateCatchEvents
  syntheticCatches.forEach((c) => {
    const gwBounds = boundsByXmlId.get(c.gatewayXmlId);
    const w = 36;
    const h = 36;
    const offsetY = (c.siblingIndex - (c.siblingCount - 1) / 2) * 52;
    const x = gwBounds ? Math.round(gwBounds.x + gwBounds.w + 54) : 200;
    const y = gwBounds ? Math.round(gwBounds.y + gwBounds.h / 2 - h / 2 + offsetY) : 200;
    boundsByXmlId.set(c.catchId, { x, y, w, h });
    shapesXml.push(
      `      <bpmndi:BPMNShape id="${c.catchId}_di" bpmnElement="${c.catchId}">
        <dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}" />
      </bpmndi:BPMNShape>`
    );
  });

  const edgesDiXml: string[] = [];
  const usedMsgCorridors: number[] = [];

  // Anti-collision MessageFlows BPMNDI
  if (hasExternalTrigger && startNode) {
    const startXmlId = nodeIdMap.get(startNode.id)!;
    const sb = boundsByXmlId.get(startXmlId);
    if (sb) {
      const mx = Math.round(sb.x + sb.w / 2);
      usedMsgCorridors.push(mx);
      edgesDiXml.push(
        `      <bpmndi:BPMNEdge id="${msgFlowId}_di" bpmnElement="${msgFlowId}">
        <di:waypoint x="${mx}" y="${extPoolHeight}" />
        <di:waypoint x="${mx}" y="${sb.y}" />
      </bpmndi:BPMNEdge>`
      );
    }

    outboundMsgNodes.forEach((n) => {
      const nid = nodeIdMap.get(n.id)!;
      const nb = boundsByXmlId.get(nid);
      if (!nb) return;
      const mfId = `MessageFlow_Send_${nid}`;
      const centerX = Math.round(nb.x + nb.w / 2);
      const clearX = findClearVerticalX(
        centerX,
        extPoolHeight,
        nb.y,
        boundsByXmlId,
        new Set([nid]),
        usedMsgCorridors
      );
      if (Math.abs(clearX - centerX) <= 2) {
        edgesDiXml.push(
          `      <bpmndi:BPMNEdge id="${mfId}_di" bpmnElement="${mfId}">
        <di:waypoint x="${centerX}" y="${nb.y}" />
        <di:waypoint x="${centerX}" y="${extPoolHeight}" />
      </bpmndi:BPMNEdge>`
        );
      } else {
        const elbowY = Math.max(extPoolHeight + 18, nb.y - 16);
        edgesDiXml.push(
          `      <bpmndi:BPMNEdge id="${mfId}_di" bpmnElement="${mfId}">
        <di:waypoint x="${centerX}" y="${nb.y}" />
        <di:waypoint x="${centerX}" y="${elbowY}" />
        <di:waypoint x="${clearX}" y="${elbowY}" />
        <di:waypoint x="${clearX}" y="${extPoolHeight}" />
      </bpmndi:BPMNEdge>`
        );
      }
    });

    inboundCatchMessages.forEach((c) => {
      const cb = boundsByXmlId.get(c.catchId);
      if (!cb) return;
      const mfId = `MessageFlow_Catch_${c.catchId}`;
      const centerX = Math.round(cb.x + cb.w / 2);
      const clearX = findClearVerticalX(
        centerX,
        extPoolHeight,
        cb.y,
        boundsByXmlId,
        new Set([c.catchId]),
        usedMsgCorridors
      );
      if (Math.abs(clearX - centerX) <= 2) {
        edgesDiXml.push(
          `      <bpmndi:BPMNEdge id="${mfId}_di" bpmnElement="${mfId}">
        <di:waypoint x="${centerX}" y="${extPoolHeight}" />
        <di:waypoint x="${centerX}" y="${cb.y}" />
      </bpmndi:BPMNEdge>`
        );
      } else {
        const elbowY = Math.max(extPoolHeight + 18, cb.y - 16);
        edgesDiXml.push(
          `      <bpmndi:BPMNEdge id="${mfId}_di" bpmnElement="${mfId}">
        <di:waypoint x="${clearX}" y="${extPoolHeight}" />
        <di:waypoint x="${clearX}" y="${elbowY}" />
        <di:waypoint x="${centerX}" y="${elbowY}" />
        <di:waypoint x="${centerX}" y="${cb.y}" />
      </bpmndi:BPMNEdge>`
        );
      }
    });
  }

  // SequenceFlows BPMNDI (with clean top-gutter return-loop routing when x2 < x1)
  const pushOrthoEdge = (fid: string, sb: BoxBounds, tb: BoxBounds) => {
    const x1 = sb.x + sb.w;
    const y1 = Math.round(sb.y + sb.h / 2);
    const x2 = tb.x;
    const y2 = Math.round(tb.y + tb.h / 2);

    if (x2 < x1) {
      const exitX = x1 + 28;
      const topGutterY = Math.max(orgPoolTopY + 14, Math.min(sb.y, tb.y) - 22);
      const targetCenterX = Math.round(tb.x + tb.w / 2);
      edgesDiXml.push(
        `      <bpmndi:BPMNEdge id="${fid}_di" bpmnElement="${fid}">
        <di:waypoint x="${x1}" y="${y1}" />
        <di:waypoint x="${exitX}" y="${y1}" />
        <di:waypoint x="${exitX}" y="${topGutterY}" />
        <di:waypoint x="${targetCenterX}" y="${topGutterY}" />
        <di:waypoint x="${targetCenterX}" y="${tb.y}" />
      </bpmndi:BPMNEdge>`
      );
      return;
    }

    const midX = Math.round((x1 + x2) / 2);
    edgesDiXml.push(
      `      <bpmndi:BPMNEdge id="${fid}_di" bpmnElement="${fid}">
        <di:waypoint x="${x1}" y="${y1}" />
        <di:waypoint x="${midX}" y="${y1}" />
        <di:waypoint x="${midX}" y="${y2}" />
        <di:waypoint x="${x2}" y="${y2}" />
      </bpmndi:BPMNEdge>`
    );
  };

  edges.forEach((e) => {
    const fid = edgeIdMap.get(e.id)!;
    const srcXmlId = nodeIdMap.get(e.sourceNodeId)!;
    const tgtXmlId = nodeIdMap.get(e.targetNodeId)!;
    const sb = boundsByXmlId.get(srcXmlId);
    const tb = boundsByXmlId.get(tgtXmlId);
    if (!sb || !tb) return;

    const catchEvt = catchByEdgeId.get(e.id);
    if (catchEvt) {
      const cb = boundsByXmlId.get(catchEvt.catchId);
      if (cb) {
        pushOrthoEdge(catchEvt.toCatchFlowId, sb, cb);
        pushOrthoEdge(catchEvt.fromCatchFlowId, cb, tb);
      }
      return;
    }

    pushOrthoEdge(fid, sb, tb);
  });

  const diagramPlaneElement = hasExternalTrigger ? collabId : procXmlId;

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_${procXmlId}"
  targetNamespace="http://process-architect.local/bpmn">
${collaborationXml}  <bpmn:process id="${procXmlId}" name="${escXml(process.name || 'Processus')}" isExecutable="false">
${
  lanesXml
    ? `    <bpmn:laneSet id="LaneSet_${procXmlId}">\n${lanesXml}\n    </bpmn:laneSet>\n`
    : ''
}${flowNodesXml}${catchNodesXml ? `\n${catchNodesXml}` : ''}
${flowsXml}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_${procXmlId}">
    <bpmndi:BPMNPlane id="BPMNPlane_${procXmlId}" bpmnElement="${diagramPlaneElement}">
${shapesXml.join('\n')}
${edgesDiXml.join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}

export function downloadProcessBpmnXml(process: Process): void {
  const xml = buildBpmn20Xml(process);
  const safeSlug = (process.name || 'processus')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeSlug || 'processus'}_v${process.version || 1}.bpmn`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
