define([
    "dojo/_base/declare","dojo/_base/lang", "esri/layers/VectorTileLayer","dojo/_base/window","dojo/dom-construct","esri/dijit/BasemapGallery",
    "esri/layers/OpenStreetMapLayer","esri/layers/ArcGISTiledMapServiceLayer"
  ],

function(declare,lang,VectorTileLayer,win,domConstruct,BasemapGallery,
         OpenStreetMapLayer,ArcGISTiledMapServiceLayer) {
      
    var classObj = declare(null, {
        
        idDefaultBasemap: "defaultBasemapArcgis",
        
        getList: function(){
            if(this.__standardUrl) this._standardUrlInit();
        },
        
        getBasemapUrl: function(type) {
            
            switch(type){
                case "streets":
                    return "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer";
                break;
                case "satellite":
                    return "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
                break;
                case "hybrid":
                    return [
                            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
                            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer"
                    ];
                break;
                case "topo":
                    return "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer";
                break;
                case "gray":
                    return "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer";
                break;
                case "dark-gray":
                    return "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer";
                break;
                case "oceans":
                    return "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer";
                break;
                case "national-geographic":
                    return "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer";
                break;
                case "terrain":
                    return "https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer";
                break;
                case "dark-gray-vector":
                    return "https://www.arcgis.com/sharing/rest/content/items/850db44b9eb845d3bd42b19e8aa7a024/resources/styles/root.json";
                break;
                case "gray-vector":
                    return "https://www.arcgis.com/sharing/rest/content/items/0e02e6f86d02455091796eaae811d9b5/resources/styles/root.json";
                break;
                case "streets-vector":
                    return "https://www.arcgis.com/sharing/rest/content/items/4e1133c28ac04cca97693cf336cd49ad/resources/styles/root.json";
                break;
                case "streets-night-vector":
                    return "https://www.arcgis.com/sharing/rest/content/items/bf79e422e9454565ae0cbe9553cf6471/resources/styles/root.json";
                break;
                case "streets-relief-vector":
                    return "https://www.arcgis.com/sharing/rest/content/items/2e063e709e3446459f8538ed6743f879/resources/styles/root.json";
                break;
                case "streets-navigation-vector":
                    return "https://www.arcgis.com/sharing/rest/content/items/dcbbba0edf094eaa81af19298b9c6247/resources/styles/root.json";
                break;
                case "topo-vector":
                    return "https://www.arcgis.com/sharing/rest/content/items/6f65bc1351b7411588a8cb43fe23dad7/resources/styles/root.json";
                break;
                default:
                    return "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer";
                break;
            }
                    
        },
        
        getDefaultBasemapObject: function(){
            return {
                    "id": this.idDefaultBasemap,
                    "opacity": 1,
                    "visibility": false,
                    "url": this.getBasemapUrl("dark-gray")
            };
        },
        
        addExtraLayer: function(data,map){
            
            var dataOptions = dojo.clone(data);
            delete dataOptions.url;
            var layer;
            
            if(data.type && data.type == "osm") {
                layer = new OpenStreetMapLayer(dataOptions);                
            }else if(data.type && !data.url){
                if(data.type.search("vector")==-1) layer = new ArcGISTiledMapServiceLayer(this.getBasemapUrl(data.type), dataOptions);
                else layer = new VectorTileLayer(this.getBasemapUrl(data.type), dataOptions);
            }else if(data.type && data.type == "vector" && data.url){
                layer = new VectorTileLayer(data.url, dataOptions);
            }
            
            layer._basemapGalleryLayerType = "basemap";
			
			/*
			
			esriitalia fix basemap
			
			*/
			var n = domConstruct.place("<div id='boxGalleryNone' style='display:none;'></div>", win.body());
			var basemapGallery = new BasemapGallery({map:map}, n);
			basemapGallery.startup();
			
			setTimeout(function(){
				var find = dojo.query('#galleryNode_basemap_0 > a');
				
				if(find.length != 0){
					
	
					find[0].id= "clickEventGalleryCustom";
					
					
					var evObj = document.createEvent('MouseEvents');
					evObj.initMouseEvent('click', true, true, window);
					find[0].dispatchEvent(evObj);
						
					//document.getElementById('clickEventGalleryCustom').dispatchEvent( new Event('click') );
					//find[0].click();
					
					
					
					
					
				}
				
			},1000);
			dojo.byId("boxGalleryNone").style.display = "none";
			
			/* fine */
			
			
			
			
			
			map.addLayer(layer);
            
        },
        
        addVectorLayer: function(data,map){
            var dataOptions = dojo.clone(data);
            var layer = new VectorTileLayer(data.url, dataOptions);
            layer._basemapGalleryLayerType = "basemap";
            map.addLayer(layer);
        }
        
    });
    return new classObj();

});  
 