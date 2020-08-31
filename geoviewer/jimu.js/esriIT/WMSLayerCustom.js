define(["dojo/_base/declare","dojo/_base/lang","dojo/has","esri/kernel", "esri/layers/WMSLayer", "esri/layers/WMSLayerInfo", "esri/geometry/Extent"], function(declare, lang, has, kernel, WMSLayer, WMSLayerInfo, Extent){
  return declare(WMSLayer, {
 
    constructor: function(url,parameters){
      dojo.mixin(this, parameters);
      dojo.connect(this,'setVisibleLayers',this.pushVisibleLayer);
      
	  //initialize custom class properties for style and sublayers handling
	  this.layerUrl = url;
	  this.myVisibleLayerList = new Array();
	  this.myStyleList = new Array();
	  this.mylayerInfos = new Array(); 
	  this.myCRS = "";  
      this.myBaseLayerStyleList = new Array(); //Structure: {{name:name1,style:style1},{name:name2,style:style2},...}
      this.mySelectedLayerStyleList = new Array(); //Structure: {{name:name1,style:style1},{name:name2,style:style2},...}
	  this.getMapParams = {
		  request: "GetMap",
		  version: "1.3.0",
		  layers: "",
		  styles: "",	
		  format: "image/png",
          resourceInfo: "",
          visibleLayers: "",
		  transparent: true
	  };

      if(!this.getMapParams.resourceInfo && this.getMapParams.resourceInfo!=''){
          this.setResourceInfo();
      }

	 // this.loaded = true;
     // this.onLoad(this);
    },
    
/*    addVisibleLayer: function(e){
        if(this.myVisibleLayer==null){
            this.myVisibleLayer = e;	
        }
    },
*/

    addResource: function(layer,map){
        /*var visible = dojo.clone(layer.visibleLayers);
        var layerInfos = dojo.clone(layer.layerInfos);
        var id = dojo.clone(layer.id);

        var arrayLayer = new Array();

        if(visible.length >0){
            for(var i=0;i<visible.length;i++){
                arrayLayer.push(new WMSLayerInfo({
                    name: visible[i],
                    title: layerInfos[i].title
                }))
            }
        }

        var resourceInfo = {
            extent: map.extent,
            layerInfos: arrayLayer
        };

        layer = new WMSLayer(this.layerUrl, {
            resourceInfo: resourceInfo,
            visibleLayers: visible
        });

        layer.id = id;*/

        return layer;
    },

    setResourceInfo: function(){
        var visible = this.getMapParams.visibleLayers;
        var arrayLayer = new Array();

        if(visible.length >0){
            for(var i=0;i<visible.length;i++){
                arrayLayer.push(new WMSLayerInfo({
                    name: visible[i],
                    title: 'Layer '+visible[i]
                }))
            }
        }

        this.getMapParams.resourceInfo = {
            layerInfos: arrayLayer
        };
    },

    hideAll: function(){
        this.setVisibleLayers([]);
    },
    
    showAll: function(){
        if(this.myVisibleLayerList!=null){
            this.setVisibleLayers(this.myVisibleLayerList);
        }
    },
	
	pushStyle: function(s){  //add the single style "s" to the list of styles to be inserted into GetMap request
        if(s!=null){
          this.myStyleList.push(s);
        }
    },

	cleanupStyleList: function(){  //remove style list
		  this.myStyleList.splice(0,this.myStyleList.length);
    },
	
	pushVisibleLayer: function(l){   //add the name of the single layer "l" to the list of layernames to be inserted into GetMap request
        if(l!=""){
          this.myVisibleLayerList.push(l);
        }
	},
	
	addSelectedLayerStyle: function(l,s){  //add a couple LayerName-Style to the list
		var tmpCouple = {name:l, style:s};
		this.mySelectedLayerStyleList.push(tmpCouple);
	},

	removeSelectedLayerStyle: function(l){  //remove a couple LayerName-Style from the list
		var idx = -1;
		dojo.forEach(this.mySelectedLayerStyleList,function(itemOfList, indexOfList){
			if(itemOfList.name == l) idx = indexOfList;
		});
		if(idx != -1) this.mySelectedLayerStyleList.splice(idx,1); 
	},

	updateSelectedStyle: function(s,l){  //change the Style associated to layer "l"
		var idx = -1;
		dojo.forEach(this.mySelectedLayerStyleList,function(itemOfList, indexOfList){
			if(itemOfList.name == l) idx = indexOfList;   
		});
		if(idx != -1) this.mySelectedLayerStyleList[idx].style = s;
	},

	cleanupSelectedLayerStyleList: function(){  //remove selected layer-style list
		  this.mySelectedLayerStyleList.splice(0,this.mySelectedLayerStyleList.length);
    },
	
	setStylesForGetMap: function(){   //generate the string of styles to be inserted into GetMap request
		var that = this;
		var stringStyles = "";
		dojo.forEach(this.mySelectedLayerStyleList,function(itemOfList,indexOfList){
			dojo.forEach(that.mylayerInfos,function(itemlyr,indexlyr){
				if(itemlyr.id == itemOfList.name){
					if(itemlyr.hasChildren == false) stringStyles += (itemOfList.style == undefined )? "," : itemOfList.style + ","; 
				}
			});
		});
		this.getMapParams.styles = stringStyles.substring(0,stringStyles.length-1); //eliminate last "," from string
    },	

	setLayersForGetMap: function(){   //generate the string of visible layer names to be inserted into GetMap request
		var that = this;
		var stringLayers = "";
		dojo.forEach(this.mySelectedLayerStyleList,function(itemOfList,indexOfList){
			dojo.forEach(that.mylayerInfos,function(itemlyr,indexlyr){
				if(itemlyr.id == itemOfList.name){
					if(itemlyr.hasChildren == false) stringLayers += itemOfList.name + ",";
				}
			});
		});
		this.getMapParams.layers = stringLayers.substring(0,stringLayers.length-1); //eliminate last "," from string
    },	
		
	getImageUrl: function(extent, width, height, callback) {
	  //dynamic values of GetMap parameters
	  this.getMapParams.bbox = extent.xmin + "," + extent.ymin + "," + extent.xmax + "," + extent.ymax;
	  this.getMapParams.crs = (extent.spatialReference.wkid == 102100) ?  this.myCRS : "EPSG:"+ extent.spatialReference.wkid;
	  this.getMapParams.width = width;
	  this.getMapParams.height = height;
	  this.getMapParams.exceptions = "blank";
	  
	  var params = this.getMapParams;
	  var elementForUrl = '?';
	  if(this.getMapURL.indexOf('?')!=-1){
		elementForUrl = '&';
	  }
	  var getMapURLwithStyles = this.getMapURL + elementForUrl + dojo.objectToQuery(params);
	  callback( getMapURLwithStyles );
	}	
  });
});
