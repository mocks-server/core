/*
Copyright 2021 Javier Brea

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

const { mocksRunner, fetch, waitForServer } = require("./support/helpers");

describe("mock argument", () => {
  const PATH_OPTION = "--path=web-tutorial";
  let mocks;

  afterEach(async () => {
    await mocks.kill();
  });

  describe("when not provided", () => {
    it("should set as current mock the first one found", async () => {
      mocks = mocksRunner([PATH_OPTION]);
      await waitForServer();
      const users = await fetch("/api/users/2");
      expect(users.body).toEqual({ id: 1, name: "John Doe" });
    });
  });

  describe("when provided and exists", () => {
    it("should set current behavior", async () => {
      mocks = mocksRunner([PATH_OPTION, "--mock=user-real"]);
      await waitForServer();
      const users = await fetch("/api/users/2");
      expect(users.body).toEqual({ id: 2, name: "Jane Doe" });
    });
  });

  describe("when provided and does not exist", () => {
    it("should print a warning", async () => {
      mocks = mocksRunner([PATH_OPTION, "--mock=foo"]);
      await waitForServer();
      expect(mocks.logs).toEqual(expect.stringContaining('Mock "foo" was not found'));
    });

    it("should set as current mock the first one found", async () => {
      mocks = mocksRunner([PATH_OPTION, "--mock=foo"]);
      await waitForServer();
      const users = await fetch("/api/users/2");
      expect(users.body).toEqual({ id: 1, name: "John Doe" });
    });
  });
});
