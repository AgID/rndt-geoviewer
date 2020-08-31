///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
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
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/dom-construct',
  'dojo/on',
  './LayerInfoForDefault'
], function(declare, array, lang, html, domConstruct, on, LayerInfoForDefault) {
  var clazz = declare(LayerInfoForDefault, {


    constructor: function( operLayer, map ) {
      this.layerObject = operLayer.layerObject;
      /*jshint unused: false*/
    },

    getExtent: function() {
    },

    _resetLayerObjectVisiblity: function() {
      // do not do anything.
    },

    initVisible: function() {
      var ary = [], index, visible = false;
      ary = lang.clone(this.originOperLayer.layerObject.visibleLayers);
      index = array.indexOf(ary, this.originOperLayer.wms.subId);
      if (index >= 0) {
        visible = true;
      } else {
        visible = false;
      }
      this._visible = visible;
    },
    
    _setTopLayerVisible: function(visible) {
      var wms = this.originOperLayer.wms;      
      var that = this;

      if(visible) {
        this._visible = true;
      } else {
        this._visible = false;
      }
      var layersVisble = {};
      layersVisble[wms.subId] = visible;
      wms.layerInfo.setSubLayerVisible(layersVisble);
         
      // check group layer visible      
      var actualVisibleLayers = wms.layerInfo.layerObject.visibleLayers;      
      var removeVisibleLayers = [];
      var visibleLayersParent = [];      
      
      array.forEach(wms.layerInfo.layerObject.visibleLayers,function (name){
        var layer = that._getLayerByName(name, wms.layerInfo.layerObject.layerInfos, that);
        if( !that._layerHasVisibleChild(actualVisibleLayers, layer, that) )
          removeVisibleLayers.push(name);
        else
          visibleLayersParent = visibleLayersParent.concat(that._getNotVisibleParentLayers(actualVisibleLayers, layer));        
      });      
      var visibleLayers = actualVisibleLayers.filter(function(item){
        return item.toString().trim().length == 0 || removeVisibleLayers.indexOf(item)>-1 ? false : true;
      });     
      wms.layerInfo.layerObject.setVisibleLayers(visibleLayersParent.concat(visibleLayers));      
    },

    _layerHasVisibleChild: function (visibleLayers, layer, that){
      var ret = -1;       
      if(layer.subLayers.length==0) ret = 1;
      array.forEach(layer.subLayers,function (layerInfo){      
          if ( visibleLayers.indexOf(layerInfo.name) > -1 ){            
            ret = that._layerHasVisibleChild(visibleLayers, layerInfo, that);            
          }
      });          
      return ret > 0 ;
    },
        
    _getLayerByName: function (name, layerInfos, that){
      var layer;
      array.forEach(layerInfos,function (layerInfo){
        if (!layer && layerInfo.name == name)
          layer = layerInfo;
        else if (!layer && layerInfo.subLayers)
          layer = that._getLayerByName(name, layerInfo.subLayers, that)
      });
      return layer;
    },
    
    _getNotVisibleParentLayers: function (visibleLayers, layer){
      var parentlayers = []; 
      if( layer.parentLayer && layer.parentLayer != null ){        
        if ( visibleLayers.indexOf(layer.parentLayer.name) == -1 )
          parentlayers.push(layer.parentLayer.name);
        if ( layer.parentLayer.parentLayer != null )  
          parentlayers = parentlayers.concat(this._getNotVisibleParentLayers(visibleLayers, layer.parentLayer.parentLayer))
      }
      return parentlayers;
    },
        
    //---------------new section-----------------------------------------
    // operLayer = {
    //    layerObject: layer,
    //    title: layer.label || layer.title || layer.name || layer.id || " ",
    //    id: layerId || " ",
    //    subLayers: [operLayer, ... ],
    //    wms: {"layerInfo": this, "subId": layerInfo.name, "wmsLayerInfo": layerInfo},
    // };

    drawLegends: function(legendsNode) {
      this._initLegendsNode(legendsNode);
    },

    _initLegendsNode: function(legendsNode) {
      if(this.originOperLayer.wms.wmsLayerInfo.legendURL) {
        var legendImg = domConstruct.create("img", {
          "class": "legend-div-image",
          "src": this.originOperLayer.wms.wmsLayerInfo.legendURL
        });
        on(legendImg, 'load', function(){
          domConstruct.empty(legendsNode);
          var legendDiv = domConstruct.create("div", {
            "class": "legend-div"
          }, legendsNode);
          html.place(legendImg, legendDiv);
        });
      } else {
        domConstruct.empty(legendsNode);
      }
    },
    //backgroundImage', "url(" + webMap.thumbnailUrl + ")"
    obtainNewSubLayers: function() {
      var newSubLayers = [];
      return newSubLayers;
    },

    getOpacity: function() {
    },

    setOpacity: function(opacity) {
      /*jshint unused: false*/
    },

    /****************
     * Event
     ***************/
    _bindEvent: function() {
      // because layerObject is WMS layer.
      // so does not call inherited(arguments),
      // so does not listen _onVisibilityChanged() for subLayer

      // So far, JS-API does not support event for 'visible-layers-change'
      // this.layerObject.on('visible-layers-change',
      //                       lang.hitch(this, this._onVisibleLayersChanged));
    },

    _onVisibleLayersChanged: function() {
    },

    getScaleRange: function() {
      return this.originOperLayer.wms.layerInfo.getScaleRange();
    }

  });
  return clazz;
});
