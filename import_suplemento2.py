#!/usr/bin/env python3
"""
Importa flashcards Suplemento 2 (ME1, ME2, ME3) do Google Drive para o Supabase.
Execute no Terminal: python3 ~/anesmap/import_suplemento2.py
"""

import json, base64, re, html as html_module, os, sys

BASE = "/var/folders/p3/q6p6x0jd4c105h3r07_lgfm40000gn/T/claude-hostloop-plugins/c0fefbb96b6792e9/projects/-Users-sandrodainez-Library-Application-Support-Claude-local-agent-mode-sessions-4abd0422-5f0d-46b6-8908-bdbf85627ce2-ac29b314-cbc2-4ff5-9a54-211f2037afcc-local-6464056a-372b-4e37-b87b-a9a584d01dd4-ou-p420ah/3e041839-a485-410f-a26a-921ffdc681a2/tool-results"

FILES = [
    {
        "path": f"{BASE}/mcp-dd926fec-26e6-4f77-aaa1-353d4cde111b-download_file_content-1779191361557.txt",
        "me": "ME1",
        "id_prefix": "fc-me1flashcardssuplemento2-",
    },
    {
        "path": f"{BASE}/mcp-dd926fec-26e6-4f77-aaa1-353d4cde111b-download_file_content-1779192735320.txt",
        "me": "ME2",
        "id_prefix": "fc-me2flashcardssuplemento2-",
    },
    {
        "path": f"{BASE}/mcp-dd926fec-26e6-4f77-aaa1-353d4cde111b-download_file_content-1779192738497.txt",
        "me": "ME3",
        "id_prefix": "fc-me3flashcardssuplemento2-",
    },
]

def clean(text):
    text = re.sub(r'<span[^>]*>#\d+</span>', '', text)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_module.unescape(text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def parse(html_content):
    cards = []
    rows = re.findall(r'<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>', html_content, re.DOTALL)
    for f, v in rows:
        frente = clean(f)
        verso  = clean(v)
        if frente and verso and len(frente) > 8 and 'FRENTE' not in frente.upper():
            cards.append((frente, verso))
    return cards

def escape_sql(s):
    return s.replace("'", "''")

all_sql = []

for info in FILES:
    path = info["path"]
    if not os.path.exists(path):
        print(f"✗ Arquivo não encontrado: {path}")
        sys.exit(1)

    with open(path) as f:
        data = json.load(f)

    html_bytes = base64.b64decode(data["content"])
    html_content = html_bytes.decode("utf-8", errors="replace")

    cards = parse(html_content)
    print(f"✓ {info['me']}: {len(cards)} flashcards extraídos")

    values = []
    for i, (frente, verso) in enumerate(cards, 1):
        cid    = f"{info['id_prefix']}{i}"
        frente = escape_sql(frente)
        verso  = escape_sql(verso)
        values.append(f"('{cid}', '{info['me']}', '{frente}', '{verso}', 'anual')")

    if values:
        chunk = "INSERT INTO public.flashcards (id, me, frente, verso, trimestre)\nVALUES\n"
        chunk += ",\n".join(values)
        chunk += "\nON CONFLICT (id) DO NOTHING;"
        all_sql.append(chunk)

out_path = os.path.join(os.path.dirname(__file__), "suplemento2_insert.sql")
with open(out_path, "w") as f:
    f.write("\n\n".join(all_sql))

print(f"\n✅ SQL gerado em: {out_path}")
print("Próximo passo: o Claude vai executar o SQL no Supabase automaticamente.")
