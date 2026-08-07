import json
import sys

PROFILES = [
    (r"C:\Users\Alberto\AppData\Local\Microsoft\Edge\User Data\Default\Bookmarks", "Default"),
    (r"C:\Users\Alberto\AppData\Local\Microsoft\Edge\User Data\Profile 1\Bookmarks", "Profile 1"),
]

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

all_links = []
seen_urls = set()
total_by_profile = {}

for filepath, label in PROFILES:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Aviso: no se encontró {filepath}", file=sys.stderr)
        continue

    roots = data.get("roots", {})
    before = len(all_links)
    for root_key, root_node in roots.items():
        if not isinstance(root_node, dict) or root_node.get("type") != "folder":
            continue
        walk(root_node, [], all_links, seen_urls)
    total_by_profile[label] = len(all_links) - before

out_path = r"C:\Users\Alberto\OneDrive - vazquezmartin\Documentos\0001 - IA\000 - Claude\PinBoard\marcadores_edge.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(all_links, f, ensure_ascii=False, indent=2)

print(f"Total enlaces exportados: {len(all_links)}")
for label, count in total_by_profile.items():
    print(f"  {label}: {count}")
print(f"Archivo generado: {out_path}")
