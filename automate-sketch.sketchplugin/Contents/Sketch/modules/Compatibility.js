// Keep changes to Sketch's native model behind explicit adapters. Do not patch
// Cocoa prototypes: doing so would also change the behavior of other plugins.
var sketch = require("sketch/dom");
var util = require("util");

function native(layer) { return layer && (layer.sketchObject || layer); }
function wrapped(layer) { return layer && (layer.sketchObject ? layer : sketch.fromNative(layer)); }

// Calendar versions contain two dots (2026.3.1); Number(version) becomes NaN.
module.exports.version = parseInt(String(require("sketch").version.sketch), 10) || 0;
module.exports.isModern = typeof MSArtboardGroup === "undefined";
module.exports.native = native;
module.exports.wrapped = wrapped;
module.exports.isArtboard = function(layer) {
    layer = native(layer);
    if (!layer) return false;
    if (String(layer.class()) === "MSArtboardGroup") return true;
    return String(layer.class()) === "MSLayerGroup" &&
        Boolean(wrapped(layer).isFrame);
};
module.exports.isGroup = function(layer) {
    layer = native(layer);
    return !!layer && String(layer.class()) === "MSLayerGroup" && !module.exports.isArtboard(layer);
};
module.exports.descendants = function(layer) {
    layer = native(layer);
    var result = NSMutableArray.array();
    function visit(parent) {
        if (!parent || typeof parent.layers !== "function") return;
        util.toArray(parent.layers()).forEach(function(child) {
            result.addObject(child);
            visit(child);
        });
    }
    visit(layer);
    return result;
};
module.exports.artboards = function(container) {
    container = native(container);
    var result = NSMutableArray.array();
    if (typeof container.pages === "function") {
        util.toArray(container.pages()).forEach(function(page) {
            result.addObjectsFromArray(module.exports.artboards(page));
        });
    } else if (typeof container.canvasFrames === "function") {
        result.addObjectsFromArray(container.canvasFrames());
    } else if (typeof container.artboards === "function") {
        result.addObjectsFromArray(container.artboards());
    }
    return result;
};
module.exports.createArtboard = function(rect) {
    var options = {};
    if (rect) options.frame = new sketch.Rectangle(rect);
    return new sketch.Artboard(options).sketchObject;
};
module.exports.fitGroup = function(layer) {
    if (!module.exports.isGroup(layer) && String(native(layer).class()) !== "MSShapeGroup") return;
    wrapped(layer).adjustToFit();
};
module.exports.originForNewArtboard = function(page, size) {
    page = native(page);
    if (typeof page.originForNewArtboardWithSize === "function") return page.originForNewArtboardWithSize(size);
    var layers = util.toArray(page.layers());
    var right = layers.reduce(function(max, layer) {
        return Math.max(max, Number(layer.frame().x()) + Number(layer.frame().width()));
    }, 0);
    return {x: layers.length ? right + 100 : 0, y: 0};
};
// Legacy absoluteRect callers expect a live rectangle with mutating setters.
module.exports.absoluteRect = function(layer) {
    layer = wrapped(layer);
    function rect() { return layer.frame.changeBasis({from: layer.parent}); }
    function set(key, value) {
        var next = rect();
        next[key] = Number(value);
        var local = next.changeBasis({to: layer.parent});
        layer.frame[key] = local[key];
    }
    return {
        x: function() { return rect().x; }, y: function() { return rect().y; },
        width: function() { return rect().width; }, height: function() { return rect().height; },
        rect: function() { return rect().asCGRect(); },
        setX: function(value) { set("x", value); }, setY: function(value) { set("y", value); },
        setRulerX: function(value) { set("x", value); }, setRulerY: function(value) { set("y", value); }
    };
};
module.exports.refreshInspector = function(document) {
    document = native(document);
    if (document && typeof document.reloadInspector === "function") document.reloadInspector();
};
module.exports.textAttribute = function(layer, key) {
    var value = native(layer).attributedStringValue();
    return value.length() ? value.attribute_atIndex_effectiveRange(key, 0, null) : null;
};
module.exports.setTextAttribute = function(layer, key, value, range) {
    layer = native(layer);
    var text = layer.attributedStringValue().mutableCopy();
    if (!text.length()) return;
    text.addAttribute_value_range(key, value, range || NSMakeRange(0, text.length()));
    layer.setAttributedStringValue(text);
};
module.exports.setTextBehavior = function(layer, behavior) {
    layer = wrapped(layer);
    if (module.exports.isModern) {
        layer.fixedWidth = behavior !== 0;
        if (behavior === 0) layer.adjustToFit();
    } else {
        native(layer).setTextBehaviour(behavior);
    }
};
module.exports.exporter = function(request, colorSpace) {
    if (typeof MSExporter.exporterForRequest_colorSpace === "function") return MSExporter.exporterForRequest_colorSpace(request, colorSpace);
    var exporter = MSExporter.exporterForRequest_colorSpace_options(request, colorSpace, 0);
    return {
        data:function() { return exporter.dataAndReturnError(null); },
        image:function() { return exporter.previewImageAndReturnError(null); },
        exportToFileURL:function(url) {
            var error = MOPointer.alloc().init();
            if (!exporter.exportToFileURL_error(url, error)) throw new Error(String(error.value() || "Export failed"));
        }
    };
};
module.exports.rulerData = function(layer, axis) {
    layer = native(layer);
    if (!layer) return null;
    var getter = axis + "RulerData";
    var setter = "set" + axis.charAt(0).toUpperCase() + axis.slice(1) + "RulerData";
    if (!layer[getter]()) layer[setter](MSRulerData.alloc().init());
    return layer[getter]();
};
module.exports.addGuide = function(ruler, value) {
    value = Number(value);
    if (!isFinite(value)) return;
    var guides = util.toArray(ruler.guides()).map(Number);
    if (guides.indexOf(value) === -1) { guides.push(value); ruler.setGuides(guides); }
};
module.exports.exportRequest = function(format, layer, rect, useID) {
    layer = native(layer);
    var copy = format.copy();
    if (!copy.fileFormat()) copy.setFileFormat("png");
    if (!(Number(copy.scale()) > 0)) copy.setScale(1);
    var exporter = MSSelfContainedHighLevelExporter.alloc().initWithOptions({formats:String(copy.fileFormat()),scales:"1"});
    var requests = exporter.exportRequestsForLayer_inRect_exportFormats(layer,CGRectNull,[copy.immutableModelObject()]);
    return requests.firstObject();
};
module.exports.saveExportRequest = function(document, request, path) {
    document = native(document);
    var folder = NSString.stringWithString(path).stringByDeletingLastPathComponent();
    NSFileManager.defaultManager().createDirectoryAtPath_withIntermediateDirectories_attributes_error(folder,true,null,null);
    var space = document.colorSpace();
    if (space && typeof space.CGColorSpace === "function") space = space.CGColorSpace();
    module.exports.exporter(request,space).exportToFileURL(NSURL.fileURLWithPath(path));
};
module.exports.allLibraries = function() { return NSArray.arrayWithArray(sketch.getLibraries().map(native)); };
module.exports.libraries = function() {
    return NSArray.arrayWithArray(sketch.getLibraries().filter(function(library) { return library.enabled && library.valid; }).map(native));
};
module.exports.libraryDocumentData = function(library) {
    return sketch.fromNative(library).getDocument()._getMSDocumentData();
};
module.exports.groupWithLayers = function(layers) {
    layers = util.toArray(layers).map(wrapped);
    if (!layers.length) throw new Error("Select at least one layer to group");
    var parent = layers[0].parent;
    var records = layers.map(function(layer) { return {layer:layer,frame:new sketch.Rectangle(layer.frame),index:layer.index}; });
    var x = Math.min.apply(null,records.map(function(item){return item.frame.x;}));
    var y = Math.min.apply(null,records.map(function(item){return item.frame.y;}));
    var right = Math.max.apply(null,records.map(function(item){return item.frame.x+item.frame.width;}));
    var bottom = Math.max.apply(null,records.map(function(item){return item.frame.y+item.frame.height;}));
    var group = new sketch.Group({name:"Group",parent:parent,frame:{x:x,y:y,width:right-x,height:bottom-y}});
    group.index = Math.min.apply(null,records.map(function(item){return item.index;}));
    records.forEach(function(item) {
        item.layer.parent = group;
        item.layer.frame = new sketch.Rectangle(item.frame.x-x,item.frame.y-y,item.frame.width,item.frame.height);
    });
    return group.sketchObject;
};

module.exports.symbolInstances = function(container) {
    return module.exports.descendants(container).filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("className == %@", "MSSymbolInstance"));
};

module.exports.action = function(document, identifier) {
    var controller = native(document).actionsController();
    return controller.actionForID(identifier) || controller.actionForID("Sketch." + identifier);
};

module.exports.performAction = function(document, identifier, sender) {
    var action=module.exports.action(document,identifier);
    if(!action || (typeof action.validate === "function" && !action.validate())) return false;
    var selector=typeof action.preferredMenuAction === "function" ? String(action.preferredMenuAction()) : "";
    var method=selector.replace(/:$/,"");
    if(method && typeof action[method] === "function") action[method](sender || null);
    else action.performAction(sender || null);
    return true;
};

module.exports.unlinkFromLibrary = function(object) {
    object=native(object);
    var foreign=object && typeof object.foreignObject === "function" && object.foreignObject();
    if(!foreign) return false;
    foreign.unlinkFromRemote();
    return true;
};
