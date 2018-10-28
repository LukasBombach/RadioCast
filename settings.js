function exportSettings() {
  chrome.fileSystem.chooseEntry({ type: "saveFile", suggestedName: "radiosettings.json", accepts: [{ description: "JSON files (*.json)", extensions: ["json"] }], acceptsAllTypes: true }, entry => {
    entry.createWriter(writer => {
      var truncated = false;
      writer.onwriteend = e => {
        if (!truncated) {
          truncated = true;
          this.truncate(this.position);
          return;
        }
      };
      var textarea = document.getElementById("settings");
      writer.write(new Blob([textarea.value]), { type: "text/plain" });
    });
  });
}

function importSettings() {
  chrome.fileSystem.chooseEntry({ type: "openFile", suggestedName: "radiosettings.json", accepts: [{ description: "JSON files (*.json)", extensions: ["json"] }], acceptsAllTypes: true }, entry => {
    entry.file(file => {
      var reader = new FileReader();
      reader.onload = e => {
        var textarea = document.getElementById("settings");
        textarea.value = e.target.result;
      };
      reader.readAsText(file);
    });
  });
}
  
function defaultSettings() {
  fetch("default.json")
    .then(response => response.json())
    .then(json => {
        var textarea = document.getElementById("settings");
        textarea.value = JSON.stringify(json, null, 2);
    });
}
  
function ok() {
  var textarea = document.getElementById("settings");
  var settings = null;
  try {
    settings = JSON.parse(textarea.value);
  } catch (e) {
    document.getElementById("message").textContent = e.message;
    document.getElementById("dialog").showModal();
    return;
  }
  chrome.storage.local.set({ "iconSize": settings.iconSize, "framelessWindow": settings.framelessWindow });
  chrome.storage.sync.set({ "defaultWebpage": settings.defaultWebpage, "castWebpage": settings.castWebpage });
  chrome.storage.sync.get(null, sync => {
    var stationCount = 0;
    for (var item in sync) {
      if (!isNaN(Number(item))) {
        stationCount++;
      }
    }
    var stationItems = {};
    for (i = 0; i < settings.stations.length; i++) {
      stationItems[i] = settings.stations[i];
    }
    chrome.storage.sync.set(stationItems);
    if (settings.stations.length < stationCount) {
      var remove = [];
      for (i = settings.stations.length; i < stationCount; i++) {
        remove.push(i.toString());
      }
      chrome.storage.sync.remove(remove);
    }
    close();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("exportSettings").onclick = exportSettings;
  document.getElementById("importSettings").onclick = importSettings;
  document.getElementById("defaultSettings").onclick = defaultSettings;
  document.getElementById("ok").onclick = ok;
  document.getElementById("cancel").onclick = () => close();
  document.getElementById("dialogOk").onclick = () => document.getElementById("dialog").close();

  chrome.storage.local.get(["iconSize", "framelessWindow"], local => {
    var settings = {};
    settings.iconSize = local.iconSize || 50;
    settings.framelessWindow = local.framelessWindow || false;
    chrome.storage.sync.get(null, sync => {
      settings.defaultWebpage = sync.defaultWebpage || "";
      settings.castWebpage = sync.castWebpage || false;
      var stations = [];
      for (var item in sync) {
        if (!isNaN(Number(item))) {
          stations[item] = sync[item];
        }
        settings.stations = stations;
      }
      var json = JSON.stringify(settings, null, 2);
      var textarea = document.getElementById("settings");
      textarea.value = json;
    });
  });
});