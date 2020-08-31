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
  './LayerInfoForDefaultServiceOriginal',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/dom-construct',
  './LayerInfoForDefault',
  'esri/layers/FeatureLayer',
  'esri/layers/RasterLayer',
  "jimu/esriIT/esriItutils"
], function(declare, LayerInfoForDefaultServiceOriginal, array, lang, Deferred, domConstruct,
LayerInfoForDefault, FeatureLayer, RasterLayer, esriItutils) {
  return declare(LayerInfoForDefaultServiceOriginal, {
    
	
    getLayerObject: function() {
      var def = new Deferred();
	  def = esriItutils.enabledProxyForThisDeferred(def);
      var loadHandle, loadErrorHandle;
      this.getLayerType().then(lang.hitch(this, function(layerType) {
        if(this.layerObject.empty) {
          if(layerType === "RasterLayer") {
            this.layerObject = new RasterLayer(this.layerObject.url);
          } else if(layerType === "FeatureLayer") {
            this.layerObject = new FeatureLayer(this.layerObject.url,
                                                this._getLayerOptionsForCreateLayerObject());
          } else if(layerType === "StreamLayer") {
            this.layerObject = new StreamLayer(this.layerObject.url);
          } else if(layerType === "ArcGISImageServiceLayer") {
            this.layerObject = new ArcGISImageServiceLayer(this.layerObject.url);
          } else if(layerType === "ArcGISImageServiceVectorLayer") {
            this.layerObject = new ArcGISImageServiceVectorLayer(this.layerObject.url);
          }// else resolve with null at below;
          // temporary solution, partly supports kind of layerTypes. Todo...***
          // need a layerObject factory.

          if(this.layerObject.empty) {
            def.resolve();
          } else {
            // consider the condition of layer that there is no 'on' method. Todo...
            this._layerObjectLoadingIndicator.loadingFlag = true;
            loadHandle = this.layerObject.on('load', lang.hitch(this, function() {
              // change layer.name, just for subLayers of mapService now, need move to layerObject factory.
              // Todo...
              if(!this.layerObject.empty &&
                 this.layerObject.name &&
                 !lang.getObject("_wabProperties.originalLayerName", false, this.layerObject)) {
                lang.setObject('_wabProperties.originalLayerName',
                               this.layerObject.name,
                               this.layerObject);
                this.layerObject.name = this.title;
              }
              this.layerObject.id = this.id;
              
              //*****************   ESRI ITALIA   ********************
              this.layerObject.layerDefinitions = this.originOperLayer.mapService.layerInfo.layerObject.layerDefinitions;
              this.layerObject.layerFields = this.originOperLayer.mapService.layerInfo.layerObject.layerFields;
              this.layerObject.orderByFields = this.originOperLayer.mapService.layerInfo.layerObject.orderByFields;
              //******************************************************
            
            
              def.resolve(this.layerObject);
              this._layerObjectLoadingIndicator.loadedDef.resolve(this.layerObject);
              if(loadHandle.remove) {
                loadHandle.remove();
              }
            }));
            loadErrorHandle = this.layerObject.on('error', lang.hitch(this, function(/*err*/) {
              def.resolve(null);
              this._layerObjectLoadingIndicator.loadedDef.resolve(null);
              if(loadErrorHandle.remove) {
                loadErrorHandle.remove();
              }
            }));
          }
        } else if(this._layerObjectLoadingIndicator.loadingFlag) {
          this._layerObjectLoadingIndicator.loadedDef.then(lang.hitch(this, function(layerObject) {
            def.resolve(layerObject);
          }));
        } else {
          // layerObject exist at initial.
          def.resolve(this.layerObject);
        }
      }), lang.hitch(this, function() {
        def.resolve(null);
      }));
      return def;
    }

  });
});
