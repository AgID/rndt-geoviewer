///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  './MapManagerOriginal',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/topic',
  'dojo/on',
  'dojo/aspect',
  'dojo/keys',
  'esri/dijit/InfoWindow',
  'esri/dijit/PopupMobile',
  'esri/InfoTemplate',
  'esri/request',
  'esri/geometry/Extent',
  'esri/geometry/Point',
  'require',
  './utils',
  './dijit/LoadingShelter',
  'jimu/LayerInfos/LayerInfos',
  'jimu/dijit/AppStatePopup',
  './MapUrlParamsHandler',
  './AppStateManager',
  './PopupManager',
  './FilterManager',
  'jimu/esriIT/esriItLoader'
], function(declare, MapManagerOriginal, lang, array, html, topic, on, aspect, keys, InfoWindow,
  PopupMobile, InfoTemplate, esriRequest, Extent, Point, require,
  jimuUtils, LoadingShelter, LayerInfos, AppStatePopup, MapUrlParamsHandler,
  AppStateManager, PopupManager, FilterManager,esriItLoader) {
  var instance = null,
    clazz = declare([MapManagerOriginal], {
      
      layerBG:null,
      layerBGshowAtScale:null,
      
      _showMap: function(appConfig) {
        // console.timeEnd('before map');
        console.time('Load Map');
        this.loading = new LoadingShelter();
        this.loading.placeAt(this.mapDivId);
        this.loading.startup();
        //for now, we can't create both 2d and 3d map
        if (appConfig.map['3D']) {
          if (appConfig.map.itemId) {
            this._show3DWebScene(appConfig);
          } else {
            this._show3DLayersMap(appConfig);
          }
        //*******   ESRI ITALIA   ******
        } else if(appConfig.map.esriItLoader){
          esriItLoader.showMap(appConfig,this,this.loading);
        }  else {
        //******************************
          if (appConfig.map.itemId) {
            this._show2DWebMap(appConfig);
          } else {
            console.log('No webmap found. Please set map.itemId in config.json.');
          }
        }
      },
      
      _addBackgroundMap: function(map) {
        //backgroundbasemap

        var thatConfig = this.appConfig.map;
        if(thatConfig.backgroundMap && thatConfig.backgroundMap.url && thatConfig.backgroundMap.url.length>0){
          var layerObj=thatConfig.backgroundMap;
          if (typeof layerObj.type !== 'undefined' && layerObj.type === "ArcGISTiledMapService"){
            this.layerBG = new esri.layers.ArcGISTiledMapServiceLayer(thatConfig.backgroundMap.url);
          }else{
            this.layerBG = new esri.layers.ArcGISDynamicMapServiceLayer(thatConfig.backgroundMap.url);			
          }	
          this.layerBG._basemapGalleryLayerType = 'basemap';	
          this.layerBG.name="backgroundMap";                  
          map.addLayer(this.layerBG,0);//that.map.layerIds.length-1);
          this.layerBGshowAtScale = thatConfig.backgroundMap.showAtScale ? thatConfig.backgroundMap.showAtScale : 1000;

          if(this.layerBG.loaded==true){
              this._backgroundMaphandler(map);
          }else{					 
              dojo.connect(this.layerBG, "onLoad", this._backgroundMaphandler(), map);
          }              
        }
      },
      
      _backgroundMaphandler: function(){
          var that=this;
          dojo.connect(this.map, "onZoomEnd", function(){
            
            if (that.map.getScale() < that.layerBGshowAtScale) that.layerBG.show();
            else that.layerBG.hide();

            if(that.map.layerIds.indexOf(that.layerBG.id)==-1){               
              that.map.removeLayer(that.layerBG);
              that.map.addLayer(that.layerBG, that.map.layerIds.length);
            }else if(that.map.layerIds.indexOf(that.layerBG.id)!=0){
              that.map.reorderLayer(that.layerBG,0);
            }
            
          });
      }
      

    });

  clazz.getInstance = function(options, mapDivId) {
    if (instance === null) {
      instance = new clazz(options, mapDivId);
    }
    return instance;
  };

  return clazz;
});