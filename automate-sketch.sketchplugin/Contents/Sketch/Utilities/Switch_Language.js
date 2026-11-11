var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Utilities");

    var sketch = require("sketch");
    var Dialog = require("../modules/Dialog").dialog;
    var ui = require("../modules/Dialog").ui;
    var system = require("../modules/System");

    if (compatibility.version < 54) {
        sketch.UI.message("Switch language is only run on Sketch 54+.");
        return;
    }

    var sketchSupportLanguages = [];
    system.getSubFolders(system.getAppPath() + "/Contents/Resources").forEach(function(item) {
        if (/\.lproj$/.test(item) && item.replace(/\.lproj$/, "") != "Base") {
            sketchSupportLanguages.push(item.replace(/\.lproj$/, ""));
        }
    });

    var userDefaults = NSUserDefaults.standardUserDefaults();
    var countryCode = String(NSLocale.currentLocale().countryCode());
    var systemLanguage = String(NSLocale.currentLocale().collatorIdentifier()).replace("-" + countryCode, "");
    var languages=userDefaults.objectForKey("AppleLanguages") || NSLocale.preferredLanguages();
    var sketchLanguage=(languages && languages.count() ? String(languages.firstObject()) : "en").replace("-" + countryCode, "");
    if (!sketchSupportLanguages.length) {sketch.UI.message("No application localizations found.");return;}

    var sketchLanguageIndex = 0;
    var languageTitles = [];
    sketchSupportLanguages.forEach(function(item, index) {
        var title = NSLocale.localeWithLocaleIdentifier(item).displayNameForKey_value(NSLocaleIdentifier, item);
        if (item == sketchLanguage) {
            title += "*";
            sketchLanguageIndex = index;
        }
        languageTitles.push(title);
    });

    var dialog = new Dialog(
        "Switch Language",
        "You need to restart Sketch app to apply changed."
    );

    var changeLanguage = ui.popupButton(languageTitles, 300);
    dialog.addView(changeLanguage);
    changeLanguage.selectItemAtIndex(sketchLanguageIndex);

    // defaults delete com.bohemiancoding.sketch3 AppleLanguages 
    // defaults write com.bohemiancoding.sketch3 AppleLanguages '("en")'  
    var responseCode = dialog.run();
    if (responseCode == 1000) {
        var selectedLanguage = sketchSupportLanguages[changeLanguage.indexOfSelectedItem()];
        if (selectedLanguage != sketchLanguage) {
            userDefaults.setObject_forKey([selectedLanguage], "AppleLanguages");
            if (selectedLanguage == systemLanguage) {
                userDefaults.removeObjectForKey("AppleLanguages");
            }
            userDefaults.synchronize();
        }
    }

};