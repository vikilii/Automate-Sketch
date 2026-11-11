var onRun = function() {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var document = sketch.getSelectedDocument();
    document.selectedLayers.layers.forEach(function(layer) {
        var target = layer.getParentArtboard() || layer.getParentPage();
        var rect = layer.frame.changeBasis({from:layer.parent,to:target});
        var horizontal = compatibility.rulerData(target,"horizontal");
        var vertical = compatibility.rulerData(target,"vertical");
        compatibility.addGuide(horizontal,Math.floor(rect.x));
        compatibility.addGuide(horizontal,Math.ceil(rect.x+rect.width));
        compatibility.addGuide(vertical,Math.floor(rect.y));
        compatibility.addGuide(vertical,Math.ceil(rect.y+rect.height));
    });
    if (!document.sketchObject.isRulersVisible()) {
        var action = compatibility.action(document.sketchObject,"MSToggleRulersAction");
        if (action && action.validate()) compatibility.performAction(document,"MSToggleRulersAction");
    }
};
