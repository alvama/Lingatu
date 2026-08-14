"""Empaqueta extension/ en un .zip listo para subir a la Chrome Web Store.

Zipea el CONTENIDO de extension/ (no la carpeta), excluye archivos basura
del sistema operativo, y nombra el zip con la versión leída de manifest.json.
"""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXT_DIR = ROOT / "extension"
OUT_DIR = ROOT / "store"

EXCLUDE_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}


def main():
    manifest = json.loads((EXT_DIR / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    OUT_DIR.mkdir(exist_ok=True)
    out_path = OUT_DIR / f"Lingatu-Connector-v{version}.zip"

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(EXT_DIR.rglob("*")):
            if path.is_dir() or path.name in EXCLUDE_NAMES:
                continue
            zf.write(path, arcname=path.relative_to(EXT_DIR))

    print(f"Creado: {out_path} ({out_path.stat().st_size} bytes)")
    print("Contenido:")
    with zipfile.ZipFile(out_path) as zf:
        for name in zf.namelist():
            print(" ", name)


if __name__ == "__main__":
    main()
