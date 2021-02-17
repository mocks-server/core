/*
Copyright 2021 Javier Brea

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

const express = require("express");

const tracer = require("../tracer");

const METHODS = {
  GET: "get",
  POST: "post",
  PATCH: "patch",
  DELETE: "delete",
  PUT: "put",
};

class Mock {
  constructor({ id, routesVariants, getDelay }) {
    this._id = id;
    this._routesVariants = routesVariants;
    this._getDelay = getDelay;
    this._initRouter();
  }

  _initRouter() {
    this._router = express.Router();
    this._routesVariants.forEach((routeVariant) => {
      this._router[METHODS[routeVariant.method]](routeVariant.url, (req, res, next) => {
        const delay = routeVariant.delay !== null ? routeVariant.delay : this._getDelay();
        if (delay > 0) {
          tracer.verbose(`Applying delay of ${delay}ms to route variant "${this._id}"`);
          setTimeout(() => {
            next();
          }, delay);
        } else {
          next();
        }
      });
      this._router[METHODS[routeVariant.method]](
        routeVariant.url,
        routeVariant.middleware.bind(routeVariant)
      );
    });
  }

  get routesVariants() {
    return this._routesVariants;
  }

  get id() {
    return this._id;
  }

  get router() {
    return this._router;
  }
}

module.exports = Mock;