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
    "dojo/_base/declare", "dijit/_WidgetsInTemplateMixin", "jimu/BaseWidget",
    "jimu/dijit/TabContainer", "./List", "jimu/dijit/Message",
    "jimu/utils", "jimu/dijit/LoadingShelter", "jimu/dijit/Selectionbox",
    "esri/dijit/InfoWindowLite", "esri/tasks/query", "esri/tasks/QueryTask",
    "esri/SpatialReference", "esri/layers/ArcGISTiledMapServiceLayer", "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/KMLLayer", "esri/layers/WFSLayer", "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/GraphicsLayer", "esri/layers/FeatureLayer", "esri/layers/WMSLayer",
    "esri/layers/WMSLayerInfo", "jimu/esriIT/WMSLayerCustom", "esri/graphic",
    "esri/geometry/Point", "esri/geometry/Extent", "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol", "esri/geometry/Polyline", "esri/symbols/SimpleLineSymbol",
    "esri/geometry/Polygon", "esri/symbols/SimpleFillSymbol", "esri/InfoTemplate",
    "esri/symbols/jsonUtils", "esri/geometry/webMercatorUtils", "esri/request",
    "esri/arcgis/utils", "dijit/ProgressBar", "dijit/form/TextBox",
    "dijit/form/RadioButton", "dijit/form/CheckBox", "dijit/form/FilteringSelect",
    "dojo/store/Memory", "dojo/data/ObjectStore", "dojo/json",
    "dojo/dom-attr", "dojo/_base/lang", "dojo/_base/html",
    "dojo/_base/array", "dojo/query", "dojo/mouse",
    "dojo/on", "dojo/aspect", "dojo/dom-construct",
    "dojo/dom", "dijit/form/Button", "dojo/dom-class",
    "dojo/keys", "jimu/esriIT/esriItutils", 
	"jimu/esriIT/addLayers/AddFromUrl",
	"dojo/domReady!"
], function (
    declare, _WidgetsInTemplateMixin, BaseWidget,
    TabContainer, List, Message,
    utils, LoadingShelter, Selectionbox,
    InfoWindowLite, Query, QueryTask,
    SpatialReference, ArcGISTiledMapServiceLayer, ArcGISImageServiceLayer,
    KMLLayer, WFSLayer, ArcGISDynamicMapServiceLayer,
    GraphicsLayer, FeatureLayer, WMSLayer,
    WMSLayerInfo, WMSLayerCustom, Graphic,
    Point, Extent, SimpleMarkerSymbol,
    PictureMarkerSymbol, Polyline, SimpleLineSymbol,
    Polygon, SimpleFillSymbol, InfoTemplate,
    jsonUtils, webMercatorUtils, esriRequest,
    arcgisUtils, ProgressBar, Textbox,
    RadioButton, CheckBox, FilteringSelect,
    Memory, ObjectStore, JSON,
    domAttr, lang, html,
    array, query, mouse,
    on, aspect, domConstruct,
    dom, Button, domClass,
    keys, esriItutils, AddLayerFromUrl
) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

        name: 'GeoportalSearch',
        baseClass: 'jimu-widget-demo',
        loading: null,
        tabContainer: null,
        resultLayer: null,
        progressBar: null,
        onClickEvent: null,
        isValidConfig: false,
        list: null,
        startElement: null,
        maxElement: null,
        pages: null,
        cntLayerAdd: 0,
        timeoutValue: 10000,  //10s timeout for esriRequest calls

        postCreate: function () {
            this.inherited(arguments);
            this._initTabContainer();
            this._initList();
            this._initUI(); // moved here

        },

        startup: function () {
            this.inherited(arguments);
            var that = this;
			
            this.startElement = 1;
            this.maxElement = 10;
            this.currentPage = 1;

            this.initLoader();

            this.addCustom();
            on(this.domNode, ".catalogrest:click", function (event) {
                event.preventDefault();

                var url = this.attributes.getNamedItem("url").value;

                // this.attributes.url.value
                that.addCatalogRestLayer(url);
            });

            on(this.inputQueryName, "keydown", function (event) {
                if (event.keyCode === keys.ENTER) {
                    event.preventDefault();
                    that.inputQueryName.value = event.target.value;
                    that.onSearch();                    
                }
            });

            var qsResource = this.getQueryStringParameter(window.location.href, "resource");

            if (qsResource) {
                var qsTitle = this.getQueryStringParameter(window.location.href, "title");
                this.addResourceOnMap(qsResource, qsTitle);
            }
        },

        addCustom:function (){
            var that = this;
            this.selectWhats = "tutti";
            $('input[type=radio][name=selection-search]').change(function() {
                that.selectWhats = this.value;
                $(".ifRadioSelect").hide();
                if (this.value == 'dati') {
                    //$("#selection-search-tema-inspire").show();
                    $("#box-dati").css('display', 'inline-block');

                }else if (this.value == 'servizi') {
                    //$("#selection-search-servizio").show();
                }

            });
        },

        initLoader: function () {
            this.loading = new LoadingShelter();
            this.loading.placeAt(this.map.root);

            this.hideLoader();
        },

        hideLoader: function () {
            this.loading.hide();
        },

        showLoader: function () {
            this.loading.show();
        },

        getQueryStringParameter: function (url, name) {
            var match = RegExp('[?&]' + name + '=([^&]*)').exec(url);

            if (match) {
                return decodeURIComponent(match[1].replace(/\+/g, ' '));
            }

            return "";
        },

		addResourceOnMap: function (resource, title) {
            var that = this;

            var layer = null;
            var parts = resource.split(":");

            if (parts.length < 2) {
                console.debug("Url dal layer da aggiungere alla mappa errato");
                console.debug("dovrebbe essere nella forma <catalogType>:<layerUrl>");
                console.debug(url);

                this._onLoadError(this.nls.urlFormatNotValid);
                return;
            }

            var catalogRestType = parts[0];
            var layerUrl = resource.replace(catalogRestType + ":", "");
			
			var addLayerFromUrl = new AddLayerFromUrl();			
			var def ;
			
            switch (catalogRestType) {
                case "agsrest":
                    //layer = that.agsrestFunction(layer, layerUrl);
                    //that.continueServiceSwicth(layer,title);
					addLayerFromUrl.add(this.map, "ARCGIS", layerUrl).then(function(value){
                      that.hideLoader();   						
                    },function(error){
                      that.hideLoader();
                      that._onLoadError(error);
                    });
                break;

                case "ags":
                    layer = that.agsFunction(layer, layerUrl);
                    that.continueServiceSwicth(layer,title);
                break;

                case "wms":
                    //layer = that.wmsFunction(layer, layerUrl, title);
                    that.showLoader();
                    addLayerFromUrl.add(this.map, catalogRestType, layerUrl).then(function(value){
                      that.hideLoader();   						
                    },function(error){
                      that.hideLoader();
                      that._onLoadError(error);
                    });
                break;
                /*
                case "wfs":
                    alert('Il tipo di servizio "'+catalogRestType+'" non è supportato');
                    //layer = that.wfsFunction(layer, layerUrl);					
                    //that.continueServiceSwicth(layer,title);
                break;
                */
                default:
                    this._onLoadError(this.nls.serviceTypeNotHandled + catalogRestType);
                return;
            }

        },

        agsrestFunction: function(layer, layerUrl){
            return ArcGISDynamicMapServiceLayer(layerUrl);
        },

        agsFunction: function(layer, layerUrl){
            var mapType = /[^.]+$/.exec(url)[0];

            if ((mapType == "kmz") || (mapType == "kml")) {
                layer = new KMLLayer(layerUrl);
            } else {
                this._onLoadError(this.nls.serviceTypeNotHandled + mapType);
            }

            return layer;
        },
		
/*
        wmsFunction: function(layer, layerUrl, title){
						
            var that = this;
            var url = that.controlUrlWms(layerUrl);
            that.showLoader();
            esriRequest({
                url: url,
                handleAs: 'xml',
                timeout: that.timeoutValue,
                load: function(response, ioArgs) {
                    layer = that.handleWMSGetCapabilitiesRequest(response, ioArgs, layerUrl);

                    var visible = lang.clone(layer.visibleLayers);
                    var layerInfos = lang.clone(layer.layerInfos);
                    var id = lang.clone(layer.id);

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

                    layer = new WMSLayer(layerUrl, {
                        resourceInfo: resourceInfo,
                        visibleLayers: visible
                    });

                    layer.id = id;

                    that.map.addLayers([layer]);

                    that.hideLoader();

                },
                error: function(error) {
                    that.hideLoader();
                    that._onQueryError(error);
                }
            }, {useProxy:true});
			
        },

        wfsFunction: function(layer, layerUrl){
            return new WFSLayer(layerUrl);
        },

        controlUrlWms: function(url){
            if(url.toLowerCase().indexOf('request=getcapabilities')==-1){
                if(url.indexOf('?')!=-1){
                    url += '&request=GetCapabilities&service=WMS'
                }else{
                    url += '?request=GetCapabilities&service=WMS'
                }
            }
            return url;
        },

        handleWMSGetCapabilitiesRequest: function(response, ioArgs, userUrl){
            var that = this;
            if (response == null) {
                if (window.DOMParser) {
                    var parser = new DOMParser();
                    response = parser.parseFromString(ioArgs.xhr.response,"text/xml");
                } else {// Internet Explorer
                    response = new ActiveXObject("Microsoft.XMLDOM");
                    response.async = false;
                    response.loadXML(ioArgs.xhr.response);
                }
            }
            var version = '';
            for (var i = 0; i < response.childNodes.length; i++) {
                if (response.childNodes[i].attributes != null) {
                    version = esriItutils.getAttribute(response.childNodes[i],'version');
                }
            }

            var name;
            try{
                name = esriItutils.getValue("Service > Title", response);
            }catch (e){
                name = "layer";
            }

            if(version==null){version = '1.3.0';}
            var option = {
                version: version,
                format: 'image/png',
                visible: true
            };
            var wmslayer = new WMSLayerCustom(userUrl,option);
            var idServiceWMS = name ? name.replace(/ /g, "")+'-'+that.cntLayerAdd : 'AggiungiServizio-'+that.cntLayerAdd;

            //wmslayer.idService = "AddServiceOnFly_"+that.cntLayerAdd;
            //wmslayer.tabNameId = name ? name.replace(/ /g, "")+'-'+that.cntLayerAdd : 'AggiungiServizio-'+that.cntLayerAdd;
            //wmslayer.id = "AddServiceOnFly_"+wmslayer.tabNameId;

            wmslayer.idService = idServiceWMS;
            wmslayer.tabNameId = idServiceWMS;
            wmslayer.id = idServiceWMS;

            wmslayer.typeservice = 'wms';
            var lyrInfos = new Array();
            // HTML parsing for BaseLayer CRS property retrieving
            var basexmlLayer = esriItutils.getNodes("Capability", "Layer", response);
            var nodeCRS = new Array();
            if(basexmlLayer.length > 0){
                for (var k = 0; k < basexmlLayer[0].childNodes.length; k++) {
                    if (basexmlLayer[0].childNodes[k].nodeName.toLowerCase()=="crs") {
                        nodeCRS.push( basexmlLayer[0].childNodes[k].textContent );
                    }
                }
            }

            var equivalentCRSList = ["EPSG:900913","EPSG:3785","EPSG:3587","EPSG:3857"];
            for(var i=0; i < nodeCRS.length; i++ ){
                for(var j=0; j < equivalentCRSList.length; j++ ){
                    if( nodeCRS[i] == equivalentCRSList[j] ) wmslayer.myCRS = nodeCRS[i];
                }
            }
            // HTML parsing for layers properties retrieving
            var xmlLayer = esriItutils.getNodes("Layer", "Layer", response);
            var childCounter = 0;
            var parentLayerId = new Array();
            dojo.forEach(xmlLayer, function(lyr, idx, arr) {
                if(idx == childCounter + 1) childCounter += 1;
                var nodename = "";
                var nodetitle = "";
                var nodestyles = new Array();
                var subLayerIds = new Array();
                for (var k = 0; k < lyr.childNodes.length; k++) {
                    if (lyr.childNodes[k].nodeName=="Name") {
                        nodename = lyr.childNodes[k].textContent;
                    }
                    if (lyr.childNodes[k].nodeName=="Title") {
                        nodetitle = lyr.childNodes[k].textContent;
                    }
                    if (lyr.childNodes[k].nodeName=="Style") {
                        for (var z = 0; z < lyr.childNodes[k].childNodes.length; z++) {
                            if (lyr.childNodes[k].childNodes[z].nodeName=="Name") {
                                nodestyles.push( lyr.childNodes[k].childNodes[z].textContent );
                            }
                        }
                    }
                    if(idx == 0){
                        if (lyr.childNodes[k].nodeName=="CRS") {
                            nodeCRS.push( lyr.childNodes[k].textContent );
                        }
                    }
                    if (lyr.childNodes[k].nodeName=="Layer") {
                        childCounter ++;
                        parentLayerId[idx] = -1;
                        subLayerIds.push( childCounter )
                    }
                }
                if(subLayerIds.length > 0){
                    for (var k = 0; k < subLayerIds.length; k++) {
                        parentLayerId[idx+1+k] = subLayerIds[0]-1;
                    }
                }
                nodename = (nodename != "")? nodename : "voidName"+childCounter;
                lyrInfos.push({name:nodename, title: nodetitle, typeservice:'wms',
                    parentLayerId:parentLayerId[idx], subLayerIds: subLayerIds });
                wmslayer.pushStyle(nodestyles);
                wmslayer.addSelectedLayerStyle(nodename, nodestyles[0]);
                wmslayer.visibleLayers.push(nodename);
            });
            wmslayer.layerInfos = lyrInfos;
            wmslayer.declaredClass = "WMSLayerCustom";
			//that.createWMSInspectionPanel( that, wmslayer, "AddServiceOnFly_WMSInfoServizio" );
            that.cntLayerAdd++;

            return wmslayer;
        },
		*/
		
        continueServiceSwicth: function(layer,title){
            var that = this;
            if (layer === null) {
                return;
            }

            if (title) {
                layer.title = title;
            }

            this.showLoader();

            this.map.addLayer(layer);

            layer.on("load", function (layer, error) {
                that.hideLoader();
            });

            layer.on("error", function (error) {
                console.debug("error");
                console.debug(error);
                that.hideLoader();
                //that._onQueryError(error.error);
                that._onLoadError(error.error);
            });
            
            setTimeout(function(){
                that.hideLoader();
            },1000);
        },		
        handleServiziInfoFailed: function(that,response,ioArgs,userUrl){
            if(that.statusDebug){console.log(response);}
            var err_msg = userUrl + '<br>' + that.nls.ERROR_MSG_UNSUCCESSFUL_ESRI_REQUEST;
            esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,600,200);
        },

        addCatalogRestLayer: function (url) {
            var title = this.getQueryStringParameter(url, "title");
            var resource = this.getQueryStringParameter(url, "resource");

            this.addResourceOnMap(resource, title);
        },

        onOpen: function () {
            var footprints = this.map.getLayer("footprints");
            if (footprints)footprints.show();
        },

        onClose: function () {
            this._hideInfoWindow();
            this.inherited(arguments);
            var footprints =
                this.map.getLayer("footprints");
            if (footprints)footprints.hide();
        },

        destroy: function () {
            this._hideInfoWindow();
            if (this.resultLayer) {
                this.map.removeLayer(this.resultLayer);
            }
            this.resultLayer = null;
            this.inherited(arguments);
        },

        onShowAll: function () {
            this.search(null, true);
        },

        onSearch: function () {
            this.startElement = 1;
            this.maxElement = 10;
            this._search();
        },

        _startup: function () {
            if (!this._startedNow) {
            }
            this._startedNow = true;
        },

        _search: function () {

            this.tabContainer.selectTab(this.nls.results);

            if (this.resultLayer) {
                this.resultLayer.clear();
            }

            this.showProgressBar();

            var queryUrl = this.inputQueryCatalog.value;

            var params = {
                start: this.startElement,
                max: this.maxElement,
                f: 'json'
            };
            
            if (!(this.inputQueryName.value.length > 0))  this.inputQueryName.value = "*";
            else{
                this.inputQueryName.value = "* AND ("+this.inputQueryName.value.split(" ").join(" AND ")+")";
            }

            if(this.selectWhats == "dati"){
                var dataset = $("#dati_dataset")[0].checked;
                var series = $("#dati_series")[0].checked;

                if(dataset && series){
                    this.inputQueryName.value += " AND apiso.Type:(dataset OR series)";
                }else if(dataset){
                    this.inputQueryName.value += " AND apiso.Type:(dataset)";
                }else if(series){
                    this.inputQueryName.value += " AND apiso.Type:(series)";
                }
            }else if(this.selectWhats == "servizi"){
                this.inputQueryName.value += " AND (apiso.Type:service)";
            }

            if (this.inputQueryLiveDataFilter.checked) {
                //lang.mixin(params,{contentType:'liveData'});
                lang.mixin(params, {isPartOf: 'Map_Service'});
            }
            if (this.inputQueryName.value.length > 0) {
                lang.mixin(params, {searchText: this.inputQueryName.value});
				this.inputQueryName.value = "";
            }
            var extent = this.map.extent;
            var geom = extent;
            if
            (this.map.spatialReference.wkid == 102100) {
                geom = webMercatorUtils.webMercatorToGeographic(extent);
            }

            var bbox = geom.xmin + "," + geom.ymin + "," + geom.xmax + "," +
                geom.ymax;
            if (this.inputExtentIntersecting.checked) {
                lang.mixin(params, {spatialRel: 'esriSpatialRelOverlaps', bbox: bbox});
            } else if (this.inputExtentFullyWithin.checked) {
                lang.mixin(params, {spatialRel: 'esriSpatialRelWithin', bbox: bbox});
            }


            var requestHandle = esriRequest(
                {url: queryUrl, content: params, handleAs: 'json'},
                {useProxy: false}
            );

            requestHandle.then(
                dojo.hitch(this, this.showResults),
                dojo.hitch(this, this._onQueryError)
            );

        },

        _initList: function () {
            this.list = new List();
            this.list.startup();
        },

        _initLayer: function () {
            if (!this.isValidConfig) {
                return;
            }
            if (this.config.shareResult) {
                this.shelter.show();
                esriRequest({
                    url: (this.config.layer && this.config.layer.url) || '',
                    content: {f: 'json'}, handleAs: 'json',
                    callbackParamName: 'callback', timeout: 30000
                }, {
                    useProxy: false
                }).then(lang.hitch(this, function (response) {
                    response.name = this.nls.queryResult + " : " +
                        response.name;
                    var names =
                        array.map(this.config.layer.fields.field, lang.hitch(this, function (item) {
                            return item.name;
                        }));

                    var objectIdFieldInfo =
                        (array.filter(response.fields, lang.hitch(this, function (fieldInfo) {
                            return fieldInfo.type === 'esriFieldTypeOID';
                        })))[0];
                    if (objectIdFieldInfo) {
                        this.config.layer.objectIdField =
                            objectIdFieldInfo.name;
                    }
                    this.config.layer.existObjectId =
                        array.indexOf(names, this.config.layer.objectIdField) >= 0;
                    response.fields =
                        array.filter(response.fields, lang.hitch(this, function (fieldInfo) {
                            return fieldInfo.type === 'esriFieldTypeOID' ||
                                array.indexOf(names, fieldInfo.name) >= 0;
                        }));
                    this.config.layer.fields.field = response.fields;
                    this.shelter.hide();
                    this.resultLayer = new FeatureLayer({
                        layerDefinition: response, featureSet: null
                    });
                    this.map.addLayer(this.resultLayer);
                    this._startup();
                }), lang.hitch(this, function (err) {
                    this.shelter.hide();
                    console.error(err);
                    this.resultLayer =
                        new GraphicsLayer();
                    this.map.addLayer(this.resultLayer);
                }));
            } else {
                this.resultLayer = new GraphicsLayer();
                this.map.addLayer(this.resultLayer);
            }
        },

        _initTabContainer: function () {
            this.tabContainer = new TabContainer({
                tabs: [{
                    title: this.nls.selectByAttribute, content: this.queryNode1
                }, {
                    title: this.nls.results, content: this.queryNode2
                }], selected: this.nls.selectByAttribute
            }, this.tabQuery);
            this.tabContainer.startup();
            utils.setVerticalCenter(this.tabContainer.domNode);
        },

        _initUI: function () {
            var items = [];

            this.resultLayer = new GraphicsLayer();
            this.map.addLayer(this.resultLayer);

            for (var i = 0; i < this.config.catalogs.length; i++) {
                var catalog = this.config.catalogs[i];

                items.push({
                    "id": catalog.url,
                    "name": catalog.name
                });
            }

            var catalogsStore = new ObjectStore({
                objectStore: new Memory({
                    data: items
                })
            });

            this.inputQueryCatalog.set("store", new Memory({
                data: items
            }));

            // Set default
            this.inputQueryCatalog.set("value", items[0].id);
        },

        toggleFootprints: function () {
            var footprints = this.map.getLayer("footprints");

            if (footprints.visible) {
                footprints.hide();
                this.btnToggleFootprints.textContent =
                    this.nls.show;
            } else {
                footprints.show();
                this.btnToggleFootprints.textContent =
                    this.nls.hide;
            }

        },

        clear: function () {
            this._hideInfoWindow();

            var footprints = this.map.getLayer("footprints");
            if (footprints)
                footprints.hide();

            this.divResultMessage.textContent = this.nls.noResults;

            divResultMessage = dojo.byId("divResultMessage");
            divResultMessage.textContent = "";
            theList = dojo.byId("list");
            theList.innerHTML = "";

            return false;
        },
        
        _onLoadError: function (error) {
            var message = "";
            if(error.message){
              var idRnd = "errmess" + Math.random() ;
              message = (this.nls.layerLoadError || "") + 
              "<div><a href='#' onclick=\"var f = document.getElementById('"+idRnd+"'); f.style.display=(f.style.display=='none'?'block':'none');\">" + this.nls.layerLoadDetail + "</a></div>"+
              "<div id='" + idRnd + "' style='display:none'>" + error.message + "</div>"           ;            
            }else{ message = error;}  
            new Message({
                titleLabel : this.nls.layerLoadTitle,
                message: message
            });
            console.debug(error);
        },
        
        _onQueryError: function (error) {
            this.hideProgressBar();

            var divResult = dom.byId("divResult");
            html.setStyle(divResult, 'display', 'block');

            if (this.resultLayer) {
                this.resultLayer.clear();
            }
            var idRnd = "errmess" + Math.random() ;
            var message = (this.nls.queryError || "") + 
            "<div><a href='#' onclick=\"var f = document.getElementById('"+idRnd+"'); f.style.display=(f.style.display=='none'?'block':'none');\">" + this.nls.queryErrorDetail + "</a></div>"+
            "<div id='" + idRnd + "' style='display:none'>" + error.message + "</div>"           ;
            /*new Message({
                message: error.message || error || this.nls.queryError
            });*/

            new Message({
                titleLabel : this.label,
                message: message
            });

            console.debug(error);
        },

        createMetadataLinkSnippet: function (record, theLink, label) {
            return "<a id='" + record.id + "_metadata' href='" + theLink.href + "' target='_blank'>" + label + "</a>";
        },

        createMetadataLinkSnippetForLayer: function (record, theLink, theLinkType, label) {
            return "<a data-linktype='" + theLinkType + "' layerName='" + record.title + "' id='" + record.id + "' href='#' url='" + theLink.href + "' onmouseenter='dojo.byId(\"list\")' >" + label + "</a>"
        },

        createMetadataLinkCustom: function (record, theLink, label) {
            return "<a class='catalogrest' catalog-rest-type='" + theLink.type + "' id='" + record.id + "_metadata' href='" + theLink.href + "' target='_blank'>" + label + "</a>";
        },

        // VERSIONE 2.0

        emptyList: function () {
            theList = dojo.byId("list");
            theList.innerHTML = "";
        },

        showProgressBar: function () {
            var progressBar = dom.byId("progressBar");
            html.setStyle(progressBar, 'display', 'block');
        },

        hideProgressBar: function () {
            var progressBar = dom.byId("progressBar");
            html.setStyle(progressBar, 'display', 'none');
        },

        showDivResult: function () {
            var divResult = dom.byId("divResult");
            html.setStyle(divResult, 'display', 'block');
        },

        setResultMessage: function (message) {
            var divResultMessage = dom.byId("divResultMessage");
            divResultMessage.textContent = message;
        },

        getLinkByRecord: function (recordLink) {
            var link_class = "";

            var allowed_catalogs = [
                "catalog.rest.wms",
                "catalog.rest.wfs",
                "catalog.rest.wcs",
                "catalog.rest.wmts"
            ];

            var label = this.nls[recordLink.type];

            if (allowed_catalogs.indexOf(recordLink.labelKey) >= 0) {
                label = this.nls[recordLink.labelKey];
            }

            var link = domConstruct.toDom("<a>" + label + "</a>");

            domAttr.set(link, "title", label);
            domAttr.set(link, "href", "#");

            if (recordLink.type == "addToMap") {
                domAttr.set(link, "class", "catalogrest");
                domAttr.set(link, "url", recordLink.href);
            }
            else {
                domAttr.set(link, "href", recordLink.href);
                domAttr.set(link, "target", "_blank");
            }

            return link;
        },

        showRecord: function (record) {
            /*
             ALL POSSIBLE CONTENT TYPEs (depending on what?)

             1. unknown (default)
             2. clearinghouse
             3. liveData
             4. geographicActivities
             */

            var snippet = null;
            var id = record.id;
            var content_type = "unknown";
            var title = record.title;
            var abstract = record.summary;

            var allowed_types = [
                "details",
                "metadata",
                "website",
                "open",
                "addToMap",
                "agskml",
                "agsnmf",
                "agslyr"
            ];

            var allowed_catalogs = [
                "catalog.rest.wms",
                "catalog.rest.wfs",
                "catalog.rest.wcs",
                "catalog.rest.wmts"
            ];

            var template = '<div id="%id%" class="snippet">' +
                '<div class="title">' +
                '<img src="widgets/GeoportalSearch/images/ContentType_%content_type%.png">%title%' +
                '</div>' +
                '<div class="abstract">%abstract%</div>' +
                '</div>';

            if (record.hierarchyLevel == "service") {
                content_type = "liveData";
            }

            // Set image/icon
            template = template.replace("%content_type%", content_type);

            // Set ID
            template = template.replace("%id%", id);

            // Set title
            template = template.replace("%title%", title);

            // Set abstract
            template = template.replace("%abstract%", abstract);

            // Generate snippet
            snippet = domConstruct.toDom(template);
            var links = dojo.place("<div class='links'></div>", snippet, "last");

            // Add links
            for (var i = 0; i < record.links.length; i++) {
                var linkObject = record.links[i];

                // Filter links
                if ((allowed_types.indexOf(linkObject.type) < 0) && (allowed_catalogs.indexOf(linkObject.labelKey) < 0)) {
                    console.debug("Link skipped");
                    console.debug(linkObject);
                    continue;
                }

                var link = this.getLinkByRecord(linkObject);

                if (link == false) {
                    console.debug("Link skipped");
                    console.debug(linkObject);
                    continue;
                }

                // Add link to links div
                dojo.place(link, links, "last");
            }

            dojo.place(snippet, "list", "last");
        },

        showResults: function (results) {
            var that = this;

            // svuota lista
            this.emptyList();

            this.hideProgressBar();
            this.showDivResult();

            if (results.records.length === 0) {
                this.setResultMessage(this.nls.noResults);
                return;
            }

            this.setResultMessage(this.nls.featuresSelected + ": " + results.totalResults);

            // Parse every record
            for (var i = 0; i < results.records.length; i++) {
                var record = results.records[i];

                this.showRecord(record);
            }

            // Paginazione
            var records = (results.totalResults - 1);
            this.pages = Math.ceil(records / this.maxElement);

            if (this.pages > 1) {
                var paginination = domConstruct.toDom('<div class="pagination" id="pageNavPosition"></div>');
                dojo.place(paginination, "list", "last");

                this.showPageNav();
            }

            var features = results.records;
            var symbol = new SimpleFillSymbol();
            symbol.setColor(new esri.Color([0, 0, 0, 0.05]));

            var footprints;
            if (that.footprints) {
                that.footprints = that.map.getLayer("footprints");
            } else {
                that.resultLayer = new GraphicsLayer();
                that.resultLayer.id =
                    "footprints";
                that.map.addLayer(that.resultLayer);
                that.footprints = that.map.getLayer("footprints");
                that.footprints.clear();
            }

            var fullExtent = null;

            for (var i = 0, len = features.length; i < len; i++) {
                var feature = features[i];
                var type = feature.geometry.type;
                var json = {spatialReference: 4326};
                var geometry, centerpoint;

                if (feature.geometry.spatialReference) {
                    json.spatialReference = feature.geometry.spatialReference;
                }

                switch (type) {
                    case "multipoint":
                    case "point":
                        break;
                    case "polyline":
                        break;
                    case "extent":
                    case "Polygon":
                    case "polygon":
                        if (feature.bbox) {
                            var bbox = feature.bbox;
                            geometry =
                                Extent(bbox[0], bbox[1], bbox[2], bbox[3], new
                                    SpatialReference(4326));
                            centerpoint = geometry.getCenter();
                        }
                        break;
                    default:
                        break;
                }

                var title = feature.title;
                var content = feature.summary;
                var it = new InfoTemplate(title, title + "<br>" + content);
                var graphic = new Graphic(geometry, symbol, feature, it);

                that.footprints.add(graphic);

                if (fullExtent === null) {
                    fullExtent = graphic.geometry.getExtent();
                } else {
                    fullExtent = fullExtent.union(graphic.geometry.getExtent());
                }
            }

            if (fullExtent != null) that.map.setExtent(fullExtent.expand(1.2));
        },

       /* _onQueryFinish: function (results, io) {
            var that = this;

            this.hideProgressBar();

            var divResult = dom.byId("divResult");
            html.setStyle(divResult, 'display', 'block');

            if (that.resultLayer) {
                that.resultLayer.clear();
            }

            var title = "";
            var titlefield = that.inputQueryCatalog.value;
            //this.catalogs.value;

            var len = results.records.length;
            var divResultMessage =
                dom.byId("divResultMessage");
            if (len === 0) {
                divResultMessage.textContent = that.nls.noResults;
                return;
            } else {
                divResultMessage.textContent = that.nls.featuresSelected + ": " + results.totalResults;
            }

            theList = dojo.byId("list");
            theList.innerHTML = "";

            var suffixes = ["csv", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "gml", "pdf",
                "zip", "xml", "html", "htm", "aspx", "lyr"];

            var suffixesKML = [".kml", "kmz"];

            for (var i = 0; i < len; i++) {
                var theListContent = "";
                var record = results.records[i];
                var label = "", content = "";

                label = record.title;
                title = record.title;
                content = record.summary;

                var metadataLinkSnippet = "";
                var mapserviceLinkSnippet = "";
                var theLinkType = "";

                for (var j = 0; j < record.links.length; j++) {

                    var theLink = record.links[j];

                    if ((theLink.type == "customLink") || (theLink.type == "agslyr")) {

                        // if a link type has already been established other
                        // than www
                        if (theLinkType.length > 0 && theLinkType != "www")
                            continue;

                        var href = theLink.href;
                        var hrefLower =
                            href.toLowerCase();

                        // if the link ends in any of the suffixes, it's not a
                        // map service, but general web link if not assigned
                        // value yet, check for typical file types
                        if ((theLinkType.length == 0) || (theLinkType === "www")) {
                            for (k = 0; k < suffixes.length; k++) {
                                var suffix = suffixes[i];
                                if
                                (hrefLower.indexOf(suffix) + suffix.length == hrefLower.length) {
                                    theLinkType = "www";
                                    break;
                                }
                            }
                        }

                        // if not assigned value yet, check for KML/KMZ
                        if ((theLinkType.length == 0) || (theLinkType === "www")) {
                            for (k = 0; k < suffixesKML.length; k++) {
                                var suffix = suffixesKML[k];
                                if (hrefLower.indexOf(suffix, hrefLower.length - suffix.length) !== -1) {
                                    theLinkType = "kml";
                                    label = this.nls.typeAgskml;
                                    break;
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
                                        theLinkType.indexOf("?f="));
                                    href =
                                        href.substr(0, href.indexOf("?f="));
                                }

                            } else if (hrefLower.indexOf("/services/") !== -1) {
                                if (hrefLower.indexOf("/mapserver/wmsserver") !== -1) {
                                    theLinkType = "wms";
                                }

                            } else if
                            (hrefLower.indexOf("/com.esri.wms.esrimap") !== -1) {
                                theLinkType = "wms";
                                if (hrefLower.indexOf("?") > 0) {
                                    href = href.substr(0, href.indexOf("?"));
                                }

                            } else if ((hrefLower.indexOf("viewer.html") !== -1) && (hrefLower.indexOf("url=") !== -1)) {
                                href = href.substr(href.indexOf("url=") + 4);
                                href = decodeURIComponent(href);
                                theLinkType = href.split("/").pop().toLowerCase();

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
                            suffix = "?f=lyr";
                            if (hrefLower.indexOf(suffix) + suffix.length == hrefLower.length) {
                                theLinkType = hrefLower.split("/").pop();
                                href = href.replace(suffix, "");
                                break;
                            }
                        }

                        // if all else fails, just make it a generic web link
                        if (theLinkType.length == 0) {
                            theLinkType = "www";
                        }

                        //mapserviceLinkSnippet = "<input id='" + record.id + "_href' type='hidden' data-linktype='" + theLinkType + "' value='" + href + "'/>";
                        metadataLinkSnippet += this.createMetadataLinkSnippetForLayer(record, theLink, theLinkType, this.nls.typeAddToMap);
                    }
                    else if (theLink.type == "metadata") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typeMetadata);
                    }
                    else if (theLink.type == "details") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typeDetails);
                    }
                    else if (theLink.type == "website") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typeWebsite);
                    }
                    else if (theLink.type == "preview") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typePreview);
                    }
                    else if (theLink.type == "open") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typeOpen);
                    }
                    else if (theLink.type == "addToMap") {
                        metadataLinkSnippet += this.createMetadataLinkSnippetForLayer(record, theLink, "addToMap", this.nls.typeAddToMap);
                    }

                    else if (theLink.type == "agskml") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typeAgskml);
                        metadataLinkSnippet += this.createMetadataLinkCustom(record, theLink, this.nls.addToMapAgskml);
                    }
                    else if (theLink.type == "agsnmf") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typeAgsnmf);
                    }
                    else if (theLink.type == "agslyr") {
                        metadataLinkSnippet += this.createMetadataLinkSnippet(record, theLink, this.nls.typeAgslyr);
                    }
                    else if (theLink.type == 'open' && theLink.labelKey == "catalog.rest.open") {
                        metadataLinkSnippet += this.createMetadataLinkSnippetForLayer(record, theLink, theLinkType, this.nls.typeAddToMap);
                    }
                }

                var imgURL = "";
                switch (theLinkType) {
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
                }
                var imgSnippet = "<img src='" + imgURL + "'/>";

                theListContent += "<div class='snippet'>";
                theListContent += "<div id='" + record.id + "' class='title'>" + imgSnippet + record.title + "</div>";
                theListContent += "<div id='" + record.id + "' class='abstract'>" + record.summary + "</div>";
                theListContent += "<div class='links'>";
                theListContent += mapserviceLinkSnippet;
                theListContent += metadataLinkSnippet;
                theListContent += "</div>";
                theListContent += "</div>";
                theList.innerHTML += theListContent;
            }

            var pagination = '<div class="pagination" id="pageNavPosition">';
            pagination += "</div>";
            theList.innerHTML += pagination;

            var records = (results.totalResults - 1);
            this.pages = Math.ceil(records / this.maxElement);
            this.showPageNav();

            var features = results.records;
            var symbol = new SimpleFillSymbol();
            symbol.setColor(new esri.Color([0, 0, 0, 0.05]));

            var footprints;
            if (that.footprints) {
                that.footprints = that.map.getLayer("footprints");
            } else {
                that.resultLayer = new GraphicsLayer();
                that.resultLayer.id =
                    "footprints";
                that.map.addLayer(that.resultLayer);
                that.footprints = that.map.getLayer("footprints");
                that.footprints.clear();
            }

            var fullExtent = null;

            for (var i = 0, len = features.length; i < len; i++) {
                var feature = features[i];
                var type = feature.geometry.type;
                var
                    json = {};
                var geometry, centerpoint;
                if (feature.geometry.spatialReference) {
                    json.spatialReference = feature.geometry.spatialReference;
                } else {
                    json.spatialReference = 4326;
                }
                switch (type) {
                    case "multipoint":
                    case "point":
                        break;
                    case "polyline":
                        break;
                    case "extent":
                    case "Polygon":
                    case "polygon":
                        if (feature.bbox) {
                            var bbox = feature.bbox;
                            geometry =
                                Extent(bbox[0], bbox[1], bbox[2], bbox[3], new
                                    SpatialReference(4326));
                            centerpoint = geometry.getCenter();
                        }
                        break;
                    default:
                        break;
                }

                var title = feature.title;
                var content = feature.summary;
                var it = new InfoTemplate(title, title + "<br>" + content);
                var graphic = new Graphic(geometry, symbol, feature, it);
                //this.resultLayer.add(graphic);
                that.footprints.add(graphic);

                if (fullExtent === null) {
                    fullExtent = graphic.geometry.getExtent();
                } else {
                    fullExtent = fullExtent.union(graphic.geometry.getExtent());
                }
            }

            if (fullExtent != null) that.map.setExtent(fullExtent.expand(1.2));
        },
*/
        _getAlias: function (att) {
            var field = this.config.layer.fields.field;
            var item;
            for (var i in
                field) {
                item = field[i];
                if (item.name.toLowerCase() ===
                    att.toLowerCase() && item.alias) {
                    return item.alias;
                }
            }
            return att;
        },

        _drawResults: function (results) {
            var symbol;
            if (this.config.symbol) {
                if (this.config.symbol.url) {
                    this.config.symbol.url = this.folderUrl +
                        this.config.symbol.url;
                }
                symbol = jsonUtils.fromJson(this.config.symbol);
            }
            var features = results.records;
            for (var i = 0, len =
                features.length; i < len; i++) {
                var feature = features[i];
                var listItem = this.list.items[i];
                var type = feature.geometry.type;
                var json = {};
                var geometry,
                    centerpoint;
                if (feature.geometry.spatialReference) {
                    json.spatialReference = feature.geometry.spatialReference;
                } else {
                    json.spatialReference = 4326;
                }
                switch (type) {
                    case "multipoint":
                    case "point":
                        break;
                    case "polyline":
                        break;
                    case "extent":
                    case "Polygon":
                    case "polygon":
                        if (feature.bbox) {
                            var bbox = feature.bbox;
                            geometry =
                                Extent(bbox[0], bbox[1], bbox[2], bbox[3], new
                                    SpatialReference(4326));
                            if (!symbol) {
                                symbol = new SimpleFillSymbol();
                            }
                            centerpoint = geometry.getCenter();
                        }
                        break;
                    default:
                        break;
                }

                if (this.resultLayer.renderer) {
                    symbol = null;
                }
                var title = listItem.title;
                var content = listItem.content;
                var it = new InfoTemplate(title, title + "<br>" + content);
                var
                    graphic = new Graphic(geometry, symbol, feature, it);
                listItem.centerpoint = centerpoint;
                listItem.graphic = graphic;
                this.resultLayer.add(graphic);
            }
        },

        /*_selectResultItem: function (index, item) {
            var that = this;

            var x = index.clientX;
            var y = index.clientY;
            var element = document.elementFromPoint(x, y);

            var linkType = domAttr.get(element, "data-linktype");
            var href = domAttr.get(element, "href");

            if (href == "#") {
                href = domAttr.get(element, "url");
            }

            var infoTemplate = new InfoTemplate("Attributes", "${*}");

            var layerName = dojo.attr(element, 'layerName');

            if (layerName) {
                if (linkType == "mapserver") {
                    var mapserverLayer = null;
                    if (href.indexOf("tiles.arcgis.com/tiles") > 0) {
                        mapserverLayer = new ArcGISTiledMapServiceLayer(href);
                    } else {
                        mapserverLayer = new ArcGISDynamicMapServiceLayer(href);
                    }

                    mapserverLayer.label = layerName;
                    mapserverLayer.name = layerName;
                    mapserverLayer.title = layerName;

                    this.map.addLayer(mapserverLayer);

                } else if (linkType == "featureserver") {
                    var featureLayer = new FeatureLayer(href, {
                        mode: FeatureLayer.MODE_SNAPSHOT, outFields: ["*"],
                        infoTemplate: infoTemplate
                    });

                    featureLayer.label = layerName;
                    featureLayer.name = layerName;
                    featureLayer.title = layerName;
                    this.map.addLayer(featureLayer);

                } else if (linkType == "imageserver") {
                    var imageServiceLayer = new ArcGISImageServiceLayer(href);
                    imageServiceLayer.label = layerName;
                    imageServiceLayer.name =
                        layerName;
                    imageServiceLayer.title = layerName;
                    this.map.addLayer(imageServiceLayer);

                } else if (linkType == "kml") {
                    var kmlLayer = new KMLLayer(href);
                    kmlLayer.label = layerName;
                    kmlLayer.name = layerName;
                    kmlLayer.title = layerName;
                    this.map.addLayer(kmlLayer);

                } else if (linkType == "wms") {
                    var wmsLayer = new WMSLayer(href);
                    wmsLayer.label = layerName;
                    wmsLayer.name = layerName;
                    wmsLayer.title = layerName;
                    this.map.addLayer(wmsLayer);

                } else if (linkType == "webmap") {
                    var requestHandle = esriRequest({
                        "url": href, handleAs: 'json'
                    }, {
                        useProxy: false
                    });
                    requestHandle.then(this._onFetchWebMapFinish,
                        this._onFetchWebMapError);

                } else {
                    *//*var win = window.open(href, '_blank');
                     win.focus();*//*
                }
            } else {
                var filter = dojo.filter(this.footprints.graphics, function (item, idx) {
                    return element.id == item.attributes.id;
                });

                this.map.infoWindow.hide();
                if (filter.length > 0) {
                    this.map.infoWindow.setTitle(filter[0].infoTemplate.title);
                    this.map.infoWindow.setContent(filter[0].infoTemplate.content);
                    var screenPoint = this.map.toScreen(filter[0].geometry.getExtent().getCenter());
                    this.map.infoWindow.show(screenPoint, this.map.getInfoWindowAnchor(screenPoint));

                    if (this.selectedItem != null) {
                        domClass.remove(this.selectedItem, "geoportalSearchSelectedItem");
                        this.selectedItem = null;
                    } else {
                        this.selectedItem = index.target || index.srcElement || toElement;
                        domClass.add(this.selectedItem, "geoportalSearchSelectedItem");
                    }

                    this.map.infoWindow.on('hide', function () {
                        if (that.selectedItem) {
                            domClass.remove(that.selectedItem, "geoportalSearchSelectedItem");
                            that.selectedItem = null;
                        }
                    });
                }
            }

            if (false) {
                var point = this.list.items[this.list.selectedIndex].centerpoint;
                this.map.centerAt(point).then(lang.hitch(this, function () {
                    this.map.infoWindow.setFeatures([item.graphic]);
                    this.map.infoWindow.setTitle(item.title);
                    if (item.content) {
                        this.map.infoWindow.setContent(item.content);
                    } else {
                        this.map.infoWindow.setContent(item.title);
                    }
                    this.map.infoWindow.reposition();
                    this.map.infoWindow.show(item.centerpoint);
                }));
            }
        },
*/
        _onFetchWebMapFinish: function (response) {
            console.debug('_onFetchWebMapFinish');

            var numLayers = response.operationalLayers.length;
            for (var ii = 0; ii <
            numLayers; ii++) {
                var theLayer = response.operationalLayers[ii];
                var href =
                    theLayer.url;
                var hrefLower = href.toLowerCase();
                var linkType =
                    hrefLower.split("/").pop();

                if (linkType == "mapserver") {
                    var mapserverLayer = null;
                    if
                    (href.indexOf("tiles.arcgis.com/tiles") > 0) {
                        mapserverLayer = new ArcGISTiledMapServiceLayer(href);
                    } else {
                        mapserverLayer = new ArcGISDynamicMapServiceLayer(href);
                    }
                    this._viewerMap.addLayer(mapserverLayer);

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

        _hideInfoWindow: function () {
            if (this.map && this.map.infoWindow) {
                this.map.infoWindow.hide();
            }
        },

        _isConfigValid: function () {
            return this.config.layer && this.config.layer.url &&
                this.config.layer.fields && (this.config.layer.fields.field.length >
                0);
        },

        prev: function () {
            if (this.currentPage > 1) this.showPage(this.currentPage - 1);
        },

        next: function () {
            if (this.currentPage < this.pages) this.showPage(this.currentPage + 1);
        },

        showPageNav: function () {
            var buttonPrev = new Button({
                label: "&#171 Prev",
                baseClass: "pg-normal",
                onClick: dojo.hitch(this, this.prev)
            }, dojo.create('span'));

            dojo.place(buttonPrev.domNode, dojo.byId('pageNavPosition'), 'last');

            var buttonPane = null;
            var maxPage=5;
            var countPage=0;
            if(!this.currentPage) this.currentPage = 1;
            for (var page = this.currentPage; page <= this.pages; page++) {
                if(countPage++ == maxPage) break;
                if (dijit.byId('GeoportalSearch_Pagination_' + page)) dijit.byId('GeoportalSearch_Pagination_' + page).destroyRecursive();
                buttonPane = new Button({
                    id: 'GeoportalSearch_Pagination_' + page,
                    label: page,
                    baseClass: (this.currentPage == page ) ? "pg-selected" : "pg-normal",
                    onClick: dojo.hitch(this, this.showPage, page)
                }, dojo.create('span'));
                dojo.place(buttonPane.domNode, dojo.byId('pageNavPosition'), 'last');
            }

            var buttonNext = new Button({
                label: "Next &#187;",
                baseClass: "pg-normal",
                onClick: dojo.hitch(this, this.next)
            }, dojo.create('span'));

            dojo.place(buttonNext.domNode, dojo.byId('pageNavPosition'), 'last');
        },

        showPage: function (pageNumber) {

            var oldPageAnchor = dijit.byId('GeoportalSearch_Pagination_' + this.currentPage);
            oldPageAnchor.set('baseClass', 'pg-normal')

            this.currentPage = pageNumber;
            var newPageAnchor = dijit.byId('GeoportalSearch_Pagination_' + this.currentPage);
            newPageAnchor.set('baseClass', 'pg-selected');

            this.startElement = (pageNumber - 1) * this.maxElement + 1;
            this._search();
        }
    });
});