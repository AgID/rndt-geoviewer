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
  './LayerInfoOriginal',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/promise/all',
  //'./NlsStrings',
  'dojo/dom-construct',
  'dojo/topic',
  'dojo/aspect',
  'esri/config',
  'esri/tasks/ProjectParameters',
  'esri/SpatialReference',
  'esri/geometry/webMercatorUtils'
], function(declare, LayerInfoOriginal, array, lang, Deferred, all,
/*NlsStrings,*/ domConstruct, topic, aspect, esriConfig, ProjectParameters,
SpatialReference, webMercatorUtils) {
  return declare([LayerInfoOriginal], {
    
    constructor: function(operLayer, map, options) {
      if(operLayer.layerObject){
        if (!this.originOperLayer.url && (operLayer.layerObject._url && operLayer.layerObject._url.path)) {
          this.originOperLayer.url = operLayer.layerObject._url.path;
        }
        if (!this.originOperLayer.visibleLayers && operLayer.layerObject.visibleLayers) {
          this.originOperLayer.visibleLayers = operLayer.layerObject.visibleLayers;
        }
        if (!this.originOperLayer.declaredClass && operLayer.layerObject.declaredClass) {
          this.originOperLayer.declaredClass = operLayer.layerObject.declaredClass;
        }
        if (!this.originOperLayer.layerDefinitions && operLayer.layerObject.layerDefinitions) {
          this.originOperLayer.layerDefinitions = operLayer.layerObject.layerDefinitions;
        }
        if (!this.originOperLayer.layerFields && operLayer.layerObject.layerFields) {
          this.originOperLayer.layerFields = operLayer.layerObject.layerFields;
        }
        if (!this.originOperLayer.orderByFields && operLayer.layerObject.orderByFields) {
          this.originOperLayer.orderByFields = operLayer.layerObject.orderByFields;
        }
      }
      if (this.layerObject && (!this.layerObject.url && this.originOperLayer.url)) {
        this.layerObject.url = this.originOperLayer.url;
      }
    }
    
  });
});
