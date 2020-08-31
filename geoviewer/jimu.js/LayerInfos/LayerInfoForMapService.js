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
  './LayerInfoForMapServiceOriginal',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/json',
  'dojo/aspect',
  'dojo/topic',
  './LayerInfo',
  'esri/request',
  'esri/lang',
  './LayerInfoFactory',
  "jimu/esriIT/esriItutils",
  'dojo/promise/all'
], function(declare, LayerInfoForMapServiceOriginal, array, lang, Deferred, Json, aspect, topic, LayerInfo,
esriRequest, esriLang, LayerInfoFactory,esriItutils, all) {
  return declare(LayerInfoForMapServiceOriginal, {

    constructor: function(operLayer, map, options) {
      
      //****************    ESRI ITALIA   ***************************
      if (operLayer.infoTemplates != null) {
        var layerInfoTemplates = [];
        for (var i = 0; i < operLayer.infoTemplates.length; i++) {
          var fieldInfos = operLayer.infoTemplates[i].fieldInfos;          
          var infoTemplate = new PopupTemplate(
          {
          title: operLayer.infoTemplates[i].title, 
          fieldInfos: fieldInfos, 
          showAttachments:operLayer.infoTemplates[i].showAttachments,
          mediaInfos:operLayer.infoTemplates[i].mediaInfos
          });
          
          layerInfoTemplates.push({infoTemplate: infoTemplate});
        }
        this.layerObject.infoTemplates = layerInfoTemplates;
      }
      if (operLayer.layerFields != null) {
        this.layerObject.layerFields = operLayer.layerFields;
      }

      if(options) this._layerOptions = options.layerOptions ? options.layerOptions: null;
      else this._layerOptions = null;
      //*******************************************

      //other initial methods depend on '_jsapiLayerInfos', so must init first.
      this._initJsapiLayerInfos();

      /*jshint unused: false*/
      this.initSubLayerVisible();

      // init _subLayerIdent.
      this._initSubLayerIdent();

      // init control popup
      this._initControlPopup();
    },
    
    _initControlPopup: function() {
      this.controlPopupInfo = {
        enablePopup: undefined,
        infoTemplates: lang.clone(this.layerObject.infoTemplates)
      };
      // backup infoTemplates to layer.
      //****************    ESRI ITALIA   ***************************
      if(this.layerObject._infoTemplates == undefined || this.layerObject._infoTemplates==null || this.layerObject._infoTemplates == 'undefined'){
      //*******************************************    
        this.layerObject._infoTemplates = lang.clone(this.layerObject.infoTemplates);
        aspect.after(this.layerObject, "setInfoTemplates", lang.hitch(this, function(){
          this.layerObject._infoTemplates = lang.clone(this.layerObject.infoTemplates);
          this.controlPopupInfo.infoTemplates = lang.clone(this.layerObject.infoTemplates);
          this.traversal(function(layerInfo) {
            if(layerInfo._afterSetInfoTemplates) {
              layerInfo._afterSetInfoTemplates();
            }
          });
        }));
      }
    },
    
    _legendRequestServer: function() {
      //****************    ESRI ITALIA   ***************************
      var url = "";
      if (this.layerObject.url.indexOf("?token=") != -1) {
        url = this.layerObject.url.substring(0, this.layerObject.url.indexOf("?token=")) + "/legend" + this.layerObject.url.substring(this.layerObject.url.indexOf("?token="));
      } else {
        url = this.layerObject.url + "/legend";
      }

      url += "?f=json";
      url = esriItutils.fixUrlWithToken(url);
      //var url = this.layerObject.url + "/legend";
      //*******************************************   
      var params = {};
      //****************    ESRI ITALIA   ***************************
      //   params.f = "json";
      //*******************************************   
      if (this.layerObject._params.dynamicLayers) {
        params.dynamicLayers = Json.stringify(this._createDynamicLayers(this.layerObject));
        if (params.dynamicLayers === "[{}]") {
          params.dynamicLayers = "[]";
        }
      }
      var request = esriRequest({
        url: url,
        content: params,
        handleAs: 'json',
        callbackParamName: 'callback'
      });
      return request;
    },
    
    
    obtainNewSubLayers: function() {
      var newSubLayers = [];
      var layer = this.originOperLayer.layerObject;
      var serviceLayerType = null;
      if (layer.declaredClass === 'esri.layers.ArcGISDynamicMapServiceLayer') {
        serviceLayerType = "dynamic";
      } else {
        serviceLayerType = "tiled";
      }

      array.forEach(this._jsapiLayerInfos, function(layerInfo) {
        var featureLayer = null;
        //****************    ESRI ITALIA   ***************************
        //var url = layer.url + "/" + layerInfo.id;
        var url = "";
        if (layer.url.indexOf("?token=") != -1) {
          url = layer.url.substring(0, layer.url.indexOf("?token=")) + "/" + layerInfo.id + layer.url.substring(layer.url.indexOf("?token="));
        } else {
          url = layer.url + "/" + layerInfo.id;
        }
        //************************************
        var featureLayerId = layer.id + "_" + layerInfo.id;

        // It is a group layer.
        if (layerInfo.subLayerIds && layerInfo.subLayerIds.length > 0) {
          // it's a fake layerObject, only has a url intent to show Descriptiong in popupMenu
          featureLayer = {
            url: url,
            empty: true
          };
          this._addNewSubLayer(newSubLayers,
                               featureLayer,
                               featureLayerId,
                               layerInfo,
                               serviceLayerType + '_group');
        } else {
          featureLayer = {
            url: url,
            empty: true
          };
          this._addNewSubLayer(newSubLayers,
                               featureLayer,
                               featureLayerId,
                               layerInfo,
                               serviceLayerType);
        }
      }, this);

      var finalNewSubLayerInfos = [];
      //reorganize newSubLayers, newSubLayers' element now is:
      //{
      // layerObject:
      // title:
      // id:
      // subLayers:
      //}
      array.forEach(this._jsapiLayerInfos, function(layerInfo, i) {
        var parentId = layerInfo.parentLayerId;
        if (parentId !== -1 /*&& this._idIsInJsapiLayerInfos(layerInfo.id)*/
            /*&& !newSubLayers[layerInfo.id].error && !newSubLayers[parentId].error*/ ) { //****
          var parentLayer = getNewSubLayerBySubId(newSubLayers, parentId);
          if(parentLayer) {
            parentLayer.subLayers.push(newSubLayers[i]);
          }
        }
      }, this);

      array.forEach(this._jsapiLayerInfos, function(layerInfo, i) {
        var subLayerInfo;
        if (layerInfo.parentLayerId === -1 /*&& this._idIsInJsapiLayerInfos(layerInfo.id)*/
           /*&& !newSubLayers[layerInfo.id].error*/ ) {
          subLayerInfo = LayerInfoFactory.getInstance().create(newSubLayers[i]);
          finalNewSubLayerInfos.push(subLayerInfo);
          subLayerInfo.init();
        }
      }, this);

      return finalNewSubLayerInfos;

      function getNewSubLayerBySubId(newSubLayers, subId) {
        var newSubLayer = null;
        for(var i = 0; i < newSubLayers.length; i++) {
          if(newSubLayers[i].mapService.subId === subId) {
            newSubLayer = newSubLayers[i];
            break;
          }
        }
        return newSubLayer;
      }
    },
	
	getLegendInfo: function() {
		var def = new Deferred();		
		esriItutils.enabledProxyForThisDeferred(def);
		var ret = this.inherited(arguments);		
		all([ret]).then(function(results){
			def.resolve();	
		});		
		return ret;
    },
	
    _allLayerAndTableServer: function(subId) {
      var def = new Deferred();
      //****************    ESRI ITALIA   ***************************
	  def = esriItutils.enabledProxyForThisDeferred(def);
      var url = "";
      if (this.layerObject.url.indexOf("?token=") != -1) {
        url = this.layerObject.url.substring(0, this.layerObject.url.indexOf("?token=")) + "/layers" + this.layerObject.url.substring(this.layerObject.url.indexOf("?token="));
      } else {
        url = this.layerObject.url + "/layers";
      }
      //var url = this.layerObject.url + '/layers';
      //************************************
      if(this._sublayerIdent.empty) {
        this._sublayerIdent.empty = false;
        this._request(url).then(lang.hitch(this, function(results) {
          //this._sublayerIdent.definitions = results.layers;
          array.forEach(results.layers, function(layerIdent) {
            this._sublayerIdent.definitions[layerIdent.id] = layerIdent;
          }, this);
          this._sublayerIdent.defLoad.resolve();
          def.resolve(this._sublayerIdent.definitions[subId]);
        }), lang.hitch(this, function(err) {
          console.error(err.message || err);
          this._sublayerIdent.defLoad.reject();
          this._sublayerIdent.defLoad = new Deferred();
          this._sublayerIdent.empty = true;
          def.resolve(null);
        }))
      } else {
        this._sublayerIdent.defLoad.then(lang.hitch(this, function() {
          def.resolve(this._sublayerIdent.definitions[subId]);
        }), function(err) {
          console.error(err.message || err);
          def.resolve(null);
        });
      }
      return def;
    },
     
    _allLayerAndTable: function(subId) {
      var def = new Deferred();
      //****************    ESRI ITALIA   ***************************
      var url = "";
      if (this.layerObject.url.indexOf("?token=") != -1) {
        url = this.layerObject.url.substring(0, this.layerObject.url.indexOf("?token=")) + '/' + subId + this.layerObject.url.substring(this.layerObject.url.indexOf("?token="));
      } else {
        url = this.layerObject.url + '/' + subId;
      }
      //var url = this.layerObject.url + '/' + subId;
      //**********************************************************
      this._request(url).then(lang.hitch(this, function(result) {
        this._sublayerIdent.definitions[subId] = result;
        def.resolve(result);
      }), function(err) {
        console.error(err.message || err);
        def.resolve(null);
      });
      return def;
    },
    
    _request: function(url) {
      //****************    ESRI ITALIA   ***************************
      url = esriItutils.fixUrlWithToken(url + "?f=json");
      //***********************
      var request = esriRequest({
        url: url,
        //****************    ESRI ITALIA   ***************************
        //content: {
        //  f: 'json'
        //},
        //***********************
        handleAs: 'json',
        callbackParamName: 'callback'
      });
      return request;
    }    
    
  });
});
