define([
        'dojo/_base/declare', 'dijit/_WidgetsInTemplateMixin', 'dojo/_base/lang',
        'dojo/_base/array', 'dojo/has', 'esri/kernel',
        '../utils', 'dojo/keys', 'esri/SpatialReference',
        'esri/geometry/Extent', 'jimu/BaseWidget', 'esri/layers/ArcGISDynamicMapServiceLayer',
        'esri/request', 'dojo/topic', "esri/InfoTemplate",
        "esri/dijit/Popup", "esri/dijit/PopupTemplate", "dojo/dom-construct",
        "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color",
        "dojo/dom-attr", "esri/tasks/QueryTask", "esri/tasks/query",
        "dojo/date/locale", "esri/urlUtils", "jimu/esriIT/esriItutils",
        "jimu/esriIT/attributeTableUtils",'jimu/LayerInfos/LayerInfos','dojo/_base/html',
        "jimu/esriIT/ArcgisBasemap"
    ],
    function ( declare, _WidgetsInTemplateMixin, lang,
              array, has, kernel,
              jimuUtils, keys, SpatialReference,
              Extent, BaseWidget, ArcGISDynamicMapServiceLayer,
              esriRequest, topic, InfoTemplate,
               Popup, PopupTemplate, domConstruct,
               SimpleFillSymbol, SimpleLineSymbol, Color,
               domAttr, QueryTask, Query,
               DateLocale, urlUtils, esriItutils,
               AttributeTableUtils,LayerInfos, html,
               ArcgisBasemap) {

        var classObj = declare([BaseWidget, _WidgetsInTemplateMixin], {

            appConfig: null,
            infoWindowEnabled: false,
            addedInfoWindowFunction: false,
            popup: null,
            relationshipsRequest: [],

            constructor: function(){
                this.attributeTableUtilsInstance = new AttributeTableUtils( this );
                this._defaultBasemapAdded = false;
            },

            showMap: function ( appConfig, mapManager ) {
                var mainClass = this;
                this.appConfig = appConfig;

                var webmap = new Object();
                var webmapOptions = new Object();
                webmapOptions.mapOptions = new Object();
                
                webmapOptions.mapOptions = dojo.mixin(webmapOptions.mapOptions,appConfig.map.mapOptions);

                if ( appConfig.map.mapOptions && appConfig.map.mapOptions.extent ) webmapOptions.mapOptions.extent = new Extent(appConfig.map.mapOptions.extent);
                if ( appConfig.map.mapOptions && appConfig.map.mapOptions.lods ) webmapOptions.mapOptions.lods = appConfig.map.mapOptions.lods;

                var popupOptions = {
                    marginLeft: "20",
                    marginTop: "20"
                };
                var popup = new Popup(popupOptions, domConstruct.create("div"));
                webmapOptions.mapOptions.infoWindow = popup;

                webmap.item = new Object();
                webmap.item.title = "Titolo";
                webmap.item.snippet = "Dettaglio del titolo";

                

                webmap.itemData = new Object();
                webmap.itemData.operationalLayers = new Array();
                
                webmap.itemData.tables = new Array();
                webmap.itemData.version = "2.2";
                
                var baseMap = {};
                baseMap.baseMapLayers = [];
                baseMap.title = "esriItLoader";
                
                if(webmapOptions.mapOptions.basemap && dojo.isObject(webmapOptions.mapOptions.basemap))  delete webmapOptions.mapOptions.basemap;
                
                if((!this.appConfig.map.basemaps || !dojo.isArray(this.appConfig.map.basemaps)) ){
                    baseMap.baseMapLayers.push(ArcgisBasemap.getDefaultBasemapObject());
                    this._defaultBasemapAdded = true;
                }else {
                    array.forEach(appConfig.map.basemaps, function ( layerConfig, i ) {
                        if(layerConfig.url && dojo.isString(layerConfig.url)) baseMap.baseMapLayers.push(layerConfig);                        
                    });
                }
                
                if(baseMap.baseMapLayers.length == 0) {
                    baseMap.baseMapLayers.push(ArcgisBasemap.getDefaultBasemapObject());
                    this._defaultBasemapAdded = true;
                }
                
                webmap.itemData.baseMap = baseMap;

                var layerInfoTemplates = new Object();
                array.forEach(this.appConfig.map.operationallayers, function ( layerConfig, i ) {
                    
                    var definitionExpression = layerConfig.layerDefinitions;
                    var arrayDef = new Array();
                    array.forEach(layerConfig.layerDefinitions,function(ld,idx){
                      arrayDef[ld.layerId] = ld.definition;
                    });
                    
                    layerConfig.layerDefinitions = arrayDef;
                    var paramUrl = mainClass.getLocation(layerConfig.url);
                    mainClass._addProxyRule(mainClass,paramUrl);
                    
                    webmap.itemData.operationalLayers.push(layerConfig);
                });
                
                
                array.forEach(this.appConfig.map.tables, function ( tableConfig, i ) {
                    if(typeof tableConfig.id != undefined) tableConfig.id = 'esriItLoaderTables_'+i;
                    webmap.itemData.tables.push(tableConfig);
                });

                var mapDeferred = jimuUtils.createAgsMap(webmap, mapManager.mapDivId, webmapOptions);

                mapDeferred.then(lang.hitch(mapManager, function ( response ) {

                    response.map.infoWindow = popup;
                    mainClass.map = response.map;
                    map = response.map;
                    
                    
                    if(mainClass._defaultBasemapAdded && (this.appConfig.map.basemaps && dojo.isArray(this.appConfig.map.basemaps) && this.appConfig.map.basemaps.length>0)){
                        map.removeLayer(ArcgisBasemap.idDefaultBasemap);
                        var extraArcgisLayer = dojo.filter(this.appConfig.map.basemaps, function(item,idx){
                            return (item.type && dojo.isString(item.type) && !item.url);
                        });
                        
                        dojo.forEach(extraArcgisLayer, function(item,idx){
                            ArcgisBasemap.addExtraLayer(item,map);
                        });
                        
                        var extraVectorLayer = dojo.filter(this.appConfig.map.basemaps, function(item,idx){
                            return (item.type && item.type == "vector" && item.url);
                        });
                        
                        dojo.forEach(extraVectorLayer, function(item,idx){
                            ArcgisBasemap.addVectorLayer(item,map);
                        });
                    }
                    //_basemapGalleryLayerType:"basemap"

                    
                    map.itemInfo = response.itemInfo;
                    map.webMapResponse = response;
                    // enable snapping
                    var options = {
                        snapKey: keys.copyKey
                    };
                    map.enableSnapping(options);
                    if ( appConfig.map.mapOptions && appConfig.map.mapOptions.enableInfoWindow ) {
                        mainClass.infoWindowEnabled = true;
                        map.setInfoWindowOnClick(true);
                    }
                    
                    
                    
                    mainClass._setInfoBaseLayer(map);
                    
                    mainClass._setEsriItLayerInfos(map);
                    
                    mainClass._addInfoTemplateOnStart(map,mainClass);

                    
                    
                    //******** Call di Completamento ****
                    html.setStyle(map.root, 'zIndex', 0);
                    map._initialExtent = map.extent;
                    
                    
                    //mapManager._publishMapEvent(map);
                    //
                    //setTimeout(lang.hitch(mapManager, mapManager._checkAppState), 500);
                    //
                    //mapManager.loading.hide();
                    //
                    //mapManager._addDataLoadingOnMapUpdate(map);
                    
                    LayerInfos.getInstance(map, map.itemInfo).then(lang.hitch(this, function(layerInfosObj) {
                        this.layerInfosObj = layerInfosObj;
                        this._publishMapEvent(map);
                        setTimeout(lang.hitch(this, this._checkAppState), 500);
                        this.loading.hide();
                        this._addDataLoadingOnMapUpdate(map);
                    }));


                }), lang.hitch(mapManager, function () {
                    if ( mapManager.loading ) {
                        mapManager.loading.destroy();
                    }
                    topic.publish('mapCreatedFailed');
                }));

            },
            
            _setInfoBaseLayer: function(xmap){
                array.forEach(this.appConfig.map.operationallayers.reverse(), function ( layerConfig, i ) {
                    var lyr = esriItutils.getMapLayerByUrl(xmap,layerConfig.url);
                    if(lyr!=null &&(lyr.name=="" || typeof lyr.name == "undefined" || typeof lyr.name == undefined)) lyr.name = layerConfig.name;
                    if(lyr!=null &&(lyr.title=="" || typeof lyr.title == "undefined" || typeof lyr.title == undefined)) lyr.title = layerConfig.title;
                    
                });
            },
            
            _setEsriItLayerInfos: function(xmap){
              array.forEach(this.appConfig.map.operationallayers.reverse(), function ( layerConfig, i ) {
                var lyr = esriItutils.getMapLayerByUrl(xmap,layerConfig.url);
                if(lyr!=null){
                    if(typeof lyr.esriItLayerInfos == "undefined" || typeof lyr.esriItLayerInfos == undefined) lyr.esriItLayerInfos = new Object();
                    lyr.esriItLayerInfos.originalDefinition = lang.clone(layerConfig.layerDefinitions);
                    
                    //********** VISIBLE LAYERS	**********
                    if ( typeof layerConfig.visibleLayers != 'undefined' && layerConfig.visibleLayers != null && dojo.isArray(layerConfig.visibleLayers) && (layerConfig.visibleLayers.length > 0) ) {
                        lyr.setVisibleLayers(layerConfig.visibleLayers);
                        lyr.esriItLayerInfos.visibleLayers = lang.clone(layerConfig.visibleLayers);
                    }else{
                      lyr.esriItLayerInfos.visibleLayers = lyr.visibleLayers;
                    }
                    
                    //********** VISIBLE LAYER FIELDS	**********
                    if ( typeof layerConfig.layerFields != 'undefined' && layerConfig.layerFields != null && dojo.isArray(layerConfig.layerFields) && (layerConfig.layerFields.length > 0) ) {
                        lyr.layerFields = layerConfig.layerFields;
                        lyr.esriItLayerInfos.layerFields = lang.clone(layerConfig.layerFields);
                    }
                }
              });
            },
            
            _addProxyRule: function(mainClass,paramUrl){
              if ( paramUrl.protocol == 'http:' && window.location.protocol == 'https:' ) urlUtils.addProxyRule({
                  urlPrefix: paramUrl.hostname,
                  proxyUrl: mainClass.appConfig.httpProxy.url
              });
              if ( paramUrl.protocol == 'https:' && window.location.protocol == 'http:' ) urlUtils.addProxyRule({
                  urlPrefix: paramUrl.hostname,
                  proxyUrl: mainClass.appConfig.httpProxy.url
              });
            },
            
            
            _addInfoTemplateOnStart: function(map,mainClass){
              array.forEach(mainClass.appConfig.map.operationallayers.reverse(), function ( layerConfig, i ) {
                      
                        window.showInfoTemplateRelations = mainClass.showInfoTemplateRelations;
                        window.addRelationToInfoWindow = mainClass.addRelationToInfoWindow;
                        window.errorRelationToInfoWindow = mainClass.errorRelationToInfoWindow;
                        window.esriItLoaderClass = mainClass;

                        var layerInfoTemplates = new Object();
                        if ( mainClass.infoWindowEnabled ) {
                            array.forEach(layerConfig.layers, function ( layer, idx ) {
                              var item = new Object();
                              item.layerId = layer.id;
                              item.title = layer.popupInfoCustom.title;
                              item.description = layer.popupInfoCustom.description;
                              item.fieldInfos = layer.popupInfoCustom.fieldInfos;
                              item.showAttachments = layer.popupInfoCustom.showAttachments;
                              item.mediaInfos = layer.popupInfoCustom.mediaInfos;
                              
                                var popupTemplateOptions = new Object();

                                //TITLE
                                popupTemplateOptions.title = (item.title && item.title != null) ? item.title : "Info";

                                if ( typeof item.description == 'undefined' || item.description == null ) {
                                    //FIELD INFOS
                                    popupTemplateOptions.fieldInfos = new Array();
                                    var checkRelation = false;
                                    var tempDescription = '<table class="attrTable" cellpadding="0px" cellspacing="0px"><tbody>';
                                    array.forEach(item.fieldInfos, function ( fieldInfo, idxFieldInfo ) {
                                        var obj = new Object();

                                        //Field Name
                                        obj.fieldName = fieldInfo.fieldName;
                                        if ( fieldInfo.fieldName.toString().toLowerCase().indexOf('relationships') != -1 ) checkRelation = true;

                                        //Field Label
                                        obj.label = (fieldInfo.label && fieldInfo.label != null) ? fieldInfo.label : fieldInfo.fieldName;

                                        //if ( tempDescription != "" ) tempDescription += "<br>";
                                        //tempDescription += "<b>" + obj.label + ":</b> {" + fieldInfo.fieldName + "}";

                                        tempDescription += '<tr valign="top">';
                                        tempDescription += '<td class="attrName">' + obj.label + ":</td>";
                                        tempDescription += '<td class="attrValue">{'+fieldInfo.fieldName+ '}</td>';
                                        tempDescription += '</tr>';
                                        
                                        
                                        //Field Format
                                        if ( fieldInfo.format && fieldInfo.format != null ) obj.format = fieldInfo.format;

                                        //Field Statistica
                                        if ( fieldInfo.statisticType && fieldInfo.statisticType != null ) obj.statisticType = fieldInfo.statisticType;

                                        //Field Visible
                                        if ( item.description && item.description == null ) obj.visible = true;
                                        popupTemplateOptions.fieldInfos.push(obj);
                                    });
                                    tempDescription += '</tbody></table>';
                                }

                                //DESCRIPTION
                                if ( item.description && item.description != null ) popupTemplateOptions.description = item.description;
                                else popupTemplateOptions.description = tempDescription;

                                //ATTACHMENTS
                                if ( item.showAttachments && item.showAttachments != null ) popupTemplateOptions.showAttachments = item.showAttachments;

                                //MEDIA INFOS
                                if ( item.mediaInfos && item.mediaInfos != null && (dojo.isArray(item.mediaInfos) && item.mediaInfos.length > 0) ) popupTemplateOptions.mediaInfos = item.mediaInfos;

                                var popupTemplate = new PopupTemplate(popupTemplateOptions);
                                if ( checkRelation ){
                                    popupTemplate.setContent(dojo.hitch(mainClass, mainClass.getInfoTemplateContent, {
                                        mainClass: mainClass,
                                        item: item,
                                        layerId: layer.id,
                                        popupTemplate: popupTemplate,
                                        popupTemplateOptions: popupTemplateOptions
                                    }));
                                }
                                layerInfoTemplates[item.layerId] = {infoTemplate: popupTemplate};
                            });
                            
                            for(var opCnt = 0; opCnt<map.itemInfo.itemData.operationalLayers.length; opCnt++){
                              if(map.itemInfo.itemData.operationalLayers[opCnt].url == layerConfig.url){
                                if(typeof map.itemInfo.itemData.operationalLayers[opCnt].layerObject != undefined){
                                    if(dojo.isObject(map.itemInfo.itemData.operationalLayers[opCnt].layerObject) && typeof map.itemInfo.itemData.operationalLayers[opCnt].layerObject.esriItLayerInfos == undefined) {
                                        map.itemInfo.itemData.operationalLayers[opCnt].layerObject.esriItLayerInfos = new Object();
                                        map.itemInfo.itemData.operationalLayers[opCnt].layerObject.esriItLayerInfos.layerInfoTemplates = lang.clone(layerInfoTemplates);
                                        map.itemInfo.itemData.operationalLayers[opCnt].layerObject.setInfoTemplates(layerInfoTemplates);
                                    }else if(dojo.isObject(map.itemInfo.itemData.operationalLayers[opCnt].layerObject) && (typeof map.itemInfo.itemData.operationalLayers[opCnt].layerObject.esriItLayerInfos != undefined && dojo.isObject(map.itemInfo.itemData.operationalLayers[opCnt].layerObject.esriItLayerInfos))){
                                        map.itemInfo.itemData.operationalLayers[opCnt].layerObject.esriItLayerInfos.layerInfoTemplates = lang.clone(layerInfoTemplates);
                                        map.itemInfo.itemData.operationalLayers[opCnt].layerObject.setInfoTemplates(layerInfoTemplates);
                                    }
                                }
                                
                                break;
                              }
                            }
                        }
                    });
            },
            
            addInfoWindowFunction: function () {
                //window.formatNumber = this.formatNumber;
                this.addedInfoWindowFunction = true;
            },

            formatNumber: function ( value, key, data ) {
                var searchText = "" + value;
                var formattedString = searchText.replace(/(\d)(?=(\d\d\d)+(?!\d))/gm, "$1,");
                return formattedString;
            },

            getInfoTemplateContent: function ( data, graphic ) {
                var item = data.item;
                var mainClass = data.mainClass;
                var layer = map.getLayer(data.layerId);
                var popupTemplate = data.popupTemplate;
                var popupTemplateOptions = data.popupTemplateOptions;

                if ( item.description && item.description != null ) return item.description;

                var content = '<div class="header" dojoattachpoint="_title">' + layer.name + '</div>' +
                                '<div><hr></div>'+
                                '<table class="attrTable" cellpadding="0px" cellspacing="0px"><tbody>';
                var checkRelationHr = true;


                array.forEach(item.fieldInfos, function ( fieldInfo, idxFieldInfo ) {
                    if ( fieldInfo.fieldName.indexOf('relationships') != -1 ) {
                        var fieldNameSplit = fieldInfo.fieldName.split('/');
                        var relations = graphic._layer.relationships;
                        if ( typeof relations[fieldNameSplit[1]] != 'undefined' ) {
                            var nameRelationRequest = relations[fieldNameSplit[1]].name;
                            var keyField = relations[fieldNameSplit[1]].keyField;
                            var relatedTableId = relations[fieldNameSplit[1]].relatedTableId;
                            var relatedValue = graphic.attributes[keyField];

                            if ( relatedValue ) {
                                if ( checkRelationHr ) {
                                    content += '<hr>';
                                    checkRelationHr = false;
                                }

                                content += '<table style="width: 100%; ">';
                                content += '<tr>';
                                content += '<td>';
                                content += '<b>Relation ' + nameRelationRequest + '</b>';
                                content += '</td>';
                                content += '<td style="text-align: right;">';
                                content += '<button onclick="window.showInfoTemplateRelations(this)" layerId="' + layer.id + '" relatedTableField="' + fieldNameSplit[2] + '" fieldName="' + fieldInfo.fieldName + '" keyField="' + keyField + '" relatedTableId="' + relatedTableId + '" relatedValue="' + relatedValue + '" nameRelationRequest="' + nameRelationRequest + '">Show</button>';
                                content += '</td>';
                                content += '</tr>';
                                content += '</table>';
                            }
                        }
                    } else {
                        content += '<tr valign="top">';
                            var label = (fieldInfo.label && fieldInfo.label != null) ? fieldInfo.label : fieldInfo.fieldName;
                            var value = graphic.attributes[fieldInfo.fieldName];
                            content += '<td class="attrName">' + label + ":</td>";
                            content += '<td class="attrValue">'+((value != null) ? value : '-') + '</td>';
                        content += '</tr>';
                    }
                });
                content += '</tbody>';
                content += '</table>';

                if ( popupTemplateOptions.showAttachments ) {
                    content += '<div id="esriItLayerInfos_Attachments"></div>';
                    graphic._layer.queryAttachmentInfos(graphic.attributes[graphic._layer.objectIdField], this.showAttachments, this.errorAttachments);
                }

                return content;
            },

            showAttachments: function ( result ) {
                var html = dojo.create('div', {'class': 'attachmentsSection'});
                dojo.place(dojo.create('hr').outerHTML, html, 'last');
                var title = dojo.create('div', {innerHTML: 'Allegati:'});
                dojo.place(title.outerHTML, html, 'last');
                var ul = dojo.create('ul');

                if ( result.length == 0 ) {
                    dojo.place('<li>Nessun allegato trovato</li>', html, 'last');
                    dojo.place(ul.outerHTML, html, 'last');
                } else {

                    dojo.forEach(result, function ( item, idx ) {
                        var li = dojo.create('li');
                        var link = dojo.create('a', {href: item.url, target: '_blank', innerHTML: item.name});
                        dojo.place(link.outerHTML, li, 'only');
                        dojo.place(li.outerHTML, ul, 'last');
                    });
                    dojo.place(ul.outerHTML, html, 'last');
                }
                dojo.place(dojo.create('div', {'class': 'break'}).outerHTML, html, 'last');
                dojo.place(html.outerHTML, dojo.byId('esriItLayerInfos_Attachments'), 'only');
            },

            errorAttachments: function ( result ) {
                console.log(result);
            },

            showInfoTemplateRelations: function ( domNode ) {
                var layerId = domAttr.get(domNode, "layerId");
                var keyField = domAttr.get(domNode, "keyField");
                var fieldName = domAttr.get(domNode, "fieldName");
                var relatedTableId = domAttr.get(domNode, "relatedTableId");
                var relatedValue = domAttr.get(domNode, "relatedValue");
                var nameRelationRequest = domAttr.get(domNode, "nameRelationRequest");
                var relatedTableField = domAttr.get(domNode, "relatedTableField");

                var layer = window._viewerMap.getLayer(layerId);
                var fieldNameSplit = fieldName.split('/');
                var layerIdOfRelation = fieldNameSplit[1];

                var queryTask = new QueryTask(layer.url + "/" + relatedTableId);
                var query = new Query();
                query.where = relatedTableField + "='" + relatedValue + "'";
                query.outFields = ["*"];
                query.returnGeometry = true;
                query.outSpatialReference = {wkid: window._viewerMap.spatialReference.wkid};
                queryTask.execute(query, dojo.hitch(this, window.addRelationToInfoWindow, {
                    relatedValue: relatedValue,
                    keyField: keyField,
                    domNode: domNode,
                    nameRelationRequest: nameRelationRequest,
                    layerUrl: layer.url + "/" + relatedTableId
                }), errorRelationToInfoWindow);
            },

            addRelationToInfoWindow: function ( params, featureSet ) {
                var domNode = params.domNode;
                var layerUrl = params.layerUrl;
                var nameRelationRequest = params.nameRelationRequest;
                var keyField = params.keyField;
                var relatedValue = params.relatedValue;

                var that = window.esriItLoaderClass;
                var columns = lang.hitch(that, "_getColumnsArray", featureSet)();
                var data = lang.hitch(that, "_getDataArray", featureSet)();


                this.attributeTableUtilsInstance.chiudiTabByInternalName("Relations (" + keyField + " " + relatedValue + "): " + nameRelationRequest);
                this.attributeTableUtilsInstance.apriNuovoTab({
                    columns: columns,
                    data: data,
                    layerURL: layerUrl,
                    tabTitle: "Relations (" + keyField + " " + relatedValue + "): " + nameRelationRequest,
                    tabInternalName: "Relations (" + keyField + " " + relatedValue + "): " + nameRelationRequest,
                    closable: true
                });
            },

            errorRelationToInfoWindow: function ( error ) {
                console.log(error.message);
            },

            _getColumnsArray: function ( result ) {

                var columns = {};
                array.forEach(result.fields, function ( field ) {
                    columns[field.name] = field.alias;
                });
                return columns;
            },

            _getDataArray: function ( result ) {
                var data = [];
                var row_data = null;

                var fieldsAliases = [];
                if ( result.fields !== undefined && lang.isArray(result.fields) ) {
                    array.forEach(result.fields, function ( field ) {
                        fieldsAliases[field.name] = {"alias": field.alias, "type": field.type};
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

                            if ( fieldsAliases[property] !== undefined && fieldsAliases[property].type === 'esriFieldTypeDate' ) {
                                date = new Date(row_data[fieldsAliases[property].alias]);
                                if ( date instanceof Date ) {
                                    row_data[fieldsAliases[property].alias] = date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear();
                                }
                            }
                        }
                    }

                    row_data.ObjectID = index;//ObjectID CASE-SENSITIVE!!! serve per non far scomparire il tab!
                    if ( riga.geometry !== undefined ) {
                        row_data.geometry = riga.geometry;
                    }
                    data.push(row_data);
                });

                return data;
            },

            getLocation: function ( href ) {
                var match = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)(\/[^?#]*)(\?[^#]*|)(#.*|)$/);
                return match && {
                        protocol: match[1],
                        host: match[2],
                        hostname: match[3],
                        port: match[4],
                        pathname: match[5],
                        search: match[6],
                        hash: match[7]
                    }
            }

        });
        return new classObj();

    });