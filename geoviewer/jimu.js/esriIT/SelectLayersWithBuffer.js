/**
 * Crea select servizi e select layer in base al config.servizi_da_mappa == true dalla mappa oppure == 0 dal config.services
 * serve config.div_container_id per sapere dove iniettare l'html
 * serve stringhe.Strati e stringhe.Servizi per le etichette
 * serve this.map se config.servizi_da_mappa == true
 *
 * fai var x = new ServicesAndLayers();
 * x.startup( config, traduzioni, map, onlyOperational)
 *
 * hai a disposizione:
 *   x.getSelectLayer
 *   x.getSelectService
 *   x.addFunctionOnLayerChange( funzione ) per far chiamare una tua funzione al cambiamento del layer
 * */define(['dojo/_base/declare', "dojo/_base/array",
        "dijit/form/Select", "dojo/on",
        "dojo/json", "dojo/_base/lang", "dojo/dom", "dojo/dom-construct",
        "dijit/layout/ContentPane",
        "dijit/form/Button",
        "dojo/query",
        "jimu/esriIT/esriItutils",
        'dijit/Destroyable'//per this.own

    ],
    function ( declare, array, Select, on, JSON, lang, dom, domConstruct,
               ContentPane, Button, query, esriItutils, Destroyable ) {

        return declare([Destroyable], {
            _funcOnLayerChange: [],
            config: null,
            stringhe: null,
            map: null,
            onlyOperational: null,
            widgetSelectLayers: null,
            containerDiv: null,

            constructor: function (parameters) {
                /*inizializza le proprietà condivise se mai faraì più di un instanza di questa classe*/
                this._funcOnLayerChange = [];
                this.config = null;
                this.stringhe = null;
                this.map = null;
                this.onlyOperational = null;
                this.widgetSelectLayers = null;
                this.containerDiv = null;
                lang.mixin(this, parameters);
            },

            startup: function ( config, stringhe, map/*può essere null se config.servizi_da_mappa == false*/, onlyOperational ) {
                this.config = config;
                this.stringhe = stringhe;
                this.map = map;
                this.onlyOperational = onlyOperational;

                this._constructDom();

                this._caricaSelectIniziali();

            },

            _constructDom: function () {
                this.containerDiv = dom.byId(this.config.div_container_id);//serve this.containerDiv per poter mettere l'height dopo

                var labelServizi = domConstruct.toDom('<p><b>' + this.stringhe.Servizi + '</b></p>');
                domConstruct.place(labelServizi, this.config.div_container_id);

                this.widgetSelectServizi = new Select({
                    name: "selectServizi"
                });
                this.widgetSelectServizi.placeAt(this.containerDiv).startup();

                var br = domConstruct.toDom('<br /><br />');
                domConstruct.place(br, this.config.div_container_id);

                var labelLayer = domConstruct.toDom('<p><b>' + (this.stringhe.Strati || "Layer") + '</b></p>');
                domConstruct.place(labelLayer, this.config.div_container_id);


                var borderDiv = domConstruct.toDom('<div id="' + this.config.div_container_id + '_selectLayer' +
                    '" style="height: 100%; width: 70%; border: 1px #b5bcc7 solid; max-height: 160px; overflow-y: auto;" name="selectLayer"></div>');

                this.widgetSelectLayers = new ContentPane({
                    region: "left",
                    style: "width: 97%;"//perchè se è 100% viene nascosto il border
                });
                borderDiv.appendChild(this.widgetSelectLayers.domNode);

                domConstruct.place(borderDiv/*.domNode*/, this.containerDiv, 'last');

                this.widgetSelectLayers.startup();


                this.refreshButton = new Button({
                    label: this.stringhe.RefreshQuery,
                    iconClass: 'button-refreshQuery',
                    id: this.config.div_container_id + '_refreshButton'
                });


                domConstruct.place(this.refreshButton.domNode, this.containerDiv, 'after');
                this.refreshButton.startup();


                if ( this.config.slideBuffer === true ) {
                    domConstruct.place(dom.byId('sliderBuffer'), this.refreshButton.domNode, 'before');//siccome non si può ricreare programmaticamente l'esempio http://dojotoolkit.org/reference-guide/1.10/dijit/form/HorizontalSlider.html#declarative-markup-example-with-discrete-values, lo metteremo come html per il parser
                    dom.byId('sliderBuffer').style.display = 'block';
                }

                domConstruct.place(query('div[data-dojo-attach-point="checkUncheckButtonAttachPoint"]', this.containerDiv.parentNode)[0], this.containerDiv, 'after');//prendi il div che contiene il button check/uncheck e posizionalo sotto l'elenco degli stratti

            },

            _caricaSelectIniziali: function () {

                this.own(on(this.widgetSelectServizi, 'change', lang.hitch(this, "_onServizioChange")));

                var services = [];
                if ( this.config.servizi_da_mappa === false ) {
                    services = this.config.services;
                }
                else {
                    if ( this.onlyOperational === true ) {
                        //var mapLayersId = this.map.layerIds;
                        array.forEach(this.map.itemInfo.itemData.operationalLayers, function ( layer ) {
                            var service = this.map.getLayer(layer.id);
                            if ( service !== undefined ) {
                                var layerInfos = service.layerInfos;
                                if ( service.type && service.type.toLowerCase() === 'feature layer' ) {
                                    layerInfos =
                                        [{
                                            subLayerIds: null,
                                            name: service.name,
                                            url: service.url,
                                            id: "",//vuota, xkè dopo lo aggiunge all'url e rovina tutto
                                            layerDefinition: []
                                        }];//giusto per farlo funzionare
                                }

                                var serviceName = service.name || service.id;//nel caso manca il nome usiamo l'id
                                services.push({
                                    id: layer.id,
                                    name: serviceName,
                                    url: service.url,
                                    layerInfos: layerInfos
                                });
                            }

                        }, this);
                    }
                    else {
                        var mapLayersId = this.map.layerIds;
                        array.forEach(mapLayersId, function ( layerId ) {
                            var service = this.map.getLayer(layerId);
                            if ( service !== undefined ) {

                                var layerInfos = service.layerInfos;
                                if ( service.type && service.type.toLowerCase() === 'feature layer' ) {
                                    layerInfos =
                                        [{
                                            subLayerIds: null,
                                            name: service.name,
                                            url: service.url,
                                            id: "",//vuota, xkè dopo lo aggiunge all'url e rovina tutto
                                            layerDefinition: []
                                        }];//giusto per farlo funzionare
                                }

                                var serviceName = service.name || service.id;//nel caso manca il nome usiamo l'id
                                services.push({
                                    id: service.id,
                                    name: serviceName,
                                    url: service.url,
                                    layerInfos: layerInfos
                                });
                            }
                        }, this);
                    }
                }

                var selectOptionsArray = [];

                array.forEach(services, function ( service )//crea l'array per fare un unico addOption per migliori performance
                {
                    selectOptionsArray.push({
                        value: JSON.stringify(service),
                        label: service.name,
                        selected: "selected"
                    });
                });

                if ( selectOptionsArray.length > 0 ) {
                    this.widgetSelectServizi.addOption(selectOptionsArray);
                    this._onServizioChange(selectOptionsArray[0].value);//carica i layer del primo servizio automaticamente
                }

                this.own(on(this.widgetSelectLayers, on.selector("#" + this.widgetSelectLayers.id + " input.layers", 'change'), lang.hitch(this, "_onLayerChange")));
            },

            _onServizioChange: function ( serviceJSON )//serve come func separata, per poter simulare trigger event
            {
                var service = JSON.parse(serviceJSON);
                this.widgetSelectLayers.domNode.innerHTML = '';//pulisci le vecchie opzioni

                var layers = [];
                if ( this.config.servizi_da_mappa === false ) {
                    layers = service.layers;
                }
                else {
                    array.forEach(service.layerInfos, function ( layer ) {
                        if ( layer.subLayerIds === null || layer.subLayerIds.length === 0 ) {


                            layers.push({
                                name: layer.name,
                                url: esriItutils.aggiungiServiceIdInUrlConParams(service.url, '/' + layer.id)
                            });
                            array.forEach(layer.layerDefinition, function ( definition ) {
                                if ( definition === "1=0" ) {
                                    return false;
                                }

                                //else
                                layers.push({
                                    name: layer.name,
                                    url: service.url + '/' + layer.id
                                });

                            });
                        }
                    });
                }

                var i, layer, tempInput;
                for ( i = 0; i < layers.length; i += 1 ) {
                    layer = layers[i];
                    tempInput = domConstruct.toDom('<label class="layers"><input class="layers" type="checkbox" checked="checked" value="' /*JSON.stringify(layer) */ + '"/>' + layer.name + '<\/label><br \/>');
                    query('input', tempInput)[0].value = JSON.stringify(layer);
                    domConstruct.place(tempInput, this.widgetSelectLayers.domNode, 'last');
                }
                //this.containerDiv.style.height = ( layers.length * 20 + 10 ) + "px";//10px di padding, 20px per ogni layer


                if ( layers.length > 0 ) {
                    this._onLayerChange(query("#" + this.widgetSelectLayers.id + " input.layers:first")[0].value);//simula click sul layer per caricare i campi
                }
                else {
                    //this.widgetSelectLayers.addOption({value: "", label: ""});//pulisci
                    this.widgetSelectLayers.content = "";
                    this._onLayerChange('{"name":"","url":""}');//chiamata finta per cancellare i campi e i valori
                }
            },

            _onLayerChange: function ( layerJSON )//carica il select dei campi
            {
                array.forEach(this._funcOnLayerChange, function ( func ) {
                    func(layerJSON);
                });

            },

            getSelectLayer: function () {
                return this.widgetSelectLayers;
            },

            getSelectService: function () {
                return this.widgetSelectServizi;
            },

            addFunctionOnLayerChange: function ( func ) {
                if ( typeof func === "function" ) {
                    this._funcOnLayerChange.push(func);
                }
            }
        });
    });