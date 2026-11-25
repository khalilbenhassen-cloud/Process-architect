import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ux_checks import acceptance_checklist, audit_layout_spec

def test_empty_report_fails():
    assert audit_layout_spec({})["complete"] is False

def test_all_true_passes():
    keys = [x["key"] for x in acceptance_checklist()["items"]]
    assert audit_layout_spec({k: True for k in keys})["complete"] is True
