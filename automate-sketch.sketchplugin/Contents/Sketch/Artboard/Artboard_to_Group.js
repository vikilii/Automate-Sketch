var onRun = function() {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var document = sketch.getSelectedDocument();
    var frames = document.selectedLayers.layers.filter(compatibility.isArtboard);
    if (!frames.length) { require("sketch/ui").message("Select artboard first."); return; }
    frames.forEach(function(frame) {
        // Converting in place preserves the frame's style, children, and order.
        if (typeof frame.convertToGroup === "function") {
            // The SDK skips empty frames; native conversion supports them.
            frame.sketchObject.convertToGroup();
        }
    });
};
