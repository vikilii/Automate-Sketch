#!/usr/bin/env python3
"""Validate real exports, including image dimensions and HTML dependencies."""
import json, struct
from pathlib import Path
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent
ART=ROOT/'.artifacts'
images=list(ART.rglob('*.png'))
for file in images:
    data=file.read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n',file
    width,height=struct.unpack('>II',data[16:24])
    assert width>0 and height>0,file
fractional=struct.unpack('>II',(ART/'fractional.png').read_bytes()[16:24])
assert fractional==(150,75),fractional
svg_files=list(ART.glob('*.svg'))
for file in svg_files: assert ET.parse(file).getroot().tag.endswith('svg'),file
icon=(ART/'icon.icns').read_bytes()
assert icon[:4]==b'icns' and struct.unpack('>I',icon[4:8])[0]==len(icon)
class Images(HTMLParser):
    def handle_starttag(self,tag,attrs):
        if tag=='img':
            src=dict(attrs).get('src','')
            if src and not src.startswith(('data:','http:','https:')): assert (ART/src).exists(),src
parser=Images();parser.feed((ART/'index.html').read_text())
from PIL import Image,ImageChops
before=Image.open(ART/'bounds-before.png').convert('RGBA')
after=Image.open(ART/'bounds-after.png').convert('RGBA')
assert before.size==after.size and not any(ImageChops.difference(before,after).getextrema()[i][1] for i in range(4)),'Reset bounds changed pixels'
report={'pngFiles':len(images),'svgFiles':len(svg_files),'fractionalPNG':[150,75],'icnsValid':True,'htmlImagesExist':True,'resetBoundsPixelIdentical':True}
(ROOT/'artifact-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
