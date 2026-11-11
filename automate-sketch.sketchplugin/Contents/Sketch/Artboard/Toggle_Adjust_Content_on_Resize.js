var onRun = function() {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var settings = require("sketch/settings");
    var frames = sketch.getSelectedDocument().selectedLayers.layers.filter(function(layer) {
        return compatibility.isArtboard(layer) || layer.type === "SymbolMaster";
    });
    if (!frames.length) { require("sketch/ui").message("Please select at least 1 frame or symbol master."); return; }
    var key = "automate.contentSizingBeforeResize";
    var enable = frames.every(function(frame) { return !settings.layerSettingForKey(frame, key); });
    frames.forEach(function(frame) {
        if (enable) {
            var previous = {};
            frame.layers.forEach(function(child) {
                previous[child.id] = {horizontalSizing:child.horizontalSizing,verticalSizing:child.verticalSizing,horizontalPins:child.horizontalPins,verticalPins:child.verticalPins};
                child.horizontalPins = sketch.Pin.None;
                child.verticalPins = sketch.Pin.None;
                child.horizontalSizing = sketch.FlexSizing.Relative;
                child.verticalSizing = sketch.FlexSizing.Relative;
            });
            settings.setLayerSettingForKey(frame, key, previous);
        } else {
            var previous = settings.layerSettingForKey(frame, key) || {};
            frame.layers.forEach(function(child) {
                var sizing = previous[child.id];
                if (!sizing) return;
                Object.keys(sizing).forEach(function(property) { child[property] = sizing[property]; });
            });
            settings.setLayerSettingForKey(frame, key, undefined);
        }
    });
    require("sketch/ui").message(enable ? "Relative content sizing enabled." : "Previous content sizing restored.");
};
