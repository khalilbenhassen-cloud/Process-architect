"""Direct launcher for Process Architect Backend."""
import sys
from pathlib import Path

# Add directories to Python path
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
MCP_DIR = ROOT_DIR / "mcp-server"

for p in [str(ROOT_DIR), str(BACKEND_DIR), str(MCP_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print(" Démarrage du Backend Process Architect sur http://127.0.0.1:8000")
    print(" Documentation Swagger : http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=str(BACKEND_DIR)
    )
