#!/usr/bin/env python3
"""Serialize fixture-based regression tests in the installed Sketch app."""
import json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUTPUT=ROOT/'tests/.artifacts/reports'
OUTPUT.mkdir(parents=True,exist_ok=True)
suites=json.loads((ROOT/'tests/suites.json').read_text())
fixture=ROOT/'tests/.artifacts/Fixture.sketch'
if not fixture.exists():
    subprocess.run(['/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool','run',str(ROOT/'tests/runner.sketchplugin'),'create-fixture','--context='+json.dumps({'output':str(fixture)}),'--without-activating=YES','--timeout=20'],check=True,timeout=30)
reports=[]
for suite in suites:
    print(suite['name'],flush=True)
    destination=OUTPUT/(suite['name']+'.json')
    args=[sys.executable,str(ROOT/'tests/run-runtime.py'),'--selection',suite['selection'],*suite['flags'],'--commands',*suite['commands'],'--output',str(destination)]
    completed=subprocess.run(args,cwd=ROOT)
    if not destination.exists(): raise SystemExit('No report for '+suite['name'])
    report=json.loads(destination.read_text())
    reports.append({'suite':suite['name'],**report})
    if completed.returncode: print('Failure in '+suite['name'],flush=True)
failures=[{'suite':report['suite'],**case} for report in reports for case in report['results'] if case['status']!='pass']
commands=sorted({case['name'] for report in reports for case in report['results'] if not case['name'].startswith(('compatibility/','semantic/'))})
manifest=json.loads((ROOT/'automate-sketch.sketchplugin/Contents/Sketch/manifest.json').read_text())
all_commands={c['identifier'] for c in manifest['commands'] if c.get('identifier')}
summary={'pluginVersion':manifest['version'],'date':'2026-11-11','sketchVersion':reports[0]['version'],'suites':len(reports),'executions':sum(len(r['results']) for r in reports),'failures':failures,'commandCount':len(commands),'commands':commands,'notExecuted':sorted(all_commands-set(commands)),'results':reports}
(ROOT/'tests/verification-results.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
print(str(summary['executions'])+' cases; '+str(len(commands))+' distinct commands; '+str(len(failures))+' failures')
raise SystemExit(bool(failures))
