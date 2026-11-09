// tests/stage4.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// node_modules/ol/proj/Units.js
var METERS_PER_UNIT = {
  // use the radius of the Normal sphere
  "radians": 6370997 / (2 * Math.PI),
  "degrees": 2 * Math.PI * 6370997 / 360,
  "ft": 0.3048,
  "m": 1,
  "us-ft": 1200 / 3937
};

// node_modules/ol/proj/Projection.js
var Projection = class {
  /**
   * @param {Options} options Projection options.
   */
  constructor(options) {
    this.code_ = options.code;
    this.units_ = /** @type {import("./Units.js").Units} */
    options.units;
    this.extent_ = options.extent !== void 0 ? options.extent : null;
    this.worldExtent_ = options.worldExtent !== void 0 ? options.worldExtent : null;
    this.axisOrientation_ = options.axisOrientation !== void 0 ? options.axisOrientation : "enu";
    this.global_ = options.global !== void 0 ? options.global : false;
    this.canWrapX_ = !!(this.global_ && this.extent_);
    this.getPointResolutionFunc_ = options.getPointResolution;
    this.defaultTileGrid_ = null;
    this.metersPerUnit_ = options.metersPerUnit;
  }
  /**
   * @return {boolean} The projection is suitable for wrapping the x-axis
   */
  canWrapX() {
    return this.canWrapX_;
  }
  /**
   * Get the code for this projection, e.g. 'EPSG:4326'.
   * @return {string} Code.
   * @api
   */
  getCode() {
    return this.code_;
  }
  /**
   * Get the validity extent for this projection.
   * @return {import("../extent.js").Extent} Extent.
   * @api
   */
  getExtent() {
    return (
      /** @type {import("../extent.js").Extent} */
      this.extent_
    );
  }
  /**
   * Get the units of this projection.
   * @return {import("./Units.js").Units} Units.
   * @api
   */
  getUnits() {
    return this.units_;
  }
  /**
   * Get the amount of meters per unit of this projection.  If the projection is
   * not configured with `metersPerUnit` or a units identifier, the return is
   * `undefined`.
   * @return {number|undefined} Meters.
   * @api
   */
  getMetersPerUnit() {
    return this.metersPerUnit_ || METERS_PER_UNIT[this.units_];
  }
  /**
   * Get the world extent for this projection.
   * @return {import("../extent.js").Extent} Extent.
   * @api
   */
  getWorldExtent() {
    return (
      /** @type {import("../extent.js").Extent} */
      this.worldExtent_
    );
  }
  /**
   * Get the axis orientation of this projection.
   * Example values are:
   * enu - the default easting, northing, elevation.
   * neu - northing, easting, up - useful for "lat/long" geographic coordinates,
   *     or south orientated transverse mercator.
   * wnu - westing, northing, up - some planetary coordinate systems have
   *     "west positive" coordinate systems
   * @return {string} Axis orientation.
   * @api
   */
  getAxisOrientation() {
    return this.axisOrientation_;
  }
  /**
   * Is this projection a global projection which spans the whole world?
   * @return {boolean} Whether the projection is global.
   * @api
   */
  isGlobal() {
    return this.global_;
  }
  /**
   * Set if the projection is a global projection which spans the whole world
   * @param {boolean} global Whether the projection is global.
   * @api
   */
  setGlobal(global) {
    this.global_ = global;
    this.canWrapX_ = !!(global && this.extent_);
  }
  /**
   * @return {import("../tilegrid/TileGrid.js").default|null} The default tile grid.
   */
  getDefaultTileGrid() {
    return this.defaultTileGrid_;
  }
  /**
   * @param {import("../tilegrid/TileGrid.js").default} tileGrid The default tile grid.
   */
  setDefaultTileGrid(tileGrid) {
    this.defaultTileGrid_ = tileGrid;
  }
  /**
   * Set the validity extent for this projection.
   * @param {import("../extent.js").Extent} extent Extent.
   * @api
   */
  setExtent(extent) {
    this.extent_ = extent;
    this.canWrapX_ = !!(this.global_ && extent);
  }
  /**
   * Set the world extent for this projection.
   * @param {import("../extent.js").Extent} worldExtent World extent
   *     [minlon, minlat, maxlon, maxlat].
   * @api
   */
  setWorldExtent(worldExtent) {
    this.worldExtent_ = worldExtent;
  }
  /**
   * Set the getPointResolution function (see {@link module:ol/proj.getPointResolution}
   * for this projection.
   * @param {function(number, import("../coordinate.js").Coordinate):number} func Function
   * @api
   */
  setGetPointResolution(func) {
    this.getPointResolutionFunc_ = func;
  }
  /**
   * Get the custom point resolution function for this projection (if set).
   * @return {GetPointResolution|undefined} The custom point
   * resolution function (if set).
   */
  getPointResolutionFunc() {
    return this.getPointResolutionFunc_;
  }
};
var Projection_default = Projection;

// node_modules/ol/proj/epsg3857.js
var RADIUS = 6378137;
var HALF_SIZE = Math.PI * RADIUS;
var EXTENT = [-HALF_SIZE, -HALF_SIZE, HALF_SIZE, HALF_SIZE];
var WORLD_EXTENT = [-180, -85, 180, 85];
var MAX_SAFE_Y = RADIUS * Math.log(Math.tan(Math.PI / 2));
var EPSG3857Projection = class extends Projection_default {
  /**
   * @param {string} code Code.
   */
  constructor(code) {
    super({
      code,
      units: "m",
      extent: EXTENT,
      global: true,
      worldExtent: WORLD_EXTENT,
      getPointResolution: function(resolution, point) {
        return resolution / Math.cosh(point[1] / RADIUS);
      }
    });
  }
};
var PROJECTIONS = [
  new EPSG3857Projection("EPSG:3857"),
  new EPSG3857Projection("EPSG:102100"),
  new EPSG3857Projection("EPSG:102113"),
  new EPSG3857Projection("EPSG:900913"),
  new EPSG3857Projection("http://www.opengis.net/def/crs/EPSG/0/3857"),
  new EPSG3857Projection("http://www.opengis.net/gml/srs/epsg.xml#3857")
];
function fromEPSG4326(input, output, dimension, stride) {
  const length = input.length;
  dimension = dimension !== void 0 && dimension > 1 ? dimension : 2;
  stride = stride ?? dimension;
  if (output === void 0) {
    if (dimension > 2) {
      output = input.slice();
    } else {
      output = new Array(length);
    }
  }
  for (let i = 0; i < length; i += stride) {
    output[i] = HALF_SIZE * input[i] / 180;
    let y = RADIUS * Math.log(Math.tan(Math.PI * (+input[i + 1] + 90) / 360));
    if (y > MAX_SAFE_Y) {
      y = MAX_SAFE_Y;
    } else if (y < -MAX_SAFE_Y) {
      y = -MAX_SAFE_Y;
    }
    output[i + 1] = y;
  }
  return output;
}
function toEPSG4326(input, output, dimension, stride) {
  const length = input.length;
  dimension = dimension !== void 0 && dimension > 1 ? dimension : 2;
  stride = stride ?? dimension;
  if (output === void 0) {
    if (dimension > 2) {
      output = input.slice();
    } else {
      output = new Array(length);
    }
  }
  for (let i = 0; i < length; i += stride) {
    output[i] = 180 * input[i] / HALF_SIZE;
    output[i + 1] = 360 * Math.atan(Math.exp(input[i + 1] / RADIUS)) / Math.PI - 90;
  }
  return output;
}

// node_modules/ol/proj/epsg4326.js
var RADIUS2 = 6378137;
var EXTENT2 = [-180, -90, 180, 90];
var METERS_PER_UNIT2 = Math.PI * RADIUS2 / 180;
var EPSG4326Projection = class extends Projection_default {
  /**
   * @param {string} code Code.
   * @param {string} [axisOrientation] Axis orientation.
   */
  constructor(code, axisOrientation) {
    super({
      code,
      units: "degrees",
      extent: EXTENT2,
      axisOrientation,
      global: true,
      metersPerUnit: METERS_PER_UNIT2,
      worldExtent: EXTENT2
    });
  }
};
var PROJECTIONS2 = [
  new EPSG4326Projection("CRS:84"),
  new EPSG4326Projection("EPSG:4326", "neu"),
  new EPSG4326Projection("urn:ogc:def:crs:OGC:1.3:CRS84"),
  new EPSG4326Projection("urn:ogc:def:crs:OGC:2:84"),
  new EPSG4326Projection("http://www.opengis.net/def/crs/OGC/1.3/CRS84"),
  new EPSG4326Projection("http://www.opengis.net/gml/srs/epsg.xml#4326", "neu"),
  new EPSG4326Projection("http://www.opengis.net/def/crs/EPSG/0/4326", "neu")
];

// node_modules/ol/proj/projections.js
var cache = {};
function add(code, projection) {
  cache[code] = projection;
}

// node_modules/ol/proj/transforms.js
var transforms = {};
function add2(source, destination, transformFn) {
  const sourceCode = source.getCode();
  const destinationCode = destination.getCode();
  if (!(sourceCode in transforms)) {
    transforms[sourceCode] = {};
  }
  transforms[sourceCode][destinationCode] = transformFn;
}

// node_modules/ol/proj.js
function cloneTransform(input, output) {
  if (output !== void 0) {
    for (let i = 0, ii = input.length; i < ii; ++i) {
      output[i] = input[i];
    }
    output = output;
  } else {
    output = input.slice();
  }
  return output;
}
function addProjection(projection) {
  add(projection.getCode(), projection);
  add2(projection, projection, cloneTransform);
}
function addProjections(projections) {
  projections.forEach(addProjection);
}
function addEquivalentProjections(projections) {
  addProjections(projections);
  projections.forEach(function(source) {
    projections.forEach(function(destination) {
      if (source !== destination) {
        add2(source, destination, cloneTransform);
      }
    });
  });
}
function addEquivalentTransforms(projections1, projections2, forwardTransform, inverseTransform) {
  projections1.forEach(function(projection1) {
    projections2.forEach(function(projection2) {
      add2(projection1, projection2, forwardTransform);
      add2(projection2, projection1, inverseTransform);
    });
  });
}
function addCommon() {
  addEquivalentProjections(PROJECTIONS);
  addEquivalentProjections(PROJECTIONS2);
  addEquivalentTransforms(
    PROJECTIONS2,
    PROJECTIONS,
    fromEPSG4326,
    toEPSG4326
  );
}
addCommon();

// src/lib/filename.ts
function sanitizeFilename(name) {
  const s = (name ?? "").trim().replace(/[\\/:*?"<>|]/g, "").trim();
  return s || "\uC774\uB984\uC5C6\uB294\uC815\uC6D0";
}

// src/lib/exportDrawing.ts
var exportFilename = (name, fmt) => `${sanitizeFilename(name)}_\uB3C4\uBA74.${fmt}`;
function creditLines(file2, withSatellite, today = /* @__PURE__ */ new Date()) {
  const vworld = file2.place.basemap.provider === "vworld-satellite";
  const bg = withSatellite ? vworld ? "\uBC30\uACBD: \uBE0C\uC774\uC6D4\uB4DC(\uAD6D\uD1A0\uAD50\uD1B5\uBD80) \uC704\uC131\uC601\uC0C1" : `\uBC30\uACBD: ${file2.place.basemap.attribution}` : "\uBC30\uACBD \uC704\uC131\uC601\uC0C1 \uC81C\uC678 (\uB3C4\uBA74\uB9CC)";
  const ph = file2.photo?.visible ? ` \xB7 \uBC30\uACBD \uC0AC\uC9C4: \uC0AC\uC6A9\uC790 \uC81C\uACF5 (${file2.photo.name})` : "";
  return [
    `${sanitizeFilename(file2.meta.name)}${file2.meta.author ? ` \xB7 \uC791\uC131\uC790 ${file2.meta.author}` : ""} \xB7 ${today.toLocaleDateString("ko-KR")}`,
    `\uCD9C\uCC98: \uBE0C\uC774\uC6D4\uB4DC(\uAD6D\uD1A0\uAD50\uD1B5\uBD80) \xB7 ${bg}${ph} \xB7 \uAC1C\uC778 \uB2E4\uC6B4\uB85C\uB4DC\uC6A9, \uC11C\uBC84 \uC800\uC7A5 \uC5C6\uC74C`
  ];
}

// tests/stage4.test.ts
var file = (name, author, provider = "vworld-satellite") => ({ schemaVersion: 1, meta: { name, author, createdAt: "", updatedAt: "", northDeg: 0 }, place: { center: { lon: 127, lat: 37 }, zoom: 18, bbox: { west: 0, east: 0, north: 0, south: 0 }, basemap: { provider, attribution: provider === "mock-esri" ? "\uBAA9\uC5C5 \uBC14\uD0D5: Esri" : "\uBE0C\uC774\uC6D4\uB4DC(\uAD6D\uD1A0\uAD50\uD1B5\uBD80)" } }, features: [] });
test("filenames follow sanitizeFilename + _\uB3C4\uBA74", () => {
  assert.equal(exportFilename("\uD587\uC0B4 \uD143\uBC2D", "png"), "\uD587\uC0B4 \uD143\uBC2D_\uB3C4\uBA74.png");
  assert.equal(exportFilename("", "pdf"), "\uC774\uB984\uC5C6\uB294\uC815\uC6D0_\uB3C4\uBA74.pdf");
  assert.equal(exportFilename("   ", "png"), "\uC774\uB984\uC5C6\uB294\uC815\uC6D0_\uB3C4\uBA74.png");
  assert.equal(exportFilename('a/b:c*?"<>|', "pdf"), "abc_\uB3C4\uBA74.pdf");
});
test("credit always names \uBE0C\uC774\uC6D4\uB4DC(\uAD6D\uD1A0\uAD50\uD1B5\uBD80), garden and author", () => {
  const [l1, l2] = creditLines(file("\uD587\uC0B4 \uD143\uBC2D", "\uB808\uB4DC\uC9C4"), true, new Date(2026, 10, 9));
  assert(l1.includes("\uD587\uC0B4 \uD143\uBC2D") && l1.includes("\uB808\uB4DC\uC9C4"));
  assert(l2.includes("\uBE0C\uC774\uC6D4\uB4DC(\uAD6D\uD1A0\uAD50\uD1B5\uBD80)") && l2.includes("\uC704\uC131\uC601\uC0C1") && l2.includes("\uC11C\uBC84 \uC800\uC7A5 \uC5C6\uC74C"));
  const [e1, e2] = creditLines(file(""), false);
  assert(e1.startsWith("\uC774\uB984\uC5C6\uB294\uC815\uC6D0") && !e1.includes("\uC791\uC131\uC790"));
  assert(e2.includes("\uBE0C\uC774\uC6D4\uB4DC(\uAD6D\uD1A0\uAD50\uD1B5\uBD80)") && e2.includes("\uB3C4\uBA74\uB9CC"));
  assert(creditLines(file("x", void 0, "mock-esri"), true)[1].includes("Esri"));
});
