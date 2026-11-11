var sketch = require("sketch/dom");

function imageForLayer(layer, width, height, temporary) {
    layer = layer.sketchObject ? layer : sketch.fromNative(layer);
    var document = temporary ? new sketch.Document() : null;
    if (temporary) layer.parent = document.selectedPage;
    try {
        var scale = width && height ? Math.min(width / Math.max(1, layer.frame.width), height / Math.max(1, layer.frame.height)) * 2 : 1;
        var data = sketch.export(layer, {formats:"png",output:false,scales:String(scale)});
        if (!data) return null;
        return NSImage.alloc().initWithData(data.toNSData());
    } finally {
        if (temporary) { layer.remove(); document.close(); }
    }
}
module.exports.symbol = function(layer, size) { return imageForLayer(layer, Array.isArray(size) ? size[0] : size, Array.isArray(size) ? size[1] : size, false); };
module.exports.artboard = module.exports.symbol;
module.exports.library = function(library) {
    var reader = MSDocumentReader.readerForDocumentAtURL(library.locationOnDisk());
    return reader && reader.containsLibraryPreviewImage() ? reader.libraryPreviewImage() : NSImage.imageNamed("NSFolder");
};
module.exports.document = function(document) {
    if (!document.fileURL()) return null;
    var reader = MSDocumentReader.readerForDocumentAtURL(document.fileURL());
    return reader && reader.containsPreviewImage() ? reader.previewImage() : null;
};
function textPreview(sharedStyle, small) {
    var style = sharedStyle.sketchObject ? sharedStyle : sketch.fromNative(sharedStyle);
    var text = new sketch.Text({text:small ? "Aa" : style.name,style:style.style});
    text.style.fontSize = Math.min(text.style.fontSize, small ? 18 : 32);
    text.adjustToFit();
    var frame = new sketch.Artboard({frame:{x:0,y:0,width:small ? 24 : Math.max(1,text.frame.width),height:small ? 24 : Math.max(1,text.frame.height)},background:{enabled:true,color:"#dddddd"},layers:[text]});
    text.frame.x = small ? (24 - text.frame.width) / 2 : 0;
    text.frame.y = small ? (24 - text.frame.height) / 2 : 0;
    return imageForLayer(frame, frame.frame.width, frame.frame.height, true);
}
module.exports.textStyle = function(style) { return textPreview(style, false); };
module.exports.textStyleSmall = function(style) { return textPreview(style, true); };
module.exports.layerStyle = function(style, size) {
    size = size || 24;
    var wrapped = style.sketchObject ? style : sketch.fromNative(style);
    var shape = new sketch.ShapePath({frame:{x:2,y:2,width:size-4,height:size-4},style:wrapped.style});
    var frame = new sketch.Artboard({frame:{x:0,y:0,width:size,height:size},layers:[shape]});
    return imageForLayer(frame, size, size, true);
};
function fillPreview(fill) {
    var shape = new sketch.ShapePath({shapeType:sketch.ShapePath.ShapeType.Oval,frame:{x:0,y:0,width:20,height:20},style:{fills:[fill],borders:[{color:"#00000033",thickness:1,position:"Inside"}]}});
    return imageForLayer(shape, 20, 20, true);
}
module.exports.color = function(color) {
    var value = color.sketchObject || color;
    return fillPreview({fillType:"Color",color:"rgba(" + [value.red()*255,value.green()*255,value.blue()*255,value.alpha()].join(",") + ")"});
};
module.exports.gradient = function(gradient) {
    var style = MSStyle.alloc().init();
    var fill = style.addStylePartOfType(0);
    fill.setFillType(1);
    fill.setGradient(gradient);
    var shape = new sketch.ShapePath({shapeType:sketch.ShapePath.ShapeType.Oval,frame:{x:0,y:0,width:20,height:20},style:sketch.fromNative(style)});
    return imageForLayer(shape, 20, 20, true);
};
