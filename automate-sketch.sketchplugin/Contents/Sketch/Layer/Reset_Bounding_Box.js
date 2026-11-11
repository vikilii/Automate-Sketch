var onRun = function() {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var document = sketch.getSelectedDocument();
    function reset(layer) {
        if (compatibility.isGroup(layer) || layer.type === "Shape") {
            layer.sketchObject.moveTransformsToChildren();
            layer.layers.slice().forEach(reset);
            compatibility.fitGroup(layer);
        } else if (layer.type === "ShapePath") {
            // Bake the affine transform into both anchors and Bezier handles.
            var matrix = layer.sketchObject.transformForConvertingToParentCoordinateSpace();
            var width = layer.frame.width, height = layer.frame.height;
            var coords = [];
            function transform(point) {
                var x = point.x * width, y = point.y * height;
                var result = {x:matrix.a*x + matrix.c*y + matrix.tx,y:matrix.b*x + matrix.d*y + matrix.ty};
                coords.push(result);
                return result;
            }
            var points = layer.points.map(function(point) {
                return {point:transform(point.point),curveFrom:transform(point.curveFrom),curveTo:transform(point.curveTo),pointType:point.pointType,cornerRadius:point.cornerRadius};
            });
            if (!coords.length) return;
            var x = Math.min.apply(null,coords.map(function(p){return p.x;}));
            var y = Math.min.apply(null,coords.map(function(p){return p.y;}));
            var w = Math.max(0.001,Math.max.apply(null,coords.map(function(p){return p.x;}))-x);
            var h = Math.max(0.001,Math.max.apply(null,coords.map(function(p){return p.y;}))-y);
            points.forEach(function(point) {
                ["point","curveFrom","curveTo"].forEach(function(key) {
                    point[key] = {x:(point[key].x-x)/w,y:(point[key].y-y)/h};
                });
            });
            layer.transform.rotation = 0;
            layer.transform.flippedHorizontally = false;
            layer.transform.flippedVertically = false;
            layer.frame = new sketch.Rectangle(x,y,w,h);
            layer.points = points;
        }
    }
    document.selectedLayers.layers.forEach(reset);
};
