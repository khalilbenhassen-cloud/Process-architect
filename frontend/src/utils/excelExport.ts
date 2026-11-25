import { Process } from '../types/process';
import { formatDuration } from './durationFormat';

function sanitizeFormula(val: string): string {
  const s = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

function escapeXml(val: string): string {
  return sanitizeFormula(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildWorksheetXml(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  colWidths?: number[]
): string {
  const safeName = sheetName.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31);
  const colsXml = (colWidths || headers.map(() => 140))
    .map((w) => `<Column ss:AutoFitWidth="0" ss:Width="${w}"/>`)
    .join('');

  const headerRowXml =
    `<Row ss:Height="24">` +
    headers
      .map(
        (h) =>
          `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
      )
      .join('') +
    `</Row>`;

  const dataRowsXml = rows
    .map((row, rIdx) => {
      const styleId = rIdx % 2 === 1 ? 'AltRow' : 'DefaultCell';
      const cells = row
        .map((cell) => {
          if (typeof cell === 'number' && Number.isFinite(cell)) {
            return `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${cell}</Data></Cell>`;
          }
          return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(
            String(cell ?? '')
          )}</Data></Cell>`;
        })
        .join('');
      return `<Row ss:Height="20">${cells}</Row>`;
    })
    .join('');

  return `<Worksheet ss:Name="${escapeXml(safeName)}"><Table>${colsXml}${headerRowXml}${dataRowsXml}</Table></Worksheet>`;
}

const NODE_TYPE_LABELS: Record<string, string> = {
  start: 'Début',
  task: 'Tâche',
  decision: 'Décision',
  data: 'Données',
  subprocess: 'Sous-processus',
  end: 'Fin',
};

/**
 * Génère et télécharge un classeur Excel multi-onglets (SpreadsheetML .xls)
 * contenant : Synthèse, Étapes, Flux & Décisions, et Règles de gestion.
 */
export function downloadProcessExcelWorkbook(process: Process): void {
  const nodes = process.nodes || [];
  const edges = process.edges || [];
  const rules = process.businessRules || [];

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const totalMinutes = nodes.reduce(
    (sum, n) => sum + (n.estimatedDurationMinutes || 0),
    0
  );

  // 1. Onglet Synthèse
  const summaryRows: (string | number)[][] = [
    ['Nom du processus', process.name || 'Sans nom'],
    ['Responsable', process.owner || 'Non renseigné'],
    ['Phase', process.modelState === 'to_be' ? 'TO-BE (Cible)' : 'AS-IS (Existant)'],
    ['Statut', process.lifecycleState || 'draft'],
    ['Version', `v${process.version || 1}`],
    ['Description', process.description || '—'],
    ["Nombre d'étapes", nodes.length],
    ['Nombre de liaisons', edges.length],
    ['Nombre de règles métier (RG)', rules.length],
    ['Durée totale estimée', formatDuration(totalMinutes)],
    ['Durée totale (minutes)', totalMinutes],
  ];

  // 2. Onglet Étapes
  const orderedNodes = [
    ...nodes.filter((n) => n.type === 'start'),
    ...nodes.filter((n) => n.type !== 'start' && n.type !== 'end'),
    ...nodes.filter((n) => n.type === 'end'),
  ];

  const stepRows: (string | number)[][] = orderedNodes.map((n, idx) => [
    idx + 1,
    n.label || '',
    NODE_TYPE_LABELS[n.type] || n.type,
    n.ownerRole || '—',
    n.type === 'start' || n.type === 'end'
      ? '—'
      : formatDuration(n.estimatedDurationMinutes),
    n.estimatedDurationMinutes || 0,
    n.executionMode === 'automated' ? 'Automatisé' : 'Manuel',
    n.application || '—',
    (n.ruleIds || []).join(', ') || '—',
    n.description || '—',
  ]);

  // 3. Onglet Flux & Décisions
  const edgeRows: (string | number)[][] = edges.map((e, idx) => [
    idx + 1,
    nodeById.get(e.sourceNodeId)?.label || e.sourceNodeId,
    nodeById.get(e.targetNodeId)?.label || e.targetNodeId,
    e.label || 'Flux standard',
  ]);

  // 4. Onglet Règles de gestion
  const ruleRows: (string | number)[][] = rules.map((r) => {
    const linkedSteps = nodes
      .filter((n) => (n.ruleIds || []).includes(r.id))
      .map((n) => n.label)
      .join(' ; ');
    return [
      r.id,
      r.title || '',
      r.category || '',
      r.severity || '',
      r.statement || '',
      r.sourceNote || '—',
      linkedSteps || 'Non rattachée',
    ];
  });

  const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
      <Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
    <Style ss:ID="DefaultCell">
      <Font ss:Size="10" ss:Color="#1E293B"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
    <Style ss:ID="AltRow">
      <Font ss:Size="10" ss:Color="#1E293B"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
  </Styles>
  ${buildWorksheetXml('Synthèse', ['Indicateur', 'Valeur'], summaryRows, [200, 380])}
  ${buildWorksheetXml(
    'Étapes',
    [
      'N°',
      "Nom de l'étape",
      'Type',
      'Responsable',
      'Durée',
      'Durée (min)',
      'Mode',
      'Application SI',
      'Règles (RG)',
      'Description',
    ],
    stepRows,
    [40, 240, 95, 165, 85, 85, 95, 150, 120, 280]
  )}
  ${buildWorksheetXml(
    'Flux & Décisions',
    ['N°', 'Étape source', 'Étape cible', 'Condition / Libellé'],
    edgeRows,
    [40, 240, 240, 200]
  )}
  ${buildWorksheetXml(
    'Règles métier',
    [
      'Code RG',
      'Intitulé',
      'Catégorie',
      'Criticité',
      'Description',
      'Source',
      'Étapes rattachées',
    ],
    ruleRows,
    [95, 220, 120, 95, 320, 160, 240]
  )}
</Workbook>`;

  const safeSlug = (process.name || 'processus')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  const blob = new Blob([workbookXml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeSlug || 'processus'}_v${process.version || 1}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
