// 执行请求授权相关操作
const { app, BrowserWindow } = require('electron');
const Url = require('url');
const Path = require('path');
const { post } = require('./net');

const basePath = process.cwd();

const Apis = {
  token: 'https://www.inoreader.com/oauth2/token',
};

const doAuth = (appConfig, succ, error) => {
  let authWindow;
  // do auth fi
  const authUrl = `https://www.inoreader.com/oauth2/auth?client_id=${
    appConfig.client_id || ''
  }&redirect_uri=${appConfig.redirect_uri || ''}&response_type=code&scope=${
    appConfig.scope || ''
  }&state=${appConfig.state || ''}`;

  const requestInoreaderToken = (code) => {
    post(
      Apis.token,
      {
        client_id: appConfig.client_id,
        client_secret: appConfig.client_secret,
        redirect_uri: appConfig.redirect_uri,
        code: code,
        grant_type: 'authorization_code',
      },
      {},
      appConfig.proxy
    )
      .then((res) => {
        if (res.error) {
          error(res);
          return;
        }
        res['code'] = code;
        succ(res);
      })
      .catch(error);
  };
  const handleAuthCallback = (url) => {
    const urlParse = new Url.URL(url);
    const code = urlParse.searchParams.get('code');
    const error = urlParse.searchParams.get('error');

    // If there is a code, proceed to get token
    if (code || error) authWindow.destroy();

    if (code) {
      requestInoreaderToken(code);
    } else if (error) {
      error(
        "Oops! Something went wrong and we couldn't" +
          'log you in using Inoreader. Please try again.'
      );
    }
  };
  authWindow = new BrowserWindow({
    show: false,
    'node-integration': false,
    width: 420,
    height: 600,
    frame: true,
    icon: Path.join(
      basePath,
      `${app.isPackaged ? 'build' : 'public'}/icon.png`
    ),
  });
  if (appConfig.proxy) {
    authWindow.webContents.session
      .setProxy({ proxyRules: appConfig.proxy })
      .then(() => {
        authWindow.loadURL(authUrl);
      });
  } else {
    authWindow.loadURL(authUrl);
  }
  if (!app.isPackaged) {
    authWindow.webContents.openDevTools();
  }
  authWindow.show();
  authWindow.webContents.on('will-navigate', (event, url) => {
    handleAuthCallback(url);
  });
  authWindow.webContents.on('did-redirect-navigation', (event, url) => {
    handleAuthCallback(url);
  });
  authWindow.on('closed', () => {
    authWindow = null;
  });
};

const refreshToken = (appConfig, token, succ, error) => {
  const retry = (retries, fn) => {
    console.log('refreshToken', retries);
    fn()
      .then((res) => {
        if (res.error) {
          error(res);
          return;
        }
        res['code'] = token.code;
        succ(res);
      })
      .catch((err) => (retries > 1 ? retry(retries - 1, fn) : error(err)));
  };
  retry(3, () => {
    return post(
      Apis.token,
      {
        client_id: appConfig.client_id,
        client_secret: appConfig.client_secret,
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      },
      {},
      appConfig.proxy
    );
  });
};

module.exports = {
  doAuth,
  refreshToken,
};
