chrome.app.runtime.onLaunched.addListener(() => {
  var width;
  var height;
  if (screen.availWidth > screen.availHeight) {
    width = Math.round(screen.availWidth*0.6/50)*50;
    height = Math.round(width*3/4);
  } else {
    height = Math.round(screen.availHeight*0.6);
    width = Math.round(height*3/4/50)*50;
  }
  chrome.storage.local.get(["framelessWindow"], result => {
    var frame = result.framelessWindow == true ? "none" : "chrome";
    chrome.app.window.create("radiocast.html", { id: "radiocast", outerBounds: { width: width, height: height }, frame: { type: frame } });
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "settings", title: "Settings", contexts: ["launcher", "page"], documentUrlPatterns: ["chrome-extension://*/radiocast.html"] });
  chrome.storage.sync.get(null, sync => {
    for (var item in sync) {
      if (!isNaN(Number(item))) {
        return;
      }
    }
    loadDefaultSettings();
  });
})

chrome.contextMenus.onClicked.addListener(e => {
  if(e.menuItemId == "settings") {
    chrome.app.window.create("settings.html", { id: "RadioCastSettings" });
  }
});

function loadDefaultSettings()
{
  fetch("default.json")
    .then(response => response.json())
    .then(settings => {
      var stationItems = {};
      for (i = 0; i < settings.stations.length; i++) {
        stationItems[i] = settings.stations[i];
      }
      chrome.storage.sync.set(stationItems);
    });
}