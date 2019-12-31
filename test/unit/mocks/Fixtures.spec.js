/*
Copyright 2019 Javier Brea
Copyright 2019 XbyOrange

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

const sinon = require("sinon");
const CoreMocks = require("../Core.mocks.js");
const LoadersMocks = require("../plugins/Loaders.mocks");
const FixturesHandler = require("../../../src/mocks/FixturesHandler");
const FixtureHandler = require("../../../src/mocks/FixtureHandler");
const Behaviors = require("../../../src/mocks/Behaviors");

const tracer = require("../../../src/tracer");
const Fixtures = require("../../../src/mocks/Fixtures");

describe("Fixtures", () => {
  let sandbox;
  let coreMocks;
  let coreInstance;
  let loadersMocks;
  let loadersInstance;
  let fixturesHandler;
  let fixtures;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    coreMocks = new CoreMocks();
    coreInstance = coreMocks.stubs.instance;
    loadersMocks = new LoadersMocks();
    loadersInstance = loadersMocks.stubs.instance;
    fixturesHandler = new FixturesHandler();
    fixturesHandler.addHandler(FixtureHandler);
    sandbox.stub(tracer, "debug");
    fixtures = new Fixtures(loadersInstance, coreInstance._eventEmitter);
  });

  afterEach(() => {
    sandbox.restore();
    loadersMocks.restore();
    coreMocks.restore();
  });

  describe("when core emits load:files", () => {
    it("should process fixtures again", async () => {
      await fixtures.init(fixturesHandler);
      coreInstance._eventEmitter.on.getCall(0).args[1]();
      expect(tracer.debug.getCall(1).args[0]).toEqual("Processing fixtures");
    });
  });

  describe("addFromBehaviors method", () => {
    let originalContents;
    beforeEach(() => {
      originalContents = loadersInstance.contents;
      loadersInstance.contents.push(loadersInstance.contents[0]._initialFixtures[0]);
    });

    afterEach(() => {
      loadersInstance.contents = originalContents;
    });

    it("should add fixtures existing in behaviors and not exiting in fixtures collection", async () => {
      expect.assertions(2);
      const behaviors = new Behaviors(
        loadersInstance,
        coreInstance.settings,
        coreInstance._eventEmitter
      );
      await fixtures.init(fixturesHandler);
      expect(fixtures.count).toEqual(1);
      await behaviors.init(fixturesHandler, fixtures);
      expect(fixtures.count).toEqual(2);
    });
  });
});