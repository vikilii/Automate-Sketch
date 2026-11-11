var onRun = function() {
    var dom = require("sketch/dom");
    var selected = dom.getSelectedDocument().selectedLayers.layers;
    if (!selected.length) { require("sketch/ui").message("Please select at least 1 text layer."); return; }
    selected.filter(function(layer){return layer.type === "Text" && layer.fixedWidth;}).forEach(function(layer) {
        var top=layer.frame.y, middle=top+layer.frame.height/2, bottom=top+layer.frame.height;
        var alignment=layer.style.verticalAlignment;
        // Keep wrapping at the existing width while fitting the text height.
        layer.adjustToFit();
        if (alignment === dom.Text.VerticalAlignment.center) layer.frame.y=middle-layer.frame.height/2;
        else if (alignment === dom.Text.VerticalAlignment.bottom) layer.frame.y=bottom-layer.frame.height;
        else layer.frame.y=top;
    });
};
