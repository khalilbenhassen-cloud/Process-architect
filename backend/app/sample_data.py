"""Fictional demonstration processes for Process Architect.

Scenario: Demande de rachat partiel sur contrat d'épargne retraite fictif (cible TO-BE & historique AS-IS).
Disclaimer: All entities, numbers, amounts, and rules are strictly fictional for MOA / Business Analysis demonstration.
"""
from datetime import datetime, timedelta, timezone

from app.models import (
    BusinessRuleModel,
    EdgeModel,
    ExecutionMode,
    LifecycleState,
    ModelState,
    NodeModel,
    NodeType,
    Position,
    ProcessModel,
    RequirementModel,
    RuleCategory,
    SeverityLevel,
    SourceType,
    TestCaseModel,
)

_NOW = datetime.now(timezone.utc)
_AS_IS_TS = (_NOW - timedelta(days=5)).isoformat()
_TO_BE_CREATED_TS = (_NOW - timedelta(days=2)).isoformat()
_TO_BE_UPDATED_TS = _NOW.isoformat()

# ============================================================================
# 1. PROCESSUS CIBLE (TO-BE) — Demande de rachat partiel (Référence Principale)
# ============================================================================

DEMO_PROCESS = ProcessModel(
    id="demo-rachat-partiel",
    name="Demande de rachat partiel — Épargne Retraite (Démo Fictive)",
    description=(
        "Processus cible (TO-BE) de traitement de bout en bout d'une demande de déblocage / rachat partiel "
        "sur contrat d'épargne retraite fictif. Intègre le dépôt numérique en GED, le contrôle documentaire et LCB-FT, "
        "la relance automatisée avec délai de forclusion de 30 jours, l'audit d'éligibilité et de non-nantissement, "
        "le calcul fiscal automatisé, la double signature hiérarchique dès 50 000 € nets et l'ordonnancement SEPA ISO 20022."
    ),
    projectId="proj-default-01",
    categoryId="cat-transformation",
    tags=["prioritaire", "automatisation", "conformite-lcbft"],
    lifecycleState=LifecycleState.APPROVED,
    modelState=ModelState.TO_BE,
    version="1.2.0",
    owner="Direction MOA & Gestion Épargne",
    createdAt=_TO_BE_CREATED_TS,
    updatedAt=_TO_BE_UPDATED_TS,
    businessRules=[
        BusinessRuleModel(
            id="RG-DOC-01",
            title="Complétude et conformité des pièces justificatives",
            statement=(
                "Toute demande de rachat partiel doit comporter un formulaire daté et signé, une pièce d'identité officielle "
                "en cours de validité (CNI ou Passeport) et un RIB SEPA au nom et prénom exclusifs du titulaire du contrat."
            ),
            category=RuleCategory.DATA_QUALITY,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Spécification fonctionnelle MOA — Référentiel GED",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-FORC-02",
            title="Délai de relance et forclusion à 30 jours calendaires",
            statement=(
                "En cas de dossier incomplet ou non conforme, l'adhérent est notifié sous 24h et dispose d'un délai strict "
                "de 30 jours calendaires pour transmettre les pièces manquantes ; au-delà, la demande est clôturée sans suite pour caducité."
            ),
            category=RuleCategory.TIMING,
            severity=SeverityLevel.MEDIUM,
            sourceType=SourceType.FICTIONAL_ASSUMPTION,
            sourceNote="Conditions générales fictives — Gestion des délais",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-ELIG-03",
            title="Conditions d'éligibilité et libre disponibilité du contrat",
            statement=(
                "Le contrat doit présenter une antériorité minimale de 8 ans révolus, un solde épargne suffisant "
                "et ne faire l'objet d'aucun nantissement bancaire, gage, saisie conservatoire ou opposition judiciaire."
            ),
            category=RuleCategory.ELIGIBILITY,
            severity=SeverityLevel.CRITICAL,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Règle métier Core Assurance Vie (fictive)",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-SEUIL-04",
            title="Double validation hiérarchique au-delà de 50 000 € nets",
            statement=(
                "Tout décaissement d'un montant net à verser supérieur ou égal à 50 000,00 € requiert obligatoirement "
                "le visa électronique conjoint d'un Responsable d'Unité de Gestion (signature OTP qualifiée) avant ordonnancement."
            ),
            category=RuleCategory.APPROVAL,
            severity=SeverityLevel.CRITICAL,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Matrice interne de délégation financière (démo)",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-FISC-05",
            title="Calcul de la quote-part imposable et prélèvements sociaux",
            statement=(
                "La part de plus-values rachetée, le prélèvement forfaitaire libératoire ou barème et les prélèvements sociaux "
                "sont liquidés automatiquement par le moteur actuariel selon l'antériorité fiscale du contrat."
            ),
            category=RuleCategory.ELIGIBILITY,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Spécification d'intégration Moteur Actuariel & Fiscal",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-LCBFT-06",
            title="Vigilance LCB-FT et contrôle de concordance IBAN SEPA",
            statement=(
                "Aucun virement ne peut être émis vers un compte tiers ou hors zone SEPA non vérifié ; tout dossier présentant "
                "une incohérence titulaire/IBAN ou un montant >= 50 000 € fait l'objet d'un contrôle de vigilance tracé."
            ),
            category=RuleCategory.SECURITY,
            severity=SeverityLevel.CRITICAL,
            sourceType=SourceType.FICTIONAL_ASSUMPTION,
            sourceNote="Procédure fictive de contrôle interne & conformité",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-TRAC-07",
            title="Piste d'audit horodatée et notification réglementaire adhérent",
            statement=(
                "Chaque décision finale (exécution du virement SEPA, rejet motivé ou clôture pour forclusion) génère "
                "un avis horodaté archivé en GED probante et une piste d'audit inaltérable."
            ),
            category=RuleCategory.SECURITY,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Exigence transversale d'auditabilité SI",
            active=True,
        ),
    ],
    requirements=[
        RequirementModel(
            id="EX-MOA-01",
            title="Automatisation de la détection d'incomplétude et des relances",
            description=(
                "Le système vérifie les métadonnées documentaires en GED, notifie immédiatement l'adhérent par email/SMS "
                "et pilote automatiquement l'échéancier de forclusion à 30 jours calendaires."
            ),
            ruleIds=["RG-DOC-01", "RG-FORC-02"],
        ),
        RequirementModel(
            id="EX-MOA-02",
            title="Contrôle systématique d'éligibilité et des sûretés contractuelles",
            description=(
                "Interrogation du Core Assurance Vie et du registre des oppositions/nantissements avant toute liquidation financière."
            ),
            ruleIds=["RG-ELIG-03"],
        ),
        RequirementModel(
            id="EX-MOA-03",
            title="Liquidation automatisée de la fiscalité et du montant net",
            description=(
                "Calcul déterministe sans ressaisie manuelle de l'assiette imposable, des prélèvements et du net à payer."
            ),
            ruleIds=["RG-FISC-05"],
        ),
        RequirementModel(
            id="EX-MOA-04",
            title="Sécurisation des paiements à fort enjeu et vigilance LCB-FT",
            description=(
                "Workflow de double validation managériale électronique dès 50 000 € nets et contrôle strict de concordance titulaire/IBAN."
            ),
            ruleIds=["RG-SEUIL-04", "RG-LCBFT-06"],
        ),
        RequirementModel(
            id="EX-MOA-05",
            title="Traçabilité de bout en bout et archivage probant des issues",
            description=(
                "Journalisation complète des décisions, rejets motivés, clôtures de forclusion et ordres SEPA ISO 20022."
            ),
            ruleIds=["RG-TRAC-07"],
        ),
    ],
    nodes=[
        NodeModel(
            id="node_start",
            type=NodeType.START,
            label="Réception de la demande de rachat",
            position=Position(x=60, y=315),
            description=(
                "Réception de la demande de rachat partiel saisie sur l'Espace Adhérent sécurisé "
                "ou issue de la numérisation courrier indexée automatiquement en GED."
            ),
            ownerRole="Adhérent",
            application="Portail Web Client",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=[
                "Formulaire de rachat partiel signé",
                "Pièce d'identité officielle (CNI / Passeport)",
                "RIB SEPA au nom du titulaire",
            ],
            outputs=[
                "Numéro unique de dossier rachat",
                "Accusé d'enregistrement horodaté GED",
            ],
        ),
        NodeModel(
            id="node_controle_pieces",
            type=NodeType.TASK,
            label="Contrôler la complétude des pièces",
            position=Position(x=300, y=300),
            description=(
                "Vérification de la présence et de la lisibilité des justificatifs, contrôle de la date de validité "
                "de la CNI/Passeport et concordance stricte entre l'identité du titulaire et l'IBAN/RIB fourni."
            ),
            ownerRole="Gestionnaire Back-Office",
            application="Outil de Gestion GED",
            estimatedDurationMinutes=15,
            executionMode=ExecutionMode.MANUAL,
            inputs=[
                "Numéro unique de dossier rachat",
                "Pièce d'identité officielle (CNI / Passeport)",
                "RIB SEPA au nom du titulaire",
            ],
            outputs=[
                "Rapport de contrôle documentaire",
                "Statut de concordance titulaire / IBAN",
            ],
            controls=[
                "Contrôle validité CNI / Passeport",
                "Vérification concordance nom titulaire / RIB SEPA",
                "Contrôle signature de la demande",
            ],
            ruleIds=["RG-DOC-01", "RG-LCBFT-06"],
        ),
        NodeModel(
            id="node_dec_complet",
            type=NodeType.DECISION,
            label="Dossier complet et pièces conformes ?",
            position=Position(x=600, y=300),
            description=(
                "Aiguillage du dossier : poursuite vers l'étude d'éligibilité si toutes les pièces sont conformes, "
                "ou déclenchement du cycle de relance documentaire en cas de pièce manquante ou invalide."
            ),
            ownerRole="Gestionnaire Back-Office",
            application="Outil de Gestion GED",
            estimatedDurationMinutes=2,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Rapport de contrôle documentaire"],
            outputs=["Décision de complétude (Complet et conforme / Incomplet)"],
            controls=["Validation check-list documentaire obligatoire"],
            ruleIds=["RG-DOC-01"],
        ),
        NodeModel(
            id="node_relance_pieces",
            type=NodeType.TASK,
            label="Demander les pièces complémentaires",
            position=Position(x=760, y=82),
            description=(
                "Émission automatique d'un email, d'un SMS et d'une notification dans l'Espace Adhérent listant "
                "précisément les pièces à fournir et armant le compteur réglementaire de 30 jours calendaires."
            ),
            ownerRole="Système de notification",
            application="Hub Notification / CRM",
            estimatedDurationMinutes=5,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Motif d'incomplétude", "Liste des pièces justificatives attendues"],
            outputs=[
                "Notification de relance adhérent envoyée",
                "Échéancier de forclusion J+30 activé",
            ],
            controls=["Horodatage de l'accusé d'envoi multicanal"],
            ruleIds=["RG-FORC-02"],
        ),
        NodeModel(
            id="node_dec_delai",
            type=NodeType.DECISION,
            label="Pièces reçues sous 30 jours ?",
            position=Position(x=1060, y=82),
            description=(
                "Surveillance quotidienne automatisée des flux GED entrants jusqu'à l'échéance de 30 jours calendaires "
                "suivant l'envoi de la demande de pièces complémentaires."
            ),
            ownerRole="Système automatique",
            application="Batch Quotidien Forclusion",
            estimatedDurationMinutes=1,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Échéancier de forclusion J+30 activé", "Flux entrant GED adhérent"],
            outputs=["Constat d'échéance (Pièces reçues / Délai expiré)"],
            controls=["Calcul quotidien d'antériorité calendaire J+30"],
            ruleIds=["RG-FORC-02"],
        ),
        NodeModel(
            id="node_cloture_caduc",
            type=NodeType.TASK,
            label="Clôturer la demande pour forclusion",
            position=Position(x=1380, y=82),
            description=(
                "Clôture administrative sans suite du dossier après dépassement du délai de 30 jours calendaires, "
                "génération et archivage de l'avis de caducité adressé à l'adhérent."
            ),
            ownerRole="Gestionnaire Back-Office",
            application="Outil de Gestion GED",
            estimatedDurationMinutes=10,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Constat d'expiration du délai de 30 jours"],
            outputs=[
                "Courrier de clôture pour caducité",
                "Dossier archivé sans suite en GED",
            ],
            controls=["Vérification d'absence de pli numérisé en instance d'indexation"],
            ruleIds=["RG-FORC-02", "RG-TRAC-07"],
        ),
        NodeModel(
            id="node_verif_eligibilite",
            type=NodeType.TASK,
            label="Vérifier éligibilité et nantissement",
            position=Position(x=936, y=300),
            description=(
                "Contrôle contractuel dans le Core Assurance Vie : vérification de l'ancienneté du contrat (>= 8 ans), "
                "de la provision mathématique disponible et de l'absence de nantissement, gage ou opposition judiciaire."
            ),
            ownerRole="Gestionnaire Sinistres & Épargne",
            application="Core Assurance Vie",
            estimatedDurationMinutes=20,
            executionMode=ExecutionMode.MANUAL,
            inputs=[
                "Numéro unique de dossier rachat",
                "Situation contractuelle et historique d'adhésion",
            ],
            outputs=["Certificat d'éligibilité et de libre disponibilité"],
            controls=[
                "Contrôle antériorité contractuelle >= 8 ans",
                "Interrogation du registre des gages, nantissements et saisies",
            ],
            ruleIds=["RG-ELIG-03"],
        ),
        NodeModel(
            id="node_dec_eligible",
            type=NodeType.DECISION,
            label="Éligibilité validée sans opposition ?",
            position=Position(x=1236, y=300),
            description=(
                "Décision d'éligibilité : autorise le passage au calcul actuariel et fiscal ou oriente le dossier "
                "vers une notification formelle de rejet motivé."
            ),
            ownerRole="Gestionnaire Sinistres & Épargne",
            application="Core Assurance Vie",
            estimatedDurationMinutes=3,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Certificat d'éligibilité et de libre disponibilité"],
            outputs=["Décision contractuelle (Éligible sans opposition / Rejet)"],
            controls=["Validation conformité juridique et contractuelle"],
            ruleIds=["RG-ELIG-03"],
        ),
        NodeModel(
            id="node_rejet_motif",
            type=NodeType.TASK,
            label="Notifier le rejet motivé à l'adhérent",
            position=Position(x=1396, y=518),
            description=(
                "Édition et expédition d'un courrier recommandé électronique exposant le motif contractuel ou juridique "
                "du refus (antériorité insuffisante, contrat nanti ou opposition) ainsi que les voies de recours."
            ),
            ownerRole="Gestionnaire Back-Office",
            application="Outil d'Éditique & Courrier",
            estimatedDurationMinutes=15,
            executionMode=ExecutionMode.MIXED,
            inputs=["Motif contractuel ou juridique de refus"],
            outputs=[
                "Lettre de rejet motivé transmise",
                "Preuve de dépôt et archivage GED",
            ],
            controls=["Relecture du motif réglementaire avant émission"],
            ruleIds=["RG-ELIG-03", "RG-TRAC-07"],
        ),
        NodeModel(
            id="node_calcul_fiscal",
            type=NodeType.TASK,
            label="Calculer montant net et fiscalité",
            position=Position(x=1556, y=300),
            description=(
                "Liquidation automatisée de la part de capital et de plus-values imposables, application des barèmes "
                "fiscaux et prélèvements sociaux en vigueur, et détermination du montant net à décaisser."
            ),
            ownerRole="Moteur de calcul fiscal",
            application="Moteur Actuariel & Fiscal",
            estimatedDurationMinutes=5,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=[
                "Montant brut de rachat demandé",
                "Historique des versements et antériorité fiscale",
            ],
            outputs=[
                "Note de décompte fiscal et social détaillé",
                "Montant net exact à verser (€)",
            ],
            controls=[
                "Contrôle automatique de cohérence brut / prélèvements / net",
                "Vérification du barème fiscal applicable",
            ],
            ruleIds=["RG-FISC-05"],
        ),
        NodeModel(
            id="node_dec_seuil",
            type=NodeType.DECISION,
            label="Montant net >= 50 000 € ?",
            position=Position(x=1856, y=300),
            description=(
                "Contrôle automatique du seuil de délégation financière : passage direct en paiement sous 50 000 € nets, "
                "ou routage obligatoire vers le parapheur managérial à partir de 50 000 € nets."
            ),
            ownerRole="Moteur de calcul fiscal",
            application="Moteur Actuariel & Fiscal",
            estimatedDurationMinutes=1,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Montant net exact à verser (€)"],
            outputs=["Orientation délégation (< 50 000 € / >= 50 000 €)"],
            controls=["Test automatique du seuil critique de 50 000,00 €"],
            ruleIds=["RG-SEUIL-04"],
        ),
        NodeModel(
            id="node_double_validation",
            type=NodeType.TASK,
            label="Double validation hiérarchique",
            position=Position(x=2016, y=518),
            description=(
                "Revue approfondie du dossier à fort enjeu financier (contrôle LCB-FT et pièces) et apposition "
                "de la signature électronique conjointe OTP par le Responsable d'Unité de Gestion."
            ),
            ownerRole="Responsable de Gestion (Manager)",
            application="Parapheur Électronique",
            estimatedDurationMinutes=30,
            executionMode=ExecutionMode.MANUAL,
            taskKind="user",
            inputs=[
                "Dossier complet vérifié",
                "Note de décompte fiscal et social détaillé",
                "Montant net >= 50 000 €",
            ],
            outputs=["Visa managérial signé électroniquement (OTP)"],
            controls=[
                "Authentification forte OTP du signataire habilité",
                "Revue de vigilance LCB-FT sur décaissement élevé",
            ],
            ruleIds=["RG-SEUIL-04", "RG-LCBFT-06"],
        ),
        NodeModel(
            id="node_dec_validation",
            type=NodeType.DECISION,
            label="Visa hiérarchique accordé ?",
            position=Position(x=2336, y=518),
            description="Décision du Responsable de Gestion à l'issue de la revue de vigilance LCB-FT et de conformité.",
            ownerRole="Responsable de Gestion (Manager)",
            application="Parapheur Électronique",
            estimatedDurationMinutes=1,
            executionMode=ExecutionMode.MANUAL,
            gatewayKind="xor",
            inputs=["Avis managérial OTP"],
            outputs=["Visa accordé / Visa refusé"],
            controls=["Traçabilité de la décision managériale"],
            ruleIds=["RG-SEUIL-04", "RG-LCBFT-06"],
        ),
        NodeModel(
            id="node_ordonnancement",
            type=NodeType.TASK,
            label="Ordonnancer virement SEPA & émettre avis",
            position=Position(x=2656, y=300),
            description=(
                "Génération du fichier d'ordre de virement SEPA XML ISO 20022, transmission sécurisée à la trésorerie, "
                "mise à disposition de l'avis d'opération fiscalisé et journalisation de la piste d'audit."
            ),
            ownerRole="Opérations Bancaires / Trésorerie",
            application="Passerelle SEPA Trésorerie",
            estimatedDurationMinutes=10,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=[
                "RIB SEPA au nom du titulaire",
                "Montant net exact à verser (€)",
                "Autorisation de règlement validée",
            ],
            outputs=[
                "Ordre de virement SEPA ISO 20022 exécuté",
                "Avis d'opération et justificatif fiscal adhérent",
                "Journal d'audit horodaté",
            ],
            controls=[
                "Contrôle d'intégrité et scellement du flux ISO 20022",
                "Vérification finale anti-doublon de paiement",
            ],
            ruleIds=["RG-SEUIL-04", "RG-LCBFT-06", "RG-TRAC-07"],
        ),
        NodeModel(
            id="node_end_caduc",
            type=NodeType.END,
            label="Demande caduque sans suite",
            position=Position(x=1680, y=97),
            description="Processus clôturé sans décaissement suite à l'expiration du délai de forclusion de 30 jours.",
            ownerRole="Système",
            application="Outil de Gestion GED",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Courrier de clôture pour caducité"],
            outputs=["Statut dossier : Clôturé caduc"],
        ),
        NodeModel(
            id="node_end_rejet",
            type=NodeType.END,
            label="Demande rejetée avec motif",
            position=Position(x=1696, y=533),
            description="Processus clôturé sans décaissement suite à une non-éligibilité contractuelle ou une opposition.",
            ownerRole="Système",
            application="Core Assurance Vie",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Lettre de rejet motivé transmise"],
            outputs=["Statut dossier : Rejeté motivé"],
        ),
        NodeModel(
            id="node_end_succes",
            type=NodeType.END,
            label="Rachat exécuté et fonds virés",
            position=Position(x=2956, y=315),
            description=(
                "Processus terminé avec succès : virement SEPA exécuté au profit du titulaire, contrat mis à jour "
                "et avis d'opération archivé sur l'Espace Adhérent."
            ),
            ownerRole="Système de trésorerie",
            application="Passerelle SEPA Trésorerie",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Ordre de virement SEPA ISO 20022 exécuté"],
            outputs=["Statut dossier : Payé & clôturé"],
        ),
    ],
    edges=[
        EdgeModel(
            id="e_01",
            sourceNodeId="node_start",
            targetNodeId="node_controle_pieces",
            label="Dépôt enregistré",
        ),
        EdgeModel(
            id="e_02",
            sourceNodeId="node_controle_pieces",
            targetNodeId="node_dec_complet",
            label="Contrôle effectué",
        ),
        # Decision 1: Nominal branch FIRST so 1-click presets & table builder resolve nominal vs exception cleanly
        EdgeModel(
            id="e_03",
            sourceNodeId="node_dec_complet",
            targetNodeId="node_verif_eligibilite",
            label="Complet et conforme",
            condition="CNI/Passeport valide ET RIB SEPA au nom exclusif du titulaire",
            isDefault=True,
        ),
        EdgeModel(
            id="e_04",
            sourceNodeId="node_dec_complet",
            targetNodeId="node_relance_pieces",
            label="Incomplet",
            condition="Pièce manquante, illisible, expirée ou incohérence RIB",
        ),
        EdgeModel(
            id="e_05",
            sourceNodeId="node_relance_pieces",
            targetNodeId="node_dec_delai",
            label="Attente retour",
        ),
        # Decision 2: Nominal regularization FIRST, foreclosure expiration SECOND
        EdgeModel(
            id="e_06",
            sourceNodeId="node_dec_delai",
            targetNodeId="node_controle_pieces",
            label="Pièces reçues dans les délais",
            condition="Réception des justificatifs en GED <= 30 jours calendaires",
            isDefault=True,
        ),
        EdgeModel(
            id="e_07",
            sourceNodeId="node_dec_delai",
            targetNodeId="node_cloture_caduc",
            label="Délai expiré (> 30j)",
            condition="Aucune régularisation reçue après 30 jours calendaires",
        ),
        EdgeModel(
            id="e_08",
            sourceNodeId="node_cloture_caduc",
            targetNodeId="node_end_caduc",
            label="Clôture actée",
        ),
        EdgeModel(
            id="e_09",
            sourceNodeId="node_verif_eligibilite",
            targetNodeId="node_dec_eligible",
            label="Audit réalisé",
        ),
        # Decision 3: Nominal eligible FIRST, rejection SECOND
        EdgeModel(
            id="e_10",
            sourceNodeId="node_dec_eligible",
            targetNodeId="node_calcul_fiscal",
            label="Éligible sans opposition",
            condition="Contrat >= 8 ans ET absence de nantissement, gage ou opposition",
            isDefault=True,
        ),
        EdgeModel(
            id="e_11",
            sourceNodeId="node_dec_eligible",
            targetNodeId="node_rejet_motif",
            label="Inéligible ou opposition",
            condition="Antériorité < 8 ans OU contrat nanti / frappé d'opposition",
        ),
        EdgeModel(
            id="e_12",
            sourceNodeId="node_rejet_motif",
            targetNodeId="node_end_rejet",
            label="Notification transmise",
        ),
        EdgeModel(
            id="e_13",
            sourceNodeId="node_calcul_fiscal",
            targetNodeId="node_dec_seuil",
            label="Montant calculé",
        ),
        # Decision 4: Nominal standard amount (< 50k€) FIRST, high-stake escalation (>= 50k€) SECOND
        EdgeModel(
            id="e_14",
            sourceNodeId="node_dec_seuil",
            targetNodeId="node_ordonnancement",
            label="Inférieur à 50 000 €",
            condition="Montant net à verser < 50 000,00 €",
            isDefault=True,
        ),
        EdgeModel(
            id="e_15",
            sourceNodeId="node_dec_seuil",
            targetNodeId="node_double_validation",
            label="Supérieur ou égal à 50 000 €",
            condition="Montant net à verser >= 50 000,00 €",
        ),
        EdgeModel(
            id="e_16",
            sourceNodeId="node_double_validation",
            targetNodeId="node_dec_validation",
            label="Revue terminée",
        ),
        EdgeModel(
            id="e_16_ok",
            sourceNodeId="node_dec_validation",
            targetNodeId="node_ordonnancement",
            label="Visa accordé",
            condition="Visa hiérarchique OTP approuvé",
            isDefault=True,
        ),
        EdgeModel(
            id="e_16_ko",
            sourceNodeId="node_dec_validation",
            targetNodeId="node_rejet_motif",
            label="Visa refusé",
            condition="Alerte LCB-FT ou refus motivé du Responsable",
        ),
        EdgeModel(
            id="e_17",
            sourceNodeId="node_ordonnancement",
            targetNodeId="node_end_succes",
            label="Virement exécuté",
        ),
    ],
    testCases=[
        TestCaseModel(
            id="TC-RACH-01",
            title="Parcours nominal standard (< 50 000 €) — Règlement SEPA direct",
            objective=(
                "Vérifier qu'une demande complète sur un contrat éligible (>= 8 ans, non nanti) pour un montant net "
                "de 18 500 € aboutit directement au virement SEPA sans double validation managériale."
            ),
            preconditions=[
                "Contrat actif depuis 10 ans sans nantissement ni opposition",
                "CNI valide et RIB SEPA au nom exclusif de l'adhérent déposés en GED",
                "Montant net après fiscalité estimé à 18 500,00 € (< 50 000 €)",
            ],
            steps=[
                "1. Enregistrer la demande sur le Portail Web Client (node_start).",
                "2. Valider le contrôle documentaire et choisir 'Complet et conforme' (node_dec_complet).",
                "3. Confirmer l'éligibilité contractuelle et choisir 'Éligible sans opposition' (node_dec_eligible).",
                "4. Exécuter le calcul fiscal automatique et vérifier l'orientation 'Inférieur à 50 000 €' (node_dec_seuil).",
                "5. Vérifier l'émission de l'ordre SEPA ISO 20022 et l'atteinte de 'Fin — Rachat exécuté et fonds virés'.",
            ],
            expectedResult=(
                "Le dossier traverse le flux nominal en 56 minutes cumulées, génère l'ordre SEPA ISO 20022 "
                "et se termine à l'état 'node_end_succes' avec avis d'opération archivé."
            ),
            priority=SeverityLevel.CRITICAL,
            sourceNodeIds=[
                "node_controle_pieces",
                "node_dec_complet",
                "node_verif_eligibilite",
                "node_dec_eligible",
                "node_calcul_fiscal",
                "node_dec_seuil",
                "node_ordonnancement",
                "node_end_succes",
            ],
            ruleIds=["RG-DOC-01", "RG-ELIG-03", "RG-FISC-05", "RG-LCBFT-06", "RG-TRAC-07"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-02",
            title="Parcours montant élevé (>= 50 000 €) — Double signature hiérarchique OTP",
            objective=(
                "S'assurer que tout rachat partiel dont le net à payer atteint ou dépasse 50 000 € est routé "
                "vers le parapheur électronique du Responsable d'Unité avant l'ordonnancement SEPA."
            ),
            preconditions=[
                "Dossier complet et contrat éligible sans sûreté",
                "Montant net liquidé à 64 200,00 € (>= 50 000 €)",
                "Responsable de Gestion habilité sur le Parapheur Électronique",
            ],
            steps=[
                "1. Exécuter les étapes nominales jusqu'au calcul fiscal (node_calcul_fiscal).",
                "2. Vérifier que la décision 'node_dec_seuil' sélectionne 'Supérieur ou égal à 50 000 €'.",
                "3. Signer électroniquement le visa managérial OTP sur 'node_double_validation'.",
                "4. Vérifier le déclenchement de 'node_ordonnancement' puis l'arrivée sur 'node_end_succes'.",
            ],
            expectedResult=(
                "Aucun virement n'est émis tant que le visa OTP manager n'est pas accordé ; après signature, "
                "le virement SEPA est exécuté avec trace des deux valideurs (durée cumulée : 86 min)."
            ),
            priority=SeverityLevel.CRITICAL,
            sourceNodeIds=["node_dec_seuil", "node_double_validation", "node_ordonnancement", "node_end_succes"],
            ruleIds=["RG-SEUIL-04", "RG-LCBFT-06", "RG-TRAC-07"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-03",
            title="Cas limite exact à 50 000,00 € nets — Déclenchement inclusif du seuil",
            objective="Vérifier l'opérateur inclusif (>= 50 000,00 €) de la règle critique RG-SEUIL-04.",
            preconditions=[
                "Dossier complet et éligible",
                "Décompte fiscal produisant exactement 50 000,00 € nets à verser",
            ],
            steps=[
                "1. Soumettre le montant brut donnant un net exact de 50 000,00 € à 'node_calcul_fiscal'.",
                "2. Observer l'orientation automatique à 'node_dec_seuil'.",
            ],
            expectedResult="Le dossier est impérativement orienté vers 'Double validation hiérarchique' (node_double_validation).",
            priority=SeverityLevel.HIGH,
            sourceNodeIds=["node_calcul_fiscal", "node_dec_seuil", "node_double_validation"],
            ruleIds=["RG-SEUIL-04"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-04",
            title="Dossier incomplet régularisé à J+12 — Boucle de relance conforme",
            objective=(
                "Valider l'envoi automatique de la relance documentaire et la reprise du contrôle "
                "lorsque l'adhérent transmet la pièce manquante avant l'échéance de 30 jours."
            ),
            preconditions=[
                "Demande déposée sans pièce d'identité lisible",
                "Adhérent transmettant sa CNI valide à J+12 sur l'Espace Client",
            ],
            steps=[
                "1. Constater l'incomplétude sur 'node_controle_pieces' et router vers 'Incomplet' (node_dec_complet).",
                "2. Vérifier l'envoi de la notification et l'activation du compteur J+30 (node_relance_pieces).",
                "3. Simuler la réception GED à J+12 : choisir 'Pièces reçues dans les délais' sur 'node_dec_delai'.",
                "4. Ré-exécuter 'node_controle_pieces' avec succès puis poursuivre vers le règlement.",
            ],
            expectedResult="Le dossier réintègre l'étape de contrôle documentaire sans perte d'historique et poursuit le flux nominal.",
            priority=SeverityLevel.HIGH,
            sourceNodeIds=["node_controle_pieces", "node_dec_complet", "node_relance_pieces", "node_dec_delai"],
            ruleIds=["RG-DOC-01", "RG-FORC-02"],
            status="reviewed",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-05",
            title="Dossier incomplet non régularisé (> 30 jours) — Clôture pour forclusion",
            objective=(
                "Vérifier qu'en l'absence de réponse à J+31 calendaires, la demande est clôturée "
                "pour caducité sans aucun décaissement."
            ),
            preconditions=[
                "Relance envoyée à J0 pour RIB manquant",
                "Aucun document reçu en GED à J+31 calendaires",
            ],
            steps=[
                "1. Orienter 'node_dec_complet' sur 'Incomplet' -> 'node_relance_pieces'.",
                "2. À échéance J+31, sélectionner 'Délai expiré (> 30j)' sur 'node_dec_delai'.",
                "3. Exécuter 'node_cloture_caduc' et vérifier la transition vers 'node_end_caduc'.",
            ],
            expectedResult=(
                "Le courrier de caducité est généré, archivé en GED et le processus s'achève à 'Fin — Demande caduque sans suite'."
            ),
            priority=SeverityLevel.HIGH,
            sourceNodeIds=["node_relance_pieces", "node_dec_delai", "node_cloture_caduc", "node_end_caduc"],
            ruleIds=["RG-FORC-02", "RG-TRAC-07"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-06",
            title="Contrat nanti ou antériorité < 8 ans — Rejet motivé à l'adhérent",
            objective=(
                "S'assurer qu'un contrat frappé d'un nantissement bancaire ou ouvert depuis moins de 8 ans "
                "est bloqué avant le calcul fiscal et fait l'objet d'un courrier de rejet motivé."
            ),
            preconditions=[
                "Pièces justificatives complètes et conformes",
                "Contrat nanti au profit d'un établissement tiers dans Core Assurance Vie",
            ],
            steps=[
                "1. Valider la complétude documentaire (node_dec_complet = 'Complet et conforme').",
                "2. Auditer le contrat sur 'node_verif_eligibilite' et détecter le nantissement actif.",
                "3. Choisir 'Inéligible ou opposition' sur 'node_dec_eligible'.",
                "4. Émettre la notification sur 'node_rejet_motif' jusqu'à 'node_end_rejet'.",
            ],
            expectedResult=(
                "Blocage immédiat de toute liquidation financière ; envoi tracé du courrier de rejet motivé "
                "et clôture sur 'Fin — Demande rejetée avec motif'."
            ),
            priority=SeverityLevel.CRITICAL,
            sourceNodeIds=["node_verif_eligibilite", "node_dec_eligible", "node_rejet_motif", "node_end_rejet"],
            ruleIds=["RG-ELIG-03", "RG-TRAC-07"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-07",
            title="Anomalie LCB-FT — RIB SEPA au nom d'un tiers refusé dès le contrôle initial",
            objective="Garantir le blocage documentaire et LCB-FT lorsqu'un RIB fourni n'appartient pas au titulaire du contrat.",
            preconditions=[
                "Formulaire et CNI valides au nom de l'adhérent",
                "RIB joint au nom d'une société ou d'un tiers non titulaire",
            ],
            steps=[
                "1. Inspecter la concordance titulaire / IBAN lors de 'node_controle_pieces'.",
                "2. Constater la non-conformité RG-DOC-01 / RG-LCBFT-06 et orienter 'node_dec_complet' vers 'Incomplet'.",
            ],
            expectedResult="Le RIB tiers est rejeté, le dossier ne peut pas atteindre l'étape de paiement et une demande de RIB nominatif est émise.",
            priority=SeverityLevel.CRITICAL,
            sourceNodeIds=["node_controle_pieces", "node_dec_complet", "node_relance_pieces"],
            ruleIds=["RG-DOC-01", "RG-LCBFT-06"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-08",
            title="Exactitude de la liquidation fiscale et des prélèvements sociaux",
            objective="Vérifier la conformité du calcul automatique quote-part plus-values / prélèvements / net à verser.",
            preconditions=[
                "Contrat éligible de 9 ans avec 40 000 € de versements et 50 000 € d'épargne valorisée",
                "Demande de rachat partiel brut de 10 000 €",
            ],
            steps=[
                "1. Alimenter 'node_calcul_fiscal' avec le montant brut et l'historique des versements.",
                "2. Contrôler la note de décompte générée en sortie.",
            ],
            expectedResult=(
                "L'assiette imposable (2 000 € de produits) et les prélèvements sont calculés sans écart d'arrondi, "
                "produisant un montant net cohérent transmis à 'node_dec_seuil'."
            ),
            priority=SeverityLevel.HIGH,
            sourceNodeIds=["node_calcul_fiscal", "node_dec_seuil"],
            ruleIds=["RG-FISC-05"],
            status="reviewed",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-09",
            title="Intégrité du flux SEPA ISO 20022 et anti-doublon d'ordonnancement",
            objective="Vérifier le scellement de l'ordre de virement SEPA et la prévention d'un double règlement sur un même dossier.",
            preconditions=[
                "Dossier autorisé au paiement sur 'node_ordonnancement'",
            ],
            steps=[
                "1. Générer l'ordre de virement XML ISO 20022 sur 'node_ordonnancement'.",
                "2. Vérifier l'empreinte de contrôle et l'identifiant d'instruction unique EndToEndId.",
            ],
            expectedResult="Un seul ordre SEPA valide est transmis à la passerelle bancaire avec avis de règlement émis.",
            priority=SeverityLevel.HIGH,
            sourceNodeIds=["node_ordonnancement", "node_end_succes"],
            ruleIds=["RG-LCBFT-06", "RG-TRAC-07"],
            status="reviewed",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-RACH-10",
            title="Auditabilité complète — Vérification du journal d'audit sur les 3 issues de fin",
            objective="S'assurer que chacune des 3 fins (Succès, Rejet motivé, Caducité) laisse une trace horodatée consultable.",
            preconditions=[
                "Trois dossiers de test couvrant respectivement node_end_succes, node_end_rejet et node_end_caduc",
            ],
            steps=[
                "1. Clôturer un dossier par caducité (node_cloture_caduc -> node_end_caduc).",
                "2. Clôturer un dossier par rejet motivé (node_rejet_motif -> node_end_rejet).",
                "3. Exécuter un dossier nominal jusqu'au virement (node_ordonnancement -> node_end_succes).",
                "4. Consulter les journaux d'audit et les pièces archivées en GED.",
            ],
            expectedResult="100 % des dossiers disposent d'un événement d'audit horodaté, de l'acteur signataire et du courrier/avis associé.",
            priority=SeverityLevel.MEDIUM,
            sourceNodeIds=[
                "node_cloture_caduc",
                "node_rejet_motif",
                "node_ordonnancement",
                "node_end_caduc",
                "node_end_rejet",
                "node_end_succes",
            ],
            ruleIds=["RG-TRAC-07"],
            status="reviewed",
            reviewRequired=True,
        ),
    ],
)


# ============================================================================
# 2. PROCESSUS EXISTANT (AS-IS) — Référence Historique pour le Comparateur MOA
# ============================================================================

DEMO_PROCESS_AS_IS = ProcessModel(
    id="demo-rachat-partiel-asis",
    name="Demande de rachat partiel — Flux Historique Courrier (AS-IS)",
    description=(
        "Modélisation de l'état existant (AS-IS) avant transformation : réception exclusivement postale, "
        "pointage manuel sur fiche papier, relances courrier non automatisées, calcul fiscal sous tableur "
        "bureautique, circuit de signature physique par parapheur papier et saisie manuelle du virement."
    ),
    projectId="proj-default-01",
    categoryId="cat-operations",
    tags=["en-revue"],
    lifecycleState=LifecycleState.APPROVED,
    modelState=ModelState.AS_IS,
    version="1.0.0",
    owner="Service Gestion Courrier & Back-Office",
    createdAt=_AS_IS_TS,
    updatedAt=_AS_IS_TS,
    businessRules=[
        BusinessRuleModel(
            id="RG-HIST-01",
            title="Vérification visuelle des justificatifs papier",
            statement="Le gestionnaire pointe manuellement le formulaire original signé, la copie papier de la CNI et le RIB.",
            category=RuleCategory.DATA_QUALITY,
            severity=SeverityLevel.MEDIUM,
            sourceType=SourceType.FICTIONAL_ASSUMPTION,
            sourceNote="Mode opératoire historique Back-Office",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-HIST-02",
            title="Calcul fiscal sur feuille de calcul bureautique",
            statement="Le montant net est calculé manuellement sur matrice tableur avec double pointage visuel.",
            category=RuleCategory.ELIGIBILITY,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.FICTIONAL_ASSUMPTION,
            sourceNote="Constat d'audit AS-IS (risque d'erreur de saisie)",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-HIST-03",
            title="Visa papier systématique du chef de service",
            statement="Tout ordre de paiement papier requiert le tampon et la signature manuscrite du chef de service.",
            category=RuleCategory.APPROVAL,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.FICTIONAL_ASSUMPTION,
            sourceNote="Procédure historique de signature physique",
            active=True,
        ),
    ],
    requirements=[
        RequirementModel(
            id="EX-HIST-01",
            title="Diagnostic des délais et ressaisies manuelles du flux papier",
            description="Documenter les goulots d'étranglement du processus historique (durée nominale > 2h15 de traitement manuel).",
            ruleIds=["RG-HIST-01", "RG-HIST-02"],
        ),
        RequirementModel(
            id="EX-HIST-02",
            title="Sécurisation et dématérialisation du circuit de signature",
            description="Remplacer le parapheur papier par un workflow électronique basé sur un seuil de risque.",
            ruleIds=["RG-HIST-03"],
        ),
    ],
    nodes=[
        NodeModel(
            id="asis_start",
            type=NodeType.START,
            label="Réception du courrier postal de rachat",
            position=Position(x=60, y=308),
            description="Ouverture du pli postal au service courrier et transmission de la pochette papier au Back-Office.",
            ownerRole="Service Courrier",
            application="Bannette Courrier Papier",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Courrier papier signé", "Photocopie CNI", "RIB papier"],
            outputs=["Pochette dossier physique"],
        ),
        NodeModel(
            id="asis_enregistrement",
            type=NodeType.TASK,
            label="Saisir manuellement la demande dans le registre",
            position=Position(x=380, y=300),
            description="Création manuelle d'une ligne de suivi dans le fichier tableur partagé de l'équipe.",
            ownerRole="Agent Administratif",
            application="Tableur Suivi Excel",
            estimatedDurationMinutes=20,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Pochette dossier physique"],
            outputs=["Ligne de suivi créée"],
            controls=["Vérification manuelle numéro de contrat"],
            ruleIds=["RG-HIST-01"],
        ),
        NodeModel(
            id="asis_controle_papier",
            type=NodeType.TASK,
            label="Pointer visuellement les pièces et le contrat",
            position=Position(x=700, y=300),
            description="Contrôle visuel des photocopies CNI/RIB et consultation manuelle de la fiche contrat.",
            ownerRole="Gestionnaire Back-Office",
            application="Application Legacy Host",
            estimatedDurationMinutes=35,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Pochette dossier physique", "Écran contrat Legacy"],
            outputs=["Fiche de pointage papier"],
            controls=["Pointage visuel CNI et RIB"],
            ruleIds=["RG-HIST-01"],
        ),
        NodeModel(
            id="asis_dec_complet",
            type=NodeType.DECISION,
            label="Pochette papier complète et recevable ?",
            position=Position(x=1020, y=300),
            description="Orientation manuelle du dossier papier après pointage par le gestionnaire.",
            ownerRole="Gestionnaire Back-Office",
            application="Fiche Suivi Papier",
            estimatedDurationMinutes=5,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Fiche de pointage papier"],
            outputs=["Orientation manuelle (Conforme / Incomplet ou refus)"],
            ruleIds=["RG-HIST-01"],
        ),
        NodeModel(
            id="asis_courrier_retour",
            type=NodeType.TASK,
            label="Rédiger et poster un courrier de rejet / relance",
            position=Position(x=1340, y=80),
            description="Frappe manuelle d'un courrier sous traitement de texte, mise sous pli et affranchissement postal.",
            ownerRole="Gestionnaire Back-Office",
            application="Traitement de texte & Courrier",
            estimatedDurationMinutes=30,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Motif manuscrit sur fiche"],
            outputs=["Courrier postal expédié"],
            ruleIds=["RG-HIST-01"],
        ),
        NodeModel(
            id="asis_calcul_tableur",
            type=NodeType.TASK,
            label="Calculer la fiscalité sur tableur Excel",
            position=Position(x=1340, y=300),
            description="Report manuel des versements et calcul de la retenue fiscale sur feuille bureautique.",
            ownerRole="Gestionnaire Sinistres & Épargne",
            application="Tableur Fiscalité Bureautique",
            estimatedDurationMinutes=35,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Historique papier/Legacy des versements"],
            outputs=["Feuille de décompte imprimée"],
            controls=["Relecture croisée de la formule"],
            ruleIds=["RG-HIST-02"],
        ),
        NodeModel(
            id="asis_visa_papier",
            type=NodeType.TASK,
            label="Faire signer le bon à payer papier au responsable",
            position=Position(x=1660, y=300),
            description="Dépôt de la pochette dans le parapheur physique pour signature manuscrite hebdomadaire.",
            ownerRole="Chef de Service",
            application="Parapheur Physique Papier",
            estimatedDurationMinutes=45,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Pochette complète", "Feuille de décompte imprimée"],
            outputs=["Bon à payer signé à la main"],
            controls=["Signature manuscrite et tampon"],
            ruleIds=["RG-HIST-03"],
        ),
        NodeModel(
            id="asis_saisie_virement",
            type=NodeType.TASK,
            label="Ressaisir le virement sur le portail bancaire",
            position=Position(x=1980, y=300),
            description="Saisie manuelle de l'IBAN et du montant net dans l'interface bancaire puis classement archive papier.",
            ownerRole="Comptabilité Trésorerie",
            application="Portail Bancaire Manuel",
            estimatedDurationMinutes=25,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Bon à payer signé à la main", "RIB papier"],
            outputs=["Virement unitaire saisi", "Archive carton"],
            controls=["Vérification visuelle des 27 caractères IBAN"],
            ruleIds=["RG-HIST-03"],
        ),
        NodeModel(
            id="asis_end_retour",
            type=NodeType.END,
            label="Fin — Dossier papier retourné ou classé",
            position=Position(x=1660, y=84),
            description="Fin du traitement suite au renvoi postal du dossier incomplet ou non recevable.",
            ownerRole="Service Courrier",
            application="Archives Physiques",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.MANUAL,
        ),
        NodeModel(
            id="asis_end_succes",
            type=NodeType.END,
            label="Fin — Virement manuel saisi et dossier archivé",
            position=Position(x=2300, y=304),
            description="Règlement saisi manuellement et pochette physique rangée aux archives.",
            ownerRole="Comptabilité Trésorerie",
            application="Archives Physiques",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.MANUAL,
        ),
    ],
    edges=[
        EdgeModel(id="ea_01", sourceNodeId="asis_start", targetNodeId="asis_enregistrement", label="Pli ouvert"),
        EdgeModel(id="ea_02", sourceNodeId="asis_enregistrement", targetNodeId="asis_controle_papier", label="Dossier transmis"),
        EdgeModel(id="ea_03", sourceNodeId="asis_controle_papier", targetNodeId="asis_dec_complet", label="Pointage effectué"),
        EdgeModel(
            id="ea_04",
            sourceNodeId="asis_dec_complet",
            targetNodeId="asis_calcul_tableur",
            label="Complet et conforme",
            isDefault=True,
        ),
        EdgeModel(
            id="ea_05",
            sourceNodeId="asis_dec_complet",
            targetNodeId="asis_courrier_retour",
            label="Incomplet ou refus",
        ),
        EdgeModel(id="ea_06", sourceNodeId="asis_courrier_retour", targetNodeId="asis_end_retour", label="Courrier posté"),
        EdgeModel(id="ea_07", sourceNodeId="asis_calcul_tableur", targetNodeId="asis_visa_papier", label="Décompte imprimé"),
        EdgeModel(id="ea_08", sourceNodeId="asis_visa_papier", targetNodeId="asis_saisie_virement", label="Bon signé"),
        EdgeModel(id="ea_09", sourceNodeId="asis_saisie_virement", targetNodeId="asis_end_succes", label="Virement saisi"),
    ],
    testCases=[
        TestCaseModel(
            id="TC-HIST-01",
            title="Parcours papier complet AS-IS — Traitement 100 % manuel",
            objective="Mesurer la charge manuelle cumulée du processus historique courrier (165 minutes nominales).",
            preconditions=["Courrier papier complet reçu au service courrier"],
            steps=[
                "1. Enregistrer sur Excel (20 min) et pointer les pièces papier (35 min).",
                "2. Calculer sous tableur (35 min), signer en parapheur physique (45 min) et ressaisir l'IBAN (25 min).",
            ],
            expectedResult="Atteinte de 'asis_end_succes' avec 100 % d'étapes manuelles (gain de -66 % visé en TO-BE).",
            priority=SeverityLevel.MEDIUM,
            sourceNodeIds=["asis_enregistrement", "asis_controle_papier", "asis_calcul_tableur", "asis_visa_papier", "asis_saisie_virement"],
            ruleIds=["RG-HIST-01", "RG-HIST-02", "RG-HIST-03"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-HIST-02",
            title="Dossier papier incomplet AS-IS — Renvoi par courrier postal",
            objective="Documenter le traitement manuel des rejets et relances postales dans l'état existant.",
            preconditions=["Photocopie CNI manquante dans le pli postal"],
            steps=[
                "1. Pointer la pochette sur 'asis_controle_papier'.",
                "2. Choisir 'Incomplet ou refus' sur 'asis_dec_complet' et poster le courrier ('asis_courrier_retour').",
            ],
            expectedResult="Clôture sur 'asis_end_retour' sans suivi automatique du délai de retour.",
            priority=SeverityLevel.MEDIUM,
            sourceNodeIds=["asis_dec_complet", "asis_courrier_retour", "asis_end_retour"],
            ruleIds=["RG-HIST-01"],
            status="reviewed",
            reviewRequired=False,
        ),
    ],
)


# ==============================================================================
# PROJET DÉMO #2 — DÉCLARATION & INDEMNISATION SINISTRE AUTO (TO-BE & AS-IS)
# ==============================================================================

DEMO_PROCESS_SINISTRE = ProcessModel(
    id="demo-sinistre-auto",
    name="Sinistre Auto — Indemnisation Digitale (TO-BE)",
    domain="Assurance IARD — Sinistres Auto",
    description=(
        "Processus cible dématérialisé de gestion des sinistres automobiles : déclaration mobile/portail, "
        "vérification automatique des garanties, scoring anti-fraude IA, expertise conditionnelle (>= 3 000 €), "
        "calcul d'indemnité nette et virement SEPA instantané."
    ),
    modelState=ModelState.TO_BE,
    version="1.1.0",
    lifecycleState=LifecycleState.APPROVED,
    createdAt=_TO_BE_CREATED_TS,
    updatedAt=_TO_BE_UPDATED_TS,
    owner="Direction Indemnisations IARD",
    projectId="proj-default-02",
    categoryId="cat-operations",
    tags=["prioritaire", "en-revue", "validation-requise"],
    businessRules=[
        BusinessRuleModel(
            id="RG-SIN-01",
            title="Vérification de validité contrat & garantie sinistre",
            statement="Tout sinistre déclaré doit correspondre à un contrat actif à la date de survenance avec garantie applicable non exclue.",
            category=RuleCategory.ELIGIBILITY,
            severity=SeverityLevel.CRITICAL,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Conditions Générales Auto — Article 4.2",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-FRAU-02",
            title="Scoring anti-fraude IA obligatoire avant indemnisation",
            statement="Chaque déclaration est scorée par le moteur anti-fraude ; tout score >= 70/100 déclenche une expertise obligatoire.",
            category=RuleCategory.SECURITY,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.EXTERNAL_REFERENCE,
            sourceNote="Politique Lutte Anti-Fraude Assurance IARD",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-EXP-03",
            title="Seuil d'expertise automobile obligatoire (>= 3 000 €)",
            statement="Au-delà de 3 000 € de dommages estimés ou en cas d'alerte fraude, un expert automobile agréé doit produire un rapport chiffré.",
            category=RuleCategory.APPROVAL,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Barème de délégation indemnisation IARD",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-IND-04",
            title="Calcul net de l'indemnité après déduction de franchise",
            statement="L'indemnité nette versée correspond au montant validé minoré de la franchise contractuelle applicable.",
            category=RuleCategory.OTHER,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Spécification moteur de calcul indemnités",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-TRAC-05",
            title="Traçabilité du règlement SEPA & notification assuré",
            statement="Chaque virement d'indemnisation génère un avis détaillé transmis à l'assuré et un journal d'audit horodaté.",
            category=RuleCategory.SECURITY,
            severity=SeverityLevel.MEDIUM,
            sourceType=SourceType.EXTERNAL_REFERENCE,
            sourceNote="Directive Distribution Assurance (DDA)",
            active=True,
        ),
    ],
    requirements=[
        RequirementModel(
            id="REQ-SIN-01",
            title="Vérification instantanée des garanties contrat",
            description="Contrôler automatiquement l'état du contrat et la couverture du sinistre à la réception de la déclaration.",
            priority=SeverityLevel.CRITICAL,
            linkedNodeIds=["sin_controle_garanties", "sin_dec_couvert"],
            linkedRuleIds=["RG-SIN-01"],
        ),
        RequirementModel(
            id="REQ-SIN-02",
            title="Détection fraude & déclenchement d'expertise >= 3 000 €",
            description="Router les dossiers à risque fraude ou de montant >= 3 000 € vers un expert automobile agréé.",
            priority=SeverityLevel.HIGH,
            linkedNodeIds=["sin_scoring_fraude", "sin_dec_expertise", "sin_mandat_expert"],
            linkedRuleIds=["RG-FRAU-02", "RG-EXP-03"],
        ),
        RequirementModel(
            id="REQ-SIN-03",
            title="Indemnisation rapide & virement SEPA tracé",
            description="Calculer l'indemnité nette franchise déduite et déclencher le virement SEPA avec avis assuré.",
            priority=SeverityLevel.HIGH,
            linkedNodeIds=["sin_calcul_indemnite", "sin_virement_sepa"],
            linkedRuleIds=["RG-IND-04", "RG-TRAC-05"],
        ),
    ],
    nodes=[
        NodeModel(
            id="sin_start",
            type=NodeType.START,
            label="Déclaration sinistre (App / Portail)",
            position=Position(x=60, y=300),
            description="Réception de la e-déclaration sinistre auto avec photos et constat dématérialisé.",
            ownerRole="Assuré / Portail Mobile",
            application="Application Mobile IARD",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["E-constat signé", "Photos dommages"],
            outputs=["Dossier sinistre horodaté"],
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sin_controle_garanties",
            type=NodeType.TASK,
            label="Contrôler garanties & contrat actif",
            position=Position(x=310, y=300),
            description="Interrogation du référentiel contrats pour vérifier la validité à la date du sinistre et les garanties souscrites.",
            ownerRole="Gestionnaire Sinistres",
            application="Core Sinistres IARD",
            estimatedDurationMinutes=8,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Numéro de police", "Date de survenance"],
            outputs=["Statut garantie (Couvert / Exclu)"],
            controls=["Vérification cotisations à jour et absence d'exclusion"],
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sin_dec_couvert",
            type=NodeType.DECISION,
            label="Sinistre couvert & contrat valide ?",
            position=Position(x=610, y=300),
            description="Aiguillage selon la couverture contractuelle du sinistre déclaré.",
            ownerRole="Moteur Garanties",
            application="Core Sinistres IARD",
            estimatedDurationMinutes=2,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Statut garantie"],
            outputs=["Décision recevabilité"],
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sin_notif_refus",
            type=NodeType.TASK,
            label="Notifier refus de garantie motivé",
            position=Position(x=910, y=500),
            description="Émission de la lettre motivée de refus de prise en charge avec référence aux clauses contractuelles.",
            ownerRole="Gestionnaire Sinistres",
            application="CRM Relation Client",
            estimatedDurationMinutes=10,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Motif d'exclusion contractuelle"],
            outputs=["Courrier de refus motivé"],
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sin_end_refus",
            type=NodeType.END,
            label="Fin — Sinistre non couvert",
            position=Position(x=1220, y=515),
            description="Clôture du dossier suite à absence de garantie applicable.",
            ownerRole="Système",
            application="Core Sinistres IARD",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.AUTOMATED,
        ),
        NodeModel(
            id="sin_scoring_fraude",
            type=NodeType.TASK,
            label="Scorer risque fraude & gravité",
            position=Position(x=910, y=300),
            description="Analyse automatisée des photos, historique sinistralité et montant estimé des réparations.",
            ownerRole="Moteur Anti-Fraude IA",
            application="Plateforme Anti-Fraude",
            estimatedDurationMinutes=5,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Photos dommages", "Historique assuré"],
            outputs=["Score fraude (0-100)", "Estimation dommages (€)"],
            controls=["Détection incohérences métadonnées & récurrence"],
            ruleIds=["RG-FRAU-02"],
        ),
        NodeModel(
            id="sin_dec_expertise",
            type=NodeType.DECISION,
            label="Montant >= 3 000 € ou alerte fraude ?",
            position=Position(x=1210, y=300),
            description="Détermine si le dossier nécessite un mandat d'expertise automobile ou passe en indemnisation directe.",
            ownerRole="Moteur Anti-Fraude IA",
            application="Plateforme Anti-Fraude",
            estimatedDurationMinutes=2,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Score fraude", "Estimation dommages (€)"],
            outputs=["Orientation Expertise / Direct"],
            ruleIds=["RG-FRAU-02", "RG-EXP-03"],
        ),
        NodeModel(
            id="sin_mandat_expert",
            type=NodeType.TASK,
            label="Mandater expert auto & chiffrage",
            position=Position(x=1510, y=500),
            description="Désignation d'un expert agréé, examen du véhicule et validation du rapport de chiffrage contradictoire.",
            ownerRole="Expert Automobile",
            application="Portail Expertise",
            estimatedDurationMinutes=45,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Dossier sinistre", "Devis garage"],
            outputs=["Rapport d'expertise chiffré"],
            controls=["Validation contradictoire du coût des réparations"],
            ruleIds=["RG-EXP-03"],
        ),
        NodeModel(
            id="sin_calcul_indemnite",
            type=NodeType.TASK,
            label="Calculer indemnité nette (franchise)",
            position=Position(x=1510, y=300),
            description="Calcul exact du montant net à indemniser après déduction de la franchise contractuelle.",
            ownerRole="Moteur Indemnisation",
            application="Core Sinistres IARD",
            estimatedDurationMinutes=5,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Montant dommages validé", "Franchise contractuelle"],
            outputs=["Décompte d'indemnisation net (€)"],
            ruleIds=["RG-IND-04"],
        ),
        NodeModel(
            id="sin_virement_sepa",
            type=NodeType.TASK,
            label="Émettre virement SEPA & avis assuré",
            position=Position(x=1810, y=300),
            description="Déclenchement du virement SEPA d'indemnisation, envoi de l'avis détaillé et archivage audit.",
            ownerRole="Opérations Financières",
            application="Passerelle SEPA Trésorerie",
            estimatedDurationMinutes=6,
            executionMode=ExecutionMode.AUTOMATED,
            inputs=["Décompte d'indemnisation net (€)", "RIB Assuré"],
            outputs=["Ordre SEPA exécuté", "Avis d'indemnisation"],
            ruleIds=["RG-IND-04", "RG-TRAC-05"],
        ),
        NodeModel(
            id="sin_end_ok",
            type=NodeType.END,
            label="Fin — Assuré indemnisé",
            position=Position(x=2110, y=315),
            description="Sinistre réglé et clôturé avec piste d'audit complète.",
            ownerRole="Système",
            application="Core Sinistres IARD",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.AUTOMATED,
        ),
    ],
    edges=[
        EdgeModel(id="es_01", sourceNodeId="sin_start", targetNodeId="sin_controle_garanties", label="Déclaration reçue"),
        EdgeModel(id="es_02", sourceNodeId="sin_controle_garanties", targetNodeId="sin_dec_couvert", label="Garanties vérifiées"),
        EdgeModel(id="es_03", sourceNodeId="sin_dec_couvert", targetNodeId="sin_scoring_fraude", label="Oui — Couvert"),
        EdgeModel(id="es_04", sourceNodeId="sin_dec_couvert", targetNodeId="sin_notif_refus", label="Non — Exclu / Rejet"),
        EdgeModel(id="es_05", sourceNodeId="sin_notif_refus", targetNodeId="sin_end_refus", label="Refus notifié"),
        EdgeModel(id="es_06", sourceNodeId="sin_scoring_fraude", targetNodeId="sin_dec_expertise", label="Score calculé"),
        EdgeModel(id="es_07", sourceNodeId="sin_dec_expertise", targetNodeId="sin_calcul_indemnite", label="Inférieur à 3 000 € (OK)"),
        EdgeModel(id="es_08", sourceNodeId="sin_dec_expertise", targetNodeId="sin_mandat_expert", label="Supérieur ou alerte"),
        EdgeModel(id="es_09", sourceNodeId="sin_mandat_expert", targetNodeId="sin_calcul_indemnite", label="Rapport validé"),
        EdgeModel(id="es_10", sourceNodeId="sin_calcul_indemnite", targetNodeId="sin_virement_sepa", label="Indemnité calculée"),
        EdgeModel(id="es_11", sourceNodeId="sin_virement_sepa", targetNodeId="sin_end_ok", label="Virement émis"),
    ],
    testCases=[
        TestCaseModel(
            id="TC-SIN-01",
            title="Sinistre mineur couvert (< 3 000 €) — Indemnisation directe",
            objective="Vérifier le règlement rapide sans expertise pour un sinistre couvert de 1 450 € sans alerte fraude.",
            preconditions=["Contrat Auto Tous Risques actif", "Montant estimé 1 450 €, score fraude 12/100"],
            steps=[
                "1. Soumettre la e-déclaration ('sin_start') et vérifier garanties ('sin_controle_garanties').",
                "2. Valider 'Oui — Couvert', scorer fraude et passer en direct ('sin_calcul_indemnite' -> 'sin_virement_sepa').",
            ],
            expectedResult="Indemnisation versée en 26 min cumulées sans mandat d'expertise.",
            priority=SeverityLevel.CRITICAL,
            sourceNodeIds=["sin_start", "sin_controle_garanties", "sin_dec_couvert", "sin_scoring_fraude", "sin_dec_expertise", "sin_calcul_indemnite", "sin_virement_sepa", "sin_end_ok"],
            ruleIds=["RG-SIN-01", "RG-FRAU-02", "RG-IND-04", "RG-TRAC-05"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-SIN-02",
            title="Sinistre important (>= 3 000 €) — Expertise automobile obligatoire",
            objective="Vérifier le routage vers l'expert agréé dès que les dommages atteignent 3 000 € ou alerte fraude.",
            preconditions=["Contrat actif", "Dommages estimés 5 800 €"],
            steps=[
                "1. Traverser contrôle garanties et scoring fraude.",
                "2. Sélectionner 'Supérieur ou alerte' sur 'sin_dec_expertise' -> 'sin_mandat_expert' puis calcul et virement.",
            ],
            expectedResult="Rapport d'expertise exigé avant le calcul d'indemnité nette (RG-EXP-03).",
            priority=SeverityLevel.HIGH,
            sourceNodeIds=["sin_dec_expertise", "sin_mandat_expert", "sin_calcul_indemnite", "sin_virement_sepa"],
            ruleIds=["RG-FRAU-02", "RG-EXP-03", "RG-IND-04"],
            status="approved",
            reviewRequired=False,
        ),
        TestCaseModel(
            id="TC-SIN-03",
            title="Sinistre hors garantie — Refus motivé et clôture",
            objective="Vérifier l'émission d'un refus motivé si le contrat est suspendu ou la garantie exclue.",
            preconditions=["Contrat résilié à la date du sinistre"],
            steps=[
                "1. Contrôler garanties ('sin_controle_garanties').",
                "2. Orienter vers 'Non — Exclu / Rejet' -> 'sin_notif_refus' -> 'sin_end_refus'.",
            ],
            expectedResult="Aucun virement émis ; lettre de refus motivée archivée.",
            priority=SeverityLevel.HIGH,
            sourceNodeIds=["sin_controle_garanties", "sin_dec_couvert", "sin_notif_refus", "sin_end_refus"],
            ruleIds=["RG-SIN-01"],
            status="reviewed",
            reviewRequired=False,
        ),
    ],
)

DEMO_PROCESS_SINISTRE_AS_IS = ProcessModel(
    id="demo-sinistre-auto-asis",
    name="Sinistre Auto — Circuit Papier Historique (AS-IS)",
    domain="Assurance IARD — Sinistres Auto",
    description=(
        "État existant historique avant digitalisation : réception du constat amiable papier par courrier, "
        "saisie manuelle, vérification manuelle des garanties, expertise physique systématique et règlement par chèque."
    ),
    modelState=ModelState.AS_IS,
    version="1.0.0",
    lifecycleState=LifecycleState.APPROVED,
    createdAt=_TO_BE_CREATED_TS,
    updatedAt=_TO_BE_UPDATED_TS,
    owner="Direction Indemnisations IARD",
    projectId="proj-default-02",
    categoryId="cat-operations",
    tags=["en-revue"],
    businessRules=[
        BusinessRuleModel(
            id="RG-SIN-01",
            title="Vérification de validité contrat & garantie sinistre",
            statement="Vérification manuelle de l'état du contrat dans le back-office historique avant ouverture de dossier.",
            category=RuleCategory.ELIGIBILITY,
            severity=SeverityLevel.HIGH,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Procédure historique papier",
            active=True,
        ),
        BusinessRuleModel(
            id="RG-EXP-03",
            title="Expertise physique systématique",
            statement="Tout sinistre matériel fait l'objet d'un passage d'expert physique sur dossier papier.",
            category=RuleCategory.APPROVAL,
            severity=SeverityLevel.MEDIUM,
            sourceType=SourceType.BUSINESS_REQUIREMENT,
            sourceNote="Ancienne règle IARD",
            active=True,
        ),
    ],
    requirements=[],
    nodes=[
        NodeModel(
            id="sa_start",
            type=NodeType.START,
            label="Réception constat amiable papier",
            position=Position(x=60, y=300),
            description="Réception postale du constat papier envoyé par l'assuré.",
            ownerRole="Service Courrier",
            application="Boîte Courrier",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.MANUAL,
        ),
        NodeModel(
            id="sa_saisie",
            type=NodeType.TASK,
            label="Numériser et saisir le constat manuellement",
            position=Position(x=320, y=300),
            description="Ouverture du pli, scan et ressaisie manuelle des informations dans le back-office.",
            ownerRole="Service Courrier",
            application="GED Courrier",
            estimatedDurationMinutes=35,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Constat amiable papier"],
            outputs=["Fiche sinistre saisie"],
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sa_verif",
            type=NodeType.TASK,
            label="Vérifier les garanties manuellement",
            position=Position(x=620, y=300),
            description="Consultation manuelle du contrat et des avenants papier.",
            ownerRole="Gestionnaire Sinistres",
            application="Back-Office Legacy",
            estimatedDurationMinutes=25,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Fiche sinistre saisie"],
            outputs=["Avis garantie"],
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sa_dec",
            type=NodeType.DECISION,
            label="Garantie acquise ?",
            position=Position(x=920, y=300),
            description="Décision manuelle sur la recevabilité du dossier.",
            ownerRole="Gestionnaire Sinistres",
            application="Back-Office Legacy",
            estimatedDurationMinutes=5,
            executionMode=ExecutionMode.MANUAL,
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sa_refus",
            type=NodeType.TASK,
            label="Envoyer courrier postal de refus",
            position=Position(x=1220, y=500),
            description="Rédaction et affranchissement d'un courrier postal de refus.",
            ownerRole="Gestionnaire Sinistres",
            application="Éditique Courrier",
            estimatedDurationMinutes=20,
            executionMode=ExecutionMode.MANUAL,
            ruleIds=["RG-SIN-01"],
        ),
        NodeModel(
            id="sa_end_refus",
            type=NodeType.END,
            label="Fin — Dossier refusé",
            position=Position(x=1520, y=515),
            ownerRole="Système",
            application="Back-Office Legacy",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.MANUAL,
        ),
        NodeModel(
            id="sa_expertise",
            type=NodeType.TASK,
            label="Expertise physique & émission chèque",
            position=Position(x=1220, y=300),
            description="Passage d'expert physique systématique puis édition et envoi postal du chèque d'indemnisation.",
            ownerRole="Expert Automobile",
            application="Dossier Papier",
            estimatedDurationMinutes=90,
            executionMode=ExecutionMode.MANUAL,
            inputs=["Dossier papier complet"],
            outputs=["Rapport papier", "Chèque postal"],
            ruleIds=["RG-EXP-03"],
        ),
        NodeModel(
            id="sa_end_ok",
            type=NodeType.END,
            label="Fin — Chèque d'indemnisation envoyé",
            position=Position(x=1540, y=315),
            ownerRole="Système",
            application="Éditique Courrier",
            estimatedDurationMinutes=0,
            executionMode=ExecutionMode.MANUAL,
        ),
    ],
    edges=[
        EdgeModel(id="esa_01", sourceNodeId="sa_start", targetNodeId="sa_saisie", label="Pli reçu"),
        EdgeModel(id="esa_02", sourceNodeId="sa_saisie", targetNodeId="sa_verif", label="Fiche créée"),
        EdgeModel(id="esa_03", sourceNodeId="sa_verif", targetNodeId="sa_dec", label="Garantie vérifiée"),
        EdgeModel(id="esa_04", sourceNodeId="sa_dec", targetNodeId="sa_expertise", label="Oui — Garantie acquise"),
        EdgeModel(id="esa_05", sourceNodeId="sa_dec", targetNodeId="sa_refus", label="Non — Refus"),
        EdgeModel(id="esa_06", sourceNodeId="sa_refus", targetNodeId="sa_end_refus", label="Courrier envoyé"),
        EdgeModel(id="esa_07", sourceNodeId="sa_expertise", targetNodeId="sa_end_ok", label="Chèque posté"),
    ],
    testCases=[
        TestCaseModel(
            id="TC-SIN-ASIS-01",
            title="Circuit papier complet AS-IS — 175 min manuelles",
            objective="Mesurer le délai cumulé et la charge 100 % manuelle du circuit papier historique.",
            preconditions=["Constat papier reçu par voie postale"],
            steps=["1. Saisie courrier (35m), contrôle manuel (25m), expertise & chèque (90m)."],
            expectedResult="Règlement par chèque postal avec 0 % d'automatisation.",
            priority=SeverityLevel.MEDIUM,
            sourceNodeIds=["sa_saisie", "sa_verif", "sa_expertise", "sa_end_ok"],
            ruleIds=["RG-SIN-01", "RG-EXP-03"],
            status="approved",
            reviewRequired=False,
        ),
    ],
)
