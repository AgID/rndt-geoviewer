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
    'dojo/_base/lang',
    "dojo/_base/array",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/geometry/Extent",
    "esri/InfoTemplate",
    "esri/tasks/ProjectParameters",
    "esri/SpatialReference",
    "esri/config",
    "dojo/request",
  ],

function(lang, array, Graphic, Point, Extent, InfoTemplate, ProjectParameters, SpatialReference, esriConfig, request) {
  /* global esriConfig, dojoConfig, ActiveXObject, testLoad */
  var mo = {};

  lang.mixin(mo);
  
  mo.getVisibleLayerQuerable = function (layer){     
    var retLayers=[];
    var getLayers = function (layerInfos, retInf){
      retInf=retInf ? retInf: [];
      array.forEach(layerInfos, lang.hitch(this, function(layerInf) { 
          if(layerInf.queryable && layerInf.name) retInf.push(layerInf.name); 
          if(layerInf.subLayers && layerInf.subLayers.length>0)
            retInf = retInf.concat(getLayers(layerInf.subLayers,retInf));
      }));
      return retInf;
    };
    var _layerQuerable = getLayers(layer.layerInfos);
    array.forEach(layer.visibleLayers, lang.hitch(this, function(layerVis) { 
        if(_layerQuerable.indexOf(layerVis)>-1) retLayers.push(layerVis);                   
    }));
    return retLayers;
  };
   
  mo.getLayerWkids = function (layer, layersName){ 
    if(!layer) return [];
    if(!layersName) layersName =  mo.getVisibleLayerQuerable(layer);
    var getCrs = function (layerInfos, retInf){
      retInf=retInf?retInf:[];
      array.forEach(layerInfos, lang.hitch(this, function(layerInf) { 
          if(layersName.indexOf(layerInf.name)>-1 && layerInf.spatialReferences ) {
            retInf = layerInf.spatialReferences;
            return; //exit loop
          }  
          if(layerInf.subLayers && layerInf.subLayers.length>0)
          retInf = retInf.concat(getCrs(layerInf.subLayers, retInf));
      }));
      return retInf;
    };    
    var ret = getCrs(layer.layerInfos);
    if(ret.length==0 && layer.allExtents){
      for (var extId in layer.allExtents){
        var extend = layer.allExtents[extId];
        if( extend.spatialReference && ret.indexOf(extend.spatialReference.wkid) == -1) ret.push(extend.spatialReference.wkid);
      }
    }    
    return ret;
  };
  
  mo.checkMapProjection = function (map, layer, layersName, crslayers){    
    if(!crslayers) crslayers = layer.spatialReferences || mo.getLayerWkids(layer, layersName);
    var ret = crslayers;
    var wkidsComparable = [[102100, 900913, 3857, 84 ]];
    wkidsComparable = getAppConfig().esriItalia ? getAppConfig().esriItalia.wkidsComparable || wkidsComparable : wkidsComparable ;    
    var getCompatibilityA = function (myWkid){
      var r=[];
      array.forEach(wkidsComparable, lang.hitch(this, function(wkids) { 
        if( wkids.indexOf(myWkid) > -1 ) {
          r = wkids;
          return;
        }
      }));
      return r;
    }
    var mapComp = getCompatibilityA(map.spatialReference.wkid);
    array.forEach(crslayers, lang.hitch(this, function(crs) {     
        if(mapComp.indexOf(crs)>-1){
          ret = crs;
          return;
        }  
    }));
    return ret;  
  };
  
  mo.executeFeatureInfo = function (map, extent, screenPoint, mapPoint, layer, queryLayers, wkid, mapPointMap){
    var urlGFI = layer.getFeatureInfoURL.indexOf("?") == -1 ? layer.getFeatureInfoURL + "?" : layer.getFeatureInfoURL ; 
    var parameter = {};
    var appConfig=getAppConfig();
    parameter["REQUEST"]="GetFeatureInfo";
    parameter["SERVICE"]="WMS";
    parameter["EXCEPTIONS"]="XML";
    parameter["VERSION"]=layer.version;
    parameter["LAYERS"]=queryLayers.toString(",");
    parameter["QUERY_LAYERS"]=queryLayers.toString(",");
    parameter["WIDTH"]=map.width;
    parameter["HEIGHT"]=map.height;
    parameter["CRS"]= "EPSG:"+wkid;
    parameter["BBOX"]=extent.xmin + "," + extent.ymin + "," + extent.xmax + "," + extent.ymax;
    //parameter["CRS"]= ([84].indexOf(wkid)>-1 ? "CRS:" : "EPSG:")+wkid;
   //parameter["CRS"]= (map.spatialReference.wkid==84 ? "CRS:" : "EPSG:")+map.spatialReference.wkid;
   //parameter["BBOX"]=map.extent.xmin + "," + map.extent.ymin + "," + map.extent.xmax + "," + map.extent.ymax;
    parameter["I"]=screenPoint.x;
    parameter["J"]=screenPoint.y;
    parameter["INFO_FORMAT"]=layer.featureInfoFormat ;                       
    
    var layersRequest = request( 
    (appConfig.httpProxy.useProxy && appConfig.httpProxy.url.length>0 ? appConfig.httpProxy.url + "?":"") + urlGFI,{ 
    "method":"GET",
    "query" : parameter,
    "handleAs" : layer.featureInfoFormat || "text/html" });
    layersRequest.then(lang.hitch(this, function(layer, response){        
        var graphic = new Graphic(mapPointMap,undefined,{"res":response.toString()}, new InfoTemplate(layer.title, "${res}"));
        var features = map.infoWindow.features || [];
        features.push(graphic); //features.splice(0,0,graphic);
        map.infoWindow.setFeatures(features);      
        if(!map.infoWindow.isShowing ) {
          map.infoWindow.show(mapPointMap, map.getInfoWindowAnchor(screenPoint));         
        }
    },layer), lang.hitch(this, function(error){
        if(wkid.indexOf("EPSG")==-1)
          mo.executeFeatureInfo(map, extent, screenPoint, mapPoint, layer, queryLayers, "EPSG:"+wkid, mapPointMap)
        else  
          console.error("ERROR: mo.setFeatureInfo", error);
    },extent, screenPoint, mapPoint, layer, queryLayers, wkid, mapPointMap));
  };
  
  mo.setFeatureInfo = function (map, evt){
      var appConfig = getAppConfig(); 
      array.forEach(map.layerIds, lang.hitch(this, function(layerId) { 
        var layer = map.getLayer(layerId);       
        
        if(layer.getFeatureInfoURL && layer.visible && layer.visibleLayers.length>0){    
            var queryLayers = mo.getVisibleLayerQuerable(layer);
            if(queryLayers.length>0 ) {              
              var wkidProj = mo.checkMapProjection(map, layer, queryLayers);
              if( wkidProj instanceof Array ){
                // layer da proiettare con geometryServer
                var wkid = null;
                if( getAppConfig().esriItalia && getAppConfig().esriItalia.WmsSrsProjectAccepted && getAppConfig().esriItalia.WmsSrsProjectAccepted.length>0){
                  array.forEach( wkidProj , lang.hitch(this, function(wkidn) { 
                    if( getAppConfig().esriItalia.WmsSrsProjectAccepted.indexOf(wkidn) > -1 ){
                      wkid = wkidn;
                      return;
                    }  
                  }));                 
                }else{
                  wkid = wkidProj[0];
                }
                if(!wkid) return;
                
                var params = new ProjectParameters();
                Point
                
                params.geometries = [
                  new Point(map.extent.xmin,map.extent.ymin,map.spatialReference), 
                  new Point(map.extent.xmax,map.extent.ymax,map.spatialReference), 
                  evt.mapPoint
                ];
                /*
                params.geometries = [
                  map.extent
                ];*/
                params.outSR = new SpatialReference(wkid);
                
                esriConfig.defaults.geometryService.project(params).then(lang.hitch(this, function(evt, layer, queryLayers, wkid, geometries) {                  
                  if(geometries.length==3) mo.executeFeatureInfo(
                  map, 
                  new Extent(geometries[0].x, geometries[0].y, geometries[1].x, geometries[1].y, geometries[0].spatialReference ), 
                  evt.screenPoint, geometries[2], 
                  layer, queryLayers, wkid, evt.mapPoint);
                  //if(geometries.length==1) mo.executeFeatureInfo(map,geometries[0] , evt.screenPoint, geometries[0].getCenter(), layer, queryLayers, wkid);
                }, evt, layer, queryLayers, wkid), function(err) {
                  console.error(err);                  
                });                

              }else{
                // layer comopatibile con la proiezione mappa                 
                mo.executeFeatureInfo(map, map.extent, evt.screenPoint, evt.mapPoint ,layer, queryLayers, wkidProj, evt.mapPoint);
              }
            }else{
              return;
            }
         } 
        
      }));
  };
 

  

  

  

  

    

   
 
  

    
  return mo;
   
});