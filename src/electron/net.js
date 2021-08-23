const Url = require('url');
const Https = require('https');
const SocksProxyAgent = require('socks-proxy-agent');

const post = (url, params, header = {}, proxy = null) => {
  const opts = Url.parse(url);
  if (proxy) opts.agent = new SocksProxyAgent(proxy);
  const data = JSON.stringify(params);
  opts.method = 'POST';
  opts.headers = {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  };
  for (let h in header) {
    opts.headers[h] = header[h];
  }
  return new Promise((resolve, reject) => {
    const req = Https.request(opts, (res) => {
      let str = '';
      res.on('data', (chunk) => {
        str += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(str));
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.write(data);
    req.end();
  });
};

module.exports = {
  post: post,
};
