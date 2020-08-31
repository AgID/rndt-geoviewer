define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/has',
    'esri/kernel',
    'esri/utils',
    'dojox/xml/parser',
    'esri/request',
    'jimu/dijit/Message',
    'jimu/dijit/Popup',
    'dojo/Deferred',
    'dojo/io-query',
    'dojo/_base/array',
    'dojo/dom-style',
    'dojo/string',
    "esri/tasks/FeatureSet",
    "esri/tasks/Geoprocessor",
    'dojo/query',
    'dojo/dom-construct',
    'dijit/form/Button',
    'dijit/Dialog',
    "dojo/sniff"
],
        function (declare, lang, array, has, kernel, utils, parser, esriRequest,
                Message, Popup, Deferred, ioQuery, arrayUtils, domStyle, string,
                FeatureSet,Geoprocessor, query, domConstruct, Button, Dialog) {

            var classObj = declare(null, {
				
				enabledProxyForThisDeferred : function(def){		
					/* <<<<<<< ********************************* */
					//mp patch per caricare layer con protocollo differente dall'applicazione (es: applicazione=>https  layer=> http)
					/* ********************************* */
					if( dojo.exists("window.esriConfig.defaults.io", window) && window.esriConfig.defaults.io.proxyUrl && !window.esriConfig.defaults.io.alwaysUseProxy){
						var alwaysUseProxy = window.esriConfig.defaults.io.alwaysUseProxy;
						window.esriConfig.defaults.io.alwaysUseProxy = true;
						/* ********************************* >>>>>>> */	  
						def.then().always(function() {
							window.esriConfig.defaults.io.alwaysUseProxy = alwaysUseProxy; /* <<<<<<< ********************************* */				
						});
					}
					return def;
				},
				
                getServiceFields: function (layerUrl)
                {
                    var def = new Deferred();

                    var layersRequest = esriRequest({
                        url: layerUrl,
                        content: { f: "json" },
                        handleAs: "json"
                    });

                    layersRequest.then(
                        function(response) {
                            def.resolve(response.fields);
                        },
                        function(error) {
                            def.resolve(response);
                        }
                    );

                    return def;
                },

                getFieldDomainCodedValue: function (fields, field_name, value) {
                    for (var key in fields) {
                        var field = fields[key];

                        if (field.name != field_name) {
                            continue;
                        }

                        if (!field.hasOwnProperty("domain") || field.domain == null) {
                            return value;
                        }

                        var codedValues = field.domain.codedValues;

                        for (var codeKey in codedValues) {
                            var codedValue = codedValues[codeKey];

                            if (codedValue.code == value) {
                                return codedValue.name;
                            }
                        }
                    }

                    return value;
                },
                
                getAttribute: function (/* Node */ node, /* String */ attrName) {
                    if (!node) {
                        return null;
                    }

                    if (has("ie")) {
                        for (var i = 0; i < node.attributes.length; i++) {
                            if (node.attributes[i].nodeName == attrName) {
                                return node.attributes[i].nodeValue;
                            }
                        }
                        return null;
                    }
                    if (node) {
                        if (has("ie")) {
                            for (var i = 0; i < node.attributes.length; i++) {
                                if (node.attributes[i].nodeName == attrName) {
                                    return node.attributes[i].nodeValue;
                                }
                            }
                            return null;
                        }
                        else {
                            return node.getAttribute(attrName);
                        }
                        return null;
                    }
                    return null;
                },
                
                getValue: function (/* String|Node */ source, /*DOMNode*/ document) {
                    if (source) {
                        var node = source;
                        if ( typeof source == "string" ) {
                            var arr = source.split(" > ");
                            var nlist = this.getNodes(arr[0], arr[1], document);
                            node = nlist[0];
                        }

                        if (node.firstChild && node.firstChild.nodeValue) {
                            return node.firstChild.nodeValue;
                        }
                        return null;
                    }
                    return null;
                },
                
                getNodes: function (/*String*/ parentTagName, /*String*/ childTagName, /*Document*/ doc) {
                    //console.log(parentTagName + " - " + childTagName);
                    var nodes = new query.NodeList();
                    if (has("ie")) {
                        var parentNodes = doc.getElementsByTagName(parentTagName);
                        array.forEach(parentNodes, function (parent, idx, arr) {
                            if (childTagName.indexOf(">") !== -1) {
                                var appo = childTagName.split(" > ");
                                var firstChild = appo[0];
                                var secondChild = appo[1];
                                var firstChildNodes = parent.getElementsByTagName(firstChild);
                                var childNodes = firstChildNodes[0].getElementsByTagName(secondChild);
                                array.forEach(childNodes, function (child, idx, arr) {
                                    nodes.push(child);
                                });
                            } else {
                                var childNodes = parent.getElementsByTagName(childTagName);
                                array.forEach(childNodes, function (child, idx, arr) {
                                    nodes.push(child);
                                });
                            }
                        });
                    }
                    else {
                        nodes = query(parentTagName + " > " + childTagName, doc);
                    }
                    return nodes;
                },
                
                arrayListOfLayer: function (lyr) {
                    var lyrInfos;
                    lyrInfos = lyr.hasOwnProperty("dynamicLayerInfos") ? lyr.dynamicLayerInfos : lyr.layerInfos;
                    var contatore = 0;
                    var lista = [];

                    array.forEach(lyrInfos, function (parent, idx, arr) {
                        var lyrName = parent.name;
                        var parentId, parentLayerId, maxScale, minScale;
                        var haschildren = true;
                        if ((parent.subLayerIds == null) || (parent.subLayerIds.length == 0))
                            haschildren = false;
                        if (parent.subLayers != null) {  //patch for WMS case
                            if (parent.subLayers.length > 0)
                                haschildren = true;
                        }

                        if (lyr.typeservice == 'wms') {
                            parentId = parent.name;
                            lyrName = parent.title ? parent.title : parent.name;
                        } else {
                            parentId = parent.id;
                        }
                        if (typeof parent.parentLayerId == 'undefined') {
                            parentLayerId = -1;
                        } else {
                            parentLayerId = parent.parentLayerId;
                        }
                        if (typeof parent.maxScale == 'undefined') {
                            maxScale = 0;
                        } else {
                            maxScale = parent.maxScale;
                        }
                        if (typeof parent.minScale == 'undefined') {
                            minScale = 0;
                        } else {
                            minScale = parent.minScale;
                        }
                        var parentLyrName = "";
                        if (parentLayerId != -1) {
                            parentLyrName = lyrInfos[parentLayerId].title ? lyrInfos[parentLayerId].title : lyrInfos[parentLayerId].name
                        } else {
                            parentLyrName = lang.trim(lyrName);
                        }

                        lista.push({id: parentId,
                            layerName: lang.trim(lyrName),
                            parent: parentLayerId,
                            parentName: parentLyrName,
                            defaultVisibility: parent.defaultVisibility,
                            maxScale: maxScale,
                            minScale: minScale,
                            layerType: lyr.declaredClass,
                            hasChildren: haschildren
                        });
                        contatore++;
                        var sublyrInfos = parent.subLayers;
                        if (sublyrInfos != []) {
                            array.forEach(sublyrInfos, function (child, ind) {
                                var sublyrName = child.name;
                                var childId, parentLayerId, maxScale, minScale;
                                var haschildren = true;
                                if ((child.subLayerIds == null) || (child.subLayerIds.length == 0))
                                    haschildren = false;
                                if (lyr.typeservice == 'wms') {
                                    childId = child.name;
                                    sublyrName = child.title ? child.title : child.name;
                                } else {
                                    childId = child.id;
                                }
                                if (typeof child.parentLayerId == 'undefined') {
                                    parentLayerId = -1;
                                } else {
                                    parentLayerId = child.parentLayerId;
                                }
                                if (typeof child.maxScale == 'undefined') {
                                    maxScale = 0;
                                } else {
                                    maxScale = child.maxScale;
                                }
                                if (typeof child.minScale == 'undefined') {
                                    minScale = 0;
                                } else {
                                    minScale = child.minScale;
                                }

                                lista.push({id: childId,
                                    layerName: lang.trim(sublyrName),
                                    parent: parentLayerId,
                                    // parentName: (parentLayerId != -1)? lyrInfos[parentLayerId].name : lang.trim(lyrName),
                                    defaultVisibility: child.defaultVisibility,
                                    maxScale: maxScale,
                                    minScale: minScale,
                                    layerType: lyr.declaredClass,
                                    hasChildren: haschildren
                                });
                                contatore++;
                            });
                        }
                    });
                    if (contatore == 0) {
                        return null;
                    } else {
                        return lista;
                    }

                },
                
                confirmDialog: function (title, question, callbackFn) {
                    this.dialog = new Dialog({title: title});

                    var questionDiv = domConstruct.create('div', {innerHTML: question});
                    var yesButton = new Button({label: 'Ok', onClick: lang.hitch(this, this.confirmDialogCallback, {callbackFn: callbackFn, press: 0})});
                    var noButton = new Button({label: 'Cancel', onClick: lang.hitch(this, this.confirmDialogCallback, {callbackFn: callbackFn, press: 1})});

                    this.dialog.containerNode.appendChild(questionDiv);
                    this.dialog.containerNode.appendChild(yesButton.domNode);
                    this.dialog.containerNode.appendChild(noButton.domNode);

                    this.dialog.show();
                },
                
                confirmDialogCallback: function (obj, mouseEvent) {
                    this.dialog.hide();

                    if (obj.press == 0) {
                        obj.callbackFn(true);
                    } else {
                        obj.callbackFn(false);
                    }
                },
                
                addOperationalLayerOnFlyTOC: function (that, layer, titleLyr) {
                    layer.isOperationalLayer = true;

                    var layerObjForTOC = {
                        id: layer.id,
                        layerObject: layer,
                        title: titleLyr || layer.label || layer.title || layer.name || layer.id || " ",
                        visibility: true
                    }

                    layerObjForTOC.name = layerObjForTOC.title;
                    
                    if (layer._collection) {
                        //connect loading image to events: onLayerAdd and onUpdate
                        that.connectLayerEventsToLoader(layer);

                        that.map.itemInfo.itemData.operationalLayers.push(layer.itemInfo);
                        that.map.addLayers([layer]);
                        layerObjForTOC.layerObject.hide();
                        layerObjForTOC.layerObject.show();

                        return ;
                    }

                    layerObjForTOC.url = layerObjForTOC.layerObject.url;

                    var thatUtils = this;

                    // request() 401 Unauthorized
                    var layersRequest = esriRequest({
                        url: layer.url,
                        content: {f: "json"},
                        handleAs: "json",
                        timeout: 1000,
                        callbackParamName: "callback"
                    });

                    layersRequest.then(
                        function (response) {
                            layerObjForTOC.geometryType = response.geometryType;

                            //connect loading image to events: onLayerAdd and onUpdate
                            that.connectLayerEventsToLoader(layer);

                            that.map.itemInfo.itemData.operationalLayers.push(layerObjForTOC);
                            that.map.addLayer(layer);

                            layerObjForTOC.layerObject.hide();
                            layerObjForTOC.layerObject.show();

                        },
                        function (error) {

                        }
                    );

                },
                
                errorMessageAlert: function (title, content, w, h) {
                    new Popup({
                        width: w || 450,
                        height: h || 250,
                        titleLabel: title,
                        content: content
                    });
                },
                
                addWMSLayerOnFlyTOC: function (that, wmslayer) {
                    if (wmslayer.declaredClass && wmslayer.declaredClass == "WMSLayerCustom") {
                        //generate correct GetMap request with specified layers and styles
                        wmslayer.setLayersForGetMap();
                        wmslayer.setStylesForGetMap();
                        array.forEach(wmslayer.mySelectedLayerStyleList, function (couple) {
                            wmslayer.myBaseLayerStyleList.push(couple);
                        });
                        wmslayer.declaredClass = "esri.layers.WMSLayer";
                        wmslayer.declaredSubClass = "WMSLayerCustom";
                    }

                    //connect loading image to events: onLayerAdd and onUpdate
                    that.connectLayerEventsToLoader(wmslayer);

                    //CODE for ADDING LAYER TO ESRI LEGEND//************NOT WORKING!
                    /*
                     var layForLegend = [];
                     for(var i=0;i<wmslayer.layerInfos.length;i++){
                     layForLegend.push({
                     legendURL : wmslayer.layerInfos[i].legendURL,
                     name : wmslayer.layerInfos[i].name,
                     title : wmslayer.layerInfos[i].title
                     });
                     }
                     */

                    //CODE for ADDING LAYER TO ESRI TOC//
                    wmslayer.isOperationalLayer = true;

                    wmslayer.id = wmslayer.label || wmslayer.title || wmslayer.name || wmslayer.id || "-";
                    var layerObjForTOC = {
                        id: wmslayer.id || "-",
                        layerObject: wmslayer,
                        title: wmslayer.label || wmslayer.title || wmslayer.name || wmslayer.id || "-",
                        visibility: true
                    }
                    layerObjForTOC.name = layerObjForTOC.title;
                    layerObjForTOC.url = layerObjForTOC.layerObject.url;
                    that.map.itemInfo.itemData.operationalLayers.push(layerObjForTOC);
                    that.map.addLayer(wmslayer);
                    layerObjForTOC.layerObject.hide();
                    layerObjForTOC.layerObject.show();

                },
                
                parseUrl: function (uri) {
                    var query = {};
                    if (uri) {
                        var idxParameters = uri.indexOf("?");
                        if (-1 != idxParameters) {
                            query = uri.substring(idxParameters + 1, uri.length);
                            query = ioQuery.queryToObject(query);
                            uri = uri.substring(0, idxParameters);
                        }
                        ;
                    }
                    return {
                        "uri": uri,
                        "query": query
                    };
                },

                getLayerURLByUrl: function (url) {
                    if (!url) {
                        return false;
                    }

                    var newURL = url;

                    if (url.indexOf("?") !== -1) {
                        newURL = url.substring(0, url.indexOf("?"));
                    }

                    var lastCharacter = url.substring(url.length - 1);

                    // In case of tailing slash...
                    if (lastCharacter === "/") {
                        return url;
                    }

                    var subString = newURL.substring(newURL.lastIndexOf("/") + 1);

                    if (isNaN(subString)) {
                        return newURL;
                    }

                    return newURL.substring(0, newURL.lastIndexOf("/"));
                },

                getLayerIDByUrl: function (url) {
                    if (!url) {
                        return false;
                    }

                    var newURL = url;

                    if (url.indexOf("?") !== -1) {
                        newURL = url.substring(0, url.indexOf("?"));
                    }

                    return  parseInt(newURL.substring(newURL.lastIndexOf("/") + 1));
                },

                getLayerDefinitionByUrl: function (map, url) {
                    var layerURL = this.getLayerURLByUrl(url);
                    var layerID = this.getLayerIDByUrl(url);

                    if (!this.isNumeric(layerID)) {
                        return null;
                    }

                    var layer = this.getLayerByUrl(map, layerURL);

                    if (layer == null) {
                        return null;
                    }

                    if (!layer.hasOwnProperty("layerDefinitions")) {
                        return null;
                    }

                    if (layer.layerDefinitions.hasOwnProperty(layerID)) {
                        return layer.layerDefinitions[layerID];
                    }

                    return null;
                },

                isNumeric: function(n) {
                    return !isNaN(parseFloat(n)) && isFinite(n);
                },
                
                getQueryStringParameter: function (url, name)
                {
                    var match = RegExp('[?&]' + name + '=([^&]*)').exec(url);

                    if (match) {
                        return decodeURIComponent(match[1].replace(/\+/g, ' '));
                    }

                    return "";
                },

                getMapLayerByUrl: function (map, url) {
                    var that = this;

                    if (map.layerIds.length === 0) {
                        return null;
                    }

                    var layerURL = this.getLayerURLByUrl(url);
                    layerURL = layerURL.trim().toLowerCase();

                    var layers = [];

                    for (var key in map.layerIds) {
                        var layerID = map.layerIds[key];
                        var layer = map.getLayer(layerID);

                        uriObj = that.parseUrl(layer.url);
                        uri = (uriObj.uri || '??').trim().toLowerCase();

                        if (uri === layerURL) {
                            layers.push(layer)
                        }
                    }

                    if (layers.length === 0) {
                        return null;
                    }

                    return layers[0];
                },

                getLayerByUrl: function (map, url, showmsg) {
                    var that = this;
                    var uriObj = {};
                    var uri = '';

                    url = (url || '##').trim().toLowerCase();

                    var layerUrl = this.getLayerURLByUrl(url);

                    var ids = arrayUtils.filter(map.layerIds, function (layerId, idx) {
                        uri = map.getLayer(layerId).url;
                        uriObj = that.parseUrl(uri);
                        uri = (uriObj.uri || '??').trim().toLowerCase();
                        return uri === layerUrl;
                    });

                    if (ids.length > 0) {
                        return map.getLayer(ids[0]);
                    }

                    var ids = arrayUtils.filter(map.graphicsLayerIds, function (layerId, idx) {
                        uri = map.getLayer(layerId).url;
                        uriObj = that.parseUrl(uri);
                        uri = (uriObj.uri || '??').trim().toLowerCase();
                        return uri === url;
                    });

                    if (ids.length > 0) {
                        return map.getLayer(ids[0]);
                    }

                    // No layer found
                    return null;
                },

                AddTS2Where: function () {
                    var dt = new Date().getTime().toString();
                    return string.substitute(' AND (${dt} = ${dt})', {
                        "dt": dt
                    });
                },
                
                AddTS2WhereEx: function () {
                    var dt = new Date().getTime().toString();
                    return string.substitute('(1 = 1) AND (${dt} = ${dt})', {
                        "dt": dt
                    });
                },
                
                showLoading: function (node) {
                    node = node || "loading";
                    domStyle.set(node, "visibility", "visible");
                },
                
                hideLoading: function (node) {
                    node = node || "loading";
                    domStyle.set(node, "visibility", "hidden");
                },
               
                addEqualsToArray: function () {
                    Array.prototype.equals = function (array, strict) {
                        if (!array)
                            return false;
                        if (arguments.length == 1)
                            strict = true;
                        if (this.length != array.length)
                            return false;
                        for (var i = 0; i < this.length; i++) {
                            if (this[i]instanceof Array && array[i]instanceof Array) {
                                if (!this[i].equals(array[i], strict))
                                    return false;
                            } else if (strict && this[i] != array[i]) {
                                return false;
                            } else if (!strict) {
                                return this.sort().equals(array.sort(), true);
                            }
                        }
                        return true;
                    }
                },
                
                buildJobInfoUrlWithQueryString: function (url, jobID) {
                    var indexOfQuestionMark = url.indexOf("?")

                    if (indexOfQuestionMark === -1) {
                        return url + "/" + jobID;
                    }

                    var baseUrl = url.substring(0, indexOfQuestionMark);
                    var urlParams = url.substring(indexOfQuestionMark + 1);

                    return baseUrl + "/" + jobID + "?" + urlParams;
                },

                fixUrlWithToken: function (url) {
                    //console.log("fixing url: " + url);
                    /*
                     * I CASI POSSIBILI SONO
                     * 1. http://test/MapServer
                     * 2. http://test/MapServer/0?token=pippo?mario=rossi
                     * 3. http://test/MapServer?token=Pippo/0
                     * 4. http://test/MapServer?token=Pippo/0?paramentro=valore
                     * (tutti i ? dopo il primo diventano &)
                     */

                    // Caso 1
                    if (url.indexOf("?") === -1) {
                        return url;
                    }

                    var baseUrl = url.substring(0, url.indexOf("?"));
                    var urlParams = url.substring(url.indexOf("?") + 1);


                    // Caso 2
                    if (urlParams.indexOf("/") === -1) {
                        if (urlParams.indexOf("?") !== -1)//tipo nel caso di token=123?f=json
                        {
                            urlParams = urlParams.replace("?", "&");
                            return baseUrl + "?" + urlParams;
                        }
                        return url;
                    }

                    // Caso 3
                    // c'è almeno uno /
                    var r = /\d+/;
                    var num = "";
                    var numConParams = urlParams.substring(urlParams.indexOf("/") + 1);
                    if (numConParams.match(r).length > 0)
                    {
                        num = numConParams.match(r)[0];
                    }


                    var params = "";
                    var urlParams1 = numConParams.substring(num.length);
                    var urlParams2 = urlParams.substring(0, urlParams.indexOf("/"));
                    if (urlParams1.length > 0 && urlParams2.length > 0)
                    {
                        params = urlParams1 + "&" + urlParams2;
                    }
                    else if (urlParams1.length > 0 && urlParams2.length === 0)
                    {
                        params = urlParams1;
                    }

                    else if (urlParams1.length === 0 && urlParams2.length > 0)
                    {
                        params = urlParams2;
                    }
                    if (params.indexOf("?") === 0)
                    {
                        params = params.substring(1);//togli il ? iniziale
                    }

                    params = params.replace("?", "&");

                    /*  if (!isNaN(num) && num != ' ') {
                     return baseUrl + "/" + num + "?" + params;
                     }*/

                    // Caso 4
                    return baseUrl + "/" + num + "?" + params;//vabbene anche http://blablabla/0?&f=json&token=abc.

                },
                
                aggiungiServiceIdInUrlConParams: function (serviceUrl, aggiungiBaseUrl){
                    if (aggiungiBaseUrl === undefined)
                    {
                        window.console.log('aggiungiServiceIdInUrlConParams manca il secondo parametro');
                    }
                    var url = serviceUrl;
                    var params = "";
                    if (url.indexOf('?') > 0) {
                        url = url.substring(0, url.indexOf('?'));
                        params = serviceUrl.substring(serviceUrl.indexOf('?'));
                    }

                    //se non c'è già /0 aggiunto, allora lo aggiungiamo
                    if (url.lastIndexOf(aggiungiBaseUrl) !== (url.length - aggiungiBaseUrl.length))
                    {
                        url += aggiungiBaseUrl;
                    }
                    url += params;

                    return url;
                },

                addTokenIfNecessary: function(url, token){
                    if ( token && url.indexOf('token=') === -1 ) {
                        if(url.indexOf('?') === -1){
                            return url + "?token=" + token;
                        }
                        else {
                            return url + "&token=" + token;
                        }
                    }
                    return url;
                },

                downloadURL: function(url) {
                    var hiddenIFrameID = 'hiddenDownloader',
                        iframe = document.getElementById(hiddenIFrameID);

                    if (iframe === null) {
                        iframe = document.createElement('iframe');
                        iframe.id = hiddenIFrameID;
                        iframe.style.display = 'none';
                        document.body.appendChild(iframe);
                    }

                    iframe.src = url;
                },
          
                gpExportData: function(gpUrl, params) {
                    var gpParams = {"Formato": null, "InputJson": null};
                    var errorParams = {"status": null, "message": null};

                    // Init InputJson
                    gpParams.InputJson = [];

                    var gpService = new Geoprocessor(gpUrl);

                    if (params.outSpatialReference) gpService.outSpatialReference = params.outSpatialReference;

                    if (params.formato)  gpParams.Formato = params.formato;

                    if (params.featureSet) {
                        // gpParams.InputJson = params.featureSet;
                        gpParams.InputJson.push(params.featureSet);
                    } else if (params.multipleFeatureSet) {


                        for (var key in params.multipleFeatureSet) {
                            gpParams.InputJson.push(
                                params.multipleFeatureSet[key]
                            );
                        }

                    } else if (params.features) {
                        var facilities = new FeatureSet();
                        facilities.features = params.features;
                        //gpParams.InputJson = facilities;
                        gpParams.InputJson.push(facilities);
                    } else if (params.geometry) {
                        //gpParams.InputJson = params.geometry;
                        gpParams.InputJson.push(params.geometry);
                    } else {
                        errorParams.status = false;
                        errorParams.message = "Input type non supportato";
                    }


                    var callback = null;
                    var errorback = null;
                    var statusCallback = null;

                    if (params.callback) {
                        callback = params.callback;
                    } else {
                        errorParams.status = false;
                        errorParams.message = "callback function non presente";
                    }

                    if (params.statusCallback) statusCallback = params.statusCallback;

                    if (params.errorback) {
                        errorback = params.errorback;
                    }
                    else {
                        params.errorback = function (error) {
                            errorParams.status = false;
                            errorParams.message = error.message;
                        }
                    }

                    if (params.gpMethod) {
                        switch (params.gpMethod) {
                            case "execute":
                                errorParams.status = true;
                                errorParams.message = "start job execute!";
                                gpService.execute(gpParams, callback, errorback);
                                break;

                            case "submitJob":
                                errorParams.status = true;
                                if (params.returnType == "getResultData" && params.outputData) {
                                    gpService.submitJob(
                                        gpParams,
                                        function (jobInfo) {
                                            gpService.getResultData(jobInfo.jobId, params.outputData, callback);
                                        },
                                        statusCallback,
                                        errorback
                                    );
                                } else if (params.returnType == "getImage" && params.outputData) {
                                    var imageParams = new esri.layers.ImageParameters();
                                    gpService.getResultImageLayer(jobInfo.jobId, params.outputData, imageParams, callback);
                                } else {
                                    gpService.submitJob(gpParams, callback, statusCallback, errorback);
                                }

                                errorParams.message = "start job submitJob!";

                                break;

                            default:
                                errorParams.status = false;
                                errorParams.message = "Input type non supportato";
                                break;
                        }
                    } else {
                        errorParams.status = false;
                        errorParams.message = "Input type non supportato";
                    }
                    return errorParams;
                },
                
                getIdFieldName: function( fields ){
                  var i, len, field;
                  for( i = 0, len = fields.length; i < len; i += 1 ){
                    field = fields[i];
                    if ( field.type === 'esriFieldTypeOID')
                    {
                      return field.name;
                    }
                  }
                  return null;
                },
                
               getFileNameDate: function(filename, separator){                     
                  var date = new Date();    
                  var day = date.getDate();    
                  var monthIndex = date.getMonth() + 1;    
                  var year = date.getFullYear();    
                  if(!separator)separator="_";
                  return (filename ? filename + separator: '') + day + separator + monthIndex + separator + year;
                },

                formatDate: function(date)
                {
                    /*var d = Date(date),
                        month = '' + (d.getMonth() + 1),
                        day = '' + d.getDay(),
                        year = d.getFullYear(),
                        hour = d.getHours(),
                        minute = d.getMinutes(),
                        seconds = d.getSeconds();

                    if (month.length < 2)
                        month = '0' + month;
                    if (day.length < 2)
                        day = '0' + day;
                    if (hour.length < 2)
                        hour = '0' + hour;
                    if (minute.length < 2)
                        minute = '0' + minute;
                    if (seconds.length < 2)
                        seconds = '0' + seconds;*/
                    // input 20/10/2010 21:30:50
                    // output 2010-10-20 21:30:50
                    //var data = Date(date);
                    // data = Fri Jul 22 2016 16:03:15 GMT+0200 (ora legale Europa occidentale)
                    var splitData = date.split(' ');
                    var nuovaData = '\''; // + splitData[3] + '-';
                    var primaParte = splitData[0].split('/');
                    nuovaData += primaParte[2] + '-' + primaParte[1] + '-' + primaParte[0];
                    nuovaData += ' ' + splitData[1] + '\'';
                    /*nuovaData += this.getNumberOfMonth(splitData[1]) + '-';
                    nuovaData += splitData[2] + ' ';
                    nuovaData += splitData[4] + '\'';*/
                    return nuovaData;
                },

                getNumberOfMonth: function(siglaMese)
                {
                    var numMese
                    switch (siglaMese)
                    {
                        case 'Jan':
                            numMese = '01';
                            break;
                        case 'Feb':
                            numMese = '02';
                            break;
                        case 'Mar':
                            numMese = '03';
                            break;
                        case 'Apr':
                            numMese = '04';
                            break;
                        case 'May':
                            numMese = '05';
                            break;
                        case 'Jun':
                            numMese = '06';
                            break;
                        case 'Jul':
                            numMese = '07';
                            break;
                        case 'Aug':
                            numMese = '08';
                            break;
                        case 'Sep':
                            numMese = '10';
                            break;
                        case 'Oct':
                            numMese = '10';
                            break;
                        case 'Nov':
                            numMese = '11';
                            break;
                        case 'Dec':
                            numMese = '12';
                            break;
                        default: break;
                    }
                    return numMese;
                }
                  
            });

            return new classObj();
        });
