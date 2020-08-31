///////////////////////////////////////////////////////////////////////////
// Copyright Â© 2014 Esri. All Rights Reserved.
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
  'dojo/_base/lang',
  'dojo/has',
  'esri/kernel',
  'esri/utils',
  'dojox/xml/parser',
  
  'esri/graphicsUtils',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/symbols/TextSymbol',
  'esri/symbols/Font',
  'esri/geometry/Polygon',
  'esri/geometry/Point',
  'esri/geometry/Multipoint',
  'esri/geometry/Polyline',
  'esri/graphic',
  'esri/Color',
  'dojo/_base/array',
  'dijit/form/Button',
  'dijit/form/DropDownButton',
  'dojox/widget/ColorPicker',
  'dijit/form/CheckBox',
  'dojox/collections/ArrayList',
  'dojo/on'
],
function(declare,lang,has,kernel,utils,parser, 
	 graphicsUtils,SimpleFillSymbol,SimpleLineSymbol,SimpleMarkerSymbol,TextSymbol,Font,
	 Polygon,Point,Multipoint,Polyline,Graphic,
	 Color,array,DataGrid,ItemFileWriteStore,Button,DropDownButton,ColorPicker,CheckBox,ArrayList,on){
	
	var classObj = declare(null,{
		

		/*
		*** PARAMS ***
		alpha: Numeric = value of alpha
		*** Return ***
		Color Object
		*/
		getRandomColor: function(alpha)
		{
			if (!alpha) alpha=1;
			var letters = '0123456789ABCDEF'.split('');
			var color = '#';
			for (var i = 0; i < 6; i++ ) {
			    color += letters[Math.floor(Math.random() * 16)];
			}
			var retColor = new Color.fromHex(color);
			retColor.a = alpha;
			return retColor;			
		},

		/*
		*** PARAMS ***
		features: Graphics		
		color: Color = Color of graphics		
		*/		
		setSymbol: function(feature, color){
			
			var myColor = color != null ? color : new Color(this.getRandomColor(1));
			var myColorFill = new Color([myColor.r, myColor.g, myColor.b, 0.50]);
			
			if(feature.geometry){			      
				if (feature.symbol==null) {
					
					var symLineFill = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, myColor, 2);
					var symPoly = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, symLineFill, myColorFill);					
					var symLine = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, myColor, 1);
					var symPoint = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, symLine, myColor);
					
					switch(feature.geometry.type){
					  case "polygon":
					  case "extent":  
					    feature.setSymbol(symPoly);
					    break;
					  case "point":
					  case "multipoint":
					    feature.setSymbol(symPoint);
					    break;
					  case "polyline":
					    feature.setSymbol(symLine);
					    break;
					}
				}else if (color!=null) {
					feature.symbol.setColor(myColorFill);
					if(feature.symbol.outline) feature.symbol.outline.setColor(myColor)
				}
			}
			
		},
		/*
		*** PARAMS ***
		features: Array= Contains Graphics JSON		
		color: [optional]Color= Color of graphics		
		multicolor: [optional]Boolean= if true, draws Graphics in Multicolor
		sr: [optional]SpatialReference= spatial reference []
		*/		
		graphicsFromJson: function(features, color, multicolor, sr) {
			var results = [];
			var len = features.length || 0;
			var myColor = color!=null?color : new Color(this.getRandomColor(1));
			
			for (var i = 0; i < len; i++) {
			  var geometry = null;
			  if (multicolor==true) {
				myColor = color!=null?color : new Color(this.getRandomColor(1));	
			  }
			  if (!features[i].geometry) {
			    console.error('unable to get geometry of the reocord: ', features[i]);
			    continue;
			  } else if (features[i].geometry.spatialReference !== null && sr==null) {
			    console.warn('unable to draw graphic features wkid ');
			  }
			  if (features[i].geometry.type === "point") {
			    geometry = new Point(features[i].geometry);			    					
			  } else if (features[i].geometry.type === "multipoint") {
			    geometry = new Multipoint(features[i].geometry);			    		
			  } else if (features[i].geometry.type === "polyline") {
			    geometry = new Polyline(features[i].geometry);			    
			  } else if (features[i].geometry.type === "polygon") {
			    geometry = new Polygon(features[i].geometry);			    
			  }
			  if(features[i].geometry.spatialReference == null && sr!= null){
			     geometry.spatialReference = sr;
			  }
			  var graphic = new Graphic(geometry,
					(features[i].symbol != null ? features[i].symbol : null ),	    
					(features[i].attributes != null ? features[i].attributes : null ),
					(features[i].infoTemplate != null ? features[i].infoTemplate : null ));
			  if(graphic.symbol==null) {this.setSymbol(graphic);}
			  results.push(graphic);			  
			}
			return results;
		},
      
		/*
		*** PARAMS ***
		features: Array: Contains Graphics 
		graphicLayer: GraphicLayer = GraphicLayer
		map: Map = Map
		color: Color = Color of graphics
		clearLastResults: Boolean = clear first all graphics
		zoomTo: Boolean: if true, zoom on the map where they are positioned the Graphics
		multicolor: Boolean: if true, draws Graphics in Multicolor
		*/
		addToGraphicsLayer: function(features, graphicLayer, color, clearLastResults, zoomTo, multicolor){
			var featuresCount = features.length;
			var map = graphicLayer._map;

			if (clearLastResults) {
			  graphicLayer.clear();
			}
			
			var myColor = color!=null?color : new Color(this.getRandomColor(1));
			var symbol;
			
			array.forEach(features, lang.hitch(this, function(feature, i){
			  
			  if(feature.geometry){
				if(feature.symbol==null){
					if (symbol==null || multicolor==true) {
						if (multicolor==true) {
							myColor = color!=null?color : new Color(this.getRandomColor(1));	
						}
						this.setSymbol(feature,myColor);
						symbol = feature.symbol;
					}else{
						feature.setSymbol(lang.clone(symbol));
					}
				}
				graphicLayer.add(feature);  
			  }
			  
			}));
			
			if (graphicLayer.graphics.length>0) {
				graphicLayer.show();
				if (zoomTo!=false) {
					if (graphicLayer.graphics.length==1 && graphicLayer.graphics[0].geometry.type=="point") {
						map.setScale(map.getMaxScale() > 100000 ? map.getMaxScale() : 100000);
					}
					// Zoom To extent graphics
					var extent = graphicsUtils.graphicsExtent(graphicLayer.graphics);
					map.setExtent( extent, true);
				}
				
			}
		},
		
		getLabel:function(graphic,displayFieldName){
			var gra = new Graphic;
			if (graphic != null && graphic.geometry != null && graphic.attributes != null &&
			    displayFieldName != null && graphic.attributes[displayFieldName] != null && graphic.attributes[displayFieldName].length>0 ) {						
				var textSymbol =  new TextSymbol(graphic.attributes[displayFieldName]).setColor(
				new Color([0,0,0])).setAlign(TextSymbol.ALIGN_MIDDLE).setFont(
				new Font("10pt").setWeight(Font.WEIGHT_BOLD)); 	
				//
				gra.geometry = this.geometryPointCenter(graphic.geometry);
				gra.attributes = graphic.attributes;
				gra.symbol = textSymbol;					
			}
			return gra;
		},

		geometryPointCenter:function(geometry){
			
			var centerPt = new Point();
			
			try{

				if (geometry.type == "point") {
					centerPt = Point(geometry);
				}else if (geometry.type == "multipoint") {
					var multipoint = Multipoint(geometry) ;
					centerPt = multipoint.points && multipoint.points.length > 0 ? multipoint.points[0] instanceof Point : null;
				}else if(geometry.type == "polygon"){
					var rings = Polygon(geometry).rings ;
					if(rings.length>1){
						var maxRings=0;
						var ItemRings=[];						
						array.forEach(rings, function( item, index, array ) {
							var len = item.length;
							if (len>maxRings){
								maxRings=len;
								ItemRings = item;
							}
						});
						var poligon = new Polygon(geometry.spatialReference);
						poligon.rings = [ItemRings];
						centerPt = poligon.getExtent().getCenter();
					}else{
						centerPt = geometry.getExtent().getCenter();
					}
				}else if(geometry.type == "polyline"){ // Get fisrt point
					var myPaths = Polyline(geometry).paths ;
					if(myPaths.length>0){
						var myPath = myPaths[0] ;
						var midPointIdx = Math.abs(myPath.length / 2);
						centerPt = Point(myPath[midPointIdx]) ;
					}
					else 
					{
						centerPt = geometry.getExtent().getCenter();
					}
				}else{
					centerPt = geometry.getExtent().getCenter();
				}	
				
			}catch(er){
				//ErrorAndLog.showError(er);
			}finally{
				return centerPt;
			}
		},	

	});
	return new classObj();
});
