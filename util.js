const cheerio = require('cheerio');

const lookupTable = {
  meta: [{
    selector: 'meta[name*="/config/environment"]',
    attributes: ['name', 'content']
  }, {
    selector: 'meta[id]',
    attributes: ['name', 'content', 'id']
  }],
  link: [{
    selector: 'link',
    attributes: ['rel', 'href']
  }],
  script: [{
    selector: 'script',
    attributes: ['src']
  }]
};

function getDocumentValues($, selector, attributes=[], ignoreRegexs=[]) {
  let $tags = $(selector);
  let config = [];

  $tags.each(function() {
    var $tag = $(this);

    var data = attributes.reduce(function(data, attribute) {
      const value = $tag.attr(attribute);

      let ignored = false;

      if(value && !ignoreRegexs.find((regex) => {
        return regex.exec(value)
      })) {
        data[attribute] = value
      } else {
        ignored = true;
      }

      return ignored ? {} : data;
    }, {})

    if(Object.keys(data).length > 0) {
      config.push(data);
    }
  });

  return config;
}

function parse(data, ignoreTestFiles) {
  const ignoreRegexs = ignoreTestFiles ? [/assets\/test/] : []

  var $ = cheerio.load(data);
  var json = {};

  for(var prop in lookupTable) {
    var value = lookupTable[prop];

    for (var selector of value) {
      const tagsFound = getDocumentValues($, selector.selector, selector.attributes, ignoreRegexs);

      // if we have multiple selectors for a certain block
      // we need to make sure we don't just set the array every time
      if(json[prop]) {
        json[prop] = json[prop].concat(tagsFound)
      } else {
        json[prop] = tagsFound;
      }
    }
  }

  return json;
}

function objectToHTMLAttributes(obj) {
  return Object.keys(obj).map((key) => {
    return `${key}="${obj[key]}"`
  }).join(' ')
}

function generatePreviewHead(parsedConfig) {
  const doc = [];

  for(const key of Object.keys(parsedConfig)) {
    for(const value of parsedConfig[key]) {
      if(key == 'script') {
        if(value.src.indexOf('ember-cli-live-reload.js') > -1) {
          doc.push(`<script>
            (function() {
              var srcUrl = null;
              var host = location.hostname || 'localhost';
              var defaultPort = location.protocol === 'https:' ? 443 : 80;
              var port = ${process.env.EMBER_CLI_INJECT_LIVE_RELOAD_PORT};
              var path = '';
              var prefixURL = '';
              var src = srcUrl || prefixURL + '/_lr/livereload.js?port=' + port + '&host=' + host + path;
              var script = document.createElement('script');
              script.type = 'text/javascript';
              script.src = location.protocol + '//' + host + ':${process.env.EMBER_CLI_INJECT_LIVE_RELOAD_PORT}' + src;
              document.getElementsByTagName('head')[0].appendChild(script);
            }());
          </script>`);
          continue;
        }
        if(value.src.indexOf('assets/vendor.js') > -1) {
          // make sure we push this before vendor gets loaded to ensure the application does not bind to the window
          doc.push('<script>runningTests = true;</script>');
        }

        doc.push(`<${key} ${objectToHTMLAttributes(value)}></${key}>`);
      } else {
        doc.push(`<${key} ${objectToHTMLAttributes(value)} />`);
      }
    }
  }

  doc.push('<div id="ember-teamtailor-redactor-giphy"></div>');
  doc.push('<div id="ember-teamtailor-redactor-media-library"></div>');
  doc.push('<div id="ember-teamtailor-media-library"></div>');
  doc.push('<div id="ember-teamtailor-takeover"></div>');
  doc.push('<div id="ember-teamtailor-modal"></div>');
  doc.push('<div id="ember-basic-dropdown-wormhole"></div>');

  return doc.join('\n')
}

module.exports = {
  getDocumentValues,
  parse,
  objectToHTMLAttributes,
  generatePreviewHead,
};
