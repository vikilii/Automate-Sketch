var preferences = require("../modules/Preferences");

function currentLanguage() {
    var languages = NSUserDefaults.standardUserDefaults().objectForKey("AppleLanguages");
    return languages && languages.count() && /^zh/i.test(String(languages.firstObject())) ? "zh" : "en";
}

var onRun = function(context) {
    var Dialog = require("../modules/Dialog").dialog;
    var ui = require("../modules/Dialog").ui;
    var codes = ["auto", "zh", "en"];
    var dialog = new Dialog("Change Plugin Menu Language");
    var popup = ui.popupButton(["Auto", "简体中文", "English"], 300);
    var index = codes.indexOf(String(preferences.get("pluginLanguage") || "auto"));
    popup.selectItemAtIndex(Math.max(0,index));
    dialog.addView(popup);
    if (dialog.run() == 1000) {
        var language = codes[popup.indexOfSelectedItem()];
        reloadManifest(context, language === "auto" ? currentLanguage() : language);
        preferences.set("pluginLanguage", language);
    }
};

var onOpenDocument = function(context) {
    var language = preferences.get("pluginLanguage");
    if (!language || language === "auto") reloadManifest(context,currentLanguage());
};

function reloadManifest(context, language) {
    var source = context.plugin.urlForResourceNamed("manifest_" + (language === "zh" ? "zh" : "en") + ".json");
    if (!source) return;
    var target = context.plugin.url().path() + "/Contents/Sketch/manifest.json";
    var text = NSString.stringWithContentsOfURL_encoding_error(source,NSUTF8StringEncoding,null);
    var previous = NSString.stringWithContentsOfFile_encoding_error(target,NSUTF8StringEncoding,null);
    if (!text || (previous && String(previous) === String(text))) return;
    var error = MOPointer.alloc().init();
    if (!text.writeToFile_atomically_encoding_error(target,true,NSUTF8StringEncoding,error)) {
        throw new Error("Unable to update plugin language: " + error.value());
    }
    AppController.sharedInstance().pluginManager().reloadPlugins();
}
