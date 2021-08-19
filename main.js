const { app, BrowserWindow, Menu } = require("electron");
// disable menu
Menu.setApplicationMenu(null);

const path = require("path");
const url = require("url");
// read config appid,key ...
const configPath = path.join(
  __dirname,
  `./${app.isPackaged ? "build" : "public"}/config.json`
);
const appConfig = require(configPath);

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    frame: true,
    icon: path.join(
      __dirname,
      `./${app.isPackaged ? "build" : "public"}/icon.png`
    ),
  });

  if (app.isPackaged) {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "./build/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  } else {
    mainWindow.loadURL("http://localhost:3000/");
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
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
