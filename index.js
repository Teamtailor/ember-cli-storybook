'use strict';

const fs = require('fs');
const path = require('path');

const { parse, generatePreviewHead } = require('./util');

module.exports = {
  name: 'ember-cli-storybook',

  outputReady: function(result) {
    if (!this.app) {
      // You will need ember-cli >= 1.13 to use ember-cli-deploy's postBuild integration.
      // This is because prior to 1.13, `this.app` is not available in the outputReady hook.
      this.ui.writeLine('please upgrade to ember-cli >= 1.13')
      return;
    }

    const { name } = this.app;
    const { storybook={} } = this.app.project.pkg;
    const { ignoreTestFiles=true } = storybook;

    const distFilePath = path.resolve(result.directory, 'index.html');
    const testFilePath = path.resolve(result.directory, 'tests/index.html');
    const previewHeadFilePath = path.resolve(process.cwd(), '.storybook/preview-head.html');
    const envFilePath = path.resolve(process.cwd(), '.env');

    let fileContents = '';

    this.ui.writeLine('Generating files needed by Storybook');

    if(fs.existsSync(testFilePath)) {
      fileContents = fs.readFileSync(testFilePath);

      this.ui.writeLine(`Parsing ${testFilePath}`);
    } else {
      fileContents = fs.readFileSync(distFilePath);

      this.ui.writeLine(`Parsing ${distFilePath}`);
    }

    const parsedConfig = parse(fileContents, ignoreTestFiles);
    const metaConfigEnvironment = parsedConfig.meta.find((tags)=>{
      return tags.name.indexOf('/config/environment') >= 0;
    });
    const metaConfigEnvironmentIndex = parsedConfig.meta.indexOf(metaConfigEnvironment);
    let metaConfigEnvironmentContent = JSON.parse(decodeURIComponent(metaConfigEnvironment.content));

    if (metaConfigEnvironmentContent.storybookEnvironment) {
      metaConfigEnvironmentContent = Object.assign(metaConfigEnvironmentContent, metaConfigEnvironmentContent.storybookEnvironment)
      delete metaConfigEnvironmentContent.storybookEnvironment
      metaConfigEnvironment.content = encodeURIComponent(JSON.stringify(metaConfigEnvironmentContent));
      parsedConfig.meta[metaConfigEnvironmentIndex] = metaConfigEnvironment;
    }

    this.ui.writeLine('Generating preview-head.html');

    const previewHead = generatePreviewHead(parsedConfig);

    this.ui.writeLine('Generating files needed by Storybook');

    fs.writeFileSync(previewHeadFilePath, previewHead)

    this.ui.writeLine('Generating .env');

    if(fs.existsSync(path.resolve(process.cwd(), '.env'))) {
      let fileContent = fs.readFileSync(envFilePath, 'utf8');

      if(fileContent.indexOf('STORYBOOK_NAME') === -1) {
        fileContent += `\nSTORYBOOK_NAME=${name}`;

        fs.writeFileSync(envFilePath, fileContent)
      }
    } else {
      fs.writeFileSync(envFilePath, `STORYBOOK_NAME=${name}`)
    }
  }
};
