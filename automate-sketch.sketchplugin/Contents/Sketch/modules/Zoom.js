var sketch = require("sketch/dom");
var compatibility=require("./Compatibility");
function document() { return sketch.getSelectedDocument(); }
function view() { var doc = document(); return doc && doc.sketchObject.contentDrawView(); }
Object.defineProperty(module.exports,"zoomValue",{get:function(){ var v=view(); return v ? Number(v.zoomValue()) : 1; }});
module.exports.toActualSize = function() { var v=view(); if(v) v.zoomToActualSizeAnimated(true); };
module.exports.toFitCanvas = function() { var doc=document(); if(doc) doc.zoomToFitCanvas(); };
module.exports.toSelection = function() { var doc=document(); if(doc) compatibility.performAction(doc,"MSZoomToSelectionAction"); };
