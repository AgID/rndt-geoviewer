define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/has',
  'esri/kernel',
  'esri/utils',
  'dojox/xml/parser',
  'jimu/esriIT/esriItutils',
  'esri/layers/WMSLayer',
  'jimu/esriIT/esriItutils',
  'esri/request'
],
function(declare,lang,has,kernel,utils,parser,esriItutils,WMSLayer,esriItutils,esriRequest){
		
	var GPclass = declare(null,{
		
		GPaddLayerFromUrl: function(that,url,titleLyr,infoTypeLyr){
			that.map.infoWindow.hide();
			var positionRestService = url.indexOf('rest/services');
			if(positionRestService!=-1){
				var fullname = url.substring(positionRestService+14);
			}else{
				var fullname = url;
			}
			
			var fullnameSplit = fullname.split('/');
			var name = '';
			var typeService = null;
			if(infoTypeLyr=='wms'){
				typeService = 'WMSServer';
				name = fullnameSplit[fullnameSplit.join('|').toLowerCase().split('|').indexOf('wmsserver')-1];
				if(url.indexOf('rest/services')!=-1 && url.indexOf('WMSServer')==-1){
					url = url.replace('rest/services','services').replace('?','');
					url += "/WMSServer";					
				}
			} else {
				if(fullname.indexOf('MapServer')!=-1 && (fullnameSplit[fullnameSplit.length-1]== 'MapServer' )){
					typeService = 'MapServer';
					name = fullnameSplit[fullnameSplit.join('|').toLowerCase().split('|').indexOf('mapserver')-1];
				}else if(fullname.indexOf('ImageServer')!=-1){
					typeService = 'ImageServer';
					name = fullnameSplit[fullnameSplit.join('|').toLowerCase().split('|').indexOf('imageserver')-1];
				}else if(fullname.indexOf('FeatureServer')!=-1){
					typeService = 'FeatureServer';
					name = fullnameSplit[fullnameSplit.join('|').toLowerCase().split('|').indexOf('featureserver')-1];
				}else if(fullname.indexOf('WMSServer')!=-1 || fullname.indexOf('InspireView')!=-1){
					typeService = 'WMSServer';
					if(url.toLowerCase().indexOf('arcgis')!=-1){
						name = fullnameSplit[fullnameSplit.join('|').toLowerCase().split('|').indexOf('mapserver')-1];				
					}else{
						name = fullnameSplit[fullnameSplit.join('|').toLowerCase().split('|').indexOf('wmsserver')-1];
					}
				}
			}
			this.GPaddLayerFromUrlWithServiceType(that,url,typeService,name,titleLyr);
		},	
		
		GPaddLayerFromUrlWithServiceType: function(that,url,typeService,serviceName,titleLyr){
			//var that = this;
			var standardService = false;
			var lyrGPName = ""; //"GP_Service-";
			
			var handlerServiziAggiuntivi = dojo.connect(that.map,'onLayersAddResult',function(results){
				dojo.disconnect(handlerServiziAggiuntivi);
				var layerdata = new Array();				
				esri.show(that.loadingBarMapService);
				var layerInfo = new Array();
			});
			
			if(typeService == 'WMSServer'){			
				var urlDefault = url;
				if(url.indexOf('request=GetCapabilities')==-1){
					if(url.indexOf('?')!=-1){
						url += '&request=GetCapabilities&service=WMS'
					}else{
						url += '?request=GetCapabilities&service=WMS'
					}
				} else {
					if(url.indexOf('service=WMS')==-1){
						url += '&service=WMS';						
					} 
					urlDefault = url.substr(0,(url.indexOf('request=')-1));
				}
				
				var requestHandle = esriRequest({
					url: url,
					callbackParamName: "callback",
					handleAs: 'xml',
					timeout: 10000,
					load: function(response, ioArgs) {
						if (response == null) {
							if (window.DOMParser) {
								parser=new DOMParser();
								response=parser.parseFromString(ioArgs.xhr.response,"text/xml");
							} else {// Internet Explorer
								response=new ActiveXObject("Microsoft.XMLDOM");
								response.async=false;
								response.loadXML(ioArgs.xhr.response); 
							}
						}
						var version = '';
						for (var i = 0; i < response.childNodes.length; i++) {
							if (response.childNodes[i].attributes != null) {
								version = esriItutils.getAttribute(response.childNodes[i],'version');
							}
						}
						var name = esriItutils.getValue("Layer > Title", response);	
						if(version==null){version = '1.3.0';}
						var option = {
							version: version,
							format: 'image/png',
							visible: true
						};						
						var wmsLayer = new WMSLayer(urlDefault,option);
						wmsLayer.typeservice = 'wms';
						wmsLayer.id = name;
						var lyrInfos = new Array();

						var basexmlLayer = esriItutils.getNodes("Capability", "Layer", response);
						
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

							wmsLayer.visibleLayers.push(idx);
						});
						wmsLayer.layerInfos = lyrInfos;				
						esriItutils.addWMSLayerOnFlyTOC(that,wmsLayer);
					},
					error: function(response, ioArgs) {
						//alert('ERRORE: ' + response.message)
						esriItutils.errorMessageAlert("ERRORE", response.message);
					}
				}, {useProxy:false});

			} else if(typeService == 'MapServer') {
				standardService = true;
				var layer = new esri.layers.ArcGISDynamicMapServiceLayer(url, {
					id: lyrGPName+serviceName,
					visible: true
				});
				layer.typeservice = 'MapServer';
				//that.cntServiceLoading++;
			} else if(typeService == 'FeatureServer') {
			  standardService = true;
				//var infoTemplate = new esri.InfoTemplate("aaaaa", "${*}");
				layer = new esri.layers.FeatureLayer(url,{
					id: lyrGPName+serviceName,
					mode: esri.layers.FeatureLayer.MODE_ONDEMAND, 
					outFields: ["*"],
					//infoTemplate: infoTemplate,
					visible: true
				});
				layer.typeservice = 'FeatureServer';
				layer.statusFilter = null;
				layer.funcType = false;
				
				//that.cntServiceLoading++;
			  
			} else if(typeService == 'ImageServer') {
			  standardService = true;
			  var params = new esri.layers.ImageServiceParameters();
			  params.noData = 0;
			  var layer = new esri.layers.ArcGISImageServiceLayer(url, {
				  id: lyrGPName+serviceName,
				  opacity: 1,
				  visible: true,
				  imageServiceParameters: params
			  });
			  layer.typeservice = 'ImageServer';
			}
			
			if(standardService){
				layer.idService = lyrGPName+serviceName;
				layer.tabNameId = serviceName;
				layer.funcType = true;
				esriItutils.addOperationalLayerOnFlyTOC(that,layer,titleLyr);				
			}
		},

		clearResourse: function(url){
			url = url.replace('?','');
			url = url.replace(/&resource=/g,'');;
			url = url.replace(/resource=/g,'');
			
			return url;
		},
			
		clearTitle: function(title){
			title = title.replace('?','');
			title = title.replace(/&title=/g,'');
			title = title.replace(/title=/g,'');
			return title;
		},
	
		GPopenDataGeoPortal: function(that){
			var thatgp = this;

			var url = decodeURIComponent(location.href);
			if(url.indexOf('?')!=-1 && url.indexOf('resource=')!=-1 && url.indexOf('title=')!=-1){
			    var paramsStr = url.substr(url.indexOf('?')+1);
			    var paramList = paramsStr.split(',');
			    
			    dojo.forEach(paramList, function(item,idx){
				var split = item.split('&');
				var resource = '';
				var title = '';
				var typeService = '';
				var layerUrl = '';
				var layerTitle = '';
				
				if(split[0].indexOf('title=')!=-1){
				    title = split[0];
				    resource = split[1];
				}else{
				    resource = split[0];
				    title = split[1];
				}
				
				layerTitle = thatgp.clearTitle(title);
				
				if(resource.indexOf('agsrest:')!=-1){
				    typeService = 'MapServer';
				    url = resource.replace('agsrest:','');
				    layerUrl = thatgp.clearResourse(url);
				    
				}else if(resource.indexOf('wms:')!=-1){
				    typeService = 'WMSServer';
				    url = resource.replace('wms:','');
				    layerUrl = thatgp.clearResourse(url);
								    
				}else if(resource.indexOf('imageserver:')!=-1){
				    typeService = 'ImageServer';
				    url = resource.replace('imageserver:','');
				    layerUrl = thatgp.clearResourse(url);
				}				
				if(layerUrl!='') thatgp.GPaddLayerFromUrlWithServiceType(that,layerUrl,typeService,layerTitle);
			    });
			}
		}
	});
	
	this.fncUtility = {
			
		GPaddServiceToMap: function (that,url,titleLyr) {
			//addServiceToMap: function(url){          
			var regexS = "[\\?&]resource=([^&#]*)";
			var regex = new RegExp( regexS );
			var results = regex.exec( decodeURIComponent(url) );			
			var correctUrl = null;
			var infoTypeLyr = null;
			
			//“agsrest” per un servizio rest MapServer
			if(results[1].indexOf('agsrest:')!=-1){
				correctUrl = results[1].substr(8,results[1].length);
				infoTypeLyr = 'agsrest';
			}
			else if(results[1].indexOf('ags:')!=-1) correctUrl = results[1].substr(4,results[1].length);
			//“imageserver” per un servizio ImageServer 
			else if(results[1].indexOf('imageserver:')!=-1){
				correctUrl = results[1].substr(12,results[1].length);
			}
			//“wms” per un servizio WMS
			else if(results[1].indexOf('wms:')!=-1) {
				correctUrl = results[1].substr(4,results[1].length);
				infoTypeLyr = 'wms';
			} else {
				//alert('Tipo di servizio non gestito');
				esriItutils.errorMessageAlert("Attenzione", 'Tipo di servizio non gestito');
			} 	
			//if(correctUrl!=null && correctUrl.indexOf('arcgis/services')!=-1) correctUrl = correctUrl.replace('arcgis/services','arcgis/rest/services');
			
			var gp = new GPclass();
			
			var opLyr = that.map.itemInfo.itemData.operationalLayers;
			if(opLyr.length>0){
				for(var i in opLyr){
					if(opLyr[i].url!=correctUrl){
						if(correctUrl!=null) gp.GPaddLayerFromUrl(that,correctUrl,titleLyr,infoTypeLyr);
						break;
					} else {
						//alert('Servizio gia presente in mappa');
						esriItutils.errorMessageAlert("Attenzione", 'Tipo di servizio non gestito');
					}
				}
			} else {
				if(correctUrl!=null) gp.GPaddLayerFromUrl(that,correctUrl,titleLyr,infoTypeLyr);
			}
			
		}
	};

	return GPclass;
});
