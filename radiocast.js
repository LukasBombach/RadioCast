window["__onGCastApiAvailable"] = isAvailable => {
  if (isAvailable) {
    var castContext = cast.framework.CastContext.getInstance();
    castContext.setOptions({
      receiverApplicationId: "F1AF6B92",
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      resumeSavedSession: true
    });
    castContext.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, e => {
      switch (e.sessionState) {
        case cast.framework.SessionState.SESSION_STARTING:
          showWebpage(img);
          break;
        case cast.framework.SessionState.SESSION_RESUMED:
          if (img) {
            showWebpage(img);
          } else {
            var media = e.session.getMediaSession();
            var name = media && media.media && media.media.metadata ? media.media.metadata.title : null;
            if (name) {
              var url = null;
              chrome.storage.sync.get(null, sync => {
                var stations = [];
                for (var item in sync) {
                  if (!isNaN(Number(item))) {
                    stations[item] = sync[item];
                  }
                }
                for (i = 0; i < stations.length; i++) {
                  if (stations[i].name == name) {
                    url = stations[i].webpage;
                    break;
                  }
                }
                if (url) {
                  url = url.includes("#") ? url.substring(0, url.indexOf("#")) : url;
                  document.querySelector("webview").src = url;
                  document.querySelector("webview").style.visibility = "visible";
                }
                else {
                  showDefaultWebpage();
                }
              });
            } else {
              showDefaultWebpage();
            }
          }
          break;
        case cast.framework.SessionState.SESSION_ENDED:
          showDefaultWebpage();
          break;
      }
    });
    if (!castContext.getCurrentSession()) {
      showDefaultWebpage();
    }
  }
}

var img = null;

function imgClick(e) {
  img = e.target;
  if (!img.dataset.stream) {
    showWebpage(img);
  } else if (cast.framework.CastContext.getInstance().getCurrentSession()) {
    showWebpage(img);
    loadStream(img);
  }
  else {
    cast.framework.CastContext.getInstance().requestSession().then(() => loadStream(img));
  }
}

function imgRightClick(e) {
  e.preventDefault();
  var img = e.target;
  showWebpage(img);
}

function loadStream(img) {
  var mediaInfo = new chrome.cast.media.MediaInfo(img.dataset.stream, "audio/*");
  mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
  mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
  mediaInfo.metadata.title = img.alt || null;
  if (img.dataset && img.dataset.icon) {
    mediaInfo.metadata.images = [new chrome.cast.Image(img.dataset.icon)];
  }
  var request = new chrome.cast.media.LoadRequest(mediaInfo);
  var session = cast.framework.CastContext.getInstance().getCurrentSession();
  session.loadMedia(request);
}

function showWebpage(img) {
  if (img.dataset.webpage) {
    document.querySelector("webview").src = img.dataset.webpage;
    document.querySelector("webview").style.visibility = "visible";
  } else {
    showDefaultWebpage();
  }
}

function showDefaultWebpage() {
  chrome.storage.sync.get(["defaultWebpage"], result => {
    if (result.defaultWebpage) {
      document.querySelector("webview").src = result.defaultWebpage;
      document.querySelector("webview").style.visibility = "visible";
    } else {
      document.querySelector("webview").src = "about:blank";
      document.querySelector("webview").style.visibility = "hidden";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  displayStations();
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg == "clear") {
      var webview = document.querySelector("webview");
      webview.clearData({}, { cache: true, appcache: true, cookies: true, sessionCookies: true, persistentCookies: true, fileSystems: true, indexedDB: true, localStorage: true, webSQL: true });
    }
  });
});

function displayStations() {
  chrome.storage.local.get(["iconSize"], local => {
    var iconSize = local.iconSize || 50;
    chrome.storage.sync.get(null, sync => {
      var stations = [];
      for (var item in sync) {
        if (!isNaN(Number(item))) {
          stations[item] = sync[item];
        }
      }
      var container = document.getElementById("station-container");
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      stations.forEach(station => {
        var img = document.createElement("img");
        setImgSrc(img, station.icon);
        if (station.name) {
          img.alt = station.name;
        }
        if (station.stream) {
          img.setAttribute("data-stream", station.stream);
        }
        if (station.webpage) {
          img.setAttribute("data-webpage", station.webpage);
        }
        if (station.icon) {
          if (station.icon.includes(":")) {
            img.setAttribute("data-icon", station.icon);
          }
          else {
            img.setAttribute("data-icon", "https://d2dyrotpcjgnzf.cloudfront.net/logos/" + station.icon);
          }
        }
        img.height = iconSize;
        img.width = iconSize;
        img.onclick = imgClick;
        img.oncontextmenu = imgRightClick;
        container.appendChild(img);
      })
    });
  });
}

function setImgSrc(img, icon) {
  if (!icon) {
    img.src = "icons/radiobuttonblack192.png";
  }
  else if (!icon.includes(":")) {
    img.src = "icons/" + icon;
  }
  else {
    fetch(icon)
      .then(response => response.blob())
      .then(blob => img.src = URL.createObjectURL(blob));
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.defaultWebpage) {
    var src = document.querySelector("webview").src;
    if (src == changes.defaultWebpage.oldValue || src == "about:blank" && !changes.defaultWebpage.oldValue) {
      showDefaultWebpage();
    }
  }
  if (changes.iconSize) {
    var size = changes.iconSize.newValue;
    var images = document.getElementById("station-container").childNodes;
    images.forEach(img => {
      img.height = size;
      img.width = size;
    });
  }
  var isStationChange = false;
  for (var item in changes) {
    if (!isNaN(Number(item))) {
      isStationChange = true;
    }
  }
  if (isStationChange) {
    displayStations();
  }
});