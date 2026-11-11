var onRun = function() {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var document = sketch.getSelectedDocument();
    var symbols = [];
    document.selectedLayers.layers.forEach(function(layer) {
        if (layer.type === "SymbolMaster" || layer.type === "Slice") return;
        var frame = layer;
        if (!compatibility.isArtboard(layer)) {
            if (compatibility.isGroup(layer)) layer.convertToFrame();
            else {
                var parent = layer.parent, index = layer.index;
                frame = new sketch.Artboard({name:layer.name,parent:parent,frame:layer.frame,background:{enabled:false}});
                frame.index = index;
                layer.parent = frame;
                layer.frame.x = 0;
                layer.frame.y = 0;
            }
        }
        symbols.push(sketch.SymbolMaster.fromFrame(frame));
    });
    if (symbols.length) document.selectedLayers = symbols;
};
