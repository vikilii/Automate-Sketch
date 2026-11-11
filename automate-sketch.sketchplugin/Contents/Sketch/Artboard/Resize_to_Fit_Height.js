var onRun = function(context) {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var document = sketch.getSelectedDocument();
    var seen = {};
    document.selectedLayers.layers.forEach(function(layer) {
        var frame = compatibility.isArtboard(layer) || layer.type === "SymbolMaster" ? layer : layer.getParentArtboard();
        if (!frame || seen[frame.id] || !frame.layers.length) return;
        seen[frame.id] = true;
        var children = frame.layers.map(function(child) { return {layer:child, frame:new sketch.Rectangle(child.frame)}; });
        var key = String(context.command.identifier()) === "resize_to_fit_width" ? "width" : "height";
        var axis = key === "width" ? "x" : "y";
        frame.frame[key] = Math.max(0, Math.ceil(Math.max.apply(null, children.map(function(child) { return child.frame[axis] + child.frame[key]; }))));
        children.forEach(function(child) { child.layer.frame = child.frame; });
    });
};
