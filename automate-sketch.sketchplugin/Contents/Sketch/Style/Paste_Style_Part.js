var onRun = function(context) {
    var dom=require("sketch/dom"), UI=require("sketch/ui");
    var document=dom.getSelectedDocument(), layers=document.selectedLayers.layers;
    if(!layers.length) {UI.message("Please select at least 1 layer.");return;}
    var style=styleFromClipboard(document);
    if(!style) {UI.message("Copy a layer or use Edit > Copy > Copy Style first.");return;}
    var identifier=String(context.command.identifier());
    var properties={paste_style_fills:"fills",paste_style_borders:"borders",paste_style_shadows:"shadows",paste_style_innershadows:"innerShadows",paste_style_blur:"blur"};
    layers.forEach(function(layer){
        if(!layer.style) return;
        var property=properties[identifier];
        if(property) {layer.style[property]=style[property];return;}
        if(layer.type!=="Text" || !style.sketchObject.textStyle()) return;
        if(identifier==="paste_text_style") {
            var color=layer.style.textColor;
            layer.sketchObject.style().setTextStyle(style.sketchObject.textStyle().copy());
            layer.style.textColor=color;
        } else if(identifier==="paste_text_color") layer.style.textColor=style.textColor;
        else if(identifier==="paste_text_font") {
            layer.style.fontFamily=style.fontFamily;
            layer.style.fontWeight=style.fontWeight;
            layer.style.fontStyle=style.fontStyle;
        }
    });
};

function styleFromClipboard(document) {
    var dom=require("sketch/dom"), board=NSPasteboard.generalPasteboard();
    // Pasteboard UTI order is unspecified. Find the style archive by content.
    var items=require("util").toArray(board.pasteboardItems() || []);
    for(var i=0;i<items.length;i++) {
        var types=require("util").toArray(items[i].types());
        for(var j=0;j<types.length;j++) {
            try {
                var raw=items[i].stringForType(types[j]);
                if(!raw || String(raw).charAt(0)!=="{") continue;
                var archive=JSON.parse(String(raw));
                var style=archive.root && archive.root.style;
                if(!style) continue;
                var decoded=MSJSONDictionaryUnarchiver.alloc().initForReadingFromDictionary(style).decodeRoot();
                if(decoded) return dom.fromNative(MSStyle.alloc().initWithImmutableModelObject(decoded));
            } catch(error) { /* A different clipboard representation; try the next. */ }
        }
    }
    // Modern Sketch layer copies carry their styles in the layer archive.
    var clipboard=require("../modules/Pasteboard");
    if(!clipboard.isSupportedType()) return;
    var contents=clipboard.getLayers(document);
    if(contents && contents.count()) {
        var layer=dom.fromNative(contents.firstObject());
        if(layer.style) return layer.style;
    }
}
