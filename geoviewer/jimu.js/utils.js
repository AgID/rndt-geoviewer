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
    './utilsOriginal',
    'esri/arcgis/utils',
    'jimu/portalUrlUtils',
    'dojo/Deferred',
    "esri/symbols/SimpleLineSymbol",
    'esri/symbols/SimpleMarkerSymbol',
    "esri/Color",
    "dojo/dnd/Moveable",
    "dojo/query",
    'dojo/on',
    "dojo/dom-class",
    "dojo/_base/array",
    "dojo/dom-construct",
    'dojo/dom-geometry',
    "dojo/_base/window",
    "dojo/dom-style",
    "dojo/_base/html",
    './utilsWMS',
  ],

function(lang, utilsOriginal, arcgisUtils, portalUrlUtils, Deferred, SimpleLineSymbol, SimpleMarkerSymbol, Color, Moveable, query, on, domClass, array, domConstruct, domGeom, baseWin, domStyle, html, utilsWMS) {
  /* global esriConfig, dojoConfig, ActiveXObject, testLoad */
  var mo = {};

  lang.mixin(mo, utilsOriginal);
  
    mo.geometryIsValid= function(graphics) {
      var ret = true;
      array.forEach(graphics, lang.hitch(this, function(item) { 
        if(!item.geometry){
          ret = false;
        }
        if(ret==false) 
          return;
        switch (item.geometry.type){
          case "polyline":
            if(item.geometry.paths.length==0){
              ret = false;
            }
            break;
          default:
            ret = true;
            break;
        }
      })); 
      return ret;
    };
  
  // extends function original
  mo.graphicsExtent = function(graphics, /* optional */ factor){
    if(this.geometryIsValid(graphics)==false){
      return null;
    }else{
      return utilsOriginal.graphicsExtent(graphics,factor);
    }
  };
  
   // override function original 
  mo.createAgsMap = function(webMap, mapDiv, /* optional */ options) {
    var def = mo.createWebMap("", "", mapDiv, options, webMap);   
    return def;
  };
  
  // override function original  
  mo.createWebMap = function(portalUrl, itemId, mapDiv, /* optional */ options, /* optional */ webMap) {
    var top,left,isMoveable;
    
    if(!document._handles) document._handles = {};
    
    on(document, "add-handle", function(event) {      
      document._handles[event.htype] = event.codes; 
    });
    on(document, "remove-handle", function(event) {      
      if(document._handles[event.htype])
        delete document._handles[event.htype];
    });   
    var handleEvent = on(document, "keyup", function(event) {
      
      if(event.keyCode===27 || event.keyCode===13){
        if(!document._handles)return;
        var order = ["close-popup","close-infowindow","close-widgets","close-widget-attribute-table"];
        array.every(order, lang.hitch(this, function(item) {           
          if(document._handles[item] && document._handles[item].indexOf(event.keyCode)>-1){        
              on.emit(document, item, {bubbles: true, cancelable: true});
              if(item!="close-widget-attribute-table")delete document._handles[item] ;   
              return false;
          }return true;
          
        }));       
      }

    });

    if(window._widgetManager.appConfig && window._widgetManager.appConfig.eiDisableSelect){
    /* DISABLED TEXT SELECTION */
      function disableselect(e){
        return false
      }
      function reEnable(){
        return true
      }
      document.onselectstart= new Function ("return false")
      if (window.sidebar){
        document.onmousedown=disableselect
        document.onclick=reEnable
      }
    }
    
    //var arcgisUrlOld = arcgisUtils.arcgisUrl;
    var def2 = new Deferred();
    var def;
    if(!webMap){
      portalUrl = portalUrlUtils.getStandardPortalUrl(portalUrl);
      var itemUrl = portalUrlUtils.getBaseItemUrl(portalUrl);
      arcgisUtils.arcgisUrl = itemUrl;
      def = arcgisUtils.createMap(itemId, mapDiv, options);
    }else{
      def = arcgisUtils.createMap(webMap, mapDiv, options);
    }    
        
    def.then(lang.hitch(this, function(response) {
      var col = new Color([ 255, 102, 0, 0.5]);
      var lineSym = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        col,
        10
      );
      var markerSym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, lineSym,col);
      var map = response.map;
      
      map.infoWindow.fillSymbol.outline.color = col;
      map.infoWindow.lineSymbol = lineSym;
      map.infoWindow.markerSymbol= markerSym;      
      map.infoWindow.anchor = "auto";
      
      var infoWindowWidth = 350;
      var infoWindowHeight = 320;
      if(window._widgetManager.appConfig && window._widgetManager.appConfig.identifyDimension &&
        dojo.isObject(window._widgetManager.appConfig.identifyDimension) &&
        window._widgetManager.appConfig.eiIdentifyDimension.width && window._widgetManager.appConfig.eiIdentifyDimension.height) {
        infoWindowWidth = window._widgetManager.appConfig.eiIdentifyDimension.width;
        infoWindowHeight = window._widgetManager.appConfig.eiIdentifyDimension.height;
      }
      
      
      map.infoWindow.resize(infoWindowWidth, infoWindowHeight);
      
      var that = this;
      on(document, "close-infowindow", function(event) {
        if(map.infoWindow.isShowing){            
           map.infoWindow.hide(); 
           event.stopImmediatePropagation();
        };
      });
      
      //var maxButton = query(".titleButton.maximize", map.infoWindow.domNode)[0];
      //domStyle.set(maxButton,"display","hidden"); 
      on(map, 'click', function(evt) { 
        if(map.infoWindow) map.infoWindow["ordered"] = null;             
        utilsWMS.setFeatureInfo(map, evt);
      });  
      
      on(map.infoWindow, 'selection-change', function(evt) {         
                                
        if(evt.target.features && evt.target["ordered"]==null){
            _hideContentInfowindow(map,true);          
        }
                
        window._viewerMap.infoWindow.resize(infoWindowWidth,infoWindowHeight);    
        setMovableInfoWindow(map,!isMoveable, left, top);
      }.bind(this));
      
      on(map.infoWindow, 'set-features', function(evt) { 
        left=null; top=null; isMoveable=false;  
              
        var main = query(".contentPane", map.infoWindow.domNode)[0];           
        var hide=false;
        if(main && evt.target.features){          
          if( evt.target.features && evt.target.features.length > 1 && !evt.target["ordered"] ){            
            hide=true;              
          }
          _hideContentInfowindow(map,hide);             
        }
        
        if(evt.target.features && evt.target.features.length > 1 && !evt.target["ordered"]){
             
          var features = evt.target.features.slice(0);     
          var featuresUnsorted = evt.target.features.slice(0);
          var orders = esriConfig.defaults.map.orderInfowindowTab || {};
          evt.target["ordered"]=true;
          console.log("Ordinamento evt.target.features: " + evt.target.features.length);
          for(var url in orders){
            if(url != "all"){          
              var minmax =_sortingFeaturesByUrl(features, url, orders[url]);
              if(minmax) {
                featuresUnsorted.splice(0,minmax[1]-minmax[0]);
              }              
            }
          }
          while ( (orders["all"] && orders["all"].length > 0) && featuresUnsorted.length > 0 ) { 
              var url;
              if(featuresUnsorted.length==features.length)url = "all";              
              else url = featuresUnsorted[0]._layer && featuresUnsorted[0]._layer.url ? featuresUnsorted[0]._layer.url : "";                              
              
              var minmax =_sortingFeaturesByUrl(features, url, orders["all"]);
              if(minmax) {
                featuresUnsorted.splice(0,minmax[1]-minmax[0]);
              }   
              else featuresUnsorted=[];  //esco in caso di anolalie
          }
          console.log("Ordinamento features.length: " + features.length);
          evt.target.setFeatures(features);   
          map.infoWindow.show();    
                   
        }
        
        evt.target["ordered"]="finish";
        
        window._viewerMap.infoWindow.resize(infoWindowWidth,infoWindowHeight);
      }.bind(this));
      
      var handle = query(".title", map.infoWindow.domNode)[0];
      var dnd = new Moveable(map.infoWindow.domNode,{
          handle: handle
      });
    
      domConstruct.place(map.infoWindow.domNode, document.body);
      
      // when the infoWindow is moved, hide the arrow:
      on(dnd, 'FirstMove', function(evt) {      
          setMovableInfoWindow(map);                                
      }.bind(this));
      
      on(dnd, 'Moved', function() {
        checkPositionInfoWindow(map,dnd);
        var node = query(".esriPopupWrapper",map.infoWindow.domNode)[0];
        var posP = domGeom.position(node);
        
        top = Math.round(posP.y);
        left = Math.round(posP.x);
        
        if(query(".pointer.top, .pointer.topRight, .pointer.topLeft",node).length>0){
          top -= Math.round(node.offsetTop);
          
          if(query(".pointer.topRight",node).length>0){
            left += Math.round(posP.w) - Math.round(node.offsetWidth + node.offsetLeft) ;
          }else if(query(".pointer.topLeft",node).length>0){
            left += Math.round(node.offsetLeft*-1);
          }else{
            left += Math.round(posP.w)/2;
          }
        }else if(query(".pointer.bottom, .pointer.bottomRight, .pointer.bottomLeft",node).length>0){
          top += Math.round(node.offsetHeight)-(node.offsetTop+node.offsetHeight);
          
          if(query(".pointer.bottomRight",node).length>0){
            left += Math.round(posP.w) - Math.round(node.offsetWidth + node.offsetLeft) ;
          }else if(query(".pointer.bottomLeft",node).length>0){
            left += Math.round(node.offsetLeft*-1);
          }else{
            left += Math.round(posP.w)/2;
          }
                    
        }else if(query(".pointer",node).length>0){
          top += Math.round(posP.h)/2;
          left -= Math.round(node.offsetLeft);
        }
                
        isMoveable = true;   
      }.bind(this));
      
     on(map.infoWindow, "show", lang.hitch(this, 
      function  (evt){
        setMovableInfoWindow(map,true);
        window._viewerMap.infoWindow.resize(infoWindowWidth,infoWindowHeight);
        
        document._handles["close-infowindow"] = [27];         
        
        var arrowNode =  query(".outerPointer", map.infoWindow.domNode)[0];
        if(arrowNode) domStyle.set(arrowNode,"display",""); 
        
        var arrowPoint =  query(".pointer", map.infoWindow.domNode)[0];
        if(arrowPoint) domStyle.set(arrowPoint,"display","");
          
        var anchor = checkBestPositionInfoWindow(map);
        if (anchor && map.infoWindow.anchor != anchor && map.infoWindow.getSelectedFeature()){
            //mo._handler.remove();
            /* ****************************************************************************** */

            var geometry = map.infoWindow.getSelectedFeature().geometry;
            var geoType = geometry.type;
            var centerPoint, extent;

            if(geoType === 'point' || geoType === 'multipoint'){

              if(geoType === 'point'){
                centerPoint = geometry;
              }
              else if(geoType === 'multipoint'){
                if(geometry.points.length === 1){
                  centerPoint = geometry.getPoint(0);
                  singlePointFlow();
                }
                else if(geometry.points.length > 1){
                  extent = geometry.getExtent();
                  if(extent){             
                    centerPoint = geometry.getPoint(0);
                  }
                }
              }
            }
            else if(geoType === 'polyline'){                  
              if(geometry.paths.length>0){
                extent = geometry.getExtent();        
                var i = parseInt(geometry.paths[0].length/2)  
                var p = geometry.paths[0][i];
                centerPoint = new esri.geometry.Point(p[0],p[1],map.spatialReference);            
              }
              if(!centerPoint && extent){                        
                centerPoint = extent.getCenter();              
              }              
            }
            else if(geoType === 'polygon'){
              centerPoint = extent.getCenter();
            }
            else if(geoType === 'extent'){
              centerPoint = extent.getCenter();
            }
            
            map.infoWindow.hide();
            map.infoWindow.anchor = anchor;
            map.infoWindow.show(centerPoint);
            
            if(typeof map.infoWindow.reposition === 'function'){
              map.infoWindow.reposition();
            }
            /* ****************************************************************************** */                       
            //mo._handler = on(map.infoWindow, "show", lang.hitch(that, onShowInfowindow), "added");
            //map.infoWindow.anchor = anchor;
        }
      }

     ));
     
     on(map.infoWindow, "hide", lang.hitch(this, 
     function (evt){
        left=null; top=null; isMoveable=false;
        evt.target["ordered"]=null;
        delete document._handles["close-infowindow"]; 
     }));
     
    /*
     var prev = query(".prev", map.infoWindow.domNode);
     var next = query(".next", map.infoWindow.domNode);
     on(prev,'mousedown', lang.hitch(this,_onSelectChange,map.infoWindow) );
     on(next,'mousedown', lang.hitch(this,_onSelectChange,map.infoWindow) );
     
      function _onSelectChange(infoWindow, evt){;
      };
     */
      
      def2.resolve(response);
      
    }), lang.hitch(this, function(error) {
      console.log("Error: ", error.code, " Message: ", error.message);
      def2.reject();
    }));
        
    return def2;
    
  };
      
  //mo._handler = null ;
  
  _attributeLog = function (title,features,orders){
    console.log(title);          
    array.forEach(features, lang.hitch(this, function(feature) {
      var l="";
      array.forEach(orders, lang.hitch(this, function(order) {
        l += "[" + order + "]:" + feature.attributes[order.trim().toUpperCase().replace(" ASC","").replace(" DESC","")] + " ";
      }));
      console.log(l);
    }));
  };  

  _sortingFeaturesByUrl = function (features_i, url, orders) {   
      var minmax;
      if(url != "all") minmax = _getFeaturesPositionByUrl(features_i,url);
      else minmax = [0,features_i.length];
      
      if( minmax[0] > -1){                      
        // get features by index              
        var featuresByUrl = features_i.slice(minmax[0],minmax[1]);
        // remove this features from remainder 
        //featuresUnsorted.splice(minmax[0],minmax[1]);
        if(featuresByUrl.length>1){
          // sort features
          console.log("Ordinamento: " + url);
          _attributeLog("Ordinamento: prima", featuresByUrl,orders); 
          featuresByUrl.sort(_dynamicSortMultiple(orders));    
          _attributeLog("Ordinamento: dopo", featuresByUrl,orders); 
          // reposition feature ordinate
          for(var i = Number(minmax[0]) ; i< Number(minmax[1]-minmax[0]) ; i++){
            features_i[i] = featuresByUrl[i-Number(minmax[0])];
          }
        }  
        //features_i.splice(Number(minmax[0]) , Number(minmax[1]-minmax[0]) , featuresByUrl );               
        return minmax;
      }else{
        return null;
      }        
  };
  
  _hideContentInfowindow = function (map,hide){
      var main = query(".contentPane", map.infoWindow.domNode)[0];    
      var div = dojo.byId("infowindowMessageLoadingCustom");
      if(!div && main && hide){
        div = domConstruct.create("div",{ id:'infowindowMessageLoadingCustom', innerHTML: window.jimuNls.loadingShelter.loading, style : 'text-align:center', cssClass : "infowindowMessageLoadingCustom" });  
        domStyle.set(div,"backgroundColor", domStyle.get(main,"backgroundColor") );        
        domConstruct.place(div, main, "before");        
      }        
      if(main){      
          domStyle.set(main,"height", (hide?"0px":"") );
          domStyle.set(main,"overflow", (hide?"hidden":"") );
          if(div){
            domStyle.set(div,"visibility", (hide?"":"hidden") );
            domStyle.set(div,"height", (hide?"":"0px") );
            domStyle.set(div,"padding", (hide?"2px":"") );
          }  
          array.forEach(main.childNodes, lang.hitch(this, function(node) {
            domStyle.set(node,"visibility", (hide?"hidden":"inherit") );
          })); 

      }  
  };
  
  _getFeaturesPositionByUrl = function (features_m,url) { 
    var min = -1;
    var max = -1;
    array.forEach(features_m, lang.hitch(this, function(feature,index) {
        if(feature._layer && feature._layer.url && feature._layer.url==url){
          if( min==-1) {min=index;max=index;}
          else {max=index;}
        }  
    }));
    return [min,max+1];
  };
  
  _dynamicSort = function (property, orderDesc) { 
      return function (obj1,obj2) {
          if( !obj1.attributes.hasOwnProperty(property) ) return !obj2.attributes.hasOwnProperty(property) ? 0 : -1; 
          if( !obj2.attributes.hasOwnProperty(property) ) return !obj1.attributes.hasOwnProperty(property) ? 0 : 1;            
          return obj1.attributes[property] > obj2.attributes[property] ? (orderDesc ? -1 : 1)
              : obj1.attributes[property] < obj2.attributes[property]  ? (orderDesc ? 1 : -1) : 0;
      }
  };
  
  _dynamicSortMultiple = function() {
      /*
       * save the arguments object as it will be overwritten
       * note that arguments object is an array-like object
       * consisting of the names of the properties to sort by
       */
      var props = arguments && arguments[0] instanceof Array ? arguments[0] : arguments;
      return function (obj1, obj2) {
          var i = 0, result = 0, numberOfProperties = props.length;
          /* try getting a different result from 0 (equal)
           * as long as we have extra properties to compare
           */
          while(result === 0 && i < numberOfProperties) {
              var orderDesc = (props[i].split(" ").length > 1 && props[i].split(" ")[1].toUpperCase()=="DESC") ? true : false ;
              var prop = props[i].trim().toUpperCase().replace(" ASC","").replace(" DESC","");
              result = _dynamicSort(prop, orderDesc)(obj1, obj2);
              i++;
          }
          return result;
      }
  };
  
  setMovableInfoWindow = function (map, anchored, left, top){
    // hide pointer and outerpointer (used depending on where the pointer is shown)    
    if(!anchored && left && left){      
      domStyle.set(map.infoWindow.domNode,"left",left+"px");              
      domStyle.set(map.infoWindow.domNode,"top",top+"px");            
    }
    
    var arrowNode =  query(".outerPointer", map.infoWindow.domNode);    
    array.forEach(arrowNode, lang.hitch(this, function(item) { 
      if(!anchored) {domStyle.set(item,"visibility","hidden");} 
      else {
        domStyle.set(item,"position","absolute");
        domStyle.set(item,"visibility","inherit");
      } 
    }));  
    
    var arrowPoint =  query(".pointer", map.infoWindow.domNode);
    array.forEach(arrowPoint, lang.hitch(this, function(item) { 
      if(!anchored) {domStyle.set(item,"visibility","hidden");} 
      else {     
        domStyle.set(item,"visibility","inherit");
        domConstruct.place(domConstruct.create("div"), item, "only");
      } 
    })); 
    
  };
    
  checkBestPositionInfoWindow = function(map){
    var node = query(".esriPopupWrapper",map.infoWindow.domNode)[0];
    var pos = domGeom.position(node);
    var ret = "left";    
    if (pos.x > (map.width-pos.w)){//controllo right
      ret = "right";
    }
    if( pos.x < 0){// controllo left
      ret = "left";
    } 
    if( pos.y < 0){// controllo top
      ret = "upper" + ret;
    }
    else if (pos.y > (map.height-pos.h)){//controllo bottom
      ret = "lover" + ret;
    }                
    
    return ret.length > 5 ? ret : "auto";     
    /*
    ANCHOR_LOWERLEFT
    ANCHOR_LOWERRIGHT
    ANCHOR_UPPERLEFT
    ANCHOR_UPPERRIGHT
    */
  };
   
  checkPositionInfoWindow = function (map, dnd){
  
      var node = query(".esriPopupWrapper",map.infoWindow.domNode)[0];
      var pos = domGeom.position(node);
      
      var nodeCoords = dojo.coords(map.infoWindow.domNode);
      var dojoCoordPos = dojo.coords(node);
      
      var bodyH = html.getStyle(document.body,"height");
      var inIframe = false;
      var iframeInfo = {x: null, y:null};
      var bodyIframeDiff = {h:0, w:0};
      if(window.self !== window.top) {
        inIframe = true;
        var iframeCoords = dojo.coords(window.parent.document.body);
        var iframeElement = dojo.coords(window.document.body);
        bodyIframeDiff.h = iframeCoords.h - bodyH + iframeCoords.y-iframeCoords.t;
      }
      
            
      if (pos.x > (map.width-pos.w)){//controllo right
        domStyle.set(dnd.node,"left",(html.getStyle(dnd.node, "left")-(pos.x - (map.width-pos.w)) + "px"));              
      }
      if(inIframe){
        if ((parseInt(pos.y+pos.h)) > (bodyH)){
          domStyle.set(dnd.node,"top",(-dojoCoordPos.t+(bodyH-pos.h))  + "px");
        }
      }else{
        if ((nodeCoords.y + pos.h)> (bodyH-dojoCoordPos.t))domStyle.set(dnd.node,"top",bodyH-(pos.h+dojoCoordPos.t)  + "px");
      }
      
      
      if( pos.x < 0){// controllo left
        domStyle.set(dnd.node,"left",(html.getStyle(dnd.node, "left")-(pos.x)) + "px");         
      }           
      if( pos.y < 0){// controllo top
        domStyle.set(dnd.node,"top",(html.getStyle(dnd.node, "top")-(pos.y)) + "px");  
      }
          
  };
  
  return mo;
  
});