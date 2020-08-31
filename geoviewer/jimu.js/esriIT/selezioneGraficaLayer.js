define([
        'dojo/_base/declare',
        'jimu/BaseWidget',
        'dojo/_base/lang',
        'dijit/form/Button',
        "dojo/dom",
        "dojo/dom-construct",
        "dojo/dom-style",
        "dojo/Deferred",
        "esri/request",
        "jimu/esriIT/esriItutils",
        "esri/toolbars/draw",
        "dojo/on",
        "dijit/form/CheckBox",
        'dojo/query',
        'dojo/_base/array',
        "esri/layers/GraphicsLayer",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/graphic",
        "esri/Color",
        "dojox/html/entities",
        "dijit/TitlePane"
    ],
    function ( declare, BaseWidget, lang, Button/*per l'html*/, dom, domConstruct, domStyle, Deferred, esriRequest, esriItutils,
               Draw, on, CheckBox, dojoQuery, array, GraphicsLayer, SimpleLineSymbol, SimpleFillSymbol, Graphic, Color,
               entities, TitlePane ) {

        return declare([BaseWidget], {
            selezionaPuntiDiv: null,
            nls: {
                areaLayerPuntuali: "Area Layer Puntuali",
                selectRectangle: "Seleziona",
                clearLayer: "Cancella selezioni",
                layerSelezionabili: "Layer selezionabili: ",
                layerSelezionati: "Layer selezionati: "
            },
            layersType: "Feature Layer",
            filterLayersUrls: null,
            drawType: Draw.RECTANGLE,
            drawPoint: null,
            geometryType: {"esriGeometryPoint": true, "esriGeometryPolyline": true},
            selectedPoints: [],
            elencoLayersPerIlSelect: null,
            drawRectangleButton: null,
            selectPointButton: null,
            pointsListAttachPoint: null,
            clearLayerButtonAttachPoint: null,
            graphicLayer: null,
            layerSelezionabili: null,
            layerSelezionati: null,
            checkBoxPadri: [],
            checkBoxFigli: [],
            _titlePanesLi: [],
            graphicSelection: true,
            enabledLayersOnlyVisible: true,
            __urlCounter: 0,
            __layersCounter: 0,
            __nrUrlRequests: 0,
            __cacheLayersType: {},//verra condiviso da tutte le istanze
            __alberoLayers: [],
            _initGeometryTypes: {},
            deferred: null,
            layersGeometryType: [],
            checkBoxesContainer: [],
            checkBoxesMapService: [],
            mapServers: [],
            loaderSteps: 0,

            constructor: function ( parameters ) {
                //reinizializza qui, siccome vengono create più istanze di questa classe

                declare("selezioneGraficaLayerAlbero", [], {

                    layers: null,
                    padre: null,
                    url: null,
                    checkBox: null,

                    constructor: function ( padre, layer ) {
                        this.padre = padre;
                        this.layer = layer;
                        this.layers = {};
                    },

                    setCheckBox: function ( checkBox ) {
                        this.checkBox = checkBox;
                    },

                    getCheckBox: function () {
                        return this.checkBox;
                    },

                    getName: function () {
                        if ( this.layer.hasOwnProperty('name') ) {
                            return this.layer.name;
                        }

                        if ( this.layer.hasOwnProperty('title') ) {
                            return this.layer.title;
                        }

                        return this.layer.id;
                    },

                    getRoot: function () {
                        return this.padre === null ? this : this.padre.getRoot();
                    },

                    setUrl: function ( url ) {
                        this.url = url;
                    },

                    getMapServerUrl: function () {
                        if ( this.url !== null ) {
                            return this.url;
                        }

                        if ( this.padre === null ) {
                            return "";
                        }

                        return this.padre.getMapServerUrl();
                    },

                    getUrl: function () {
                        if ( this.url !== null ) {
                            return this.url;
                        }

                        if ( this.layer.hasOwnProperty("url") ) {
                            return this.layer.url;
                        }

                        if ( this.padre === null ) {
                            return "";
                        }

                        return esriItutils.fixUrlWithToken(this.padre.getMapServerUrl() + "/" + this.layer.id);
                    },

                    hasSubLayers: function () {
                        var key;
                        for ( key in this.layers ) {
                            if ( this.layers.hasOwnProperty(key) ) {
                                return true;
                            }
                        }

                        return false;
                    },

                    getSubLayer: function ( key ) {
                        return this.layers[key];
                    },

                    getSubLayers: function () {
                        return this.layers;
                    },

                    addSubLayer: function ( layer ) {
                        var temp = new selezioneGraficaLayerAlbero(this, layer);
                        //this.layers.push( temp );

                        this.layers[layer.id] = temp;
                        return temp;
                    },

                    removeSubLayer: function ( layer ) {
                        delete this.layers[layer.layer.id];
                    },

                    getParent: function () {
                        return this.padre;
                    },

                    getSelectedSubLayers: function () {
                        var selectedLayers = [];

                        if ( this.checkBox === null ) {
                            return selectedLayers;
                        }

                        if ( !this.checkBox.checked ) {
                            return selectedLayers;
                        }

                        // Nodo foglia
                        if ( !this.hasSubLayers() ) {
                            // Aggiungi se stesso
                            selectedLayers.push(this.checkBox.value);

                            return selectedLayers;
                        }

                        // per ogni figlio fai il merge dei selezionati sul sotto figlio e selectedSubLayers

                        var key, subLayer, selectedSubLayers;
                        for ( key in this.getSubLayers() ) {
                            if ( this.getSubLayers().hasOwnProperty(key))
                            {
                                subLayer = this.getSubLayer(key);
                                selectedSubLayers = subLayer.getSelectedSubLayers();

                                // Merge arrays
                                selectedLayers = selectedLayers.concat(selectedSubLayers);
                            }
                        }

                        return selectedLayers;
                    },

                    isDisabled: function () {
                        return false;
                    },

                    isVisible: function () {
                        if ( this.padre === null ) {
                            return this.layer.visible;
                        }

                        if ( this.layer.hasOwnProperty("visible") ) {
                            return this.layer.visible;
                        }

                        if ( this.layer.visible !== undefined ) {
                            return this.layer.visible;
                        }

                        //se è una webmap il grouplayer rimane visibile e i figli disabilitati, vabbene cosi, perchè tecnicamente è giusto
                        return this.getRoot().layer.visibleLayers.indexOf(this.layer.id) > -1;
                    }
                });

                // Check and add "selezioneGraficaLayer.css"
                if ( !this._isLoadedCSS() ) {
                    this._addCSS();
                }

                this.deferred = new Deferred();
                this.selezionaPuntiDiv = null;
                this.layersType = "Feature Layer";
                this.filterLayersUrls = null;
                this.drawType = Draw.RECTANGLE;
                this.drawPoint = null;

                this.geometryType = {
                    "esriGeometryPoint": true,
                    "esriGeometryPolygon": false,
                    "esriGeometryPolyline": true
                };
                this.selectedPoints = [];
                this.elencoLayersPerIlSelect = null;
                this.drawRectangleButton = null;
                this.selectPointButton = null;
                this.pointsListAttachPoint = null;
                this.clearLayerButtonAttachPoint = null;
                this.graphicLayer = null;
                this.layerSelezionabili = null;
                this.layerSelezionati = null;
                this.checkBoxPadri = [];
                this.checkBoxFigli = [];
                this._titlePanesLi = [];
                this.__urlCounter = 0;
                this.__nrUrlRequests = 0;
                lang.mixin(this, parameters);
            },

            _isLoadedCSS: function () {
                return document.getElementById("selezioneGraficaLayer");
            },

            _addCSS: function () {
                var head = document.getElementsByTagName('head')[0];

                var filename = window.location.protocol + "//" + window.location.host + require.toUrl("jimu") + "/esriIT/css/selezioneGraficaLayer.css";
                var link = document.createElement("link");

                link.setAttribute("id", "selezioneGraficaLayer");
                link.setAttribute("rel", "stylesheet");
                link.setAttribute("type", "text/css");
                link.setAttribute("href", filename);
                link.setAttribute("media", "all");

                head.appendChild(link);
            },

            startup: function ( selezionaPuntiDiv, map, drawCallbackFunction, layersType, geometryType, filterLayersUrls, drawType, nls ) {
                this.map = map;

                this.mapServers = [];
                this.checkBoxesContainer = [];
                this.checkBoxesMapService = [];

                var graphicLayerDalParam = (this.graphicLayer !== undefined && this.graphicLayer !== null);
                this.graphicLayer = this.graphicLayer || new GraphicsLayer({opacity: 0.80});

                //aggiungi solo se non è passato come param
                if ( !graphicLayerDalParam ) {
                    this.map.addLayer(this.graphicLayer);
                }

                this.selectedPoints = [];
                this.selezionaPuntiDiv = selezionaPuntiDiv || this.selezionaPuntiDiv;
                this.filterLayersUrls = filterLayersUrls || this.filterLayersUrls;
                this.layersType = layersType || this.layersType;
                this.geometryType = geometryType || this.geometryType;

                // set styles
                domStyle.set(this.selezionaPuntiDiv, "position", "relative");
                domStyle.set(this.selezionaPuntiDiv, "overflow", "hidden");

                var key, upperCaseKey;//trasforma le chiavi in uppercase
                for ( key in this.geometryType ) {
                    if ( this.geometryType.hasOwnProperty(key) ) {
                        upperCaseKey = key.toUpperCase();
                        this.geometryType[upperCaseKey] = this.geometryType[key];
                        delete this.geometryType[key];
                    }
                }

                this.drawType = drawType || this.drawType;
                this.nls = nls || this.nls;

                var imgLoading = '<img class="jimu-loading" style="position:relative" src="' + require.toUrl('jimu') + '/images/loading.gif">';

                var loaderOverlay = '<div class="loaderOverlay"><span class="loaderOverlaySpan">loading...</span></div>';

                var html = domConstruct.toDom('<div class="selezioneGraficaLayer areaLayers clearfix" style="padding: 0px 20px 10px 5px; display: table">' +
                    loaderOverlay +
                    '<h2 style="margin-top: 10px;text-align: center">' + entities.encode(this.nls.areaLayerPuntuali) + ' </h2>' +
                    '<p class="layerSelezionabili" style="margin-top: 10px;text-align: left">' + entities.encode(this.nls.layerSelezionabili) + '<span>0</span></p>' +
                    '<p class="layerSelezionati" style="margin-top: 10px;text-align: left">' + entities.encode(this.nls.layerSelezionati) + '<span>0</span></p>' +
                    '<ul data-dojo-attach-point="elencoLayersPerIlSelect" class="groupLayerLabel" style= "list-style: none; padding-left: 0;"></ul>' +
                    '</div>'
                );

                domConstruct.place(html, this.selezionaPuntiDiv);


                this.loaderOverlay = dojoQuery('div.loaderOverlay', this.selezionaPuntiDiv)[0];
                var div = dojoQuery('div.areaLayers', this.selezionaPuntiDiv)[0];

                this.layerSelezionabili = dojoQuery('.layerSelezionabili span', this.selezionaPuntiDiv)[0];
                this.layerSelezionati = dojoQuery('.layerSelezionati span', this.selezionaPuntiDiv)[0];
                this.elencoLayersPerIlSelect = dojoQuery('ul[data-dojo-attach-point="elencoLayersPerIlSelect"]', this.selezionaPuntiDiv)[0];
                this.selectPointButton = dojoQuery('button[data-dojo-attach-point="selectPointButton"]', this.selezionaPuntiDiv)[0];
                this.pointsListAttachPoint = dojoQuery('ul[data-dojo-attach-point="pointsListAttachPoint"]', this.selezionaPuntiDiv)[0];

                if ( this.graphicSelection === true ) {

                    var buttonSeleziona = new Button({
                        label: this.nls.selectRectangle,
                        style: "float:left"
                    });

                    domConstruct.place(buttonSeleziona.domNode, div);

                    var buttonClear = new Button({
                        label: this.nls.clearLayer,
                        style: "float:right"
                    });
                    domConstruct.place(buttonClear.domNode, div);

                    this.clearLayerButtonAttachPoint = buttonClear.domNode;
                    this.drawRectangleButton = buttonSeleziona.domNode;


                    this.own(on(this.clearLayerButtonAttachPoint, 'click', lang.hitch(this, function () {
                        this.graphicLayer.clear();
                    })));


                    this.drawPoint = new Draw(this.map);
                    this.drawPoint.on("draw-end", lang.hitch(this, this.addPointGraphic));

                    this.drawRectangle = new Draw(this.map);
                    this.drawRectangle.on("draw-end", lang.hitch(this, function ( event ) {
                        this.drawRectangle.deactivate();

                        var symbol = new SimpleFillSymbol(
                            SimpleFillSymbol.STYLE_SOLID,
                            new SimpleLineSymbol(
                                SimpleLineSymbol.STYLE_SOLID,
                                new Color([255, 0, 0, 0.5]), 2
                            ),
                            new Color([79, 129, 189, 0.5])
                        );

                        var graphic = new Graphic(event.geometry, symbol);
                        this.graphicLayer.add(graphic);
                        drawCallbackFunction(this.getLayersSelected(), event);
                    }));

                    var that = this;
                    this.own(on(this.drawRectangleButton, "click", function () {
                        that.drawRectangle.activate(that.drawType);
                    }));
                }

                this.getLayersFiltrati().then(lang.hitch(this, function () {
                    this.hideLoader();
                }));
            },


            setLoaderMessage: function ( message ) {
                dojoQuery(".loaderOverlaySpan", this.selezionaPuntiDiv)[0].innerHTML = message;
            },

            setLoaderSteps: function ( steps ) {
                this.loaderSteps = steps;
            },

            showProgressBar: function ( currentStep ) {
                if ( currentStep === 0 ) {
                    this.hideLoader();
                    return;
                }

                // @hack: riposiziona lo span del preloaderOverlay
                //domStyle.set("loaderOverlaySpan", "margin-top", "20%");

                var step_completed = this.loaderSteps - currentStep;

                var percentage = (step_completed / this.loaderSteps) * 100;
                this.setLoaderMessage("Processing " + percentage.toFixed(0) + "%");
            },

            showLoader: function () {
                domStyle.set(this.loaderOverlay, "display", "inline-block");
            },

            hideLoader: function () {
                domStyle.set(this.loaderOverlay, "display", "none");
            },

            countOperationalLayers: function () {
                var operationalLayers = this.getOperationalLayers();
                var counter = 0;
                var key, layer;

                for ( key in operationalLayers ) {
                    if ( operationalLayers.hasOwnProperty(key) ) {
                        layer = operationalLayers[key];

                        if ( !layer.hasOwnProperty("layerObject") ) {
                            continue;
                        }

                        if ( layer.layerObject.hasOwnProperty("geometryType") ) {
                            counter++;
                            continue;
                        }

                        counter += layer.layerObject.layerInfos.length;
                    }
                }

                return counter;
            },

            getGeometryType: function ( layer ) {
                var layerID = layer.layer.id;
                var mapLayerID = layer.getRoot().layer.id;

                if ( layerID != mapLayerID ) {
                    return this._initGeometryTypes[mapLayerID].layers[layerID].geometryType;
                }

                // Is a MapServer or Group Layer... so no geometry type
                return null;
            },

            getOperationalLayers: function () {
                var key, layer, layers = [];

                for ( key in this.map.itemInfo.itemData.operationalLayers ) {
                    if ( this.map.itemInfo.itemData.operationalLayers.hasOwnProperty(key))
                    {
                        layer = this.map.itemInfo.itemData.operationalLayers[key];

                        if ( this.isAllowedUrl(layer.url) ) {
                            layers.push(layer);
                        }
                    }
                }

                return layers;
            },

            addLayerToGeometryTypes: function ( layerID, geometryType, layerObject ) {
                this._initGeometryTypes[layerID] = {
                    "layerID": layerID,
                    "geometryType": geometryType,
                    "layerObject": layerObject
                };
            },

            addSubLayerToGeometryType: function ( layerID, subLayerID, geometryType, layerObject ) {
                this._initGeometryTypes[layerID].layers[subLayerID] = {
                    "layerID": subLayerID,
                    "geometryType": geometryType,
                    "layerObject": layerObject
                };
            },

            initGeometryTypes: function () {
                var geometryTypeDeferred = new Deferred();

                var that = this;

                var operationalLayers = this.getOperationalLayers();
                this.__urlCounter = this.countOperationalLayers();
                this.layerSelezionabili.innerHTML = this.__urlCounter;

                // Show loaderOverlay
                this.showLoader();
                this.setLoaderSteps(this.__urlCounter);

                this.showProgressBar(this.__urlCounter);

                if ( operationalLayers.length === 0 ) {
                    this.hideLoader();

                    geometryTypeDeferred.resolve();

                    return geometryTypeDeferred;
                }

                var key;
                for ( key in operationalLayers ) {
                    var layer = operationalLayers[key];

                    var layerID = layer.id;
                    var layerObject = layer.layerObject;

                    if ( layerObject.hasOwnProperty('geometryType') ) {
                        that.__urlCounter--;
                        that.showProgressBar(this.__urlCounter);

                        this.addLayerToGeometryTypes(layerID, layer.geometryType, layerObject);

                        if ( that.__urlCounter === 0 ) {
                            geometryTypeDeferred.resolve(this._initGeometryTypes);
                        }

                        continue;
                    }

                    // Esri request per ogni sublayer
                    var layerInfos = layer.layerObject.layerInfos;

                    if ( !this._initGeometryTypes.hasOwnProperty(layerID) ) {
                        this._initGeometryTypes[layerID] = {
                            "layerInfos": layerInfos,
                            "layers": {}
                        };
                    }

                    var key2;
                    for ( key2 in layerInfos ) {
                        if ( layerInfos.hasOwnProperty(key2) )
                        {
                            var subLayer = layerInfos[key2];

                            // @hack: fix with token
                            var url = esriItutils.fixUrlWithToken(layer.url + "/" + subLayer.id);

                            // Se esiste allora e' in cache
                            if ( this._initGeometryTypes[layerID].layers.hasOwnProperty(subLayer.id) ) {
                                //this.__urlCounter--;
                                //this.showProgressBar(this.__urlCounter);
                                this.__esriRequestSuccess(layer, subLayer, geometryTypeDeferred, this._initGeometryTypes[layerID].layers.hasOwnProperty(subLayer.id));
                                continue;
                            }

                            this._initGeometryTypes[layerID].layers[subLayer.id] = {};

                            var request = esriRequest({
                                url: url,
                                content: {f: "json"},
                                handleAs: "json",
                                load: lang.hitch(this, this.__esriRequestSuccess, layer, subLayer, geometryTypeDeferred),
                                error: function ( error ) {
                                    window.console.log(error);
                                }
                            });
                        }
                    }
                }

                return geometryTypeDeferred;
            },


            __esriRequestSuccess: function ( layer, subLayer, deferred, response ) {
                this.__urlCounter--;
                this.showProgressBar(this.__urlCounter);

                this.addSubLayerToGeometryType(
                    layer.id,
                    subLayer.id,
                    response.geometryType,
                    layer.layerObject
                );

                if ( this.__urlCounter === 0 ) {
                    this.hideLoader();
                    deferred.resolve(this._initGeometryTypes);
                }

            },


            getLayersSelected: function () {
                var layersUrl = [];
                var that = this;

                array.forEach(that.mapServers, function ( tree, index ) {
                    //var tree = that.mapServers[index];

                    if ( !tree.hasOwnProperty("checkBox") ) {
                        return;
                    }

                    if ( !tree.checkBox.checked ) {
                        return;
                    }

                    var subLayers = tree.getSelectedSubLayers();
                    layersUrl = layersUrl.concat(subLayers);
                });

                return layersUrl;
            },

            /* @hack: da controllare */
            refreshLayersService: function ( visibleLayers ) {
                for ( var i = 0; i < this.checkBoxesContainer.length; i++ ) {
                    if ( visibleLayers.indexOf(i) >= 0 ) {
                        this.checkBoxesContainer[i].set('disabled', false);
                    }
                    else {
                        this.checkBoxesContainer[i].set('disabled', 'disabled');
                    }
                }
            },

            contaNrRichiesteURL: function () {
                var counter = 0;

                var layerIds = this.map.layerIds, i, layer;
                for ( i = 0; i < layerIds.length; i++ ) {

                    layer = this.map.getLayer(layerIds[i]);

                    if ( layer._basemapGalleryLayerType === "basemap" ) {
                        continue;//salta i basemap
                    }

                    counter = counter + layer.layerInfos.length;
                }

                return counter;
            },


            getLayersFiltrati: function () {
                var that = this;

                var i, j, layer, layerID;

                var gtDeferred = this.initGeometryTypes();

                gtDeferred.then(function ( geometryTypes ) {
                    // Init "Selectable layers counter"
                    that.layerSelezionabili.innerHTML = that.countOperationalLayers();

                    for ( var layerId in geometryTypes ) {
                        var geometryTypelayer = geometryTypes[layerId];
                        var layer = that.map.getLayer(layerId);
                        var mapServerTree = null;

                        if ( geometryTypelayer.hasOwnProperty("geometryType") ) {
                            mapServerTree = that.getTreeByGraphicLayer(layer);
                        }
                        else {
                            // Get tree by layerInfo
                            mapServerTree = that.getTreeByLayersInfo(layer, geometryTypelayer.layerInfos);
                        }

                        that.mapServers.push(mapServerTree);

                        // Processa Map Server Tree
                        that.__processaMapServer(mapServerTree);

                        // Show this tree
                        var mapServerTree = that.cleanTree(mapServerTree);
                        that.showTree(mapServerTree);
                    }
                });

                return gtDeferred;
            },

            getTreeByGraphicLayer: function ( graphicLayer ) {
                if ( !this.isAllowedUrl(graphicLayer.url) ) {
                    return null;
                }

                var mapServerLayer = new selezioneGraficaLayerAlbero(null, graphicLayer);

                var layerURL = esriItutils.getLayerURLByUrl(graphicLayer.url);

                mapServerLayer.addSubLayer(graphicLayer);
                mapServerLayer.setUrl(layerURL);

                return mapServerLayer;
            },

            isAllowedUrl: function ( url ) {
                if ( lang.isArray(this.filterLayersUrls) !== true ) {
                    return true;
                }

                if ( this.filterLayersUrls.length == 0 ) {
                    return true;
                }

                return array.some(this.filterLayersUrls, function ( filterLayerUrl ) {
                    // @hack: in questo caso non funziona se url = "AggressioniDonna/0" e filterLayerUrl = "AggressioniDonna"
                    return filterLayerUrl.indexOf(url) === 0;
                });
            },

            getTreeByLayersInfo: function ( layer, layersInfo ) {
                if ( !this.isAllowedUrl(layer.url) ) {
                    return null;
                }

                var layers = {
                    "-1": new selezioneGraficaLayerAlbero(null, layer)
                };

                layers[-1].setUrl(layer.url);

                var layerInfo, parent, newLayer, key;
                for ( key in layersInfo ) {
                    if ( layersInfo.hasOwnProperty(key) ) {
                        layerInfo = layersInfo[key];
                        parent = layers[layerInfo.parentLayerId];

                        // Controlla url filtrati
                        var subLayerUrl = layer.url + "/" + layerInfo.id;

                        if ( !this.isAllowedUrl(subLayerUrl) && (layerInfo.subLayerIds === null)) {
                            continue;
                        }

                        newLayer = parent.addSubLayer(layerInfo);
                        layers[layerInfo.id] = newLayer;
                    }
                }

                return layers["-1"];
            },

            isAllowedGeometryType: function ( geometryType ) {
                // is a group layer
                if ( geometryType === null ) {
                    return true;
                }

                return this.geometryType[geometryType.toUpperCase()] === true;
            },

            cleanTree: function ( tree ) {
                if ( !tree.hasSubLayers() ) {
                    // Group layer
                    if ( tree.layer.geometryType === null ) {
                        return null;
                    }
                    else {
                        // Foglia
                        return tree;
                    }
                }

                var subLayers = tree.getSubLayers();

                for ( var key in subLayers ) {
                    if ( subLayers.hasOwnProperty(key) ) {
                        var subLayer = subLayers[key];
                        var temp = this.cleanTree(subLayer);

                        if ( temp === null ) {
                            tree.removeSubLayer(subLayer);
                        }
                    }
                }

                // Se un group layer non ha più subLayers va eliminato
                if ( !tree.hasSubLayers() ) {
                    return null;
                }

                return tree;

            },

            showTreeCheckboxes: function ( tree, containerDomNode ) {
                // Crea li
                var li = domConstruct.create('li');

                var checked = tree.isVisible();
                var disabled = tree.isDisabled();

                // visibleLayers
                var mapServerLayer = tree.getRoot().layer;

                // Crea cb
                var checkBoxLayer = new CheckBox({
                    name: "selectRectangleLayer",
                    //style: "float:left; margin-bottom: 0 !important",
                    value: tree.getUrl(),
                    checked: checked,
                    disabled: disabled,
                    onClick: lang.hitch(this, this._aggiornaContatoreLayerSelezionati),
                    idLayer: tree.layer.id
                });

                tree.setCheckBox(checkBoxLayer);

                //solo per i mapserver
                if ( tree.layer.layerInfos ) {
                    //mapServer
                    this.own(on(tree.layer, 'visibility-change', lang.hitch(this, function ( checkBoxLayer, event ) {
                        checkBoxLayer.set('checked', event.visible);
                        checkBoxLayer.set('disabled', !event.visible);
                        //disabilita/abilita i figli
                        this.refreshLayersService(event.target.visibleLayers);
                        this._aggiornaContatoreLayerSelezionati();
                    }, checkBoxLayer)));


                    //ascolta subLayers
                    this.own(on(tree.layer, 'visible-layers-change', lang.hitch(this, function ( event ) {
                        //disabilita/abilita i figli
                        this.refreshLayersService(event.visibleLayers);
                        this._aggiornaContatoreLayerSelezionati();
                    })));
                }


                // Add checkBoxLayer to label
                var label = domConstruct.toDom('<label>&nbsp;' + tree.getName() + '</label>');
                domConstruct.place(checkBoxLayer.domNode, label, 'first');

                // Add label to li
                domConstruct.place(label, li, 'first');

                domConstruct.place(li, containerDomNode);

                if ( !tree.hasSubLayers() ) {
                    return;
                }

                var subUl = domConstruct.create('ul');
                domConstruct.place(subUl, li);

                var subLayers = tree.getSubLayers();

                for ( var key in subLayers ) {
                    if ( subLayers.hasOwnProperty(key) ) {
                        this.showTreeCheckboxes(subLayers[key], subUl);
                    }
                }
            },

            showTree: function ( tree ) {
                if ( tree === null ) {
                    return;
                }

                var titlePane = new TitlePane({title: tree.getName(), content: "", open: false});

                domConstruct.place(titlePane.domNode, this.elencoLayersPerIlSelect);
                titlePane.startup();

                if ( tree.hasSubLayers() ) {
                    // crea lista
                    var ul = domConstruct.create('ul');
                    domConstruct.place(ul, titlePane.containerNode);

                    this.showTreeCheckboxes(tree, ul);
                }
            },

            __processaMapServer: function ( mapServerTree ) {
                var subLayers = mapServerTree.getSubLayers();
                var key;
                for ( key in subLayers ) {
                    if ( subLayers.hasOwnProperty(key) ) {
                        this.__processaLayer2(subLayers[key], mapServerTree);
                    }
                }
            },

            __processaLayer2: function ( layer, parent ) {
                var that = this;

                var layerGeometryType = null;

                if ( !layer.layer.hasOwnProperty("geometryType") ) {
                    layerGeometryType = this.getGeometryType(layer);
                    layer.layer.geometryType = layerGeometryType;
                }
                else {
                    layerGeometryType = layer.layer.geometryType;
                }

                if ( !that.isAllowedGeometryType(layerGeometryType) ) {
                    parent.removeSubLayer(layer);
                    return layer;
                }

                var subLayers = layer.getSubLayers();

                for ( var key in subLayers ) {
                    if ( subLayers.hasOwnProperty(key) ) {
                        var subLayer = subLayers[key];
                        that.__processaLayer2(subLayer, layer);
                    }
                }

                return layer;
            },


            __finishedLoadingAjax: function ( layer ) {
                var tree = this.cleanTree(layer.getRoot());
                this.showTree(tree);
                this._aggiornaContatoreLayerSelezionabili();
                this._aggiornaContatoreLayerSelezionati();
                this.deferred.resolve();
            },

            _aggiornaContatoreLayerSelezionati: function ()
            {
                this.layerSelezionati.innerHTML = this.getLayersSelected().length;
            },

            _aggiornaContatoreLayerSelezionabili: function ()
            {
                var that = this;
                var counter = 0;

                this.getLayersFiltrati().then(function (mapServers) {
                    for (var idx in mapServers) {
                        var mapServer = mapServers[idx];

                        counter += mapServer.layers.length;
                    }

                    that.layerSelezionabili.innerHTML = counter;
                });
            }
        });
    });