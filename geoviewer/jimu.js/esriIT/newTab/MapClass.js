define([
		"dojo/_base/declare","dijit/form/Button","dojo/_base/lang",
        "dojo/dom-construct", "esri/map", "esri/tasks/query", "esri/tasks/QueryTask",
         "jimu/esriIT/attributeTableUtils"
	], function (
		declare,Button,lang,
       domConstruct,Map, Query,QueryTask,
       AttributeTableUtils) {
    //,[Map]
	return declare("jimu/esriIT/MapClass",null, {        
        map:null,
        window:null,
        windowChild:null,
        
        
        attributeTableUtilsInstance:null,
        constructor:function(windowChild, map){
            this.windowChild=windowChild;
            this.map=map;

            /* var optionsMap={
               attributionWidth:options.attributionWidth || 0.45,
                autoResize:options.autoResize || true,
                basemap:options.baseMap || "topo",
                center:options.center || [-94.75290067627297, 39.034671990514816],
                displayGraphicsOnPan:options.displayGraphicsOnPan || true,
                //extent:options.extent || ,
                fadeOnZoom:options.fadeOnZoom || true,
                fitExtent:options.fitExtent|| true,
                force3DTransforms: options.force3DTransforms || true,*/
                //infoWindow:options.infoWindow || null,
                /*lods:options.lods || [],
                logo: options.logo || true,
                maxScale: options.maxScale || 0,
                maxZoom: options.maxZoom || -1,
                minScale: options.minScale || 0,
                minZoom: options.minZoom || -1,
                //nav: options.nav ||  ,
                navigationMode: options.navigationMode || "css-transforms",
                optimizePanAnimation: options.optimizePanAnimation || true,
                resizeDelay: options.resizeDelay ||300,
                //scale: options.scale ||,
                showAttribution: options.showAttribution || true ,
                showInfoWindowOnClick: options.showInfoWindowOnClick || true,
                showLabels : options.showLabels || false ,         
                slider: options.slider || true,
                sliderLabels: options.sliderLabels || null,
                sliderOrientation: options.sliderOrientation || null,
                sliderPosition: options.sliderPosition || null,
                sliderStyle: options.sliderStyle || null ,
                smartNavigation: options.smartNavigation || true ,
                wrapAround180: options.wrapAround180|| true ,
                //zoom: options.zoom ||,
                
            };*/
              // this.map=new windowChild.esri.Map(id,options);
            //this.attributeTableUtilsInstance = new AttributeTableUtils( this ); 
        },


        getTypeLayerOriginal : function(typeLayer){
          var typeLayerOriginal="";
          if (typeLayer.indexOf("ArcGISGraphicsLayer")>1) {
            typeLayerOriginal= "ArcGISGraphicsLayer";
          }
          else if (typeLayer.indexOf("ArcGISDynamicMapServiceLayer")>1) {
            typeLayerOriginal= "ArcGISDynamicMapServiceLayer";
          }
          else if (typeLayer.indexOf("ArcGISTiledMapServiceLayer")>1) {
            typeLayerOriginal= "ArcGISTiledMapServiceLayer";
          }
          else if (typeLayer.indexOf("ArcGISFeatureLayer")>1) {
            typeLayerOriginal= "ArcGISFeatureLayer";
          }
         return typeLayerOriginal;
          
        },
        
        
        getLayer:function(typeLayer, url, params,infoTemplates){            
            
            var layer;
            var typeLayerModified=this.getTypeLayerOriginal(typeLayer);
            switch (typeLayerModified) {
                case "ArcGISGraphicsLayer":
                    var GraphicsLayer=this.windowChild.dojo.require("esri.layers.GraphicsLayer");
                    layer=new GraphicsLayer(params);
                    layer.setInfoTemplate(infoTemplates);
                    break;
                case "ArcGISDynamicMapServiceLayer":
                    /*var ArcGISDynamicMapServiceLayer= that.newWindow.dojo.require("esri.layers.ArcGISDynamicMapServiceLayer");
                    that.newWindow.serviceLayer = new ArcGISDynamicMapServiceLayer("http://demo.esriitalia.it/arcgis/rest/services/Milano/aggressioni/MapServer/", layerOptions);
                      */         
                    
                    
                    var ArcGISDynamicMapServiceLayer=this.windowChild.dojo.require("esri.layers.ArcGISDynamicMapServiceLayer");
                    layer=new ArcGISDynamicMapServiceLayer(url,params);
                    //layer.setInfoTemplates(infoTemplates);
                    return layer;
                    break;
                case "ArcGISTiledMapServiceLayer":
                     var ArcGISTiledMapServiceLayer=this.windowChild.dojo.require("esri.layers.ArcGISTiledMapServiceLayer");
                      layer=new ArcGISTiledMapServiceLayer(url,params);
                      layer.setInfoTemplates(infoTemplates);
                      
                    break;
                case "ArcGISFeatureLayer":
                     var FeatureLayer=this.windowChild.dojo.require("esri.layers.FeatureLayer");
                     layer=new FeatureLayer(url,params);
                     layer.setInfoTemplate(infoTemplates);
                    
                    break;              
                default:
                    var GraphicsLayer=this.windowChild.dojo.require("esri.layers.GraphicsLayer");
                    layer=new GraphicsLayer(params);
                    layer.setInfoTemplate(infoTemplates);
                break;
            }
            
                          
           //this.map.addLayer(layer);
            
        },
        
        searchLayerByUrl:function(url){
            for(var j = 0; j < this.map.layerIds.length; j++) {
                var layer = this.map.getLayer(this.map.layerIds[j]);
                if (layer.url==url) {
                    return layer;
               }
            }
                return null;
        },
        
        removeLayerByUrl:function(url){
            var layer=this.searchLayerByUrl(url);
            if (layer!=null) {
                this.map.removeLayer(layer);
                return true;
            }
          return false;// false se non esiste il layer
            
        },
        getMap:function(){
            
            return this.map;
        },
        executeQuery:function(urlLayer,params){
            
            //params tutti i campi delle query 
            
            var qt= new QueryTask(urlLayer);
            var query = new Query();
            query.returnDistinctValues = false;
            query.returnGeometry = false;
            query.outFields = ["*"];
            query.where=params;
            qt.execute(query,
            lang.hitch(this, this.handleQueryResults), this.queryFailureCallback);
        },
         handleQueryResults: function(results) {
             console.log("results="+results);
             var columns=results.fieldsAliases;
             //var data=results.features[0].attributes;
             var layerUrl="";
             var tabTitle="prova_api_tab";
             var tabInternalName="prova_api_tab_custom";
             
            var data = [];
            //var ObjectIdProperty = new esriItutils().getIdFieldName(singlesFields);
            for ( var s = 0; s < results.features.length; s++ ) {
                var row = results.features[s].attributes;
                
                data.push(row);
            }
             
             //collegalo all'AttributeTable
             //metodo esposti dell'attributeTable , apriTab, chiudiTab maxim
              /* this.attributeTableUtilsInstance.apriNuovoTab({
                    columns: columns,
                    data: data,
                    layerURL: layerUrl,  //
                    tabTitle: tabTitle,
                    tabInternalName: tabInternalName,
                    closable: true
                 });*/
             
             
             
             
          },
          queryFailureCallback: function(error) {
                console.log(error);
          }
    });
});