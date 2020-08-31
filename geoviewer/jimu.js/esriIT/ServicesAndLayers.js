/**
 * Crea select servizi e select layer in base al config.servizi_da_mappa == true dalla mappa oppure == 0 dal config.services
 * serve config.div_container_id per sapere dove iniettare l'html
 *
 {
   "div_container_id" : "selezione-layers",
   "servizi_da_mappa": true
 }
 * serve stringhe.Strati e stringhe.Servizi per le etichette
 * serve this.map se config.servizi_da_mappa == true
 *
 * dentro startup() aggiung: var x = new ServicesAndLayers();
 * x.startup( config, traduzioni, map, onlyOperational)
 *
 * hai a disposizione:
 *   x.getSelectLayer
 *   x.getSelectService
 *   x.addFunctionOnLayerChange( funzione ) per far chiamare una tua funzione al cambiamento del layer
 * */
define(['dojo/_base/declare',
    "dojo/_base/array",
    "dijit/form/Select",
    "dojo/on",
    "dojo/store/Memory",
    "dojo/json",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-construct",
    "esri/request",
    "jimu/esriIT/esriItutils",
    'dijit/form/FilteringSelect',
    "dijit/_WidgetBase"//per this.own
  ],
  function ( declare, array, Select, on, Memory, JSON, lang, dom, domConstruct, esriRequest, esriItutils, FilteringSelect, _WidgetBase ) {

    return declare([_WidgetBase], {
      _funcOnLayerChange: null,
      _funcOnRelatedLayerChange: null,
      config: null,
      stringhe: null,
      map: null,
      onlyOperational: null,
      widgetRelatedTable: null,
      widgetSelectServizi: null,
      widgetSelectLayers: null,


      constructor: function () {
        this._funcOnLayerChange = [];//serve, altrimenti _funcOnLayerChange viene condiviso da tutti gli new ServicesAndLayers()
        this._funcOnRelatedLayerChange = [];
        this.config = null;
        this.stringhe = null;
        this.map = null;
        this.onlyOperational = null;
        this.widgetRelatedTable = null;
        this.widgetSelectServizi = null;
        this.widgetSelectLayers = null;
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
        var containerDiv = dom.byId(this.config.div_container_id);

        var labelServizi = domConstruct.toDom('<p><b>' + this.stringhe.Servizi + '</b></p>');
        domConstruct.place(labelServizi, this.config.div_container_id);

        this.widgetSelectServizi = new Select({
          name: "selectServizi",
          style: "width: 100%"
        });
        this.widgetSelectServizi.placeAt(containerDiv).startup();

        var br = domConstruct.toDom('<br /><br />');
        domConstruct.place(br, this.config.div_container_id);

        var labelLayer = domConstruct.toDom('<p><b>' + this.stringhe.Strati + '</b></p>');
        domConstruct.place(labelLayer, this.config.div_container_id);

        this.widgetSelectLayers = new FilteringSelect({
          name: "selectLayer",
          required: false,//tanto non funziona
          fetchProperties:{sort:[{attribute:'name',descending:false}]},
          style: "width: 100%"
        });
        this.widgetSelectLayers.placeAt(containerDiv).startup();


        //li costruiamo sempre per non rompere il codice
        var br2 = domConstruct.toDom('<br /><br />');
        this.labelRelated = domConstruct.toDom('<p><b>' + this.stringhe.relatedTable + '</b></p>');
        this.widgetRelatedTable = new Select({
          name: "relatedTables",
          style: "width: 100%"
        });

        if ( this.config.queryIncrociata === true ) {
          domConstruct.place(br2, this.config.div_container_id);
          domConstruct.place(this.labelRelated, this.config.div_container_id);
          this.widgetRelatedTable.placeAt(containerDiv).startup();
        }


      },

      _caricaSelectIniziali: function () {

        this.own( on(this.widgetSelectServizi, 'change', lang.hitch(this, "_onServizioChange")) );

        var services = [];
        if ( this.config.servizi_da_mappa === false ) {
          services = this.config.services;
        }
        else {
          if ( this.onlyOperational === true ) {
            array.forEach(this.map.itemInfo.itemData.operationalLayers, function ( layer ) {
              var service = this.map.getLayer(layer.id);
              if ( service ) {
                var serviceName = this._getServiceName(service);

                services.push({
                  id: layer.id,
                  layerDefinitions: layer.layerDefinitions,
                  name: serviceName,
                  url: service.url,
                  layerInfos: service.layerInfos
                });
              }
            }, this);
          }
          else {
            var mapLayersId = this.map.layerIds;
            array.forEach(mapLayersId, function ( layerId ) {
              var service = this.map.getLayer(layerId);
              var serviceName = this._getServiceName(service);
              services.push({
                id: layerId,
                //layerDefinitions: layer.layerDefinitions,// TODO da sistemare ?
                name: serviceName,
                url: service.url,
                layerInfos: service.layerInfos
              });
            }, this);
          }
        }

        var selectOptionsArray = [];
        array.forEach(services, function ( service )//crea l'array per fare un unico addOption per migliori performance
        {
          selectOptionsArray.push({value: JSON.stringify(service), label: service.name, selected: false});
        });

        if ( selectOptionsArray.length > 0 ) {
          this.widgetSelectServizi.addOption(selectOptionsArray);
          this._onServizioChange(selectOptionsArray[0].value);//carica i layer del primo servizio automaticamente

        }

        this.own( on(this.widgetSelectLayers, 'change', lang.hitch(this, "_onLayerChange")) );
        this.own( on(this.widgetRelatedTable, 'change', lang.hitch(this, "_onRelatedLayerChange")) );
      },


      _getServiceName: function ( service ) {
        var serviceName = service.id;
        if ( service.name ) {
          serviceName = service.name;
        }
        else if ( lang.exists( 'arcgisProps.title', service ) ) {
          serviceName = service.arcgisProps.title;
        }
        return serviceName;
      },

      _onServizioChange: function ( serviceJSON )//serve come func separata, per poter simulare trigger event
      {
        var service = JSON.parse(serviceJSON);
        this.widgetSelectLayers.set('store', new Memory({}));//pulisci le vecchie opzioni
        this.widgetSelectLayers.set('value', '');//pulisci

        var layers = [];
        if ( this.config.servizi_da_mappa === false ) {
          layers = service.layers;
        }
        else {
          array.forEach(service.layerInfos, lang.hitch(this, function ( layer, index ) {
            if ( layer.subLayerIds === null || layer.subLayerIds.length === 0 ) {
              if ( lang.exists('layerDefinitions.' + index + '.definition', service) &&
                service.layerDefinitions[index].definition.replace(/ /g, '') === "1=0" ) {
                  return;                //quando è 1=0 non lo includiamo
              }
              else if(layer.parentLayerId == -1){//fix per eliminare i group layer!
                layers.push({
                  name: layer.name,
                  url: esriItutils.fixUrlWithToken(service.url + '/' + layer.id),//fix per servizi con token
                  layerId: layer.id,
                  layerDefinitions: ( lang.isArray(service.layerDefinitions) ? service.layerDefinitions[index] : "" )
                });
              }
            }


            var eliminaDuplicati = [];

            var relatedTablesRequest = esriRequest({
              url: esriItutils.fixUrlWithToken( service.url + '/' + layer.id + '?f=json' ),
              handleAs: "json"
            });
            relatedTablesRequest.then(
              //success
              lang.hitch(this, function ( result ) {

                if ( lang.isArray(result.relationships) && result.relationships.length > 0 ) {
                  var i, relatedTablesArray = [], layerRelatedTable, relatedTable;
                  for ( i = 0; i < result.relationships.length; i++ ) {
                    relatedTable = result.relationships[i];
                    if ( eliminaDuplicati[service.url] === undefined ) {
                      eliminaDuplicati[service.url] = 1;
                      layerRelatedTable = {
                        name: relatedTable.name,
                        url: service.url + '/' + relatedTable.id,
                        layerId: relatedTable.id,
                        layerDefinitions: /*da vedere dopo se serve fare un queryTask pure per questo*/ ""
                      };
                      relatedTablesArray.push({
                        value: JSON.stringify(layerRelatedTable),
                        label: relatedTable.name,
                        selected: false
                      });
                    }

                  }


                  if ( relatedTablesArray.length > 0 ) {
                    //prima controlla se questo relatedTable sta sulla mappa, altrimenti cancellalo dall'elenco
                    var y, position, serviceOnTheMap, relatedTableJSON, relatedTableLayerId, relatedTableserviceUrl, found;

                    for ( y = 0; y < relatedTablesArray.length; y++ )//per ogni related table
                    {
                      relatedTable = relatedTablesArray[y];
                      relatedTableJSON = JSON.parse(relatedTable.value);
                      relatedTableLayerId = relatedTableJSON.layerId;
                      relatedTableserviceUrl = relatedTableJSON.url;
                      relatedTableserviceUrl = relatedTableserviceUrl.slice(0, relatedTableserviceUrl.lastIndexOf('/'));
                      found = false;


                      for ( i = 0; i < this.map.layerIds; i++ )//per ogni servizio
                      {
                        serviceOnTheMap = this.map.getLayer(this.map.layerIds[i]);
                        if ( serviceOnTheMap.url === relatedTableserviceUrl ) {
                          position = array.indexOf(serviceOnTheMap.visibleLayers, relatedTableLayerId);
                          if ( position !== -1 ) {
                            found = true;
                            break;
                          }
                        }
                      }


                      if ( found === false ) {
                        relatedTablesArray = relatedTablesArray.slice(y, 1);//cancella xkè non è sulla mappa
                        y = 0;// riparti dall'inizio
                      }
                    }

                  }


                  if ( relatedTablesArray.length > 0 ) {
                    this.widgetRelatedTable.removeOption(this.widgetRelatedTable.getOptions());//pulisci
                    this.widgetRelatedTable.addOption({value: '{"url": ""}', label: "---"});//serve nel caso di un'unico layerOption
                    this.widgetRelatedTable.addOption(relatedTablesArray);
                    this.labelRelated.style.display = 'block';
                    this.widgetRelatedTable.domNode.style.display = 'inline-table';
                  }
                  else {
                    this.__cancellaOpzioniAndNascondiSelect(this.widgetRelatedTable, this.labelRelated);
                  }

                }
                else {
                  this.__cancellaOpzioniAndNascondiSelect(this.widgetRelatedTable, this.labelRelated);
                }

              }),


              //error
              lang.hitch(this, function ( error ) {
                window.console.log(error);
                //window.alert( "Errore durante il caricamento dei related table" );
                this.widgetRelatedTable.domNode.innerHTML = '';//pulisci le vecchie opzioni

                this.widgetRelatedTable.domNode.style.display = 'none';
                this.labelRelated.style.display = 'none';
              })
            );


          }));
        }

        var layerOptionsArray = [ { value : "", name: "", id: -1} ];//per non avere l'errore che nessun valore é stato selezionato
        array.forEach(layers, function ( layer, id ) {
          layerOptionsArray.push({value: JSON.stringify(layer), name: layer.name, id: id, selected: false});//name non label! altrimenti non funziona
        });



        var layersStore = new Memory({ data: layerOptionsArray, idProperty: "value",  sortParam: "name" });//idProperty value non id !!!, altrimenti rompi _onLayerChange
        layerOptionsArray = layersStore.query({}, {sort: [{attribute: "name"}]});//ordina per label


        this.widgetSelectLayers.set('store', new Memory() );
        this.widgetSelectLayers.set('value', '');//pulisci
        if ( layerOptionsArray.length > 0 ) {
          this.widgetSelectLayers.set('store', layersStore);
          this.widgetSelectLayers.set('value', layerOptionsArray[0].name);
          this._onLayerChange(layerOptionsArray[0].value);//simula click sul layer per caricare i campi
        }
        else {
          this._onLayerChange('{"name":"","url":""}');//chiamata finta per cancellare i campi e i valori
        }
      },


      __cancellaOpzioniAndNascondiSelect: function ( select, label ) {
        select.removeOption(select.getOptions());//pulisci
        select.domNode.style.display = 'none';
        label.style.display = 'none';
        //this._onLayerChange( '{"name":"","url":""}' );//chiamata finta per cancellare i campi e i valori
      },

      getSelectedRelatedLayer: function () {
        return this.widgetRelatedTable;
      },

      getSelectLayer: function () {
        return this.widgetSelectLayers;
      },

      getSelectService: function () {
        return this.widgetSelectServizi;
      },

      addFunctionOnRelatedTableChange: function ( func ) {
        if ( typeof func === "function" ) {
          this._funcOnRelatedLayerChange.push(func);
        }
      },

      _onRelatedLayerChange: function ( layerJSON )//carica il select dei campi
      {

        array.forEach(this._funcOnRelatedLayerChange, function ( func ) {
          func(layerJSON);
        });

      },

      addFunctionOnLayerChange: function ( func ) {
        if ( typeof func === "function" ) {
          this._funcOnLayerChange.push(func);
        }
      },

      _onLayerChange: function ( layerJSON )//carica il select dei campi
      {

        array.forEach(this._funcOnLayerChange, function ( func ) {
          func(layerJSON);
        });

      }
    });
  });