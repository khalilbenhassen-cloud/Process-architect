import { describe, expect, it } from 'vitest';
import { Process } from '../types/process';
import { buildBpmn20Xml } from './bpmnXmlExport';

const sampleProcess: Process = {
  id: 'demo-rachat-partiel',
  name: 'Demande de rachat partiel',
  owner: 'Direction MOA & Gestion Épargne',
  version: '1.2.0',
  lifecycleState: 'approved',
  modelState: 'to_be',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  requirements: [],
  testCases: [],
  nodes: [
    {
      id: 'node_start',
      type: 'start',
      label: 'Réception de la demande de rachat',
      ownerRole: 'Espace Adhérent',
      position: { x: 0, y: 0 },
    },
    {
      id: 'node_check',
      type: 'task',
      label: 'Contrôler la complétude des pièces',
      ownerRole: 'Gestionnaire Back-Office',
      position: { x: 200, y: 0 },
    },
    {
      id: 'node_dec',
      type: 'decision',
      label: 'Dossier complet ?',
      ownerRole: 'Gestionnaire Back-Office',
      position: { x: 400, y: 0 },
    },
    {
      id: 'node_relance',
      type: 'task',
      label: 'Demander les pièces complémentaires',
      ownerRole: 'Système de notification',
      position: { x: 600, y: -120 },
    },
    {
      id: 'node_dec_delai',
      type: 'decision',
      label: 'Pièces reçues sous 30 jours ?',
      ownerRole: 'Système automatique',
      position: { x: 800, y: -120 },
    },
    {
      id: 'node_cloture_caduc',
      type: 'task',
      label: 'Clôturer la demande pour forclusion',
      ownerRole: 'Gestionnaire Back-Office',
      position: { x: 1000, y: -120 },
    },
    {
      id: 'node_double_validation',
      type: 'task',
      label: 'Double validation hiérarchique',
      description: 'Revue humaine avec signature électronique OTP du manager',
      ownerRole: 'Responsable de Gestion (Manager)',
      application: 'Signature électronique OTP',
      position: { x: 600, y: 0 },
    },
    {
      id: 'node_end',
      type: 'end',
      label: 'Rachat exécuté',
      ownerRole: 'Opérations Financières',
      position: { x: 800, y: 0 },
    },
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'node_start', targetNodeId: 'node_check' },
    { id: 'e2', sourceNodeId: 'node_check', targetNodeId: 'node_dec' },
    { id: 'e3', sourceNodeId: 'node_dec', targetNodeId: 'node_double_validation', label: 'Conforme' },
    { id: 'e4', sourceNodeId: 'node_dec', targetNodeId: 'node_relance', label: 'Incomplet' },
    { id: 'e4b', sourceNodeId: 'node_relance', targetNodeId: 'node_dec_delai', label: 'Attente retour' },
    { id: 'e4_ok', sourceNodeId: 'node_dec_delai', targetNodeId: 'node_check', label: 'Pièces reçues dans les délais' },
    { id: 'e4_ko', sourceNodeId: 'node_dec_delai', targetNodeId: 'node_cloture_caduc', label: 'Délai expiré (> 30j)' },
    { id: 'e5', sourceNodeId: 'node_double_validation', targetNodeId: 'node_end' },
  ],
  businessRules: [],
};

describe('buildBpmn20Xml', () => {
  it('generates globally unique XML ids and valid references', () => {
    const xml = buildBpmn20Xml(sampleProcess);

    const idMatches = [...xml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    const uniqueIds = new Set(idMatches);
    expect(idMatches.length).toBe(uniqueIds.size);

    expect(xml).toContain('id="Collaboration_demo-rachat-partiel"');
    expect(xml).toContain('id="Participant_Ext_demo-rachat-partiel"');
    expect(xml).toContain('id="Participant_Org_demo-rachat-partiel"');
    expect(xml).toContain('id="Process_demo-rachat-partiel"');

    // Every ref must resolve to an existing id
    const refAttrs = ['sourceRef', 'targetRef', 'processRef', 'default', 'bpmnElement'];
    for (const attr of refAttrs) {
      const refs = [...xml.matchAll(new RegExp(`\\b${attr}="([^"]+)"`, 'g'))].map((m) => m[1]);
      for (const ref of refs) {
        expect(uniqueIds.has(ref), `Missing target id for ${attr}="${ref}"`).toBe(true);
      }
    }
  });

  it('keeps human manager OTP validation as bpmn:userTask and emits outbound messageFlow from sendTask', () => {
    const xml = buildBpmn20Xml(sampleProcess);

    expect(xml).toContain('<bpmn:userTask id="node_double_validation"');
    expect(xml).not.toContain('<bpmn:serviceTask id="node_double_validation"');

    expect(xml).toContain('<bpmn:sendTask id="node_relance"');
    expect(xml).toContain(
      'sourceRef="node_relance" targetRef="Participant_Ext_demo-rachat-partiel"'
    );

    // Event-Based Gateway + Timer (P30D) + Message Catch + Inbound MessageFlow
    expect(xml).toContain('<bpmn:eventBasedGateway id="node_dec_delai"');
    expect(xml).not.toMatch(/<bpmn:eventBasedGateway[^>]*default=/);
    expect(xml).toContain('<bpmn:intermediateCatchEvent id="Catch_e4_ok"');
    expect(xml).toContain('<bpmn:messageEventDefinition id="MsgCatchDef_Catch_e4_ok"');
    expect(xml).toContain(
      'sourceRef="Participant_Ext_demo-rachat-partiel" targetRef="Catch_e4_ok"'
    );
    expect(xml).toContain('<bpmn:intermediateCatchEvent id="Catch_e4_ko"');
    expect(xml).toContain('<bpmn:timeDuration xsi:type="bpmn:tFormalExpression">P30D</bpmn:timeDuration>');
  });
});
