var onRun = function() {
    var fiber=require("sketch/async").createFiber();
    var sampler=NSColorSampler.alloc().init();
    var pasteboard=require("../modules/Pasteboard"),UI=require("sketch/ui");
    sampler.showSamplerWithSelectionHandler(function(color){
        try {
            if(!color) return;
            color=color.colorUsingColorSpace(NSColorSpace.sRGBColorSpace());
            function hex(component) {return ("0"+Math.round(Math.max(0,Math.min(1,component))*255).toString(16)).slice(-2);}
            var value="#"+hex(color.redComponent())+hex(color.greenComponent())+hex(color.blueComponent());
            pasteboard.copy(value);
            UI.message("Color code " + value + " copied.");
        } finally {fiber.cleanup();}
    });
};
