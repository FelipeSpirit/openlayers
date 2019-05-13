import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import Layer from '../src/ol/layer/Layer';
import {assign} from '../src/ol/obj';
import {toLonLat} from '../src/ol/proj';
import SourceState from '../src/ol/source/State';
import {Stroke, Style} from '../src/ol/style.js';
import VectorLayer from '../src/ol/layer/Vector.js';
import VectorSource from '../src/ol/source/Vector.js';
import GeoJSON from '../src/ol/format/GeoJSON.js';

class Mapbox extends Layer {

  /**
   * @param {import('../src/ol/layer/Layer').Options} options Layer options.
   */
  constructor(options) {
    const baseOptions = assign({}, options);
    super(baseOptions);

    this.baseOptions = baseOptions;

    /**
     * @private
     * @type boolean
     */
    this.loaded = false;

    this.initMap();
  }

  initMap() {
    const map = this.map_;
    const view = map.getView();
    const center = toLonLat(view.getCenter(), view.getProjection());

    this.centerLastRender = view.getCenter();
    this.zoomLastRender = view.getZoom();
    this.centerLastRender = view.getCenter();
    this.zoomLastRender = view.getZoom();

    const options = assign(this.baseOptions, {
      attributionControl: false,
      boxZoom: false,
      center,
      container: map.getTargetElement(),
      doubleClickZoom: false,
      dragPan: false,
      dragRotate: false,
      interactive: false,
      keyboard: false,
      pitchWithRotate: false,
      scrollZoom: false,
      touchZoomRotate: false,
      zoom: view.getZoom() - 1
    });

    this.mbmap = new mapboxgl.Map(options);
    this.mbmap.on('load', function() {
      this.mbmap.getCanvas().remove();
      this.loaded = true;
      this.map_.render();
      this.mbmap.getContainer().querySelector('.mapboxgl-control-container').remove();
    }.bind(this));

  }

  /**
   *
   * @inheritDoc
   */
  render(frameState) {
    const map = this.map_;
    const view = map.getView();

    this.centerNextRender = view.getCenter();

    // adjust view parameters in mapbox
    const rotation = frameState.viewState.rotation;
    if (rotation) {
      this.mbmap.rotateTo(-rotation * 180 / Math.PI, {
        animate: false
      });
    }
    const center = toLonLat(this.centerNextRender, view.getProjection());
    const zoom = view.getZoom() - 1;
    this.mbmap.jumpTo({
      center: center,
      zoom: zoom,
      animate: false
    });

    // cancel the scheduled update & trigger synchronous redraw
    // see https://github.com/mapbox/mapbox-gl-js/issues/7893#issue-408992184
    // NOTE: THIS MIGHT BREAK WHEN UPDATING MAPBOX
    if (this.mbmap._frame) {
      this.mbmap._frame.cancel();
      this.mbmap._frame = null;
    }
    this.mbmap._render();

    return this.mbmap.getCanvas();
  }

  setVisible(visible) {
    super.setVisible(visible);

    const canvas = this.mbmap.getCanvas();
    canvas.style.display = visible ? 'block' : 'none';
  }

  setOpacity(opacity) {
    super.setOpacity(opacity);
    const canvas = this.mbmap.getCanvas();
    canvas.style.opacity = opacity;
  }

  setZIndex(zindex) {
    super.setZIndex(zindex);
    const canvas = this.mbmap.getCanvas();
    canvas.style.zIndex = zindex;
  }

  /**
   * @inheritDoc
   */
  getSourceState() {
    return this.loaded ? SourceState.READY : SourceState.UNDEFINED;
  }

  setMap(map) {
    this.map_ = map;
  }

}

mapboxgl.Map.prototype._setupContainer = function _setupContainer() {
  const container = this._container;
  container.classList.add('mapboxgl-map');

  const canvasContainer = this._canvasContainer = container.firstChild;

  this._canvas = document.createElement('canvas');
  canvasContainer.insertBefore(this._canvas, canvasContainer.firstChild);
  this._canvas.style.position = 'absolute';
  this._canvas.addEventListener('webglcontextlost', this._contextLost, false);
  this._canvas.addEventListener('webglcontextrestored', this._contextRestored, false);
  this._canvas.setAttribute('tabindex', '0');
  this._canvas.setAttribute('aria-label', 'Map');
  this._canvas.className = 'mapboxgl-canvas';

  const dimensions = this._containerDimensions();
  this._resizeCanvas(dimensions[0], dimensions[1]);

  this._controlContainer = canvasContainer;
  const controlContainer = this._controlContainer = document.createElement('div');
  controlContainer.className = 'mapboxgl-control-container';
  container.appendChild(controlContainer);

  const positions = this._controlPositions = {};
  ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(function(positionName) {
    const elem = document.createElement('div');
    elem.className = 'mapboxgl-ctrl-' + positionName;
    controlContainer.appendChild(elem);
    positions[positionName] = elem;
  });
};

const style = new Style({
  stroke: new Stroke({
    color: '#319FD3',
    width: 2
  })
});

const vectorLayer = new VectorLayer({
  source: new VectorSource({
    url: 'data/geojson/countries.geojson',
    format: new GeoJSON()
  }),
  style: style
});

const map = new Map({
  target: 'map',
  view: new View({
    center: [-10997148, 4569099],
    zoom: 4,
    minZoom: 1,
    extent: [-Infinity, -20048966.10, Infinity, 20048966.10],
    smoothExtentConstraint: false,
    smoothResolutionConstraint: false
  })
});

const key = 'ER67WIiPdCQvhgsUjoWK';
const mbLayer = new Mapbox({
  map: map,
  container: map.getTarget(),
  style: 'https://maps.tilehosting.com/styles/bright/style.json?key=' + key
});

map.addLayer(mbLayer);
map.addLayer(vectorLayer);
