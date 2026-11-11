var compatibility = require("./Compatibility");
var sketch = require("sketch");
var version = compatibility.version;
var pasteboard = NSPasteboard.generalPasteboard();

module.exports.copy = function(text) {
    pasteboard.clearContents();
    pasteboard.setString_forType(text, NSPasteboardTypeString);
};

module.exports.getPasteboardLayers = function(document) {
    document = document || sketch.getSelectedDocument();
    if (!document) return;
    if (!document.sketchObject) document = sketch.fromNative(document);
    var pasteboardManager = NSApp.delegate().pasteboardManager();
    var pasteboardLayers;
    if (typeof pasteboardManager.readPasteboardLayersFromPasteboard_document_textOptions === "function") {
        pasteboardLayers = pasteboardManager.readPasteboardLayersFromPasteboard_document_textOptions(pasteboard, document._getMSDocumentData(), 0);
    } else if (version >= 96) {
        pasteboardLayers = pasteboardManager.readPasteboardLayersFromPasteboard_document_options(
            pasteboard, nil, nil
        );
    } else if (version >= 74) {
        pasteboardLayers = pasteboardManager.readPasteboardLayersFromPasteboard_document_options(
            pasteboard, document.sketchObject, nil
        );
    } else if (version >= 64) {
        pasteboardLayers = pasteboardManager.readPasteboardLayersFromPasteboard_colorSpace_options_convertColorSpace(
            pasteboard, document.sketchObject.colorSpace(), nil, true
        );
    } else if (version >= 48) {
        pasteboardLayers = pasteboardManager.readPasteboardLayersFromPasteboard_colorSpace_options(
            pasteboard, document.sketchObject.colorSpace(), nil
        );
    } else {
        pasteboardLayers = pasteboardManager.readPasteboardLayersFromPasteboard_options(pasteboard, nil);
    }
    return pasteboardLayers;
}

module.exports.getLayers = function(document, importDependencies) {
    var contents = this.getPasteboardLayers(document);
    if (!contents) return NSArray.array();
    if (importDependencies && document) module.exports.importDependencies(contents,compatibility.wrapped(document)._getMSDocumentData());
    if (version >= 96) {
        return contents.layers();
    } else {
        return contents.layers().layers();
    }
};

module.exports.setImage = function(nsData) {
    pasteboard.clearContents();
    pasteboard.setData_forType(nsData, NSPasteboardTypePNG);
};

module.exports.setText = function(text) {
    pasteboard.clearContents();
    pasteboard.setString_forType(text, NSPasteboardTypeString);
};

module.exports.getTextsNsArray = function() {
    var data = pasteboard.dataForType(NSPasteboardTypeString);
    if (!data) return NSArray.array();
    var text = NSString.alloc().initWithData_encoding(data, NSUTF8StringEncoding);
    var texts = text.componentsSeparatedByCharactersInSet(NSCharacterSet.newlineCharacterSet());
    return texts;
};

module.exports.getText = function() {
    var pasteboardItems = pasteboard.pasteboardItems();
    if (pasteboardItems.count() > 0) {
        return pasteboardItems.firstObject().stringForType(NSPasteboardTypeString);
    }
};

module.exports.isEmpty = function() {
    return pasteboard.pasteboardItems().count() == 0;
}

module.exports.isSupportedType = function() {
    var supportedPasteboardTypes = [
        "public.jpeg",
        "public.gif",
        "public.png",
        "public.tiff", // Photoshop
        "com.adobe.pdf",
        "com.adobe.illustrator.aicb", // Illustrator
        "com.bohemiancoding.sketch.v3", // Sketch
        "com.seriflabs.persona.nodes" // Affinity Designer
    ];
    return require("util").toArray(pasteboard.types() || []).some(function(type) {
        return supportedPasteboardTypes.indexOf(String(type)) !== -1;
    });
}

module.exports.insertLayers = function(contents, parent, position, after) {
    if (!contents) return [];
    var dom = require("sketch/dom");
    var layers = require("util").toArray(contents.layers()).map(function(layer) { return dom.fromNative(layer); });
    if (!layers.length) return [];
    var left = Math.min.apply(null,layers.map(function(layer){return layer.frame.x;}));
    var top = Math.min.apply(null,layers.map(function(layer){return layer.frame.y;}));
    parent = dom.fromNative(parent);
    module.exports.importDependencies(contents,parent.sketchObject.documentData());
    var index = after ? dom.fromNative(after).index + 1 : parent.layers.length;
    layers.forEach(function(layer,i) {
        var frame = new dom.Rectangle(layer.frame);
        layer.parent = parent;
        layer.index = index + i;
        layer.frame.x = Number(position.x) + frame.x - left;
        layer.frame.y = Number(position.y) + frame.y - top;
    });
    return layers;
};

// Clipboard layer archives carry definitions separately from their instances.
// Attach those definitions before reparenting the layers into the destination.
module.exports.importDependencies = function(contents, data) {
    if(!contents || !data) return;
    var util=require("util"),dom=require("sketch/dom");
    function values(key) {
        if(typeof contents[key] !== "function") return [];
        var items=contents[key]();
        if(items && typeof items.allValues === "function") items=items.allValues();
        return util.toArray(items || []);
    }
    function mutable(object) {return typeof object.newMutableCounterpart === "function" ? object.newMutableCounterpart() : object.copy();}
    values("localSymbols").forEach(function(master){
        if(!data.symbolWithID(master.symbolID())) data.symbolsPageOrCreateIfNecessary().addLayer(mutable(master));
    });
    values("foreignSymbols").forEach(function(foreign){
        if(!data.symbolWithID(foreign.symbolMaster().symbolID())) data.addForeignSymbol(mutable(foreign));
    });
    values("localVariantSets").forEach(function(group){
        if(!data.layerWithID(group.objectID())) data.symbolsPageOrCreateIfNecessary().addLayer(mutable(group));
    });
    values("sharedStyles").forEach(function(style){
        var wrapped=dom.fromNative(style);
        var container=wrapped.styleType === "Text" ? data.layerTextStyles() : data.layerStyles();
        if(!container.sharedStyleWithID(style.objectID())) container.addSharedObject(mutable(style));
    });
    values("sharedSwatches").forEach(function(swatch){
        var collection=data.sharedSwatches();
        if(!collection.sharedObjectWithID(swatch.objectID())) collection.addSharedObjects([mutable(swatch)]);
    });
};
