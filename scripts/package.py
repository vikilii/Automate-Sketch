#!/usr/bin/env python3
"""Build an installable archive from the checked-in plugin bundle."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / 'automate-sketch.sketchplugin'
VERSION = json.loads((BUNDLE / 'Contents/Sketch/manifest.json').read_text())['version']
OUTPUT = ROOT / 'dist' / f'Automate-Sketch-{VERSION}.zip'
OUTPUT.parent.mkdir(exist_ok=True)
with ZipFile(OUTPUT, 'w', ZIP_DEFLATED) as archive:
    for source in sorted(BUNDLE.rglob('*')):
        if source.is_file() and '.DS_Store' not in source.parts:
            archive.write(source, source.relative_to(ROOT))
    for name in ['LICENSE', 'COMPATIBILITY-2026.3.1.md']:
        archive.write(ROOT / name, name)
print(OUTPUT)
