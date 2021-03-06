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
  './LayerInfoForDefaultTableOriginal',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/Deferred',
  './LayerInfoForDefault',
  'esri/layers/FeatureLayer',
  "jimu/esriIT/esriItutils"
], function(declare, LayerInfoForDefaultTableOriginal, lang, html, Deferred, LayerInfoForDefault, FeatureLayer) {
  return declare(LayerInfoForDefaultTableOriginal, {
    

    getLayerObject: function() {
      var def = new Deferred();
      if(this.layerObject.empty) {
        //******************   ESRI ITALIA **********************************
        var url = esriItutils.fixUrlWithToken(this.layerObject.url);
        if(url) {
        //if(this.layerObject.url) {
        //*******************************************************************
          var options = this._getLayerOptionsForCreateLayerObject();
          this.layerObject = new FeatureLayer(this.layerObject.url,
                                        lang.mixin(options, this.originOperLayer.options || {}) || {});
          this.layerObject.on('load', lang.hitch(this, function() {
            // change layer.name, need move to layerObject factory. Todo...
            if(!this.layerObject.empty &&
               this.layerObject.name &&
               !lang.getObject("_wabProperties.originalLayerName", false, this.layerObject)) {
              lang.setObject('_wabProperties.originalLayerName',
                             this.layerObject.name,
                             this.layerObject);
              this.layerObject.name = this.title;
            }
            this._bindEventAfterLayerObjectLoaded();
            def.resolve(this.layerObject);
          }));
          this.layerObject.on('error', lang.hitch(this, function(/*err*/) {
            //def.reject(err);
            def.resolve(null);
          }));
        } else if(this.layerObject.featureCollectionData){
          this.layerObject = new FeatureLayer(this.layerObject.featureCollectionData,
                                              this.originOperLayer.options || {});
          // this.layerObject.on('load', lang.hitch(this, function() {
          //   def.resolve(this.layerObject);
          // }));
          // this.layerObject.on('error', lang.hitch(this, function(/*err*/) {
          //   //def.reject(err);
          //   def.resolve(null);
          // }));
          def.resolve(this.layerObject);
        } else {
          def.resolve(null);
        }
      } else {
        def.resolve(this.layerObject);
      }
      return def;
    }
    
  });
});
