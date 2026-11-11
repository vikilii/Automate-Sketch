// Runs only against the disposable document created by runner.js.
module.exports = function(env) {
    var dom=env.dom, doc=env.document, root=env.sourceRoot, check=env.check;
    var compatibility=require(root+'/modules/Compatibility');
    function assert(value,message) { if(!value) throw Error(message); }
    function close(a,b) { return Math.abs(a-b)<0.001; }
    var suppliedValues;
    function execute(id,layers,extra) {
        var manifest=JSON.parse(String(NSString.stringWithContentsOfFile_encoding_error(root+'/manifest.json',NSUTF8StringEncoding,null)));
        var command=manifest.commands.find(function(c){return c.identifier===id;});
        if(id==='supply_calendar') command={identifier:id,script:'Data/Supply_Data.js',handler:'onSupplyCalendar'};
        var filename=root+'/'+command.script;
        doc.selectedLayers=layers;
        var req=function(name) {
            if(name==='sketch'||name==='sketch/dom') return Object.assign({},dom,{UI:{message:function(){}},getSelectedDocument:function(){return doc;}});
            if(name==='sketch/data-supplier') return {supplyDataAtIndex:function(key,value,index){suppliedValues[index]=value;}};
            if(name==='sketch/ui') return {message:function(){}};
            return require(name[0]==='.' ? String(NSString.stringWithString(filename.substring(0,filename.lastIndexOf('/'))+'/'+name).stringByStandardizingPath()) : name);
        };
        var source=String(NSString.stringWithContentsOfFile_encoding_error(filename,NSUTF8StringEncoding,null));
        var handler=new Function('require','__command','module',source+'\nreturn '+(command.handler||'onRun')+';')(req,{identifier:function(){return id;},pluginBundle:function(){return env.context.plugin;}},{exports:{}});
        handler({document:doc.sketchObject,selection:NSArray.arrayWithArray(layers.map(function(l){return l.sketchObject;})),plugin:env.context.plugin,command:{identifier:function(){return id;}},data:extra});
    }
    function clean() {doc.selectedPage.layers.slice().forEach(function(l){l.remove();});}
    function fixture() {
        clean();
        var frame=new dom.Artboard({name:'Test frame',parent:doc.selectedPage,frame:{x:100,y:100,width:300,height:300}});
        var group=new dom.Group({name:'Test group',parent:frame,frame:{x:20,y:30,width:160,height:100}});
        var shape=new dom.ShapePath({name:'Test shape',parent:group,frame:{x:10,y:15,width:100,height:50},style:{fills:['#ff0000']}});
        return {frame:frame,group:group,shape:shape};
    }
    check('semantic/frame-group-roundtrip',function(){
        var f=fixture(),id=f.group.id,child=f.shape.id;
        var before=f.shape.frame.changeBasis({from:f.shape.parent});
        execute('artboard_from_group',[f.group]);
        var converted=doc.getLayerWithID(id);
        assert(converted.isFrame,'Group did not become frame');
        execute('artboard_to_group',[converted]);
        converted=doc.getLayerWithID(id);
        assert(!converted.isFrame,'Frame did not become group');
        var after=doc.getLayerWithID(child).frame.changeBasis({from:converted});
        assert(close(before.x,after.x)&&close(before.y,after.y),'Child moved during conversion');
        assert(doc.getLayerWithID(child).style.fills[0].color==='#ff0000ff','Fill lost');
    });
    check('semantic/empty-frame-to-group',function(){
        clean();var frame=new dom.Artboard({parent:doc.selectedPage});var id=frame.id;
        execute('artboard_to_group',[frame]);assert(!doc.getLayerWithID(id).isFrame,'Empty frame retained frame behavior');
    });
    check('semantic/empty-cleanup-preserves-frames',function(){
        var f=fixture();var outer=new dom.Group({parent:f.frame});new dom.Group({parent:outer});
        var nested=new dom.Group.Frame({name:'Empty frame',parent:f.frame});var nestedID=nested.id;
        execute('remove_empty_groups',[f.frame]);
        assert(!doc.getLayerWithID(outer.id),'Newly empty parent survived');
        assert(doc.getLayerWithID(nestedID).isFrame,'Empty frame removed');
        assert(doc.getLayerWithID(f.shape.id),'Nonempty content removed');
    });
    check('semantic/ungroup-all-preserves-frames-and-position',function(){
        var f=fixture(),before=f.shape.frame.changeBasis({from:f.shape.parent});
        var nested=new dom.Group({parent:f.group});new dom.ShapePath({parent:nested});
        execute('remove_all_groups',[f.frame]);
        assert(!compatibility.descendants(f.frame).filteredArrayUsingPredicate(NSPredicate.predicateWithFormat('className == %@','MSLayerGroup')).count(),'Nested ordinary groups remain');
        var shape=doc.getLayerWithID(f.shape.id),after=shape.frame.changeBasis({from:shape.parent});
        assert(f.frame.isFrame&&close(before.x,after.x)&&close(before.y,after.y),'Frame or child position changed');
    });
    check('semantic/relative-sizing-restores-pins',function(){
        var f=fixture(),child=f.group;
        child.horizontalSizing=dom.FlexSizing.Fixed;child.verticalSizing=dom.FlexSizing.Fixed;
        child.horizontalPins=dom.Pin.Min;child.verticalPins=dom.Pin.Max;
        var keys=['horizontalSizing','verticalSizing','horizontalPins','verticalPins'];
        var before=keys.map(function(k){return child[k];});
        execute('toggle_adjust_content_on_resize',[f.frame]);
        assert(child.horizontalSizing===dom.FlexSizing.Relative,'Relative sizing not enabled');
        execute('toggle_adjust_content_on_resize',[f.frame]);
        assert(keys.every(function(k,i){return child[k]===before[i];}),'Original sizing or pins lost');
    });
    check('semantic/reset-bounds-preserves-transformed-anchors',function(){
        var f=fixture(),shape=f.shape;shape.transform.rotation=37;shape.transform.flippedHorizontally=true;
        var id=shape.id,m=shape.sketchObject.transformForConvertingToParentCoordinateSpace(),w=shape.frame.width,h=shape.frame.height;
        var anchors=shape.points.map(function(p){var x=p.point.x*w,y=p.point.y*h;return {x:m.a*x+m.c*y+m.tx,y:m.b*x+m.d*y+m.ty};});
        var before=dom.export(f.frame,{formats:'png',output:false});
        before.toNSData().writeToFile_atomically(env.outputFolder+'/bounds-before.png',true);
        execute('reset_bounding_box',[shape]);
        assert(shape.id===id&&shape.transform.rotation===0&&!shape.transform.flippedHorizontally,'Identity or transform incorrect');
        assert(shape.points.every(function(p,i){return close(shape.frame.x+p.point.x*shape.frame.width,anchors[i].x)&&close(shape.frame.y+p.point.y*shape.frame.height,anchors[i].y);}), 'Anchors moved after reset');
        dom.export(f.frame,{formats:'png',output:false}).toNSData().writeToFile_atomically(env.outputFolder+'/bounds-after.png',true);
    });
    check('semantic/guides-relative-to-frame',function(){
        var f=fixture();execute('new_guides_from_layer',[f.shape]);
        var x=require('util').toArray(compatibility.rulerData(f.frame,'horizontal').guides()).map(Number);
        var y=require('util').toArray(compatibility.rulerData(f.frame,'vertical').guides()).map(Number);
        assert(x.indexOf(30)!==-1&&x.indexOf(130)!==-1&&y.indexOf(45)!==-1&&y.indexOf(95)!==-1,'Incorrect guide coordinates');
        execute('new_guides_from_layer',[f.shape]);
        assert(compatibility.rulerData(f.frame,'horizontal').guides().count()===2,'Duplicate guides');
    });
    check('semantic/insert-symbol-instance',function(){
        clean();var master=new dom.SymbolMaster({name:'Component',parent:doc.selectedPage});new dom.Text({parent:master,text:'Default'});
        execute('insert_instance_of_selected_symbol',[master]);
        var selected=doc.selectedLayers.layers;
        assert(selected.length===1&&selected[0].type==='SymbolInstance'&&selected[0].master.id===master.id,'Incorrect inserted instance');
    });
    check('semantic/reset-overrides',function(){
        clean();var master=new dom.SymbolMaster({parent:doc.selectedPage});new dom.Text({parent:master,text:'Default'});
        var instance=master.createNewInstance();instance.parent=doc.selectedPage;
        var override=instance.overrides.find(function(o){return o.property==='stringValue';});
        override.value='Changed';execute('reset_overrides',[instance]);
        assert(instance.overrides.filter(function(o){return !o.isDefault;}).length===0,'Overrides not reset');
    });
    check('semantic/linked-layer-create-and-sync',function(){
        var f=fixture();execute('create_link_layer',[f.group]);
        var instance=doc.selectedLayers.layers[0];assert(instance.type==='SymbolInstance','Linked instance not inserted');
        f.shape.style.fills=['#00ff00'];execute('sync_link_layers',[]);
        assert(instance.master.layers[0].style.fills[0].color==='#00ff00ff','Linked instance did not sync');
    });
    check('semantic/graphic-toggle-roundtrip',function(){
        var f=fixture(),id=f.group.id;execute('toggle_select_groups_content_on_click',[f.group]);
        var group=doc.getLayerWithID(id);assert(group.isGraphicFrame,'Graphic conversion failed');
        execute('toggle_select_groups_content_on_click',[group]);assert(!doc.getLayerWithID(id).isFrame,'Group conversion failed');
    });
    check('semantic/fractional-png-export',function(){
        var f=fixture();var format=MSExportFormat.alloc().init();format.setFileFormat('png');format.setScale(1.5);
        var request=compatibility.exportRequest(format,f.shape,null,false);
        var path=env.outputFolder+'/fractional.png';compatibility.saveExportRequest(doc.sketchObject,request,path);
        var rep=NSBitmapImageRep.imageRepWithData(NSData.dataWithContentsOfFile(path));
        assert(Number(rep.pixelsWide())===150&&Number(rep.pixelsHigh())===75,'Fractional PNG dimensions incorrect');
    });
    check('semantic/text-to-outlines',function(){
        clean();var text=new dom.Text({name:'Outline me',parent:doc.selectedPage,text:'Hello 世界'});var id=text.id;
        execute('convert_to_outlines',[text]);
        assert(!doc.getLayerWithID(id) || doc.getLayerWithID(id).type !== 'Text','Text not converted');
        assert(doc.selectedLayers.layers.length>0 && doc.selectedLayers.layers.every(function(l){return l.type!=='Text';}),'No outline selection');
    });
    check('semantic/theme-replaces-symbol-style-color',function(){
        clean();
        var light=new dom.SymbolMaster({name:'Light/Component',parent:doc.selectedPage});new dom.Text({parent:light,text:'Light'});
        var dark=new dom.SymbolMaster({name:'Dark/Component',parent:doc.selectedPage});new dom.Text({parent:dark,text:'Dark'});
        var instance=light.createNewInstance();instance.parent=doc.selectedPage;
        var shape=new dom.ShapePath({parent:doc.selectedPage,style:{fills:['#ff0000']}});
        var oldStyle=dom.SharedStyle.fromStyle({name:'Light/Surface',style:shape.style,document:doc});shape.sharedStyle=oldStyle;
        var targetShape=new dom.ShapePath({parent:doc.selectedPage,style:{fills:['#0000ff']}});
        var newStyle=dom.SharedStyle.fromStyle({name:'Dark/Surface',style:targetShape.style,document:doc});
        doc.swatches=[{name:'Light/Accent',color:'#ff0000'},{name:'Dark/Accent',color:'#00ff00'}];
        var colorShape=new dom.ShapePath({parent:doc.selectedPage,style:{fills:['#ff0000']}});
        var theme=require(root+'/Library/Theme_Switcher');
        var count=theme.applyTheme(doc,[instance,shape,colorShape],'Light','Dark',{symbols:true,layerStyles:true,textStyles:true,colors:true});
        assert(count>=3 && instance.master.id===dark.id,'Theme symbol did not change');
        assert(shape.sharedStyle.id===newStyle.id && shape.style.fills[0].color==='#0000ffff','Theme style did not change');
        assert(colorShape.style.fills[0].color==='#00ff00ff','Theme color did not change');
    });
    check('semantic/nine-slice-produces-nine-images',function(){
        var f=fixture();var image=new dom.Image({parent:f.frame,frame:{x:20,y:30,width:200,height:150},image:dom.export(f.shape,{formats:'png',output:false})});
        execute('nine_slice_from_bitmap_layer',[image]);
        var group=doc.selectedLayers.layers[0];assert(group.type==='Group' && group.layers.length===9,'Nine image regions not created');
        assert(group.layers.every(function(l){return l.type==='Image'&&l.frame.width>0&&l.frame.height>0;}),'Invalid crop geometry');
        var right=Math.max.apply(null,group.layers.map(function(l){return l.frame.x+l.frame.width;}));
        var bottom=Math.max.apply(null,group.layers.map(function(l){return l.frame.y+l.frame.height;}));
        assert(close(right,200)&&close(bottom,150),'Nonuniform source scaling was lost');
    });
    check('semantic/fixed-text-retains-width',function(){
        clean();var text=new dom.Text({parent:doc.selectedPage,text:'A long paragraph with enough words to wrap across several lines.',fixedWidth:true,frame:{x:20,y:30,width:80,height:300}});
        execute('resize_fit_text_height',[text]);
        assert(text.fixedWidth&&close(text.frame.width,80)&&text.frame.height>20&&text.frame.height<300,'Text width or fitted height incorrect');
    });

    check('semantic/remove-disabled-styles-includes-selected-layer',function(){
        clean();var shape=new dom.ShapePath({parent:doc.selectedPage,style:{fills:[{color:'#ff0000',enabled:true},{color:'#00ff00',enabled:false}],borders:[{color:'#000000',enabled:false}]}});
        execute('remove_all_disabled_styles',[shape]);
        assert(shape.style.fills.length===1&&shape.style.borders.length===0,'Disabled style parts remain');
    });

    check('semantic/paste-style-from-layer-clipboard',function(){
        clean();var source=new dom.ShapePath({parent:doc.selectedPage,style:{fills:['#123456'],borders:[{color:'#abcdef',thickness:4}]}});
        var target=new dom.ShapePath({parent:doc.selectedPage,style:{fills:['#ff0000']}});
        // Eager data avoids fulfilling a promised clipboard representation while
        // the same plugin invocation still owns Sketch's main thread.
        var board=NSPasteboard.generalPasteboard();board.clearContents();
        var archive=MSPasteboardLayers.pasteboardLayersWithLayers([source.sketchObject]);
        board.setData_forType(archive.archivedDataWithVersion('2026.3.1'),'com.bohemiancoding.sketch.v3');
        execute('paste_style_fills',[target]);
        assert(target.style.fills[0].color==='#123456ff','Copied fill not applied');
        execute('paste_style_borders',[target]);assert(target.style.borders[0].thickness===4,'Copied border not applied');
    });

    check('semantic/union-shapes-in-frame',function(){
        clean();var frame=new dom.Artboard({parent:doc.selectedPage});
        new dom.ShapePath({parent:frame,frame:{x:0,y:0,width:100,height:100},style:{fills:['#ff0000']}});
        new dom.ShapePath({parent:frame,frame:{x:50,y:0,width:100,height:100},style:{fills:['#ff0000']}});
        execute('union_layer',[frame]);
        assert(frame.layers.length===1&&frame.layers[0].type==='Shape','Shapes were not combined');
        assert(frame.isFrame,'Frame was converted or removed');
    });

    check('semantic/calendar-lunar-days-and-cycle-years',function(){
        clean();var ui=require(root+'/modules/Dialog').ui,oldPopup=ui.popupButton,oldDate=ui.datePicker,kind;
        ui.popupButton=function(items,size){var p=oldPopup.call(ui,items,size);if(items.indexOf('甲子')!==-1) p.selectItemAtIndex(kind);return p;};
        ui.datePicker=function(){var p=oldDate.call(ui);var formatter=NSISO8601DateFormatter.alloc().init();p.setDateValue(formatter.dateFromString('2026-02-17T12:00:00+08:00'));return p;};
        try {
            kind=17;suppliedValues=[];execute('supply_calendar',[],{key:'fixture',requestedCount:3});
            assert(suppliedValues[0]==='初一'&&suppliedValues[1]==='初二','Lunar day names incorrect');
            kind=18;suppliedValues=[];execute('supply_calendar',[],{key:'fixture',requestedCount:3});
            assert(suppliedValues[0]&&suppliedValues[0]!=='初一'&&suppliedValues[1]==='初二','First lunar day was not replaced with month');
            kind=19;suppliedValues=[];execute('supply_calendar',[],{key:'fixture',requestedCount:3});
            assert(suppliedValues.every(function(v){return typeof v==='string'&&v.length>=2&&v!=='undefined';}),'Cycle years were converted to undefined days');
        } finally {ui.popupButton=oldPopup;ui.datePicker=oldDate;}
    });
    check('semantic/cross-document-symbol-clipboard',function(){
        clean();var source=new dom.Document();
        try {
            var master=new dom.SymbolMaster({name:'Clipboard component',parent:source.selectedPage});new dom.Text({parent:master,text:'Clipboard content'});
            var instance=master.createNewInstance();instance.parent=source.selectedPage;
            var board=NSPasteboard.generalPasteboard();board.clearContents();
            var archive=MSPasteboardLayers.pasteboardLayersWithLayers([instance.sketchObject]);
            board.setData_forType(archive.archivedDataWithVersion('2026.3.1'),'com.bohemiancoding.sketch.v3');
            var pasteboard=require(root+'/modules/Pasteboard');
            var contents=pasteboard.getPasteboardLayers(doc);
            var pasted=pasteboard.insertLayers(contents,doc.selectedPage.sketchObject,{x:10,y:20});
            assert(pasted.length===1&&pasted[0].type==='SymbolInstance'&&pasted[0].master,'Symbol definition lost on paste');
            assert(pasted[0].master.layers[0].text==='Clipboard content','Pasted symbol contents missing');
        } finally {source.close();}
    });
    check('semantic/language-manifest-atomic-and-idempotent',function(){
        var file=root+'/Help/Change_Languages.js';var source=String(NSString.stringWithContentsOfFile_encoding_error(file,NSUTF8StringEncoding,null));
        var reloads=0,folder=env.outputFolder+'/language-plugin';
        NSFileManager.defaultManager().createDirectoryAtPath_withIntermediateDirectories_attributes_error(folder+'/Contents/Sketch',true,null,null);
        var req=function(name){return require(String(NSString.stringWithString(root+'/Help/'+name).stringByStandardizingPath()));};
        var app={sharedInstance:function(){return {pluginManager:function(){return {reloadPlugins:function(){reloads++;}};}};}};
        var functions=new Function('require','AppController',source+'\nreturn {onRun:onRun,reloadManifest:reloadManifest};')(req,app);
        var plugin={url:function(){return NSURL.fileURLWithPath(folder);},urlForResourceNamed:function(name){return NSURL.fileURLWithPath(root.replace(/Sketch$/,'Resources/')+name);}};
        var target=folder+'/Contents/Sketch/manifest.json';NSFileManager.defaultManager().removeItemAtPath_error(target,null);
        functions.reloadManifest({plugin:plugin},'zh');functions.reloadManifest({plugin:plugin},'zh');
        var manifest=JSON.parse(String(NSString.stringWithContentsOfFile_encoding_error(target,NSUTF8StringEncoding,null)));
        assert(reloads===1&&manifest.identifier==='com.ashung.hung.automate_sketch','Language reload duplicated or corrupted manifest');
    });

};
