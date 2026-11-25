import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProcessCompareModal } from './ProcessCompareModal';
import { Process, ProcessSummary } from '../../types/process';

const SUMMARIES: ProcessSummary[] = [
  {
    id: 'proc-tobe',
    name: 'Rachat partiel — TO-BE',
    domain: 'Épargne',
    modelState: 'to_be',
    version: '1.2.0',
    nodeCount: 4,
    edgeCount: 3,
    ruleCount: 2,
    updatedAt: '',
  },
  {
    id: 'proc-asis',
    name: 'Rachat partiel — AS-IS',
    domain: 'Épargne',
    modelState: 'as_is',
    version: '1.0.0',
    nodeCount: 3,
    edgeCount: 2,
    ruleCount: 1,
    updatedAt: '',
  },
];

const FULL_PROCESSES: Record<string, Process> = {
  'proc-asis': {
    id: 'proc-asis',
    name: 'Rachat partiel — AS-IS',
    domain: 'Épargne',
    description: '',
    modelState: 'as_is',
    version: '1.0.0',
    status: 'approved',
    nodes: [
      { id: 'a1', type: 'start', label: 'Réception courrier', position: { x: 0, y: 0 } },
      {
        id: 'a2',
        type: 'task',
        label: 'Tri courrier papier',
        position: { x: 100, y: 0 },
        ownerRole: 'Service Courrier',
        application: 'Boîte Courrier',
        estimatedDurationMinutes: 60,
        executionMode: 'manual',
      },
      { id: 'a3', type: 'end', label: 'Fin', position: { x: 200, y: 0 } },
    ],
    edges: [],
    businessRules: [
      {
        id: 'RG-DOC-01',
        title: 'Pièces justificatives',
        statement: 'Vérifier CNI et RIB.',
        category: 'data_quality',
        severity: 'high',
        sourceType: 'business_requirement',
        active: true,
      },
    ],
    requirements: [],
    testCases: [],
    createdAt: '',
    updatedAt: '',
  },
  'proc-tobe': {
    id: 'proc-tobe',
    name: 'Rachat partiel — TO-BE',
    domain: 'Épargne',
    description: '',
    modelState: 'to_be',
    version: '1.2.0',
    status: 'approved',
    nodes: [
      { id: 'b1', type: 'start', label: 'Portail client', position: { x: 0, y: 0 } },
      {
        id: 'b2',
        type: 'task',
        label: 'Contrôle automatisé GED',
        position: { x: 100, y: 0 },
        ownerRole: 'Gestionnaire Back-Office',
        application: 'GED Digitale',
        estimatedDurationMinutes: 15,
        executionMode: 'automated',
      },
      {
        id: 'b3',
        type: 'decision',
        label: 'Montant >= 50 000 € ?',
        position: { x: 200, y: 0 },
        ownerRole: 'Moteur Fiscal',
        application: 'Core Assurance',
        estimatedDurationMinutes: 5,
        executionMode: 'automated',
      },
      { id: 'b4', type: 'end', label: 'Fin', position: { x: 300, y: 0 } },
    ],
    edges: [],
    businessRules: [
      {
        id: 'RG-DOC-01',
        title: 'Pièces justificatives',
        statement: 'Vérifier CNI et RIB.',
        category: 'data_quality',
        severity: 'high',
        sourceType: 'business_requirement',
        active: true,
      },
      {
        id: 'RG-SEUIL-04',
        title: 'Double validation >= 50k€',
        statement: 'Validation hiérarchique requise.',
        category: 'compliance',
        severity: 'high',
        sourceType: 'regulatory',
        active: true,
      },
    ],
    requirements: [],
    testCases: [],
    createdAt: '',
    updatedAt: '',
  },
};

describe('ProcessCompareModal — Fenêtre flottante en lecture seule', () => {
  it('place AS-IS en Référence (A) et TO-BE en Cible (B), calcule les gains et affiche les diffs (Étapes, Règles, Acteurs & SI)', async () => {
    const loadProcess = vi.fn(async (id: string) => FULL_PROCESSES[id]);
    const onClose = vi.fn();

    render(
      <ProcessCompareModal
        isOpen={true}
        onClose={onClose}
        projectName="Demande de Rachat Partiel"
        processes={SUMMARIES}
        loadProcess={loadProcess}
      />
    );

    // Vérifie le chargement et les KPIs de synthèse (60m -> 20m = -67%, 0% -> 100% auto)
    await waitFor(() => {
      expect(screen.getByText('20m')).toBeInTheDocument();
    });
    expect(screen.getByText('-67%')).toBeInTheDocument();
    expect(screen.getByText('+100 pts')).toBeInTheDocument();
    expect(screen.getByText('Lecture seule')).toBeInTheDocument();

    // Onglet Étapes
    fireEvent.click(screen.getByRole('button', { name: /Étapes/i }));
    expect(screen.getByText('+ Contrôle automatisé GED')).toBeInTheDocument();
    expect(screen.getByText('− Tri courrier papier')).toBeInTheDocument();

    // Onglet Règles RG
    fireEvent.click(screen.getByRole('button', { name: /Règles RG/i }));
    expect(screen.getByText('RG-SEUIL-04')).toBeInTheDocument();
    expect(screen.getByText('Double validation >= 50k€')).toBeInTheDocument();

    // Onglet Acteurs & SI
    fireEvent.click(screen.getByRole('button', { name: /Acteurs & SI/i }));
    expect(screen.getByText('+ GED Digitale')).toBeInTheDocument();
    expect(screen.getByText('− Boîte Courrier')).toBeInTheDocument();

    // Export Excel (.xls multi-onglets)
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-excel');
    const revokeObjectUrlSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: /Exporter Excel/i }));
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    const exportedBlob = createObjectUrlSpy.mock.calls[0][0] as Blob;
    expect(exportedBlob.type).toContain('application/vnd.ms-excel');
    expect(exportedBlob.size).toBeGreaterThan(500);

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    clickSpy.mockRestore();

    // Fermeture via Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
