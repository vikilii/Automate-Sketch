const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..', 'automate-sketch.sketchplugin/Contents');
const scripts = path.join(root, 'Sketch');
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const files=walk(scripts).filter(f=>f.endsWith('.js'));
function exact(file) {
  assert(fs.existsSync(file), `Missing ${file}`);
  let dir=path.parse(file).root;
  for(const piece of file.slice(dir.length).split(path.sep)) {
    assert(fs.readdirSync(dir).includes(piece), `Incorrect case: ${file}`);
    dir=path.join(dir,piece);
  }
}
for(const file of files) {
  const source=fs.readFileSync(file,'utf8');
  new vm.Script(source,{filename:file});
  for(const match of source.matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
    let resolved=path.resolve(path.dirname(file),match[1]);
    if (!path.extname(resolved)) resolved+='.js';
    exact(resolved);
  }
}
const manifests=['Sketch/manifest.json','Resources/manifest_en.json','Resources/manifest_zh.json'].map(f=>JSON.parse(fs.readFileSync(path.join(root,f))));
const ids=m=>m.commands.map(c=>c.identifier).filter(Boolean).sort();
for(const manifest of manifests) {
  assert.equal(new Set(ids(manifest)).size,ids(manifest).length,'Duplicate command IDs');
  assert.deepEqual(ids(manifest),ids(manifests[0]),'Language command mismatch');
  assert.equal(manifest.version,manifests[0].version);
  assert.equal(manifest.compatibleVersion,manifests[0].compatibleVersion);
  for(const command of manifest.commands) {
    const file=path.join(scripts,command.script); exact(file);
    const src=fs.readFileSync(file,'utf8');
    const handlers=command.handlers ? Object.values(command.handlers).flatMap(h=>typeof h==='object'?Object.values(h):[h]) : [command.handler||'onRun'];
    for(const handler of handlers) assert(new RegExp(`(?:var|function)\\s+${handler}\\b`).test(src),`Missing handler ${handler} in ${file}`);
  }
  function menu(items) { for(const item of items) { if(typeof item==='object') menu(item.items||[]); else if(item!=='-') assert(ids(manifest).includes(item),`Unknown menu ID ${item}`); } }
  menu(manifest.menu.items);
}
console.log(`${files.length} scripts parsed; local imports, handlers, and ${ids(manifests[0]).length} command IDs checked in all three manifests.`);
