// tests/stage3.test.tsx
import test from "node:test";
import assert2 from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

// node_modules/ol/ObjectEventType.js
var ObjectEventType_default = {
  /**
   * Triggered when a property is changed.
   * @event module:ol/Object.ObjectEvent#propertychange
   * @api
   */
  PROPERTYCHANGE: "propertychange"
};

// node_modules/ol/obj.js
function clear(object) {
  for (const property in object) {
    delete object[property];
  }
}
function isEmpty(object) {
  let property;
  for (property in object) {
    return false;
  }
  return !property;
}

// node_modules/ol/events.js
function listen(target, type, listener, thisArg, once) {
  if (once) {
    const originalListener = listener;
    listener = function(event) {
      target.removeEventListener(type, listener);
      return originalListener.call(thisArg ?? this, event);
    };
  } else if (thisArg && thisArg !== target) {
    listener = listener.bind(thisArg);
  }
  const eventsKey = {
    target,
    type,
    listener
  };
  target.addEventListener(type, listener);
  return eventsKey;
}
function listenOnce(target, type, listener, thisArg) {
  return listen(target, type, listener, thisArg, true);
}
function unlistenByKey(key) {
  if (key && key.target) {
    key.target.removeEventListener(key.type, key.listener);
    clear(key);
  }
}

// node_modules/ol/events/EventType.js
var EventType_default = {
  /**
   * Generic change event. Triggered when the revision counter is increased.
   * @event module:ol/events/Event~BaseEvent#change
   * @api
   */
  CHANGE: "change",
  /**
   * Generic error event. Triggered when an error occurs.
   * @event module:ol/events/Event~BaseEvent#error
   * @api
   */
  ERROR: "error",
  BLUR: "blur",
  CLEAR: "clear",
  CONTEXTMENU: "contextmenu",
  CLICK: "click",
  DBLCLICK: "dblclick",
  DRAGENTER: "dragenter",
  DRAGOVER: "dragover",
  DROP: "drop",
  FOCUS: "focus",
  KEYDOWN: "keydown",
  KEYPRESS: "keypress",
  KEYUP: "keyup",
  LOAD: "load",
  RESIZE: "resize",
  TOUCHMOVE: "touchmove",
  WHEEL: "wheel"
};

// node_modules/ol/Disposable.js
var Disposable = class {
  constructor() {
    this.disposed = false;
  }
  /**
   * Clean up.
   */
  dispose() {
    if (!this.disposed) {
      this.disposed = true;
      this.disposeInternal();
    }
  }
  /**
   * Extension point for disposable objects.
   * @protected
   */
  disposeInternal() {
  }
};
var Disposable_default = Disposable;

// node_modules/ol/array.js
function binarySearch(haystack, needle, comparator) {
  let mid, cmp;
  comparator = comparator || ascending;
  let low = 0;
  let high = haystack.length;
  let found = false;
  while (low < high) {
    mid = low + (high - low >> 1);
    cmp = +comparator(haystack[mid], needle);
    if (cmp < 0) {
      low = mid + 1;
    } else {
      high = mid;
      found = !cmp;
    }
  }
  return found ? low : ~low;
}
function ascending(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
}
function extend(arr, data2) {
  const extension = Array.isArray(data2) ? data2 : [data2];
  const length = extension.length;
  for (let i = 0; i < length; i++) {
    arr[arr.length] = extension[i];
  }
}
function equals(arr1, arr2) {
  const len1 = arr1.length;
  if (len1 !== arr2.length) {
    return false;
  }
  for (let i = 0; i < len1; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

// node_modules/ol/util.js
function abstract() {
  throw new Error("Unimplemented abstract method.");
}
var uidCounter_ = 0;
function getUid(obj) {
  const uidObj = (
    /** @type {{ol_uid: (string|undefined)}} */
    /** @type {unknown} */
    obj
  );
  return uidObj.ol_uid || (uidObj.ol_uid = String(++uidCounter_));
}

// node_modules/ol/functions.js
function VOID() {
}
function memoizeOne(fn) {
  let lastResult;
  let lastArgs;
  let lastThis;
  return function() {
    const nextArgs = Array.prototype.slice.call(arguments);
    if (!lastArgs || this !== lastThis || !equals(nextArgs, lastArgs)) {
      lastThis = this;
      lastArgs = nextArgs;
      lastResult = fn.apply(this, nextArgs);
    }
    return lastResult;
  };
}

// node_modules/ol/events/Event.js
var BaseEvent = class {
  /**
   * @param {string} type Type.
   */
  constructor(type) {
    this.propagationStopped;
    this.defaultPrevented;
    this.type = type;
    this.target = null;
  }
  /**
   * Prevent default. This means that no emulated `click`, `singleclick` or `doubleclick` events
   * will be fired.
   * @api
   */
  preventDefault() {
    this.defaultPrevented = true;
  }
  /**
   * Stop event propagation.
   * @api
   */
  stopPropagation() {
    this.propagationStopped = true;
  }
};
var Event_default = BaseEvent;

// node_modules/ol/events/Target.js
var Target = class extends Disposable_default {
  /**
   * @param {*} [target] Default event target for dispatched events.
   */
  constructor(target) {
    super();
    this.eventTarget_ = target;
    this.pendingRemovals_ = null;
    this.dispatching_ = null;
    this.listeners_ = null;
  }
  /**
   * @param {string} type Type.
   * @param {import("../events.js").Listener} listener Listener.
   */
  addEventListener(type, listener) {
    if (!type || !listener) {
      return;
    }
    const listeners = this.listeners_ || (this.listeners_ = {});
    const listenersForType = listeners[type] || (listeners[type] = []);
    if (!listenersForType.includes(listener)) {
      listenersForType.push(listener);
    }
  }
  /**
   * Dispatches an event and calls all listeners listening for events
   * of this type. The event parameter can either be a string or an
   * Object with a `type` property.
   *
   * @param {import("./Event.js").default|string} event Event object.
   * @return {boolean|undefined} `false` if anyone called preventDefault on the
   *     event object or if any of the listeners returned false.
   * @api
   */
  dispatchEvent(event) {
    const isString = typeof event === "string";
    const type = isString ? event : event.type;
    const listeners = this.listeners_ && this.listeners_[type];
    if (!listeners) {
      return;
    }
    const evt = isString ? new Event_default(event) : (
      /** @type {Event} */
      event
    );
    if (!evt.target) {
      evt.target = this.eventTarget_ || this;
    }
    const dispatching = this.dispatching_ || (this.dispatching_ = {});
    const pendingRemovals = this.pendingRemovals_ || (this.pendingRemovals_ = {});
    if (!(type in dispatching)) {
      dispatching[type] = 0;
      pendingRemovals[type] = 0;
    }
    ++dispatching[type];
    let propagate;
    for (let i = 0, ii = listeners.length; i < ii; ++i) {
      if ("handleEvent" in listeners[i]) {
        propagate = /** @type {import("../events.js").ListenerObject} */
        listeners[i].handleEvent(evt);
      } else {
        propagate = /** @type {import("../events.js").ListenerFunction} */
        listeners[i].call(this, evt);
      }
      if (propagate === false || evt.propagationStopped) {
        propagate = false;
        break;
      }
    }
    if (--dispatching[type] === 0) {
      let pr = pendingRemovals[type];
      delete pendingRemovals[type];
      while (pr--) {
        this.removeEventListener(type, VOID);
      }
      delete dispatching[type];
    }
    return (
      /** @type {boolean|undefined} */
      propagate
    );
  }
  /**
   * Clean up.
   * @override
   */
  disposeInternal() {
    this.listeners_ && clear(this.listeners_);
  }
  /**
   * Get the listeners for a specified event type. Listeners are returned in the
   * order that they will be called in.
   *
   * @param {string} type Type.
   * @return {Array<import("../events.js").Listener>|undefined} Listeners.
   */
  getListeners(type) {
    return this.listeners_ && this.listeners_[type] || void 0;
  }
  /**
   * @param {string} [type] Type. If not provided,
   *     `true` will be returned if this event target has any listeners.
   * @return {boolean} Has listeners.
   */
  hasListener(type) {
    if (!this.listeners_) {
      return false;
    }
    return type ? type in this.listeners_ : Object.keys(this.listeners_).length > 0;
  }
  /**
   * @param {string} type Type.
   * @param {import("../events.js").Listener} listener Listener.
   */
  removeEventListener(type, listener) {
    if (!this.listeners_) {
      return;
    }
    const listeners = this.listeners_[type];
    if (!listeners) {
      return;
    }
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      if (this.pendingRemovals_ && type in this.pendingRemovals_) {
        listeners[index] = VOID;
        ++this.pendingRemovals_[type];
      } else {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          delete this.listeners_[type];
        }
      }
    }
  }
};
var Target_default = Target;

// node_modules/ol/Observable.js
var Observable = class extends Target_default {
  constructor() {
    super();
    this.on = /** @type {ObservableOnSignature<import("./events.js").EventsKey>} */
    this.onInternal;
    this.once = /** @type {ObservableOnSignature<import("./events.js").EventsKey>} */
    this.onceInternal;
    this.un = /** @type {ObservableOnSignature<void>} */
    this.unInternal;
    this.revision_ = 0;
  }
  /**
   * Increases the revision counter and dispatches a 'change' event.
   * @api
   */
  changed() {
    ++this.revision_;
    this.dispatchEvent(EventType_default.CHANGE);
  }
  /**
   * Get the version number for this object.  Each time the object is modified,
   * its version number will be incremented.
   * @return {number} Revision.
   * @api
   */
  getRevision() {
    return this.revision_;
  }
  /**
   * @param {string|Array<string>} type Type.
   * @param {function((Event|import("./events/Event.js").default)): ?} listener Listener.
   * @return {import("./events.js").EventsKey|Array<import("./events.js").EventsKey>} Event key.
   * @protected
   */
  onInternal(type, listener) {
    if (Array.isArray(type)) {
      const len = type.length;
      const keys = new Array(len);
      for (let i = 0; i < len; ++i) {
        keys[i] = listen(this, type[i], listener);
      }
      return keys;
    }
    return listen(
      this,
      /** @type {string} */
      type,
      listener
    );
  }
  /**
   * @param {string|Array<string>} type Type.
   * @param {function((Event|import("./events/Event.js").default)): ?} listener Listener.
   * @return {import("./events.js").EventsKey|Array<import("./events.js").EventsKey>} Event key.
   * @protected
   */
  onceInternal(type, listener) {
    let key;
    if (Array.isArray(type)) {
      const len = type.length;
      key = new Array(len);
      for (let i = 0; i < len; ++i) {
        key[i] = listenOnce(this, type[i], listener);
      }
    } else {
      key = listenOnce(
        this,
        /** @type {string} */
        type,
        listener
      );
    }
    listener.ol_key = key;
    return key;
  }
  /**
   * Unlisten for a certain type of event.
   * @param {string|Array<string>} type Type.
   * @param {function((Event|import("./events/Event.js").default)): ?} listener Listener.
   * @protected
   */
  unInternal(type, listener) {
    const key = (
      /** @type {ListenerWithKey} */
      listener.ol_key
    );
    if (key) {
      unByKey(key);
    } else if (Array.isArray(type)) {
      for (let i = 0, ii = type.length; i < ii; ++i) {
        this.removeEventListener(type[i], listener);
      }
    } else {
      this.removeEventListener(type, listener);
    }
  }
};
Observable.prototype.on;
Observable.prototype.once;
Observable.prototype.un;
function unByKey(key) {
  if (Array.isArray(key)) {
    for (let i = 0, ii = key.length; i < ii; ++i) {
      unlistenByKey(key[i]);
    }
  } else {
    unlistenByKey(
      /** @type {import("./events.js").EventsKey} */
      key
    );
  }
}
var Observable_default = Observable;

// node_modules/ol/Object.js
var ObjectEvent = class extends Event_default {
  /**
   * @param {string} type The event type.
   * @param {string} key The property name.
   * @param {*} oldValue The old value for `key`.
   */
  constructor(type, key, oldValue) {
    super(type);
    this.key = key;
    this.oldValue = oldValue;
  }
};
var BaseObject = class extends Observable_default {
  /**
   * @param {NoInfer<Properties>} [values] An object with key-value pairs.
   */
  constructor(values) {
    super();
    this.on;
    this.once;
    this.un;
    getUid(this);
    this.values_ = null;
    if (values !== void 0) {
      this.setProperties(values);
    }
  }
  /**
   * Gets a value.
   * @param {string} key Key name.
   * @return {*} Value.
   * @api
   */
  get(key) {
    let value;
    if (this.values_ && this.values_.hasOwnProperty(key)) {
      value = this.values_[key];
    }
    return value;
  }
  /**
   * Get a list of object property names.
   * @return {Array<string>} List of property names.
   * @api
   */
  getKeys() {
    return this.values_ && Object.keys(this.values_) || [];
  }
  /**
   * Get an object of all property names and values.
   * @return {NoInfer<Properties>} Object.
   * @api
   */
  getProperties() {
    return (
      /** @type {NoInfer<Properties>} */
      this.values_ && Object.assign({}, this.values_) || {}
    );
  }
  /**
   * Get an object of all property names and values.
   * @return {Partial<NoInfer<Properties>>?} Object.
   */
  getPropertiesInternal() {
    return this.values_;
  }
  /**
   * @return {boolean} The object has properties.
   */
  hasProperties() {
    return !!this.values_;
  }
  /**
   * @param {string} key Key name.
   * @param {*} oldValue Old value.
   */
  notify(key, oldValue) {
    let eventType;
    eventType = `change:${key}`;
    if (this.hasListener(eventType)) {
      this.dispatchEvent(new ObjectEvent(eventType, key, oldValue));
    }
    eventType = ObjectEventType_default.PROPERTYCHANGE;
    if (this.hasListener(eventType)) {
      this.dispatchEvent(new ObjectEvent(eventType, key, oldValue));
    }
  }
  /**
   * @param {string} key Key name.
   * @param {import("./events.js").Listener} listener Listener.
   */
  addChangeListener(key, listener) {
    this.addEventListener(`change:${key}`, listener);
  }
  /**
   * @param {string} key Key name.
   * @param {import("./events.js").Listener} listener Listener.
   */
  removeChangeListener(key, listener) {
    this.removeEventListener(`change:${key}`, listener);
  }
  /**
   * Sets a value.
   * @param {string} key Key name.
   * @param {*} value Value.
   * @param {boolean} [silent] Update without triggering an event.
   * @api
   */
  set(key, value, silent) {
    const values = (
      /** @type {Object<string, *>} */
      this.values_ || (this.values_ = /** @type {Partial<NoInfer<Properties>>} */
      {})
    );
    if (silent) {
      values[key] = value;
    } else {
      const oldValue = values[key];
      values[key] = value;
      if (oldValue !== value) {
        this.notify(key, oldValue);
      }
    }
  }
  /**
   * Sets a collection of key-value pairs.  Note that this changes any existing
   * properties and adds new ones (it does not remove any existing properties).
   * @param {Partial<NoInfer<Properties>>} values Values.
   * @param {boolean} [silent] Update without triggering an event.
   * @api
   */
  setProperties(values, silent) {
    for (const key in values) {
      this.set(key, values[key], silent);
    }
  }
  /**
   * Apply any properties from another object without triggering events.
   * @param {BaseObject} source The source object.
   * @protected
   */
  applyProperties(source) {
    if (!source.values_) {
      return;
    }
    Object.assign(this.values_ || (this.values_ = {}), source.values_);
  }
  /**
   * Unsets a property.
   * @param {string} key Key name.
   * @param {boolean} [silent] Unset without triggering an event.
   * @api
   */
  unset(key, silent) {
    if (this.values_ && key in this.values_) {
      const oldValue = this.values_[key];
      delete this.values_[key];
      if (isEmpty(this.values_)) {
        this.values_ = null;
      }
      if (!silent) {
        this.notify(key, oldValue);
      }
    }
  }
};
var Object_default = BaseObject;

// node_modules/ol/asserts.js
function assert(assertion, errorMessage) {
  if (!assertion) {
    throw new Error(errorMessage);
  }
}

// node_modules/ol/Feature.js
var Feature = class _Feature extends Object_default {
  /**
   * @param {Geometry|ObjectWithGeometry<Geometry, NoInfer<Properties>>} [geometryOrProperties]
   *     You may pass a Geometry object directly, or an object literal containing
   *     properties. If you pass an object literal, you may include a Geometry
   *     associated with a `geometry` key.
   */
  constructor(geometryOrProperties) {
    super();
    this.on;
    this.once;
    this.un;
    this.id_ = void 0;
    this.geometryName_ = "geometry";
    this.style_ = null;
    this.styleFunction_ = void 0;
    this.geometryChangeKey_ = null;
    this.addChangeListener(this.geometryName_, this.handleGeometryChanged_);
    if (geometryOrProperties) {
      if (typeof /** @type {?} */
      geometryOrProperties.getSimplifiedGeometry === "function") {
        const geometry = (
          /** @type {Geometry} */
          geometryOrProperties
        );
        this.setGeometry(geometry);
      } else {
        const properties = geometryOrProperties;
        this.setProperties(properties);
      }
    }
  }
  /**
   * Clone this feature. If the original feature has a geometry it
   * is also cloned. The feature id is not set in the clone.
   * @return {Feature<Geometry>} The clone.
   * @api
   */
  clone() {
    const clone = (
      /** @type {Feature<Geometry>} */
      new _Feature()
    );
    const geometryName = this.geometryName_;
    clone.setGeometryName(geometryName);
    const properties = this.getPropertiesInternal();
    if (properties) {
      const geometry = this.getGeometry();
      for (const key in properties) {
        if (key === geometryName && geometry) {
          clone.set(key, geometry.clone());
        } else {
          clone.set(key, properties[key], true);
        }
      }
    }
    const style = this.getStyle();
    if (style) {
      clone.setStyle(style);
    }
    return clone;
  }
  /**
   * Get the feature's default geometry.  A feature may have any number of named
   * geometries.  The "default" geometry (the one that is rendered by default) is
   * set when calling {@link module:ol/Feature~Feature#setGeometry}.
   * @return {Geometry|undefined} The default geometry for the feature.
   * @api
   * @observable
   */
  getGeometry() {
    return (
      /** @type {Geometry|undefined} */
      this.get(this.geometryName_)
    );
  }
  /**
   * Get the feature identifier.  This is a stable identifier for the feature and
   * is either set when reading data from a remote source or set explicitly by
   * calling {@link module:ol/Feature~Feature#setId}.
   * @return {number|string|undefined} Id.
   * @api
   */
  getId() {
    return this.id_;
  }
  /**
   * Get the name of the feature's default geometry.  By default, the default
   * geometry is named `geometry`.
   * @return {string} Get the property name associated with the default geometry
   *     for this feature.
   * @api
   */
  getGeometryName() {
    return this.geometryName_;
  }
  /**
   * Get the feature's style. Will return what was provided to the
   * {@link module:ol/Feature~Feature#setStyle} method.
   * @return {import("./style/Style.js").StyleLike|null|undefined} The feature style.
   * @api
   */
  getStyle() {
    return this.style_;
  }
  /**
   * Get the feature's style function.
   * @return {import("./style/Style.js").StyleFunction|undefined} Return a function
   * representing the current style of this feature.
   * @api
   */
  getStyleFunction() {
    return this.styleFunction_;
  }
  /**
   * @private
   */
  handleGeometryChange_() {
    this.changed();
  }
  /**
   * @private
   */
  handleGeometryChanged_() {
    if (this.geometryChangeKey_) {
      unlistenByKey(this.geometryChangeKey_);
      this.geometryChangeKey_ = null;
    }
    const geometry = this.getGeometry();
    if (geometry) {
      this.geometryChangeKey_ = listen(
        geometry,
        EventType_default.CHANGE,
        this.handleGeometryChange_,
        this
      );
    }
    this.changed();
  }
  /**
   * Set the default geometry for the feature.  This will update the property
   * with the name returned by {@link module:ol/Feature~Feature#getGeometryName}.
   * @param {Geometry|null|undefined} geometry The new geometry.
   * @api
   * @observable
   */
  setGeometry(geometry) {
    this.set(this.geometryName_, geometry);
  }
  /**
   * Set the style for the feature to override the layer style.  This can be a
   * single style object, an array of styles, or a function that takes a
   * resolution and returns an array of styles. To unset the feature style, call
   * `setStyle()` without arguments or a falsey value.
   * @param {import("./style/Style.js").StyleLike|null|undefined} [style] Style for this feature.
   * @api
   * @fires module:ol/events/Event~BaseEvent#event:change
   */
  setStyle(style) {
    this.style_ = style ?? null;
    this.styleFunction_ = !style ? void 0 : createStyleFunction(style);
    this.changed();
  }
  /**
   * Set the feature id.  The feature id is considered stable and may be used when
   * requesting features or comparing identifiers returned from a remote source.
   * The feature id can be used with the
   * {@link module:ol/source/Vector~VectorSource#getFeatureById} method.
   * @param {number|string|undefined} id The feature id.
   * @api
   * @fires module:ol/events/Event~BaseEvent#event:change
   */
  setId(id) {
    this.id_ = id;
    this.changed();
  }
  /**
   * Set the property name to be used when getting the feature's default geometry.
   * When calling {@link module:ol/Feature~Feature#getGeometry}, the value of the property with
   * this name will be returned.
   * @param {string} name The property name of the default geometry.
   * @api
   */
  setGeometryName(name) {
    if (name === this.geometryName_) {
      return;
    }
    this.removeChangeListener(this.geometryName_, this.handleGeometryChanged_);
    this.geometryName_ = name;
    this.addChangeListener(this.geometryName_, this.handleGeometryChanged_);
    this.handleGeometryChanged_();
  }
};
function createStyleFunction(obj) {
  if (typeof obj === "function") {
    return obj;
  }
  let styles;
  if (Array.isArray(obj)) {
    styles = obj;
  } else {
    assert(
      typeof /** @type {?} */
      obj.getZIndex === "function",
      "Expected an `ol/style/Style` or an array of `ol/style/Style.js`"
    );
    const style = (
      /** @type {import("./style/Style.js").default} */
      obj
    );
    styles = [style];
  }
  return function() {
    return styles;
  };
}
var Feature_default = Feature;

// node_modules/ol/extent/Relationship.js
var Relationship_default = {
  UNKNOWN: 0,
  INTERSECTING: 1,
  ABOVE: 2,
  RIGHT: 4,
  BELOW: 8,
  LEFT: 16
};

// node_modules/ol/extent.js
function boundingExtent(coordinates2) {
  const extent = createEmpty();
  for (let i = 0, ii = coordinates2.length; i < ii; ++i) {
    extendCoordinate(extent, coordinates2[i]);
  }
  return extent;
}
function closestSquaredDistanceXY(extent, x, y) {
  let dx, dy;
  if (x < extent[0]) {
    dx = extent[0] - x;
  } else if (extent[2] < x) {
    dx = x - extent[2];
  } else {
    dx = 0;
  }
  if (y < extent[1]) {
    dy = extent[1] - y;
  } else if (extent[3] < y) {
    dy = y - extent[3];
  } else {
    dy = 0;
  }
  return dx * dx + dy * dy;
}
function containsXY(extent, x, y) {
  return extent[0] <= x && x <= extent[2] && extent[1] <= y && y <= extent[3];
}
function coordinateRelationship(extent, coordinate) {
  const minX = extent[0];
  const minY = extent[1];
  const maxX = extent[2];
  const maxY = extent[3];
  const x = coordinate[0];
  const y = coordinate[1];
  let relationship = Relationship_default.UNKNOWN;
  if (x < minX) {
    relationship = relationship | Relationship_default.LEFT;
  } else if (x > maxX) {
    relationship = relationship | Relationship_default.RIGHT;
  }
  if (y < minY) {
    relationship = relationship | Relationship_default.BELOW;
  } else if (y > maxY) {
    relationship = relationship | Relationship_default.ABOVE;
  }
  if (relationship === Relationship_default.UNKNOWN) {
    relationship = Relationship_default.INTERSECTING;
  }
  return relationship;
}
function createEmpty() {
  return [Infinity, Infinity, -Infinity, -Infinity];
}
function createOrUpdate(minX, minY, maxX, maxY, dest2) {
  if (dest2) {
    dest2[0] = minX;
    dest2[1] = minY;
    dest2[2] = maxX;
    dest2[3] = maxY;
    return dest2;
  }
  return [minX, minY, maxX, maxY];
}
function createOrUpdateEmpty(dest2) {
  return createOrUpdate(Infinity, Infinity, -Infinity, -Infinity, dest2);
}
function createOrUpdateFromCoordinate(coordinate, dest2) {
  const x = coordinate[0];
  const y = coordinate[1];
  return createOrUpdate(x, y, x, y, dest2);
}
function createOrUpdateFromFlatCoordinates(flatCoordinates, offset, end, stride, dest2) {
  const extent = createOrUpdateEmpty(dest2);
  return extendFlatCoordinates(extent, flatCoordinates, offset, end, stride);
}
function extendCoordinate(extent, coordinate) {
  if (coordinate[0] < extent[0]) {
    extent[0] = coordinate[0];
  }
  if (coordinate[0] > extent[2]) {
    extent[2] = coordinate[0];
  }
  if (coordinate[1] < extent[1]) {
    extent[1] = coordinate[1];
  }
  if (coordinate[1] > extent[3]) {
    extent[3] = coordinate[1];
  }
}
function extendFlatCoordinates(extent, flatCoordinates, offset, end, stride) {
  for (; offset < end; offset += stride) {
    extendXY(extent, flatCoordinates[offset], flatCoordinates[offset + 1]);
  }
  return extent;
}
function extendXY(extent, x, y) {
  extent[0] = Math.min(extent[0], x);
  extent[1] = Math.min(extent[1], y);
  extent[2] = Math.max(extent[2], x);
  extent[3] = Math.max(extent[3], y);
}
function forEachCorner(extent, callback) {
  let val;
  val = callback(getBottomLeft(extent));
  if (val) {
    return val;
  }
  val = callback(getBottomRight(extent));
  if (val) {
    return val;
  }
  val = callback(getTopRight(extent));
  if (val) {
    return val;
  }
  val = callback(getTopLeft(extent));
  if (val) {
    return val;
  }
  return false;
}
function getBottomLeft(extent) {
  return [extent[0], extent[1]];
}
function getBottomRight(extent) {
  return [extent[2], extent[1]];
}
function getCenter(extent) {
  return [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
}
function getHeight(extent) {
  return extent[3] - extent[1];
}
function getTopLeft(extent) {
  return [extent[0], extent[3]];
}
function getTopRight(extent) {
  return [extent[2], extent[3]];
}
function intersects(extent1, extent2) {
  return extent1[0] <= extent2[2] && extent1[2] >= extent2[0] && extent1[1] <= extent2[3] && extent1[3] >= extent2[1];
}
function returnOrUpdate(extent, dest2) {
  if (dest2) {
    dest2[0] = extent[0];
    dest2[1] = extent[1];
    dest2[2] = extent[2];
    dest2[3] = extent[3];
    return dest2;
  }
  return extent;
}
function intersectsSegment(extent, start, end) {
  let intersects2 = false;
  const startRel = coordinateRelationship(extent, start);
  const endRel = coordinateRelationship(extent, end);
  if (startRel === Relationship_default.INTERSECTING || endRel === Relationship_default.INTERSECTING) {
    intersects2 = true;
  } else {
    const minX = extent[0];
    const minY = extent[1];
    const maxX = extent[2];
    const maxY = extent[3];
    const startX = start[0];
    const startY = start[1];
    const endX = end[0];
    const endY = end[1];
    const slope = (endY - startY) / (endX - startX);
    let x, y;
    if (!!(endRel & Relationship_default.ABOVE) && !(startRel & Relationship_default.ABOVE)) {
      x = endX - (endY - maxY) / slope;
      intersects2 = x >= minX && x <= maxX;
    }
    if (!intersects2 && !!(endRel & Relationship_default.RIGHT) && !(startRel & Relationship_default.RIGHT)) {
      y = endY - (endX - maxX) * slope;
      intersects2 = y >= minY && y <= maxY;
    }
    if (!intersects2 && !!(endRel & Relationship_default.BELOW) && !(startRel & Relationship_default.BELOW)) {
      x = endX - (endY - minY) / slope;
      intersects2 = x >= minX && x <= maxX;
    }
    if (!intersects2 && !!(endRel & Relationship_default.LEFT) && !(startRel & Relationship_default.LEFT)) {
      y = endY - (endX - minX) * slope;
      intersects2 = y >= minY && y <= maxY;
    }
  }
  return intersects2;
}

// node_modules/ol/math.js
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function squaredSegmentDistance(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx !== 0 || dy !== 0) {
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x1 = x2;
      y1 = y2;
    } else if (t > 0) {
      x1 += dx * t;
      y1 += dy * t;
    }
  }
  return squaredDistance(x, y, x1, y1);
}
function squaredDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}
function toDegrees(angleInRadians) {
  return angleInRadians * 180 / Math.PI;
}
function toRadians(angleInDegrees) {
  return angleInDegrees * Math.PI / 180;
}
function modulo(a, b) {
  const r = a % b;
  return r * b < 0 ? r + b : r;
}
function lerp(a, b, x) {
  return a + x * (b - a);
}
function toFixed(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
function wrap(n, min, max) {
  if (n >= min && n < max) {
    return n;
  }
  const range = max - min;
  return ((n - min) % range + range) % range + min;
}

// node_modules/ol/coordinate.js
function equals2(coordinate1, coordinate2) {
  let equals3 = true;
  for (let i = coordinate1.length - 1; i >= 0; --i) {
    if (coordinate1[i] != coordinate2[i]) {
      equals3 = false;
      break;
    }
  }
  return equals3;
}

// node_modules/ol/has.js
var ua = typeof navigator !== "undefined" && typeof navigator.userAgent !== "undefined" ? navigator.userAgent.toLowerCase() : "";
var SAFARI = ua.includes("safari") && !ua.includes("chrom");
var SAFARI_BUG_237906 = SAFARI && (ua.includes("version/15.4") || /cpu (os|iphone os) 15_4 like mac os x/.test(ua));
var WEBKIT = ua.includes("webkit") && !ua.includes("edge");
var MAC = ua.includes("macintosh");
var WORKER_OFFSCREEN_CANVAS = typeof WorkerGlobalScope !== "undefined" && typeof OffscreenCanvas !== "undefined" && self instanceof WorkerGlobalScope;
var IMAGE_DECODE = typeof Image !== "undefined" && Image.prototype.decode;
var PASSIVE_EVENT_LISTENERS = (function() {
  let passive = false;
  try {
    const options = Object.defineProperty({}, "passive", {
      get: function() {
        passive = true;
      }
    });
    window.addEventListener("_", null, options);
    window.removeEventListener("_", null, options);
  } catch {
  }
  return passive;
})();

// node_modules/ol/console.js
var levels = {
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};
var level = levels.info;
function warn(...args) {
  if (level > levels.warn) {
    return;
  }
  console.warn(...args);
}

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
function get(code) {
  return cache[code] || cache[code.replace(/urn:(x-)?ogc:def:crs:EPSG:(.*:)?(\w+)$/, "EPSG:$3")] || null;
}
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
function get2(sourceCode, destinationCode) {
  if (sourceCode in transforms && destinationCode in transforms[sourceCode]) {
    return transforms[sourceCode][destinationCode];
  }
  return null;
}

// node_modules/ol/proj/utm.js
var K0 = 0.9996;
var E = 669438e-8;
var E2 = E * E;
var E3 = E2 * E;
var E_P2 = E / (1 - E);
var SQRT_E = Math.sqrt(1 - E);
var _E = (1 - SQRT_E) / (1 + SQRT_E);
var _E2 = _E * _E;
var _E3 = _E2 * _E;
var _E4 = _E3 * _E;
var _E5 = _E4 * _E;
var M1 = 1 - E / 4 - 3 * E2 / 64 - 5 * E3 / 256;
var M2 = 3 * E / 8 + 3 * E2 / 32 + 45 * E3 / 1024;
var M3 = 15 * E2 / 256 + 45 * E3 / 1024;
var M4 = 35 * E3 / 3072;
var P2 = 3 / 2 * _E - 27 / 32 * _E3 + 269 / 512 * _E5;
var P3 = 21 / 16 * _E2 - 55 / 32 * _E4;
var P4 = 151 / 96 * _E3 - 417 / 128 * _E5;
var P5 = 1097 / 512 * _E4;
var R = 6378137;
function toLonLat(easting, northing, zone) {
  const x = easting - 5e5;
  const y = zone.north ? northing : northing - 1e7;
  const m = y / K0;
  const mu = m / (R * M1);
  const pRad = mu + P2 * Math.sin(2 * mu) + P3 * Math.sin(4 * mu) + P4 * Math.sin(6 * mu) + P5 * Math.sin(8 * mu);
  const pSin = Math.sin(pRad);
  const pSin2 = pSin * pSin;
  const pCos = Math.cos(pRad);
  const pTan = pSin / pCos;
  const pTan2 = pTan * pTan;
  const pTan4 = pTan2 * pTan2;
  const epSin = 1 - E * pSin2;
  const epSinSqrt = Math.sqrt(1 - E * pSin2);
  const n = R / epSinSqrt;
  const r = (1 - E) / epSin;
  const c = E_P2 * pCos ** 2;
  const c2 = c * c;
  const d = x / (n * K0);
  const d2 = d * d;
  const d3 = d2 * d;
  const d4 = d3 * d;
  const d5 = d4 * d;
  const d6 = d5 * d;
  const latitude = pRad - pTan / r * (d2 / 2 - d4 / 24 * (5 + 3 * pTan2 + 10 * c - 4 * c2 - 9 * E_P2)) + d6 / 720 * (61 + 90 * pTan2 + 298 * c + 45 * pTan4 - 252 * E_P2 - 3 * c2);
  let longitude = (d - d3 / 6 * (1 + 2 * pTan2 + c) + d5 / 120 * (5 - 2 * c + 28 * pTan2 - 3 * c2 + 8 * E_P2 + 24 * pTan4)) / pCos;
  longitude = wrap(
    longitude + toRadians(zoneToCentralLongitude(zone.number)),
    -Math.PI,
    Math.PI
  );
  return [toDegrees(longitude), toDegrees(latitude)];
}
var MIN_LATITUDE = -80;
var MAX_LATITUDE = 84;
var MIN_LONGITUDE = -180;
var MAX_LONGITUDE = 180;
function fromLonLat(longitude, latitude, zone) {
  longitude = wrap(longitude, MIN_LONGITUDE, MAX_LONGITUDE);
  if (latitude < MIN_LATITUDE) {
    latitude = MIN_LATITUDE;
  } else if (latitude > MAX_LATITUDE) {
    latitude = MAX_LATITUDE;
  }
  const latRad = toRadians(latitude);
  const latSin = Math.sin(latRad);
  const latCos = Math.cos(latRad);
  const latTan = latSin / latCos;
  const latTan2 = latTan * latTan;
  const latTan4 = latTan2 * latTan2;
  const lonRad = toRadians(longitude);
  const centralLon = zoneToCentralLongitude(zone.number);
  const centralLonRad = toRadians(centralLon);
  const n = R / Math.sqrt(1 - E * latSin ** 2);
  const c = E_P2 * latCos ** 2;
  const a = latCos * wrap(lonRad - centralLonRad, -Math.PI, Math.PI);
  const a2 = a * a;
  const a3 = a2 * a;
  const a4 = a3 * a;
  const a5 = a4 * a;
  const a6 = a5 * a;
  const m = R * (M1 * latRad - M2 * Math.sin(2 * latRad) + M3 * Math.sin(4 * latRad) - M4 * Math.sin(6 * latRad));
  const easting = K0 * n * (a + a3 / 6 * (1 - latTan2 + c) + a5 / 120 * (5 - 18 * latTan2 + latTan4 + 72 * c - 58 * E_P2)) + 5e5;
  let northing = K0 * (m + n * latTan * (a2 / 2 + a4 / 24 * (5 - latTan2 + 9 * c + 4 * c ** 2) + a6 / 720 * (61 - 58 * latTan2 + latTan4 + 600 * c - 330 * E_P2)));
  if (!zone.north) {
    northing += 1e7;
  }
  return [easting, northing];
}
function zoneToCentralLongitude(zone) {
  return (zone - 1) * 6 - 180 + 3;
}
var epsgRegExes = [
  /^EPSG:(\d+)$/,
  /^urn:ogc:def:crs:EPSG::(\d+)$/,
  /^http:\/\/www\.opengis\.net\/def\/crs\/EPSG\/0\/(\d+)$/
];
function zoneFromCode(code) {
  let epsgId = 0;
  for (const re of epsgRegExes) {
    const match = code.match(re);
    if (match) {
      epsgId = parseInt(match[1]);
      break;
    }
  }
  if (!epsgId) {
    return null;
  }
  let number = 0;
  let north = false;
  if (epsgId > 32700 && epsgId < 32761) {
    number = epsgId - 32700;
  } else if (epsgId > 32600 && epsgId < 32661) {
    north = true;
    number = epsgId - 32600;
  }
  if (!number) {
    return null;
  }
  return { number, north };
}
function makeTransformFunction(transformer, zone) {
  return function(input, output, dimension, stride) {
    const length = input.length;
    dimension = dimension !== void 0 && dimension > 1 ? dimension : 2;
    stride = stride ?? dimension;
    if (!output) {
      if (dimension > 2) {
        output = input.slice();
      } else {
        output = new Array(length);
      }
    }
    for (let i = 0; i < length; i += stride) {
      const x = input[i];
      const y = input[i + 1];
      const coord = transformer(x, y, zone);
      output[i] = coord[0];
      output[i + 1] = coord[1];
    }
    return output;
  };
}
function makeProjection(code) {
  const zone = zoneFromCode(code);
  if (!zone) {
    return null;
  }
  return new Projection_default({ code, units: "m" });
}
function makeTransforms(projection) {
  const zone = zoneFromCode(projection.getCode());
  if (!zone) {
    return null;
  }
  return {
    forward: makeTransformFunction(fromLonLat, zone),
    inverse: makeTransformFunction(toLonLat, zone)
  };
}

// node_modules/ol/sphere.js
var DEFAULT_RADIUS = 63710088e-1;
function getDistance(c1, c2, radius) {
  radius = radius || DEFAULT_RADIUS;
  const lat1 = toRadians(c1[1]);
  const lat2 = toRadians(c2[1]);
  const deltaLatBy2 = (lat2 - lat1) / 2;
  const deltaLonBy2 = toRadians(c2[0] - c1[0]) / 2;
  const a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) + Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getLengthInternal(coordinates2, radius) {
  let length = 0;
  for (let i = 0, ii = coordinates2.length; i < ii - 1; ++i) {
    length += getDistance(coordinates2[i], coordinates2[i + 1], radius);
  }
  return length;
}
function getLength(geometry, options) {
  options = options || {};
  const radius = options.radius || DEFAULT_RADIUS;
  const projection = options.projection || "EPSG:3857";
  const type = geometry.getType();
  if (type !== "GeometryCollection") {
    geometry = geometry.clone().transform(projection, "EPSG:4326");
  }
  let length = 0;
  let coordinates2, coords, i, ii, j, jj;
  switch (type) {
    case "Point":
    case "MultiPoint": {
      break;
    }
    case "LineString":
    case "LinearRing": {
      coordinates2 = /** @type {import("./geom/SimpleGeometry.js").default} */
      geometry.getCoordinates();
      if (coordinates2) {
        length = getLengthInternal(coordinates2, radius);
      }
      break;
    }
    case "MultiLineString":
    case "Polygon": {
      coordinates2 = /** @type {import("./geom/SimpleGeometry.js").default} */
      geometry.getCoordinates();
      if (coordinates2) {
        for (i = 0, ii = coordinates2.length; i < ii; ++i) {
          length += getLengthInternal(coordinates2[i], radius);
        }
      }
      break;
    }
    case "MultiPolygon": {
      coordinates2 = /** @type {import("./geom/SimpleGeometry.js").default} */
      geometry.getCoordinates();
      if (coordinates2) {
        for (i = 0, ii = coordinates2.length; i < ii; ++i) {
          coords = coordinates2[i];
          for (j = 0, jj = coords.length; j < jj; ++j) {
            length += getLengthInternal(coords[j], radius);
          }
        }
      }
      break;
    }
    case "GeometryCollection": {
      const geometries = (
        /** @type {import("./geom/GeometryCollection.js").default} */
        geometry.getGeometries()
      );
      for (i = 0, ii = geometries.length; i < ii; ++i) {
        length += getLength(geometries[i], options);
      }
      break;
    }
    default: {
      throw new Error("Unsupported geometry type: " + type);
    }
  }
  return length;
}
function getAreaInternal(coordinates2, radius) {
  let area = 0;
  const len = coordinates2.length;
  let x1 = coordinates2[len - 1][0];
  let y1 = coordinates2[len - 1][1];
  for (let i = 0; i < len; i++) {
    const x2 = coordinates2[i][0];
    const y2 = coordinates2[i][1];
    area += toRadians(x2 - x1) * (2 + Math.sin(toRadians(y1)) + Math.sin(toRadians(y2)));
    x1 = x2;
    y1 = y2;
  }
  return area * radius * radius / 2;
}
function getArea(geometry, options) {
  options = options || {};
  const radius = options.radius || DEFAULT_RADIUS;
  const projection = options.projection || "EPSG:3857";
  const type = geometry.getType();
  if (type !== "GeometryCollection") {
    geometry = geometry.clone().transform(projection, "EPSG:4326");
  }
  let area = 0;
  let coordinates2, coords, i, ii, j, jj;
  switch (type) {
    case "Point":
    case "MultiPoint":
    case "LineString":
    case "MultiLineString":
    case "LinearRing": {
      break;
    }
    case "Polygon": {
      coordinates2 = /** @type {import("./geom/Polygon.js").default} */
      geometry.getCoordinates();
      area = Math.abs(getAreaInternal(coordinates2[0], radius));
      for (i = 1, ii = coordinates2.length; i < ii; ++i) {
        area -= Math.abs(getAreaInternal(coordinates2[i], radius));
      }
      break;
    }
    case "MultiPolygon": {
      coordinates2 = /** @type {import("./geom/SimpleGeometry.js").default} */
      geometry.getCoordinates();
      if (coordinates2) {
        for (i = 0, ii = coordinates2.length; i < ii; ++i) {
          coords = coordinates2[i];
          area += Math.abs(getAreaInternal(coords[0], radius));
          for (j = 1, jj = coords.length; j < jj; ++j) {
            area -= Math.abs(getAreaInternal(coords[j], radius));
          }
        }
      }
      break;
    }
    case "GeometryCollection": {
      const geometries = (
        /** @type {import("./geom/GeometryCollection.js").default} */
        geometry.getGeometries()
      );
      for (i = 0, ii = geometries.length; i < ii; ++i) {
        area += getArea(geometries[i], options);
      }
      break;
    }
    default: {
      throw new Error("Unsupported geometry type: " + type);
    }
  }
  return area;
}

// node_modules/ol/proj.js
var transformFactories = [makeTransforms];
var projectionFactories = [makeProjection];
var showCoordinateWarning = true;
function disableCoordinateWarning(disable) {
  const hide = disable === void 0 ? true : disable;
  showCoordinateWarning = !hide;
}
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
function get3(projectionLike) {
  if (!(typeof projectionLike === "string")) {
    return projectionLike !== void 0 ? projectionLike : null;
  }
  const projection = get(projectionLike);
  if (projection) {
    return projection;
  }
  for (const makeProjection2 of projectionFactories) {
    const projection2 = makeProjection2(projectionLike);
    if (projection2) {
      return projection2;
    }
  }
  return null;
}
function getPointResolution(projection, resolution, point, units) {
  const projectionObj = get3(projection);
  if (!projectionObj) {
    return resolution;
  }
  let pointResolution;
  const getter = projectionObj.getPointResolutionFunc();
  if (getter) {
    pointResolution = getter(resolution, point);
    if (units && units !== projectionObj.getUnits()) {
      const metersPerUnit = projectionObj.getMetersPerUnit();
      if (metersPerUnit) {
        pointResolution = pointResolution * metersPerUnit / /** @type {number} */
        METERS_PER_UNIT[units];
      }
    }
  } else {
    const projUnits = projectionObj.getUnits();
    if (projUnits == "degrees" && !units || units == "degrees") {
      pointResolution = resolution;
    } else {
      const toEPSG43262 = getTransformFromProjections(
        projectionObj,
        get3("EPSG:4326")
      );
      if (!toEPSG43262 && projUnits !== "degrees") {
        pointResolution = resolution * (projectionObj.getMetersPerUnit() ?? 1);
      } else {
        let vertices = [
          point[0] - resolution / 2,
          point[1],
          point[0] + resolution / 2,
          point[1],
          point[0],
          point[1] - resolution / 2,
          point[0],
          point[1] + resolution / 2
        ];
        if (toEPSG43262) {
          vertices = toEPSG43262(vertices, vertices, 2);
        }
        const width = getDistance(vertices.slice(0, 2), vertices.slice(2, 4));
        const height = getDistance(vertices.slice(4, 6), vertices.slice(6, 8));
        pointResolution = (width + height) / 2;
      }
      const metersPerUnit = units ? METERS_PER_UNIT[units] : projectionObj.getMetersPerUnit();
      if (metersPerUnit !== void 0) {
        pointResolution /= metersPerUnit;
      }
    }
  }
  return pointResolution;
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
function fromLonLat2(coordinate, projection) {
  disableCoordinateWarning();
  return transform(
    coordinate,
    "EPSG:4326",
    projection !== void 0 ? projection : "EPSG:3857"
  );
}
function toLonLat2(coordinate, projection) {
  const lonLat = transform(
    coordinate,
    projection !== void 0 ? projection : "EPSG:3857",
    "EPSG:4326"
  );
  const lon = lonLat[0];
  if (lon < -180 || lon > 180) {
    lonLat[0] = modulo(lon + 180, 360) - 180;
  }
  return lonLat;
}
function getTransformFromProjections(source, destination) {
  if (!source || !destination) {
    return null;
  }
  const sourceCode = source.getCode();
  const destinationCode = destination.getCode();
  let transformFunc = get2(sourceCode, destinationCode);
  if (transformFunc) {
    return transformFunc;
  }
  let sourceTransforms = null;
  let destinationTransforms = null;
  for (const makeTransforms2 of transformFactories) {
    if (!sourceTransforms) {
      sourceTransforms = makeTransforms2(source);
    }
    if (!destinationTransforms) {
      destinationTransforms = makeTransforms2(destination);
    }
  }
  if (!sourceTransforms && !destinationTransforms) {
    return null;
  }
  const intermediateCode = "EPSG:4326";
  if (!destinationTransforms && sourceTransforms) {
    const toDestination = get2(intermediateCode, destinationCode);
    if (toDestination) {
      transformFunc = composeTransformFuncs(
        sourceTransforms.inverse,
        toDestination
      );
    }
  } else if (!sourceTransforms && destinationTransforms) {
    const fromSource = get2(sourceCode, intermediateCode);
    if (fromSource) {
      transformFunc = composeTransformFuncs(
        fromSource,
        destinationTransforms.forward
      );
    }
  } else if (sourceTransforms && destinationTransforms) {
    transformFunc = composeTransformFuncs(
      sourceTransforms.inverse,
      destinationTransforms.forward
    );
  }
  if (transformFunc) {
    addProjection(source);
    addProjection(destination);
    add2(source, destination, transformFunc);
  }
  return transformFunc;
}
function composeTransformFuncs(t1, t2) {
  return function(input, output, dimensions, stride) {
    output = t1(input, output, dimensions, stride);
    return t2(output, output, dimensions, stride);
  };
}
function getTransform(source, destination) {
  const sourceProjection = get3(source);
  const destinationProjection = get3(destination);
  return getTransformFromProjections(sourceProjection, destinationProjection);
}
function transform(coordinate, source, destination) {
  const transformFunc = getTransform(source, destination);
  if (!transformFunc) {
    const sourceCode = get3(source)?.getCode() ?? String(source);
    const destinationCode = get3(destination)?.getCode() ?? String(destination);
    throw new Error(
      `No transform available between ${sourceCode} and ${destinationCode}`
    );
  }
  return transformFunc(coordinate, void 0, coordinate.length);
}
var userProjection = null;
function getUserProjection() {
  return userProjection;
}
function fromUserCoordinate(coordinate, destProjection) {
  if (!userProjection) {
    if (showCoordinateWarning && !equals2(coordinate, [0, 0]) && coordinate[0] >= -180 && coordinate[0] <= 180 && coordinate[1] >= -90 && coordinate[1] <= 90) {
      showCoordinateWarning = false;
      warn(
        "Call useGeographic() from ol/proj once to work with [longitude, latitude] coordinates."
      );
    }
    return coordinate;
  }
  return transform(coordinate, userProjection, destProjection);
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

// node_modules/ol/transform.js
var IDENTITY_TRANSFORM = [1, 0, 0, 1, 0, 0];
var tmp_ = new Array(6);
function create() {
  return IDENTITY_TRANSFORM.slice(0);
}
function compose(transform2, dx1, dy1, sx, sy, angle, dx2, dy2) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  transform2[0] = sx * cos;
  transform2[1] = sy * sin;
  transform2[2] = -sx * sin;
  transform2[3] = sy * cos;
  transform2[4] = dx2 * sx * cos - dy2 * sx * sin + dx1;
  transform2[5] = dx2 * sy * sin + dy2 * sy * cos + dy1;
  return transform2;
}

// node_modules/ol/geom/flat/transform.js
function transform2D(flatCoordinates, offset, end, stride, transform2, dest2, destinationStride) {
  dest2 = dest2 ? dest2 : [];
  destinationStride = destinationStride ? destinationStride : 2;
  let i = 0;
  for (let j = offset; j < end; j += stride) {
    const x = flatCoordinates[j];
    const y = flatCoordinates[j + 1];
    dest2[i++] = transform2[0] * x + transform2[2] * y + transform2[4];
    dest2[i++] = transform2[1] * x + transform2[3] * y + transform2[5];
    for (let k = 2; k < destinationStride; k++) {
      dest2[i++] = flatCoordinates[j + k];
    }
  }
  if (dest2 && dest2.length != i) {
    dest2.length = i;
  }
  return dest2;
}
function rotate(flatCoordinates, offset, end, stride, angle, anchor, dest2) {
  dest2 = dest2 ? dest2 : [];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const anchorX = anchor[0];
  const anchorY = anchor[1];
  let i = 0;
  for (let j = offset; j < end; j += stride) {
    const deltaX = flatCoordinates[j] - anchorX;
    const deltaY = flatCoordinates[j + 1] - anchorY;
    dest2[i++] = anchorX + deltaX * cos - deltaY * sin;
    dest2[i++] = anchorY + deltaX * sin + deltaY * cos;
    for (let k = j + 2; k < j + stride; ++k) {
      dest2[i++] = flatCoordinates[k];
    }
  }
  if (dest2 && dest2.length != i) {
    dest2.length = i;
  }
  return dest2;
}
function scale(flatCoordinates, offset, end, stride, sx, sy, anchor, dest2) {
  dest2 = dest2 ? dest2 : [];
  const anchorX = anchor[0];
  const anchorY = anchor[1];
  let i = 0;
  for (let j = offset; j < end; j += stride) {
    const deltaX = flatCoordinates[j] - anchorX;
    const deltaY = flatCoordinates[j + 1] - anchorY;
    dest2[i++] = anchorX + sx * deltaX;
    dest2[i++] = anchorY + sy * deltaY;
    for (let k = j + 2; k < j + stride; ++k) {
      dest2[i++] = flatCoordinates[k];
    }
  }
  if (dest2 && dest2.length != i) {
    dest2.length = i;
  }
  return dest2;
}
function translate(flatCoordinates, offset, end, stride, deltaX, deltaY, dest2) {
  dest2 = dest2 ? dest2 : [];
  let i = 0;
  for (let j = offset; j < end; j += stride) {
    dest2[i++] = flatCoordinates[j] + deltaX;
    dest2[i++] = flatCoordinates[j + 1] + deltaY;
    for (let k = j + 2; k < j + stride; ++k) {
      dest2[i++] = flatCoordinates[k];
    }
  }
  if (dest2 && dest2.length != i) {
    dest2.length = i;
  }
  return dest2;
}

// node_modules/ol/geom/Geometry.js
var tmpTransform = create();
var tmpPoint = [NaN, NaN];
var Geometry = class extends Object_default {
  constructor() {
    super();
    this.extent_ = createEmpty();
    this.extentRevision_ = -1;
    this.simplifiedGeometryMaxMinSquaredTolerance = 0;
    this.simplifiedGeometryRevision = 0;
    this.simplifyTransformedInternal = memoizeOne(
      (revision, squaredTolerance, transform2) => {
        if (!transform2) {
          return this.getSimplifiedGeometry(squaredTolerance);
        }
        const clone = this.clone();
        clone.applyTransform(transform2);
        return clone.getSimplifiedGeometry(squaredTolerance);
      }
    );
  }
  /**
   * Get a transformed and simplified version of the geometry.
   * @abstract
   * @param {number} squaredTolerance Squared tolerance.
   * @param {import("../proj.js").TransformFunction} [transform] Optional transform function.
   * @return {Geometry} Simplified geometry.
   */
  simplifyTransformed(squaredTolerance, transform2) {
    return this.simplifyTransformedInternal(
      this.getRevision(),
      squaredTolerance,
      transform2
    );
  }
  /**
   * Make a complete copy of the geometry.
   * @abstract
   * @return {!Geometry} Clone.
   */
  clone() {
    return abstract();
  }
  /**
   * @abstract
   * @param {number} x X.
   * @param {number} y Y.
   * @param {import("../coordinate.js").Coordinate} closestPoint Closest point.
   * @param {number} minSquaredDistance Minimum squared distance.
   * @return {number} Minimum squared distance.
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    return abstract();
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @return {boolean} Contains (x, y).
   */
  containsXY(x, y) {
    return this.closestPointXY(x, y, tmpPoint, Number.MIN_VALUE) === 0;
  }
  /**
   * Return the closest point of the geometry to the passed point as
   * {@link module:ol/coordinate~Coordinate coordinate}.
   * @param {import("../coordinate.js").Coordinate} point Point.
   * @param {import("../coordinate.js").Coordinate} [closestPoint] Closest point.
   * @return {import("../coordinate.js").Coordinate} Closest point.
   * @api
   */
  getClosestPoint(point, closestPoint) {
    closestPoint = closestPoint ? closestPoint : [NaN, NaN];
    this.closestPointXY(point[0], point[1], closestPoint, Infinity);
    return closestPoint;
  }
  /**
   * Returns true if this geometry includes the specified coordinate. If the
   * coordinate is on the boundary of the geometry, returns false.
   * @param {import("../coordinate.js").Coordinate} coordinate Coordinate.
   * @return {boolean} Contains coordinate.
   * @api
   */
  intersectsCoordinate(coordinate) {
    return this.containsXY(coordinate[0], coordinate[1]);
  }
  /**
   * @abstract
   * @param {import("../extent.js").Extent} extent Extent.
   * @protected
   * @return {import("../extent.js").Extent} extent Extent.
   */
  computeExtent(extent) {
    return abstract();
  }
  /**
   * Get the extent of the geometry.
   * @param {import("../extent.js").Extent} [extent] Extent.
   * @return {import("../extent.js").Extent} extent Extent.
   * @api
   */
  getExtent(extent) {
    if (this.extentRevision_ != this.getRevision()) {
      const extent2 = this.computeExtent(this.extent_);
      if (isNaN(extent2[0]) || isNaN(extent2[1])) {
        createOrUpdateEmpty(extent2);
      }
      this.extentRevision_ = this.getRevision();
    }
    return returnOrUpdate(this.extent_, extent);
  }
  /**
   * Rotate the geometry around a given coordinate. This modifies the geometry
   * coordinates in place.
   * @abstract
   * @param {number} angle Rotation angle in radians.
   * @param {import("../coordinate.js").Coordinate} anchor The rotation center.
   * @api
   */
  rotate(angle, anchor) {
    abstract();
  }
  /**
   * Scale the geometry (with an optional origin).  This modifies the geometry
   * coordinates in place.
   * @abstract
   * @param {number} sx The scaling factor in the x-direction.
   * @param {number} [sy] The scaling factor in the y-direction (defaults to sx).
   * @param {import("../coordinate.js").Coordinate} [anchor] The scale origin (defaults to the center
   *     of the geometry extent).
   * @api
   */
  scale(sx, sy, anchor) {
    abstract();
  }
  /**
   * Create a simplified version of this geometry.  For linestrings, this uses
   * the [Douglas Peucker](https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm)
   * algorithm.  For polygons, a quantization-based
   * simplification is used to preserve topology.
   * @param {number} tolerance The tolerance distance for simplification.
   * @return {Geometry} A new, simplified version of the original geometry.
   * @api
   */
  simplify(tolerance) {
    return this.getSimplifiedGeometry(tolerance * tolerance);
  }
  /**
   * Create a simplified version of this geometry using the Douglas Peucker
   * algorithm.
   * See https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm.
   * @abstract
   * @param {number} squaredTolerance Squared tolerance.
   * @return {Geometry} Simplified geometry.
   */
  getSimplifiedGeometry(squaredTolerance) {
    return abstract();
  }
  /**
   * Get the type of this geometry.
   * @abstract
   * @return {Type} Geometry type.
   */
  getType() {
    return abstract();
  }
  /**
   * Apply a transform function to the coordinates of the geometry.
   * The geometry is modified in place.
   * If you do not want the geometry modified in place, first `clone()` it and
   * then use this function on the clone.
   * @abstract
   * @param {import("../proj.js").TransformFunction} transformFn Transform function.
   * Called with a flat array of geometry coordinates.
   */
  applyTransform(transformFn) {
    abstract();
  }
  /**
   * Test if the geometry and the passed extent intersect.
   * @abstract
   * @param {import("../extent.js").Extent} extent Extent.
   * @return {boolean} `true` if the geometry and the extent intersect.
   */
  intersectsExtent(extent) {
    return abstract();
  }
  /**
   * Translate the geometry.  This modifies the geometry coordinates in place.  If
   * instead you want a new geometry, first `clone()` this geometry.
   * @abstract
   * @param {number} deltaX Delta X.
   * @param {number} deltaY Delta Y.
   * @api
   */
  translate(deltaX, deltaY) {
    abstract();
  }
  /**
   * Transform each coordinate of the geometry from one coordinate reference
   * system to another. The geometry is modified in place.
   * For example, a line will be transformed to a line and a circle to a circle.
   * If you do not want the geometry modified in place, first `clone()` it and
   * then use this function on the clone.
   *
   * @param {import("../proj.js").ProjectionLike} source The current projection.  Can be a
   *     string identifier or a {@link module:ol/proj/Projection~Projection} object.
   * @param {import("../proj.js").ProjectionLike} destination The desired projection.  Can be a
   *     string identifier or a {@link module:ol/proj/Projection~Projection} object.
   * @return {this} This geometry.  Note that original geometry is
   *     modified in place.
   * @api
   */
  transform(source, destination) {
    const sourceProj = get3(source);
    if (!sourceProj) {
      return this;
    }
    const transformFn = sourceProj.getUnits() == "tile-pixels" ? (
      /**
       * @param {Array<number>} inCoordinates Input coordinates.
       * @param {Array<number>} outCoordinates Output coordinates.
       * @param {number} stride Stride.
       * @return {Array<number>} Output coordinates.
       */
      function(inCoordinates, outCoordinates, stride) {
        const pixelExtent = sourceProj.getExtent();
        const projectedExtent = sourceProj.getWorldExtent();
        const scale2 = getHeight(projectedExtent) / getHeight(pixelExtent);
        compose(
          tmpTransform,
          projectedExtent[0],
          projectedExtent[3],
          scale2,
          -scale2,
          0,
          0,
          0
        );
        const transformed = transform2D(
          inCoordinates,
          0,
          inCoordinates.length,
          stride,
          tmpTransform,
          outCoordinates
        );
        const projTransform = getTransform(sourceProj, destination);
        if (projTransform) {
          return projTransform(transformed, transformed, stride);
        }
        return transformed;
      }
    ) : getTransform(sourceProj, destination);
    if (transformFn) {
      this.applyTransform(
        /** @type {import("../proj.js").TransformFunction} */
        transformFn
      );
    }
    return this;
  }
};
var Geometry_default = Geometry;

// node_modules/ol/geom/SimpleGeometry.js
var SimpleGeometry = class extends Geometry_default {
  constructor() {
    super();
    this.layout = "XY";
    this.stride = 2;
    this.flatCoordinates;
  }
  /**
   * @param {import("../extent.js").Extent} extent Extent.
   * @protected
   * @return {import("../extent.js").Extent} extent Extent.
   * @override
   */
  computeExtent(extent) {
    return createOrUpdateFromFlatCoordinates(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      extent
    );
  }
  /**
   * @abstract
   * @return {Array<*> | null} Coordinates.
   */
  getCoordinates() {
    return abstract();
  }
  /**
   * Return the first coordinate of the geometry.
   * @return {import("../coordinate.js").Coordinate} First coordinate.
   * @api
   */
  getFirstCoordinate() {
    return this.flatCoordinates.slice(0, this.stride);
  }
  /**
   * @return {Array<number>} Flat coordinates.
   */
  getFlatCoordinates() {
    return this.flatCoordinates;
  }
  /**
   * Return the last coordinate of the geometry.
   * @return {import("../coordinate.js").Coordinate} Last point.
   * @api
   */
  getLastCoordinate() {
    return this.flatCoordinates.slice(
      this.flatCoordinates.length - this.stride
    );
  }
  /**
   * Return the {@link import("./Geometry.js").GeometryLayout layout} of the geometry.
   * @return {import("./Geometry.js").GeometryLayout} Layout.
   * @api
   */
  getLayout() {
    return this.layout;
  }
  /**
   * Create a simplified version of this geometry using the Douglas Peucker algorithm.
   * @param {number} squaredTolerance Squared tolerance.
   * @return {SimpleGeometry} Simplified geometry.
   * @override
   */
  getSimplifiedGeometry(squaredTolerance) {
    if (this.simplifiedGeometryRevision !== this.getRevision()) {
      this.simplifiedGeometryMaxMinSquaredTolerance = 0;
      this.simplifiedGeometryRevision = this.getRevision();
    }
    if (squaredTolerance < 0 || this.simplifiedGeometryMaxMinSquaredTolerance !== 0 && squaredTolerance <= this.simplifiedGeometryMaxMinSquaredTolerance) {
      return this;
    }
    const simplifiedGeometry = this.getSimplifiedGeometryInternal(squaredTolerance);
    const simplifiedFlatCoordinates = simplifiedGeometry.getFlatCoordinates();
    if (simplifiedFlatCoordinates.length < this.flatCoordinates.length) {
      return simplifiedGeometry;
    }
    this.simplifiedGeometryMaxMinSquaredTolerance = squaredTolerance;
    return this;
  }
  /**
   * @param {number} squaredTolerance Squared tolerance.
   * @return {SimpleGeometry} Simplified geometry.
   * @protected
   */
  getSimplifiedGeometryInternal(squaredTolerance) {
    return this;
  }
  /**
   * @return {number} Stride.
   */
  getStride() {
    return this.stride;
  }
  /**
   * @param {import("./Geometry.js").GeometryLayout} layout Layout.
   * @param {Array<number>} flatCoordinates Flat coordinates.
   */
  setFlatCoordinates(layout, flatCoordinates) {
    this.stride = getStrideForLayout(layout);
    this.layout = layout;
    this.flatCoordinates = flatCoordinates;
  }
  /**
   * @abstract
   * @param {!Array<*>} coordinates Coordinates.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   */
  setCoordinates(coordinates2, layout) {
    abstract();
  }
  /**
   * @param {import("./Geometry.js").GeometryLayout|undefined} layout Layout.
   * @param {Array<*>} coordinates Coordinates.
   * @param {number} nesting Nesting.
   * @protected
   */
  setLayout(layout, coordinates2, nesting) {
    let stride;
    if (layout) {
      stride = getStrideForLayout(layout);
    } else {
      for (let i = 0; i < nesting; ++i) {
        if (coordinates2.length === 0) {
          this.layout = "XY";
          this.stride = 2;
          return;
        }
        coordinates2 = /** @type {Array<unknown>} */
        coordinates2[0];
      }
      stride = coordinates2.length;
      layout = getLayoutForStride(stride);
    }
    this.layout = layout;
    this.stride = stride;
  }
  /**
   * Apply a transform function to the coordinates of the geometry.
   * The geometry is modified in place.
   * If you do not want the geometry modified in place, first `clone()` it and
   * then use this function on the clone.
   * @param {import("../proj.js").TransformFunction} transformFn Transform function.
   * Called with a flat array of geometry coordinates.
   * @api
   * @override
   */
  applyTransform(transformFn) {
    if (this.flatCoordinates) {
      transformFn(
        this.flatCoordinates,
        this.flatCoordinates,
        this.layout.startsWith("XYZ") ? 3 : 2,
        this.stride
      );
      this.changed();
    }
  }
  /**
   * Rotate the geometry around a given coordinate. This modifies the geometry
   * coordinates in place.
   * @param {number} angle Rotation angle in counter-clockwise radians.
   * @param {import("../coordinate.js").Coordinate} anchor The rotation center.
   * @api
   * @override
   */
  rotate(angle, anchor) {
    const flatCoordinates = this.getFlatCoordinates();
    if (flatCoordinates) {
      const stride = this.getStride();
      rotate(
        flatCoordinates,
        0,
        flatCoordinates.length,
        stride,
        angle,
        anchor,
        flatCoordinates
      );
      this.changed();
    }
  }
  /**
   * Scale the geometry (with an optional origin).  This modifies the geometry
   * coordinates in place.
   * @param {number} sx The scaling factor in the x-direction.
   * @param {number} [sy] The scaling factor in the y-direction (defaults to sx).
   * @param {import("../coordinate.js").Coordinate} [anchor] The scale origin (defaults to the center
   *     of the geometry extent).
   * @api
   * @override
   */
  scale(sx, sy, anchor) {
    if (sy === void 0) {
      sy = sx;
    }
    if (!anchor) {
      anchor = getCenter(this.getExtent());
    }
    const flatCoordinates = this.getFlatCoordinates();
    if (flatCoordinates) {
      const stride = this.getStride();
      scale(
        flatCoordinates,
        0,
        flatCoordinates.length,
        stride,
        sx,
        sy,
        anchor,
        flatCoordinates
      );
      this.changed();
    }
  }
  /**
   * Translate the geometry.  This modifies the geometry coordinates in place.  If
   * instead you want a new geometry, first `clone()` this geometry.
   * @param {number} deltaX Delta X.
   * @param {number} deltaY Delta Y.
   * @api
   * @override
   */
  translate(deltaX, deltaY) {
    const flatCoordinates = this.getFlatCoordinates();
    if (flatCoordinates) {
      const stride = this.getStride();
      translate(
        flatCoordinates,
        0,
        flatCoordinates.length,
        stride,
        deltaX,
        deltaY,
        flatCoordinates
      );
      this.changed();
    }
  }
};
function getLayoutForStride(stride) {
  let layout;
  if (stride == 2) {
    layout = "XY";
  } else if (stride == 3) {
    layout = "XYZ";
  } else if (stride == 4) {
    layout = "XYZM";
  }
  return (
    /** @type {import("./Geometry.js").GeometryLayout} */
    layout
  );
}
function getStrideForLayout(layout) {
  let stride;
  if (layout == "XY") {
    stride = 2;
  } else if (layout == "XYZ" || layout == "XYM") {
    stride = 3;
  } else if (layout == "XYZM") {
    stride = 4;
  }
  return (
    /** @type {number} */
    stride
  );
}
var SimpleGeometry_default = SimpleGeometry;

// node_modules/ol/geom/flat/deflate.js
function deflateCoordinate(flatCoordinates, offset, coordinate, stride) {
  for (let i = 0; i < stride; ++i) {
    flatCoordinates[offset++] = coordinate[i];
  }
  return offset;
}
function deflateCoordinates(flatCoordinates, offset, coordinates2, stride) {
  for (let i = 0, ii = coordinates2.length; i < ii; ++i) {
    const coordinate = coordinates2[i];
    for (let j = 0; j < stride; ++j) {
      flatCoordinates[offset++] = coordinate[j];
    }
  }
  return offset;
}
function deflateCoordinatesArray(flatCoordinates, offset, coordinatess, stride, ends) {
  ends = ends ? ends : [];
  let i = 0;
  for (let j = 0, jj = coordinatess.length; j < jj; ++j) {
    const end = deflateCoordinates(
      flatCoordinates,
      offset,
      coordinatess[j],
      stride
    );
    ends[i++] = end;
    offset = end;
  }
  ends.length = i;
  return ends;
}

// node_modules/ol/geom/flat/closest.js
function assignClosest(flatCoordinates, offset1, offset2, stride, x, y, closestPoint) {
  const x1 = flatCoordinates[offset1];
  const y1 = flatCoordinates[offset1 + 1];
  const dx = flatCoordinates[offset2] - x1;
  const dy = flatCoordinates[offset2 + 1] - y1;
  let offset;
  if (dx === 0 && dy === 0) {
    offset = offset1;
  } else {
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      offset = offset2;
    } else if (t > 0) {
      for (let i = 0; i < stride; ++i) {
        closestPoint[i] = lerp(
          flatCoordinates[offset1 + i],
          flatCoordinates[offset2 + i],
          t
        );
      }
      closestPoint.length = stride;
      return;
    } else {
      offset = offset1;
    }
  }
  for (let i = 0; i < stride; ++i) {
    closestPoint[i] = flatCoordinates[offset + i];
  }
  closestPoint.length = stride;
}
function maxSquaredDelta(flatCoordinates, offset, end, stride, max) {
  let x1 = flatCoordinates[offset];
  let y1 = flatCoordinates[offset + 1];
  for (offset += stride; offset < end; offset += stride) {
    const x2 = flatCoordinates[offset];
    const y2 = flatCoordinates[offset + 1];
    const squaredDelta = squaredDistance(x1, y1, x2, y2);
    if (squaredDelta > max) {
      max = squaredDelta;
    }
    x1 = x2;
    y1 = y2;
  }
  return max;
}
function arrayMaxSquaredDelta(flatCoordinates, offset, ends, stride, max) {
  for (let i = 0, ii = ends.length; i < ii; ++i) {
    const end = ends[i];
    max = maxSquaredDelta(flatCoordinates, offset, end, stride, max);
    offset = end;
  }
  return max;
}
function assignClosestPoint(flatCoordinates, offset, end, stride, maxDelta, isRing, x, y, closestPoint, minSquaredDistance, tmpPoint2) {
  if (offset == end) {
    return minSquaredDistance;
  }
  let i, squaredDistance2;
  if (maxDelta === 0) {
    squaredDistance2 = squaredDistance(
      x,
      y,
      flatCoordinates[offset],
      flatCoordinates[offset + 1]
    );
    if (squaredDistance2 < minSquaredDistance) {
      for (i = 0; i < stride; ++i) {
        closestPoint[i] = flatCoordinates[offset + i];
      }
      closestPoint.length = stride;
      return squaredDistance2;
    }
    return minSquaredDistance;
  }
  tmpPoint2 = tmpPoint2 ? tmpPoint2 : [NaN, NaN];
  let index = offset + stride;
  while (index < end) {
    assignClosest(
      flatCoordinates,
      index - stride,
      index,
      stride,
      x,
      y,
      tmpPoint2
    );
    squaredDistance2 = squaredDistance(x, y, tmpPoint2[0], tmpPoint2[1]);
    if (squaredDistance2 < minSquaredDistance) {
      minSquaredDistance = squaredDistance2;
      for (i = 0; i < stride; ++i) {
        closestPoint[i] = tmpPoint2[i];
      }
      closestPoint.length = stride;
      index += stride;
    } else {
      index += stride * Math.max(
        (Math.sqrt(squaredDistance2) - Math.sqrt(minSquaredDistance)) / maxDelta | 0,
        1
      );
    }
  }
  if (isRing) {
    assignClosest(
      flatCoordinates,
      end - stride,
      offset,
      stride,
      x,
      y,
      tmpPoint2
    );
    squaredDistance2 = squaredDistance(x, y, tmpPoint2[0], tmpPoint2[1]);
    if (squaredDistance2 < minSquaredDistance) {
      minSquaredDistance = squaredDistance2;
      for (i = 0; i < stride; ++i) {
        closestPoint[i] = tmpPoint2[i];
      }
      closestPoint.length = stride;
    }
  }
  return minSquaredDistance;
}
function assignClosestArrayPoint(flatCoordinates, offset, ends, stride, maxDelta, isRing, x, y, closestPoint, minSquaredDistance, tmpPoint2) {
  tmpPoint2 = tmpPoint2 ? tmpPoint2 : [NaN, NaN];
  for (let i = 0, ii = ends.length; i < ii; ++i) {
    const end = ends[i];
    minSquaredDistance = assignClosestPoint(
      flatCoordinates,
      offset,
      end,
      stride,
      maxDelta,
      isRing,
      x,
      y,
      closestPoint,
      minSquaredDistance,
      tmpPoint2
    );
    offset = end;
  }
  return minSquaredDistance;
}

// node_modules/ol/geom/flat/inflate.js
function inflateCoordinates(flatCoordinates, offset, end, stride, coordinates2) {
  coordinates2 = coordinates2 !== void 0 ? coordinates2 : [];
  let i = 0;
  for (let j = offset; j < end; j += stride) {
    coordinates2[i++] = flatCoordinates.slice(j, j + stride);
  }
  coordinates2.length = i;
  return coordinates2;
}
function inflateCoordinatesArray(flatCoordinates, offset, ends, stride, coordinatess) {
  coordinatess = coordinatess !== void 0 ? coordinatess : [];
  let i = 0;
  for (let j = 0, jj = ends.length; j < jj; ++j) {
    const end = ends[j];
    coordinatess[i++] = inflateCoordinates(
      flatCoordinates,
      offset,
      end,
      stride,
      coordinatess[i]
    );
    offset = end;
  }
  coordinatess.length = i;
  return coordinatess;
}

// node_modules/ol/geom/flat/interpolate.js
function interpolatePoint(flatCoordinates, offset, end, stride, fraction, dest2, dimension) {
  let o, t;
  const n = (end - offset) / stride;
  if (n === 1) {
    o = offset;
  } else if (n === 2) {
    o = offset;
    t = fraction;
  } else if (n !== 0) {
    let x1 = flatCoordinates[offset];
    let y1 = flatCoordinates[offset + 1];
    let length = 0;
    const cumulativeLengths = [0];
    for (let i = offset + stride; i < end; i += stride) {
      const x2 = flatCoordinates[i];
      const y2 = flatCoordinates[i + 1];
      length += Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
      cumulativeLengths.push(length);
      x1 = x2;
      y1 = y2;
    }
    const target = fraction * length;
    const index = binarySearch(cumulativeLengths, target);
    if (index < 0) {
      t = (target - cumulativeLengths[-index - 2]) / (cumulativeLengths[-index - 1] - cumulativeLengths[-index - 2]);
      o = offset + (-index - 2) * stride;
    } else {
      o = offset + index * stride;
    }
  }
  dimension = dimension !== void 0 && dimension > 1 ? dimension : 2;
  dest2 = dest2 ? dest2 : new Array(dimension);
  for (let i = 0; i < dimension; ++i) {
    dest2[i] = o === void 0 ? NaN : t === void 0 ? flatCoordinates[o + i] : lerp(flatCoordinates[o + i], flatCoordinates[o + stride + i], t);
  }
  return dest2;
}
function lineStringCoordinateAtM(flatCoordinates, offset, end, stride, m, extrapolate) {
  if (end == offset) {
    return null;
  }
  let coordinate;
  if (m < flatCoordinates[offset + stride - 1]) {
    if (extrapolate) {
      coordinate = flatCoordinates.slice(offset, offset + stride);
      coordinate[stride - 1] = m;
      return coordinate;
    }
    return null;
  }
  if (flatCoordinates[end - 1] < m) {
    if (extrapolate) {
      coordinate = flatCoordinates.slice(end - stride, end);
      coordinate[stride - 1] = m;
      return coordinate;
    }
    return null;
  }
  if (m == flatCoordinates[offset + stride - 1]) {
    return flatCoordinates.slice(offset, offset + stride);
  }
  let lo = offset / stride;
  let hi = end / stride;
  while (lo < hi) {
    const mid = lo + hi >> 1;
    if (m < flatCoordinates[(mid + 1) * stride - 1]) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  const m0 = flatCoordinates[lo * stride - 1];
  if (m == m0) {
    return flatCoordinates.slice((lo - 1) * stride, (lo - 1) * stride + stride);
  }
  const m1 = flatCoordinates[(lo + 1) * stride - 1];
  const t = (m - m0) / (m1 - m0);
  coordinate = [];
  for (let i = 0; i < stride - 1; ++i) {
    coordinate.push(
      lerp(
        flatCoordinates[(lo - 1) * stride + i],
        flatCoordinates[lo * stride + i],
        t
      )
    );
  }
  coordinate.push(m);
  return coordinate;
}

// node_modules/ol/geom/flat/contains.js
function linearRingContainsExtent(flatCoordinates, offset, end, stride, extent) {
  const outside = forEachCorner(
    extent,
    /**
     * @param {import("../../coordinate.js").Coordinate} coordinate Coordinate.
     * @return {boolean} Contains (x, y).
     */
    function(coordinate) {
      return !linearRingContainsXY(
        flatCoordinates,
        offset,
        end,
        stride,
        coordinate[0],
        coordinate[1]
      );
    }
  );
  return !outside;
}
function linearRingContainsXY(flatCoordinates, offset, end, stride, x, y) {
  let wn = 0;
  let x1 = flatCoordinates[end - stride];
  let y1 = flatCoordinates[end - stride + 1];
  for (; offset < end; offset += stride) {
    const x2 = flatCoordinates[offset];
    const y2 = flatCoordinates[offset + 1];
    if (y1 <= y) {
      if (y2 > y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0) {
        wn++;
      }
    } else if (y2 <= y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0) {
      wn--;
    }
    x1 = x2;
    y1 = y2;
  }
  return wn !== 0;
}
function linearRingsContainsXY(flatCoordinates, offset, ends, stride, x, y) {
  if (ends.length === 0) {
    return false;
  }
  if (!linearRingContainsXY(flatCoordinates, offset, ends[0], stride, x, y)) {
    return false;
  }
  for (let i = 1, ii = ends.length; i < ii; ++i) {
    if (linearRingContainsXY(flatCoordinates, ends[i - 1], ends[i], stride, x, y)) {
      return false;
    }
  }
  return true;
}

// node_modules/ol/geom/flat/segments.js
function forEach(flatCoordinates, offset, end, stride, callback) {
  let ret;
  offset += stride;
  for (; offset < end; offset += stride) {
    ret = callback(
      flatCoordinates.slice(offset - stride, offset),
      flatCoordinates.slice(offset, offset + stride)
    );
    if (ret) {
      return ret;
    }
  }
  return false;
}

// node_modules/ol/geom/flat/intersectsextent.js
function intersectsLineString(flatCoordinates, offset, end, stride, extent, coordinatesExtent) {
  coordinatesExtent = coordinatesExtent ?? extendFlatCoordinates(createEmpty(), flatCoordinates, offset, end, stride);
  if (!intersects(extent, coordinatesExtent)) {
    return false;
  }
  if (coordinatesExtent[0] >= extent[0] && coordinatesExtent[2] <= extent[2] || coordinatesExtent[1] >= extent[1] && coordinatesExtent[3] <= extent[3]) {
    return true;
  }
  return forEach(
    flatCoordinates,
    offset,
    end,
    stride,
    /**
     * @param {import("../../coordinate.js").Coordinate} point1 Start point.
     * @param {import("../../coordinate.js").Coordinate} point2 End point.
     * @return {boolean} `true` if the segment and the extent intersect,
     *     `false` otherwise.
     */
    function(point1, point2) {
      return intersectsSegment(extent, point1, point2);
    }
  );
}
function intersectsLinearRing(flatCoordinates, offset, end, stride, extent) {
  if (intersectsLineString(flatCoordinates, offset, end, stride, extent)) {
    return true;
  }
  if (linearRingContainsXY(
    flatCoordinates,
    offset,
    end,
    stride,
    extent[0],
    extent[1]
  )) {
    return true;
  }
  if (linearRingContainsXY(
    flatCoordinates,
    offset,
    end,
    stride,
    extent[0],
    extent[3]
  )) {
    return true;
  }
  if (linearRingContainsXY(
    flatCoordinates,
    offset,
    end,
    stride,
    extent[2],
    extent[1]
  )) {
    return true;
  }
  if (linearRingContainsXY(
    flatCoordinates,
    offset,
    end,
    stride,
    extent[2],
    extent[3]
  )) {
    return true;
  }
  return false;
}
function intersectsLinearRingArray(flatCoordinates, offset, ends, stride, extent) {
  if (!intersectsLinearRing(flatCoordinates, offset, ends[0], stride, extent)) {
    return false;
  }
  if (ends.length === 1) {
    return true;
  }
  for (let i = 1, ii = ends.length; i < ii; ++i) {
    if (linearRingContainsExtent(
      flatCoordinates,
      ends[i - 1],
      ends[i],
      stride,
      extent
    )) {
      if (!intersectsLineString(
        flatCoordinates,
        ends[i - 1],
        ends[i],
        stride,
        extent
      )) {
        return false;
      }
    }
  }
  return true;
}

// node_modules/ol/geom/flat/length.js
function lineStringLength(flatCoordinates, offset, end, stride) {
  let x1 = flatCoordinates[offset];
  let y1 = flatCoordinates[offset + 1];
  let length = 0;
  for (let i = offset + stride; i < end; i += stride) {
    const x2 = flatCoordinates[i];
    const y2 = flatCoordinates[i + 1];
    length += Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    x1 = x2;
    y1 = y2;
  }
  return length;
}

// node_modules/ol/geom/flat/simplify.js
function douglasPeucker(flatCoordinates, offset, end, stride, squaredTolerance, simplifiedFlatCoordinates, simplifiedOffset) {
  const n = (end - offset) / stride;
  if (n < 3) {
    for (; offset < end; offset += stride) {
      simplifiedFlatCoordinates[simplifiedOffset++] = flatCoordinates[offset];
      simplifiedFlatCoordinates[simplifiedOffset++] = flatCoordinates[offset + 1];
    }
    return simplifiedOffset;
  }
  const markers = new Array(n);
  markers[0] = 1;
  markers[n - 1] = 1;
  const stack = [offset, end - stride];
  let index = 0;
  while (stack.length > 0) {
    const last = (
      /** @type {number} */
      stack.pop()
    );
    const first = (
      /** @type {number} */
      stack.pop()
    );
    let maxSquaredDistance = 0;
    const x1 = flatCoordinates[first];
    const y1 = flatCoordinates[first + 1];
    const x2 = flatCoordinates[last];
    const y2 = flatCoordinates[last + 1];
    for (let i = first + stride; i < last; i += stride) {
      const x = flatCoordinates[i];
      const y = flatCoordinates[i + 1];
      const squaredDistance2 = squaredSegmentDistance(x, y, x1, y1, x2, y2);
      if (squaredDistance2 > maxSquaredDistance) {
        index = i;
        maxSquaredDistance = squaredDistance2;
      }
    }
    if (maxSquaredDistance > squaredTolerance) {
      markers[(index - offset) / stride] = 1;
      if (first + stride < index) {
        stack.push(first, index);
      }
      if (index + stride < last) {
        stack.push(index, last);
      }
    }
  }
  for (let i = 0; i < n; ++i) {
    if (markers[i]) {
      simplifiedFlatCoordinates[simplifiedOffset++] = flatCoordinates[offset + i * stride];
      simplifiedFlatCoordinates[simplifiedOffset++] = flatCoordinates[offset + i * stride + 1];
    }
  }
  return simplifiedOffset;
}
function snap(value, tolerance) {
  return tolerance * Math.round(value / tolerance);
}
function quantize(flatCoordinates, offset, end, stride, tolerance, simplifiedFlatCoordinates, simplifiedOffset) {
  if (offset == end) {
    return simplifiedOffset;
  }
  let x1 = snap(flatCoordinates[offset], tolerance);
  let y1 = snap(flatCoordinates[offset + 1], tolerance);
  offset += stride;
  simplifiedFlatCoordinates[simplifiedOffset++] = x1;
  simplifiedFlatCoordinates[simplifiedOffset++] = y1;
  let x2, y2;
  do {
    x2 = snap(flatCoordinates[offset], tolerance);
    y2 = snap(flatCoordinates[offset + 1], tolerance);
    offset += stride;
    if (offset == end) {
      simplifiedFlatCoordinates[simplifiedOffset++] = x2;
      simplifiedFlatCoordinates[simplifiedOffset++] = y2;
      return simplifiedOffset;
    }
  } while (x2 == x1 && y2 == y1);
  while (offset < end) {
    const x3 = snap(flatCoordinates[offset], tolerance);
    const y3 = snap(flatCoordinates[offset + 1], tolerance);
    offset += stride;
    if (x3 == x2 && y3 == y2) {
      continue;
    }
    const dx1 = x2 - x1;
    const dy1 = y2 - y1;
    const dx2 = x3 - x1;
    const dy2 = y3 - y1;
    if (dx1 * dy2 == dy1 * dx2 && (dx1 < 0 && dx2 < dx1 || dx1 == dx2 || dx1 > 0 && dx2 > dx1) && (dy1 < 0 && dy2 < dy1 || dy1 == dy2 || dy1 > 0 && dy2 > dy1)) {
      x2 = x3;
      y2 = y3;
      continue;
    }
    simplifiedFlatCoordinates[simplifiedOffset++] = x2;
    simplifiedFlatCoordinates[simplifiedOffset++] = y2;
    x1 = x2;
    y1 = y2;
    x2 = x3;
    y2 = y3;
  }
  simplifiedFlatCoordinates[simplifiedOffset++] = x2;
  simplifiedFlatCoordinates[simplifiedOffset++] = y2;
  return simplifiedOffset;
}
function quantizeArray(flatCoordinates, offset, ends, stride, tolerance, simplifiedFlatCoordinates, simplifiedOffset, simplifiedEnds) {
  for (let i = 0, ii = ends.length; i < ii; ++i) {
    const end = ends[i];
    simplifiedOffset = quantize(
      flatCoordinates,
      offset,
      end,
      stride,
      tolerance,
      simplifiedFlatCoordinates,
      simplifiedOffset
    );
    simplifiedEnds.push(simplifiedOffset);
    offset = end;
  }
  return simplifiedOffset;
}

// node_modules/ol/geom/LineString.js
var LineString = class _LineString extends SimpleGeometry_default {
  /**
   * @param {Array<import("../coordinate.js").Coordinate>|Array<number>} coordinates Coordinates.
   *     For internal use, flat coordinates in combination with `layout` are also accepted.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   */
  constructor(coordinates2, layout) {
    super();
    this.flatMidpoint_ = null;
    this.flatMidpointRevision_ = -1;
    this.maxDelta_ = -1;
    this.maxDeltaRevision_ = -1;
    if (layout !== void 0 && !Array.isArray(coordinates2[0])) {
      this.setFlatCoordinates(
        layout,
        /** @type {Array<number>} */
        coordinates2
      );
    } else {
      this.setCoordinates(
        /** @type {Array<import("../coordinate.js").Coordinate>} */
        coordinates2,
        layout
      );
    }
  }
  /**
   * Append the passed coordinate to the coordinates of the linestring.
   * @param {import("../coordinate.js").Coordinate} coordinate Coordinate.
   * @api
   */
  appendCoordinate(coordinate) {
    extend(this.flatCoordinates, coordinate);
    this.changed();
  }
  /**
   * Make a complete copy of the geometry.
   * @return {!LineString} Clone.
   * @api
   * @override
   */
  clone() {
    const lineString = new _LineString(
      this.flatCoordinates.slice(),
      this.layout
    );
    lineString.applyProperties(this);
    return lineString;
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @param {import("../coordinate.js").Coordinate} closestPoint Closest point.
   * @param {number} minSquaredDistance Minimum squared distance.
   * @return {number} Minimum squared distance.
   * @override
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    if (minSquaredDistance < closestSquaredDistanceXY(this.getExtent(), x, y)) {
      return minSquaredDistance;
    }
    if (this.maxDeltaRevision_ != this.getRevision()) {
      this.maxDelta_ = Math.sqrt(
        maxSquaredDelta(
          this.flatCoordinates,
          0,
          this.flatCoordinates.length,
          this.stride,
          0
        )
      );
      this.maxDeltaRevision_ = this.getRevision();
    }
    return assignClosestPoint(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      this.maxDelta_,
      false,
      x,
      y,
      closestPoint,
      minSquaredDistance
    );
  }
  /**
   * Iterate over each segment, calling the provided callback.
   * If the callback returns a truthy value the function returns that
   * value immediately. Otherwise the function returns `false`.
   *
   * @param {function(this: S, import("../coordinate.js").Coordinate, import("../coordinate.js").Coordinate): T} callback Function
   *     called for each segment. The function will receive two arguments, the start and end coordinates of the segment.
   * @return {T|boolean} Value.
   * @template T,S
   * @api
   */
  forEachSegment(callback) {
    return forEach(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      callback
    );
  }
  /**
   * Returns the coordinate at `m` using linear interpolation, or `null` if no
   * such coordinate exists.
   *
   * `extrapolate` controls extrapolation beyond the range of Ms in the
   * MultiLineString. If `extrapolate` is `true` then Ms less than the first
   * M will return the first coordinate and Ms greater than the last M will
   * return the last coordinate.
   *
   * @param {number} m M.
   * @param {boolean} [extrapolate] Extrapolate. Default is `false`.
   * @return {import("../coordinate.js").Coordinate|null} Coordinate.
   * @api
   */
  getCoordinateAtM(m, extrapolate) {
    if (this.layout != "XYM" && this.layout != "XYZM") {
      return null;
    }
    extrapolate = extrapolate !== void 0 ? extrapolate : false;
    return lineStringCoordinateAtM(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      m,
      extrapolate
    );
  }
  /**
   * Return the coordinates of the linestring.
   * @return {Array<import("../coordinate.js").Coordinate>} Coordinates.
   * @api
   * @override
   */
  getCoordinates() {
    return inflateCoordinates(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride
    );
  }
  /**
   * Return the coordinate at the provided fraction along the linestring.
   * The `fraction` is a number between 0 and 1, where 0 is the start of the
   * linestring and 1 is the end.
   * @param {number} fraction Fraction.
   * @param {import("../coordinate.js").Coordinate} [dest] Optional coordinate whose values will
   *     be modified. If not provided, a new coordinate will be returned.
   * @return {import("../coordinate.js").Coordinate} Coordinate of the interpolated point.
   * @api
   */
  getCoordinateAt(fraction, dest2) {
    return interpolatePoint(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      fraction,
      dest2,
      this.stride
    );
  }
  /**
   * Return the length of the linestring on projected plane.
   * @return {number} Length (on projected plane).
   * @api
   */
  getLength() {
    return lineStringLength(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride
    );
  }
  /**
   * @return {Array<number>} Flat midpoint.
   */
  getFlatMidpoint() {
    if (this.flatMidpointRevision_ != this.getRevision()) {
      this.flatMidpoint_ = this.getCoordinateAt(
        0.5,
        this.flatMidpoint_ ?? void 0
      );
      this.flatMidpointRevision_ = this.getRevision();
    }
    return (
      /** @type {Array<number>} */
      this.flatMidpoint_
    );
  }
  /**
   * @param {number} squaredTolerance Squared tolerance.
   * @return {LineString} Simplified LineString.
   * @protected
   * @override
   */
  getSimplifiedGeometryInternal(squaredTolerance) {
    const simplifiedFlatCoordinates = [];
    simplifiedFlatCoordinates.length = douglasPeucker(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      squaredTolerance,
      simplifiedFlatCoordinates,
      0
    );
    return new _LineString(simplifiedFlatCoordinates, "XY");
  }
  /**
   * Get the type of this geometry.
   * @return {import("./Geometry.js").Type} Geometry type.
   * @api
   * @override
   */
  getType() {
    return "LineString";
  }
  /**
   * Test if the geometry and the passed extent intersect.
   * @param {import("../extent.js").Extent} extent Extent.
   * @return {boolean} `true` if the geometry and the extent intersect.
   * @api
   * @override
   */
  intersectsExtent(extent) {
    return intersectsLineString(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      extent,
      this.getExtent()
    );
  }
  /**
   * Set the coordinates of the linestring.
   * @param {!Array<import("../coordinate.js").Coordinate>} coordinates Coordinates.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   * @api
   * @override
   */
  setCoordinates(coordinates2, layout) {
    this.setLayout(layout, coordinates2, 1);
    if (!this.flatCoordinates) {
      this.flatCoordinates = [];
    }
    this.flatCoordinates.length = deflateCoordinates(
      this.flatCoordinates,
      0,
      coordinates2,
      this.stride
    );
    this.changed();
  }
};
var LineString_default = LineString;

// node_modules/ol/geom/Point.js
var Point = class _Point extends SimpleGeometry_default {
  /**
   * @param {import("../coordinate.js").Coordinate} coordinates Coordinates.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   */
  constructor(coordinates2, layout) {
    super();
    this.setCoordinates(coordinates2, layout);
  }
  /**
   * Make a complete copy of the geometry.
   * @return {!Point} Clone.
   * @api
   * @override
   */
  clone() {
    const point = new _Point(this.flatCoordinates.slice(), this.layout);
    point.applyProperties(this);
    return point;
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @param {import("../coordinate.js").Coordinate} closestPoint Closest point.
   * @param {number} minSquaredDistance Minimum squared distance.
   * @return {number} Minimum squared distance.
   * @override
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    const flatCoordinates = this.flatCoordinates;
    const squaredDistance2 = squaredDistance(
      x,
      y,
      flatCoordinates[0],
      flatCoordinates[1]
    );
    if (squaredDistance2 < minSquaredDistance) {
      const stride = this.stride;
      for (let i = 0; i < stride; ++i) {
        closestPoint[i] = flatCoordinates[i];
      }
      closestPoint.length = stride;
      return squaredDistance2;
    }
    return minSquaredDistance;
  }
  /**
   * Return the coordinate of the point.
   * @return {import("../coordinate.js").Coordinate} Coordinates.
   * @api
   * @override
   */
  getCoordinates() {
    return this.flatCoordinates.slice();
  }
  /**
   * @param {import("../extent.js").Extent} extent Extent.
   * @protected
   * @return {import("../extent.js").Extent} extent Extent.
   * @override
   */
  computeExtent(extent) {
    return createOrUpdateFromCoordinate(this.flatCoordinates, extent);
  }
  /**
   * Get the type of this geometry.
   * @return {import("./Geometry.js").Type} Geometry type.
   * @api
   * @override
   */
  getType() {
    return "Point";
  }
  /**
   * Test if the geometry and the passed extent intersect.
   * @param {import("../extent.js").Extent} extent Extent.
   * @return {boolean} `true` if the geometry and the extent intersect.
   * @api
   * @override
   */
  intersectsExtent(extent) {
    return containsXY(extent, this.flatCoordinates[0], this.flatCoordinates[1]);
  }
  /**
   * @param {!Array<*>} coordinates Coordinates.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   * @api
   * @override
   */
  setCoordinates(coordinates2, layout) {
    this.setLayout(layout, coordinates2, 0);
    if (!this.flatCoordinates) {
      this.flatCoordinates = [];
    }
    this.flatCoordinates.length = deflateCoordinate(
      this.flatCoordinates,
      0,
      coordinates2,
      this.stride
    );
    this.changed();
  }
};
var Point_default = Point;

// node_modules/ol/geom/flat/area.js
function linearRing(flatCoordinates, offset, end, stride) {
  let twiceArea = 0;
  const x0 = flatCoordinates[end - stride];
  const y0 = flatCoordinates[end - stride + 1];
  let dx1 = 0;
  let dy1 = 0;
  for (; offset < end; offset += stride) {
    const dx2 = flatCoordinates[offset] - x0;
    const dy2 = flatCoordinates[offset + 1] - y0;
    twiceArea += dy1 * dx2 - dx1 * dy2;
    dx1 = dx2;
    dy1 = dy2;
  }
  return twiceArea / 2;
}
function linearRings(flatCoordinates, offset, ends, stride) {
  let area = 0;
  for (let i = 0, ii = ends.length; i < ii; ++i) {
    const end = ends[i];
    area += linearRing(flatCoordinates, offset, end, stride);
    offset = end;
  }
  return area;
}

// node_modules/ol/geom/LinearRing.js
var LinearRing = class _LinearRing extends SimpleGeometry_default {
  /**
   * @param {Array<import("../coordinate.js").Coordinate>|Array<number>} coordinates Coordinates.
   *     For internal use, flat coordinates in combination with `layout` are also accepted.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   */
  constructor(coordinates2, layout) {
    super();
    this.maxDelta_ = -1;
    this.maxDeltaRevision_ = -1;
    if (layout !== void 0 && !Array.isArray(coordinates2[0])) {
      this.setFlatCoordinates(
        layout,
        /** @type {Array<number>} */
        coordinates2
      );
    } else {
      this.setCoordinates(
        /** @type {Array<import("../coordinate.js").Coordinate>} */
        coordinates2,
        layout
      );
    }
  }
  /**
   * Make a complete copy of the geometry.
   * @return {!LinearRing} Clone.
   * @api
   * @override
   */
  clone() {
    return new _LinearRing(this.flatCoordinates.slice(), this.layout);
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @param {import("../coordinate.js").Coordinate} closestPoint Closest point.
   * @param {number} minSquaredDistance Minimum squared distance.
   * @return {number} Minimum squared distance.
   * @override
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    if (minSquaredDistance < closestSquaredDistanceXY(this.getExtent(), x, y)) {
      return minSquaredDistance;
    }
    if (this.maxDeltaRevision_ != this.getRevision()) {
      this.maxDelta_ = Math.sqrt(
        maxSquaredDelta(
          this.flatCoordinates,
          0,
          this.flatCoordinates.length,
          this.stride,
          0
        )
      );
      this.maxDeltaRevision_ = this.getRevision();
    }
    return assignClosestPoint(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      this.maxDelta_,
      true,
      x,
      y,
      closestPoint,
      minSquaredDistance
    );
  }
  /**
   * Return the area of the linear ring on projected plane.
   * @return {number} Area (on projected plane).
   * @api
   */
  getArea() {
    return linearRing(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride
    );
  }
  /**
   * Return the coordinates of the linear ring.
   * @return {Array<import("../coordinate.js").Coordinate>} Coordinates.
   * @api
   * @override
   */
  getCoordinates() {
    return inflateCoordinates(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride
    );
  }
  /**
   * @param {number} squaredTolerance Squared tolerance.
   * @return {LinearRing} Simplified LinearRing.
   * @protected
   * @override
   */
  getSimplifiedGeometryInternal(squaredTolerance) {
    const simplifiedFlatCoordinates = [];
    simplifiedFlatCoordinates.length = douglasPeucker(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      squaredTolerance,
      simplifiedFlatCoordinates,
      0
    );
    return new _LinearRing(simplifiedFlatCoordinates, "XY");
  }
  /**
   * Get the type of this geometry.
   * @return {import("./Geometry.js").Type} Geometry type.
   * @api
   * @override
   */
  getType() {
    return "LinearRing";
  }
  /**
   * Test if the geometry and the passed extent intersect. A linear ring is
   * treated as a line string for this test.
   * @param {import("../extent.js").Extent} extent Extent.
   * @return {boolean} `true` if the geometry and the extent intersect.
   * @api
   * @override
   */
  intersectsExtent(extent) {
    return intersectsLineString(
      this.flatCoordinates,
      0,
      this.flatCoordinates.length,
      this.stride,
      extent
    );
  }
  /**
   * Set the coordinates of the linear ring.
   * @param {!Array<import("../coordinate.js").Coordinate>} coordinates Coordinates.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   * @api
   * @override
   */
  setCoordinates(coordinates2, layout) {
    this.setLayout(layout, coordinates2, 1);
    if (!this.flatCoordinates) {
      this.flatCoordinates = [];
    }
    this.flatCoordinates.length = deflateCoordinates(
      this.flatCoordinates,
      0,
      coordinates2,
      this.stride
    );
    this.changed();
  }
};
var LinearRing_default = LinearRing;

// node_modules/ol/geom/flat/interiorpoint.js
function getInteriorPointOfArray(flatCoordinates, offset, ends, stride, flatCenters, flatCentersOffset, dest2) {
  let i, ii, x, x1, x2, y1, y2;
  const y = flatCenters[flatCentersOffset + 1];
  const intersections = [];
  for (let r = 0, rr = ends.length; r < rr; ++r) {
    const end = ends[r];
    x1 = flatCoordinates[end - stride];
    y1 = flatCoordinates[end - stride + 1];
    for (i = offset; i < end; i += stride) {
      x2 = flatCoordinates[i];
      y2 = flatCoordinates[i + 1];
      if (y <= y1 && y2 <= y || y1 <= y && y <= y2) {
        x = (y - y1) / (y2 - y1) * (x2 - x1) + x1;
        intersections.push(x);
      }
      x1 = x2;
      y1 = y2;
    }
  }
  let pointX = NaN;
  let maxSegmentLength = -Infinity;
  intersections.sort(ascending);
  x1 = intersections[0];
  for (i = 1, ii = intersections.length; i < ii; ++i) {
    x2 = intersections[i];
    const segmentLength = Math.abs(x2 - x1);
    if (segmentLength > maxSegmentLength) {
      x = (x1 + x2) / 2;
      if (linearRingsContainsXY(flatCoordinates, offset, ends, stride, x, y)) {
        pointX = x;
        maxSegmentLength = segmentLength;
      }
    }
    x1 = x2;
  }
  if (isNaN(pointX)) {
    pointX = flatCenters[flatCentersOffset];
  }
  if (dest2) {
    dest2.push(pointX, y, maxSegmentLength);
    return dest2;
  }
  return [pointX, y, maxSegmentLength];
}

// node_modules/ol/geom/flat/reverse.js
function coordinates(flatCoordinates, offset, end, stride) {
  while (offset < end - stride) {
    for (let i = 0; i < stride; ++i) {
      const tmp = flatCoordinates[offset + i];
      flatCoordinates[offset + i] = flatCoordinates[end - stride + i];
      flatCoordinates[end - stride + i] = tmp;
    }
    offset += stride;
    end -= stride;
  }
}

// node_modules/ol/geom/flat/orient.js
function linearRingIsClockwise(flatCoordinates, offset, end, stride) {
  let edge = 0;
  let x1 = flatCoordinates[end - stride];
  let y1 = flatCoordinates[end - stride + 1];
  for (; offset < end; offset += stride) {
    const x2 = flatCoordinates[offset];
    const y2 = flatCoordinates[offset + 1];
    edge += (x2 - x1) * (y2 + y1);
    x1 = x2;
    y1 = y2;
  }
  return edge === 0 ? void 0 : edge > 0;
}
function linearRingsAreOriented(flatCoordinates, offset, ends, stride, right) {
  right = right !== void 0 ? right : false;
  for (let i = 0, ii = ends.length; i < ii; ++i) {
    const end = ends[i];
    const isClockwise = linearRingIsClockwise(
      flatCoordinates,
      offset,
      end,
      stride
    );
    if (i === 0) {
      if (right && isClockwise || !right && !isClockwise) {
        return false;
      }
    } else {
      if (right && !isClockwise || !right && isClockwise) {
        return false;
      }
    }
    offset = end;
  }
  return true;
}
function orientLinearRings(flatCoordinates, offset, ends, stride, right) {
  right = right !== void 0 ? right : false;
  for (let i = 0, ii = ends.length; i < ii; ++i) {
    const end = ends[i];
    const isClockwise = linearRingIsClockwise(
      flatCoordinates,
      offset,
      end,
      stride
    );
    const reverse = i === 0 ? right && isClockwise || !right && !isClockwise : right && !isClockwise || !right && isClockwise;
    if (reverse) {
      coordinates(flatCoordinates, offset, end, stride);
    }
    offset = end;
  }
  return offset;
}

// node_modules/ol/geom/Polygon.js
var Polygon = class _Polygon extends SimpleGeometry_default {
  /**
   * @param {!Array<Array<import("../coordinate.js").Coordinate>>|!Array<number>} coordinates
   *     Array of linear rings that define the polygon. The first linear ring of the
   *     array defines the outer-boundary or surface of the polygon. Each subsequent
   *     linear ring defines a hole in the surface of the polygon. A linear ring is
   *     an array of vertices' coordinates where the first coordinate and the last are
   *     equivalent. (For internal use, flat coordinates in combination with
   *     `layout` and `ends` are also accepted.)
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   * @param {Array<number>} [ends] Ends (for internal use with flat coordinates).
   */
  constructor(coordinates2, layout, ends) {
    super();
    this.ends_ = [];
    this.flatInteriorPointRevision_ = -1;
    this.flatInteriorPoint_ = null;
    this.maxDelta_ = -1;
    this.maxDeltaRevision_ = -1;
    this.orientedRevision_ = -1;
    this.orientedFlatCoordinates_ = null;
    if (layout !== void 0 && ends) {
      this.setFlatCoordinates(
        layout,
        /** @type {Array<number>} */
        coordinates2
      );
      this.ends_ = ends;
    } else {
      this.setCoordinates(
        /** @type {Array<Array<import("../coordinate.js").Coordinate>>} */
        coordinates2,
        layout
      );
    }
  }
  /**
   * Append the passed linear ring to this polygon.
   * @param {LinearRing} linearRing Linear ring.
   * @api
   */
  appendLinearRing(linearRing2) {
    if (!this.flatCoordinates) {
      this.flatCoordinates = linearRing2.getFlatCoordinates().slice();
    } else {
      extend(this.flatCoordinates, linearRing2.getFlatCoordinates());
    }
    this.ends_.push(this.flatCoordinates.length);
    this.changed();
  }
  /**
   * Make a complete copy of the geometry.
   * @return {!Polygon} Clone.
   * @api
   * @override
   */
  clone() {
    const polygon = new _Polygon(
      this.flatCoordinates.slice(),
      this.layout,
      this.ends_.slice()
    );
    polygon.applyProperties(this);
    return polygon;
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @param {import("../coordinate.js").Coordinate} closestPoint Closest point.
   * @param {number} minSquaredDistance Minimum squared distance.
   * @return {number} Minimum squared distance.
   * @override
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    if (minSquaredDistance < closestSquaredDistanceXY(this.getExtent(), x, y)) {
      return minSquaredDistance;
    }
    if (this.maxDeltaRevision_ != this.getRevision()) {
      this.maxDelta_ = Math.sqrt(
        arrayMaxSquaredDelta(
          this.flatCoordinates,
          0,
          this.ends_,
          this.stride,
          0
        )
      );
      this.maxDeltaRevision_ = this.getRevision();
    }
    return assignClosestArrayPoint(
      this.flatCoordinates,
      0,
      this.ends_,
      this.stride,
      this.maxDelta_,
      true,
      x,
      y,
      closestPoint,
      minSquaredDistance
    );
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @return {boolean} Contains (x, y).
   * @override
   */
  containsXY(x, y) {
    return linearRingsContainsXY(
      this.getOrientedFlatCoordinates(),
      0,
      this.ends_,
      this.stride,
      x,
      y
    );
  }
  /**
   * Return the area of the polygon on projected plane.
   * @return {number} Area (on projected plane).
   * @api
   */
  getArea() {
    return linearRings(
      this.getOrientedFlatCoordinates(),
      0,
      this.ends_,
      this.stride
    );
  }
  /**
   * Get the coordinate array for this geometry.  This array has the structure
   * of a GeoJSON coordinate array for polygons.
   *
   * @param {boolean} [right] Orient coordinates according to the right-hand
   *     rule (counter-clockwise for exterior and clockwise for interior rings).
   *     If `false`, coordinates will be oriented according to the left-hand rule
   *     (clockwise for exterior and counter-clockwise for interior rings).
   *     By default, coordinate orientation will depend on how the geometry was
   *     constructed.
   * @return {Array<Array<import("../coordinate.js").Coordinate>>} Coordinates.
   * @api
   * @override
   */
  getCoordinates(right) {
    let flatCoordinates;
    if (right !== void 0) {
      flatCoordinates = this.getOrientedFlatCoordinates().slice();
      orientLinearRings(flatCoordinates, 0, this.ends_, this.stride, right);
    } else {
      flatCoordinates = this.flatCoordinates;
    }
    return inflateCoordinatesArray(flatCoordinates, 0, this.ends_, this.stride);
  }
  /**
   * @return {Array<number>} Ends.
   */
  getEnds() {
    return this.ends_;
  }
  /**
   * @return {Array<number>} Interior point.
   */
  getFlatInteriorPoint() {
    if (this.flatInteriorPointRevision_ != this.getRevision()) {
      const flatCenter = getCenter(this.getExtent());
      this.flatInteriorPoint_ = getInteriorPointOfArray(
        this.getOrientedFlatCoordinates(),
        0,
        this.ends_,
        this.stride,
        flatCenter,
        0
      );
      this.flatInteriorPointRevision_ = this.getRevision();
    }
    return (
      /** @type {import("../coordinate.js").Coordinate} */
      this.flatInteriorPoint_
    );
  }
  /**
   * Return an interior point of the polygon.
   * @return {Point} Interior point as XYM coordinate, where M is the
   * length of the horizontal intersection that the point belongs to.
   * @api
   */
  getInteriorPoint() {
    return new Point_default(this.getFlatInteriorPoint(), "XYM");
  }
  /**
   * Return the number of rings of the polygon,  this includes the exterior
   * ring and any interior rings.
   *
   * @return {number} Number of rings.
   * @api
   */
  getLinearRingCount() {
    return this.ends_.length;
  }
  /**
   * Return the Nth linear ring of the polygon geometry. Return `null` if the
   * given index is out of range.
   * The exterior linear ring is available at index `0` and the interior rings
   * at index `1` and beyond.
   *
   * @param {number} index Index.
   * @return {LinearRing|null} Linear ring.
   * @api
   */
  getLinearRing(index) {
    if (index < 0 || this.ends_.length <= index) {
      return null;
    }
    return new LinearRing_default(
      this.flatCoordinates.slice(
        index === 0 ? 0 : this.ends_[index - 1],
        this.ends_[index]
      ),
      this.layout
    );
  }
  /**
   * Return the linear rings of the polygon.
   * @return {Array<LinearRing>} Linear rings.
   * @api
   */
  getLinearRings() {
    const layout = this.layout;
    const flatCoordinates = this.flatCoordinates;
    const ends = this.ends_;
    const linearRings2 = [];
    let offset = 0;
    for (let i = 0, ii = ends.length; i < ii; ++i) {
      const end = ends[i];
      const linearRing2 = new LinearRing_default(
        flatCoordinates.slice(offset, end),
        layout
      );
      linearRings2.push(linearRing2);
      offset = end;
    }
    return linearRings2;
  }
  /**
   * @return {Array<number>} Oriented flat coordinates.
   */
  getOrientedFlatCoordinates() {
    if (this.orientedRevision_ != this.getRevision()) {
      const flatCoordinates = this.flatCoordinates;
      if (linearRingsAreOriented(flatCoordinates, 0, this.ends_, this.stride)) {
        this.orientedFlatCoordinates_ = flatCoordinates;
      } else {
        this.orientedFlatCoordinates_ = flatCoordinates.slice();
        this.orientedFlatCoordinates_.length = orientLinearRings(
          this.orientedFlatCoordinates_,
          0,
          this.ends_,
          this.stride
        );
      }
      this.orientedRevision_ = this.getRevision();
    }
    return (
      /** @type {Array<number>} */
      this.orientedFlatCoordinates_
    );
  }
  /**
   * @param {number} squaredTolerance Squared tolerance.
   * @return {Polygon} Simplified Polygon.
   * @protected
   * @override
   */
  getSimplifiedGeometryInternal(squaredTolerance) {
    const simplifiedFlatCoordinates = [];
    const simplifiedEnds = [];
    simplifiedFlatCoordinates.length = quantizeArray(
      this.flatCoordinates,
      0,
      this.ends_,
      this.stride,
      Math.sqrt(squaredTolerance),
      simplifiedFlatCoordinates,
      0,
      simplifiedEnds
    );
    return new _Polygon(simplifiedFlatCoordinates, "XY", simplifiedEnds);
  }
  /**
   * Get the type of this geometry.
   * @return {import("./Geometry.js").Type} Geometry type.
   * @api
   * @override
   */
  getType() {
    return "Polygon";
  }
  /**
   * Test if the geometry and the passed extent intersect.
   * @param {import("../extent.js").Extent} extent Extent.
   * @return {boolean} `true` if the geometry and the extent intersect.
   * @api
   * @override
   */
  intersectsExtent(extent) {
    return intersectsLinearRingArray(
      this.getOrientedFlatCoordinates(),
      0,
      this.ends_,
      this.stride,
      extent
    );
  }
  /**
   * Set the coordinates of the polygon.
   * @param {!Array<Array<import("../coordinate.js").Coordinate>>} coordinates Coordinates.
   * @param {import("./Geometry.js").GeometryLayout} [layout] Layout.
   * @api
   * @override
   */
  setCoordinates(coordinates2, layout) {
    this.setLayout(layout, coordinates2, 2);
    if (!this.flatCoordinates) {
      this.flatCoordinates = [];
    }
    const ends = deflateCoordinatesArray(
      this.flatCoordinates,
      0,
      coordinates2,
      this.stride,
      this.ends_
    );
    this.flatCoordinates.length = ends.length === 0 ? 0 : ends[ends.length - 1];
    this.changed();
  }
};
var Polygon_default = Polygon;

// node_modules/ol/dom.js
function createCanvasContext2D(width, height, canvasPool, settings) {
  let canvas;
  if (canvasPool && canvasPool.length) {
    canvas = /** @type {HTMLCanvasElement} */
    canvasPool.shift();
  } else if (WORKER_OFFSCREEN_CANVAS) {
    canvas = new class extends OffscreenCanvas {
      style = {};
    }(width ?? 300, height ?? 150);
  } else {
    canvas = document.createElement("canvas");
  }
  if (width) {
    canvas.width = width;
  }
  if (height) {
    canvas.height = height;
  }
  return (
    /** @type {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} */
    canvas.getContext("2d", settings)
  );
}
var sharedCanvasContext;
function getSharedCanvasContext2D() {
  if (!sharedCanvasContext) {
    sharedCanvasContext = createCanvasContext2D(1, 1);
  }
  return sharedCanvasContext;
}

// node_modules/ol/ImageState.js
var ImageState_default = {
  IDLE: 0,
  LOADING: 1,
  LOADED: 2,
  ERROR: 3,
  EMPTY: 4
};

// node_modules/ol/color.js
var NO_COLOR = [NaN, NaN, NaN, 0];
var colorParseContext;
function getColorParseContext() {
  if (!colorParseContext) {
    colorParseContext = createCanvasContext2D(1, 1, void 0, {
      willReadFrequently: true,
      desynchronized: true
    });
  }
  return colorParseContext;
}
var rgbModernRegEx = /^rgba?\(\s*(\d+%?)\s+(\d+%?)\s+(\d+%?)(?:\s*\/\s*(\d+%|\d*\.\d+|[01]))?\s*\)$/i;
var rgbLegacyAbsoluteRegEx = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+%|\d*\.\d+|[01]))?\s*\)$/i;
var rgbLegacyPercentageRegEx = /^rgba?\(\s*(\d+%)\s*,\s*(\d+%)\s*,\s*(\d+%)(?:\s*,\s*(\d+%|\d*\.\d+|[01]))?\s*\)$/i;
var hexRegEx = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
function toColorComponent(s, divider) {
  return s.endsWith("%") ? Number(s.substring(0, s.length - 1)) / divider : Number(s);
}
function throwInvalidColor(color) {
  throw new Error('failed to parse "' + color + '" as color');
}
function parseRgba(color) {
  if (color.toLowerCase().startsWith("rgb")) {
    const rgb = color.match(rgbLegacyAbsoluteRegEx) || color.match(rgbModernRegEx) || color.match(rgbLegacyPercentageRegEx);
    if (rgb) {
      const alpha = rgb[4];
      const rgbDivider = 100 / 255;
      return [
        clamp(toColorComponent(rgb[1], rgbDivider) + 0.5 | 0, 0, 255),
        clamp(toColorComponent(rgb[2], rgbDivider) + 0.5 | 0, 0, 255),
        clamp(toColorComponent(rgb[3], rgbDivider) + 0.5 | 0, 0, 255),
        alpha !== void 0 ? clamp(toColorComponent(alpha, 100), 0, 1) : 1
      ];
    }
    throwInvalidColor(color);
  }
  if (color.startsWith("#")) {
    if (hexRegEx.test(color)) {
      const hex = color.substring(1);
      const step = hex.length <= 4 ? 1 : 2;
      const colorFromHex = [0, 0, 0, 255];
      for (let i = 0, ii = hex.length; i < ii; i += step) {
        let colorComponent = parseInt(hex.substring(i, i + step), 16);
        if (step === 1) {
          colorComponent += colorComponent << 4;
        }
        colorFromHex[i / step] = colorComponent;
      }
      colorFromHex[3] = colorFromHex[3] / 255;
      return colorFromHex;
    }
    throwInvalidColor(color);
  }
  const context = getColorParseContext();
  context.fillStyle = "#abcdef";
  let invalidCheckFillStyle = context.fillStyle;
  context.fillStyle = color;
  if (context.fillStyle === invalidCheckFillStyle) {
    context.fillStyle = "#fedcba";
    invalidCheckFillStyle = context.fillStyle;
    context.fillStyle = color;
    if (context.fillStyle === invalidCheckFillStyle) {
      throwInvalidColor(color);
    }
  }
  const colorString = context.fillStyle;
  if (colorString.startsWith("#") || colorString.startsWith("rgba")) {
    return parseRgba(colorString);
  }
  context.clearRect(0, 0, 1, 1);
  context.fillRect(0, 0, 1, 1);
  const colorFromImage = Array.from(context.getImageData(0, 0, 1, 1).data);
  colorFromImage[3] = toFixed(colorFromImage[3] / 255, 3);
  return colorFromImage;
}
function asString(color) {
  if (typeof color === "string") {
    return color;
  }
  return toString(color);
}
var MAX_CACHE_SIZE = 1024;
var cache2 = {};
var cacheSize = 0;
function fromString(s) {
  if (s === "none") {
    return NO_COLOR;
  }
  if (cache2.hasOwnProperty(s)) {
    return cache2[s];
  }
  if (cacheSize >= MAX_CACHE_SIZE) {
    let i = 0;
    for (const key in cache2) {
      if ((i++ & 3) === 0) {
        delete cache2[key];
        --cacheSize;
      }
    }
  }
  const color = parseRgba(s);
  if (color.length !== 4) {
    throwInvalidColor(s);
  }
  for (const c of color) {
    if (isNaN(c)) {
      throwInvalidColor(s);
    }
  }
  cache2[s] = color;
  ++cacheSize;
  return color;
}
function asArray(color) {
  if (Array.isArray(color)) {
    return color;
  }
  return fromString(color);
}
function toString(color) {
  let r = color[0];
  if (r != (r | 0)) {
    r = r + 0.5 | 0;
  }
  let g = color[1];
  if (g != (g | 0)) {
    g = g + 0.5 | 0;
  }
  let b = color[2];
  if (b != (b | 0)) {
    b = b + 0.5 | 0;
  }
  const a = color[3] === void 0 ? 1 : Math.round(color[3] * 1e3) / 1e3;
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

// node_modules/ol/Image.js
function load(image, src) {
  return new Promise((resolve, reject) => {
    function handleLoad() {
      unlisten();
      resolve(image);
    }
    function handleError() {
      unlisten();
      reject(new Error("Image load error"));
    }
    function unlisten() {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    }
    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);
    if (src) {
      image.src = src;
    }
  });
}
function decodeFallback(image, src) {
  if (src) {
    image.src = src;
  }
  return image.src && IMAGE_DECODE ? new Promise(
    (resolve, reject) => image.decode().then(() => resolve(image)).catch(
      (e) => image.complete && image.width ? resolve(image) : reject(e)
    )
  ) : load(image);
}

// node_modules/ol/style/IconImageCache.js
var IconImageCache = class {
  constructor() {
    this.cache_ = {};
    this.patternCache_ = {};
    this.cacheSize_ = 0;
    this.maxCacheSize_ = 1024;
  }
  /**
   * FIXME empty description for jsdoc
   */
  clear() {
    this.cache_ = {};
    this.patternCache_ = {};
    this.cacheSize_ = 0;
  }
  /**
   * @return {boolean} Can expire cache.
   */
  canExpireCache() {
    return this.cacheSize_ > this.maxCacheSize_;
  }
  /**
   * FIXME empty description for jsdoc
   */
  expire() {
    if (this.canExpireCache()) {
      let i = 0;
      for (const key in this.cache_) {
        const iconImage = this.cache_[key];
        if ((i++ & 3) === 0 && !iconImage.hasListener()) {
          delete this.cache_[key];
          delete this.patternCache_[key];
          --this.cacheSize_;
        }
      }
    }
  }
  /**
   * @param {string} src Src.
   * @param {import("../color.js").Color|string|null} color Color.
   * @return {import("./IconImage.js").default|null} Icon image.
   */
  get(src, color) {
    const key = getCacheKey(src, color);
    const icon = key in this.cache_ ? this.cache_[key] : null;
    return icon;
  }
  /**
   * @param {string} src Src.
   * @param {import("../color.js").Color|string|null} color Color.
   * @return {CanvasPattern|null} Icon image.
   */
  getPattern(src, color) {
    const key = getCacheKey(src, color);
    return key in this.patternCache_ ? this.patternCache_[key] : null;
  }
  /**
   * @param {string} src Src.
   * @param {import("../color.js").Color|string|null} color Color.
   * @param {import("./IconImage.js").default|null} iconImage Icon image.
   * @param {boolean} [pattern] Also cache a `'repeat'` pattern with this `iconImage`.
   */
  set(src, color, iconImage, pattern) {
    const key = getCacheKey(src, color);
    const update = key in this.cache_;
    if (iconImage) {
      this.cache_[key] = iconImage;
    }
    if (pattern && iconImage) {
      if (iconImage.getImageState() === ImageState_default.IDLE) {
        iconImage.load();
      }
      if (iconImage.getImageState() === ImageState_default.LOADING) {
        iconImage.ready().then(() => {
          const patternFill = getSharedCanvasContext2D().createPattern(
            iconImage.getImage(1),
            "repeat"
          );
          if (patternFill) {
            this.patternCache_[key] = patternFill;
          }
        });
      } else {
        const patternFill = getSharedCanvasContext2D().createPattern(
          iconImage.getImage(1),
          "repeat"
        );
        if (patternFill) {
          this.patternCache_[key] = patternFill;
        }
      }
    }
    if (!update) {
      ++this.cacheSize_;
    }
  }
  /**
   * Set the cache size of the icon cache. Default is `1024`. Change this value when
   * your map uses more than 1024 different icon images and you are not caching icon
   * styles on the application level.
   * @param {number} maxCacheSize Cache max size.
   * @api
   */
  setSize(maxCacheSize) {
    this.maxCacheSize_ = maxCacheSize;
    this.expire();
  }
};
function getCacheKey(src, color) {
  const colorString = color ? asArray(color) : "null";
  return src + ":" + colorString;
}
var shared = new IconImageCache();

// node_modules/ol/style/IconImage.js
var taintedTestContext = null;
var IconImage = class extends Target_default {
  /**
   * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap|null} image Image.
   * @param {string|undefined} src Src.
   * @param {import('../dom.js').ImageAttributes} imageAttributes Image attributes options.
   * @param {import("../ImageState.js").default|undefined} imageState Image state.
   * @param {import("../color.js").Color|string|null} color Color.
   */
  constructor(image, src, imageAttributes, imageState, color) {
    super();
    this.hitDetectionImage_ = null;
    this.image_ = image;
    this.crossOrigin_ = imageAttributes?.crossOrigin ?? null;
    this.referrerPolicy_ = imageAttributes?.referrerPolicy;
    this.canvas_ = {};
    this.color_ = color;
    this.imageState_ = imageState === void 0 ? ImageState_default.IDLE : imageState;
    this.size_ = image && image.width && image.height ? [image.width, image.height] : null;
    this.src_ = src;
    this.tainted_;
    this.ready_ = null;
  }
  /**
   * @private
   */
  initializeImage_() {
    this.image_ = new Image();
    if (this.crossOrigin_ !== null) {
      this.image_.crossOrigin = this.crossOrigin_;
    }
    if (this.referrerPolicy_ !== void 0) {
      this.image_.referrerPolicy = this.referrerPolicy_;
    }
  }
  /**
   * @private
   * @return {boolean} The image canvas is tainted.
   */
  isTainted_() {
    if (this.tainted_ === void 0 && this.imageState_ === ImageState_default.LOADED) {
      const image = this.image_;
      if (!image) {
        return false;
      }
      if (!taintedTestContext) {
        taintedTestContext = createCanvasContext2D(1, 1, void 0, {
          willReadFrequently: true
        });
      }
      taintedTestContext.drawImage(
        /** @type {CanvasImageSource} */
        image,
        0,
        0
      );
      try {
        taintedTestContext.getImageData(0, 0, 1, 1);
        this.tainted_ = false;
      } catch {
        taintedTestContext = null;
        this.tainted_ = true;
      }
    }
    return this.tainted_ === true;
  }
  /**
   * @private
   */
  dispatchChangeEvent_() {
    this.dispatchEvent(EventType_default.CHANGE);
  }
  /**
   * @private
   */
  handleImageError_() {
    this.imageState_ = ImageState_default.ERROR;
    this.dispatchChangeEvent_();
  }
  /**
   * @private
   */
  handleImageLoad_() {
    this.imageState_ = ImageState_default.LOADED;
    const image = this.image_;
    if (image && "width" in image && "height" in image) {
      this.size_ = [image.width, image.height];
    }
    this.dispatchChangeEvent_();
  }
  /**
   * @param {number} pixelRatio Pixel ratio.
   * @return {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} Image or Canvas element or image bitmap.
   */
  getImage(pixelRatio) {
    if (!this.image_) {
      this.initializeImage_();
    }
    this.replaceColor_(pixelRatio);
    const image = this.image_;
    return this.canvas_[pixelRatio] ? this.canvas_[pixelRatio] : (
      /** @type {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} */
      image
    );
  }
  /**
   * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} image Image.
   */
  setImage(image) {
    this.image_ = image;
  }
  /**
   * @param {number} pixelRatio Pixel ratio.
   * @return {number} Image or Canvas element.
   */
  getPixelRatio(pixelRatio) {
    this.replaceColor_(pixelRatio);
    return this.canvas_[pixelRatio] ? pixelRatio : 1;
  }
  /**
   * @return {import("../ImageState.js").default} Image state.
   */
  getImageState() {
    return this.imageState_;
  }
  /**
   * @return {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} Image element.
   */
  getHitDetectionImage() {
    if (!this.image_) {
      this.initializeImage_();
    }
    if (!this.hitDetectionImage_) {
      if (this.isTainted_()) {
        const size = this.size_;
        if (!size) {
          return (
            /** @type {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} */
            this.image_
          );
        }
        const width = size[0];
        const height = size[1];
        const context = createCanvasContext2D(width, height);
        context.fillRect(0, 0, width, height);
        this.hitDetectionImage_ = context.canvas;
      } else {
        this.hitDetectionImage_ = this.image_;
      }
    }
    return (
      /** @type {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} */
      this.hitDetectionImage_
    );
  }
  /**
   * Get the size of the icon (in pixels).
   * @return {import("../size.js").Size|null} Image size.
   */
  getSize() {
    return this.size_;
  }
  /**
   * @return {string|undefined} Image src.
   */
  getSrc() {
    return this.src_;
  }
  /**
   * Load not yet loaded URI.
   */
  load() {
    if (this.imageState_ !== ImageState_default.IDLE) {
      return;
    }
    if (!this.image_) {
      this.initializeImage_();
    }
    this.imageState_ = ImageState_default.LOADING;
    try {
      if (this.src_ !== void 0) {
        this.image_.src = this.src_;
      }
    } catch {
      this.handleImageError_();
    }
    if (this.image_ instanceof HTMLImageElement) {
      decodeFallback(this.image_, this.src_).then((image) => {
        this.image_ = image;
        this.handleImageLoad_();
      }).catch(this.handleImageError_.bind(this));
    }
  }
  /**
   * @param {number} pixelRatio Pixel ratio.
   * @private
   */
  replaceColor_(pixelRatio) {
    if (!this.color_ || this.canvas_[pixelRatio] || this.imageState_ !== ImageState_default.LOADED) {
      return;
    }
    const image = this.image_;
    if (!image) {
      return;
    }
    const ctx = createCanvasContext2D(
      Math.ceil(image.width * pixelRatio),
      Math.ceil(image.height * pixelRatio)
    );
    const canvas = ctx.canvas;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.drawImage(
      /** @type {CanvasImageSource} */
      image,
      0,
      0
    );
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = asString(this.color_);
    ctx.fillRect(0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(
      /** @type {CanvasImageSource} */
      image,
      0,
      0
    );
    this.canvas_[pixelRatio] = canvas;
  }
  /**
   * @return {Promise<void>} Promise that resolves when the image is loaded.
   */
  ready() {
    if (!this.ready_) {
      this.ready_ = new Promise((resolve) => {
        if (this.imageState_ === ImageState_default.LOADED || this.imageState_ === ImageState_default.ERROR) {
          resolve();
        } else {
          const onChange = () => {
            if (this.imageState_ === ImageState_default.LOADED || this.imageState_ === ImageState_default.ERROR) {
              this.removeEventListener(EventType_default.CHANGE, onChange);
              resolve();
            }
          };
          this.addEventListener(EventType_default.CHANGE, onChange);
        }
      });
    }
    return this.ready_;
  }
};
function get4(image, src, imageAttributes, imageState, color, pattern) {
  let iconImage = src === void 0 ? void 0 : shared.get(src, color);
  if (!iconImage) {
    iconImage = new IconImage(
      image,
      image && "src" in image ? image.src || void 0 : src,
      imageAttributes,
      imageState,
      color
    );
    if (src !== void 0) {
      shared.set(src, color, iconImage, pattern);
    }
  }
  if (pattern && iconImage && src !== void 0 && !shared.getPattern(src, color)) {
    shared.set(src, color, iconImage, pattern);
  }
  return iconImage;
}
var IconImage_default = IconImage;

// node_modules/ol/colorlike.js
function asColorLike(color) {
  if (!color) {
    return null;
  }
  if (Array.isArray(color)) {
    return toString(color);
  }
  if (typeof color === "object" && "src" in color) {
    return asCanvasPattern(color);
  }
  return color;
}
function asCanvasPattern(pattern) {
  if (!pattern.offset || !pattern.size) {
    return shared.getPattern(pattern.src, pattern.color ?? null);
  }
  const cacheKey = pattern.src + ":" + pattern.offset;
  const canvasPattern = shared.getPattern(cacheKey, pattern.color ?? null);
  if (canvasPattern) {
    return canvasPattern;
  }
  const iconImage = shared.get(pattern.src, null);
  if (!iconImage || iconImage.getImageState() !== ImageState_default.LOADED) {
    return null;
  }
  const patternCanvasContext = createCanvasContext2D(
    pattern.size[0],
    pattern.size[1]
  );
  patternCanvasContext.drawImage(
    iconImage.getImage(1),
    pattern.offset[0],
    pattern.offset[1],
    pattern.size[0],
    pattern.size[1],
    0,
    0,
    pattern.size[0],
    pattern.size[1]
  );
  get4(
    patternCanvasContext.canvas,
    cacheKey,
    {},
    ImageState_default.LOADED,
    pattern.color ?? null,
    true
  );
  return shared.getPattern(cacheKey, pattern.color ?? null);
}

// node_modules/ol/render/canvas.js
var defaultFillStyle = "#000";
var defaultLineCap = "round";
var defaultLineJoin = "round";
var defaultMiterLimit = 10;
var defaultStrokeStyle = "#000";
var defaultLineWidth = 1;
var checkedFonts = new Object_default();

// node_modules/ol/size.js
function toSize(size, dest2) {
  if (Array.isArray(size)) {
    return size;
  }
  if (dest2 === void 0) {
    dest2 = [size, size];
  } else {
    dest2[0] = size;
    dest2[1] = size;
  }
  return dest2;
}

// node_modules/ol/style/Image.js
var ImageStyle = class _ImageStyle {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {
    this.opacity_ = options.opacity;
    this.rotateWithView_ = options.rotateWithView;
    this.rotation_ = options.rotation;
    this.scale_ = options.scale;
    this.scaleArray_ = toSize(options.scale);
    this.displacement_ = options.displacement;
    this.declutterMode_ = options.declutterMode;
  }
  /**
   * Clones the style.
   * @return {ImageStyle} The cloned style.
   * @api
   */
  clone() {
    const scale2 = this.getScale();
    return new _ImageStyle({
      opacity: this.getOpacity(),
      scale: Array.isArray(scale2) ? scale2.slice() : scale2,
      rotation: this.getRotation(),
      rotateWithView: this.getRotateWithView(),
      displacement: this.getDisplacement().slice(),
      declutterMode: this.getDeclutterMode()
    });
  }
  /**
   * Get the symbolizer opacity.
   * @return {number} Opacity.
   * @api
   */
  getOpacity() {
    return this.opacity_;
  }
  /**
   * Determine whether the symbolizer rotates with the map.
   * @return {boolean} Rotate with map.
   * @api
   */
  getRotateWithView() {
    return this.rotateWithView_;
  }
  /**
   * Get the symoblizer rotation.
   * @return {number} Rotation.
   * @api
   */
  getRotation() {
    return this.rotation_;
  }
  /**
   * Get the symbolizer scale.
   * @return {number|import("../size.js").Size} Scale.
   * @api
   */
  getScale() {
    return this.scale_;
  }
  /**
   * Get the symbolizer scale array.
   * @return {import("../size.js").Size} Scale array.
   */
  getScaleArray() {
    return this.scaleArray_;
  }
  /**
   * Get the displacement of the shape
   * @return {Array<number>} Shape's center displacement
   * @api
   */
  getDisplacement() {
    return this.displacement_;
  }
  /**
   * Get the declutter mode of the shape
   * @return {import("./Style.js").DeclutterMode|undefined} Shape's declutter mode
   * @api
   */
  getDeclutterMode() {
    return this.declutterMode_;
  }
  /**
   * Get the anchor point in pixels. The anchor determines the center point for the
   * symbolizer.
   * @abstract
   * @return {Array<number>|null} Anchor.
   */
  getAnchor() {
    return abstract();
  }
  /**
   * Get the image element for the symbolizer.
   * @abstract
   * @param {number} pixelRatio Pixel ratio.
   * @return {import('../DataTile.js').ImageLike} Image element.
   */
  getImage(pixelRatio) {
    return abstract();
  }
  /**
   * @abstract
   * @return {import('../DataTile.js').ImageLike} Image element.
   */
  getHitDetectionImage() {
    return abstract();
  }
  /**
   * Get the image pixel ratio.
   * @param {number} pixelRatio Pixel ratio.
   * @return {number} Pixel ratio.
   */
  getPixelRatio(pixelRatio) {
    return 1;
  }
  /**
   * @abstract
   * @return {import("../ImageState.js").default} Image state.
   */
  getImageState() {
    return abstract();
  }
  /**
   * @abstract
   * @return {import("../size.js").Size|null} Image size.
   */
  getImageSize() {
    return abstract();
  }
  /**
   * Get the origin of the symbolizer.
   * @abstract
   * @return {Array<number>|null} Origin.
   */
  getOrigin() {
    return abstract();
  }
  /**
   * Get the size of the symbolizer (in pixels).
   * @abstract
   * @return {import("../size.js").Size|null} Size.
   */
  getSize() {
    return abstract();
  }
  /**
   * Set the displacement.
   *
   * @param {Array<number>} displacement Displacement.
   * @api
   */
  setDisplacement(displacement) {
    this.displacement_ = displacement;
  }
  /**
   * Set the opacity.
   *
   * @param {number} opacity Opacity.
   * @api
   */
  setOpacity(opacity) {
    this.opacity_ = opacity;
  }
  /**
   * Set whether to rotate the style with the view.
   *
   * @param {boolean} rotateWithView Rotate with map.
   * @api
   */
  setRotateWithView(rotateWithView) {
    this.rotateWithView_ = rotateWithView;
  }
  /**
   * Set the rotation.
   *
   * @param {number} rotation Rotation.
   * @api
   */
  setRotation(rotation) {
    this.rotation_ = rotation;
  }
  /**
   * Set the scale.
   *
   * @param {number|import("../size.js").Size} scale Scale.
   * @api
   */
  setScale(scale2) {
    this.scale_ = scale2;
    this.scaleArray_ = toSize(scale2);
  }
  /**
   * @abstract
   * @param {function(import("../events/Event.js").default): void} listener Listener function.
   */
  listenImageChange(listener) {
    abstract();
  }
  /**
   * Load not yet loaded URI.
   * @abstract
   */
  load() {
    abstract();
  }
  /**
   * @abstract
   * @param {function(import("../events/Event.js").default): void} listener Listener function.
   */
  unlistenImageChange(listener) {
    abstract();
  }
  /**
   * @return {Promise<void>} `false` or Promise that resolves when the style is ready to use.
   */
  ready() {
    return Promise.resolve();
  }
};
var Image_default = ImageStyle;

// node_modules/ol/style/RegularShape.js
var RegularShape = class _RegularShape extends Image_default {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {
    super({
      opacity: 1,
      rotateWithView: options.rotateWithView !== void 0 ? options.rotateWithView : false,
      rotation: options.rotation !== void 0 ? options.rotation : 0,
      scale: options.scale !== void 0 ? options.scale : 1,
      displacement: options.displacement !== void 0 ? options.displacement : [0, 0],
      declutterMode: options.declutterMode
    });
    this.hitDetectionCanvas_ = null;
    this.fill_ = options.fill !== void 0 ? options.fill : null;
    this.origin_ = [0, 0];
    this.points_ = options.points;
    this.radius = options.radius;
    this.radius2_ = options.radius2;
    this.angle_ = options.angle !== void 0 ? options.angle : 0;
    this.stroke_ = options.stroke !== void 0 ? options.stroke : null;
    this.size_;
    this.renderOptions_;
    this.imageState_ = this.fill_ && this.fill_.loading() ? ImageState_default.LOADING : ImageState_default.LOADED;
    if (this.imageState_ === ImageState_default.LOADING) {
      this.ready().then(() => this.imageState_ = ImageState_default.LOADED);
    }
    this.render();
  }
  /**
   * Clones the style.
   * @return {RegularShape} The cloned style.
   * @api
   * @override
   */
  clone() {
    const scale2 = this.getScale();
    const style = new _RegularShape({
      fill: this.getFill()?.clone(),
      points: this.getPoints(),
      radius: this.getRadius(),
      radius2: this.getRadius2(),
      angle: this.getAngle(),
      stroke: this.getStroke()?.clone(),
      rotation: this.getRotation(),
      rotateWithView: this.getRotateWithView(),
      scale: Array.isArray(scale2) ? scale2.slice() : scale2,
      displacement: this.getDisplacement().slice(),
      declutterMode: this.getDeclutterMode()
    });
    style.setOpacity(this.getOpacity());
    return style;
  }
  /**
   * Get the anchor point in pixels. The anchor determines the center point for the
   * symbolizer.
   * @return {Array<number>} Anchor.
   * @api
   * @override
   */
  getAnchor() {
    const size = this.size_;
    const displacement = this.getDisplacement();
    const scale2 = this.getScaleArray();
    return [
      size[0] / 2 - displacement[0] / scale2[0],
      size[1] / 2 + displacement[1] / scale2[1]
    ];
  }
  /**
   * Get the angle used in generating the shape.
   * @return {number} Shape's rotation in radians.
   * @api
   */
  getAngle() {
    return this.angle_;
  }
  /**
   * Get the fill style for the shape.
   * @return {import("./Fill.js").default|null} Fill style.
   * @api
   */
  getFill() {
    return this.fill_;
  }
  /**
   * Set the fill style.
   * @param {import("./Fill.js").default|null} fill Fill style.
   * @api
   */
  setFill(fill) {
    this.fill_ = fill;
    this.render();
  }
  /**
   * @return {HTMLCanvasElement|OffscreenCanvas} Image element.
   * @override
   */
  getHitDetectionImage() {
    if (!this.hitDetectionCanvas_) {
      this.hitDetectionCanvas_ = this.createHitDetectionCanvas_(
        this.renderOptions_
      );
    }
    return this.hitDetectionCanvas_;
  }
  /**
   * Get the image icon.
   * @param {number} pixelRatio Pixel ratio.
   * @return {HTMLCanvasElement|OffscreenCanvas} Image or Canvas element.
   * @api
   * @override
   */
  getImage(pixelRatio) {
    const fillKey = this.fill_?.getKey();
    const cacheKey = `${pixelRatio},${this.angle_},${this.radius},${this.radius2_},${this.points_},${fillKey}` + Object.values(this.renderOptions_).join(",");
    let image = (
      /** @type {HTMLCanvasElement|OffscreenCanvas} */
      shared.get(cacheKey, null)?.getImage(1)
    );
    if (!image) {
      const renderOptions = this.renderOptions_;
      const size = Math.ceil(renderOptions.size * pixelRatio);
      const context = createCanvasContext2D(size, size);
      this.draw_(renderOptions, context, pixelRatio);
      image = context.canvas;
      const iconImage = new IconImage_default(
        image,
        void 0,
        {},
        ImageState_default.LOADED,
        null
      );
      shared.set(cacheKey, null, iconImage);
      createImageBitmap(image).then((imageBitmap) => {
        iconImage.setImage(imageBitmap);
      });
    }
    return image;
  }
  /**
   * Get the image pixel ratio.
   * @param {number} pixelRatio Pixel ratio.
   * @return {number} Pixel ratio.
   * @override
   */
  getPixelRatio(pixelRatio) {
    return pixelRatio;
  }
  /**
   * @return {import("../size.js").Size} Image size.
   * @override
   */
  getImageSize() {
    return this.size_;
  }
  /**
   * @return {import("../ImageState.js").default} Image state.
   * @override
   */
  getImageState() {
    return this.imageState_;
  }
  /**
   * Get the origin of the symbolizer.
   * @return {Array<number>} Origin.
   * @api
   * @override
   */
  getOrigin() {
    return this.origin_;
  }
  /**
   * Get the number of points for generating the shape.
   * @return {number} Number of points for stars and regular polygons.
   * @api
   */
  getPoints() {
    return this.points_;
  }
  /**
   * Get the (primary) radius for the shape.
   * @return {number} Radius.
   * @api
   */
  getRadius() {
    return this.radius;
  }
  /**
   * Set the (primary) radius for the shape.
   * @param {number} radius Radius.
   * @api
   */
  setRadius(radius) {
    if (this.radius === radius) {
      return;
    }
    this.radius = radius;
    this.render();
  }
  /**
   * Get the secondary radius for the shape.
   * @return {number|undefined} Radius2.
   * @api
   */
  getRadius2() {
    return this.radius2_;
  }
  /**
   * Set the secondary radius for the shape.
   * @param {number|undefined} radius2 Radius2.
   * @api
   */
  setRadius2(radius2) {
    if (this.radius2_ === radius2) {
      return;
    }
    this.radius2_ = radius2;
    this.render();
  }
  /**
   * Get the size of the symbolizer (in pixels).
   * @return {import("../size.js").Size} Size.
   * @api
   * @override
   */
  getSize() {
    return this.size_;
  }
  /**
   * Get the stroke style for the shape.
   * @return {import("./Stroke.js").default|null} Stroke style.
   * @api
   */
  getStroke() {
    return this.stroke_;
  }
  /**
   * Set the stroke style.
   * @param {import("./Stroke.js").default|null} stroke Stroke style.
   * @api
   */
  setStroke(stroke) {
    this.stroke_ = stroke;
    this.render();
  }
  /**
   * @param {function(import("../events/Event.js").default): void} listener Listener function.
   * @override
   */
  listenImageChange(listener) {
  }
  /**
   * Load not yet loaded URI.
   * @override
   */
  load() {
  }
  /**
   * @param {function(import("../events/Event.js").default): void} listener Listener function.
   * @override
   */
  unlistenImageChange(listener) {
  }
  /**
   * Calculate additional canvas size needed for the miter.
   * @param {string} lineJoin Line join
   * @param {number} strokeWidth Stroke width
   * @param {number} miterLimit Miter limit
   * @return {number} Additional canvas size needed
   * @private
   */
  calculateLineJoinSize_(lineJoin, strokeWidth, miterLimit) {
    if (strokeWidth === 0 || this.points_ === Infinity || lineJoin !== "bevel" && lineJoin !== "miter") {
      return strokeWidth;
    }
    let r1 = this.radius;
    let r2 = this.radius2_ === void 0 ? r1 : this.radius2_;
    if (r1 < r2) {
      const tmp = r1;
      r1 = r2;
      r2 = tmp;
    }
    const points = this.radius2_ === void 0 ? this.points_ : this.points_ * 2;
    const alpha = 2 * Math.PI / points;
    const a = r2 * Math.sin(alpha);
    const b = Math.sqrt(r2 * r2 - a * a);
    const d = r1 - b;
    const e = Math.sqrt(a * a + d * d);
    const miterRatio = e / a;
    if (lineJoin === "miter" && miterRatio <= miterLimit) {
      return miterRatio * strokeWidth;
    }
    const k = strokeWidth / 2 / miterRatio;
    const l = strokeWidth / 2 * (d / e);
    const maxr = Math.sqrt((r1 + k) * (r1 + k) + l * l);
    const bevelAdd = maxr - r1;
    if (this.radius2_ === void 0 || lineJoin === "bevel") {
      return bevelAdd * 2;
    }
    const aa = r1 * Math.sin(alpha);
    const bb = Math.sqrt(r1 * r1 - aa * aa);
    const dd = r2 - bb;
    const ee = Math.sqrt(aa * aa + dd * dd);
    const innerMiterRatio = ee / aa;
    if (innerMiterRatio <= miterLimit) {
      const innerLength = innerMiterRatio * strokeWidth / 2 - r2 - r1;
      return 2 * Math.max(bevelAdd, innerLength);
    }
    return bevelAdd * 2;
  }
  /**
   * @return {RenderOptions}  The render options
   * @protected
   */
  createRenderOptions() {
    let lineCap = defaultLineCap;
    let lineJoin = defaultLineJoin;
    let miterLimit = 0;
    let lineDash = null;
    let lineDashOffset = 0;
    let strokeStyle;
    let strokeWidth = 0;
    if (this.stroke_) {
      strokeStyle = asColorLike(this.stroke_.getColor() ?? defaultStrokeStyle);
      strokeWidth = this.stroke_.getWidth() ?? defaultLineWidth;
      lineDash = this.stroke_.getLineDash();
      lineDashOffset = this.stroke_.getLineDashOffset() ?? 0;
      lineJoin = this.stroke_.getLineJoin() ?? defaultLineJoin;
      lineCap = this.stroke_.getLineCap() ?? defaultLineCap;
      miterLimit = this.stroke_.getMiterLimit() ?? defaultMiterLimit;
    }
    const add3 = this.calculateLineJoinSize_(lineJoin, strokeWidth, miterLimit);
    const maxRadius = Math.max(this.radius, this.radius2_ || 0);
    const size = Math.ceil(2 * maxRadius + add3);
    return {
      strokeStyle,
      strokeWidth,
      size,
      lineCap,
      lineDash,
      lineDashOffset,
      lineJoin,
      miterLimit
    };
  }
  /**
   * @protected
   */
  render() {
    this.renderOptions_ = this.createRenderOptions();
    const size = this.renderOptions_.size;
    this.hitDetectionCanvas_ = null;
    this.size_ = [size, size];
  }
  /**
   * @private
   * @param {RenderOptions} renderOptions Render options.
   * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} context The rendering context.
   * @param {number} pixelRatio The pixel ratio.
   */
  draw_(renderOptions, context, pixelRatio) {
    context.scale(pixelRatio, pixelRatio);
    context.translate(renderOptions.size / 2, renderOptions.size / 2);
    this.createPath_(context);
    if (this.fill_) {
      let color = this.fill_.getColor();
      if (color === null) {
        color = defaultFillStyle;
      }
      context.fillStyle = /** @type {string|CanvasGradient|CanvasPattern} */
      asColorLike(color);
      context.fill();
    }
    if (renderOptions.strokeStyle) {
      context.strokeStyle = renderOptions.strokeStyle;
      context.lineWidth = renderOptions.strokeWidth;
      if (renderOptions.lineDash) {
        context.setLineDash(renderOptions.lineDash);
        context.lineDashOffset = renderOptions.lineDashOffset;
      }
      context.lineCap = renderOptions.lineCap;
      context.lineJoin = renderOptions.lineJoin;
      context.miterLimit = renderOptions.miterLimit;
      context.stroke();
    }
  }
  /**
   * @private
   * @param {RenderOptions} renderOptions Render options.
   * @return {HTMLCanvasElement|OffscreenCanvas} Canvas containing the icon
   */
  createHitDetectionCanvas_(renderOptions) {
    let context;
    if (this.fill_) {
      let color = this.fill_.getColor();
      let opacity = 0;
      if (typeof color === "string") {
        color = asArray(color);
      }
      if (color === null) {
        opacity = 1;
      } else if (Array.isArray(color)) {
        opacity = color.length === 4 ? color[3] : 1;
      }
      if (opacity === 0) {
        context = createCanvasContext2D(renderOptions.size, renderOptions.size);
        this.drawHitDetectionCanvas_(renderOptions, context);
      }
    }
    return context ? context.canvas : this.getImage(1);
  }
  /**
   * @private
   * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} context The context to draw in.
   */
  createPath_(context) {
    let points = this.points_;
    const radius = this.radius;
    if (points === Infinity) {
      context.arc(0, 0, radius, 0, 2 * Math.PI);
    } else {
      const radius2 = this.radius2_ === void 0 ? radius : this.radius2_;
      if (this.radius2_ !== void 0) {
        points *= 2;
      }
      const startAngle = this.angle_ - Math.PI / 2;
      const step = 2 * Math.PI / points;
      for (let i = 0; i < points; i++) {
        const angle0 = startAngle + i * step;
        const radiusC = i % 2 === 0 ? radius : radius2;
        context.lineTo(radiusC * Math.cos(angle0), radiusC * Math.sin(angle0));
      }
      context.closePath();
    }
  }
  /**
   * @private
   * @param {RenderOptions} renderOptions Render options.
   * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} context The context.
   */
  drawHitDetectionCanvas_(renderOptions, context) {
    context.translate(renderOptions.size / 2, renderOptions.size / 2);
    this.createPath_(context);
    context.fillStyle = defaultFillStyle;
    context.fill();
    if (renderOptions.strokeStyle) {
      context.strokeStyle = renderOptions.strokeStyle;
      context.lineWidth = renderOptions.strokeWidth;
      if (renderOptions.lineDash) {
        context.setLineDash(renderOptions.lineDash);
        context.lineDashOffset = renderOptions.lineDashOffset;
      }
      context.lineJoin = renderOptions.lineJoin;
      context.miterLimit = renderOptions.miterLimit;
      context.stroke();
    }
  }
  /**
   * @override
   */
  ready() {
    return this.fill_ ? this.fill_.ready() : Promise.resolve();
  }
};
var RegularShape_default = RegularShape;

// node_modules/ol/style/Circle.js
var CircleStyle = class _CircleStyle extends RegularShape_default {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options ? options : { radius: 5 };
    super({
      points: Infinity,
      fill: options.fill,
      radius: options.radius,
      stroke: options.stroke,
      scale: options.scale !== void 0 ? options.scale : 1,
      rotation: options.rotation !== void 0 ? options.rotation : 0,
      rotateWithView: options.rotateWithView !== void 0 ? options.rotateWithView : false,
      displacement: options.displacement !== void 0 ? options.displacement : [0, 0],
      declutterMode: options.declutterMode
    });
  }
  /**
   * Clones the style.
   * @return {CircleStyle} The cloned style.
   * @api
   * @override
   */
  clone() {
    const scale2 = this.getScale();
    const style = new _CircleStyle({
      fill: this.getFill()?.clone(),
      stroke: this.getStroke()?.clone(),
      radius: this.getRadius(),
      scale: Array.isArray(scale2) ? scale2.slice() : scale2,
      rotation: this.getRotation(),
      rotateWithView: this.getRotateWithView(),
      displacement: this.getDisplacement().slice(),
      declutterMode: this.getDeclutterMode()
    });
    style.setOpacity(this.getOpacity());
    return style;
  }
};
var Circle_default = CircleStyle;

// node_modules/ol/style/Fill.js
var Fill = class _Fill {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options || {};
    this.patternImage_ = null;
    this.color_ = null;
    if (options.color !== void 0) {
      this.setColor(options.color);
    }
  }
  /**
   * Clones the style. The color is not cloned if it is a {@link module:ol/colorlike~ColorLike}.
   * @return {Fill} The cloned style.
   * @api
   */
  clone() {
    const color = this.getColor();
    return new _Fill({
      color: Array.isArray(color) ? color.slice() : color || void 0
    });
  }
  /**
   * Get the fill color.
   * @return {import("../color.js").Color|import("../colorlike.js").ColorLike|import('../colorlike.js').PatternDescriptor|null} Color.
   * @api
   */
  getColor() {
    return this.color_;
  }
  /**
   * Set the color.
   *
   * @param {import("../color.js").Color|import("../colorlike.js").ColorLike|import('../colorlike.js').PatternDescriptor|null} color Color.
   * @api
   */
  setColor(color) {
    if (color !== null && typeof color === "object" && "src" in color) {
      const patternImage = get4(
        null,
        color.src,
        { crossOrigin: "anonymous" },
        void 0,
        color.offset ? null : color.color ? color.color : null,
        !(color.offset && color.size)
      );
      patternImage.ready().then(() => {
        this.patternImage_ = null;
      });
      if (patternImage.getImageState() === ImageState_default.IDLE) {
        patternImage.load();
      }
      if (patternImage.getImageState() === ImageState_default.LOADING) {
        this.patternImage_ = patternImage;
      }
    }
    this.color_ = color;
  }
  /**
   * @return {string} Key of the fill for cache lookup.
   */
  getKey() {
    const fill = this.getColor();
    if (!fill) {
      return "";
    }
    return fill instanceof CanvasPattern || fill instanceof CanvasGradient ? getUid(
      /** @type {Object} */
      fill
    ) : typeof fill === "object" && "src" in fill ? fill.src + ":" + fill.offset : asArray(fill).toString();
  }
  /**
   * @return {boolean} The fill style is loading an image pattern.
   */
  loading() {
    return !!this.patternImage_;
  }
  /**
   * @return {Promise<void>} `false` or a promise that resolves when the style is ready to use.
   */
  ready() {
    return this.patternImage_ ? this.patternImage_.ready() : Promise.resolve();
  }
};
var Fill_default = Fill;

// node_modules/ol/style/Stroke.js
var Stroke = class _Stroke {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options || {};
    this.color_ = options.color !== void 0 ? options.color : null;
    this.lineCap_ = options.lineCap;
    this.lineDash_ = options.lineDash !== void 0 ? options.lineDash : null;
    this.lineDashOffset_ = options.lineDashOffset;
    this.lineJoin_ = options.lineJoin;
    this.miterLimit_ = options.miterLimit;
    this.offset_ = options.offset;
    this.width_ = options.width;
  }
  /**
   * Clones the style.
   * @return {Stroke} The cloned style.
   * @api
   */
  clone() {
    const color = this.getColor();
    return new _Stroke({
      color: Array.isArray(color) ? color.slice() : color || void 0,
      lineCap: this.getLineCap(),
      lineDash: this.getLineDash()?.slice(),
      lineDashOffset: this.getLineDashOffset(),
      lineJoin: this.getLineJoin(),
      miterLimit: this.getMiterLimit(),
      offset: this.getOffset(),
      width: this.getWidth()
    });
  }
  /**
   * Get the stroke color.
   * @return {import("../color.js").Color|import("../colorlike.js").ColorLike|null} Color.
   * @api
   */
  getColor() {
    return this.color_;
  }
  /**
   * Get the line cap type for the stroke.
   * @return {CanvasLineCap|undefined} Line cap.
   * @api
   */
  getLineCap() {
    return this.lineCap_;
  }
  /**
   * Get the line dash style for the stroke.
   * @return {Array<number>|null} Line dash.
   * @api
   */
  getLineDash() {
    return this.lineDash_;
  }
  /**
   * Get the line dash offset for the stroke.
   * @return {number|undefined} Line dash offset.
   * @api
   */
  getLineDashOffset() {
    return this.lineDashOffset_;
  }
  /**
   * Get the line join type for the stroke.
   * @return {CanvasLineJoin|undefined} Line join.
   * @api
   */
  getLineJoin() {
    return this.lineJoin_;
  }
  /**
   * Get the miter limit for the stroke.
   * @return {number|undefined} Miter limit.
   * @api
   */
  getMiterLimit() {
    return this.miterLimit_;
  }
  /**
   * Get the line offset in pixels.
   * @return {number|undefined} Offset.
   * @api
   */
  getOffset() {
    return this.offset_;
  }
  /**
   * Get the stroke width.
   * @return {number|undefined} Width.
   * @api
   */
  getWidth() {
    return this.width_;
  }
  /**
   * Set the color.
   *
   * @param {import("../color.js").Color|import("../colorlike.js").ColorLike} color Color.
   * @api
   */
  setColor(color) {
    this.color_ = color;
  }
  /**
   * Set the line cap.
   *
   * @param {CanvasLineCap|undefined} lineCap Line cap.
   * @api
   */
  setLineCap(lineCap) {
    this.lineCap_ = lineCap;
  }
  /**
   * Set the line dash.
   *
   * @param {Array<number>|null} lineDash Line dash.
   * @api
   */
  setLineDash(lineDash) {
    this.lineDash_ = lineDash;
  }
  /**
   * Set the line dash offset.
   *
   * @param {number|undefined} lineDashOffset Line dash offset.
   * @api
   */
  setLineDashOffset(lineDashOffset) {
    this.lineDashOffset_ = lineDashOffset;
  }
  /**
   * Set the line join.
   *
   * @param {CanvasLineJoin|undefined} lineJoin Line join.
   * @api
   */
  setLineJoin(lineJoin) {
    this.lineJoin_ = lineJoin;
  }
  /**
   * Set the miter limit.
   *
   * @param {number|undefined} miterLimit Miter limit.
   * @api
   */
  setMiterLimit(miterLimit) {
    this.miterLimit_ = miterLimit;
  }
  /**
   * Set the line offset in pixels.
   *
   * @param {number|undefined} offset Offset.
   * @api
   */
  setOffset(offset) {
    this.offset_ = offset;
  }
  /**
   * Set the width.
   *
   * @param {number|undefined} width Width.
   * @api
   */
  setWidth(width) {
    this.width_ = width;
  }
};
var Stroke_default = Stroke;

// node_modules/ol/style/Style.js
var Style = class _Style {
  /**
   * @param {Options} [options] Style options.
   */
  constructor(options) {
    options = options || {};
    this.geometry_ = null;
    this.geometryFunction_ = defaultGeometryFunction;
    if (options.geometry !== void 0) {
      this.setGeometry(options.geometry);
    }
    this.fill_ = options.fill !== void 0 ? options.fill : null;
    this.image_ = options.image !== void 0 ? options.image : null;
    this.renderer_ = options.renderer !== void 0 ? options.renderer : null;
    this.hitDetectionRenderer_ = options.hitDetectionRenderer !== void 0 ? options.hitDetectionRenderer : null;
    this.stroke_ = options.stroke !== void 0 ? options.stroke : null;
    this.text_ = options.text !== void 0 ? options.text : null;
    this.zIndex_ = options.zIndex;
  }
  /**
   * Clones the style.
   * @return {Style} The cloned style.
   * @api
   */
  clone() {
    let geometry = this.getGeometry();
    if (geometry && typeof geometry === "object") {
      geometry = /** @type {import("../geom/Geometry.js").default} */
      geometry.clone();
    }
    return new _Style({
      geometry: geometry ?? void 0,
      fill: this.getFill()?.clone(),
      image: this.getImage()?.clone(),
      renderer: this.getRenderer() ?? void 0,
      stroke: this.getStroke()?.clone(),
      text: this.getText()?.clone(),
      zIndex: this.getZIndex()
    });
  }
  /**
   * Get the custom renderer function that was configured with
   * {@link #setRenderer} or the `renderer` constructor option.
   * @return {RenderFunction|null} Custom renderer function.
   * @api
   */
  getRenderer() {
    return this.renderer_;
  }
  /**
   * Sets a custom renderer function for this style. When set, `fill`, `stroke`
   * and `image` options of the style will be ignored.
   * @param {RenderFunction|null} renderer Custom renderer function.
   * @api
   */
  setRenderer(renderer) {
    this.renderer_ = renderer;
  }
  /**
   * Sets a custom renderer function for this style used
   * in hit detection.
   * @param {RenderFunction|null} renderer Custom renderer function.
   * @api
   */
  setHitDetectionRenderer(renderer) {
    this.hitDetectionRenderer_ = renderer;
  }
  /**
   * Get the custom renderer function that was configured with
   * {@link #setHitDetectionRenderer} or the `hitDetectionRenderer` constructor option.
   * @return {RenderFunction|null} Custom renderer function.
   * @api
   */
  getHitDetectionRenderer() {
    return this.hitDetectionRenderer_;
  }
  /**
   * Get the geometry to be rendered.
   * @return {string|import("../geom/Geometry.js").default|GeometryFunction|null}
   * Feature property or geometry or function that returns the geometry that will
   * be rendered with this style.
   * @api
   */
  getGeometry() {
    return this.geometry_;
  }
  /**
   * Get the function used to generate a geometry for rendering.
   * @return {!GeometryFunction} Function that is called with a feature
   * and returns the geometry to render instead of the feature's geometry.
   * @api
   */
  getGeometryFunction() {
    return this.geometryFunction_;
  }
  /**
   * Get the fill style.
   * @return {import("./Fill.js").default|null} Fill style.
   * @api
   */
  getFill() {
    return this.fill_;
  }
  /**
   * Set the fill style.
   * @param {import("./Fill.js").default|null} fill Fill style.
   * @api
   */
  setFill(fill) {
    this.fill_ = fill;
  }
  /**
   * Get the image style.
   * @return {import("./Image.js").default|null} Image style.
   * @api
   */
  getImage() {
    return this.image_;
  }
  /**
   * Set the image style.
   * @param {import("./Image.js").default} image Image style.
   * @api
   */
  setImage(image) {
    this.image_ = image;
  }
  /**
   * Get the stroke style.
   * @return {import("./Stroke.js").default|null} Stroke style.
   * @api
   */
  getStroke() {
    return this.stroke_;
  }
  /**
   * Set the stroke style.
   * @param {import("./Stroke.js").default|null} stroke Stroke style.
   * @api
   */
  setStroke(stroke) {
    this.stroke_ = stroke;
  }
  /**
   * Get the text style.
   * @return {import("./Text.js").default|null} Text style.
   * @api
   */
  getText() {
    return this.text_;
  }
  /**
   * Set the text style.
   * @param {import("./Text.js").default|null} text Text style.
   * @api
   */
  setText(text) {
    this.text_ = text;
  }
  /**
   * Get the z-index for the style.
   * @return {number|undefined} ZIndex.
   * @api
   */
  getZIndex() {
    return this.zIndex_;
  }
  /**
   * Set a geometry that is rendered instead of the feature's geometry.
   *
   * @param {string|import("../geom/Geometry.js").default|GeometryFunction|null} geometry
   *     Feature property or geometry or function returning a geometry to render
   *     for this style.
   * @api
   */
  setGeometry(geometry) {
    if (typeof geometry === "function") {
      this.geometryFunction_ = geometry;
    } else if (typeof geometry === "string") {
      this.geometryFunction_ = function(feature) {
        return (
          /** @type {import("../geom/Geometry.js").default} */
          feature.get(geometry)
        );
      };
    } else if (!geometry) {
      this.geometryFunction_ = defaultGeometryFunction;
    } else if (geometry !== void 0) {
      this.geometryFunction_ = function() {
        return (
          /** @type {import("../geom/Geometry.js").default} */
          geometry
        );
      };
    }
    this.geometry_ = geometry;
  }
  /**
   * Set the z-index.
   *
   * @param {number|undefined} zIndex ZIndex.
   * @api
   */
  setZIndex(zIndex) {
    this.zIndex_ = zIndex;
  }
};
function defaultGeometryFunction(feature) {
  return feature.getGeometry();
}
var Style_default = Style;

// node_modules/ol/style/Text.js
var DEFAULT_FILL_COLOR = "#333";
var Text = class _Text {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options || {};
    this.font_ = options.font;
    this.rotation_ = options.rotation;
    this.rotateWithView_ = options.rotateWithView;
    this.keepUpright_ = options.keepUpright;
    this.scale_ = options.scale;
    this.scaleArray_ = toSize(options.scale !== void 0 ? options.scale : 1);
    this.text_ = options.text;
    this.textAlign_ = options.textAlign;
    this.justify_ = options.justify;
    this.repeat_ = options.repeat;
    this.textBaseline_ = options.textBaseline;
    this.fill_ = options.fill !== void 0 ? options.fill : new Fill_default({ color: DEFAULT_FILL_COLOR });
    this.maxAngle_ = options.maxAngle !== void 0 ? options.maxAngle : Math.PI / 4;
    this.placement_ = options.placement !== void 0 ? options.placement : "point";
    this.overflow_ = !!options.overflow;
    this.stroke_ = options.stroke !== void 0 ? options.stroke : null;
    this.offsetX_ = options.offsetX !== void 0 ? options.offsetX : 0;
    this.offsetY_ = options.offsetY !== void 0 ? options.offsetY : 0;
    this.backgroundFill_ = options.backgroundFill ? options.backgroundFill : null;
    this.backgroundStroke_ = options.backgroundStroke ? options.backgroundStroke : null;
    this.padding_ = options.padding === void 0 ? null : options.padding;
    this.declutterMode_ = options.declutterMode;
  }
  /**
   * Clones the style.
   * @return {Text} The cloned style.
   * @api
   */
  clone() {
    const scale2 = this.getScale();
    return new _Text({
      font: this.getFont(),
      placement: this.getPlacement(),
      repeat: this.getRepeat(),
      maxAngle: this.getMaxAngle(),
      overflow: this.getOverflow(),
      rotation: this.getRotation(),
      rotateWithView: this.getRotateWithView(),
      keepUpright: this.getKeepUpright(),
      scale: Array.isArray(scale2) ? scale2.slice() : scale2,
      text: this.getText(),
      textAlign: this.getTextAlign(),
      justify: this.getJustify(),
      textBaseline: this.getTextBaseline(),
      fill: this.getFill() instanceof Fill_default ? (
        /** @type {Fill} */
        this.getFill().clone()
      ) : this.getFill(),
      stroke: this.getStroke()?.clone(),
      offsetX: this.getOffsetX(),
      offsetY: this.getOffsetY(),
      backgroundFill: this.getBackgroundFill()?.clone(),
      backgroundStroke: this.getBackgroundStroke()?.clone(),
      padding: this.getPadding() || void 0,
      declutterMode: this.getDeclutterMode()
    });
  }
  /**
   * Get the `overflow` configuration.
   * @return {boolean} Let text overflow the length of the path they follow.
   * @api
   */
  getOverflow() {
    return this.overflow_;
  }
  /**
   * Get the font name.
   * @return {string|undefined} Font.
   * @api
   */
  getFont() {
    return this.font_;
  }
  /**
   * Get the maximum angle between adjacent characters.
   * @return {number} Angle in radians.
   * @api
   */
  getMaxAngle() {
    return this.maxAngle_;
  }
  /**
   * Get the label placement.
   * @return {TextPlacement} Text placement.
   * @api
   */
  getPlacement() {
    return this.placement_;
  }
  /**
   * Get the repeat interval of the text.
   * @return {number|undefined} Repeat interval in pixels.
   * @api
   */
  getRepeat() {
    return this.repeat_;
  }
  /**
   * Get the x-offset for the text.
   * @return {number} Horizontal text offset.
   * @api
   */
  getOffsetX() {
    return this.offsetX_;
  }
  /**
   * Get the y-offset for the text.
   * @return {number} Vertical text offset.
   * @api
   */
  getOffsetY() {
    return this.offsetY_;
  }
  /**
   * Get the fill style for the text.
   * @return {import("./Fill.js").default|null} Fill style.
   * @api
   */
  getFill() {
    return this.fill_;
  }
  /**
   * Determine whether the text rotates with the map.
   * @return {boolean|undefined} Rotate with map.
   * @api
   */
  getRotateWithView() {
    return this.rotateWithView_;
  }
  /**
   * Determine whether the text can be rendered upside down.
   * @return {boolean|undefined} Keep text upright.
   * @api
   */
  getKeepUpright() {
    return this.keepUpright_;
  }
  /**
   * Get the text rotation.
   * @return {number|undefined} Rotation.
   * @api
   */
  getRotation() {
    return this.rotation_;
  }
  /**
   * Get the text scale.
   * @return {number|import("../size.js").Size|undefined} Scale.
   * @api
   */
  getScale() {
    return this.scale_;
  }
  /**
   * Get the symbolizer scale array.
   * @return {import("../size.js").Size} Scale array.
   */
  getScaleArray() {
    return this.scaleArray_;
  }
  /**
   * Get the stroke style for the text.
   * @return {import("./Stroke.js").default|null} Stroke style.
   * @api
   */
  getStroke() {
    return this.stroke_;
  }
  /**
   * Get the text to be rendered.
   * @return {string|Array<string>|undefined} Text.
   * @api
   */
  getText() {
    return this.text_;
  }
  /**
   * Get the text alignment.
   * @return {CanvasTextAlign|undefined} Text align.
   * @api
   */
  getTextAlign() {
    return this.textAlign_;
  }
  /**
   * Get the justification.
   * @return {TextJustify|undefined} Justification.
   * @api
   */
  getJustify() {
    return this.justify_;
  }
  /**
   * Get the text baseline.
   * @return {CanvasTextBaseline|undefined} Text baseline.
   * @api
   */
  getTextBaseline() {
    return this.textBaseline_;
  }
  /**
   * Get the background fill style for the text.
   * @return {import("./Fill.js").default|null} Fill style.
   * @api
   */
  getBackgroundFill() {
    return this.backgroundFill_;
  }
  /**
   * Get the background stroke style for the text.
   * @return {import("./Stroke.js").default|null} Stroke style.
   * @api
   */
  getBackgroundStroke() {
    return this.backgroundStroke_;
  }
  /**
   * Get the padding for the text.
   * @return {Array<number>|null} Padding.
   * @api
   */
  getPadding() {
    return this.padding_;
  }
  /**
   * Get the declutter mode of the shape
   * @return {import("./Style.js").DeclutterMode|undefined} Shape's declutter mode
   * @api
   */
  getDeclutterMode() {
    return this.declutterMode_;
  }
  /**
   * Set the `overflow` property.
   *
   * @param {boolean} overflow Let text overflow the path that it follows.
   * @api
   */
  setOverflow(overflow) {
    this.overflow_ = overflow;
  }
  /**
   * Set the font.
   *
   * @param {string|undefined} font Font.
   * @api
   */
  setFont(font) {
    this.font_ = font;
  }
  /**
   * Set the maximum angle between adjacent characters.
   *
   * @param {number} maxAngle Angle in radians.
   * @api
   */
  setMaxAngle(maxAngle) {
    this.maxAngle_ = maxAngle;
  }
  /**
   * Set the x offset.
   *
   * @param {number} offsetX Horizontal text offset.
   * @api
   */
  setOffsetX(offsetX) {
    this.offsetX_ = offsetX;
  }
  /**
   * Set the y offset.
   *
   * @param {number} offsetY Vertical text offset.
   * @api
   */
  setOffsetY(offsetY) {
    this.offsetY_ = offsetY;
  }
  /**
   * Set the text placement.
   *
   * @param {TextPlacement} placement Placement.
   * @api
   */
  setPlacement(placement) {
    this.placement_ = placement;
  }
  /**
   * Set the repeat interval of the text.
   * @param {number|undefined} [repeat] Repeat interval in pixels.
   * @api
   */
  setRepeat(repeat) {
    this.repeat_ = repeat;
  }
  /**
   * Set whether to rotate the text with the view.
   *
   * @param {boolean} rotateWithView Rotate with map.
   * @api
   */
  setRotateWithView(rotateWithView) {
    this.rotateWithView_ = rotateWithView;
  }
  /**
   * Set whether the text can be rendered upside down.
   *
   * @param {boolean} keepUpright Keep text upright.
   * @api
   */
  setKeepUpright(keepUpright) {
    this.keepUpright_ = keepUpright;
  }
  /**
   * Set the fill.
   *
   * @param {import("./Fill.js").default|null} fill Fill style.
   * @api
   */
  setFill(fill) {
    this.fill_ = fill;
  }
  /**
   * Set the rotation.
   *
   * @param {number|undefined} rotation Rotation.
   * @api
   */
  setRotation(rotation) {
    this.rotation_ = rotation;
  }
  /**
   * Set the scale.
   *
   * @param {number|import("../size.js").Size|undefined} scale Scale.
   * @api
   */
  setScale(scale2) {
    this.scale_ = scale2;
    this.scaleArray_ = toSize(scale2 !== void 0 ? scale2 : 1);
  }
  /**
   * Set the stroke.
   *
   * @param {import("./Stroke.js").default|null} stroke Stroke style.
   * @api
   */
  setStroke(stroke) {
    this.stroke_ = stroke;
  }
  /**
   * Set the text.
   *
   * @param {string|Array<string>|undefined} text Text.
   * @api
   */
  setText(text) {
    this.text_ = text;
  }
  /**
   * Set the text alignment.
   *
   * @param {CanvasTextAlign|undefined} textAlign Text align.
   * @api
   */
  setTextAlign(textAlign) {
    this.textAlign_ = textAlign;
  }
  /**
   * Set the justification.
   *
   * @param {TextJustify|undefined} justify Justification.
   * @api
   */
  setJustify(justify) {
    this.justify_ = justify;
  }
  /**
   * Set the text baseline.
   *
   * @param {CanvasTextBaseline|undefined} textBaseline Text baseline.
   * @api
   */
  setTextBaseline(textBaseline) {
    this.textBaseline_ = textBaseline;
  }
  /**
   * Set the background fill.
   *
   * @param {import("./Fill.js").default|null} fill Fill style.
   * @api
   */
  setBackgroundFill(fill) {
    this.backgroundFill_ = fill;
  }
  /**
   * Set the background stroke.
   *
   * @param {import("./Stroke.js").default|null} stroke Stroke style.
   * @api
   */
  setBackgroundStroke(stroke) {
    this.backgroundStroke_ = stroke;
  }
  /**
   * Set the padding (`[top, right, bottom, left]`).
   *
   * @param {Array<number>|null} padding Padding.
   * @api
   */
  setPadding(padding) {
    this.padding_ = padding;
  }
};
var Text_default = Text;

// node_modules/ol/interaction/Draw.js
function createBox() {
  return function(coordinates2, geometry, projection) {
    const extent = boundingExtent(
      /** @type {LineCoordType} */
      [
        coordinates2[0],
        coordinates2[coordinates2.length - 1]
      ].map(function(coordinate) {
        return fromUserCoordinate(coordinate, projection);
      })
    );
    const boxCoordinates = [
      [
        getBottomLeft(extent),
        getBottomRight(extent),
        getTopRight(extent),
        getTopLeft(extent),
        getBottomLeft(extent)
      ]
    ];
    if (geometry) {
      geometry.setCoordinates(boxCoordinates);
    } else {
      geometry = new Polygon_default(boxCoordinates);
    }
    const userProjection2 = getUserProjection();
    if (userProjection2) {
      geometry.transform(projection, userProjection2);
    }
    return geometry;
  };
}

// src/lib/geo.ts
var R2 = 63710088e-1;
var rad = (d) => d * Math.PI / 180;
var deg = (r) => r * 180 / Math.PI;
function toOl(g) {
  if (g.type === "Point") return new Point_default(fromLonLat2(g.coordinates));
  if (g.type === "LineString") return new LineString_default(g.coordinates.map((c) => fromLonLat2(c)));
  return new Polygon_default(g.coordinates.map((r) => r.map((c) => fromLonLat2(c))));
}
var r6 = (c) => [Math.round(c[0] * 1e7) / 1e7, Math.round(c[1] * 1e7) / 1e7];
function fromOl(g) {
  if (g instanceof Point_default) return { type: "Point", coordinates: r6(toLonLat2(g.getCoordinates())) };
  if (g instanceof LineString_default) return { type: "LineString", coordinates: g.getCoordinates().map((c) => r6(toLonLat2(c))) };
  if (g instanceof Polygon_default) return { type: "Polygon", coordinates: g.getCoordinates().map((r) => r.map((c) => r6(toLonLat2(c)))) };
  throw new Error("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB3C4\uD615");
}
var areaM2 = (g) => g.type === "Polygon" ? Math.round(getArea(toOl(g)) * 10) / 10 : 0;
var lengthM = (g) => g.type === "LineString" ? Math.round(getLength(toOl(g)) * 10) / 10 : 0;
var distM = (a, b) => getDistance(a, b);
function measured(kind, g, p) {
  if (g.type === "Polygon") return { ...p, areaM2: areaM2(g) };
  if (g.type === "LineString" && (kind === "path" || kind === "water-flow")) return { ...p, lengthM: lengthM(g) };
  return p;
}
function dest([lon, lat], bearingDeg, m) {
  const d = m / R2, b = rad(bearingDeg), p1 = rad(lat), l1 = rad(lon);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [deg(l2), deg(p2)];
}
function circle(c, m, n = 48) {
  const ring = Array.from({ length: n }, (_, i) => dest(c, 360 * i / n, m));
  return [...ring, ring[0]];
}
function sectorPoly(c, fromDeg, toDeg, m) {
  let span = ((toDeg - fromDeg) % 360 + 360) % 360;
  if (span === 0) span = 360;
  const steps = Math.max(4, Math.round(span / 5));
  const arc = Array.from({ length: steps + 1 }, (_, i) => dest(c, fromDeg + span * i / steps, m));
  return [c, ...arc, c];
}
function centroid(g) {
  if (g.type === "Point") return g.coordinates;
  const pts = g.type === "Polygon" ? g.coordinates[0].slice(0, -1) : g.coordinates;
  const s = pts.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
  return [s[0] / pts.length, s[1] / pts.length];
}
var fmtM2 = (v) => v == null ? "-" : `${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} \u33A1`;
var fmtM = (v) => v == null ? "-" : `${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} m`;
var compass8 = (d) => ["\uBD81", "\uBD81\uB3D9", "\uB3D9", "\uB0A8\uB3D9", "\uB0A8", "\uB0A8\uC11C", "\uC11C", "\uBD81\uC11C"][Math.round((d % 360 + 360) % 360 / 45) % 8];

// src/lib/shapes.ts
function circlePolygon(center2, radiusM) {
  return { type: "Polygon", coordinates: [circle(center2, radiusM, 96)] };
}
function smoothPolygon(poly) {
  const rings = poly.getCoordinates().map((ring) => {
    let points = ring.slice(0, -1);
    for (let pass = 0; pass < 2; pass++) {
      const next = [];
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      });
      points = next;
    }
    return [...points, points[0]];
  });
  return new Polygon_default(rings);
}
function finishPolygon(poly, mode, tolerance) {
  const simplified = mode === "freehand" ? new Polygon_default(poly.getCoordinates().map((ring) => {
    const line = new LineString_default(ring).simplify(tolerance);
    const reduced = line instanceof LineString_default ? line.getCoordinates() : ring;
    return reduced.length >= 4 ? reduced : ring;
  })) : poly;
  const candidate = simplified instanceof Polygon_default && simplified.getArea() > 0 ? simplified : poly;
  return mode === "smooth" ? smoothPolygon(candidate) : candidate;
}
function editedShape(shape, geometry, operation, delta) {
  if (!shape) return void 0;
  if (operation === "modify") return { mode: "polygon" };
  if (shape.mode !== "circle" || geometry.type !== "Polygon") return shape;
  return { ...shape, center: [shape.center[0] + delta[0], shape.center[1] + delta[1]] };
}
function drawnCircle(center2, edge) {
  const radiusM = distM(center2, edge);
  return { geometry: circlePolygon(center2, radiusM), shape: { mode: "circle", center: center2, radiusM } };
}

// src/lib/featureEdits.ts
function moveFeature(fs, id, geometry, wholeGuild, operation) {
  const target = fs.find((f) => f.id === id);
  if (!target) return fs;
  if (JSON.stringify(target.geometry) === JSON.stringify(geometry)) return fs;
  const [ox, oy] = centroid(target.geometry), [nx, ny] = centroid(geometry);
  const delta = [nx - ox, ny - oy];
  return fs.map((f) => {
    if (f.id === id) return {
      ...f,
      geometry,
      props: measured(f.kind, geometry, { ...f.props, shape: editedShape(f.props.shape, geometry, operation, delta) })
    };
    if (wholeGuild && operation === "translate" && target.props.guildId && f.props.guildId === target.props.guildId && f.geometry.type === "Point") {
      return { ...f, geometry: { type: "Point", coordinates: [f.geometry.coordinates[0] + delta[0], f.geometry.coordinates[1] + delta[1]] } };
    }
    return f;
  });
}

// src/lib/storage.ts
import localforage from "localforage";
var store = localforage.createInstance({ name: "permaculture-garden", storeName: "autosave" });
function parseGardenFile(text) {
  const f = JSON.parse(text);
  if (f?.schemaVersion !== 1 || !f.meta || !f.place) throw new Error("\uC815\uC6D0 \uD30C\uC77C \uD615\uC2DD\uC774 \uC544\uB2C8\uC5D0\uC694.");
  if (!f.meta.purpose && f.meta.notes) f.meta.purpose = f.meta.notes;
  f.features ??= [];
  return f;
}

// src/lib/history.ts
var History = class {
  constructor(limit = 100) {
    this.limit = limit;
  }
  past = [];
  future = [];
  push(prev) {
    this.past.push(prev);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(cur) {
    const p = this.past.pop();
    if (!p) return null;
    this.future.push(cur);
    return p;
  }
  redo(cur) {
    const n = this.future.pop();
    if (!n) return null;
    this.past.push(cur);
    return n;
  }
  clear() {
    this.past = [];
    this.future = [];
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
};

// src/map/permacultureLayers.ts
function drawingBearing(trueBearing, northDeg) {
  return ((trueBearing - northDeg) % 360 + 360) % 360;
}
function shadeFans(features, direction, altitude) {
  if (altitude <= 1) return [];
  return features.flatMap((tree2) => {
    if (tree2.kind !== "tree" || tree2.geometry.type !== "Point" || !tree2.props.heightM || tree2.props.canopyM == null) return [];
    const reach = Math.min(200, tree2.props.heightM / Math.tan(altitude * Math.PI / 180) + tree2.props.canopyM);
    return [{ okind: "shade", label: "\uADF8\uB298 \uC608\uC2DC \xB7 \uC815\uBC00 \uC2DC\uBBAC\uB808\uC774\uC158 \uC544\uB2D8", geometry: { type: "Polygon", coordinates: [sectorPoly(tree2.geometry.coordinates, direction - 20, direction + 20, reach)] } }];
  });
}

// src/lib/sun.ts
import SunCalc from "suncalc";
var toCompass = (azRad) => (azRad * 180 / Math.PI + 180 + 360) % 360;
var altDeg = (r) => r * 180 / Math.PI;
function sunPos(date, lat, lon) {
  const p = SunCalc.getPosition(date, lat, lon);
  return { altitude: altDeg(p.altitude), azimuth: toCompass(p.azimuth) };
}
function daySun(date, lat, lon) {
  const t = SunCalc.getTimes(date, lat, lon);
  return {
    date,
    sunrise: t.sunrise,
    sunset: t.sunset,
    noon: t.solarNoon,
    dayLenH: (t.sunset.getTime() - t.sunrise.getTime()) / 36e5,
    noonAlt: sunPos(t.solarNoon, lat, lon).altitude,
    riseAz: sunPos(t.sunrise, lat, lon).azimuth,
    setAz: sunPos(t.sunset, lat, lon).azimuth
  };
}

// src/lib/analysis.ts
function analysisCenter(file2) {
  const house = file2.features.find((f) => f.kind === "house");
  if (house) return { pt: centroid(house.geometry), from: "\uC9D1(\uAE30\uC900\uC810)" };
  const b = file2.features.find((f) => f.kind === "boundary");
  if (b) return { pt: centroid(b.geometry), from: "\uACBD\uACC4 \uC911\uC2EC" };
  return { pt: [file2.place.center.lon, file2.place.center.lat], from: "\uC9C0\uB3C4 \uC911\uC2EC" };
}
var defaultDate = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
function analysisDate(a) {
  const [y, m, d] = (a?.date ?? defaultDate()).split("-").map(Number);
  const h = a?.hour ?? 12;
  return new Date(y, m - 1, d, Math.floor(h), Math.round(h % 1 * 60));
}
function buildOverlays(file2, climate, noise, slope) {
  const a = file2.analysis ?? {}, ov = a.overlays ?? {};
  const { pt: c } = analysisCenter(file2);
  const out = [];
  const when = analysisDate(a);
  const sp = sunPos(when, c[1], c[0]);
  if (ov.sun) {
    const ds = daySun(when, c[1], c[0]);
    out.push({ okind: "sunrise", geometry: { type: "LineString", coordinates: [c, dest(c, drawingBearing(ds.riseAz, file2.meta.northDeg), 45)] }, label: `\uC77C\uCD9C ${Math.round(ds.riseAz)}\xB0` });
    out.push({ okind: "sunset", geometry: { type: "LineString", coordinates: [c, dest(c, drawingBearing(ds.setAz, file2.meta.northDeg), 45)] }, label: `\uC77C\uBAB0 ${Math.round(ds.setAz)}\xB0` });
    if (sp.altitude > 0) out.push({ okind: "sun", geometry: { type: "LineString", coordinates: [dest(c, drawingBearing(sp.azimuth, file2.meta.northDeg), 55), c] }, label: `\uD574 \uC785\uC0AC (\uC608\uC2DC) ${Math.round(sp.azimuth)}\xB0 \uACE0\uB3C4 ${Math.round(sp.altitude)}\xB0` });
  }
  if (ov.shade) out.push(...shadeFans(file2.features, drawingBearing(sp.azimuth + 180, file2.meta.northDeg), sp.altitude));
  if (ov.wind && climate) {
    for (const w of climate.wind) {
      if (w.pct <= 0) continue;
      out.push({ okind: "wind", geometry: { type: "Polygon", coordinates: [sectorPoly(c, w.deg - 18, w.deg + 18, 8 + w.pct * 1.6)] }, label: w.pct >= 10 ? `${w.dir} ${w.pct}%` : void 0 });
    }
  }
  if (ov.noise && noise) {
    for (const r of noise.roads) out.push({ okind: "road", geometry: { type: "LineString", coordinates: r.coords } });
    for (const m of [50, 150, 300]) out.push({ okind: "noise-ring", geometry: { type: "LineString", coordinates: circle(c, m, 72) }, label: `${m}m` });
  }
  if (ov.slope && slope) {
    out.push({ okind: "slope", geometry: { type: "LineString", coordinates: [c, dest(c, slope.downhillDeg, 60)] }, label: `\uB0B4\uB9AC\uB9C9 ${compass8(slope.downhillDeg)} \xB7 \uACBD\uC0AC ${slope.slopePct}% (\uCD94\uC815)` });
    out.push({ okind: "swale", geometry: { type: "LineString", coordinates: [dest(c, slope.downhillDeg - 90, 35), dest(c, slope.downhillDeg + 90, 35)] }, label: "\uC2A4\uC6E8\uC77C \uD6C4\uBCF4 (\uB4F1\uACE0\uC120 \uBC29\uD5A5, \uCD94\uC815)" });
  }
  return out;
}

// src/map/drawTools.ts
var KIND_LABEL = {
  boundary: "\uACBD\uACC4",
  zone: "\uAD6C\uC5ED",
  bed: "\uD143\uBC2D",
  pond: "\uC5F0\uBABB",
  tree: "\uB098\uBB34",
  path: "\uAE38",
  house: "\uC9D1(\uAE30\uC900\uC810)",
  micro: "\uBBF8\uAE30\uD6C4",
  plant: "\uC2DD\uBB3C",
  sector: "\uC139\uD130",
  "water-flow": "\uBB3C\uD750\uB984",
  wind: "\uBC14\uB78C",
  sun: "\uD574"
};
var ZONE_COLORS = ["#e53935", "#fb8c00", "#fdd835", "#7cb342", "#00897b", "#5e35b1"];
var DEFAULT_COLOR = {
  boundary: "#ffeb3b",
  bed: "#a1662f",
  pond: "#1e88e5",
  tree: "#2e7d32",
  path: "#d7b98e",
  house: "#c62828",
  plant: "#66bb6a",
  sector: "#ff7043",
  "water-flow": "#29b6f6"
};
var MICRO = {
  sunny: { label: "\uC591\uC9C0", icon: "\u2600", color: "#ffb300" },
  shade: { label: "\uADF8\uB298", icon: "\u25D0", color: "#546e7a" },
  frost: { label: "\uC11C\uB9AC\xB7\uB0C9\uAE30 \uACE0\uC784", icon: "\u2744", color: "#4fc3f7" },
  windy: { label: "\uBC14\uB78C \uAC15\uD568", icon: "\u224B", color: "#90a4ae" },
  wet: { label: "\uC2B5\uD568", icon: "\u2248", color: "#0288d1" },
  dry: { label: "\uAC74\uC870", icon: "\u25B2", color: "#bf8f3e" }
};
var colorOf = (kind, p) => p.color || (kind === "zone" ? ZONE_COLORS[p.zone ?? 1] : DEFAULT_COLOR[kind] ?? "#ff7043");
var hexA = (hex, a) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};
var label = (text, opts = {}) => new Text_default({
  text,
  font: "600 12px Pretendard, 'Noto Sans KR', sans-serif",
  fill: new Fill_default({ color: "#fff" }),
  stroke: new Stroke_default({ color: "rgba(0,0,0,.75)", width: 3 }),
  overflow: true,
  ...opts
});
function mToPx(m, resolution, coord) {
  return m / getPointResolution("EPSG:3857", resolution, coord);
}
function featureStyle(f, resolution, selected) {
  const kind = f.get("kind");
  const p = f.get("props") ?? {};
  const geom = f.getGeometry();
  const c = colorOf(kind, p);
  if (kind === "tree" && geom instanceof Point_default) {
    const xy = geom.getCoordinates();
    const r = p.canopyM == null ? 5 : Math.max(4, mToPx(p.canopyM, resolution, xy));
    return [new Style_default({
      image: new Circle_default({ radius: r, fill: new Fill_default({ color: hexA(c, 0.45) }), stroke: new Stroke_default({ color: selected ? "#fff" : c, width: selected ? 3 : 2 }) }),
      text: label(`${p.label || "\uB098\uBB34"}${p.heightM ? ` ${p.heightM}m` : ""}`, { offsetY: r + 10 }),
      zIndex: 5
    }), new Style_default({ image: new Circle_default({ radius: 2.5, fill: new Fill_default({ color: "#3e2723" }) }), zIndex: 6 })];
  }
  if (kind === "plant" && geom instanceof Point_default) {
    return [new Style_default({
      image: new Circle_default({ radius: 6, fill: new Fill_default({ color: hexA(c, 0.9) }), stroke: new Stroke_default({ color: selected ? "#fff" : "#1b5e20", width: selected ? 3 : 1.5 }) }),
      text: resolution < 0.07 ? label(p.label || p.role || "", { offsetY: 14, font: "11px sans-serif" }) : void 0,
      zIndex: 7
    })];
  }
  if (kind === "house" && geom instanceof Point_default) {
    return [new Style_default({
      image: new RegularShape_default({ points: 4, radius: 12, angle: Math.PI / 4, fill: new Fill_default({ color: c }), stroke: new Stroke_default({ color: "#fff", width: selected ? 4 : 2 }) }),
      text: label(p.name || "\uC9D1", { offsetY: 22 }),
      zIndex: 8
    })];
  }
  if (kind === "micro" && geom instanceof Point_default) {
    const m = MICRO[p.microType ?? "sunny"];
    return [new Style_default({
      image: new Circle_default({ radius: 13, fill: new Fill_default({ color: hexA(m.color, 0.9) }), stroke: new Stroke_default({ color: "#fff", width: selected ? 4 : 2 }) }),
      text: new Text_default({ text: m.icon, font: "15px sans-serif", fill: new Fill_default({ color: "#fff" }) }),
      zIndex: 8
    }), new Style_default({ text: label(p.name || m.label, { offsetY: 24, font: "11px sans-serif" }), zIndex: 8 })];
  }
  if (geom instanceof LineString_default) {
    const w = kind === "path" ? Math.max(3, mToPx(p.widthM ?? 1, resolution, geom.getCoordinateAt(0.5))) : 3;
    const out = [];
    if (selected) out.push(new Style_default({ stroke: new Stroke_default({ color: "#fff", width: w + 5 }), zIndex: 2.9 }));
    out.push(new Style_default({
      stroke: new Stroke_default({ color: hexA(c, 0.92), width: w, lineCap: "round", lineJoin: "round" }),
      text: label(`${p.name ? p.name + " " : ""}${fmtM(p.lengthM)}${p.widthM ? ` \xB7 \uD3ED ${p.widthM}m` : ""}`, { placement: "line" }),
      zIndex: 3
    }));
    if (kind === "water-flow") {
      const end = geom.getLastCoordinate(), start = geom.getCoordinates().at(-2);
      if (start) out.push(new Style_default({ geometry: new Point_default(end), image: new RegularShape_default({ points: 3, radius: 10, rotation: Math.PI / 2 - Math.atan2(end[1] - start[1], end[0] - start[0]), fill: new Fill_default({ color: c }) }), zIndex: 4 }));
    }
    return out;
  }
  if (geom instanceof Polygon_default) {
    const isB = kind === "boundary", isS = kind === "sector";
    const fillA = isB ? 0.05 : kind === "zone" ? 0.22 : isS ? 0.18 : 0.45;
    const name = kind === "zone" ? `Zone ${p.zone ?? "?"}${p.name ? ` ${p.name}` : ""}` : isS ? p.label || p.name || "\uC139\uD130" : p.name || KIND_LABEL[kind];
    const out = [];
    if (selected) out.push(new Style_default({ stroke: new Stroke_default({ color: "#fff", width: 6 }), zIndex: 9 }));
    out.push(new Style_default({
      stroke: new Stroke_default({ color: c, width: isB ? 3 : 2, lineDash: isB ? [10, 6] : isS ? [6, 4] : void 0 }),
      fill: new Fill_default({ color: hexA(c, fillA) }),
      text: label(isS ? name : `${name}
${fmtM2(p.areaM2)}`),
      zIndex: isB ? 1 : kind === "zone" ? 1.5 : isS ? 0.5 : 2
    }));
    return out;
  }
  return [new Style_default({ stroke: new Stroke_default({ color: c, width: 2 }) })];
}

// src/ui/PlantPicker.tsx
import { useState } from "react";
import { Search } from "lucide-react";

// src/lib/guilds.ts
var FIELD_KO = {
  height_m: "\uB192\uC774",
  width_m: "\uD3ED",
  hardiness: "\uB0B4\uD55C\uC131",
  region: "\uC9C0\uC5ED",
  spacing_m: "\uAC04\uACA9",
  sun: "\uD587\uBE5B",
  functions: "\uAE30\uB2A5",
  layer: "\uCE35\uC704",
  members: "\uAD6C\uC131",
  ring_m: "\uAC70\uB9AC",
  count_hint: "\uAC1C\uC218"
};
var fmtNum = (v, unit) => v == null ? "\uC815\uBCF4 \uC5C6\uC74C" : `${v}${unit}`;

// src/ui/PropertyPanel.tsx
import { X } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var Est = ({ on }) => on ? /* @__PURE__ */ jsx("span", { className: "est", title: "\uC790\uB8CC\uC5D0\uC11C \uCD94\uC815\uAC12\uC73C\uB85C \uD45C\uC2DC\uB41C \uD56D\uBAA9", children: "\uCD94\uC815" }) : null;
function PlantCard({ pl }) {
  const e = (k) => pl.estimated.includes(k);
  return /* @__PURE__ */ jsxs("div", { className: "plant-card", children: [
    /* @__PURE__ */ jsx("b", { children: pl.ko }),
    " ",
    /* @__PURE__ */ jsx("i", { children: pl.sci }),
    /* @__PURE__ */ jsxs("div", { children: [
      "\uCE35\uC704: ",
      pl.layer,
      " \xB7 \uC9C0\uC5ED: ",
      pl.region,
      " ",
      /* @__PURE__ */ jsx(Est, { on: e("region") })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      "\uB192\uC774 ",
      fmtNum(pl.height_m, "m"),
      " ",
      /* @__PURE__ */ jsx(Est, { on: e("height_m") }),
      " \xB7 \uD3ED ",
      fmtNum(pl.width_m, "m"),
      " ",
      /* @__PURE__ */ jsx(Est, { on: e("width_m") })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      "\uAC04\uACA9 ",
      fmtNum(pl.spacing_m, "m"),
      " ",
      /* @__PURE__ */ jsx(Est, { on: e("spacing_m") }),
      " \xB7 \uD587\uBE5B ",
      pl.sun.join("/") || "\uC815\uBCF4 \uC5C6\uC74C",
      " ",
      /* @__PURE__ */ jsx(Est, { on: e("sun") })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      "\uB0B4\uD55C\uC131 ",
      pl.hardiness ?? "\uC815\uBCF4 \uC5C6\uC74C",
      " ",
      /* @__PURE__ */ jsx(Est, { on: e("hardiness") }),
      " ",
      /* @__PURE__ */ jsx("small", { children: "(PFAF UK zone, USDA \uC544\uB2D8)" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      "\uAE30\uB2A5: ",
      pl.functions.join(", "),
      " ",
      /* @__PURE__ */ jsx(Est, { on: e("functions") })
    ] }),
    pl.estimated.length > 0 && /* @__PURE__ */ jsxs("small", { className: "dim", children: [
      "\uCD94\uC815 \uD56D\uBAA9: ",
      pl.estimated.map((k) => FIELD_KO[k] ?? k).join(", ")
    ] }),
    /* @__PURE__ */ jsxs("details", { children: [
      /* @__PURE__ */ jsx("summary", { children: "\uCD9C\uCC98" }),
      /* @__PURE__ */ jsx("ul", { children: pl.sources.map((s) => /* @__PURE__ */ jsx("li", { children: s }, s)) })
    ] })
  ] });
}

// src/ui/PlantPicker.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function matchingPlants(plants, query) {
  return plants.filter((p) => p.ko.replace(/\s/g, "").includes(query.replace(/\s/g, "")));
}
function plantingProps(plant) {
  return plant ? { plantId: plant.id, label: plant.ko, canopyM: plant.width_m == null ? void 0 : plant.width_m / 2, heightM: plant.height_m ?? void 0 } : { canopyM: 2, heightM: 4 };
}
function PlantPicker({ plants, selectedId, onPick }) {
  const [query, setQuery] = useState("");
  const selected = plants.find((p) => p.id === selectedId);
  const matches = matchingPlants(plants, query);
  return /* @__PURE__ */ jsxs2("section", { className: "plant-picker", "aria-label": "\uC2DD\uBB3C \uC120\uD0DD", children: [
    /* @__PURE__ */ jsxs2("h3", { children: [
      "\uB098\uBB34\xB7\uC2DD\uBB3C \uC120\uD0DD ",
      /* @__PURE__ */ jsxs2("small", { children: [
        plants.length,
        "\uC885"
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("label", { className: "plant-search", children: [
      /* @__PURE__ */ jsx2(Search, { size: 16 }),
      /* @__PURE__ */ jsx2("input", { "aria-label": "\uD55C\uAD6D \uC774\uB984 \uAC80\uC0C9", placeholder: "\uD55C\uAD6D \uC774\uB984 \uAC80\uC0C9", value: query, onChange: (e) => setQuery(e.target.value) })
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "plant-options", role: "group", "aria-label": "\uC2DD\uBB3C \uBAA9\uB85D", children: [
      /* @__PURE__ */ jsx2("button", { type: "button", "aria-pressed": !selectedId, onClick: () => onPick(""), children: "\uC9C1\uC811 \uC785\uB825 (\uBC18\uACBD 2m\xB7\uB192\uC774 4m \uC784\uC2DC\uAC12)" }),
      matches.map((p) => /* @__PURE__ */ jsxs2("button", { type: "button", "aria-pressed": selectedId === p.id, onClick: () => onPick(p.id), children: [
        /* @__PURE__ */ jsx2("b", { children: p.ko }),
        " \xB7 \uD3ED ",
        fmtNum(p.width_m, "m"),
        " ",
        p.estimated.length > 0 && /* @__PURE__ */ jsx2("span", { className: "est", children: "\uCD94\uC815" }),
        p.region.includes("\uB0A8\uBD80") && /* @__PURE__ */ jsx2("span", { className: "tag south", children: "\uB0A8\uBD80\uD615" })
      ] }, p.id)),
      !matches.length && /* @__PURE__ */ jsx2("p", { children: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC5B4\uC694" })
    ] }),
    selected && /* @__PURE__ */ jsx2(PlantCard, { pl: selected }),
    /* @__PURE__ */ jsx2("p", { className: "hint", children: "\uC2DD\uBB3C \uC120\uD0DD \uD6C4 \uC9C0\uB3C4 \uD074\uB9AD \xB7 \uC218\uAD00 \uBC18\uACBD = \uC790\uB8CC \uD3ED \xF7 2. \uD3ED\uC774 \uC5C6\uC73C\uBA74 \uC791\uC740 \uD45C\uC2DD\uC73C\uB85C\uB9CC \uD45C\uC2DC\uD558\uBA70 \uD604\uC7A5 \uD655\uC778\uC774 \uD544\uC694\uD574\uC694." })
  ] });
}

// src/ui/ShapePicker.tsx
import { Circle, Pentagon, Square, Pencil, Spline } from "lucide-react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var SHAPES = [
  ["polygon", Pentagon, "\uB2E4\uAC01\uD615", "\uD074\uB9AD\uC73C\uB85C \uC810\uC744 \uCC0D\uACE0 \uB354\uBE14\uD074\uB9AD\uC73C\uB85C \uB05D\uB0B4\uC694"],
  ["rectangle", Square, "\uC0AC\uAC01\uD615", "\uB300\uAC01\uC120 \uB450 \uBAA8\uC11C\uB9AC\uB97C \uD074\uB9AD\uD574\uC694"],
  ["circle", Circle, "\uC6D0", "\uC911\uC2EC\uACFC \uAC00\uC7A5\uC790\uB9AC\uB97C \uD074\uB9AD\uD574\uC694 \xB7 \uC18D\uC131\uC5D0\uC11C \uBC18\uACBD \uD3B8\uC9D1"],
  ["freehand", Pencil, "\uC790\uC720\uACE1\uC120", "\uB204\uB978 \uCC44 \uB4DC\uB798\uADF8 \uD6C4 \uB193\uC544\uC694 \xB7 \uAF2D\uC9D3\uC810 \uC790\uB3D9 \uB2E8\uC21C\uD654"],
  ["smooth", Spline, "\uACE1\uC120", "\uB2E4\uAC01\uD615\uCC98\uB7FC \uC810\uC744 \uCC0D\uC73C\uBA74 \uBAA8\uC11C\uB9AC\uB97C \uBD80\uB4DC\uB7FD\uAC8C \uD574\uC694"]
];
function ShapePicker({ mode, onChange }) {
  return /* @__PURE__ */ jsx3("div", { className: "shape-picker", role: "group", "aria-label": "\uC601\uC5ED \uBAA8\uC591", children: SHAPES.map(([id, Icon, name, hint]) => /* @__PURE__ */ jsxs3("button", { type: "button", "aria-pressed": mode === id, title: `${name} \u2014 ${hint}`, onClick: () => onChange(id), children: [
    /* @__PURE__ */ jsx3(Icon, { size: 16 }),
    name
  ] }, id)) });
}

// src/ui/LayerPanel.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var KINDS = ["boundary", "zone", "bed", "pond", "tree", "path", "house", "micro", "plant", "sector", "water-flow"];
var OVS = [["sun", "\uD574 \uBC29\uD5A5"], ["shade", "\uADF8\uB298 \uBD80\uCC44 (\uC608\uC2DC)"], ["wind", "\uBC14\uB78C\uC7A5\uBBF8"], ["noise", "\uC18C\uC74C(\uB3C4\uB85C)"], ["slope", "\uBB3C\uD750\uB984\xB7\uACBD\uC0AC"]];
function LayerPanel(p) {
  const ov = p.overlays ?? {};
  return /* @__PURE__ */ jsxs4("section", { children: [
    /* @__PURE__ */ jsx4("h3", { children: "\uB808\uC774\uC5B4" }),
    /* @__PURE__ */ jsxs4("label", { children: [
      /* @__PURE__ */ jsx4("input", { type: "checkbox", checked: p.showSat, onChange: (e) => p.setShowSat(e.target.checked) }),
      " \uC704\uC131"
    ] }),
    /* @__PURE__ */ jsxs4("label", { children: [
      /* @__PURE__ */ jsx4("input", { type: "checkbox", checked: !["tree", "plant"].some((k) => p.hidden.includes(k)), onChange: (e) => p.setHidden(e.target.checked ? p.hidden.filter((k) => k !== "tree" && k !== "plant") : [.../* @__PURE__ */ new Set([...p.hidden, "tree", "plant"])]) }),
      " \uC2DD\uBB3C \uC804\uCCB4 (\uB098\uBB34\xB7\uAE38\uB4DC \uC2DD\uBB3C)"
    ] }),
    KINDS.map((k) => {
      const n = p.features.filter((f) => f.kind === k).length;
      return /* @__PURE__ */ jsxs4("label", { children: [
        /* @__PURE__ */ jsx4(
          "input",
          {
            type: "checkbox",
            checked: !p.hidden.includes(k),
            onChange: (e) => p.setHidden(e.target.checked ? p.hidden.filter((x) => x !== k) : [...p.hidden, k])
          }
        ),
        " ",
        KIND_LABEL[k],
        " ",
        /* @__PURE__ */ jsx4("small", { className: "dim", children: n || "" })
      ] }, k);
    }),
    /* @__PURE__ */ jsx4("h3", { children: "\uBD84\uC11D \uACB9\uCCD0\uBCF4\uAE30" }),
    /* @__PURE__ */ jsx4("p", { className: "hint", children: "\uD574\xB7\uADF8\uB298\uC740 \uBD81\uD5A5 \uBCF4\uC815\uC744 \uBC18\uC601\uD55C \uC124\uBA85\uC6A9 \uC608\uC2DC\uC774\uBA70 \uC815\uBC00 \uC2DC\uBBAC\uB808\uC774\uC158\uC774 \uC544\uB2C8\uC5D0\uC694." }),
    OVS.map(([k, l]) => /* @__PURE__ */ jsxs4("label", { children: [
      /* @__PURE__ */ jsx4("input", { type: "checkbox", checked: !!ov[k], onChange: (e) => p.setOverlay(k, e.target.checked) }),
      " ",
      l
    ] }, k)),
    /* @__PURE__ */ jsx4("h3", { children: "\uBAA9\uB85D" }),
    /* @__PURE__ */ jsx4("ul", { className: "list", children: p.features.filter((f) => f.kind !== "plant").map((f) => /* @__PURE__ */ jsxs4("li", { className: f.id === p.selectedId ? "on" : "", onClick: () => p.onPick(f.id), children: [
      f.kind === "zone" ? `Zone ${f.props.zone}` : KIND_LABEL[f.kind],
      " ",
      f.props.name || f.props.label || ""
    ] }, f.id)) })
  ] });
}

// tests/stage3.test.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
var data = JSON.parse(readFileSync("../data/plant_guilds.json", "utf8"));
var center = [127, 36];
var circle2 = drawnCircle(center, dest(center, 90, 12));
var base = { type: "Polygon", coordinates: [[center, dest(center, 90, 25), dest(dest(center, 90, 25), 180, 15), dest(center, 180, 15), center]] };
var projected = toOl(base);
assert2(projected instanceof Polygon_default);
var smooth = fromOl(finishPolygon(projected, "smooth", 0.01));
var freehandRing = Array.from({ length: 361 }, (_, i) => dest(center, i, 18 + Math.sin(i * 0.15) * 0.2));
freehandRing[360] = freehandRing[0];
var freehandPoly = toOl({ type: "Polygon", coordinates: [freehandRing] });
assert2(freehandPoly instanceof Polygon_default);
var freehand = fromOl(finishPolygon(freehandPoly, "freehand", 0.4));
var rectOl = createBox()([[0, 0], [30, 20]], void 0, "EPSG:3857");
assert2(rectOl instanceof Polygon_default);
var rectangle = fromOl(rectOl);
var sample = (id, geometry, shape, kind = "zone") => ({ id, geometry, kind, props: measured(kind, geometry, { shape, zone: 1 }) });
var shapes = [sample("circle", circle2.geometry, circle2.shape), sample("freehand", freehand, { mode: "freehand" }), sample("smooth", smooth, { mode: "smooth" }, "bed"), sample("polygon", base, { mode: "polygon" }), sample("rectangle", rectangle, { mode: "rectangle" })];
var tree = { id: "tree", kind: "tree", geometry: { type: "Point", coordinates: center }, props: { guildId: "group", canopyM: 3, heightM: 6 } };
var member = { id: "member", kind: "plant", geometry: { type: "Point", coordinates: dest(center, 90, 3) }, props: { guildId: "group" } };
var arrow = { id: "water", kind: "water-flow", geometry: { type: "LineString", coordinates: [center, dest(center, 135, 20)] }, props: { name: "\uC720\uCD9C \uBC29\uD5A5 (\uC218\uB3D9)" } };
arrow.props = measured(arrow.kind, arrow.geometry, arrow.props);
var file = { schemaVersion: 1, meta: { name: "3\uB2E8\uACC4 \uB85C\uCEEC \uAC80\uC99D", createdAt: "2026-11-09T00:00:00Z", updatedAt: "2026-11-09T00:00:00Z", northDeg: 15 }, place: { center: { lon: 127, lat: 36 }, zoom: 19, bbox: { west: 0, east: 0, north: 0, south: 0 }, basemap: { provider: "vworld-satellite", attribution: "VWorld" } }, features: [...shapes, tree, member, arrow], analysis: { date: "2026-06-21", hour: 12, overlays: { sun: true, shade: true } }, ui: { activeLayerIds: ["satellite"], hiddenKinds: ["water-flow"] } };
test("all five area modes are polygons with measured positive areas", () => {
  for (const f of shapes) {
    assert2.equal(f.geometry.type, "Polygon");
    assert2((f.props.areaM2 ?? 0) > 0);
  }
  assert2.equal(rectOl.getArea(), 600);
  assert2(Math.abs((shapes[0].props.areaM2 ?? 0) - Math.PI * 144) < 1);
  assert2.equal(circle2.shape.mode, "circle");
  if (circle2.shape.mode === "circle") assert2(Math.abs(circle2.shape.radiusM - 12) < 1e-3);
});
test("freehand simplification reduces samples; Chaikin smooths and closes ring", () => {
  assert2(freehand.type === "Polygon" && smooth.type === "Polygon");
  assert2(freehand.coordinates[0].length < freehandRing.length / 2);
  assert2(smooth.coordinates[0].length > base.coordinates[0].length);
  assert2.deepEqual(smooth.coordinates[0][0], smooth.coordinates[0].at(-1));
  assert2.notDeepEqual(smooth.coordinates[0][0], base.coordinates[0][0]);
});
test("radius edit quadruples area, translation preserves radius and moves center; vertex edit detaches circle", () => {
  const p = measured("zone", circlePolygon(center, 24), {});
  assert2(Math.abs((p.areaM2 ?? 0) / (shapes[0].props.areaM2 ?? 1) - 4) < 0.01);
  const geom = { type: "Polygon", coordinates: circle2.geometry.coordinates.map((r) => r.map((c) => [c[0] + 1e-3, c[1] + 2e-3])) };
  const moved = moveFeature(shapes, "circle", geom, false, "translate")[0];
  assert2(moved.props.shape?.mode === "circle");
  assert2(Math.abs(moved.props.shape.center[0] - 127.001) < 1e-10);
  assert2.equal(moved.props.shape.radiusM, circle2.shape.mode === "circle" ? circle2.shape.radiusM : 0);
  assert2.equal(moveFeature(shapes, "circle", geom, false, "modify")[0].props.shape?.mode, "polygon");
});
test("member can move alone or translate whole guild from either anchor; one history step", () => {
  assert2(member.geometry.type === "Point");
  const newGeometry = { type: "Point", coordinates: dest(member.geometry.coordinates, 180, 8) };
  const alone = moveFeature([tree, member], "member", newGeometry, false, "translate");
  assert2.deepEqual(alone[0], tree);
  assert2.notDeepEqual(alone[1], member);
  const group = moveFeature([tree, member], "member", newGeometry, true, "translate");
  assert2.notDeepEqual(group[0], tree);
  assert2.notDeepEqual(group[1], member);
  const history = new History();
  history.push([tree, member]);
  assert2.deepEqual(history.undo(group), [tree, member]);
  assert2.deepEqual(history.redo([tree, member]), group);
  const treeMove = moveFeature([tree, member], "tree", newGeometry, true, "translate");
  assert2.notDeepEqual(treeMove[1], member);
});
test("real 60-plant catalog Korean search and crown diameter mapping are null safe", () => {
  assert2.equal(data.plants.length, 60);
  assert2.equal(data.guilds.length, 9);
  const matches = matchingPlants(data.plants, "\uC0AC\uACFC");
  assert2(matches.length > 0);
  for (const p of matches) assert2(p.ko.includes("\uC0AC\uACFC"));
  const width = data.plants.find((p) => p.width_m != null);
  assert2(width);
  assert2.equal(plantingProps(width).canopyM, (width.width_m ?? 0) / 2);
  const missing = { ...width, width_m: null, height_m: null };
  assert2.equal(plantingProps(missing).canopyM, void 0);
  assert2.equal(plantingProps(missing).heightM, void 0);
  const markup = renderToStaticMarkup(/* @__PURE__ */ jsx5(PlantCard, { pl: missing }));
  assert2(markup.includes("\uC815\uBCF4 \uC5C6\uC74C"));
  assert2(markup.includes("PFAF UK zone"));
  assert2(markup.includes("USDA \uC544\uB2D8"));
  assert2(markup.includes("\uCD94\uC815"));
});
test("water arrow length and arrowhead point towards last segment", () => {
  assert2(Math.abs((arrow.props.lengthM ?? 0) - 20) < 0.1);
  const olGeom = toOl(arrow.geometry);
  assert2(olGeom instanceof LineString_default);
  const styles = featureStyle(new Feature_default({ kind: arrow.kind, geometry: olGeom, props: arrow.props }), 1, false);
  const head = styles.at(-1)?.getGeometry();
  assert2(head instanceof Point_default);
  assert2.deepEqual(head.getCoordinates(), olGeom.getLastCoordinate());
});
test("northDeg rotates incidence and illustrative shade fan; night produces no shade", () => {
  assert2.equal(drawingBearing(180, 15), 165);
  const overlays = buildOverlays(file, null, null, null);
  assert2(overlays.some((o) => o.okind === "sun"));
  assert2(overlays.some((o) => o.okind === "shade"));
  assert2.equal(shadeFans([tree], 180, -5).length, 0);
  const raw = buildOverlays({ ...file, meta: { ...file.meta, northDeg: 0 } }, null, null, null);
  assert2.notDeepEqual(overlays.find((o) => o.okind === "sun")?.geometry, raw.find((o) => o.okind === "sun")?.geometry);
  const fan = overlays.find((o) => o.okind === "shade");
  assert2(fan?.label?.includes("\uC815\uBC00 \uC2DC\uBBAC\uB808\uC774\uC158 \uC544\uB2D8"));
});
test("new shapes, hidden layers and water-flow survive actual file parser; stage2 stays readable", () => {
  assert2.deepEqual(parseGardenFile(JSON.stringify(file)), file);
  const old = JSON.parse(readFileSync("../shots/round_trip.garden.json", "utf8"));
  const restored = parseGardenFile(JSON.stringify(old));
  assert2.equal(restored.features.length, 36);
  assert2.equal(restored.ui?.hiddenKinds, void 0);
});
test("server-rendered controls expose all modes, 60 plants and layer checkboxes", () => {
  const shape = renderToStaticMarkup(/* @__PURE__ */ jsx5(ShapePicker, { mode: "circle", onChange: () => {
  } }));
  for (const label2 of ["\uB2E4\uAC01\uD615", "\uC0AC\uAC01\uD615", "\uC6D0", "\uC790\uC720\uACE1\uC120", "\uACE1\uC120"]) assert2(shape.includes(label2));
  const picker = renderToStaticMarkup(/* @__PURE__ */ jsx5(PlantPicker, { plants: data.plants, selectedId: data.plants[0].id, onPick: () => {
  } }));
  assert2(picker.includes("\uD55C\uAD6D \uC774\uB984 \uAC80\uC0C9"));
  assert2(picker.includes("60"));
  assert2(picker.includes("\uCD94\uC815"));
  const layers = renderToStaticMarkup(/* @__PURE__ */ jsx5(LayerPanel, { features: file.features, hidden: ["water-flow"], setHidden: () => {
  }, showSat: false, setShowSat: () => {
  }, overlays: file.analysis?.overlays, setOverlay: () => {
  }, selectedId: null, onPick: () => {
  } }));
  for (const label2 of ["\uBB3C\uD750\uB984", "\uC139\uD130", "\uAD6C\uC5ED", "\uC2DD\uBB3C \uC804\uCCB4", "\uD574 \uBC29\uD5A5", "\uADF8\uB298"]) assert2(layers.includes(label2));
  mkdirSync("../shots", { recursive: true });
  writeFileSync("../shots/stage3-roundtrip.garden.json", JSON.stringify(file, null, 2));
  writeFileSync("../shots/19_stage3_controls_preview.html", `<!doctype html><meta charset="utf-8"><title>3\uB2E8\uACC4 \uB85C\uCEEC \uC81C\uC5B4 \uBBF8\uB9AC\uBCF4\uAE30</title><style>body{font:15px sans-serif;background:#17212b;color:#eee;max-width:1000px;margin:2rem auto}button,input{padding:6px;background:#263238;color:white;margin:3px}section{border:1px solid #607d8b;padding:16px} .plant-options{max-height:240px;overflow:auto;display:grid}.est{background:#705300;padding:2px}</style><h1>3\uB2E8\uACC4 \xB7 \uC815\uC801 \uC81C\uC5B4 \uBBF8\uB9AC\uBCF4\uAE30</h1><p>\uC2E4\uD589 \uD654\uBA74 \uCEA1\uCC98 \uC544\uB2D8. \uC2E4\uC81C React \uCEF4\uD3EC\uB10C\uD2B8 \uC11C\uBC84 \uB80C\uB354. \uC9C0\uB3C4\xB7\uC0C1\uD638\uC791\uC6A9\uC740 \uC774 \uD30C\uC77C\uC5D0 \uC5C6\uC74C.</p>${shape}<div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">${picker}<aside>${layers}</aside></div>`);
});
