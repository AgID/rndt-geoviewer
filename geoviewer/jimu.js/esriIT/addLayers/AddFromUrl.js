///////////////////////////////////////////////////////////////////////////
// Copyright © 2016 Esri. All Rights Reserved.
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
define(["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dojo/keys",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/dom-class",
    "dojo/window",
    "dijit/Viewport",
    "./LayerLoader",
    "./util",
	"jimu/esriIT/esriItutils",
	"dojo/i18n!./nls/strings",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/CSVLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/GeoRSSLayer",
    "esri/layers/ImageParameters",
    "esri/layers/KMLLayer",
    "esri/layers/StreamLayer",
    "esri/layers/VectorTileLayer",
    "esri/layers/WFSLayer",
    "esri/layers/WMSLayer",
    "esri/layers/WMTSLayer",
    "esri/InfoTemplate",
    "dijit/form/Select"
  ],
  function(declare, lang, array, on, keys, Deferred, all, domClass, win, Viewport,
    LayerLoader, util, esriItutils, i18n, ArcGISDynamicMapServiceLayer,
    ArcGISImageServiceLayer, ArcGISTiledMapServiceLayer, CSVLayer,
    FeatureLayer, GeoRSSLayer, ImageParameters, KMLLayer, StreamLayer,
    VectorTileLayer, WFSLayer, WMSLayer, WMTSLayer,
    InfoTemplate) {

    return declare([],{
		i18n: i18n,	
		
      add: function(map,type, layerUrl) {
		
		var dfd = new Deferred();  
        var self = this,
        ok = false;

        var url = lang.trim(layerUrl);
        if (url.length > 0) {
          if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
            ok = true;
          }
        }
        if (!ok) {
		  console.warn(i18n.search.item.messages.unsupported);  
		  dfd.reject();
          return;
        }
		console.log(i18n.search.item.messages.adding);
		this._handleAdd(dfd, map, type, url);
        
        dfd.then(function(result) {
          if (result) {
			console.log(i18n.search.item.messages.added);
          } else {
            console.warn(i18n.search.item.messages.addFailed);
          }
        }).otherwise(function(error) {
          if (typeof error === "string" && error === "Unsupported") {
			console.warn(i18n.search.item.messages.unsupported);  
          } else {
            console.warn(i18n.search.item.messages.addFailed);
            console.warn(error);
            if (error && typeof error.message === "string" && error.message.length > 0) {
              console.warn("msg",error.message);
            }
          }
        });
		return dfd;
      },

      _handleAdd: function(dfd, map, type, url) {

		esriItutils.enabledProxyForThisDeferred(dfd);
        url = util.checkMixedContent(url);
        var lc = url.toLowerCase();
        var loader = new LayerLoader();
        var id = loader._generateLayerId();
        var self = this,
          layer = null;
		type = (type || "").toUpperCase();
		
        if (type === "ARCGIS") {
          if (lc.indexOf("/featureserver") > 0 || lc.indexOf("/mapserver") > 0) {
            loader._readRestInfo(url).then(function(info) {
              //console.warn("restInfo",info);
              if (info && typeof info.type === "string" && info.type === "Feature Layer") {
                layer = new FeatureLayer(url, {
                  id: id,
                  outFields: ["*"],
                  infoTemplate: new InfoTemplate()
                });
                self._waitThenAdd(dfd, map, type, loader, layer);
              } else {

                if (lc.indexOf("/featureserver") > 0) {
                  var dfds = [];
                  array.forEach(info.layers, function(li) {
                    var lyr = new FeatureLayer(url + "/" + li.id, {
                      id: loader._generateLayerId(),
                      outFields: ["*"],
                      infoTemplate: new InfoTemplate()
                    });
                    dfds.push(loader._waitForLayer(lyr));
                  });
                  all(dfds).then(function(results) {
                    var lyrs = [];
                    array.forEach(results, function(lyr) {
                      lyrs.push(lyr);
                    });
                    lyrs.reverse();
                    array.forEach(lyrs, function(lyr) {
                      loader._setFeatureLayerInfoTemplate(lyr);
                      lyr.xtnAddData = true;
                      map.addLayer(lyr);
                    });
                    dfd.resolve(lyrs);
                  }).otherwise(function(error) {
                    dfd.reject(error);
                  });

                } else if (lc.indexOf("/mapserver") > 0) {
                  if (info.tileInfo) {
                    layer = new ArcGISTiledMapServiceLayer(url, {
                      id: id
                    });
                  } else {
                    var mslOptions = {id:id};
                    if (info && info.supportedImageFormatTypes &&
                        info.supportedImageFormatTypes.indexOf("PNG32") !== -1) {
                      mslOptions.imageParameters = new ImageParameters();
                      mslOptions.imageParameters.format = "png32";
                    }
                    layer = new ArcGISDynamicMapServiceLayer(url,mslOptions);
                  }
                  self._waitThenAdd(dfd, map, type, loader, layer);
                }
              }
            }).otherwise(function(error) {
              dfd.reject(error);
            });

          } else if (lc.indexOf("/imageserver") > 0) {
            layer = new ArcGISImageServiceLayer(url, {
              id: id
            });
            this._waitThenAdd(dfd, map, type, loader, layer);

          } else if (lc.indexOf("/vectortileserver") > 0 ||
            lc.indexOf("/resources/styles/root.json") > 0) {
            if (!VectorTileLayer || !VectorTileLayer.supported()) {
              dfd.reject("Unsupported");
            } else {
              loader._checkVectorTileUrl(url, {}).then(function(vturl) {
                //console.warn("vectorTileUrl",vturl);
                layer = new VectorTileLayer(vturl, {
                  id: id
                });
                self._waitThenAdd(dfd, map, type, loader, layer);
              }).otherwise(function(error) {
                dfd.reject(error);
              });
            }
          } else if (lc.indexOf("/streamserver") > 0) {
            layer = new StreamLayer(url, {
              id: id,
              purgeOptions: {
                displayCount: 10000
              },
              infoTemplate: new InfoTemplate()
            });
            this._waitThenAdd(dfd, map, type, loader, layer);

          } else {
            dfd.reject("Unsupported");
          }
        } else if (type === "WMS") {
          layer = new WMSLayer(url, {
            id: id
          });
          this._waitThenAdd(dfd, map, type, loader, layer);
        } else if (type === "WMTS") {
          //layer = new WMTSLayer(url, {
          //  id: id
          //});
		  alert('Il tipo di servizio "'+type+'" non è supportato');
        } else if (type === "WFS") {
          //layer = new WFSLayer({
           // id: id,
           // url: url,
          //  infoTemplate: new InfoTemplate()
          //});
          //this._waitThenAdd(dfd, map, type, loader, layer);
		  alert('Il tipo di servizio "'+type+'" non è supportato');
          //console.warn("WFSLayer", layer);
        } else if (type === "KML") {
          layer = new KMLLayer(url, {
            id: id
          });
          this._waitThenAdd(dfd, map, type, loader, layer);
        } else if (type === "GEORSS") {
          layer = new GeoRSSLayer(url, {
            id: id
          });
          this._waitThenAdd(dfd, map, type, loader, layer);
        } else if (type === "CSV") {
          layer = new CSVLayer(url, {
            id: id
          });
          layer.setInfoTemplate(loader._newInfoTemplate());
          this._waitThenAdd(dfd, map, type, loader, layer);
        }

      },


      _setStatus: function(msg) {
        if(this.wabWidget) {
          this.wabWidget._setStatus(msg);
        }
      },


      _updateExamples: function(type) {
        array.forEach(this.examplesNode.children, function(node) {
          var v = node.getAttribute("data-examples-type");
          if (typeof v === "string" && v.length > 0) {
            if (v === type) {
              node.style.display = "";
            } else {
              node.style.display = "none";
            }
          }
        });
      },

      _waitThenAdd: function(dfd, map, type, loader, layer) {
        //console.warn("_waitThenAdd",type,layer);
        var na;
        loader._waitForLayer(layer).then(function(lyr) {
          //console.warn("_waitThenAdd.ok",lyr);
          //var templates = null;
          if (type === "WMS") {
            loader._setWMSlayerInfosParentLayer(lyr.layerInfos,null,null);
            loader._setWMSVisibleLayers(lyr);
            lyr.on( "update-end", lang.hitch(this, loader._checkLayersNull ,lyr));                        
          } else if (lyr &&
            (lyr.declaredClass === "esri.layers.ArcGISDynamicMapServiceLayer" ||
            lyr.declaredClass === "esri.layers.ArcGISTiledMapServiceLayer")) {
            na = true;
            /*
            if (lyr.infoTemplates === null) {
              array.forEach(lyr.layerInfos, function(lInfo) {
                if (templates === null) {
                  templates = {};
                }
                templates[lInfo.id] = {
                  infoTemplate: new InfoTemplate()
                };
              });
              if (templates) {
                lyr.infoTemplates = templates;
              }
            }
            */
          } else if (lyr && lyr.declaredClass === "esri.layers.FeatureLayer") {
            loader._setFeatureLayerInfoTemplate(lyr);
          } else if (lyr && lyr.declaredClass === "esri.layers.CSVLayer") {
            loader._setFeatureLayerInfoTemplate(lyr);
          }
          lyr.xtnAddData = true;
          map.addLayer(lyr);
          dfd.resolve(lyr);
        }).otherwise(function(error) {
          //console.warn("_waitThenAdd.error",error);
          dfd.reject(error);
        });
      }

    });

  });
