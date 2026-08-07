"""Convierte marcadores de Chrome y/o Edge al formato de importación de PinBoard.

No contiene ninguna ruta fija: todo (qué archivos "Bookmarks" leer y dónde
escribir el resultado) se toma de un archivo de configuración JSON. Genera
ese archivo con configurar_marcadores.html (en esta misma carpeta) y
guárdalo como marcadores_config.json junto a este script, o indica su
ubicación con --config.
"""

import argparse
import json
import os
import sys


def walk(node, path, out, seen_urls):
    node_type = node.get("type")
    if node_type == "url":
        url = node.get("url", "").strip()
        title = node.get("name", "").strip() or url
        if not url or not url.startswith(("http://", "https://")):
            return
        if url in seen_urls:
            return
        seen_urls.add(url)
        category = " / ".join([p for p in path if p]) or "Sin categoría"
        out.append({
            "category": category,
            "title": title,
            "url": url,
            "description": "",
            "active": True,
            "tags": []
        })
        return
    if node_type != "folder":
        return
    name = node.get("name", "").strip()
    new_path = path + [name] if name else path
    for child in node.get("children", []):
        walk(child, new_path, out, seen_urls)


def load_config(config_path):
    if not os.path.isfile(config_path):
        print(f"No se encontró el archivo de configuración: {config_path}", file=sys.stderr)
        print("Genera uno con configurar_marcadores.html (en esta misma carpeta) y", file=sys.stderr)
        print("guárdalo con ese nombre, o pasa --config <ruta> apuntando a otro archivo.", file=sys.stderr)
        sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_config = os.path.join(script_dir, "marcadores_config.json")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        default=default_config,
        help="Ruta al archivo de configuración JSON (por defecto: marcadores_config.json junto a este script)"
    )
    args = parser.parse_args()

    config = load_config(args.config)
    sources = config.get("sources", [])
    out_path = config.get("outputPath")

    if not sources:
        print("El archivo de configuración no tiene ninguna fuente en 'sources'.", file=sys.stderr)
        sys.exit(1)
    if not out_path:
        print("El archivo de configuración no indica 'outputPath'.", file=sys.stderr)
        sys.exit(1)

    all_links = []
    seen_urls = set()
    total_by_source = {}

    for source in sources:
        filepath = source.get("bookmarksPath")
        label = f"{source.get('browser', '?')} - {source.get('profile', '?')}"
        if not filepath:
            print(f"Aviso: fuente sin 'bookmarksPath', se omite ({label})", file=sys.stderr)
            continue
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            print(f"Aviso: no se encontró {filepath} ({label})", file=sys.stderr)
            continue
        except json.JSONDecodeError:
            print(f"Aviso: {filepath} no es un JSON válido ({label})", file=sys.stderr)
            continue

        roots = data.get("roots", {})
        before = len(all_links)
        for root_node in roots.values():
            if not isinstance(root_node, dict) or root_node.get("type") != "folder":
                continue
            walk(root_node, [], all_links, seen_urls)
        total_by_source[label] = len(all_links) - before

    try:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(all_links, f, ensure_ascii=False, indent=2)
    except OSError as e:
        print(f"No se pudo escribir en '{out_path}': {e}", file=sys.stderr)
        print("Comprueba que la carpeta de destino exista.", file=sys.stderr)
        sys.exit(1)

    print(f"Total enlaces exportados: {len(all_links)}")
    for label, count in total_by_source.items():
        print(f"  {label}: {count}")
    print(f"Archivo generado: {out_path}")


if __name__ == "__main__":
    main()
