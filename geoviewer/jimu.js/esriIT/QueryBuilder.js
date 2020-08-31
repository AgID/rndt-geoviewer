define(['dojo/_base/declare',
        'jimu/BaseWidget',
        "dijit/_WidgetsInTemplateMixin",
        "dojo/_base/array",
        "esri/tasks/QueryTask",
        "esri/tasks/query",
        "dojo/on",
        "dojo/json",
        "dojo/_base/lang",
        "esri/request",
        "dojo/dom-style",
        'jimu/esriIT/ServicesAndLayers',
        "esri/config",
        "dijit/registry",
        'jimu/esriIT/esriItLoaderOutFields',
        "dijit/Dialog",
        "jimu/esriIT/esriItutils",
        "jimu/esriIT/attributeTableUtils",
        "dojo/store/Memory",
        'jimu/utils',
        //per HTML servono

        "dijit/form/MultiSelect",
        'dijit/form/FilteringSelect',
        "dijit/form/Button",
		"dijit/form/ComboBox"


    ],
    function ( declare, BaseWidget, _WidgetsInTemplateMixin, array, QueryTask, Query,
               on, JSON, lang, esriRequest, domStyle, ServicesAndLayers, esriConfig,
               dijitRegistry, NoPortalOutFields, Dialog, esriItutils,
               AttributeTableUtils, Memory, jimuUtils

    ) {
        // To create a widget, you need to derive from BaseWidget.
        return declare([
            BaseWidget, _WidgetsInTemplateMixin
        ], {

            widgetSelectServizi: null,
            widgetSelectLayers: null,
            timeoutValue: 30000,
            baseClass: 'jimu-widget queryBuilder',
            cacheCampi: {},
            cacheResults: {},
            cacheValoriCampi: {},
            cacheTipiCampi: {},
            tabInternalName: "trovaFilterQueryTab" + Math.random(),// il random per quando usi più widget dello stesso tipo
            servicesAndLayersQueryIncrociata: null,
            risultatiQueryPrincipale: [],
            colonneQueryPrincipale: [],
            serviceVersion: {},//10.1, 10.2, ecc
            selectedLayer: null,
            selectedFieldType: "",
            secondSelectedFieldType: "",
            lastSelectedLayerUrl: "",
            attributeTableUtilsInstance: null,
            typeIdField: "",
            typesForFields: {},


            constructor: function(){
                this.widgetSelectServizi = null;
                this.widgetSelectLayers = null;
                this.timeoutValue = 30000;
                this.baseClass = 'jimu-widget queryBuilder';
                this.cacheCampi = {};
                this.cacheResults = {};
                this.cacheValoriCampi = {};
                this.cacheTipiCampi = {};
                this.tabInternalName = "trovaFilterQueryTab" + Math.random();// il random per quando usi più widget dello stesso tipo
                this.servicesAndLayersQueryIncrociata = null;
                this.risultatiQueryPrincipale = [];
                this.colonneQueryPrincipale = [];
                this.serviceVersion = {};//10.1, 10.2, ecc
                this.selectedLayer = null;
                this.selectedFieldType = "";
                this.secondSelectedFieldType = "";
                this.lastSelectedLayerUrl = "";
                this.attributeTableUtilsInstance = new AttributeTableUtils( this );
                this.typeIdField="";
                this.typesForFields = {};
            },

            onOpen: function () {
                lang.hitch(this, this._setLayerDefinition(this.finalQueryAttachPoint));
            },


            _setLayerDefinition: function ( finalQueryAttachPoint ) {
                if ( this.selectedLayer !== null ) {
                    if ( this.widgetSelectServizi !== null ) {
                        var serviceID = JSON.parse(this.widgetSelectServizi.valueNode.value).id;//TODO da fixare quando usi servizi_da_mappa = false
                        var layerDefinitions = this.map.getLayer(serviceID).layerDefinitions[this.selectedLayer.layerId];//cosi lo prendiamo sempre aggiornato


                        //a volte c'è .definition
                        if ( lang.exists('definition.length', layerDefinitions ) && layerDefinitions.definition.length > 0 ) {
                            finalQueryAttachPoint.value = layerDefinitions.definition;
                        }
                        //a volte no....
                        else if ( layerDefinitions && layerDefinitions.length > 0 ) {
                            finalQueryAttachPoint.value = layerDefinitions;
                        }
                        else {
                            finalQueryAttachPoint.value = '';
                        }

                        if ( finalQueryAttachPoint.value.replace(/ /g, "") === '1=1' ) {
                            finalQueryAttachPoint.value = '';
                        }
                    }
                }
            },

            generate: function () {
                this.tabTitle = this.nls.tabTitle;
                this.widgetSelectCampi = this.selectCampiAttachPoint;


                var servicesAndLayers = new ServicesAndLayers();
                servicesAndLayers.addFunctionOnLayerChange(lang.hitch(this, '_onLayerChange', this.widgetSelectCampi));
                servicesAndLayers.addFunctionOnRelatedTableChange(lang.hitch(this, '_onLayerChange', this.widgetSelectCampi));

                //prima del startup
                if ( this.config.queryIncrociata === true && this.selectCampi2 ) {
                    this.widgetSelectCampi2 = dijitRegistry.byNode(this.selectCampi2.domNode);
                    servicesAndLayers.addFunctionOnLayerChange(lang.hitch(this, '_onLayerChange', this.selectCampi2));
                }

                servicesAndLayers.startup(this.config, this.nls, this.map, true);


                if ( this.config.queryIncrociata === true ) {


                    this.servicesAndLayersQueryIncrociata = new ServicesAndLayers();
                    this.servicesAndLayersQueryIncrociata.addFunctionOnLayerChange(lang.hitch(this, '_onLayerChange', this.selectCampiComparare));
                    this.servicesAndLayersQueryIncrociata.addFunctionOnLayerChange(lang.hitch(this, '_onLayerChange', this.selectCampiFiltroRelatedAttachPoint));
                    this.servicesAndLayersQueryIncrociata.addFunctionOnLayerChange(lang.hitch(this, function () {
                        this.queryFiltroRelatedAttachPoint.value = '';
                    }));
                    var fake_config = {
                        div_container_id: "containerServiziAndStratiClone",
                        servizi_da_mappa: this.config.servizi_da_mappa,
                        services: this.config.services,
                        queryIncrociata: this.config.queryIncrociata
                    };
                    this.servicesAndLayersQueryIncrociata.startup(fake_config, this.nls, this.map, true);
                    this.own(on(this.crossQueryButtonAttachPoint, 'click', lang.hitch(this, "_secondQuery")));
                    this.servicesAndLayersQueryIncrociata.addFunctionOnRelatedTableChange(lang.hitch(this, '_onLayerChange', this.selectCampiComparare));
                    this.servicesAndLayersQueryIncrociata.addFunctionOnRelatedTableChange(lang.hitch(this, '_onLayerChange', this.selectCampiFiltroRelatedAttachPoint));


                    this.servicesAndLayersQueryIncrociata.addFunctionOnRelatedTableChange(lang.hitch(this, function () {
                        this.queryFiltroRelatedAttachPoint.value = '';
                    }));
                    //var widgetSelectLayersQueryRelated = dijit.findWidgets(  dojo.byId('containerServiziAndStratiClone') )[1];//il selectLayer da cui deve prendere l'url per fare la query e ottenere i campi
                    this._onSelectCampi(this.selectCampiFiltroRelatedAttachPoint, this.selectValoreFiltroRelatedAttachPoint, "secondSelectedFieldType");

                    this.own(on(this.cancellaRelatedQueryAttachPoint, 'click', lang.hitch(this, function () {
                        this.queryFiltroRelatedAttachPoint.value = '';
                    })));
                    this.selectValoreFiltroRelatedAttachPoint.addOption = this.__addOptionsMemoryStore;

                }


                this.widgetSelectServizi = servicesAndLayers.getSelectService();
                this.widgetSelectLayers = servicesAndLayers.getSelectLayer();
                this.widgetRelatedTable = servicesAndLayers.getSelectedRelatedLayer();
                this.widgetSelectValore = dijitRegistry.byNode(this.selectValoreAttachPoint.domNode);

                this.widgetSelectValore.addOption = this.__addOptionsMemoryStore;
                this.widgetSelectCampi.addOption = this.__addOptionsMemoryStore;

                this._onSelectCampi(this.widgetSelectCampi, this.widgetSelectValore, /*this.widgetSelectLayers,*/ "selectedFieldType");
                this._onClickQueryButtons();
                
                this._onSubmitQuery();

                this.own(on(this.cancellaQueryAttachPoint, 'click', lang.hitch(this, "_cancellaQuery")));
                //this.widgetSelectLayers.onChange( this.widgetSelectLayers.value );//simula onClick per caricare gli attributeTable e i campi
                
                if(this.submitQuery) this.submitQuery.disabled = true;
                this.own(on(this.finalQueryAttachPoint, "change", lang.hitch(this, "enableSearchButton")));
            },

            startup: function () {
                this.inherited(arguments);
                this.generate();
            },

            enableSearchButton: function(){
                if(this.submitQuery){
                  if (this.finalQueryAttachPoint && this.finalQueryAttachPoint.value == "") {
                      this.submitQuery.disabled = true;
                  } else {
                      this.submitQuery.disabled = false;
                  } 
                }
            },

            __addOptionsMemoryStore: function ( campi ) {
                if ( !this.store ) {
                    this.set('store', new Memory([]));
                }

                if ( this.store ){
                    array.forEach(campi, function(campo){
                        var name = campo.label ? campo.label : campo.value;
                        var value = campo.value;
                        this.store.put({id : value, name: name, value: campo.name});
                    }, this);
                }
            },

            _cancellaQuery: function () {

                this._enableQueryOperationButtons();


                //mettiamo 1=1 quando cancelli
                var serviceID = JSON.parse(this.widgetSelectServizi.valueNode.value).id;
                var layerDefinitions = this.map.getLayer(serviceID);
                if ( layerDefinitions && layerDefinitions.layerDefinitions )//può essere undefined in caso di mal configurazione
                {
                    layerDefinitions = layerDefinitions.layerDefinitions;
                }
                else {
                    return;
                }

                var json = JSON.parse(this.widgetSelectLayers.value);
                var layerId = json.layerId;
                var serviceUrlDelLayer = json.url.substring(0, json.url.lastIndexOf('/'));

                var i, service, originalDefinitions = "1 = 1";
                for ( i = 0; i < this.map.layerIds.length; i++ ) {
                    service = this.map.getLayer(this.map.layerIds[i]);
                    if ( service.url === serviceUrlDelLayer ) {
                        if (service.esriItLayerInfos) {
                            originalDefinitions = service.esriItLayerInfos.originalDefinition[layerId];
                            break;
                        }
                        
                    }
                }


                layerDefinitions[layerId] = originalDefinitions;
                this.map.getLayer(serviceID).setLayerDefinitions(lang.clone(layerDefinitions));


                this.finalQueryAttachPoint.value = "";

                this.attributeTableUtilsInstance.chiudiTabByInternalName(this.tabInternalName);

                //this.widgetSelectServizi.value = '';
                this._hideLoading();

                if ( this.config.queryIncrociata === true ) {
                    this.queryIncrociataDivAttachPoint.style.display = 'none';
                }
            },

            _aggiungiServiceIdInUrlConParams: function ( serviceUrl, aggiungiBaseUrl )//params, di solito il token
            {
                if ( !serviceUrl ){
                    return "";
                }

                var url = serviceUrl;
                var params = "";
                if ( url.indexOf('?') > 0 ) {
                    url = url.substring(0, url.indexOf('?'));
                    params = serviceUrl.substring(serviceUrl.indexOf('?'));
                }

                //se non c'è già /0 aggiunto, allora lo aggiungiamo
                if ( url && url.lastIndexOf(aggiungiBaseUrl) !== (url.length - aggiungiBaseUrl.length) ) {
                    url += aggiungiBaseUrl;
                }
                url += params;

                return url;
            },

            _onLayerChange: function ( selectCampiVar, layerJSON )//carica i campi del layer
            {
                var layer;

                if ( !layerJSON ){//quando passa il campo vuoto
                    //layerJSON = '{"name":"","url":""}';
                    return;
                }

                try {
                    layer = JSON.parse(layerJSON);
                } catch ( err ) {
                    window.console.error(err);
                    this._openAlertDialog("Errore caricare i campi");
                    return;
                }


                this.selectedLayer = layer;

                this._showLoading();

                var url = this._aggiungiServiceIdInUrlConParams(layer.url, '/' + layer.layerId);
                url = esriItutils.fixUrlWithToken(url);//fix token

                this.lastSelectedLayerUrl = url;
               // selectCampiVar.domNode.innerHTML = '';//pulisci le vecchie opzioni
                if ( this.cacheCampi[url] )//già c'è nel cache
                {
                    this._caricaCampiLayer(url, selectCampiVar, this.cacheCampi[url]);
                }
                else {
                    if ( this.config.servizi_da_mappa === false ) {
                        this._caricaCampiLayer(url, selectCampiVar, {fields: layer.fields});
                    } else if ( layer.url.length > 0 ) {

                        url = esriItutils.fixUrlWithToken(url);
                        var requestHandle = esriRequest({
                            url: url,
                            content: {f: 'json'},
                            timeout: this.timeoutValue,
                            handleAs: 'json',
                            callbackParamName: "callback"
                            /*
                            error: lang.hitch(this, function ( response, ioArgs ) {
                                this._openAlertDialog(this.nls.ErroreCaricaNomiCampi);
                                window.console.log(this.nls.ErroreCaricaNomiCampi);
                            })
                            */
                        });

                        requestHandle.then(
                            lang.hitch(this, function (url, selectCampiVar, response) {
                                this._caricaCampiLayer(
                                    url,
                                    selectCampiVar,
                                    response
                                );
                            }, url, selectCampiVar),
                            lang.hitch(this, function ( error ) {
                                this._openAlertDialog(error.message);
                                window.console.log("Error: " + error.message);
                            })
                        );
                    }
                }

                this._setLayerDefinition(this.finalQueryAttachPoint);


                if ( this.widgetSelectValore ) {
                    //this.widgetSelectValore.domNode.innerHTML = '';//pulisci le vecchie opzioni
                    this.widgetSelectValore.set('store', new Memory([]));
                    this.widgetSelectValore.set('value', '');//pulisci
                }

                this._hideLoading();

            },


            _caricaCampiLayer: function ( layerUrl, selectCampiVar, response ) {
                if ( response.currentVersion ) {
                    this.serviceVersion[layerUrl] = response.currentVersion;
                }
                if ( this.cacheCampi[layerUrl] === undefined ) {
                    this.cacheCampi[layerUrl] = {fields: response.fields};
                }

                if ( this.cacheResults[ this.__removeParams( layerUrl ) ] === undefined ) {
                    this.cacheResults[ this.__removeParams( layerUrl ) ] = response;
                }

                //selectCampiVar.domNode.innerHTML = '';//pulisci le vecchie opzioni
                //if ( this.selectCampiComparare ) { this.selectCampiComparare.domNode.innerHTML = ''; }

                

                var storeData = [ { name: "", value:"", id : -1} ];//per non avere l'errore che nessun valore é stato selezionato
                if ( response.fields && response.fields.length > 0 ) {
                    this.typeIdField = response.typeIdField;

                    //creo mappa per i typesForField, che mi serviranno per la mappatura dei typeidField
                    var that = this;
                    var typesField = response.types;
                    this.typesForFields = {};
                    array.forEach(typesField, function(typeField){
                        that.typesForFields[typeField.id] = typeField;
                    });
                                        
                    array.forEach(response.fields, function ( field, id ) {
                        var name = field.alias ? field.alias : field.name;
                        var types = null;
                        if(field.value ==  this.typeIdField){
                            types=this.typesForFields;
                        }
                        storeData.push({name : name, id: id, value: field.name, types: types});
                    });
                    var stateStore = new Memory({ data: storeData, idProperty: "id",  sortParam: "name" });
                    selectCampiVar.set('value', '');//pulisci
                    selectCampiVar.set('store', stateStore);
                }
                else {
                    window.console.log('Nessun campo');
                }

                this._hideLoading();
            },


            //siccome modificare una stringa non si riflette sul this, passiamo il nome della proprietà selectedFieldPropertyName
            _onSelectCampi: function ( widgetSelectCampi, widgetSelectValore, selectedFieldPropertyName ) {
                var that = this;

                this.own(on(widgetSelectCampi, 'change', function ( campiMultiSelect )// carica il select dei campi
                {
                    var widget = dijitRegistry.byId(this.id);

                    if ( widget.getValue().length < 0 ) {
                        return;
                    }
                    var id = widget.getValue();
                    var row = widget.store.query({id : id});
                    if ( !lang.exists('0.value', row) ){
                        return;
                    }
                    var nomeCampo = row[0].value;

                    widgetSelectValore.set('store', new Memory([]));
                    widgetSelectValore.set('value', '');//pulisci

                    var urlLayer = String(that.lastSelectedLayerUrl);

                    if ( that.cacheValoriCampi[urlLayer + nomeCampo] )// già c'è nel cache
                    {
                        widgetSelectValore.addOption(that.cacheValoriCampi[urlLayer + nomeCampo]);

                        that[selectedFieldPropertyName] = that.cacheTipiCampi[urlLayer + nomeCampo];
                        if ( that.cacheValoriCampi[urlLayer + nomeCampo].length === 0 ) {
                            //widgetSelectValore.domNode.innerHTML = '';// pulisci le vecchie opzioni
                            widgetSelectValore.set('store', new Memory([]));
                            widgetSelectValore.set('value', '');//pulisci
                        }
                    }
                    else {
                        if ( urlLayer && urlLayer.length > 0 )
                        {
                            var queryTaskDistinctValues = new QueryTask(urlLayer);
                            var queryDistinctValues = new Query();
                            queryDistinctValues.outFields = [
                                nomeCampo
                            ];
                            queryDistinctValues.returnGeometry = false;
                            var y = Math.floor((Math.random() * 1000));//per il bug strano che una volta la query funziona, la prossima volta no, la prossima volta si, ecc
                            queryDistinctValues.where = y + " = " + y;//se utilizziamo un diverso where pare che la query funzionerà tutte le volte
                            //queryDistinctValues.where = "1=1";
                            queryDistinctValues.returnDistinctValues = true;
                            queryDistinctValues.orderByFields = [nomeCampo];

                            that._showLoading();
                            queryTaskDistinctValues.execute(queryDistinctValues, function ( results ) {
                                                               
                                //var typeIdFromQuery = results.features....attributes[that.typeIdField]

                                //widgetSelectValore.domNode.innerHTML = '';//nel caso viene chiamato 2 volte(tipo onClick e onChange)
                                widgetSelectValore.set('store', new Memory([]));
                                widgetSelectValore.set('value', '');//pulisci
                                var valuesDistinct = [{//per non avere l'errore che nessun valore é stato selezionato
                                    "value": "",
                                    "label": "",//deve essere string
                                    "selected": false
                                }];

                                // siccome alcune query non supportano returnDistinctValues, facciamo un distinct noi

                                var valoriSenzaDuplicati = {};// non array!
                                array.forEach(results.features, function ( distinctValue ) {
                                    // if ( distinctValue.attributes[nomeCampo]!=null || (typeof distinctValue.attributes[nomeCampo] == 'string' && distinctValue.attributes[nomeCampo].trim()!=="")
                                    //     || typeof distinctValue.attributes[nomeCampo]!= undefined || typeof distinctValue.attributes[nomeCampo]!= "undefined" ) {
                                    //     valoriSenzaDuplicati[distinctValue.attributes[nomeCampo]] = 1;
                                    // }
                                    if(typeof distinctValue.attributes[nomeCampo] == 'string'){
                                        if(distinctValue.attributes[nomeCampo].trim()!==""){
                                            valoriSenzaDuplicati[distinctValue.attributes[nomeCampo]] = 1;
                                        }
                                    }else if(distinctValue.attributes[nomeCampo]!=null && typeof distinctValue.attributes[nomeCampo]!= undefined && typeof distinctValue.attributes[nomeCampo]!= "undefined"  ){
                                        valoriSenzaDuplicati[distinctValue.attributes[nomeCampo]] = 1;
                                    }
                                });


                                var i, typeField = null;
                                for ( i = 0; i < results.fields.length; i++ ) {
                                    if ( results.fields[i].name === nomeCampo ) {

                                        typeField = results.fields[i].type;
                                        typeFieldId = results.fields[i].name;
                                        that[selectedFieldPropertyName] = typeField;
                                        break;//fai un solo ciclo per il selectedFieldType
                                    }
                                }


                                var codedValues = [];
                                var fields = that._getCachedLayerFields(that.lastSelectedLayerUrl, that);
                                if ( that.cacheResults[that.lastSelectedLayerUrl] ) {
                                    if ( lang.isArray(fields) ){
                                        array.some(fields, function ( field ) {
                                            if ( lang.exists('domain.codedValues', field) && nomeCampo === field.name ) {
                                                codedValues = field.domain.codedValues;
                                                return true;
                                            }
                                        });
                                    }
                                }
                                
                                var label, value, date;
                                for ( value in valoriSenzaDuplicati ) {
                                    if ( valoriSenzaDuplicati.hasOwnProperty(value) ) {

                                        label = value;

                                        if (that.typeIdField && nomeCampo == that.typeIdField ) {    
                                            label = that.typesForFields[value].name.toString();
                                        }

                                        
                                        if ( codedValues.length > 0 ){
                                            array.some(codedValues, function(codedValue) {
                                                if ( codedValue.code.toString() === label ){
                                                    label = codedValue.name;
                                                    return true;
                                                }
                                                return false;
                                            });
                                        }

                                        if ( value && typeField === "esriFieldTypeDate" ) {

                                            date = that._formatDate(value);
                                            label = date.label;

                                            value = date.value;
                                            /*try {
                                             sqlQueryDate = locale.format(date, {
                                             datePattern: "dd-mm-yyyy m:s",
                                             selector: "date"
                                             });
                                             //NON ritorna UTC time e quindi la query fallisce
                                             value = "date '"+ sqlQueryDate + "'";
                                             }
                                             catch( error ){
                                             value = "date '"+ label + "'";
                                             }*/

                                        }

                                        valuesDistinct.push({
                                            "value": value,
                                            "label": String(label),//deve essere string
                                            "selected": false
                                        });

                                    }
                                }
                                
                                if ( valuesDistinct.length > 0 ) {
                                    widgetSelectValore.addOption(valuesDistinct);
                                }

                                that._hideLoading();

                                that.cacheValoriCampi[urlLayer + nomeCampo] = valuesDistinct;
                                that.cacheTipiCampi[urlLayer + nomeCampo] = that[selectedFieldPropertyName];
                            });

                            on(queryTaskDistinctValues, 'error', function ( error ) {
                                window.console.log(error);
                                that._openAlertDialog(that.nls.NessunDistinctValue);
                                //that.cacheValoriCampi[urlLayer + nomeCampo] = [];//no, magari la prossima volta funziona
                                //widgetSelectValore.domNode.innerHTML = '';//pulisci le vecchie opzioni
                                widgetSelectValore.set('store', new Memory([]));
                                widgetSelectValore.set('value', '');//pulisci
                                that._hideLoading();
                            });
                        }
                        else
                        {
                            that._openAlertDialog(that.nls.erroreURLQuery);
                        }
                    }

                }));
            },


            _formatDate: function( value ){//serve per poterla sovrascrivere in queryBuilder di attributeTable
                var date = new Date(parseInt(value, 10));
                var formattedDate;
                if ( date instanceof Date && !isNaN(date.getTime()) ) {
                    formattedDate = date.getUTCDate() + '/' + (date.getUTCMonth() + 1) + '/' + date.getUTCFullYear() + ' ' + date.getUTCHours() + ':' + date.getUTCMinutes() + ':' + date.getUTCSeconds();
                    //utc per colpa dei timezone, il server funziona con data in GMT
                }

                return {
                    value: "date '" + formattedDate + "'",
                    label : formattedDate
                };
            },

            _getCachedLayerFields: function( url ,that ){

                var fields;
                if ( that.cacheResults[ url ] ) {
                    fields = that.cacheResults[ url ].fields;
                }

                return fields;
            },


            _secondQuery: function () {
                var campi = this.widgetSelectCampi2.getValue();
                var campoConCuiConfrontare = null;
                if ( this.selectCampiComparare ) {
                    campoConCuiConfrontare = this.selectCampiComparare.getValue();
                }
                if ( lang.isArray(campi) && lang.isArray(campoConCuiConfrontare) ) {
                    if ( campi.length !== 1 || campoConCuiConfrontare.length !== 1 ) {
                        this._openAlertDialog(this.nls.SelezionaSoloUnCampoAllaVolta);
                    }
                    else {
                        var urlLayer = String(JSON.parse(this.servicesAndLayersQueryIncrociata.getSelectLayer().value).url);
                        var queryTask = new QueryTask(urlLayer);
                        var query = new Query();
                        query.outFields = /*["*"];*/this.widgetSelectCampi2.getValue();
                        query.returnGeometry = false;


                        //imposta il limite del originalDefinition
                        var originalDefinitions = "";
                        var i;
                        var serviceUrlDelLayer = urlLayer.substring(0, urlLayer.lastIndexOf('/'));
                        var split = urlLayer.split('/');
                        var layerId = split[split.length - 1];
                        if ( layerId.indexOf('?') !== -1 || layerId.indexOf('@') !== -1 )//per eliminare token o parametri
                        {
                            layerId = layerId.slice(0, layerId.indexOf('?'));
                        }
                        var service;
                        for ( i = 0; i < this.map.layerIds.length; i++ ) {
                            service = this.map.getLayer(this.map.layerIds[i]);
                            if ( service.url === serviceUrlDelLayer ) {
                                originalDefinitions = service.esriItLayerInfos.originalDefinition[layerId];
                                if ( originalDefinitions.length > 0 ) {
                                    originalDefinitions += " AND ";
                                }
                                break;
                            }
                        }


                        if ( this.queryFiltroRelatedAttachPoint.value !== null ) {
                            query.where = originalDefinitions + this.queryFiltroRelatedAttachPoint.value;
                        }
                        else {
                            var y = Math.floor((Math.random() * 1000));//per il bug strano che una volta la query funziona, la prossima volta no, la prossima volta si, ecc
                            query.where = originalDefinitions + y + " = " + y;//se utilizziamo un diverso where pare che la query funzionerà tutte le volte
                            //query.where = "1=1";
                        }
                        query.returnDistinctValues = true;//serve siccome i risultati sono al massimo 1000

                        this._showLoading();
                        var that = this;
                        that.urlLayer = urlLayer;
                        queryTask.execute(query, function ( results ) {


                            // siccome alcune query non supportano returnDistinctValues, facciamo un distinct noi

                            var valoriSenzaDuplicati = {};// non array!

                            array.forEach(campi, function ( campo ) {
                                valoriSenzaDuplicati[campo] = {};
                                array.forEach(results.features, function ( distinctValue ) {
                                    if ( distinctValue.attributes[campo] ) {
                                        valoriSenzaDuplicati[campo][distinctValue.attributes[campo]] = 1;
                                    }
                                });
                            });


                            if ( lang.isArray(that.risultatiQueryPrincipale) && that.risultatiQueryPrincipale.length > 0 ) {
                                var j, tempValue;
                                var publishData = [];
                                array.forEach(campi, function ( campo ) {

                                    for ( j = 0; j < that.risultatiQueryPrincipale.length; j += 1 ) {
                                        tempValue = that.risultatiQueryPrincipale[j][campoConCuiConfrontare[0]];
                                        if ( valoriSenzaDuplicati[campo][tempValue] === 1 ) {
                                            publishData.push(that.risultatiQueryPrincipale[j]);
                                        }
                                    }
                                });


                                that.attributeTableUtilsInstance.apriNuovoTab({
                                    columns: that.colonneQueryPrincipale,
                                    data: publishData,
                                    layerURL: that.urlLayer || "",
                                    tabTitle: "QueryBuilder: " +  that.nls.queryIncrociataTabName,
                                    tabInternalName: new Date().getTime().toString(),
                                    closable: true,
                                    where: query.where
                                });
                                that._hideLoading();
                            }
                        });
                    }
                }
            },

            _hideLoading: function () {
                domStyle.set(this.loadingWidgetQueryBuilderAttachPoint, 'display', 'none');
            },

            _showLoading: function () {
                domStyle.set(this.loadingWidgetQueryBuilderAttachPoint, 'display', 'block');
            },


            _addValueToQueryTextArea: function ( value, queryAttachPoint ) {
                var suffixAND = " AND ";
                var suffixOR = " OR ";
                if ( queryAttachPoint.value.length === 0 ) {
                    queryAttachPoint.value = value;
                } else if
                (
                    ( queryAttachPoint.value.toUpperCase().indexOf(suffixAND, queryAttachPoint.value.length - suffixAND.length) === -1 ) &&
                    ( queryAttachPoint.value.toUpperCase().indexOf(suffixOR, queryAttachPoint.value.length - suffixOR.length) === -1 )
                ) {
                    queryAttachPoint.value += " AND " + value;
                } else {
                    queryAttachPoint.value += value;
                }
                if(this.submitQuery){
                  if (queryAttachPoint && queryAttachPoint.value != "") {
                      this.submitQuery.disabled = false;
                  } else {
                      this.submitQuery.disabled = true;
                  }
                }
            },

            _secondAddToQuery: function ( operator, selectCampiAttachPoint, selectValoreAttachPoint ) {
                if ( selectCampiAttachPoint.value[0] && selectCampiAttachPoint.value[0].length > 0 ) {
                    if ( selectValoreAttachPoint.getValue().length !== 1 ) {
                        this._openAlertDialog(this.nls.SelezionaSoloUnValoreAllaVolta);
                        selectValoreAttachPoint.set("value", '');// Deselect all
                        return;
                    }
                    var nome_campo = selectCampiAttachPoint.value[0];
                    var valore = selectValoreAttachPoint.value.join();

                    if ( this.secondSelectedFieldType === 'esriFieldTypeString' ) {                        
												valore = "'" + valore.replace(/'/g, "''") + "'";// '' non \\' , metti gli apici solo per valori stringhe
                    }

                    this._addValueToQueryTextArea(nome_campo + " " + operator + ' ' + valore, this.queryFiltroRelatedAttachPoint);
                }
            },

            _addToQuery: function ( operator ) {
                if ( this.widgetSelectValore.get('value') && this.widgetSelectValore.get('value').length > 0 ) {
                    if ( this.widgetSelectValore.getValue().length === 0 ) {
                        this._openAlertDialog(this.nls.selezionaUnValore);
                        this.selectValoreAttachPoint.set("value", '');// Deselect all
                        return;
                    }

                    var nome_campo = this.widgetSelectCampi.store.query({id: this.widgetSelectCampi.value})[0].value;
                    //var nome_campo = this.widgetSelectCampi.value;
                    if(this.widgetSelectValore.item!=null){
                        var valore = this.widgetSelectValore.item.id;
                    }else{
                        var valore = this.widgetSelectValore.value;
                    }

                    if ( this.selectedFieldType === 'esriFieldTypeDate'){
                        // date date '1/1/1981 0:0:0'
                        //non fare niente
                    }
                    else if ( this.selectedFieldType === 'esriFieldTypeString' || !this.isNumeric(valore) ) {
                        valore = "'" + valore.replace(/'/g, "''") + "'";// '' non \\' , metti gli apici solo per valori stringhe
                    }
                    /*if ( isNaN( valore ) === true )
                     {
                     if ( valore.indexOf('date') !== 0)//se è date non mettere le virgolette
                     {
                     valore = "'" + valore.replace( "'", "\'" ) + "'";// metti gli apici solo per valori stringhe
                     }

                     }*/


                    //this.finalQueryAttachPoint.value += nome_campo + " " + operator + ' ' + valore;

                    this._addValueToQueryTextArea(nome_campo + " " + operator + ' ' + valore, this.finalQueryAttachPoint);

                    this._enableAndOrButton();
                }
            },

            isNumeric: function(n) {
                return !isNaN(parseFloat(n)) && isFinite(n);
            },

            _onClickQueryButtons: function () {
                this.own(on(this.equalButton.domNode, 'click', lang.hitch(this, this._addToQuery, '=')));
                this.own(on(this.lessThanButton.domNode, 'click', lang.hitch(this, this._addToQuery, '<')));
                this.own(on(this.greaterThanButton.domNode, 'click', lang.hitch(this, this._addToQuery, '>')));
                this.own(on(this.notEqualButton.domNode, 'click', lang.hitch(this, this._addToQuery, '<>')));
                this.own(on(this.lessThanOrEqualButton.domNode, 'click', lang.hitch(this, this._addToQuery, '<=')));
                this.own(on(this.greaterThanOrEqualButton.domNode, 'click', lang.hitch(this, this._addToQuery, '>=')));


                var that = this;
                this.own(on(this.likeButton.domNode, 'click', function () {
                    if ( that.selectCampiAttachPoint.get('value').length > 0 ) {
                        var value = String(that.selectValoreAttachPoint.value).replace("'", "\\'");
                        value = value.replace("%", "\\%");
                        that._addValueToQueryTextArea((that.selectCampiAttachPoint.item ? that.selectCampiAttachPoint.item.value : that.selectCampiAttachPoint.value) + " LIKE '%" + value + "%'", that.finalQueryAttachPoint);
                        //that.finalQueryAttachPoint.value += that.selectCampiAttachPoint.value + " LIKE '%" + value + "%'";
                        that._enableAndOrButton();
                    }
                }));

                this.own(on(this.andButton.domNode, 'click', function () {
                    if ( that.selectCampiAttachPoint.get('value').length > 0 ) {
                        that.finalQueryAttachPoint.value += " AND ";
                        that._disableAndOrButton();
                    }
                }));

                this.own(on(this.orButton.domNode, 'click', function () {
                    if ( that.selectCampiAttachPoint.get('value').length > 0 ) {
                        that.finalQueryAttachPoint.value += " OR ";
                        that._disableAndOrButton();
                    }
                }));


                if ( this.config.queryIncrociata === true ) {
                    this.own(on(this.equalRelatedButton.domNode, 'click', lang.hitch(this, this._secondAddToQuery, '=', this.selectCampiFiltroRelatedAttachPoint, this.selectValoreFiltroRelatedAttachPoint)));
                    this.own(on(this.lessThanRelatedButton.domNode, 'click', lang.hitch(this, this._secondAddToQuery, '<', this.selectCampiFiltroRelatedAttachPoint, this.selectValoreFiltroRelatedAttachPoint)));
                    this.own(on(this.greaterThanRelatedButton.domNode, 'click', lang.hitch(this, this._secondAddToQuery, '>', this.selectCampiFiltroRelatedAttachPoint, this.selectValoreFiltroRelatedAttachPoint)));
                }

            },

            _disableAndOrButton: function () {
                /*this.andButton.set( 'disabled', true );
                 this.orButton.set( 'disabled', true );*/
                //this._enableQueryOperationButtons();
            },

            _enableAndOrButton: function () {

                this.andButton.set('disabled', false);
                this.orButton.set('disabled', false);
                this._disableQueryOperationButtons();
            },

            _disableQueryOperationButtons: function () {
                /*this.equalButton.set( 'disabled', true );
                 this.lessThanButton.set( 'disabled', true );
                 this.greaterThanButton.set( 'disabled', true );
                 this.notEqualButton.set( 'disabled', true );
                 this.lessThanOrEqualButton.set( 'disabled', true );
                 this.greaterThanOrEqualButton.set( 'disabled', true );
                 this.likeButton.set( 'disabled', true );*/
            },

            _enableQueryOperationButtons: function () {
                this.equalButton.set('disabled', false);
                this.lessThanButton.set('disabled', false);
                this.greaterThanButton.set('disabled', false);
                this.notEqualButton.set('disabled', false);
                this.lessThanOrEqualButton.set('disabled', false);
                this.greaterThanOrEqualButton.set('disabled', false);
                this.likeButton.set('disabled', false);
            },


            __removeParams: function( url ){
                var splitPosition = url.indexOf('?');
                if ( splitPosition !== -1)
                {
                    return url.split('?')[0];
                }

                return url;
            },

            _onSubmitQuery: function () {
                if(!this.submitQuery) return;
                this.own(on(this.submitQuery, 'click', lang.hitch(this, function () {
                    if ( this.finalQueryAttachPoint.value.length > 0 ) {
                        this._enableQueryOperationButtons();


                        var split = this.lastSelectedLayerUrl.split('/');
                        var layerId = split[split.length - 1];
                        if ( layerId.indexOf('?') !== -1 || layerId.indexOf('@') !== -1 )//per eliminare token o parametri
                        {
                            layerId = layerId.slice(0, layerId.indexOf('?'));
                        }


                        var serviceID = JSON.parse(this.widgetSelectServizi.valueNode.value).id;
                        var layer = this.map.getLayer(serviceID);
                        var layerDefinitions = layer.layerDefinitions;
                        if ( layer.esriItLayerInfos && layer.esriItLayerInfos.originalDefinition && layer.esriItLayerInfos.originalDefinition[layerId] )// a volte non c'è esriItLayerInfos.originalDefinition
                        {
                            layerDefinitions[layerId] = layer.esriItLayerInfos.originalDefinition[layerId] + " AND " + this.finalQueryAttachPoint.value;
                        }
                        else {
                            layerDefinitions[layerId] = this.finalQueryAttachPoint.value;

                        }
                        //var layerId = JSON.parse( this.widgetSelectLayers.value ).layerId;

                        this.map.getLayer(serviceID).setLayerDefinitions(lang.clone(layerDefinitions));


                        // that.publishData( {layerURL: layerUrl, definitionQuery : that.finalQueryAttachPoint.value } );

                        if ( this.config.apriInAttributeTable ) {


                            var outFields = new NoPortalOutFields().getByServiceAndLayerAndMap(serviceID, layerId, this.map);
                            // carica i dati nel attributeTable
                            //var layerUrl = JSON.parse( this.widgetSelectLayers.value ).url;
                            var layerUrl = this.lastSelectedLayerUrl;
                            var initialQueryTask = new QueryTask(layerUrl);
                            var initialQuery = new Query();
                            initialQuery.outFields = outFields;
                            initialQuery.returnGeometry = true;
                            var i = Math.floor((Math.random() * 1000));//per il bug strano che una volta la query funziona, la prossima volta no, la prossima volta si, ecc
                            initialQuery.where = i + " = " + i + " AND " + this.finalQueryAttachPoint.value;//se utilizziamo un diverso where pare che la query funzionerà tutte le volte
                            //initialQuery.where = "1=1 AND " + that.finalQueryAttachPoint.value;
                            initialQuery.outSpatialReference = {
                                wkid: this.map.spatialReference.wkid
                            };
                            initialQuery.returnDistinctValues = false;// non funziona insieme a geometry

                            this._showLoading();

                            var tabName = JSON.parse( this.widgetSelectServizi.getValue() ).name + ": " + JSON.parse( this.widgetSelectLayers.value ).name;
                            initialQueryTask.execute(initialQuery, lang.hitch(this, function ( tabName, result ) {


                                if ( result.features && result.features.length > 0 ) {
                                    var columns = this._getColumnsArray(result);

                                    var data = this._getDataArray(result);

                                    this.colonneQueryPrincipale = columns;
                                    this.risultatiQueryPrincipale = data;

                                    if ( this.config.queryIncrociata === true && this.serviceVersion[layerUrl] && Math.round(parseFloat(this.serviceVersion[layerUrl]) * 100) >= 1020 )// >= 10.2, ma siccome le comparazioni in float sono un casino
                                    {
                                        this.queryIncrociataDivAttachPoint.style.display = 'block';
                                    }


                                    data = this._convertiTimestampInData(result, data);

                                    delete result.features;//risparmia RAM

                                    this.attributeTableUtilsInstance.apriNuovoTab({
                                        geometry: initialQuery.geometry,

                                        columns: columns,
                                        data: data,
                                        layerURL: layerUrl,
                                        tabTitle: "QueryBuilder: " + tabName || this.tabTitle,
                                        tabInternalName: this.tabInternalName,
                                        closable: true,
                                        where: initialQuery.where,//se qualcuno vorrà filtrare questo tab
                                        otherParams: {queryResult : result }
                                    });

                                    this._hideLoading();

                                }
                                else
                                {
                                    this._openAlertDialog(this.nls.risultatoVuoto);
                                }
                                this._hideLoading();

                            }, tabName), lang.hitch(this, function ( error ) {
                                this._openAlertDialog(this.nls.erroreQueryInitiale);
                                this._hideLoading();
                            }));
                        }

                    }

                })));

            },


            _convertiTimestampInData: function(result, rows){

                if ( lang.isArray(result.fields) ){
                    array.forEach(result.fields, function(column){
                        if ( lang.isObject(column) && column.type === 'esriFieldTypeDate'){
                            var columnName = column.name || column.label || column.alias;

                            if (columnName){
                                rows = array.map(rows, function(row){
                                    if ( row[columnName] ){
                                        try {
                                            var date = new Date(row[columnName]);
                                            if ( !isNaN( date.getDate() ) ){
                                                row[columnName] = jimuUtils.fieldFormatter.getFormattedDate(row[columnName]);
                                            }
                                        }catch (error){
                                            //niente, vuol dire che non è un timestamp
                                        }
                                    }

                                    return row;
                                });
                            }

                        }
                    });

                }

                return rows;
            },

            _getColumnsArray: function ( result ) {
                /* columns = { "NOME" :"Qualche Nome da visualizzare"} ;//, 'ObjectId' : {field: "ObjectID", hidden: true, label: "ObjectID", unhidable: true} }; */

                var columns = {};// object non array!
                if ( this.config.nomiCampiInAttributeTable === "*" ) {
                    array.forEach(result.fields, function ( field ) {
                        // columns[ field.name ] = {label: field.alias, hidden: false, unhidable:false, field: field.name, className: field.name};//field.alias;
                        columns[field.name] = field.alias;
                    });
                }
                else if ( this.config.nomiCampiInAttributeTable instanceof Array ) {
                    var columnName = null;
                    var i, len = this.config.nomiCampiInAttributeTable.length;
                    for ( i = 0; i < len; i += 1 ) {
                        columnName = this.config.nomiCampiInAttributeTable[i];
                        if ( lang.isArray(columnName) ) {
                            columns[columnName[0]] = columnName[1];
                        }
                        else {
                            columns[columnName] = columnName;
                        }

                    }
                }

                return columns;
            },

            _getDataArray: function ( result ) {
                var data = [];
                var row_data = null;

                var fieldsAliases = [];
                if ( result.fields && lang.isArray(result.fields) ) {
                    array.forEach(result.fields, function ( field ) {
                        fieldsAliases[field.name] = {
                            "alias": field.alias,
                            "type": field.type
                        };
                    });
                }
                else {
                    fieldsAliases = result.fieldAliases;
                }

                array.forEach(result.features, function ( riga, index ) {
                    row_data = riga.attributes;
                    var property, date;
                    for ( property in row_data ) {
                        if ( row_data.hasOwnProperty(property) ) {
                            if ( row_data[property] === null ) {
                                row_data[property] = ' - ';
                            }

                            /*if ( fieldsAliases[ property ] !== undefined && fieldsAliases[ property ].alias !== property )
                             {
                             row_data[ fieldsAliases[ property ].alias ] = row_data[ property ];
                             delete row_data[ property ];
                             }*/


                            //non formattare le date, in 1.3 vengono formattate da sole da attributeTable
                            /*if ( fieldsAliases[property] !== undefined && fieldsAliases[property].type === 'esriFieldTypeDate' ) {
                                date = new Date(row_data[fieldsAliases[property].alias]);
                                if ( date instanceof Date ) {
                                    row_data[fieldsAliases[property].alias] = date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear();
                                }
                            }
                            else*/ if ( String(row_data[fieldsAliases[property].alias]).indexOf("http:") === 0 ) {
                                row_data[fieldsAliases[property].alias] = '<a target="_blank" href="' + row_data[fieldsAliases[property].alias] + '">' + row_data[fieldsAliases[property].alias] + '</a>';
                            }
                        }
                    }

                    row_data.ObjectID = index;// ObjectID CASE-SENSITIVE!!! serve per non far scomparire il tab!
                    if ( riga.geometry ) {
                        row_data.geometry = riga.geometry;
                    }
                    data.push(row_data);
                });

                return data;
            },

            _openAlertDialog: function ( errorMsg ) {
                var dialog = new Dialog({
                    title: this.nls.erroreDialogTitle || "Errore",
                    content: errorMsg,
                    hide: function () {
                        dialog.destroyRecursive();
                    },
                    style: 'min-width: 200px;'//nel caso in cui il titolo è più corto del testo
                });
                dialog.show();
            }


        });
    });