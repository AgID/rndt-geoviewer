define([
  "dojo/_base/declare",
  "jimu/dijit/DrawBox",
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/_base/array',
  'dojo/on',
  'dojo/query',
  'dojo/Evented',
  'esri/layers/GraphicsLayer',
  'esri/graphic',
  'esri/toolbars/draw',
  'esri/symbols/jsonUtils'
],
function(declare, DrawBox,WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
   lang, html, array, on, query, Evented,
  GraphicsLayer, Graphic, Draw, jsonUtils) {
  return declare("jimu/esriIT/newTab/DrawBoxExtend",[DrawBox],{
    
    map: null,
    
    constructor: function(data){
      this.drawLayer = null;
      if(data.map){
        this.map = data.map;
         if(data.drawLayer) {
          this.drawLayer = data.drawLayer;
          this.map.addLayer(this.drawLayer);
          }
      }
      //if(data.drawLayer)  this.drawLayer = data.drawLayer;
      if(data.drawToolBar) this.drawToolBar = data.drawToolBar;
    },
    
    postCreate:function(){
      //this.inherited(arguments);
      var layerArgs = {};
      if(this.drawLayerId){
        layerArgs.id = this.drawLayerId;
      }
      if(this.drawLayer==null) this.drawLayer = new GraphicsLayer(layerArgs);
      this._initDefaultSymbols();
      this._initTypes();
      var items = query('.draw-item', this.domNode);
      this.own(items.on('click', lang.hitch(this, this._onItemClick)));
      this.own(on(this.btnClear, 'click', lang.hitch(this, this.clear)));
      if(this.map == null){
        this.setMap(this.map);
      }else{
        //this.drawToolBar = new Draw(this.map);
        this.drawToolBar.setMarkerSymbol(this.pointSymbol);
        this.drawToolBar.setLineSymbol(this.polylineSymbol);
        this.drawToolBar.setFillSymbol(this.polygonSymbol);
        this.own(on(this.drawToolBar, 'draw-end', lang.hitch(this, this._onDrawEnd)));
      }
      var display = this.showClear === true ? 'block' : 'none';
      html.setStyle(this.btnClear, 'display', display);
    },
    
    
  })
  
});