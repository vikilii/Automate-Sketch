var themeDom = require("sketch/dom");
var themeCompatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Library");

    var sketch = require("sketch");
    var document = sketch.getSelectedDocument();

    if (document.selectedLayers.length == 0) {
        sketch.UI.message("Please select at least 1 layer.");
        return;
    }

    var Dialog = require("../modules/Dialog").dialog;
    var ui = require("../modules/Dialog").ui;
    var preferences = require("../modules/Preferences");

    var dialog = new Dialog("Theme Switcher", "Find and replace symbols, styles, colors that match the key word.");

    dialog.addLabel("Key Word");
    var wrap = ui.view(25);
    var fromTextView = ui.textField(preferences.get("themeSwitcherKeyFrom") || "Light", [0, 0, 100, 25]);
    var toTextView = ui.textField(preferences.get("themeSwitcherKeyTo") || "Dark", [125, 0, 100, 25]);
    var textView = ui.textLabel('→', [105, 5, 20, 25]);
    wrap.addSubview(fromTextView);
    wrap.addSubview(toTextView);
    wrap.addSubview(textView);
    dialog.addView(wrap);

    var checkboxSymbol = ui.checkBox(preferences.get("themeSwitcherSymbol") || true, "Replace Symbols.");
    var checkboxLayerStyle = ui.checkBox(preferences.get("themeSwitcherLayerStyle") || true, "Replace Layer Styles.");
    var checkboxTextStyle = ui.checkBox(preferences.get("themeSwitcherTextStyle") || true, "Replace Text styles.");
    var checkboxColor = ui.checkBox(preferences.get("themeSwitcherColor") || true, "Replace color variables.");

    dialog.addView(checkboxSymbol);
    dialog.addView(checkboxLayerStyle);
    dialog.addView(checkboxTextStyle);
    dialog.addView(checkboxColor);

    var responseCode = dialog.run();
    if (responseCode == 1000) {

        preferences.set("themeSwitcherKeyFrom", fromTextView.stringValue());
        preferences.set("themeSwitcherKeyTo", toTextView.stringValue());
        preferences.set("themeSwitcherSymbol", Boolean(checkboxSymbol.state()));
        preferences.set("themeSwitcherLayerStyle", Boolean(checkboxLayerStyle.state()));
        preferences.set("themeSwitcherTextStyle", Boolean(checkboxTextStyle.state()));
        preferences.set("themeSwitcherColor", Boolean(checkboxColor.state()));
        var from = String(fromTextView.stringValue()), to = String(toTextView.stringValue());
        if (!from || from === to) { sketch.UI.message("Enter two different theme keywords."); return; }
        var count = applyTheme(document, document.selectedLayers.layers, from, to, {
            symbols:Boolean(checkboxSymbol.state()),layerStyles:Boolean(checkboxLayerStyle.state()),
            textStyles:Boolean(checkboxTextStyle.state()),colors:Boolean(checkboxColor.state())
        });
        sketch.UI.message("Updated " + count + " theme references.");
    }

}
// Resolve names before importing so only assets actually used by the selection
// are added to the document. Existing local assets take precedence.
function applyTheme(document, roots, from, to, options) {
    var dom = themeDom, compatibility = themeCompatibility;
    var libraries = dom.getLibraries().filter(function(l){return l.enabled && l.valid;});
    function index(local, method) {
        var result = {};
        local.forEach(function(item){result[item.name]={get:function(){return item;}};});
        libraries.forEach(function(library){
            library[method](document).forEach(function(ref){
                if (!result[ref.name]) result[ref.name]={get:function(){return ref.import();}};
            });
        });
        return result;
    }
    var symbols = options.symbols ? index(document.getSymbols(),"getImportableSymbolReferencesForDocument") : {};
    var layerStyles = options.layerStyles ? index(document.sharedLayerStyles,"getImportableLayerStyleReferencesForDocument") : {};
    var textStyles = options.textStyles ? index(document.sharedTextStyles,"getImportableTextStyleReferencesForDocument") : {};
    var colors = options.colors ? index(document.swatches,"getImportableSwatchReferencesForDocument") : {};
    var bySymbolID = {}, byStyleID = {}, colorMap = {};
    document.getSymbols().forEach(function(s){bySymbolID[s.symbolId]=s;});
    document.sharedLayerStyles.concat(document.sharedTextStyles).forEach(function(s){byStyleID[s.id]=s;});
    document.swatches.forEach(function(s){
        var replacement = match(colors,s.name);
        if(replacement) colorMap[s.color]=replacement;
    });
    function match(map,name) {
        if (!name || name.indexOf(from) === -1) return;
        return map[name.split(from).join(to)];
    }
    var layers=[],seen={};
    roots.forEach(function(root){
        [root].concat(require("util").toArray(compatibility.descendants(root)).map(dom.fromNative)).forEach(function(layer){
            if(!seen[layer.id]) {seen[layer.id]=true;layers.push(layer);}
        });
    });
    var count=0;
    layers.forEach(function(layer){
        if (options.symbols && layer.type === "SymbolInstance") {
            var replacement=match(symbols,layer.master && layer.master.name);
            if(replacement) { layer.master=replacement.get();count++; }
        }
        var shared=layer.sharedStyle;
        if(shared) {
            var styles=layer.type === "Text" ? textStyles : layerStyles;
            var replacement=match(styles,shared.name);
            if(replacement) { var target=replacement.get(); layer.sharedStyle=target; layer.style=target.style;count++; }
        }
        if(options.colors && layer.style) {
            layer.style.fills.concat(layer.style.borders).forEach(function(part){
                if(part.fillType === "Color" && colorMap[part.color]) {part.color=colorMap[part.color].get().referencingColor;count++;}
            });
            if(layer.type === "Text" && colorMap[layer.style.textColor]) {layer.style.textColor=colorMap[layer.style.textColor].get().referencingColor;count++;}
        }
        if(layer.type === "SymbolInstance") layer.overrides.forEach(function(override){
            if(!override.editable || override.isDefault) return;
            var original,target;
            if(options.symbols && override.property === "symbolID") {
                original=bySymbolID[override.value];target=original && match(symbols,original.name);
                if(target) {override.value=target.get().symbolId;count++;}
            } else if(override.property === "layerStyle" || override.property === "textStyle") {
                original=byStyleID[override.value];
                target=original && match(override.property === "textStyle" ? textStyles : layerStyles,original.name);
                if(target) {override.value=target.get().id;count++;}
            }
        });
    });
    return count;
}
module.exports.applyTheme = applyTheme;
