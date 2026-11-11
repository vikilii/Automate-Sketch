var onRun = function() {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var document = sketch.getSelectedDocument();
    var frames = [];
    document.selectedLayers.layers.forEach(function(layer) {
        if (compatibility.isArtboard(layer) || layer.type === "SymbolMaster") return;
        if (compatibility.isGroup(layer)) {
            layer.convertToFrame();
            frames.push(layer);
            return;
        }
        var parent = layer.parent;
        var index = layer.index;
        var frame = new sketch.Artboard({name:layer.name, parent:parent, frame:layer.frame});
        frame.index = index;
        layer.parent = frame;
        layer.frame.x = 0;
        layer.frame.y = 0;
        frames.push(frame);
    });
    if (frames.length) document.selectedLayers = frames;
};
