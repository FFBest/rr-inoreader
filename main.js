const { app, BrowserWindow, Menu, net } = require("electron");
// disable menu
Menu.setApplicationMenu(null);

const alert = require("alert");
const path = require("path");
const https = require("https");
const SocksProxyAgent = require("socks-proxy-agent");

const Url = require("url");
const Store = require("electron-store");

const option = {
  name: "storeConfig",
  fileExtension: "json",
  cwd: path.join(__dirname, `./${app.isPackaged ? "build" : "public"}`),
  clearInvalidConfig: true,
};
const store = new Store(option);

// read config appid,key ...
const configPath = path.join(
  __dirname,
  `./${app.isPackaged ? "build" : "public"}/config.json`
);
const appConfig = require(configPath);

let mainWindow;
function loadMain() {
  const load = () => {
    if (app.isPackaged) {
      mainWindow.loadURL(
        Url.format({
          pathname: path.join(__dirname, "./build/index.html"),
          protocol: "file:",
          slashes: true,
        })
      );
    } else {
      mainWindow.loadURL("http://localhost:3000/");
      mainWindow.webContents.openDevTools();
    }
  };
  // if (appConfig.proxy) {
  // mainWindow.webContents.session.setProxy(
  //   { proxyRules: appConfig.proxy },
  //   load
  // );
  // } else {
  load();
  // }
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}
function doAuth() {
  let authWindow;
  // do auth fi
  const authUrl = `https://www.inoreader.com/oauth2/auth?client_id=${
    appConfig.client_id || ""
  }&redirect_uri=${appConfig.redirect_uri || ""}&response_type=code&scope=${
    appConfig.scope || ""
  }&state=${appConfig.state || ""}`;
  const tokeOptions = {
    client_id: appConfig.client_id || "",
    client_secret: appConfig.client_secret || "",
    scopes: (appConfig.client_id || "").split(","), // Scopes limit access for OAuth tokens.
  };
  function requestInoreaderToken(code) {
    const opts = Url.parse("https://www.inoreader.com/oauth2/token");
    // create an instance of the `SocksProxyAgent` class with the proxy server information
    if (appConfig.proxy) {
      const agent = new SocksProxyAgent(appConfig.proxy);
      opts.agent = agent;
    }
    const data = JSON.stringify({
      client_id: tokeOptions.client_id,
      client_secret: tokeOptions.client_secret,
      redirect_uri: appConfig.redirect_uri,
      code: code,
      grant_type: "authorization_code",
    });
    opts.method = "POST";
    opts.headers = {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    };
    const req = https.request(opts, (res) => {
      let str = "";
      res.on("data", (chunk) => {
        str += chunk;
      });
      res.on("end", () => {
        store.set("token", JSON.parse(str));
        loadMain();
      });
    });
    req.on("error", (err) => {
      alert(err);
    });
    req.write(data);
    req.end();
  }
  function handleAuthCallback(url) {
    const urlParse = new Url.URL(url);
    const code = urlParse.searchParams.get("code");
    const error = urlParse.searchParams.get("error");

    // If there is a code, proceed to get token
    if (code || error) authWindow.destroy();

    if (code) {
      requestInoreaderToken(code);
    } else if (error) {
      alert(
        "Oops! Something went wrong and we couldn't" +
          "log you in using Inoreader. Please try again."
      );
    }
  }
  authWindow = new BrowserWindow({
    show: false,
    "node-integration": false,
    width: 1024,
    height: 768,
    frame: true,
    icon: path.join(
      __dirname,
      `./${app.isPackaged ? "build" : "public"}/icon.png`
    ),
  });
  if (appConfig.proxy) {
    authWindow.webContents.session.setProxy(
      { proxyRules: appConfig.proxy },
      function () {
        authWindow.loadURL(authUrl);
      }
    );
  } else {
    authWindow.loadURL(authUrl);
  }
  authWindow.loadURL(authUrl);
  authWindow.show();
  authWindow.webContents.on("will-navigate", function (event, url) {
    handleAuthCallback(url);
  });
  authWindow.webContents.on("did-redirect-navigation", function (event, url) {
    handleAuthCallback(url);
  });
  authWindow.on("closed", function () {
    authWindow = null;
  });
}

function createWindow() {
  let option = {
    width: 1024,
    height: 768,
    frame: true,
    icon: path.join(
      __dirname,
      `./${app.isPackaged ? "build" : "public"}/icon.png`
    ),
  };
  mainWindow = new BrowserWindow(option);
  if (!store.get("token")) {
    doAuth();
  } else {
    loadMain();
  }
}

app.on("ready", createWindow);
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
