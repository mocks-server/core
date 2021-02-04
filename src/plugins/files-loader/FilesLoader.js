/*
Copyright 2019 Javier Brea
Copyright 2019 XbyOrange

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

const path = require("path");
const globule = require("globule");
const watch = require("node-watch");
const fsExtra = require("fs-extra");

const { map, debounce, flatten } = require("lodash");

const PLUGIN_NAME = "@mocks-server/core/plugin-files-loader";
const PATH_OPTION = "path";
const WATCH_OPTION = "watch";
const DEFAULT_PATH = "mocks";
const ROUTES_FOLDER = "routes";
const MOCKS_FILE = "mocks";

class FilesLoaderBase {
  constructor(core, methods, extraOptions = {}) {
    this._core = core;
    this._loadMocks = methods.loadMocks;
    this._loadRoutes = methods.loadRoutes;
    this._loadLegacy = methods.loadLegacyMocks;
    this._addAlert = methods.addAlert;
    this._removeAlerts = methods.removeAlerts;
    this._tracer = core.tracer;
    this._settings = this._core.settings;
    this._customRequireCache = extraOptions.requireCache;
    this._require = extraOptions.require || require;

    core.addSetting({
      name: "path",
      type: "string",
      description: "Define folder from where to load mocks",
      default: DEFAULT_PATH,
    });
    core.addSetting({
      name: WATCH_OPTION,
      type: "boolean",
      description: "Enable/disable files watcher",
      default: true,
    });

    this._onChangeSettings = this._onChangeSettings.bind(this);
  }

  init() {
    this._core.onChangeSettings(this._onChangeSettings);
    try {
      this._loadFiles();
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  start() {
    this._switchWatch();
  }

  stop() {
    if (this._watcher) {
      this._tracer.debug("Stopping files watch");
      this._watcher.close();
    }
  }

  _cleanRequireCacheFolder() {
    map(this._cache(), (cacheData, filePath) => {
      if (filePath.indexOf(this._path) === 0) {
        this._cleanRequireCache(this._cache()[filePath]);
      }
    });
  }

  _cleanRequireCache(requireModule) {
    if (requireModule) {
      map(requireModule.children, (moduleData) => {
        if (moduleData.id.indexOf(this._path) === 0) {
          this._cleanRequireCache(this._cache()[moduleData.id]);
        }
      });
      this._cache()[requireModule.id] = undefined;
    }
  }

  _demandPathName() {
    this._tracer.error(
      `Please provide a path to the folder containing mocks using the "${PATH_OPTION}" option`
    );
    throw new Error(`Invalid option "${PATH_OPTION}"`);
  }

  _resolveFolder(folder) {
    if (path.isAbsolute(folder)) {
      return folder;
    }
    return path.resolve(process.cwd(), folder);
  }

  _ensureFolder(folder) {
    fsExtra.ensureDirSync(folder);
    return folder;
  }

  _loadFiles() {
    const pathName = this._settings.get(PATH_OPTION);
    if (!pathName) {
      this._demandPathName();
    }
    const resolvedFolder = this._resolveFolder(pathName);
    this._path = this._ensureFolder(resolvedFolder);
    this._tracer.info(`Loading files from folder ${this._path}`);
    this._cleanRequireCacheFolder();
    this._loadRoutesFiles();
    this._loadMocksFile();
  }

  _loadRoutesFiles() {
    const routesPath = path.resolve(this._path, ROUTES_FOLDER);
    try {
      const routeFiles = globule.find({
        src: ["**/*.js", "**/*.json"],
        srcBase: routesPath,
        prefixBase: true,
      });

      const routes = flatten(
        routeFiles.map((filePath) => {
          // TODO, validate basic routes structure, add warning for not valid routes
          return this._require(filePath);
        })
      );
      this._loadRoutes(routes);
      this._tracer.silly(`Loaded routes from folder ${routesPath}`);
      this._removeAlerts("load:routes");
    } catch (error) {
      this._addAlert("load:routes", `Error loading routes from folder ${routesPath}`, error);
    }
  }

  _loadMocksFile() {
    const mocksFile = path.resolve(this._path, `${MOCKS_FILE}.js`);
    try {
      const mocks = this._require(mocksFile);
      // TODO, validate mocks, add warning for not valid mocks
      this._loadMocks(mocks);
      this._tracer.silly(`Loaded mocks from file ${mocksFile}`);
      this._removeAlerts("load:mocks");
    } catch (error) {
      this._addAlert("load:mocks", `Error loading mocks from file ${mocksFile}`, error);
    }
  }

  _switchWatch() {
    const enabled = this._settings.get(WATCH_OPTION);
    this.stop();
    if (enabled) {
      this._tracer.debug("Starting files watcher");
      this._watcher = watch(
        this._path,
        { recursive: true },
        debounce(() => {
          this._tracer.info("File change detected");
          this._loadFiles();
        }),
        1000
      );
    }
  }

  _onChangeSettings(changeDetails) {
    if (changeDetails.hasOwnProperty(PATH_OPTION)) {
      this._loadFiles();
      this._switchWatch();
    } else if (changeDetails.hasOwnProperty(WATCH_OPTION)) {
      this._switchWatch();
    }
  }

  _cache() {
    return this._customRequireCache || require.cache;
  }

  get displayName() {
    return PLUGIN_NAME;
  }
}

module.exports = FilesLoaderBase;
