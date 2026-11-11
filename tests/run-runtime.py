#!/usr/bin/env python3
"""Run commands against disposable documents inside the installed Sketch app."""
import argparse,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
TOOL='/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool'
parser=argparse.ArgumentParser()
parser.add_argument('--input-fixture',action='store_true')
parser.add_argument('--semantic',action='store_true')
parser.add_argument('--click-button')
parser.add_argument('--response-code',type=int,default=1000)
parser.add_argument('--library',action='store_true')
parser.add_argument('--seed-imported',action='store_true')
parser.add_argument('--shared-styles',action='store_true')
parser.add_argument('--seed-clipboard',action='store_true')
parser.add_argument('--export-files',action='store_true')
parser.add_argument('--selection',default='group')
parser.add_argument('--commands',nargs='+',required=True)
parser.add_argument('--output',default='tests/runtime-results.json')
args=parser.parse_args()
context={'inputFixture':args.input_fixture,'semantic':args.semantic,'clickButton':args.click_button,'responseCode':args.response_code,'library':args.library,'seedImported':args.seed_imported,'sharedStyles':args.shared_styles,'seedClipboard':args.seed_clipboard,'exportFiles':args.export_files,'selectionKind':args.selection,'commands':args.commands,'output':str(ROOT/args.output)}
context={k:v for k,v in context.items() if v is not None}
output_path=ROOT/args.output
output_path.unlink(missing_ok=True)
r=subprocess.run([TOOL,'run',str(ROOT/'tests/runner.sketchplugin'),'run-tests','--context='+json.dumps(context),'--without-activating=YES','--timeout=45'],capture_output=True,text=True,timeout=55)
if r.stderr: print(r.stderr)
if not (ROOT/args.output).exists():raise SystemExit('Sketch did not produce a report')
report=json.loads((ROOT/args.output).read_text())
failures=[r for r in report['results'] if r['status']=='fail']
for failure in failures: print(failure["name"],failure["error"])
print(f"{len(report['results'])-len(failures)} passed, {len(failures)} failed")
raise SystemExit(bool(failures))
