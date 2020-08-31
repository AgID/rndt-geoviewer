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
        "dijit/TitlePane",
        'dojo/dom-class',
        'jimu/LayerInfos/LayerInfos'
    ],
    function (declare, BaseWidget, lang, Button/*per l'html*/, dom, domConstruct, domStyle, Deferred,
              esriRequest, esriItutils, Draw, on, CheckBox, dojoQuery, array, GraphicsLayer,
              SimpleLineSymbol, SimpleFillSymbol, Graphic, Color, entities, TitlePane, domClass,
              LayerInfos) {

        return declare([BaseWidget], {
            insertHtmlDiv: null,
            nls: {
                areaLayerPuntuali: "Area Layer Puntuali",
                selectRectangle: "Seleziona",
                clearLayer: "Cancella selezioni",
                layerSelezionabili: "Layer selezionabili: ",
                layerSelezionati: "Layer selezionati: "
            },
            filterLayersUrls: null,
            filterLayers: [],
            geometryType: {"esriGeometryPoint": true, "esriGeometryPolyline": true},
            elencoLayersPerIlSelect: null,
            clearLayerButtonAttachPoint: null,
            graphicLayer: null,
            layerSelezionabili: null,
            layerSelezionati: null,
            __urlCounter: 0,
            _initGeometryTypes: {},
            checkBoxesContainer: [],
            mapServers: [],
            loaderSteps: 0,
            deferredFinishedLoading: null,//deferred che indica che ha lo startup ha finito, può servire
            importCheckboxesOnStartup: null,//stato checkboxes da importare subito dopo che abbiamo creato l'html

            constructor: function (parameters) {
                this.inherited(arguments);
                //reinizializza qui, siccome vengono create più istanze di questa classe

                // Check and add "selezioneGraficaLayer.css"
                if (!this._isLoadedCSS()) {
                    this._addCSS();
                }

                this.filterLayers = [];
                //Esempio
                //this.filterLayers = [{ domain: "gis20.a20g.lan", name: "GIS_A2/web_ms_a2_reteidrica_128000", id: "0" }]
                this.insertHtmlDiv = null;
                this.filterLayersUrls = null;
                this.drawPoint = null;
                this.elencoLayersPerIlSelect = null;
                this.clearLayerButtonAttachPoint = null;
                this.graphicLayer = null;
                this.layerSelezionabili = null;
                this.layerSelezionati = null;
                this.__urlCounter = 0;
                this._initGeometryTypes = {};
                this.checkBoxesContainer = [];
                this.mapServers = [];
                this.loaderSteps = 0;
                this.deferredFinishedLoading = new Deferred();
                this.importCheckboxesOnStartup = null;

                lang.mixin(this, parameters);
            },

            postCreate: function () {
                this.inherited(arguments);

                this.populateOperationLayerInfo();

                this.mapServers = [];
                this.checkBoxesContainer = [];

                var graphicLayerDalParam = (this.graphicLayer !== undefined && this.graphicLayer !== null);
                this.graphicLayer = this.graphicLayer || new GraphicsLayer({opacity: 0.80});

                //aggiungi solo se non è passato come param
                if (!graphicLayerDalParam) {
                    this.map.addLayer(this.graphicLayer);
                }

            },

            startup: function () {

                // set styles
                domStyle.set(this.insertHtmlDiv, "position", "relative");
                domStyle.set(this.insertHtmlDiv, "overflow", "hidden");

                var loaderOverlay = '<div class="loaderOverlay"><span class="loaderOverlaySpan">Caricamento...</span></div>';

                var html = domConstruct.toDom(
                    '<div class="selezioneGraficaLayer areaLayers clearfix" style="padding: 0px 20px 10px 5px; display: table; width: 100%">' +
                    loaderOverlay +
                    '<p class="layerSelezionabili" style="margin-top: 10px;text-align: left">' + entities.encode(this.nls.layerSelezionabili) + '<span>0</span></p>' +
                    '<p class="layerSelezionati" style="margin-top: 10px;text-align: left">' + entities.encode(this.nls.layerSelezionati) + '<span>0</span></p>' +
                    '<ul data-dojo-attach-point="elencoLayersPerIlSelect" class="groupLayerLabel" style= "list-style: none; padding-left: 0;"></ul>' +
                    '</div>'
                );
                this.declareInnerClass();
                if (this.insertHtmlDiv) {
                    domConstruct.place(html, this.insertHtmlDiv);
                } else {
                    this.insertHtmlDiv = domConstruct.create('div');
                    domConstruct.place(html, this.insertHtmlDiv);
                    domConstruct.place(this.insertHtmlDiv, dom.byId("toolbar"));
                }

                this.loaderOverlay = dojoQuery('div.loaderOverlay', this.insertHtmlDiv)[0];

                this.layerSelezionabili = dojoQuery('.layerSelezionabili span', this.insertHtmlDiv)[0];
                this.layerSelezionati = dojoQuery('.layerSelezionati span', this.insertHtmlDiv)[0];
                this.elencoLayersPerIlSelect = dojoQuery('ul[data-dojo-attach-point="elencoLayersPerIlSelect"]', this.insertHtmlDiv)[0];

                this.getLayersFiltrati().then(lang.hitch(this, function () {
                    this.hideLoader();
                    this.deferredFinishedLoading.resolve();

                    if (this.importCheckboxesOnStartup) {
                        this.importSelectedCheckboxesParam(this.importCheckboxesOnStartup);
                    }

                }));


                this._aggiungiCss(this.widgetBaseClass);
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

            setLoaderMessage: function (message) {
                dojoQuery(".loaderOverlaySpan", this.insertHtmlDiv)[0].innerHTML = message;
            },

            setLoaderSteps: function (steps) {
                this.loaderSteps = steps;
            },

            showProgressBar: function (currentStep) {
                if (currentStep === 0) {
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

                for (key in operationalLayers) {
                    if (operationalLayers.hasOwnProperty(key)) {
                        layer = operationalLayers[key];

                        if (!layer.hasOwnProperty("layerObject")) {
                            continue;
                        }

                        if (layer.layerObject.hasOwnProperty("geometryType")) {
                            counter++;
                            continue;
                        }

                        array.forEach(layer.layerObject.layerInfos, function (layerInfo) {
                            //non contare group layer e mapserver
                            if (layerInfo.subLayerIds === null && (layerInfo.parentLayerId == -1 || this.groupLayerAct)) {

                                if (!this.isAllowedUrl(layer.url + '/' + layerInfo.id)) {
                                    return;//fix per il contatore
                                }
                                counter++;
                            }
                        }, this);
                        //counter += layer.layerObject.layerInfos.length;
                    }
                }

                return counter;
            },

            getGeometryType: function (layer) {
                var layerID = layer.layer.id;
                var mapLayerID = layer.getRoot().layer.id;

                if (layerID != mapLayerID) {
                    return this._initGeometryTypes[mapLayerID].layers[layerID].geometryType;
                }

                // Is a MapServer or Group Layer... so no geometry type
                return null;
            },

            getOperationalLayers: function () {
                var key, layer, layers = [];

                for (key in this.map.itemInfo.itemData.operationalLayers) {
                    if (this.map.itemInfo.itemData.operationalLayers.hasOwnProperty(key)) {
                        layer = this.map.itemInfo.itemData.operationalLayers[key];

                        if (this.isAllowedUrl(layer.url)) {
                            layers.push(layer);
                        }
                    }
                }

                return layers;
            },

            addLayerToGeometryTypes: function (layerID, geometryType, layerObject) {
                this._initGeometryTypes[layerID] = {
                    "layerID": layerID,
                    "geometryType": geometryType,
                    "layerObject": layerObject
                };
            },

            addSubLayerToGeometryType: function (layerID, subLayerID, geometryType, layerObject) {
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

                if (operationalLayers.length === 0) {
                    this.hideLoader();

                    geometryTypeDeferred.resolve();

                    return geometryTypeDeferred;
                }

                var key, layer, layerID, layerObject, layerInfos, key2, subLayer, url;
                for (key in operationalLayers) {
                    if (operationalLayers.hasOwnProperty(key)) {
                        layer = operationalLayers[key];

                        layerID = layer.id;
                        layerObject = layer.layerObject;

                        if (!layerObject) {
                            continue;
                        }

                        if (layerObject.hasOwnProperty('geometryType')) {
                            that.__urlCounter--;
                            that.showProgressBar(this.__urlCounter);

                            this.addLayerToGeometryTypes(layerID, layer.geometryType, layerObject);

                            if (that.__urlCounter === 0) {
                                geometryTypeDeferred.resolve(this._initGeometryTypes);
                            }

                            continue;
                        }

                        // Esri request per ogni sublayer
                        layerInfos = layer.layerObject.layerInfos;

                        if (!this._initGeometryTypes.hasOwnProperty(layerID)) {
                            this._initGeometryTypes[layerID] = {
                                "layerInfos": layerInfos,
                                "layers": {}
                            };
                        }

                        for (key2 in layerInfos) {
                            if (layerInfos.hasOwnProperty(key2)) {
                                subLayer = layerInfos[key2];

                                // @hack: fix with token
                                url = esriItutils.fixUrlWithToken(layer.url + "/" + subLayer.id);

                                // Se esiste allora e' in cache
                                if (this._initGeometryTypes[layerID].layers.hasOwnProperty(subLayer.id)) {
                                    //this.__urlCounter--;
                                    //this.showProgressBar(this.__urlCounter);

                                    this.__esriRequestSuccess(
                                        layer,
                                        subLayer,
                                        geometryTypeDeferred,
                                        this._initGeometryTypes[layerID].layers.hasOwnProperty(subLayer.id)
                                    );

                                    continue;
                                }

                                this._initGeometryTypes[layerID].layers[subLayer.id] = {};

                                var lyrReq = esriRequest({
                                    url: url,
                                    content: {f: "json"},
                                    handleAs: "json",
                                    callbackParamName: "callback"
                                });

                                lyrReq.then(
                                    lang.hitch(this, function (layer, subLayer, geometryTypeDeferred, response) {
                                        this.__esriRequestSuccess(
                                            layer,
                                            subLayer,
                                            geometryTypeDeferred,
                                            response
                                        )
                                    }, layer, subLayer, geometryTypeDeferred),
                                    lang.hitch(this, function (error) {
                                        window.console.log(error);
                                        this.__urlCounter--;
                                        this.showProgressBar(this.__urlCounter);
                                    })
                                );
                            }
                        }
                    }
                }

                return geometryTypeDeferred;
            },

            __esriRequestSuccess: function (layer, subLayer, deferred, response) {
                this.__urlCounter--;
                this.showProgressBar(this.__urlCounter);

                this.addSubLayerToGeometryType(
                    layer.id,
                    subLayer.id,
                    response.geometryType,
                    layer.layerObject
                );

                if (this.__urlCounter === 0) {
                    this.hideLoader();
                    deferred.resolve(this._initGeometryTypes);
                }

            },

            getLayersSelected: function () {
                var layersUrl = [];
                var that = this;

                array.forEach(that.mapServers, function (tree, index) {
                    //var tree = that.mapServers[index];

                    if (!tree.hasOwnProperty("checkBox")) {
                        return;
                    }

                    if (!tree.checkBox.checked) {
                        return;
                    }

                    var subLayers = tree.getSelectedSubLayers();
                    layersUrl = layersUrl.concat(subLayers);
                });

                return layersUrl;
            },

            importSelectedCheckboxesParam: function (albero) {

                var checkedValue = 0;
                array.forEach(this.mapServers, function (root) {//per ogni mapServer

                    if ( !albero.hasOwnProperty(root.url) ) {
                        return;
                    }

                    if (albero[root.url].checked) {
                        root.checkBox.set('checked', 'checked');
                        checkedValue++;
                    }
                    else {
                        root.checkBox.set('checked', false);
                    }

                    if (root.hasSubLayers() && albero[root.url].hasOwnProperty("layers")) {
                        checkedValue = this.__recursiveSetCheckboxes(root.layers, albero[root.url].layers, --checkedValue);
                    }

                }, this);

                this.layerSelezionati.innerHTML = checkedValue < 0 ? 0 : checkedValue;
            },

            __recursiveSetCheckboxes: function (layers, checkBoxes, checkedValue) {
                array.forEach(Object.keys(layers), function (key) {
                    var layer = layers[key];
                    if (!layer) {
                        return;
                    }

                    if (checkBoxes[key]) {
                        layer.checkBox.set('checked', 'checked');
                        checkedValue++;
                    }
                    else {
                        layer.checkBox.set('checked', false);
                    }

                    if (layer.hasSubLayers()) {
                        this.__recursiveSetCheckboxes(layer.layers, checkBoxes, --checkedValue);
                    }
                }, this);
                return checkedValue;
            },

            getSelectedCheckboxesExportParam: function (albero) {
                var result = {};

                if (!albero) {
                    albero = this.mapServers;
                }

                //nel caso di più basemap, non possiamo usare layerID, ma dobbiamo usare layerURL come chiave unica
                array.forEach(Object.keys(albero), function (layerID) {

                    var elemento = albero[layerID];

                    if (elemento.url) {//caso ROOT(possono essere più mapServer)
                        result[elemento.url] = {
                            url: elemento.url,
                            checked: albero[layerID].checkBox.checked,
                            layers: {}
                        };
                        var root = result[elemento.url];
                        if (albero[layerID].layers) {
                            var layersFigli = this.getSelectedCheckboxesExportParam(albero[layerID].layers);
                            root.layers = lang.mixin(root.layers, layersFigli);
                        }

                    }
                    else {//caso groupLayer/layer
                        result[layerID] = albero[layerID].checkBox.checked;
                        if (albero[layerID].layers) {
                            var resultFigli = this.getSelectedCheckboxesExportParam(albero[layerID].layers);
                            result = lang.mixin(result, resultFigli);
                        }
                    }

                }, this);

                return result;
            },

            _myJoinArrays: function (oldArray, newArray) {
                array.forEach(newArray, function (val, index) {
                    oldArray[index] = val;
                });
            },

            getSelectedLayersWithNames: function () {
                var layersUrl = [];
                var that = this;

                array.forEach(that.mapServers, function (tree, index) {
                    //var tree = that.mapServers[index];

                    if (!tree.hasOwnProperty("checkBox")) {
                        return;
                    }

                    if (!tree.checkBox.checked) {
                        return;
                    }

                    var subLayers = tree.getSelectedSubLayersWithName();
                    layersUrl = layersUrl.concat(subLayers);
                });

                return layersUrl;
            },

            /* @hack: da controllare */
            refreshLayersService: function (visibleLayers) {
                for (var i = 0; i < this.checkBoxesContainer.length; i++) {
                    if (visibleLayers.indexOf(i) >= 0) {
                        this.checkBoxesContainer[i].set('disabled', false);
                    }
                    else {
                        this.checkBoxesContainer[i].set('disabled', 'disabled');
                    }
                }
            },

            getLayersFiltrati: function () {
                var that = this;

                var i, j, layer, layerID;

                var gtDeferred = this.initGeometryTypes();

                gtDeferred.then(function (geometryTypes) {
                    // Init "Selectable layers counter"
                    that.layerSelezionabili.innerHTML = that.countOperationalLayers();

                    for (var layerId in geometryTypes) {
                        var geometryTypelayer = geometryTypes[layerId];
                        var layer = that.map.getLayer(layerId);
                        var mapServerTree = null;

                        if (geometryTypelayer.hasOwnProperty("geometryType")) {
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

            getTreeByGraphicLayer: function (graphicLayer) {
                if (!this.isAllowedUrl(graphicLayer.url)) {
                    return null;
                }

                var mapServerLayer = new selezioneGraficaLayerAlbero(null, graphicLayer);

                var layerURL = esriItutils.getLayerURLByUrl(graphicLayer.url);

                mapServerLayer.addSubLayer(graphicLayer);
                mapServerLayer.setUrl(layerURL);

                return mapServerLayer;
            },

            isAllowedUrl: function (url) {

                var testFailed = array.some(this.filterLayers, function (filter) {

                    var layerUrl = url;
                    if (layerUrl.indexOf("?") !== -1) {
                        layerUrl = layerUrl.split("?")[0];
                    }

                    var pieces = layerUrl.split('/');
                    if (pieces[pieces.length - 1] == filter.id) {//quindi controlliamo il caso di /11 e /1

                        var posDomain = url.indexOf(filter.domain);
                        if (posDomain > 0 && url.indexOf(filter.name + '/MapServer') > posDomain) {
                            return true;
                        }
                    }
                });

                if (testFailed) {
                    return false;
                }

                if (lang.isArray(this.filterLayersUrls) !== true) {
                    return true;
                }

                if (this.filterLayersUrls.length === 0) {
                    return true;
                }

                return array.some(this.filterLayersUrls, function (filterLayerUrl) {
                    // @hack: in questo caso non funziona se url = "AggressioniDonna/0" e filterLayerUrl = "AggressioniDonna"
                    return filterLayerUrl.indexOf(url) === 0;
                });
            },

            getTreeByLayersInfo: function (layer, layersInfo) {
                if (!this.isAllowedUrl(layer.url)) {
                    return null;
                }

                var layers = {
                    "-1": new selezioneGraficaLayerAlbero(null, layer)
                };

                layers[-1].setUrl(layer.url);

                var layerInfo, parent, newLayer, key;
                for (key in layersInfo) {
                    if (layersInfo.hasOwnProperty(key)) {
                        layerInfo = layersInfo[key];
                        parent = layers[layerInfo.parentLayerId];

                        //fix effettuata per evitare di portare i group layer
                        //per eliminare i sublayer!
                        if (!((layerInfo.parentLayerId == -1) && (layerInfo.subLayerIds && layerInfo.subLayerIds.length != 0)) || this.groupLayerAct) {
                            // Controlla url filtrati
                            var subLayerUrl = layer.url + "/" + layerInfo.id;

                            if (!this.isAllowedUrl(subLayerUrl) && (layerInfo.subLayerIds === null)) {
                                continue;
                            }
                            if (parent) {
                                newLayer = parent.addSubLayer(layerInfo);
                                layers[layerInfo.id] = newLayer;
                            }
                            
                        }
                    }
                }

                return layers["-1"];
            },

            cleanTree: function (tree) {
                if (!tree.hasSubLayers()) {
                    // Group layer
                    if (tree.layer.geometryType === null) {
                        return null;
                    }
                    else {
                        // Foglia
                        return tree;
                    }
                }

                var subLayers = tree.getSubLayers();

                for (var key in subLayers) {
                    if (subLayers.hasOwnProperty(key)) {
                        var subLayer = subLayers[key];
                        var temp = this.cleanTree(subLayer);

                        if (temp === null) {
                            tree.removeSubLayer(subLayer);
                        }
                    }
                }

                // Se un group layer non ha più subLayers va eliminato
                if (!tree.hasSubLayers()) {
                    return null;
                }

                return tree;

            },

            showTreeCheckboxes: function (groupLayerName, tree, containerDomNode) {
                // Crea li
                var li = domConstruct.create('li');

                var checked = tree.isVisible();
                var disabled = tree.isDisabled();

                // visibleLayers
                var mapServerLayer = tree.getRoot().layer;

                // Crea cb
                var checkBoxLayer = new CheckBox({
                    //name: "selectRectangleLayer",
                    name: tree.getName(),
                    //style: "float:left; margin-bottom: 0 !important",
                    value: tree.getUrl(),
                    groupLayerName: groupLayerName,
                    //checked: checked,
                    disabled: disabled,
                    onClick: lang.hitch(this, this._aggiornaContatoreLayerSelezionati, tree),
                    idLayer: tree.layer.id
                });

                tree.setCheckBox(checkBoxLayer);

                //solo per i mapserver
                if (tree.layer.layerInfos) {
                    //mapServer
                    this.own(on(tree.layer, 'visibility-change', lang.hitch(this, function (checkBoxLayer, event) {
                        checkBoxLayer.set('checked', event.visible);
                        checkBoxLayer.set('disabled', !event.visible);

                        this.refreshLayersService(event.target.visibleLayers);
                        this._aggiornaContatoreLayerSelezionati();
                    }, checkBoxLayer)));

                    //ascolta subLayers
                    this.own(on(tree.layer, 'visible-layers-change', lang.hitch(this, function (event) {

                        this.refreshLayersService(event.visibleLayers);
                        this._aggiornaContatoreLayerSelezionati();
                    })));
                }

                // Add checkBoxLayer to label
                //solo per i mapserver
                var label;

                if (tree.hasSubLayers()) {
                    label = domConstruct.toDom('<div class="nodoPadre"><label>&nbsp;' + tree.getName() + '</label></div>');
                }
                else {
                    label = domConstruct.toDom('<label>&nbsp;' + tree.getName() + '</label>');
                }

                domConstruct.place(checkBoxLayer.domNode, label, 'first');

                if (!tree.getParent()) {
                    // se è il root
                    var checkButton = '<div class="checkUncheckAll unchecked" title="Check/Uncheck"></div>';
                    domConstruct.place(checkButton, label, 'last');

                }

                if (tree.hasSubLayers()) {
                    var imgButton = '<div class="apriChiudi chiudi" title="Apri/Chiudi"></div>';
                    domConstruct.place(imgButton, label, 'last');
                }

                // Add label to li
                domConstruct.place(label, li, 'first');

                domConstruct.place(li, containerDomNode);

                if (!tree.hasSubLayers()) {
                    return;
                }

                var subUl = domConstruct.create('ul');
                domConstruct.place(subUl, li);

                var subLayers = tree.getSubLayers();

                for (var key in subLayers) {
                    if (subLayers.hasOwnProperty(key)) {
                        this.showTreeCheckboxes(tree.getName(), subLayers[key], subUl);
                    }
                }
            },

            showTree: function (tree) {
                if (tree === null) {
                    return;
                }

                var title = this.getMapServerNameById(tree.layer.id);

                var titlePane = new TitlePane({title: title || tree.getName(), content: "", open: false});

                domConstruct.place(titlePane.domNode, this.elencoLayersPerIlSelect);
                titlePane.startup();

                if (tree.hasSubLayers()) {
                    // crea lista
                    var ul = domConstruct.create('ul');
                    domConstruct.place(ul, titlePane.containerNode);

                    tree.layer.title = title;//setta il nome del primo ul
                    this.showTreeCheckboxes(tree.getName(), tree, ul);
                }

                this.own(on(titlePane.domNode, on.selector('div.checkUncheckAll', 'click'), lang.partial(function (tree, that) {

                    if (domClass.contains(this, 'unchecked')) {
                        that.__changeCheck(tree, 'checked');
                    }
                    else {
                        that.__changeCheck(tree, false);
                    }

                    domClass.toggle(this, 'checked');
                    domClass.toggle(this, 'unchecked');

                    that._aggiornaContatoreLayerSelezionati();

                }, tree, this)));

                this.own(on(titlePane.domNode, on.selector('div.apriChiudi', 'click'), function () {
                    var nodes = this.parentElement.parentElement.getElementsByTagName('ul');

                    domClass.toggle(this, 'apri');

                    //togle visibility
                    array.forEach(nodes, function (node) {
                        if (node.style.display === 'none') {
                            node.style.display = 'block';

                        }
                        else {
                            node.style.display = 'none';
                        }

                    });

                }));
            },

            __changeCheck: function (tree, checked) {
                if (tree.getCheckBox()) {
                    tree.getCheckBox().set('checked', checked);
                }

                if (tree.hasSubLayers()) {
                    var subLayers = tree.getSubLayers();

                    for (var key in subLayers) {
                        if (subLayers.hasOwnProperty(key)) {
                            this.__changeCheck(subLayers[key], checked);
                        }
                    }
                }

            },

            __processaMapServer: function (mapServerTree) {
                var subLayers = mapServerTree.getSubLayers();
                var key;
                for (key in subLayers) {
                    if (subLayers.hasOwnProperty(key)) {
                        this.__processaLayer2(subLayers[key], mapServerTree);
                    }
                }
            },

            __processaLayer2: function (layer, parent) {
                var that = this;

                var layerGeometryType = null;

                if (!layer.layer.hasOwnProperty("geometryType")) {
                    layerGeometryType = this.getGeometryType(layer);
                    layer.layer.geometryType = layerGeometryType;
                }
                else {
                    layerGeometryType = layer.layer.geometryType;
                }

                /*if ( !that.isAllowedGeometryType(layerGeometryType) ) {
                 parent.removeSubLayer(layer);
                 return layer;
                 }*/

                var subLayers = layer.getSubLayers();

                for (var key in subLayers) {
                    if (subLayers.hasOwnProperty(key)) {
                        var subLayer = subLayers[key];
                        that.__processaLayer2(subLayer, layer);
                    }
                }

                return layer;
            },

            _aggiornaContatoreLayerSelezionati: function (tree) {
                if (tree) {//abilita tutti i padri per contare come layer selezionato
                    while (tree.getParent()) {
                        tree = tree.getParent();
                        tree.checkBox.set('checked', 'checked');
                    }
                }

                this.layerSelezionati.innerHTML = this.getLayersSelected().length;
            },

            _obtainMapLayers: function () {
                var basemapLayers = [],
                    operLayers = [];
                var retObj = {
                    itemData: {
                        baseMap: {
                            baseMapLayers: []
                        },
                        operationalLayers: []
                    }
                };
                array.forEach(this.map.graphicsLayerIds, function (layerId) {
                    var layer = this.map.getLayer(layerId);
                    if (layer.isOperationalLayer) {
                        operLayers.push({
                            layerObject: layer,
                            title: layer.label || layer.title || layer.name || layer.id || " ",
                            id: layer.id || " "
                        });
                    }
                }, this);
                array.forEach(this.map.layerIds, function (layerId) {
                    var layer = this.map.getLayer(layerId);
                    if (layer.isOperationalLayer) {
                        operLayers.push({
                            layerObject: layer,
                            title: layer.label || layer.title || layer.name || layer.id || " ",
                            id: layer.id || " "
                        });
                    } else {
                        basemapLayers.push({
                            layerObject: layer,
                            id: layer.id || " "
                        });
                    }
                }, this);

                retObj.itemData.baseMap.baseMapLayers = basemapLayers;
                retObj.itemData.operationalLayers = operLayers;
                return retObj;
            },

            getMapServerNameById: function (id) {
                var mapServer = this.operLayerInfos._finalLayerInfos;
                for (var i = 0; i < mapServer.length; i++) {
                    if (mapServer[i].id == id) {
                        return mapServer[i].title;
                    }
                }
            },

            populateOperationLayerInfo: function () {
                if (this.map.itemId) {
                    LayerInfos.getInstance(this.map, this.map.itemInfo)
                        .then(lang.hitch(this, function (operLayerInfos) {
                            this.operLayerInfos = operLayerInfos;
                        }));
                } else {
                    var itemInfo = this._obtainMapLayers();
                    LayerInfos.getInstance(this.map, itemInfo)
                        .then(lang.hitch(this, function (operLayerInfos) {
                            this.operLayerInfos = operLayerInfos;
                        }));
                }
            },

            _aggiungiCss: function (widgetBaseClass) {

                var cssCode = "";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .apri{";
                cssCode += "    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAHCAYAAAAvZezQAAAACXBIWXMAAAsTAAALEwEAmpwYAAA5kmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS41LWMwMTQgNzkuMTUxNDgxLCAyMDEzLzAzLzEzLTEyOjA5OjE1ICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgICAgICAgICB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIKICAgICAgICAgICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgICAgICAgICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgICAgICAgICB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDx4bXA6Q3JlYXRvclRvb2w+QWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKTwveG1wOkNyZWF0b3JUb29sPgogICAgICAgICA8eG1wOkNyZWF0ZURhdGU+MjAxNC0wMS0wNlQxMToyMTo0MSswODowMDwveG1wOkNyZWF0ZURhdGU+CiAgICAgICAgIDx4bXA6TW9kaWZ5RGF0ZT4yMDE0LTAxLTA2VDEzOjMxOjQxKzA4OjAwPC94bXA6TW9kaWZ5RGF0ZT4KICAgICAgICAgPHhtcDpNZXRhZGF0YURhdGU+MjAxNC0wMS0wNlQxMzozMTo0MSswODowMDwveG1wOk1ldGFkYXRhRGF0ZT4KICAgICAgICAgPHhtcE1NOkluc3RhbmNlSUQ+eG1wLmlpZDozNTQ2MTM1MS1jNGU0LTY2NDItOTA4OC02MTFhYWQ5MThlNDE8L3htcE1NOkluc3RhbmNlSUQ+CiAgICAgICAgIDx4bXBNTTpEb2N1bWVudElEPnhtcC5kaWQ6MzMyMTk2OTM2ODdGMTFFM0IzMjY4QkI1NzU5MzZBMDk8L3htcE1NOkRvY3VtZW50SUQ+CiAgICAgICAgIDx4bXBNTTpEZXJpdmVkRnJvbSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgIDxzdFJlZjppbnN0YW5jZUlEPnhtcC5paWQ6MzMyMTk2OTA2ODdGMTFFM0IzMjY4QkI1NzU5MzZBMDk8L3N0UmVmOmluc3RhbmNlSUQ+CiAgICAgICAgICAgIDxzdFJlZjpkb2N1bWVudElEPnhtcC5kaWQ6MzMyMTk2OTE2ODdGMTFFM0IzMjY4QkI1NzU5MzZBMDk8L3N0UmVmOmRvY3VtZW50SUQ+CiAgICAgICAgIDwveG1wTU06RGVyaXZlZEZyb20+CiAgICAgICAgIDx4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ+eG1wLmRpZDozMzIxOTY5MzY4N0YxMUUzQjMyNjhCQjU3NTkzNkEwOTwveG1wTU06T3JpZ2luYWxEb2N1bWVudElEPgogICAgICAgICA8eG1wTU06SGlzdG9yeT4KICAgICAgICAgICAgPHJkZjpTZXE+CiAgICAgICAgICAgICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0iUmVzb3VyY2UiPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6YWN0aW9uPnNhdmVkPC9zdEV2dDphY3Rpb24+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDppbnN0YW5jZUlEPnhtcC5paWQ6MzU0NjEzNTEtYzRlNC02NjQyLTkwODgtNjExYWFkOTE4ZTQxPC9zdEV2dDppbnN0YW5jZUlEPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6d2hlbj4yMDE0LTAxLTA2VDEzOjMxOjQxKzA4OjAwPC9zdEV2dDp3aGVuPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6c29mdHdhcmVBZ2VudD5BZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpPC9zdEV2dDpzb2Z0d2FyZUFnZW50PgogICAgICAgICAgICAgICAgICA8c3RFdnQ6Y2hhbmdlZD4vPC9zdEV2dDpjaGFuZ2VkPgogICAgICAgICAgICAgICA8L3JkZjpsaT4KICAgICAgICAgICAgPC9yZGY6U2VxPgogICAgICAgICA8L3htcE1NOkhpc3Rvcnk+CiAgICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2UvcG5nPC9kYzpmb3JtYXQ+CiAgICAgICAgIDxwaG90b3Nob3A6Q29sb3JNb2RlPjM8L3Bob3Rvc2hvcDpDb2xvck1vZGU+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyMDAwMC8xMDAwMDwvdGlmZjpYUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6WVJlc29sdXRpb24+NzIwMDAwLzEwMDAwPC90aWZmOllSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjY1NTM1PC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj40PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxZRGltZW5zaW9uPjc8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/Pqs7CoUAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAADNJREFUeNpUi0EKADAIwzK/63f0vfWyylYoNIFSVZKEGwDdLW7Cw3KF5Scy88QLezEAzADP3Be/YZUW1QAAAABJRU5ErkJggg==') !important;";
                cssCode += "";
                cssCode += "}";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .chiudi{";
                cssCode += "    background-image:  url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAECAYAAABCxiV9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzMyMTk2OTI2ODdGMTFFM0IzMjY4QkI1NzU5MzZBMDkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzMyMTk2OTM2ODdGMTFFM0IzMjY4QkI1NzU5MzZBMDkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzIxOTY5MDY4N0YxMUUzQjMyNjhCQjU3NTkzNkEwOSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzIxOTY5MTY4N0YxMUUzQjMyNjhCQjU3NTkzNkEwOSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgaFhrEAAAArSURBVHjaYpwyZcp/BhyAKTs7mxGbBEicCcZAlwAz/v//D8cgK5D5AAEGAJG0HHIZO/5yAAAAAElFTkSuQmCC');";
                cssCode += "";
                cssCode += "}";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .apriChiudi{";
                cssCode += "    background-repeat: no-repeat;";
                cssCode += "    float:right;";
                cssCode += "    text-align: center;";
                cssCode += "    height: 18px;";
                cssCode += "    width: 20px;";
                cssCode += "    background-color: rgba(25,0,0,0.3);";
                cssCode += "    position: absolute;";
                cssCode += "    right: 0px;";
                cssCode += "    top: 0;";
                cssCode += "    background-position: center;";
                cssCode += "    cursor: pointer;";
                cssCode += "}";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .apriChiudi:hover{";
                cssCode += "    background-color: lightgray;";
                cssCode += "}";
                cssCode += "";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .nodoPadre{";
                cssCode += "    position: relative;";
                cssCode += "    margin-bottom: 3px;";
                cssCode += "}";
                cssCode += "";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .checkUncheckAll{";
                cssCode += "    background-repeat: no-repeat;";
                cssCode += "    height: 18px;";
                cssCode += "    width: 20px;";
                cssCode += "    position: absolute;";
                cssCode += "    right: 25px;";
                cssCode += "    top: 0;";
                cssCode += "    background-position: center;";
                cssCode += "    cursor: pointer;";
                cssCode += "}";
                cssCode += "";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .checked{";
                cssCode += "    background-image:  url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuNvyMY98AAADpSURBVDhPpdHPCwFBFAfwmd2dmXVFiHIh/iL+APlxkZNcJQ5yUQr5J/xJbk5uLo7r+ya0eFMmU59t5rvvvdlakSTJX9jQBxv6YEMfbMjBqqbPxWKhbPN06IK1giPU6BxF0SUMw6t9ly7kYC2hB1utdY6aM5l4rFQ0te/pEQTBWik1p70xOoviE7RgBN3PZmPM7HXBY8BBazWUUk5RXIEzLKANY1fzawCRUuxQPAAakgc7BEM7rmbyfhB2SB/os8twjmMzcTXbnq9AiD1saI9f1cTtN1czYcO0RqNe4vInNvTBhj7Y8HeJuAPiKGTuUp1sZAAAAABJRU5ErkJggg==');";
                cssCode += "";
                cssCode += "}";
                cssCode += "";
                cssCode += "." + widgetBaseClass + " .unchecked{";
                cssCode += "    background-image:  url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuNvyMY98AAAAjSURBVDhPYwCC/xRihv9AACJIxqMGjBoAwqMGUNMA8jHDfwA35IWXx/IcmAAAAABJRU5ErkJggg==');";
                cssCode += "";
                cssCode += "}";
                cssCode += "";

                var styleElement = document.createElement("style");
                styleElement.type = "text/css";
                if (styleElement.styleSheet) {
                    styleElement.styleSheet.cssText = cssCode;
                } else {
                    styleElement.appendChild(document.createTextNode(cssCode));
                }
                document.getElementsByTagName("head")[0].appendChild(styleElement);
            },

            declareInnerClass: function () {
                declare("selezioneGraficaLayerAlbero", [], {

                    layers: null,
                    padre: null,
                    url: null,
                    checkBox: null,

                    constructor: function (padre, layer) {
                        this.padre = padre;
                        this.layer = layer;
                        this.layers = {};
                    },

                    setCheckBox: function (checkBox) {
                        this.checkBox = checkBox;
                    },

                    getCheckBox: function () {
                        return this.checkBox;
                    },

                    getName: function () {
                        if (this.layer.hasOwnProperty('name')) {
                            return this.layer.name;
                        }

                        if (this.layer.hasOwnProperty('title')) {
                            return this.layer.title;
                        }

                        return this.layer.id;
                    },

                    getRoot: function () {
                        return this.padre === null ? this : this.padre.getRoot();
                    },

                    setUrl: function (url) {
                        this.url = url;
                    },

                    getMapServerUrl: function () {
                        if (this.url !== null) {
                            return this.url;
                        }

                        if (this.padre === null) {
                            return "";
                        }

                        return this.padre.getMapServerUrl();
                    },

                    getUrl: function () {
                        if (this.url !== null) {
                            return this.url;
                        }

                        if (this.layer.hasOwnProperty("url")) {
                            return this.layer.url;
                        }

                        if (this.padre === null) {
                            return "";
                        }

                        return esriItutils.fixUrlWithToken(this.padre.getMapServerUrl() + "/" + this.layer.id);
                    },

                    hasSubLayers: function () {
                        var key;
                        for (key in this.layers) {
                            if (this.layers.hasOwnProperty(key)) {
                                return true;
                            }
                        }

                        return false;
                    },

                    getSubLayer: function (key) {
                        return this.layers[key];
                    },

                    getSubLayers: function () {
                        return this.layers;
                    },

                    addSubLayer: function (layer) {
                        var temp = new selezioneGraficaLayerAlbero(this, layer);
                        //this.layers.push( temp );

                        this.layers[layer.id] = temp;
                        return temp;
                    },

                    removeSubLayer: function (layer) {
                        delete this.layers[layer.layer.id];
                    },

                    getParent: function () {
                        return this.padre;
                    },

                    getSelectedSubLayers: function () {
                        var selectedLayers = [];

                        if (this.checkBox === null) {
                            return selectedLayers;
                        }

                        if (!this.checkBox.checked) {
                            return selectedLayers;
                        }

                        // Nodo foglia
                        if (!this.hasSubLayers()) {
                            // Aggiungi se stesso
                            selectedLayers.push(this.checkBox.value);

                            return selectedLayers;
                        }

                        var key, subLayer, selectedSubLayers;
                        for (key in this.getSubLayers()) {
                            if (this.getSubLayers().hasOwnProperty(key)) {
                                subLayer = this.getSubLayer(key);
                                selectedSubLayers = subLayer.getSelectedSubLayers();

                                // Merge arrays
                                selectedLayers = selectedLayers.concat(selectedSubLayers);
                            }
                        }

                        return selectedLayers;
                    },

                    getSelectedSubLayersWithName: function () {
                        var selectedLayers = [];

                        if (this.checkBox === null) {
                            return selectedLayers;
                        }

                        if (!this.checkBox.checked) {
                            return selectedLayers;
                        }

                        // Nodo foglia
                        if (!this.hasSubLayers()) {
                            // Aggiungi se stesso
                            selectedLayers.push({
                                value: this.checkBox.value,
                                name: this.checkBox.name,
                                groupLayerName: this.checkBox.groupLayerName
                            });

                            return selectedLayers;
                        }

                        var key, subLayer, selectedSubLayers;
                        for (key in this.getSubLayers()) {
                            if (this.getSubLayers().hasOwnProperty(key)) {
                                subLayer = this.getSubLayer(key);
                                selectedSubLayers = subLayer.getSelectedSubLayersWithName();

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
                        if (this.padre === null) {
                            return this.layer.visible;
                        }

                        if (this.layer.hasOwnProperty("visible")) {
                            return this.layer.visible;
                        }

                        if (this.layer.visible !== undefined) {
                            return this.layer.visible;
                        }

                        return this.getRoot().layer.visibleLayers.indexOf(this.layer.id) > -1;
                    }
                });
            }
        });
    });