define([
    'dojo/_base/declare',
        'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget', 'jimu/dijit/TabContainer', './List',
    'jimu/dijit/Message', 'jimu/utils', 'jimu/dijit/LoadingShelter',
    'jimu/dijit/Selectionbox',
        
        'esri/dijit/InfoWindowLite', 'esri/InfoTemplate',
            
    'esri/tasks/query', 'esri/tasks/QueryTask', 'esri/SpatialReference',
    'esri/layers/ArcGISDynamicMapServiceLayer',
        'esri/layers/ArcGISTiledMapServiceLayer',
        'esri/layers/ArcGISImageServiceLayer', 'esri/layers/KMLLayer',
    'esri/layers/GraphicsLayer', 'esri/layers/FeatureLayer',
        'esri/layers/WMSLayer',
    'esri/graphic', 'esri/geometry/Point', 'esri/geometry/Extent',
    'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/PictureMarkerSymbol',
    'esri/geometry/Polyline', 'esri/symbols/SimpleLineSymbol',
    'esri/geometry/Polygon', 'esri/symbols/SimpleFillSymbol',
    'esri/InfoTemplate', 'esri/symbols/jsonUtils',
    'esri/geometry/webMercatorUtils', 'esri/request',
        'esri/arcgis/utils', 'dijit/ProgressBar',
    'dijit/form/TextBox',
        'dijit/form/RadioButton',
    'dijit/form/CheckBox',
        'dijit/form/Select',
    'dojo/store/Memory', 'dojo/data/ObjectStore', 'dojo/json',
    'dojo/_base/lang', 'dojo/_base/html', 'dojo/_base/array', 'dojo/query',
    'dojo/mouse', 'dojo/on', 'dojo/aspect', 'dojo/dom-construct', 'dojo/dom',
    'dijit/form/Button',
    'dojo/dom-class'
  ],

function(declare, _WidgetsInTemplateMixin, BaseWidget, TabContainer, List,
Message, utils, LoadingShelter, Selectionbox, InfoWindowLite, InfoTemplate,
Query, QueryTask, SpatialReference,
  ArcGISDynamicMapServiceLayer, ArcGISTiledMapServiceLayer,
  ArcGISImageServiceLayer, KMLLayer, GraphicsLayer, FeatureLayer, WMSLayer,
    Graphic, Point, Extent, SimpleMarkerSymbol, PictureMarkerSymbol, Polyline,
    SimpleLineSymbol, Polygon, SimpleFillSymbol, InfoTemplate, jsonUtils,
    webMercatorUtils, esriRequest, arcgisUtils, ProgressBar,
        Textbox, RadioButton, CheckBox, Select,
    Memory, ObjectStore, JSON, lang, html, array, query, mouse, on, aspect,
    domConstruct, dom,Button,domClass) { 
  return declare([BaseWidget, _WidgetsInTemplateMixin], {

    name: 'GeoportalSearch',
    baseClass: 'jimu-widget-demo',
    tabContainer: null,
    resultLayer: null,
    progressBar: null,
    onClickEvent: null,
    isValidConfig:false,
    list: null,
    startElement: null,
    maxElement: null,
    pages: null,
    
    postCreate: function() {
      this.inherited(arguments); this._initTabContainer(); this._initList();
      this._initUI(); // moved here
    },

    startup: function() {
      this.inherited(arguments);
      this.startElement = 1;
      this.maxElement = 10;
      this.currentPage = 1;
    },

    onOpen: function(){
      console.log('onOpen'); var footprints = this.map.getLayer("footprints");
      if(footprints)footprints.show();
    },

    onClose:function(){
      this._hideInfoWindow(); this.inherited(arguments); var footprints =
      this.map.getLayer("footprints"); if(footprints)footprints.hide();
    },

    destroy:function(){
      this._hideInfoWindow(); if(this.resultLayer){
          this.map.removeLayer(this.resultLayer);
      } this.resultLayer = null; this.inherited(arguments);
    },

    onMinimize: function(){
      console.log('onMinimize');
    },

    onMaximize: function(){
      console.log('onMaximize');
    },

    onSignIn: function(credential){
      /* jshint unused:false*/
      console.log('onSignIn');
    },

    onSignOut: function(){
      console.log('onSignOut');
    },

    onShowAll: function() {
        this.search(null, true);
    },
    
    onSearch: function(){
      this.startElement = 1;
      this.maxElement = 10;
      this._search();
    },
        
    _startup:function(){
        if (!this._startedNow) { } this._startedNow = true;
    },

    _search: function() {
            
      this.tabContainer.selectTab(this.nls.results); if(this.resultLayer){
          this.resultLayer.clear();
      }
      
      var queryUrl = this.inputQueryCatalog.value;
      
      var params = {
          start: this.startElement,
          max: this.maxElement,
          f: 'json'
      };
      
      if(this.inputQueryLiveDataFilter.checked){
           lang.mixin(params,{contentType:'liveData'});
      } if(this.inputQueryName.value.length > 0){
           lang.mixin(params,{searchText:this.inputQueryName.value});
      } var extent = this.map.extent; var geom = extent; if
      (this.map.spatialReference.wkid == 10200) {
          geom = webMercatorUtils.webMercatorToGeographic(extent);
      }
      
      var bbox = geom.xmin + "," + geom.ymin + "," + geom.xmax + "," +
      geom.ymax; if(this.inputExtentIntersecting.checked){
           lang.mixin(params,{spatialRel:'esriSpatialRelOverlaps',bbox : bbox});
      }else if(this.inputExtentFullyWithin.checked){
           lang.mixin(params,{spatialRel:'esriSpatialRelWithin',bbox : bbox});
      }

      var requestHandle = esriRequest({
              "url": queryUrl, "content": params, handleAs:'json'
          },{
              useProxy:false
          });
      requestHandle.then(dojo.hitch(this, this._onQueryFinish, this),
      this._onQueryError);

    },
            
    _initList: function() {
      this.list = new List(); this.list.startup();
    },

    _initLayer:function(){
            if(!this.isValidConfig){
                return;
            } if(this.config.shareResult){
                this.shelter.show(); esriRequest({
                    url: (this.config.layer && this.config.layer.url)||'',
                    content:{f:'json'}, handleAs:'json',
                    callbackParamName:'callback', timeout:30000
                },{
                    useProxy:false
                }).then(lang.hitch(this,function(response){
                    response.name = this.nls.queryResult + " : " +
                    response.name; var names =
                    array.map(this.config.layer.fields.field,lang.hitch(this,function(item){
                        return item.name;
                    }));

                    var objectIdFieldInfo =
                    (array.filter(response.fields,lang.hitch(this,function(fieldInfo){
                        return fieldInfo.type === 'esriFieldTypeOID';
                    })))[0]; if(objectIdFieldInfo){
                        this.config.layer.objectIdField =
                        objectIdFieldInfo.name;
                    } this.config.layer.existObjectId =
                    array.indexOf(names,this.config.layer.objectIdField) >= 0;
                    response.fields =
                    array.filter(response.fields,lang.hitch(this,function(fieldInfo){
                        return fieldInfo.type === 'esriFieldTypeOID' ||
                        array.indexOf(names,fieldInfo.name) >= 0;
                    })); this.config.layer.fields.field = response.fields;
                    this.shelter.hide(); this.resultLayer = new FeatureLayer({
                        layerDefinition:response, featureSet:null
                    }); this.map.addLayer(this.resultLayer); this._startup();
                }),lang.hitch(this,function(err){
                    this.shelter.hide(); console.error(err); this.resultLayer =
                    new GraphicsLayer(); this.map.addLayer(this.resultLayer);
                }));
            } else{
                this.resultLayer = new GraphicsLayer();
                this.map.addLayer(this.resultLayer);
            }
        },
    
    _initTabContainer:function(){
      this.tabContainer = new TabContainer({
        tabs: [{
          title: this.nls.selectByAttribute, content: this.queryNode1
        }, {
          title: this.nls.results, content: this.queryNode2
        }], selected: this.nls.selectByAttribute
      }, this.tabQuery); this.tabContainer.startup();
      utils.setVerticalCenter(this.tabContainer.domNode);
    },

    _initUI: function(){
      this.resultLayer = new GraphicsLayer();
      this.map.addLayer(this.resultLayer); var items =
      array.map(this.config.catalogs, function (itm, i) {
                      return {
                              id: itm.url, label: itm.name
                      };
              });

      var catalogsStore = new ObjectStore({
              objectStore: new Memory({
                      data: items
              })
      }); this.inputQueryCatalog.setStore(catalogsStore);
    },
        
    toggleFootprints: function() {
        var footprints = this.map.getLayer("footprints"); if
        (footprints.visible) {
            footprints.hide(); this.btnToggleFootprints.textContent =
            this.nls.show;
        } else {
            footprints.show(); this.btnToggleFootprints.textContent =
            this.nls.hide;
        }
        
    },
        
    clear: function() {
        this._hideInfoWindow();
        
        var footprints = this.map.getLayer("footprints"); if (footprints)
        footprints.hide();
        
        this.divResultMessage.textContent = this.nls.noResults;
        
        divResultMessage = dojo.byId("divResultMessage");
        divResultMessage.textContent = ""; theList = dojo.byId("list");
        theList.innerHTML = "";
                    
        return false;
    },

    _onQueryError: function(error, io) {
        var progressBar = dom.byId("progressBar"); var divResult =
        dom.byId("divResult");
        html.setStyle(progressBar,'display','none');
        html.setStyle(divResult,'display','block');
        
        if(this.resultLayer){
         this.resultLayer.clear();
        } new Message({
            message: this.nls._onQueryError
        }); console.debug(error);
    },

    _onQueryFinish: function(that, results, io) {
        var progressBar = dom.byId("progressBar");
        var divResult = dom.byId("divResult");
        html.setStyle(progressBar,'display','none');
        html.setStyle(divResult,'display','block');
        
        if(that.resultLayer){
         that.resultLayer.clear();
        }
        
        var title = ""; var titlefield = that.inputQueryCatalog.value;
        //this.catalogs.value;
        
        var len = results.records.length; var divResultMessage =
        dom.byId("divResultMessage"); if (len === 0) {
            divResultMessage.textContent = that.nls.noResults; return;
        } else {
            divResultMessage.textContent = that.nls.featuresSelected + ": " + results.totalResults;
        }

        theList = dojo.byId("list"); theList.innerHTML = ""; var suffixes =
        ["csv", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "gml", "pdf",
        "zip", "xml", "html", "htm", "aspx", "lyr"]; var suffixesKML =
        [".kml","kmz"];
        
        
        for (var i = 0; i < len; i++) {
            var theListContent = ""; var record = results.records[i]; var
            label = "",content = ""; label = record.title; title =
            record.title; content = record.summary; var metadataLinkSnippet
            = ""; var mapserviceLinkSnippet = ""; var theLinkType = "";
                    
            for (var j=0; j < record.links.length; j++) {
                
                var theLink = record.links[j];
                
                if ((theLink.type == "open") || (theLink.type == "customLink") || (theLink.type == "agslyr") || (theLink.type == "addToMap")) {

                    // if a link type has already been established other
                    // than www
                    if (theLinkType.length > 0 && theLinkType != "www")
                    continue;
                                
                    var href = theLink.href; var hrefLower =
                    href.toLowerCase();
                    
                    // if the link ends in any of the suffixes, it's not a
                    // map service, but general web link if not assigned
                    // value yet, check for typical file types
                    if ((theLinkType.length == 0) || (theLinkType === "www")){
                        for (k=0; k<suffixes.length; k++) {
                            var suffix = suffixes[i]; if
                            (hrefLower.indexOf(suffix) + suffix.length == hrefLower.length) {
                                theLinkType = "www"; break;
                            }
                        }
                    }

                    // if not assigned value yet, check for KML/KMZ
                    if ((theLinkType.length == 0) || (theLinkType === "www")) {
                        for (k=0; k<suffixesKML.length; k++) {
                            var suffix = suffixesKML[k]; if
                            (hrefLower.indexOf(suffix, hrefLower.length -
                            suffix.length) !== -1) {
                                theLinkType = "kml"; break;
                            }
                        }
                    }
                    
                    // if not assigned value yet, check for services
                    if ((theLinkType.length == 0) || (theLinkType === "www")) {
                        if (hrefLower.indexOf("request=getcapabilities") !== -1) {
                            if (hrefLower.indexOf("service=wms") !== -1) {
                                theLinkType = "wms";
                            } else {
                                theLinkType = "unsupported";
                            }
                            
                        } else if (hrefLower.indexOf("/rest/services/") !== -1) {
                            theLinkType = hrefLower.split("/").pop();
                            
                            if (hrefLower.indexOf("?f=") > 0) {
                                theLinkType = theLinkType.substr(0,
                                theLinkType.indexOf("?f=")); href =
                                href.substr(0, href.indexOf("?f="));
                            }
                            
                        } else if (hrefLower.indexOf("/services/") !== -1) {
                            if (hrefLower.indexOf("/mapserver/wmsserver") !== -1) {
                                theLinkType = "wms";
                            }
                            
                        } else if
                        (hrefLower.indexOf("/com.esri.wms.esrimap") !== -1)
                        {
                            theLinkType = "wms"; if (hrefLower.indexOf("?") > 0) {
                                href = href.substr(0, href.indexOf("?"));
                            }
                            
                        } else if ((hrefLower.indexOf("viewer.html") !== -1) && (hrefLower.indexOf("url=") !== -1)) {
                          href = href.substr(href.indexOf("url=")+4);
                          href = decodeURIComponent(href); theLinkType = href.split("/").pop().toLowerCase();
                            
                        } else if
                        ((hrefLower.indexOf("/sharing/content/items/") !== -1) && (hrefLower.split("/").pop() == "data")) {
                            theLinkType = "webmap";
                            if (hrefLower.indexOf("?") > 0) {
                                href = href.substr(0, href.indexOf("?"));
                            }
                        }
                    }

                    // if not assigned value yet, check if the layer ends
                    // with f=lyr cause then we can make a rest URL of it
                    if ((theLinkType.length == 0) || (theLinkType === "www")) {
                        suffix = "?f=lyr"; if (hrefLower.indexOf(suffix) + suffix.length == hrefLower.length) {
                            theLinkType = hrefLower.split("/").pop();
                            href = href.replace(suffix, ""); break;
                        }
                    }
                    
                    // if all else fails, just make it a generic web link
                    if (theLinkType.length == 0) {
                        theLinkType = "www";
                    }
                    
                    mapserviceLinkSnippet = "<input id='" + record.id + "_href' type='hidden' data-linktype='" + theLinkType + "' value='" + href + "'/>";
                } else if (theLink.type == "metadata") {
                    metadataLinkSnippet += "<a id='" + record.id + "_metadata' href='" + theLink.href + "' target='_blank'>Metadati-XML</a>";
                } else if (theLink.type == "details") {
                  metadataLinkSnippet += "<a id='" + record.id + "_metadata' href='" + theLink.href + "' target='_blank'>Scheda Metadati</a>";
                } else if (theLink.type == "website") {
                  metadataLinkSnippet += "<a id='" + record.id + "_metadata' href='" + theLink.href + "' target='_blank'>Sito Web</a>";
                }
            }
            
            var imgURL = ""; switch(theLinkType) {
              case "www":
                      imgURL = "widgets/GeoportalSearch/images/ContentType_clearinghouse.png";
                      break;
              case "webmap":
                      imgURL = "widgets/GeoportalSearch/images/ContentType_liveData.png";
                      break;
              case "mapserver":
                      imgURL = "widgets/GeoportalSearch/images/ContentType_liveData.png";
                      break;
              case "featureserver":
                      imgURL = "widgets/GeoportalSearch/images/ContentType_liveData.png";
                      break;
              case "imageserver":
                      imgURL = "widgets/GeoportalSearch/images/ContentType_liveData.png";
                      break;
              case "wms":
                      imgURL = "widgets/GeoportalSearch/images/ContentType_liveData.png";
                      break;
              case "kml":
                      imgURL = "widgets/GeoportalSearch/images/ContentType_geographicActivities.png";
                      break;
              default:
                      imgURL = "widgets/GeoportalSearch/images/ContentType_unknown.png";
            } var imgSnippet = "<img src='" + imgURL + "'/>";
            
            theListContent += "<div class='snippet'>";
              theListContent += "<div id='" + record.id + "' class='title'>" + imgSnippet + record.title + "</div>"; theListContent += "<div id='" + record.id + "' class='abstract'>" + record.summary + "</div>"; theListContent += "<div class='links'>";
                theListContent += mapserviceLinkSnippet; theListContent += metadataLinkSnippet;
                theListContent += "<a layerName='" + record.title + "' id='" + record.id + "' href='#' onmouseenter='dojo.byId(\"list\")' >" + this.nls.addtomap + "</a>"
              theListContent += "</div>";
            theListContent += "</div>"; theList.innerHTML += theListContent;
        }
        
        var pagination = '<div class="pagination" id="pageNavPosition">';
        pagination += "</div>"; theList.innerHTML += pagination;
        
        var records = (results.totalResults - 1); 
        this.pages = Math.ceil(records / this.maxElement);
        this.showPageNav();
        
        
        var features = results.records;
        var symbol = new SimpleFillSymbol();
        symbol.setColor(new esri.Color([0,0,0,0.05]));
        
        var footprints; if (that.footprints) {
            that.footprints = that.map.getLayer("footprints");
        } else {
            that.resultLayer = new GraphicsLayer(); that.resultLayer.id =
            "footprints"; that.map.addLayer(that.resultLayer);
            that.footprints = that.map.getLayer("footprints");
            that.footprints.clear();
        }
        
        var fullExtent = null;
        
        for (var i = 0, len = features.length; i < len; i++) {
            var feature = features[i]; var type = feature.geometry.type; var
            json = {}; var geometry, centerpoint;
            if(feature.geometry.spatialReference){
             json.spatialReference = feature.geometry.spatialReference;
            }else{
                json.spatialReference = 4326;
            } switch (type) { case "multipoint": case "point":
                break;
            case "polyline":
                break;
            case "extent": case "Polygon": case "polygon":
             if(feature.bbox){
                var bbox = feature.bbox; geometry =
                Extent(bbox[0],bbox[1],bbox[2],bbox[3], new
                SpatialReference(4326)); centerpoint = geometry.getCenter();
             }
                break;
            default:
                break;
            }

            var title = feature.title; var content = feature.summary;
            var it = new InfoTemplate(title, title + "<br>" + content);
            var graphic = new Graphic(geometry,symbol,feature,it);
            //this.resultLayer.add(graphic);
            that.footprints.add(graphic);
            
            if ( fullExtent === null ) {
              fullExtent = graphic.geometry.getExtent();
            } else {
              fullExtent = fullExtent.union(graphic.geometry.getExtent());
            }
        }
        
        if(fullExtent!=null) that.map.setExtent(fullExtent.expand(1.2));
    },

    _getAlias: function(att) {
        var field = this.config.layer.fields.field; var item; for (var i in
        field) {
            item = field[i]; if (item.name.toLowerCase() ===
            att.toLowerCase() && item.alias) {
                return item.alias;
            }
        } return att;
    },

    _drawResults: function(results) {
        var symbol; if(this.config.symbol){
            if(this.config.symbol.url){
                this.config.symbol.url = this.folderUrl +
                this.config.symbol.url;
            } symbol = jsonUtils.fromJson(this.config.symbol);
        } var features = results.records; for (var i = 0, len =
        features.length; i < len; i++) {
            var feature = features[i]; var listItem = this.list.items[i];
            var type = feature.geometry.type; var json = {}; var geometry,
            centerpoint; if(feature.geometry.spatialReference){
             json.spatialReference = feature.geometry.spatialReference;
            }else{
                json.spatialReference = 4326;
            } switch (type) { case "multipoint": case "point":
                break;
            case "polyline":
                break;
            case "extent": case "Polygon": case "polygon":
             if(feature.bbox){
                var bbox = feature.bbox; geometry =
                Extent(bbox[0],bbox[1],bbox[2],bbox[3], new
                SpatialReference(4326)); if(!symbol){
                    symbol = new SimpleFillSymbol();
                } centerpoint = geometry.getCenter();
             }
                break;
            default:
                break;
            }

            if(this.resultLayer.renderer){
                symbol = null;
            } var title = listItem.title; var content = listItem.content;
            var it = new InfoTemplate(title, title + "<br>" + content); var
            graphic = new Graphic(geometry,symbol,feature,it);
            listItem.centerpoint = centerpoint; listItem.graphic = graphic;
            this.resultLayer.add(graphic);
        }
    },

    _selectResultItem: function(index, item) {
       var that = this;
        
        var x = index.clientX;
        var y = index.clientY;
        var element = document.elementFromPoint(x, y);
        var link = dojo.byId(element.id + "_href");
        var href = "";
        
        var linkType = "unknown";
        if (link)  {
          linkType = link.dataset.linktype;
          href = link.value;
        }
        
        var infoTemplate = new InfoTemplate("Attributes", "${*}");
    
        var layerName = dojo.attr(element,'layerName');
         
        if (layerName) {
          if (linkType == "mapserver") {
              var mapserverLayer = null; if
              (href.indexOf("tiles.arcgis.com/tiles") > 0) {
                  mapserverLayer = new ArcGISTiledMapServiceLayer(href);
              } else {
                  mapserverLayer = new ArcGISDynamicMapServiceLayer(href);
              }
                
            mapserverLayer.label = layerName; mapserverLayer.name = layerName;
            mapserverLayer.title = layerName;
                
            this.map.addLayer(mapserverLayer);
              
          } else if (linkType == "featureserver") {
            var featureLayer = new FeatureLayer(href, {
              mode: FeatureLayer.MODE_SNAPSHOT, outFields: ["*"],
              infoTemplate: infoTemplate
            });

                featureLayer.label = layerName; featureLayer.name = layerName;
                featureLayer.title = layerName;
              this.map.addLayer(featureLayer);
              
          } else if (linkType == "imageserver") {
              var imageServiceLayer = new ArcGISImageServiceLayer(href);
                imageServiceLayer.label = layerName; imageServiceLayer.name =
                layerName; imageServiceLayer.title = layerName;
              this.map.addLayer(imageServiceLayer);
          
          } else if (linkType == "kml") {
              var kmlLayer = new KMLLayer(href);
                kmlLayer.label = layerName; kmlLayer.name = layerName;
                kmlLayer.title = layerName;
              this.map.addLayer(kmlLayer);
          
          } else if (linkType == "wms") {
              var wmsLayer = new WMSLayer(href);
                wmsLayer.label = layerName; wmsLayer.name = layerName;
                wmsLayer.title = layerName;
              this.map.addLayer(wmsLayer);
              
          } else if (linkType == "webmap") {
              var requestHandle = esriRequest({
                  "url": href, handleAs:'json'
              },{
                  useProxy:false
              }); requestHandle.then(this._onFetchWebMapFinish,
              this._onFetchWebMapError);
          
          } else {
              /*var win = window.open(href, '_blank');
              win.focus();*/
          }
        } else {
          var filter = dojo.filter(this.footprints.graphics, function(item,idx){
            return element.id == item.attributes.id;
          });
          
          this.map.infoWindow.hide();
          if(filter.length>0){
            this.map.infoWindow.setTitle(filter[0].infoTemplate.title);
            this.map.infoWindow.setContent(filter[0].infoTemplate.content);
            var screenPoint = this.map.toScreen(filter[0].geometry.getExtent().getCenter());
            this.map.infoWindow.show(screenPoint,this.map.getInfoWindowAnchor(screenPoint));
            
            
            if(this.selectedItem!=null)  {
              domClass.remove(this.selectedItem, "geoportalSearchSelectedItem");
              this.selectedItem = null;
            }else{
              this.selectedItem = index.target || index.srcElement || toElement;
              domClass.add(this.selectedItem, "geoportalSearchSelectedItem");
            }
            
            this.map.infoWindow.on('hide',function(){
              if(that.selectedItem) {
                domClass.remove(that.selectedItem, "geoportalSearchSelectedItem");
                that.selectedItem = null;
              }
            });
          }
        }

        if (false) {
            var point = this.list.items[this.list.selectedIndex].centerpoint;
            this.map.centerAt(point).then(lang.hitch(this, function(){
                this.map.infoWindow.setFeatures([item.graphic]);
                this.map.infoWindow.setTitle(item.title); if(item.content){
                    this.map.infoWindow.setContent(item.content);
                }else{
                    this.map.infoWindow.setContent(item.title);
                } this.map.infoWindow.reposition();
                this.map.infoWindow.show(item.centerpoint);
            }));
        }
    },
      
    _onFetchWebMapFinish: function(response) {
        console.log('_onFetchWebMapFinish');
        
        var numLayers = response.operationalLayers.length; for (var ii=0; ii <
        numLayers; ii++) {
            var theLayer = response.operationalLayers[ii]; var href =
            theLayer.url; var hrefLower = href.toLowerCase(); var linkType =
            hrefLower.split("/").pop();
    
            if (linkType == "mapserver") {
                var mapserverLayer = null; if
                (href.indexOf("tiles.arcgis.com/tiles") > 0) {
                    mapserverLayer = new ArcGISTiledMapServiceLayer(href);
                } else {
                    mapserverLayer = new ArcGISDynamicMapServiceLayer(href);
                } this._viewerMap.addLayer(mapserverLayer);
            
            } else if (linkType == "featureserver") {
                var featureLayer = new FeatureLayer(href, {
                    mode: FeatureLayer.MODE_SNAPSHOT, outFields: ["*"],
                    infoTemplate: infoTemplate
                });

                this._viewerMap.addLayer(featureLayer);
                
            } else if (linkType == "imageserver") {
                var imageServiceLayer = new ArcGISImageServiceLayer(href);
                this._viewerMap.addLayer(imageServiceLayer);
            
            } else if (linkType == "kml") {
                var kmlLayer = new KMLLayer(href);
                this._viewerMap.addLayer(kmlLayer);
            
            } else if (linkType == "wms") {
                var wmsLayer = new WMSLayer(href);
                this._viewerMap.addLayer(wmsLayer);
            }
            
        }
    },
      
    _onFetchWebMapError: function(error) {
        console.log('_onFetchWebMapError');
    },
        
    _hideInfoWindow:function(){
        if(this.map && this.map.infoWindow){
            this.map.infoWindow.hide();
        }
    },

    _isConfigValid:function(){
        return this.config.layer && this.config.layer.url &&
        this.config.layer.fields && (this.config.layer.fields.field.length >
        0);
    },
      
    prev: function() {
      if (this.currentPage > 1) this.showPage(this.currentPage - 1);
    },
  
    next:  function() {
      if (this.currentPage < this.pages) this.showPage(this.currentPage + 1);
    },
    
    showPageNav: function() {
        var buttonPrev = new Button({
            label: "&#171 Prev",
            baseClass: "pg-normal",
            onClick: dojo.hitch(this,this.prev)
        }, dojo.create('span'));
        
        dojo.place(buttonPrev.domNode, dojo.byId('pageNavPosition'), 'last');
        
        var buttonPane = null;
        for (var page = 1; page <= this.pages; page++){
          if(dijit.byId('GeoportalSearch_Pagination_'+page)) dijit.byId('GeoportalSearch_Pagination_'+page).destroyRecursive();
            buttonPane = new Button({
              id: 'GeoportalSearch_Pagination_'+page,
              label: page,
              baseClass: (this.currentPage == page ) ? "pg-selected" : "pg-normal",
              onClick: dojo.hitch(this,this.showPage,page)
            }, dojo.create('span'));
            dojo.place(buttonPane.domNode, dojo.byId('pageNavPosition'), 'last');
        }
        
        var buttonNext = new Button({
            label: "Next &#187;",
            baseClass: "pg-normal",
            onClick: dojo.hitch(this,this.next)
        }, dojo.create('span'));
        
        dojo.place(buttonNext.domNode, dojo.byId('pageNavPosition'), 'last');
    },
    
    showPage: function(pageNumber) {
      
      var oldPageAnchor = dijit.byId('GeoportalSearch_Pagination_'+this.currentPage);
      oldPageAnchor.set('baseClass','pg-normal')
      
      this.currentPage = pageNumber;
      var newPageAnchor = dijit.byId('GeoportalSearch_Pagination_'+this.currentPage);
      newPageAnchor.set('baseClass','pg-selected');
      
      this.startElement = (pageNumber - 1) * this.maxElement + 1;
      this._search();
    }   
  });
});