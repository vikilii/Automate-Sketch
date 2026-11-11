var onRun = function(context) {
    function enabled(key) { return String(context[key]) === "true" || Number(context[key]) === 1; }
    var fs = {
        readFileSync:function(p){return String(NSString.stringWithContentsOfFile_encoding_error(p,NSUTF8StringEncoding,null));},
        writeFileSync:function(p,s){NSString.stringWithString(s).writeToFile_atomically_encoding_error(p,true,NSUTF8StringEncoding,null);}
    };
    var path = {
        join:function(){return Array.prototype.slice.call(arguments).join('/');},
        dirname:function(p){return p.slice(0,p.lastIndexOf('/'));},
        resolve:function(a,b){return String(NSString.stringWithString(a+'/'+b).stringByStandardizingPath());}
    };
    var root = String(context.plugin.url().path()).replace(/\/tests\/runner\.sketchplugin$/, '');
    var sourceRoot = path.join(root, 'automate-sketch.sketchplugin/Contents/Sketch');
    var sketch = require('sketch');
    var dom = require('sketch/dom');
    var originalDocument = sketch.getSelectedDocument();
    var UI = Object.assign({}, require('sketch/ui'));
    UI.alert = function() {};
    UI.getInputFromUser = function(title, options, callback) { callback(null, String(options.initialValue || '0')); };
    var clipboard = NSPasteboard.generalPasteboard();
    var savedClipboard = require('util').toArray(clipboard.pasteboardItems() || []).map(function(item) {
        var copy = NSPasteboardItem.alloc().init();
        require('util').toArray(item.types()).forEach(function(type) { var data = item.dataForType(type); if (data) copy.setData_forType(data,type); });
        return copy;
    });
    clipboard.clearContents();
    var document = new dom.Document();
    var result = {version: String(sketch.version.sketch), results: []};
    var dialog = require(path.join(sourceRoot, 'modules/Dialog'));
    var preferences = require(path.join(sourceRoot, 'modules/Preferences'));
    var system = require(path.join(sourceRoot, 'modules/System'));
    var testPreferences = {};
    preferences.get = function(key) { return testPreferences[key]; };
    preferences.set = function(key,value) { testPreferences[key] = value; };
    dialog.dialog.prototype.run = function() {
        if (context.clickButton) {
            var target;
            function visit(view) {
                if (target) return;
                if (typeof view.title === "function" && String(view.title()) === String(context.clickButton)) target=view;
                if (typeof view.documentView === "function" && view.documentView()) visit(view.documentView());
                if (typeof view.subviews === "function") require("util").toArray(view.subviews()).forEach(visit);
            }
            this.views.forEach(visit);
            if (!target) throw Error("Missing dialog button: " + context.clickButton);
            target.performClick(null);
        }
        return context.responseCode || 1000;
    };
    system.chooseFile = function() { return undefined; };
    system.chooseFolder = function() { return undefined; };
    system.savePanel = function() { return undefined; };
    var outputFolder = path.join(root, 'tests/.artifacts');
    NSFileManager.defaultManager().createDirectoryAtPath_withIntermediateDirectories_attributes_error(outputFolder,true,null,null);
    if (enabled("exportFiles")) {
        system.chooseFolder = function(){ return outputFolder; };
        system.savePanel = function(name){ return path.join(outputFolder,String(name || 'export')); };
        system.showInFinder = function() {};
    }
    if (enabled("inputFixture")) system.chooseFile=function(){return path.join(outputFolder,"Fixture.sketch");};
    var manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));

    var wanted = context.commands ? require("util").toArray(context.commands).map(String) : [];
    var mode = context.mode || 'smoke';
    var fixtureLibrary;
    if (enabled("library")) fixtureLibrary = dom.Library.getLibraryForDocumentAtPath(path.join(outputFolder,'Fixture.sketch'));
    function check(name, fn) {
        fs.writeFileSync(path.join(root,"tests/runtime-progress.json"),JSON.stringify({command:name,results:result.results}));
        try { var detail = fn(); result.results.push({name:name, status:'pass', detail:detail}); }
        catch(e) { result.results.push({name:name, status:'fail', error:String(e), stack:String(e.stack),properties:Object.getOwnPropertyNames(e).map(function(key){return key+':'+e[key];})}); }
    }
    try {
        sketch.getSelectedDocument = dom.getSelectedDocument = function() { return document; };
        sketch.getDocuments = dom.getDocuments = function() { return [document]; };
        var compat = require(path.join(sourceRoot, 'modules/Compatibility'));
        compat.libraries = compat.allLibraries = function() { return NSArray.arrayWithArray(fixtureLibrary ? [fixtureLibrary.sketchObject] : []); };
        check('compatibility/frame-detection', function() {
            var f = new dom.Artboard();
            if (!compat.isArtboard(f) || compat.isGroup(f)) throw Error('Frame misclassified');
        });
        manifest.commands.forEach(function(command) {
            if (!command.identifier || wanted.indexOf(command.identifier) === -1) return;
            var page = document.selectedPage;
            page.layers.slice().forEach(function(layer) { layer.remove(); });
            var frame = new dom.Artboard({name:'Frame', parent:page, frame:{x:100,y:100,width:400,height:400}});
            var group = new dom.Group({name:'Group',parent:frame,frame:{x:20,y:20,width:180,height:120}});
            var text = new dom.Text({name:'Title',text:'Hello 世界',parent:group,frame:{x:5,y:5,width:120,height:30}});
            var shape = new dom.ShapePath({name:'Rectangle',parent:group,frame:{x:5,y:50,width:100,height:50},style:{fills:['#ff0000']}});
            var master = new dom.SymbolMaster({name:'Component',parent:page,frame:{x:600,y:100,width:100,height:100}});
            new dom.Text({text:'Symbol text',parent:master});
            var instance = master.createNewInstance(); instance.parent = frame;
            var image = new dom.Image({name:'Bitmap',parent:group,frame:{x:130,y:50,width:20,height:20},image:dom.export(shape,{formats:'png',output:false})});
            var hidden = new dom.ShapePath({name:'Hidden',hidden:true,parent:group,frame:{x:160,y:50,width:10,height:10},style:{fills:['#00ff00']}});
            hidden.locked = true;
            new dom.Group({name:'Empty',parent:group});
            new dom.Slice({name:'Slice' ,parent:frame,frame:{x:250,y:250,width:20,height:20}});
            var selections = {slice:[frame.layers.find(function(l){return l.type === "Slice";})],text:[text],frame:[frame],group:[group],shape:[shape],image:[image],symbol:[master],instance:[instance],pair:[text,shape],empty:[]};
            var selectionKind = String(context.selectionKind || 'group');
            var selected = selections[selectionKind];
            if (selectionKind === 'icon') { selected = [frame]; frame.frame.width=512;frame.frame.height=512; }
            if (selectionKind === 'fixedText') { selected = [text]; text.fixedWidth = true; }
            if (enabled("sharedStyles")) {
                document.sharedLayerStyles = [];
                document.sharedTextStyles = [];
                var layerStyle = dom.SharedStyle.fromStyle({name:'Layer Style',style:shape.style,document:document});
                var textStyle = dom.SharedStyle.fromStyle({name:'Text Style',style:text.style,document:document});
                shape.sharedStyle = layerStyle;
                text.sharedStyle = textStyle;
                document.swatches = [{name:'Red',color:'#ff0000'}];
            }
            if (enabled("seedClipboard")) {
                var png = dom.export(image,{formats:'png',output:false});
                clipboard.clearContents();
                clipboard.setData_forType(png.toNSData(),NSPasteboardTypePNG);
            }
            document.selectedLayers = selected;
            check(command.identifier, function() {
                if (fixtureLibrary && enabled("seedImported")) {
                    fixtureLibrary.getImportableSymbolReferencesForDocument(document).forEach(function(ref){ instance.master = ref.import(); });
                    fixtureLibrary.getImportableTextStyleReferencesForDocument(document).forEach(function(ref){ text.sharedStyle = ref.import(); });
                    fixtureLibrary.getImportableLayerStyleReferencesForDocument(document).forEach(function(ref){ shape.sharedStyle = ref.import(); });
                }
                var filename = path.join(sourceRoot, command.script);
                var localRequire = function(name) {
                    if (/Google_Analytics$/.test(name)) return function() {};
                    if (name === 'sketch/ui') return UI;
                    if (name === 'sketch') return Object.assign({}, sketch, {UI:UI,getSelectedDocument:function(){return document;},getDocuments:function(){return [document];},getLibraries:function(){return fixtureLibrary ? [fixtureLibrary] : [];}});
                    if (name === 'sketch/dom') return Object.assign({}, dom, {getSelectedDocument:function(){return document;},getDocuments:function(){return [document];},getLibraries:function(){return fixtureLibrary ? [fixtureLibrary] : [];}});
                    return require(name[0] === '.' ? path.resolve(path.dirname(filename), name) : name);
                };
                var commandShim = {identifier:function(){return command.identifier;},pluginBundle:function(){return context.plugin;}};
                var commandContext = {document:document.sketchObject,selection:NSArray.arrayWithArray(selected.map(function(l){return l.sketchObject;})),plugin:context.plugin,command:commandShim};
                var source = fs.readFileSync(filename, 'utf8');
                fs.writeFileSync(path.join(root, 'tests/runtime-progress.json'),JSON.stringify({command:command.identifier,results:result.results}));
                var handler = new Function('require','__command','module',source+'\nreturn '+(command.handler || 'onRun')+';')(localRequire,commandShim,{exports:{}});
                handler(commandContext);
                return {layers: page.layers.length,selection:document.selectedLayers.layers.map(function(l){return l.name;})};
            });
        });
    if (enabled("semantic")) require(root+'/tests/semantic')({dom:dom,document:document,sourceRoot:sourceRoot,context:context,check:check,outputFolder:outputFolder});
    } finally {
        if (fixtureLibrary) fixtureLibrary.remove();
        document.close();
        clipboard.clearContents();
        if (savedClipboard.length) clipboard.writeObjects(savedClipboard);
        if (originalDocument) originalDocument.selectedPage.selected = true;
    }
    var output = context.output || path.join(root,'tests/runtime-results.json');
    fs.writeFileSync(output,JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
};

var createFixture = function(context) {
    var dom = require('sketch/dom');
    var doc = new dom.Document();
    var master = new dom.SymbolMaster({name:'Component',parent:doc.selectedPage,frame:{x:0,y:0,width:100,height:100}});
    var text = new dom.Text({name:'Label',text:'Library label',parent:master});
    var shape = new dom.ShapePath({name:'Rectangle',frame:{x:0,y:30,width:100,height:70},parent:master,style:{fills:['#ff0000']}});
    dom.SharedStyle.fromStyle({name:'Text Style',style:text.style,document:doc});
    dom.SharedStyle.fromStyle({name:'Layer Style',style:shape.style,document:doc});
    doc.swatches = [{name:'Red',color:'#ff0000'}];
    new dom.Artboard({name:'Library Frame',parent:doc.selectedPage,frame:{x:200,y:0,width:200,height:200}});
    doc.save(String(context.output),{},function(error) {
        if (error) console.log(String(error));
        else console.log('Fixture saved');
        doc.close();
    });
};
