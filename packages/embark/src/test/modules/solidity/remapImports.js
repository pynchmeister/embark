/*globals describe, it, before*/
const { dappPath, File, Types, prepareForCompilation } = require('embark-utils');
const path = require("path");
const {expect} = require("chai");
const fs = require("../../../lib/core/fs");
const fsNode = require("fs");

let file, content;

describe('embark.RemapImports', function () {
  describe('Import remappings from local file', function () {
    before('do the remappings', async () => {
      file = new File({path: 'contracts/recursive_test_0.sol', type: Types.dappFile});
      content = await prepareForCompilation(file);
    });

    it("should find and add remappings for all recursive imports", (done) => {
      expect(file.importRemappings[0]).to.deep.equal({
        prefix: "./recursive_test_1.sol",
        target: path.normalize(dappPath(".embark/contracts/recursive_test_1.sol"))
      });
      expect(file.importRemappings[1]).to.deep.equal({
        prefix: "./recursive_test_2.sol",
        target: path.normalize(dappPath(".embark/contracts/recursive_test_2.sol"))
      });
      expect(file.importRemappings[2]).to.deep.equal({
        prefix: "embark-test-contract-0/recursive_test_3.sol",
        target: path.normalize(dappPath(".embark/node_modules/embark-test-contract-0/recursive_test_3.sol"))
      });
      expect(file.importRemappings[3]).to.deep.equal({
        prefix: "embark-test-contract-1/recursive_test_4.sol",
        target: path.normalize(dappPath(".embark/node_modules/embark-test-contract-1/recursive_test_4.sol"))
      });
      done();
    });

    it("should update the contract content to use the remapped imports", function (done) {
      expect(content).to.not.contain("./recursive_test_1.sol");
      expect(content).to.contain(path.normalize(".embark/contracts/recursive_test_1.sol").replace(/\\/g, "/"));

      let contractFromFilesystem = fsNode.readFileSync(dappPath(".embark/contracts/recursive_test_0.sol")).toString();
      expect(contractFromFilesystem).to.not.contain("./recursive_test_1.sol");
      expect(contractFromFilesystem).to.contain(path.normalize(".embark/contracts/recursive_test_1.sol").replace(/\\/g, "/"));

      contractFromFilesystem = fsNode.readFileSync(dappPath(".embark/contracts/recursive_test_1.sol")).toString();
      expect(contractFromFilesystem).to.not.contain("./recursive_test_2.sol");
      expect(contractFromFilesystem).to.contain(path.normalize(".embark/contracts/recursive_test_2.sol").replace(/\\/g, "/"));

      contractFromFilesystem = fsNode.readFileSync(dappPath(".embark/contracts/recursive_test_2.sol")).toString();
      expect(contractFromFilesystem).to.not.contain("import \"embark-test-contract-0/recursive_test_3.sol\"");
      expect(contractFromFilesystem).to.contain(`import "${path.normalize(dappPath(".embark/node_modules/embark-test-contract-0/recursive_test_3.sol")).replace(/\\/g, "/")}"`);

      contractFromFilesystem = fsNode.readFileSync(dappPath(".embark/node_modules/embark-test-contract-0/recursive_test_3.sol")).toString();
      expect(contractFromFilesystem).to.not.contain("import \"embark-test-contract-1/recursive_test_4.sol\"");
      expect(contractFromFilesystem).to.contain(`import "${path.normalize(dappPath(".embark/node_modules/embark-test-contract-1/recursive_test_4.sol")).replace(/\\/g, "/")}"`);

      done();
    });

  });

  describe('Import remappings from external URL', function () {
    before('do the external HTTP contract remappings', async () => {
      file = new File({externalUrl: 'https://github.com/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_0.sol', type: Types.http});
      content = await prepareForCompilation(file);
    });

    it("should find and add remappings for all recursive imports", (done) => {
      expect(file.importRemappings[0]).to.deep.equal({
        prefix: "./recursive_test_1.sol",
        target: path.normalize(dappPath(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_1.sol"))
      });
      expect(file.importRemappings[1]).to.deep.equal({
        prefix: "./recursive_test_2.sol",
        target: path.normalize(dappPath(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_2.sol"))
      });
      expect(file.importRemappings[2]).to.deep.equal({
        prefix: "embark-test-contract-0/recursive_test_3.sol",
        target: path.normalize(dappPath(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/embark-test-contract-0/recursive_test_3.sol"))
      });
      done();
    });

    it("should update the contract content to use the remapped imports", function (done) {
      expect(content).to.not.contain("./recursive_test_1.sol");
      expect(content).to.contain(path.normalize(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_1.sol").replace(/\\/g, "/"));

      let contractFromFilesystem = fsNode.readFileSync(dappPath(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_0.sol")).toString();
      expect(contractFromFilesystem).to.not.contain("./recursive_test_1.sol");
      expect(contractFromFilesystem).to.contain(path.normalize(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_1.sol").replace(/\\/g, "/"));

      contractFromFilesystem = fsNode.readFileSync(dappPath(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_1.sol")).toString();
      expect(contractFromFilesystem).to.not.contain("./recursive_test_2.sol");
      expect(contractFromFilesystem).to.contain(path.normalize(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_2.sol").replace(/\\/g, "/"));

      contractFromFilesystem = fsNode.readFileSync(dappPath(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/recursive_test_2.sol")).toString();
      expect(contractFromFilesystem).to.not.contain("import \"embark-test-contract-0/recursive_test_3.sol\"");
      expect(contractFromFilesystem).to.contain(`import "${path.normalize(dappPath(".embark/contracts/embark-framework/embark/master/packages/embark/src/test/contracts/embark-test-contract-0/recursive_test_3.sol")).replace(/\\/g, "/")}"`);

      done();
    });
  });

});
