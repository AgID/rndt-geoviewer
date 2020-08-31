define(["dojo/_base/declare",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "jimu/esriIT/newTab/HtmlClass",
    "esri/map",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/dijit/Popup",
    "esri/Color",
    "esri/InfoTemplate",
    "dojo/dom",
    "jimu/dijit/DrawBox",
    "dojo/on",
    "esri/toolbars/draw",
    "jimu/WidgetManager",
    "jimu/esriIT/esriItutils",
    "dojo/dom-class",
    "dojo/_base/array",
    'dojo/query',
    'dojo/_base/unload',
    "dojo/Deferred",
    'esri/symbols/jsonUtils',
    'esri/geometry/Point',
    'esri/SpatialReference'

], function ( declare,
              ContentPane,
              Button,
              lang,
              domConstruct,
              HtmlClass,
              Map,
              SimpleLineSymbol,
              SimpleFillSymbol,
              Popup,
              Color,
              InfoTemplate,
              dom,
              DrawBox,
              on,
              Draw,
              WidgetManager,
              sh,
              domClass,
              array,
              query,
              baseUnload,
              Deferred,
              jsonUtils,
              Point,
              SpatialReference) {

    return declare("jimu/esriIT/newTab/MainNewTab", null, {

            mapClass: null,
            htmlClass: null,
            mode: null, //"0" or "1"
            newWindow: null,
            parentWindow: null,
            mapParentWindow: null,
            layerList: [],
            buttonNewWindow: null,
            urlService: null,
            idMap: "",
            drawBox: null,
            serviceLayer: null,
            configWidget: null,
            containerHtmlNewWindow: null,
            arrayButtonNewWindow: null,    // {callbackClick: function(){} , cssStyle: {color:red} }
            checkBoxesLayer: null,
            checks: [],
            deferred: null,
            tocClass: null,
            selectedLayersForExport: null,
            chiusuraWin: 0,

            totalScripsAdd: null,
            totalScripsAddLoad: null,
            basemap: null,
            ARCGIS_LIBRARIES: '//js.arcgis.com/3.15/',

            constructor: function ( config, widget, idContainer ) {
                this.inherited(arguments);
                this.configWidget = config;
                this.mapClass = null;
                this.mode = "0";
                this.widget = widget;
                //this.initButton(idContainer);
                //this.initHtmlClass(config.htmlClass);
                this.totalScripsAdd = 0;
                this.totalScripsAddLoad = 0;

                widgetManager = WidgetManager.getInstance();


            },

            //inizializza pulsante per effettuare l'apertura della nuova finestra
            initButton: function ( idContainer ) {
                var that = this;
                that.buttonNewWindow = new Button({

                    title: that.widget.nls.lblOpenWindow,
                    showLabel: true,
                    label: that.widget.nls.lblOpenWindow,
                    iconClass: 'fa fa-external-link',
                    onClick: function () {
                        if ( that.mode == "0" ) {
                            that.checkBoxesLayer = that.widget.serviziAndLayerBase.getSelectedLayersWithNames();//layersContainer;
                            
                            // that.openNewWindow();

                            //devo cambiare la visibilità dei layer per poterli checkare correttamente dall'altro lato
                            if (that.mapParentWindow.itemInfo.itemData.operationalLayers[0].layers) {
                                var opLayers = that.mapParentWindow.itemInfo.itemData.operationalLayers[0].layers;
                                for (var i = 0; i < opLayers.length; i++ ) {
                                    if (that.checkBoxesLayer != null && that.checkBoxesLayer.length != 0) {
                                        for (var j = 0; j < that.checkBoxesLayer.length; j++) {
                                            var trovato = false;
                                            var arraySplit = that.checkBoxesLayer[j].value.split("/");
                                            var idSelected = arraySplit[arraySplit.length-1];
                                            if ( opLayers[i].id == idSelected ){// controllare quali sono i valori che sono contenuti
                                                that.mapParentWindow.itemInfo.itemData.operationalLayers.visible = true;
                                                trovato = true;
                                            }
                                            if (!trovato) {
                                                that.mapParentWindow.itemInfo.itemData.operationalLayers.visible = false;
                                            }
                                        }
                                    }
                                   
                                }
                            } else {
                                that.widget.feedback.showWarning(this.widget.nls.lblEmptyLayer);
                            }
                            that.openNewWindow();
                        }

                    }
                });
                dom.byId(idContainer).appendChild(that.buttonNewWindow.domNode);
            },

            //callback click al pulsante apri nuova finestra
            openNewWindow: function () {
                var url = this.widget.urlRedirect;
                this.deferred = new Deferred();

                this.deferred.then(lang.hitch(this, function ( ) {
                    this.mode = "1";
                    this.newWindow.mainNewTab = this;
                    
                    this.newWindow.map = this.mapParentWindow;
                    this.newWindow.map.itemInfo = this.mapParentWindow.itemInfo;
                    
                    if (this.widget.config.basemaps && this.widget.basemapGallery.getSelected()) {
                       this.newWindow.basemapId = this.widget.basemapGallery.getSelected(); 
                    }
                    
                    on(this.newWindow,"beforeunload",lang.hitch(this, this.callbackCloseWindow));//era commentato e funzionava per IE e chrome
                    this.newWindow.parent.onbeforeunload = lang.hitch(this, this.closeNewWindow);
                   // baseUnload.addOnUnload(lang.hitch(this, this.closeNewWindow));//quando mi chiudo, chiudi anche il popup

                    this.newWindow.widget = this.widget;
                    //this.newWindow.widget.layers = this.configWidget.layerList;

                    this.disableWidget();
                    //this.newWindow.dojo.place(this.htmlClass.htmlTemplate, this.newWindow.dojo.body());//non funziona .body() su IE
                    this.newWindow.insertMyHTML( this.htmlClass.htmlTemplate );//fix per IE che non ritorna body

                    if (this.widget.config.toolbarDrawBox) {
                        var paramsDrawBox = {
                            map: this.map,
                            showClear: true,
                            keepOneGraphic: true,
                            keepGraphics: false,
                            types: ["polyline", "polygon"]
                        };
                        paramsDrawBox = lang.mixin(paramsDrawBox, this.widget.config.drawBoxOptions);
                        if ( paramsDrawBox.pointSym ) {
                            paramsDrawBox.pointSymbol = jsonUtils.fromJson(paramsDrawBox.pointSym);
                        }
                        if ( this.widget.config.drawBoxOptions.polylineSym ) {
                            paramsDrawBox.polylineSymbol = jsonUtils.fromJson(paramsDrawBox.polylineSym);
                        }
                        if ( this.widget.config.drawBoxOptions.polygonSym ) {
                            paramsDrawBox.polygonSymbol = jsonUtils.fromJson(paramsDrawBox.polygonSym);
                        }
                        var drawBox = new DrawBox(paramsDrawBox);
    
                        this.newWindow.drawBox = drawBox;
                    }
                    this.newWindow.startPage();

                }));
                window.pi_this = this;

                this.newWindow = this.parentWindow.open(url, "_blank");

                if ( !this.newWindow ) {

                    this.widget.feedback.showWarning(this.widget.nls.lblPopupBlocked);
                }
                
            },

            //inizializza pulsante per effettuare l'apertura della nuova finestra
            initButton2: function ( idContainer ) {
                var that = this;
                that.buttonNewWindow = new Button({

                    title: that.widget.nls.lblOpenWindow,
                    showLabel: true,
                    label: that.widget.nls.lblOpenWindow,
                    iconClass: 'fa fa-external-link',
                    onClick: function () {
                        if ( that.mode == "0" ) {
                            this.checkBoxesLayer = that.widget.layersContainer;
                            that.openNewWindow2();
                        }

                    }
                });
                dom.byId(idContainer).appendChild(that.buttonNewWindow.domNode);
            },
            
            //callback click al pulsante apri nuova finestra (versione 2)
            openNewWindow2: function () {
                //var url = this.widget.urlRedirect;
                
                //this.newWindow = this.parentWindow.open("", "_blank");
                
                var htmlNewPage = this.getHtmlIndex();
                //this.newWindow.document.head.outerHTML = htmlNewPage[0].outerHTML;
                //this.newWindow.document.body.outerHTML = htmlNewPage[1].outerHTML;
                
                var html = htmlNewPage[0].outerHTML + htmlNewPage[1].outerHTML;
                //var uri = "data:text/html," + encodeURIComponent(html);//location.protocol + "//" + location.host + "/" + location.pathname.split("/")[1]; //
                //this.newWindow = this.parentWindow.open(uri, "_blank");
 
                this.newWindow = this.parentWindow.open("", "_blank");
                this.newWindow.document.write(html);
                
                var map, tb;
                var startPage, insertMyHTML;
                var widget;
                var mainNewTab, drawLayer;
                var layers;
                var drawBox;
                var basemapId, basemaps;
                var serviziAndLayers;
                var comboBox,textbox;
                var parentWindowIndex = this.newWindow;
                var mainNewTabIndex = this; 
                
                require([
                    "esri/map",
                    "esri/toolbars/draw",
                    "esri/graphic",
                    "dojo/dom",
                    "dojo/_base/lang",
                    "dojo/on",
                    "esri/layers/ArcGISDynamicMapServiceLayer",
                    "esri/arcgis/utils",
                    "esri/symbols/jsonUtils",
                    "esri/layers/GraphicsLayer",
                    "dijit/Toolbar",
                    "dijit/form/Button",
                    'dojo/_base/html',
                    'dijit/form/CheckBox',
                    'dojo/query',
                    'dojox/form/CheckedMultiSelect',
                    'dojo/_base/unload',
                    "dojo/dom-construct",
                    "dojo/_base/window",
                    "esri/dijit/BasemapGallery",
                    "esri/dijit/LocateButton",
                    "esri/dijit/Scalebar",
                    "esri/dijit/HomeButton",
                    "dijit/layout/ContentPane",
                    "dijit/TitlePane",
                    "dojo/parser",
                    "esri/geometry/webMercatorUtils",
                    "dijit/form/TextBox",
                    "esri/tasks/QueryTask",
                    "dijit/form/FilteringSelect",
                    //"jimu/esriIT/serviziAndLayerBase",
                    'dojo/domReady!'
                
                ], function ( Map,
                              Draw,
                              Graphic,
                              dom,
                              lang,
                              on,
                              ArcGISDynamicMapServiceLayer,
                              arcgisUtils,
                              jsonUtils,
                              GraphicsLayer,
                              Toolbar,
                              Button,
                              html,
                              CheckBox,
                              query,
                              CheckedMultiSelect,
                              baseUnload,
                              domConstruct,
                              win,
                              BasemapGallery,
                              LocateButton,
                              Scalebar,
                              HomeButton,
                              ContentPane,
                              TitlePane,
                              parser,
                              webMercatorUtils,
                              TextBox,
                              QueryTask,
                              FilteringSelect
                               ) {
                
                    //var globale chiamata da MainNewTab.js
                    startPage = function() {
                        console.log("startPage newWindow");
                        parser.parse();
                        query("#errorContainerPandIAttachPoint", parentWindowIndex.document).addClass("hide");
                    
                        //inizializza la toolbar con la DrawBox
                        function initToolbar() {
                            console.log("initToolbar newWindow");
                            
                            var drawbar = query("[id^='jimu_dijit_DrawBox']", parentWindowIndex.document);
                            if (drawbar[0]) {
                                domConstruct.destroy(drawbar[0].id);
                            }
                           
                            //for IE only (funziona anche con chrome)
                            
                            domConstruct.place(drawBox.domNode.outerHTML,parentWindowIndex.document.getElementById("toolbar"));
                            drawBox.startup();
                            
                                   
                            drawLayer = new GraphicsLayer({});
                            map.addLayer(drawLayer);
                            tb = new Draw(map);
                            markerSymbol = widget.drawBox.pointSymbol;
                            lineSymbol = widget.drawBox.polylineSymbol;
                            fillSymbol = widget.drawBox.polygonSymbol;
                            tb.setMarkerSymbol(markerSymbol);
                            tb.setLineSymbol(lineSymbol);
                            tb.setFillSymbol(fillSymbol);
                
                            tb.on("draw-end", drawEndCallback);
                
                            on(dojo.query(".draw-items",parentWindowIndex.document), "click", function ( evt ) {
                
                                if ( dojo.query(evt.target, parentWindowIndex.document).attr("data-geotype").length == 0 ) {
                                    return;
                                }
                                var items = dojo.query('.draw-item',parentWindowIndex.document);
                                items.removeClass('jimu-state-active');
                                html.addClass(evt.target, 'jimu-state-active');
                
                                var tool = Draw[dojo.query(evt.target, parentWindowIndex.document).attr("data-geotype")[0]];
                                map.disableMapNavigation();
                                map.setInfoWindowOnClick(false);
                                tb.activate(tool);
                            });
                        }
                
                        function createTextID(){
                                var that =  parentWindowIndex.widget;
                                textbox = new TextBox({
                                    name: "city",
                                    value: that.selectedIdGisForTextBox || '' ,
                                    class: "col1",
                                    style: "margin-left:10%",
                                    placeHolder: that.nls.lblInsertIDGIS
                                }, "textBoxPAndI1");
                    
                                textbox.startup();
                                
                                var buttonText = new Button({
                                    label: that.nls.lblButtonCerca,
                                    disabled: false,
                                    onClick: function () {
                                        comboBox.set('disabled', true);
                                        var qtGeometry = new QueryTask(that.config.urlSiti);
                                        var textBoxValue = document.getElementById("textBoxPAndI1").value;
                                        that.selectedIdGisForTextBox = textBoxValue;
                                        that.textbox.set('value', textBoxValue);
                                        that.textbox.set('disabled', false);
                                        that.comboBox.set('disabled',true);
                                        var qGeometry = that.getQuery("upper(IDGIS) like '%" + textBoxValue.toUpperCase() +"%'");
                                        qtGeometry.execute(qGeometry, lang.hitch(that, loadSiteOnMap));
                                    }
                                }, 'cercaPAndI1');
                                buttonText.startup();
                                
                                var buttonReset = new Button({
                                    label: that.nls.lblButtonReset,
                                    disabled: false,
                                    onClick: function () {
                                        parentWindowIndex.document.getElementById("comboBoxSelectPAndI1").value = null;
                                        parentWindowIndex.document.getElementById("textBoxPAndI1").value = null;
                                        comboBox.set('placeHolder', that.nls.lblSelezionaCombo);
                                        textbox.set('placeHolder', that.nls.lblInsertIDGIS);
                                        
                                        textbox.set('disabled', false);
                                        comboBox.set('disabled', false);
                                        that.comboBox.set('value', '');
                                        that.comboBox.set('placeHolder', that.nls.lblSelezionaCombo);
                                        that.textbox.set('placeHolder', that.nls.lblInsertIDGIS);
                                        that.textbox.set('value', '');
                                    }
                                }, 'resetPAndI1');
                                buttonReset.startup();
                            }
                
                        //callback fine drawtoolbar
                        function drawEndCallback( evt ) {
                
                            //FRA:
                            //controllo se almeno un layer è selezionato:
                             parentWindowIndex.widget.checkedBoxes = getCheckedBoxes();
                            if (serviziAndLayers.getSelectedLayersWithNames().length == 0 ) {
                                parentWindowIndex.widget.feedback.showWarning( parentWindowIndex.widget.nls.lblSelectOneLayer);
                                query("#errorContainerPandIAttachPoint",parentWindowIndex.document)[0].innerHTML =  parentWindowIndex.widget.nls.lblSelectOneLayer;
                                query("#errorContainerPandIAttachPoint",parentWindowIndex.document).removeClass("hide");
                
                                //disabilita drawBox
                                parentWindowIndex.widget.drawBox.deactivate();
                            } else {
                
                                query("#errorContainerPandIAttachPoint",parentWindowIndex.document)[0].innerHTML = '';
                                query("#errorContainerPandIAttachPoint",parentWindowIndex.document).addClass("hide");
                
                                 parentWindowIndex.widget.isNewWindow = true;
                                 parentWindowIndex.widget.checkedBoxes = serviziAndLayers.getSelectedLayersWithNames();
                                 parentWindowIndex.widget.executeGeometryQuery(evt,  parentWindowIndex.widget);
                                //deactivate the toolbar and clear existing graphics 
                                tb.deactivate();
                
                                // figure out which symbol to use
                                var symbol;
                                if ( evt.geometry.type === "point" || evt.geometry.type === "multipoint" ) {
                                    symbol = markerSymbol;
                                } else if ( evt.geometry.type === "line" || evt.geometry.type === "polyline" ) {
                                    symbol = lineSymbol;
                                }
                                else {
                                    symbol = fillSymbol;
                                }
                
                                var g = new Graphic(evt.geometry, symbol, null, null);
                                if (  parentWindowIndex.widget.config.drawBoxOptions.keepOneGraphic ) {
                                    drawLayer.clear();
                                }
                                drawLayer.add(g);
                                drawLayer.redraw();
                                map.enableMapNavigation();
                                map.setInfoWindowOnClick(true);
                
                                //FRA: tolgo lo stile attivo dall'elemento scelto per il disegno
                                dojo.query('.draw-item',parentWindowIndex.document).removeClass('jimu-state-active');
                            }
                        }
                
                        //inizializza mappa nella new window
                        function initMap() {
                            console.log("initMap");
                
                            if (  parentWindowIndex.widget.config.typeMap == "standardMap" ) {
                
                                var idMap = "";
                                var optionsMap = {};
                                map = new Map(parentWindowIndex.document.getElementById(mainNewTabIndex.htmlClass.idMap),  parentWindowIndex.widget.config.optionsMapInternal);
                                
                                map.on("load", function () {
                                    console.log("onload della mappa");
                                    map.on("mouse-move", showCoordinates);
                                    map.on("mouse-drag", showCoordinates);
                                    console.log("dopo la registrazione delle funzioni sulla mappa");
                                    mainNewTabIndex.refreshPositionMap(map, mainNewTabIndex.mapParentWindow);
                                    callbackMapLoadedNewWindow();
                                });
                                
                            } else if (  parentWindowIndex.widget.config.typeMap == "webMap" ) {
                
                                if (  parentWindowIndex.widget.config.arcgisUrl &&  parentWindowIndex.widget.config.arcgisUrl != "" ) {
                                    arcgisUtils.arcgisUrl =  parentWindowIndex.widget.config.arcgisUrl;
                                }
                
                                arcgisUtils.createMap( parentWindowIndex.widget.config.webMapId, mainNewTabIndex.htmlClass.idMap).then(function ( response ) {
                                    console.log("then");
                                    map = response.map;
                                    map.itemInfo =  parentWindowIndex.widget.mapReference.itemInfo;
                                    mainNewTabIndex.refreshPositionMap(map, mainNewTabIndex.mapParentWindow);
                                  
                                    callbackMapLoadedNewWindow();
                                }, function(err){return console.log("error: " + err);});
                
                            }
                    
                        }
                
                
                        //callback dopo il load della mappa 
                        function callbackMapLoadedNewWindow() {
                            console.log("callbackMapLoadedNewWindow");
                           if ( parentWindowIndex.widget.config.typeMap == "standardMap") {
                                var that = this;
                                var arrayLayers = [];
                                var layerList =  parentWindowIndex.widget.config.layerList;
                                for ( i = 0; i < layerList.length; i++ ) {
                                    var layer = layerList[i];
                                    var layerOptions = {
                                        "id": "serviceLayer" + layer.id,
                                        "opacity": 0.8,
                                        "showAttribution": false
                                    };
                    
                                    var serviceLayer = new ArcGISDynamicMapServiceLayer(layer.url, layerOptions);
                                    arrayLayers.push(serviceLayer);
                                }
                                map.addLayers(arrayLayers);
                           }
                 
                            map.on("layers-add-result", function ( evt ) {
                                console.log("layers-add-result   map");
                
                                if (  parentWindowIndex.widget.config.toolbarDrawBox ) {
                                    initToolbar();
                                }
                                //else if ( widget.config.functionalityExample ) {
                                //    dojo.place(dojo.clone(widget.functionalityExample.domNode), window.dojo.byId(mainNewTabIndex.htmlClass.idToolbar));
                                //}
                                if (  parentWindowIndex.widget.config.layersToolbar ) {
                                    initLayers();
                                   // loadCheckedLayers(serviziAndLayers.getSelectedLayersWithNames());
                                }
                                if (  parentWindowIndex.widget.config.basemaps ) {
                                  initBasemaps();
                                } else {
                                  domConstruct.destroy("basemapContainer");
                                }
                                if (  parentWindowIndex.widget.config.homeButton ) {
                                  initHome();
                                }
                                if (  parentWindowIndex.widget.config.locateButton ) {
                                  initLocate();
                                }
                                if (  parentWindowIndex.widget.config.scalebar ) {
                                  initScalebar();
                                }
                                createTextID();
                                createComboSito();
                                
                                // VIEW BUTTON
                                var that =  parentWindowIndex.widget; // iconClass: "button button-search-p-and-i",
                                if (that.config.visualizzaSitiMappa) {
                                    var buttonView = new Button({
                                        label: that.nls.lblViewOnMap,
                                        disabled: false,
                                        onClick: function () {
                                            that.feedback.hide();
                                            if (map.getScale() > that.config.maxScale) {
                                                that.feedback.showWarning(that.nls.lblZoomAlto);
                                                return;
                                            }
                                            createComboSiti(that.map.extent);
                                            buttonView.disabled = true;
                                        }
                                    }, 'button-view-p-and-i1');
                                    buttonView.startup();
                                }
                                
                                //CENTER BUTTON
                                var buttonCenter = new Button({
                                    label: that.nls.lblCenterInMap,
                                    disabled: false,
                                    onClick: function () {
                                        map.setExtent(that.initialSiteExtent);
                                    }
                                }, 'button-center-p-and-i1');
                                buttonCenter.startup();
                
                                parentWindowIndex.document.getElementById("mapDiv").style="height: 104%;";
                
                            });
                        }
                
                            function createComboSiti(extent){
                               
                                var qtGeometry = new QueryTask(widget.config.urlSiti); 
                                var qGeometry =  parentWindowIndex.widget.getQuery("1 = 1");
                                qGeometry.geometry = extent;
                                qtGeometry.execute(qGeometry, lang.hitch( parentWindowIndex.widget, loadComboSites), lang.hitch( parentWindowIndex.widget,  parentWindowIndex.widget.errorQuery));
                 
                            }
                            
                            function loadComboSites(results){
                                var that =  parentWindowIndex.widget;
                                var data = [];
                                dojo.forEach(results.features, function (subItem,subIdx){
                                    var param = {
                                        name:subItem.attributes.DENOM + " (" + subItem.attributes.IDGIS + ")",
                                        id:subItem.attributes.IDGIS
                                    };
                                    data.push(param);
                                });
                                
                                dojo.forEach(results.features, function ( riga ) {  
                                    that.graphicLayer.add(new Graphic(riga.geometry, that.fillSymbol)); 
                                });
                                
                                var comboBoxSiti = new FilteringSelect({
                                        store: new dojo.store.Memory({idProperty: "id", data: data }),
                                        id: "comboBoxSelectPAndISiti",
                                        queryExpr: '*${0}*',
                                        placeHolder: that.nls.lblSelezionaCombo,
                                        onChange: function (newValue) {
                                            var qtGeometry = new QueryTask(that.config.urlSiti);
                                            that.selectedIdGisForCombo = newValue;//.split("(")[1].split(")")[0];
                                            var qGeometry = that.getQuery("IDGIS='" + that.selectedIdGisForCombo +"'");
                                            qtGeometry.execute(qGeometry, lang.hitch(that, loadSiteOnMap), lang.hitch(that, that.errorQuery));
                                        }
                
                                    }, domConstruct.place(domConstruct.create('div'), parentWindowIndex.document.getElementById("comboSitiPAndI1")));
                                comboBoxSiti.startup();
                                comboBoxSiti.set('value',  parentWindowIndex.widget.selectedIdGisForCombo|| null);
                            }
                            
                            function createComboSito(){
                                var qtGeometry = new QueryTask( parentWindowIndex.widget.config.urlSiti); 
                                var qGeometry =  parentWindowIndex.widget.getQuery("1=1");
                                qtGeometry.execute(qGeometry, loadData);
                            }
                            
                            function loadData(results){
                                var that =  parentWindowIndex.widget;
                                var data = [];
                                dojo.forEach(results.features, function (subItem,subIdx){
                                    var param = {
                                        name:subItem.attributes.DENOM + " (" + subItem.attributes.IDGIS + ")",
                                        id:subItem.attributes.IDGIS
                                    };
                                    data.push(param);
                                });
                                comboBox = new FilteringSelect({
                                        store: new dojo.store.Memory({idProperty: "id", data: data }),
                                        id: "comboBoxSelectPAndI1",
                                        class: "col1",
                                        queryExpr: '*${0}*',
                                        placeHolder: that.nls.lblSelezionaCombo,
                                        onChange: function (newValue) {
                                            textbox.set('disabled', true);
                                            that.comboBox.set('value', newValue);
                                            that.textbox.set('disabled',true);
                                            
                                            var qtGeometry = new QueryTask(that.config.urlSiti);
                                            that.selectedIdGisForComboBox = newValue;//.split("(")[1].split(")")[0];
                                            var qGeometry = that.getQuery("IDGIS='" + that.selectedIdGisForComboBox  +"'");
                                            qtGeometry.execute(qGeometry, lang.hitch(that, loadSiteOnMap));
                                     }
                                 }, dojo.place(dojo.create('div'), parentWindowIndex.document.getElementById("comboBoxPAndI1")));
                                comboBox.startup();
                                comboBox.set('value',  parentWindowIndex.widget.selectedIdGisForCombo || null);
                            }
                
                            function loadSiteOnMap(result){
                                widget.loadSite(result);
                                if (result.features.length > 0) {
                                    var geom = result.features[0].geometry;
                                    widget.mapGeom = geom;
                                    map.setExtent(geom.getExtent());
                                    widget.graphicLayer.add(new Graphic(geom, widget.fillSymbol));
                                    widget.initialSiteExtent = geom.getExtent();
                                }
                            }
                            
                        //iniziliazza il contenuto per la toolbar in base alla funzionalità richiesta
                        function initFunctionality() {
                            var html = mainNewTabIndex.containerHtmlNewWindow;
                            var arrayButton = mainNewTabIndex.arrayButtonNewWindow;
                
                           parentWindowIndex.document.getElementById(mainNewTabIndex.htmlClass.idToolbar).appenChild(html);
                            for ( var i = 0; i < arrayButton.length; i++ ) {
                                var prova = arrayButton[i];
                                var button = new Button({
                                    click: function () {
                                        prova.callbackClick;
                                    }
                                }).startup();
                                parentWindowIndex.document.getElementById(mainNewTabIndex.htmlClass.idToolbar).appendChild(button.domNode);
                            }
                        }
                
                
                        //FRA: inizializzo  i layers:
                        //inizializza la toolbar con i layers
                        function initLayers() {
                            debugger;
                            console.log("initLayers newWindow");
                            var params = {};
                            params.map = map;//serve qui                
                            params.insertHtmlDiv = parentWindowIndex.document.getElementById("serviziAndLayersPAndIAttachPointIndex");
                            //ie non prende in tempo il dojo.byId("serviziAndLayersPAndIAttachPointIndex")
                            //quindi:
                           // var div = dojo.create('div');
                            
                            params.widgetBaseClass = 'jimu-widget-P_and_I_index';//new ServiziAndLayerBase(params);//widget.baseClass;
                            //aggiunto il graphic layer per evitare errori nella chiamata al costruttore di ServiziAndLayerBase
                            params.graphicLayer = new GraphicsLayer({opacity: 0.80});
                           // params.importCheckboxesOnStartup = widget.serviziAndLayerBase.getSelectedCheckboxesExportParam();
                            map.addLayer(params.graphicLayer);
                            params.id="1seoijgoaiergjoiaeg";
                
                            setTimeout(function(){
                                serviziAndLayers = new mainNewTabIndex.tocClass(params);//eval(new mainNewTabIndex.tocClass(params));//new ServiziAndLayerBase(params);//
                                serviziAndLayers.startup();
                                var appSelectedLayer =  parentWindowIndex.widget.serviziAndLayerBase.getSelectedCheckboxesExportParam();
                                serviziAndLayers.getLayersFiltrati().then(function(){
                                    serviziAndLayers.importSelectedCheckboxesParam( appSelectedLayer );
                                });}, 500);
                
                        }
                
                         function loadCheckedLayers(layersService) {
                            var arrayNodi = dojo.query(".dijit.dijitReset.dijitInline.dijitCheckBox",parentWindowIndex.document);
                            dojo.forEach(arrayNodi, function(item, index){
                                var child = item.firstChild;
                                dojo.forEach(layersService, function(jtem, jndex){
                                    if (child.value == jtem.value) {
                                        item.firstChild.setAttribute("aria-checked","true");
                                        /*var classes = item.className.split(" ");
                                        item.className = classes[0] + " " + classes[1] + " ";
                                        item.className += "dijitCheckBoxChecked ";
                                        item.className += classes[2] + " ";
                                        item.className += "dijitChecked " + classes[3];*/
                                        if (item.className.indexOf("dijitCheckBoxChecked") == -1) {
                                            item.className += " dijitCheckBoxChecked dijitChecked";
                                        }
                
                                        var nodoPadre = item.parentElement.parentElement.parentElement.parentElement.firstChild.firstChild;
                                        nodoPadre.className += " dijitCheckBoxChecked dijitChecked";
                                    }
                                });
                                
                            });
                         }        
                        //FRA: inizializzo le basemaps:
                        function initBasemaps() {
                            console.log("initBasemaps newWindow");
                
                           // domConstruct.place(widget.config.basemapsGalleryDiv, "bodyIndex");
                            
                            basemaps = new BasemapGallery({
                                showArcGISBasemaps: true,
                                map: map
                            }, "basemaps");
                            
                            basemaps.startup();
                            
                            //FIXME: se si vuole che la basemap scelta nel widget diventi anche quella della mappa della nuova finestra, deccomentare il prossimo codice
                            //       e aggiustarlo, che non funziona ancora
                            //if(basemapId){
                            //    basemaps.select(basemapId);
                            //}
                           
                            basemaps.on("error", function(msg) {
                                console.log("basemap gallery error:  ", msg);
                            });
                        }
                        
                        //FRA: inizializzo il Locate:
                        function initLocate() {
                            console.log("initLocate newWindow");
                            domConstruct.place( parentWindowIndex.widget.config.locateButtonDiv,parentWindowIndex.document.getElementById("mapDiv_root")); 
                            var geoLocate = new LocateButton({
                              centerAt: [12,43],
                              scale: 50000,
                              map: map
                            }, "LocateButton");
                            
                            geoLocate.startup();
                        }
                        
                        //FRA: inizializzo la home:
                        function initScalebar() {
                            console.log("initScalebar newWindow"); 
                            var scalebar = new Scalebar({
                              map: map,
                              // "dual" displays both miles and kilmometers
                              // "english" is the default, which displays miles
                              // use "metric" for kilometers
                              scalebarUnit: "dual"
                            });
                        }
                        
                         //FRA: inizializzo le basemaps:
                        function initHome() {
                            console.log("initHome newWindow");
                            domConstruct.place( parentWindowIndex.widget.config.homeButtonDiv, parentWindowIndex.document.getElementById("mapDiv_root")); 
                            var home = new HomeButton({
                              map: map
                            }, "HomeButton");
                            home.startup();
                        }
                        
                        function getCheckedBoxes() {
                            return query("#layersContainer option[selected='selected']",parentWindowIndex.document);
                        }
                
                        function transformCheckBoxesInLayerList( checkedBoxes, layerList ) {
                            var lista = [];
                            layerList.forEach(function ( jtem, jndex ) {
                                var trovato = false;
                                if ( checkedBoxes && checkedBoxes.length > 0 ) {
                                    checkedBoxes.forEach(function ( item, index ) {
                                        if ( item.value == jtem.id ) {
                                            jtem.checked = true;
                                            trovato = true;
                                        }
                                        if ( !trovato ) {
                                            jtem.checked = false;
                                        }
                                    });
                                } else {
                                    jtem.checked = false;
                                }
                                lista.push(jtem);
                            });
                            return lista;
                
                        }
                        
                        function showCoordinates(evt) {
                          //the map is in web mercator but display coordinates in geographic (lat, long)
                          var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
                          //display mouse coordinates
                          parentWindowIndex.document.getElementById("coordinate").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
                        }
                
                        initMap();
                
                    };
                
                    insertMyHTML = function ( html ){
                        domConstruct.place( html, win.body() );
                    };
                    
                    if ( window.opener && window.opener.pi_this && window.opener.pi_this.deferred ){
                        window.opener.pi_this.deferred.resolve( );//bugfix per IE che non ottiene il body domNode ma un oggetto
                        baseUnload.addOnUnload(lang.hitch(window.opener.pi_this, window.opener.pi_this.callbackCloseWindow));
                    }
                    else
                    {
                        console.log('manca il deferred');
                    }
                
                
                });
                
                function apriToolbar() {
                    var toolbarContainer =  parentWindowIndex.document.getElementById("toolbar");
                    var apri = parentWindowIndex.document.getElementById("apriToolbar").title.split(" ")[0];
                    if (apri === "Apri") {
                        parentWindowIndex.document.getElementById("apriToolbar").title="Chiudi Toolbar";
                       toolbarContainer.style.display="block";
                    } else {
                       parentWindowIndex.document.getElementById("apriToolbar").title="Apri Toolbar";
                       toolbarContainer.style.display="none";
                    }
                }
                 
 
                //this.newWindow.document.body.innerHTML = "pippo";

                
                
                //this.newWindow.document.write(htmlNewPage.outerHTML);
                //domConstruct.place(this.newWindow.document, htmlNewPage.innerHTML);
               // this.newWindow.document.innerHTML = htmlNewPage;
                
                
                if ( !this.newWindow ) {

                    this.widget.feedback.showWarning(this.widget.nls.lblPopupBlocked);
                }
                
                this.mode = "1";
                this.newWindow.mainNewTab = this;
                
                if (this.widget.config.basemaps && this.widget.basemapGallery.getSelected()) {
                   this.newWindow.basemapId = this.widget.basemapGallery.getSelected(); 
                }
                
                on(this.newWindow,"beforeunload",lang.hitch(this, this.callbackCloseWindow));//era commentato e funzionava per IE e chrome
                this.newWindow.parent.onbeforeunload = lang.hitch(this, this.closeNewWindow);
               // baseUnload.addOnUnload(lang.hitch(this, this.closeNewWindow));//quando mi chiudo, chiudi anche il popup

                this.newWindow.widget = this.widget;
                this.newWindow.widget.layers = this.configWidget.layerList;

                this.disableWidget();
                //this.newWindow.dojo.place(this.htmlClass.htmlTemplate, this.newWindow.dojo.body());//non funziona .body() su IE
                //this.newWindow.insertMyHTML( this.htmlClass.htmlTemplate );//fix per IE che non ritorna body

                var paramsDrawBox = {
                    map: this.map,
                    showClear: true,
                    keepOneGraphic: true,
                    keepGraphics: false,
                    types: ["polyline", "polygon"]
                };
                paramsDrawBox = lang.mixin(paramsDrawBox, this.widget.config.drawBoxOptions);
                if ( paramsDrawBox.pointSym ) {
                    paramsDrawBox.pointSymbol = jsonUtils.fromJson(paramsDrawBox.pointSym);
                }
                if ( this.widget.config.drawBoxOptions.polylineSym ) {
                    paramsDrawBox.polylineSymbol = jsonUtils.fromJson(paramsDrawBox.polylineSym);
                }
                if ( this.widget.config.drawBoxOptions.polygonSym ) {
                    paramsDrawBox.polygonSymbol = jsonUtils.fromJson(paramsDrawBox.polygonSym);
                }
                var drawBox = new DrawBox(paramsDrawBox);

                this.newWindow.drawBox = drawBox;

                window.pi_this = this;
   
                setTimeout(function(){
                    startPage()}
                , 2000);
   
            },
            
            getHtmlIndex: function(){
                var html = dojo.create("html");
                var head = dojo.create("head");
                var body = dojo.create("body", {"class":"claro", "id":"bodyIndex"});
                
                dojo.place(head, html);
                dojo.place(body, html);
                
                var scripts = document.createElement('script');
                scripts.setAttribute('src', this.ARCGIS_LIBRARIES); 
                dojo.place(scripts, head);
                
                var url = this.widget.styleSheetsIndex;
                
                var headHTML ='<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><meta name="viewport" content="initial-scale=1, maximum-scale=1,user-scalable=no"/>';
                var bodyHTML = '';
                var scriptHTML ='';

                //aggiungi css
                dojo.forEach(this.widget.config.styleSheetsIndex, function(item,idx){
                    var path = '';
                    if (item.isInArcgis) {
                        path+=apiUrl;
                    }else if(item.isInProject){
                        path+='https://daniel-pc/Acea20Idrico14/';
                    } else {
                        path+="https://daniel-pc/Acea20Idrico14/widgets/P&I/";
                    }
                    
                    headHTML    += '<link type="text/css" rel="stylesheet" href="'+path+item.pathCss+'">';
                });
                
                //aggiunta script per riscrivere l'url
               // headHTML +=  '<script>window.history.pushState({"html":html.outerHTML,"pageTitle":"Prova"}, "Prova", "https://daniel-pc/Acea20Idrico14");</script>';
                
                //aggiungi script
                //this.widget.config.scriptsIndex.push({"path":"https://js.arcgis.com/3.15", "isBody":false});
                dojo.forEach(this.widget.config.scriptsIndex, function(item,idx){
                    var path = '';
                    if (item.isBody) {
                        bodyHTML+='<script type="text/javascript" src="'+item.path+'">';
                    }else {
                        headHTML+='<script type="text/javascript" src="'+item.path+'">';
                    }
                    
                });
                
                
                
                //BODY
                var baseMapDiv = dojo.create('div', {"id": "basemaps"});
                var panelDiv = dojo.create('div', {"data-dojo-type":"dijit/layout/ContentPane", "style":"width:380px; height:280px; overflow:auto;"});
                var titlePanelDiv = dojo.create('div', {"data-dojo-type":"dijit/TitlePane", "data-dojo-props":"title:'Cambia Basemap', closable:false, open:false"});
                var bmcontainer = dojo.create('div', {"class":"indexBasemapContainer", "id":"basemapContainer"});
                
                dojo.place(baseMapDiv, panelDiv);
                dojo.place(panelDiv, titlePanelDiv);
                dojo.place(titlePanelDiv, bmcontainer);
                dojo.place(bmcontainer, body);
                
                var coordinateSpan = dojo.create('span', {"id":"coordinate", "style":"position:absolute; left:150px; bottom:20px; color:#000; z-index:50; font-size: 12px;"});
                dojo.place(coordinateSpan, body);
                
                var errorDiv = dojo.create('div', {"data-dojo-attach-point":"errorContainerPandIAttachPoint", "id":"errorContainerPandIAttachPoint"});
                dojo.place(errorDiv, body);
               
                head.innerHTML += headHTML;
                body.innerHTML += bodyHTML;
                
                return [head, body];//html;
            },
            
            //callback alla chiusura della nuova finestra
            callbackCloseWindow: function () {
                if (this.chiusuraWin>0) {
                    this.chiusuraWin = 0;
                    return;
                }
                console.log("chiusura window");
                this.chiusuraWin++;

                //FRA: aggiungo gestione layers:
                if (this.widget.config.layersToolbar) {
                    this.refreshLayers();
                }
                
                if (this.newWindow && this.mapParentWindow) {
                    this.refreshPositionMap(this.mapParentWindow, this.newWindow.map);
                }
                
                this.mode = "0";

                if ( this.widget.config.toolbarDrawBox ) {

                }

                this.refreshValues();
                this.enableWidget();
                this.newWindow = undefined;
            },

            //inizializza oggetto htmlClass per caricare il template html della nuova finestra
            initHtmlClass: function ( htmlClass ) {
                var objectHtmlClass = lang.clone(htmlClass);
                this.htmlClass = new HtmlClass(objectHtmlClass);

            },


            //inizializza oggetto htmlClass per caricare il template html della nuova finestra
            initHtmlClass2: function ( htmlClass ) {
                var objectHtmlClass = lang.clone(htmlClass);
                this.htmlClass = new HtmlClass(objectHtmlClass);

            },

            //centra e zoom la mappa mapto come la mappa mapFrom
            refreshPositionMap: function ( mapTo, mapFrom ) {
                if ( mapTo != null && mapFrom != null ) {

                    var spatialRef = new SpatialReference(mapFrom.extent.getCenter().spatialReference.wkid);
                    var point = new Point(mapFrom.extent.getCenter().x, mapFrom.extent.getCenter().y, spatialRef);
                    var level = mapFrom.getLevel();
                    mapTo.centerAndZoom(point, level);
                }
            },

            //aggiorna i layer del widget a partire da quelli selezionati della nuova finestra
            refreshLayers: function () {
                console.log("refreshLayers ---> this.widget.layerList:");

                /*var layerList1 = this.widget.layerList;
                var checks = this.checks;
                var checksNew = [];
     
                //if (lang.isArray(layerList)) {
                    layerList1.forEach(function ( item, index ) {
                        checks.forEach(function ( jtem, jndex ) {
                            if ( item.id == jtem.id ) {
                                jtem.set("checked", item.checked);
                                checksNew.push(jtem);
                            }
                        });
                    });
                //}
                
                this.checks = checksNew;*/
                
                var appSelectedLayer =  this.newWindow.serviziAndLayers.getSelectedCheckboxesExportParam();
                console.log("appSelectedLayer: " + appSelectedLayer);
                var that = this;
                that.widget.serviziAndLayerBase.importSelectedCheckboxesParam( appSelectedLayer );
            
           },

            refreshValues: function(){
                this.widget.textbox.value = this.widget.selectedIdGisForTextBox;
                this.widget.comboBox.set('value', this.widget.selectedIdGisForCombo || null);
            },
            //call disable del widget collegato
            disableWidget: function () {
                this.widget.disableWidget();
            },

            //call enable del widget collegato
            enableWidget: function () {
                this.widget.enableWidget();
            },


            getPopup: function () {
                //prova
                var sls = new SimpleLineSymbol("solid", new Color("#444444"), 3);
                var sfs = new SimpleFillSymbol("solid", sls, new Color([68, 68, 68, 0.25]));
                var popup = new Popup({
                    fillSymbol: sfs,
                    lineSymbol: null,
                    markerSymbol: null
                }, domConstruct.create("div"));

                var _infoTemplatePopup = new InfoTemplate();
                _infoTemplatePopup.setTitle("<b>Aggressioni Information</b>");

                _infoTemplatePopup.setContent("BOHHHHHHHH");

                //_infoTemplatePopup dove lo metto???


                return popup;

            },


            //chiude la nuova finestra
            closeNewWindow: function () {
                console.log("closeNewWindow");
                if ( this.newWindow ) {
                    this.newWindow.close();
                }
                
            },

            //setta il contenuto nella div toolbar
            setContentToolbarNewWindow: function ( html, arrayButton ) {

                this.containerHtmlNewWindow = html;

                if ( lang.isArray(arrayButton) ) {
                    this.arrayButtonNewWindow = arrayButton;

                }
                else {

                    console.log("oggetto arrayButton passato non è un array.")
                }

            },

            callCallbackFunctionality: function () {
                if ( this.widget.config.toolbarDrawBox ) {
                    this.initDrawBoxNewWindow();
                }
                else if ( this.widget.config.toolbarMeasurement ) {
                    this.initMeasurement();
                }
            },


            getLayerInformationById: function ( id ) {
                var layerInformation = "";
                this.widget.layerList.forEach(function ( layer ) {
                    if ( layer.id == id ) {
                        layerInformation = layer;
                    }
                });
                return layerInformation;
            },


            receiveMessage: function ( event ) {
                var data = event.data;
                console.log("data=" + data);
                if ( data == "CLOSE NEW WINDOW" ) {
                    //this.drawBox.deactivate();
                }
            },

            extractLayerFromMaps: function ( viewerMap ) {
                var layers = [];
                var viewerMapTemp = viewerMap || window._viewerMap;
                for ( var operationLayer in viewerMapTemp.itemInfo.itemData.operationalLayers ) {
                    var id = operationLayer.id;
                    var url = operationLayer.url;
                    var type = operationLayer.layerType;
                    var infoTemplate = {};
                    var layer = this.mapClass.getLayer(id, url, type, {});
                    layer.push(layer);
                }
                return layers;

            },

            setClassToc: function(tocClass){
                this.tocClass = tocClass;
            },
            
            getClassToc: function(){
               return this.tocClass;
            },

            setSelectedLayersForExport: function(exportLayers){
                this.selectedLayersForExport = exportLayers;
            },
            
            getSelectedLayersForExport: function(){
               return this.selectedLayersForExport;
            }
            
        }
    )
})