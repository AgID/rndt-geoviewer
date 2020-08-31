define([
        'dojo/_base/declare',
        'jimu/BaseWidget',
        'dojo/_base/lang',
        'dijit/form/Button',
        "dojo/dom-construct",
        "dojo/Deferred",
        "esri/request",
        "jimu/esriIT/esriItutils",
        "dojo/on",
        "dijit/form/CheckBox",
        'dojo/query',
        'dojo/_base/array',
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/graphic",
        "esri/Color",
        "dojox/html/entities",
        "dijit/TitlePane"
    ],
    function ( declare, BaseWidget, lang, Button/*per l'html*/, domConstruct, Deferred, esriRequest, esriItutils,
                on, CheckBox, dojoQuery, array, SimpleLineSymbol, SimpleFillSymbol, Graphic, Color,
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
			layersCustom:null,
            layersType: "Feature Layer",
            filterlayersCustom: null,

            selectedPoints: [],
            elencoLayersPerIlSelect: null,
            selectPointButton: null,
            pointsListAttachPoint: null,
            layerSelezionabili: null,
            layerSelezionati: null,
            checkBoxPadri: [],
            checkBoxFigli: [],
            _titlePanesLi: [],
            __urlCounter: 0,
            __layersCounter: 0,
            __nrUrlRequests: 0,
            __cacheLayersType: {},//verra condiviso da tutte le istanze

            constructor: function ( parameters ) {
                //reinizializza qui, siccome vengono create più istanze di questa classe
                this.selezionaPuntiDiv = null;
                this.layersType = "Feature Layer";
                this.filterlayersCustom = null;

                this.selectedPoints = [];
                this.elencoLayersPerIlSelect = null;

                this.selectPointButton = null;
                this.pointsListAttachPoint = null;
                this.clearLayerButtonAttachPoint = null;
                this.layerSelezionabili = null;
                this.layerSelezionati = null;
                this.checkBoxPadri = [];
                this.checkBoxFigli = [];
                this._titlePanesLi = [];
                this.__urlCounter = 0;
                this.__nrUrlRequests = 0;
                lang.mixin(this, parameters);
            },


            startup: function ( selezionaPuntiDiv, map, drawCallbackFunction, layersType, layersCustom,  nls ) {
				var that=this;
                this.selectedPoints = [];
                this.selezionaPuntiDiv = selezionaPuntiDiv || this.selezionaPuntiDiv;
                this.layersCustom = layersCustom || this.layersCustom;
                this.layersType = layersType || this.layersType;

                this.nls = nls || this.nls;

                var imgLoading = '<img class="jimu-loading" src="' + require.toUrl('jimu') + '/images/loading.gif">';

                var html = domConstruct.toDom('' +
                    '<div class="areaLayers clearfix" style="margin: 15px 0px 15px 0px; width:100% ;border: 1px dashed; padding: 0px 10px 10px 5px; display: table">' +
                    imgLoading +
                    '<h2 style="margin-top: 10px;text-align: center">' + entities.encode(this.nls.areaLayerPuntuali) + ' </h2>' +
                    '<p class="layerSelezionabili" style="margin-top: 10px;text-align: left">' + entities.encode(this.nls.layerSelezionabili) + '<span>0</span></p>' +
                    '<p class="layerSelezionati" style="margin-top: 10px;text-align: left">' + entities.encode(this.nls.layerSelezionati) + '<span>0</span></p>' +
                    '<ul data-dojo-attach-point="elencoLayersPerIlSelect" class="groupLayerLabel" style= "list-style: none; padding-left: 0;"></ul>' +
                    '</div>'
                );

                domConstruct.place(html, this.selezionaPuntiDiv);

                var div = dojoQuery('div.areaLayers', this.selezionaPuntiDiv)[0];

                this.layerSelezionabili = dojoQuery('.layerSelezionabili span', this.selezionaPuntiDiv)[0];
                this.layerSelezionati = dojoQuery('.layerSelezionati span', this.selezionaPuntiDiv)[0];
                this.elencoLayersPerIlSelect = dojoQuery('ul[data-dojo-attach-point="elencoLayersPerIlSelect"]', this.selezionaPuntiDiv)[0];
                this.selectPointButton = dojoQuery('button[data-dojo-attach-point="selectPointButton"]', this.selezionaPuntiDiv)[0];
                this.pointsListAttachPoint = dojoQuery('ul[data-dojo-attach-point="pointsListAttachPoint"]', this.selezionaPuntiDiv)[0];
					
				if(this.layersCustom!=null && this.layersCustom.length>0){
				// todo fare ciclo
					var layer = new esri.layers.ArcGISDynamicMapServiceLayer(this.layersCustom[0].url, {
								    id: this.layersCustom[0].label,
								    visible: true
							    }) ;
					layer.on("load", function (ret, error) {
						var layer= {};
						layer.layerObject = ret.layer;
						layer.url = ret.layer.url;
						layer.layerObject.visible=true;
						layer.layerDefinitions=[];
						layer.name = layer.label = ret.layer.id;
						array.forEach(ret.layer.layerInfos, function ( info ) {
							layer.layerDefinitions.push(info.id);
						});
                        that.operationalLayers = [layer];
						that.getLayersFiltrati().then(lang.hitch(that, function () {
							//nascondi loading
							dojoQuery('img.jimu-loading', that.selezionaPuntiDiv)[0].style.display = 'none';
						}));
                    });			
					

				}else{	
					this.getLayersFiltrati().then(lang.hitch(this, function () {
						//nascondi loading
						dojoQuery('img.jimu-loading', this.selezionaPuntiDiv)[0].style.display = 'none';
					}));
				}
            },
/*
            getLayersSelected: function () {
                var layersUrl = [];
                array.forEach(this.checkBoxPadri, lang.hitch(this, function ( checkBoxPadre ) {
                    if ( checkBoxPadre.checked && !checkBoxPadre.disabled ) {
                        array.forEach(this.checkBoxFigli[checkBoxPadre.value], function ( checkBoxFiglio ) {
                            if ( checkBoxFiglio.checked && !checkBoxFiglio.disabled ) {
                                var urlA = checkBoxFiglio.value.split("?");
                                var urlParam = urlA.length > 1 ? urlA[1].split("&") : [""];
                                array.forEach(urlParam, lang.hitch(this, function ( param ) {
                                    if ( param.toLowerCase().indexOf("token=") == 0 ) {
                                        urlA[0] += "?" + param;
                                    }
                                }));
                                layersUrl.push(urlA[0]);//cioè l'url
                                return false;
                            }
                        });
                    }
                }));
                return layersUrl;
            },
			*/
			getLayersSelected: function () {
                var layers = [];
                var that = this;
                array.forEach(this.checkBoxFigli, function ( groupCheckBoxFigli, index ) {
                    if ( that.checkBoxPadri[index]/*nel caso sta caricando e cambi visibilità saraì sfortunato*/ && that.checkBoxPadri[index].checked === true ) {
                        array.forEach(groupCheckBoxFigli, function ( checkBoxFiglio ) {
                            if ( checkBoxFiglio.disabled !== true && checkBoxFiglio.checked === true ) {
                                layers.push(that._createLayerItem(checkBoxFiglio));
                            }
                        });
                    }
                });
                return layers;
            },
			
            getLayer: function (layerId) {                
				var that=this;
				var item=this._createLayerItem();		
                array.forEach(this.checkBoxPadri, lang.hitch(this, function ( checkBoxPadre ) {
					if(checkBoxPadre.value==layerId){
						item = that._createLayerItem(checkBoxPadre);
						return;}
					array.forEach(this.checkBoxFigli[checkBoxPadre.value], function ( checkBoxFiglio ) {						
						if(checkBoxFiglio.idLayer==layerId){
							item = that._createLayerItem(checkBoxFiglio);
							return;}
					});
                    
                }));
                return item;
            },
			
			setDisabled: function (value) {
				array.forEach(this.checkBoxPadri, lang.hitch(this, function ( checkBoxPadre ) {
					checkBoxPadre.set('disabled', value);					
					array.forEach(this.checkBoxFigli[checkBoxPadre.value], function ( checkBoxFiglio ) {						
						checkBoxFiglio.set('disabled', value);
					});                    
                }));
				if (!value)
					this._contaLayerSelezionati();
				else
					this.layerSelezionati.innerHTML = "--";
			},
			
            getLayersFiltrati: function () {
                var deferred = new Deferred();
				
				if(this.operationalLayers==null)
					this.operationalLayers = this.map.itemInfo.itemData.operationalLayers;

                var i, j, layer, y, layerId, layerUrl, ul, li,
                    label, checkBox, checked;

                this.__urlCounter = 0;
                this.__layersCounter = 0;
                this.__nrUrlRequests = 0;

                for ( j in this.__cacheLayersType)//per quando usiamo la cache per avere il numero giusto
                {
                    if (this.__cacheLayersType.hasOwnProperty(j))
                    {
                        this.__nrUrlRequests++;
                    }
                }

                for ( i = 0; i < this.operationalLayers.length; i++ ) {
                    layer = this.operationalLayers[i];

                    if ( !layer.layerObject ) {
                        continue;
                    }

                    checked = layer.layerObject.visible ? true : false;

                    checkBox = new CheckBox({
                        name: "layerCheckbox",
                        style: "float:left; margin-bottom: 0 !important",
                        checked: checked,
                        disabled: !checked,
                        onClick: lang.hitch(this, this._contaLayerSelezionati),
                        value: i/*layer.id*/						
                    });
                    checkBox.startup();

                    this.checkBoxPadri[i] = checkBox;//non serve un array di array


                    /*        //non funziona nel caso tu hai nel
                     TOC               widget

                     0:  puntuale            0: puntuale
                     1:  non puntuale        2: puntuale
                     2:  puntuale


                     */


                    li = domConstruct.create('li');
                    li.style.cssText = 'clear:both; margin-bottom: 10px;';
                    label = domConstruct.toDom('<label>&nbsp;' + entities.encode(layer.label) + '</label>');
                    checkBox.placeAt(label);
                    domConstruct.place(label, li, 'first');
                    this._titlePanesLi.push(li);
                    //lo mettiamo nel HTML dopo
                    //var titlePane = new TitlePane({title: layer.label, content: "", open: false});
                    //domConstruct.place(li, titlePane.containerNode);
                    //domConstruct.place(titlePane.domNode, that.elencoLayersPerIlSelect);
                    //titlePane.startup();

                    ul = domConstruct.create('ul');
                    domConstruct.place(ul, li);
                    ul.style.cssText = "list-style: none; padding-left: 20px;";


                    //for (y = 0; y < layer.layerDefinitions.length; y++)
                    for ( y in layer.layerDefinitions ) {
                        if ( layer.layerDefinitions.hasOwnProperty(y) ) {
                            layerId = layer.layerDefinitions[y];
                            if ( layerId.layer !== undefined ) {
                                layerId = layerId.layer;//per quando c'è  { layer : "1 = 1", layer: 0}
                            }
                            else {
                                layerId = y;//xkè altrimenti layerId sarebbè uguale a "1 = 1"
                            }

                            layerUrl = layer.url + '/' + layerId + "?f=json";//dobbiamo mettere json qui, altrimenti con i token dopo non funziona
                            layerUrl = esriItutils.fixUrlWithToken(layerUrl);



                            if ( this.__cacheLayersType[layerUrl] !== undefined )//cosi se li ha già caricato da un'altro widget non rifa le richieste
                            {
                                this.__successResult(layer, layerId, layerUrl, ul, i, deferred, this.__cacheLayersType[layerUrl]);
/*

                                lang.hitch(this, function () {
                                    var layer = arguments[0],
                                        layerId = arguments[1],
                                        layerUrl = arguments[2],
                                        ul = arguments[3],
                                        i = arguments[4],
                                        deferred = arguments[5];
                                    this.__successResult(layer, layerId, layerUrl, ul, i, deferred, this.__cacheLayersType[layerUrl]);
                                }, layer, layerId, layerUrl, ul, i, deferred);
*/
                                //console.log('already defined ' + layerUrl);
                            }
                            else {
                                this.__nrUrlRequests++;//dentro l'else
                                //console.log('not yet defined ' + layerUrl);
                                esriRequest({
                                    url: layerUrl,
                                    //content: {f: "json"},
                                    handleAs: "json"
                                }).then(
                                    lang.hitch(this, function () {
                                            var layer = arguments[0],
                                                layerId = arguments[1],
                                                layerUrl = arguments[2],
                                                ul = arguments[3],
                                                i = arguments[4],
                                                deferred = arguments[5];
                                            var result = arguments[6];
                                            this.__successResult(layer, layerId, layerUrl, ul, i, deferred, result);
                                        }, layer, layerId, layerUrl, ul, i, deferred
                                    ),
                                    lang.hitch(this, function ( error ) {
                                        window.console.error('Errore richiedere url selezioneGraficaLayer: ' + error.message);
                                        this.__urlCounter++;
                                        lang.hitch(this, this._controllaFinishedAllEsriRequest(layer, deferred));
                                    })
                                );
                            }

                        }
                    }

                }

                return deferred;
            },


            __successResult: function ( layer, layerId, layerUrl, ul, i, deferred, result ) {
                this.__urlCounter++;

                if ( result === undefined ) {
                    console.log('Errore nella risposta del ajax');
                }

                this.__cacheLayersType[layerUrl + ""] = result;

                if ( result !== undefined && result.type.toUpperCase() === this.layersType.toUpperCase() 
                    // && this.geometryType[result.geometryType.toUpperCase()] === true
                ) {
                    if ( lang.isArray(this.filterlayersCustom) !== true || // non abbiamo filtri, oppure li abbiamo
                        array.some(this.filterlayersCustom, function ( filterLayerUrl ) {
                            return layerUrl.indexOf(filterLayerUrl) === 0;//cioè http://blabla/MapServer/0 sta dentro http://blabla/MapServer/0?token=asdfasdf
                        })
                    ) {
                        deferred.progress(result);
                        this.__layersCounter++;
                        this.layerSelezionabili.innerHTML = this.__layersCounter;

                        var serviceVisible = layer.layerObject.visible ? true : false;//se è visible, non è disabled
                        var layerVisible = layer.layerObject.visibleLayers.indexOf(Number(layerId)) > -1 ? true : false;
                        var fullName = (result.parentLayer != null ? result.parentLayer.name + "\\" : "") + result.name;
												
						var checkBoxSubLayer = new CheckBox({
                            name: "selectRectangleLayer",
                            style: "float:left; margin-bottom: 0 !important",
                            value: layerUrl,
                            checked: (layerVisible),
                            onClick: lang.hitch(this, this._contaLayerSelezionati),
                            idLayer: layerId,
							fullName: fullName
                        });
                        checkBoxSubLayer.startup();

                        if ( this.checkBoxFigli[i] === undefined ) {
                            this.checkBoxFigli[i] = [];
                        }
                        this.checkBoxFigli[i].push(checkBoxSubLayer);


                        var li2 = domConstruct.create('li');
                        var label2 = domConstruct.toDom('<label>&nbsp;' + result.name + '</label>');
                        checkBoxSubLayer.placeAt(label2);
                        domConstruct.place(label2, li2, 'first');
                        domConstruct.place(li2, ul);

                    }
                }
                else {
                    //console.log(layer.label);
                    //non sono layer puntuali
                }

                lang.hitch(this, this._controllaFinishedAllEsriRequest(layer, deferred));

            },


            _controllaFinishedAllEsriRequest: function ( layer, deferred ) {
                //una volta finito con le url request, mettiamo nel HTML solo i padri che hanno figli
                //console.log( '_controllaFinishedAllEsriRequest:  ' + this.__urlCounter + ' : ' + this.__nrUrlRequests);
                if ( this.__urlCounter >= this.__nrUrlRequests ) {
				
                    var layers = this.operationalLayers;
                    var j, titlePane;
                    for ( j = 0; j < layers.length; j++ ) {
                        layer = layers[j];


                        if ( this.checkBoxFigli[j] === undefined || this.checkBoxFigli[j].length === 0 ) {
                            continue;
                        }
                        else {
                            titlePane = new TitlePane({title: layer.label, content: "", open: false, style:"height:250px; overflow:auto; border:1px solid	"});
                            domConstruct.place(this._titlePanesLi[j], titlePane.containerNode);
                            domConstruct.place(titlePane.domNode, this.elencoLayersPerIlSelect);
                            titlePane.startup();
                        }
                    }
                    deferred.resolve();

                    this._contaLayerSelezionati();
                }
            },

            _contaLayerSelezionati: function () {
                var counter = 0;
                var that = this;
                array.forEach(this.checkBoxFigli, function ( groupCheckBoxFigli, index ) {
                    if ( that.checkBoxPadri[index]/*nel caso sta caricando e cambi visibilità saraì sfortunato*/ && that.checkBoxPadri[index].checked === true ) {
                        array.forEach(groupCheckBoxFigli, function ( checkBoxFiglio ) {
                            if ( checkBoxFiglio.disabled !== true && checkBoxFiglio.checked === true ) {
                                counter++;
                            }
                        });
                    }
                });
                this.layerSelezionati.innerHTML = counter;
            },
			_createLayerItem: function(checkbox){
				item={"layerId":"", "name":"", "fullName":""};
				if(checkbox){
					item.fullName = checkbox.fullName;
					item.layerId = checkbox.idLayer || checkbox.value;
				}
				return item;
			}
        });
    });