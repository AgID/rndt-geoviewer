///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'jimu/BaseWidget',
  'esri/layers/WMSLayerInfo',
  'esri/layers/WMSLayer',
  'jimu/esriIT/WMSLayerCustom',
  'esri/request',
  'esri/arcgis/utils',
  'dojo/data/ItemFileWriteStore',
  'dojo/dom-construct',
  'dojo/dom-attr',
  'dijit/Tree',
  'dijit/tree/ForestStoreModel',
  'dijit/TitlePane',
  'dijit/form/CheckBox',
  'jimu/PanelManager',
  'jimu/esriIT/esriItutils',
  'jimu/dijit/LoadingShelter',
  'jimu/dijit/TabContainer'
],
function(declare,lang,BaseWidget,WMSLayerInfo,WMSLayer,WMSLayerCustom,esriRequest,agolUtils,ItemFileWriteStore,domConstruct,domAttr,Tree,ForestStoreModel,TitlePane,CheckBox,PanelManager,esriItutils,LoadingShelter,TabContainer) {

  return declare([BaseWidget], {
    //these two properties is defined in the BaseWidget
    baseClass: 'jimu-widget-search',
    name: 'AddServiceOnFly',
	id: 'AddServiceOnFlyWidget',
	cntLayerAdd: 0,
	timeoutValue: 10000,  //10s timeout for esriRequest calls
	parameter: null,
	urlTask: null,
	printInfo: null,
	floatingPane: null,
	map: null,
	serviziCartella: null,
	statusDebug: null,
	wmslayer: null,
	layer: [],
	handlerOnLayerAdd: null,
	operWMSlayer: null,
	
    startup: function(){
      this.inherited(arguments);
      this._initTabContainer();
      this.loading = new LoadingShelter();
      this.loading.placeAt(this.map.root);
      this.loading.hide();
      
      that = this;

      //*****CONNECT FUNCTIONS TO HTML DIVS*****
      this.handleCatalogoUrlSelect(that);
      //link function to "AddServiceOnFly_InputCatalogo_img"
      /*that.myObject1 = {
	      id: "1",
	      onClick: function(){
		      that.getCatalogo();	}
      };		
      dojo.connect( dojo.byId("AddServiceOnFly_InputCatalogo_img"), "onclick", that.myObject1.onClick);*/	  

      //link function to "AddServiceOnFly_SelectServiziForInput_img"
      that.myObject2 = {
	      id: "myObject2",
	      onClick: function(){
		that.getServices();
	      }
      };		
      dojo.connect( dojo.byId("AddServiceOnFly_SelectServiziForInput_img"), "onclick", that.myObject2.onClick);	  

      //link function to "AddServiceOnFly_WMSInput_img"
      dojo.connect( dojo.byId("AddServiceOnFly_WMSInput_img"), "onclick", that.myObject2.onClick);	  
      //link function to "radioButton"
      that.myObject3 = {
	      id: "myObject3",
	      onChangeCatalog: function(){
		      that.onChangeCatalogRadioButton();	},
	      onChangeService: function(){
		      that.onChangeServiceRadioButton();	}
      };		
      dojo.connect( dojo.byId("catRadio"), "onchange", that.myObject3.onChangeCatalog);	  
      dojo.connect( dojo.byId("servRadio"), "onchange", that.myObject3.onChangeService);	  

      //link function to "AddServiceOnFly_AGOLInput_img"
      that.myObject4 = {
	      id: "myObject4",
	      onClick: function(){
		      that.getWebMap();}
      };		
      dojo.connect( dojo.byId("AddServiceOnFly_AGOLInput_img"), "onclick", that.myObject4.onClick);	  

    },

    onOpen: function(){
      // summary:
      //    see description in the BaseWidget
      // description:
    },

    onClose: function(){
      // summary:
      //    see description in the BaseWidget
    },

    onMinimize: function(){
      this.resize();
    },

    onMaximize: function(){
      this.resize();
    },

    resize: function(){
    },

    destroy: function(){
    },

    getCatalogo: function (){
      var that = this;
      var proxy = false;
      this.urlTask = (dojo.byId('AddServiceOnFly_InputCatalogo').value).trim();
      if(this.urlTask!='-1'){
	var validUrl = this.urlTask //this.validateURL(this.urlTask);
	if(!validUrl){
	  var err_msg = this.urlTask + '<br>' + that.nls.ERROR_MSG_UNCORRECT_URL;
	  esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,600,200);		
	  this.urlTask = null;
	}else{
	  this.urlTask = validUrl;
	  if(dojo.byId('AddServiceOnFly_NoteMessage').innerHTML!=""){dojo.byId('AddServiceOnFly_NoteMessage').innerHTML = "";}
	  var requestHandle = esriRequest({
		    url: validUrl,
		    content: {f:'json'},
		    callbackParamName: "callback",
		    timeout: that.timeoutValue,
		    handleAs: 'json',
		    load: function(response, ioArgs) {
			  that.handleCatalogoInfo(that,response,ioArgs);
		    },
		    error: function(response, ioArgs) {
			  that.handleCatalogoFailed(that,response,ioArgs,url);
		    }
	    }, {useProxy:false});
	}
      } 
    },
    
    cleanSelect: function(){	
      dojo.byId("AddServiceOnFly_SelectCartelle").innerHTML = '<option value="-1">-</option>';		
      dojo.byId("AddServiceOnFly_SelectCartelle").disabled = true;		
      dojo.byId("AddServiceOnFly_SelectServizi").innerHTML = '<option value="-1">-</option>';		
      dojo.byId("AddServiceOnFly_SelectServizi").disabled = true;
    },
    
    handleCatalogoUrlSelect: function(that){
      var selectCatalogo = dojo.byId('AddServiceOnFly_InputCatalogo');
      
      //selectCatalogo.innerHTML = '';
      //dojo.create("option", { innerHTML: this.nls.TOOL_ADDSERVICEONFLY_36, value:"-1" }, selectCatalogo);		
      
      dojo.forEach(this.config.catalogs, function(item,idx){
	      dojo.create("option", { innerHTML: item.name, value: item.url }, selectCatalogo);
      });
      
      selectCatalogo.onchange = function(){
	that.cleanSelect();
	that.getCatalogo();
	//selectCatalogo.innerHTML = this.selectedOptions[0].label;
      }
    },
    
    handleCatalogoInfo: function(that,response,ioArgs){		
	var selectCartelle = dojo.byId('AddServiceOnFly_SelectCartelle');
	
	selectCartelle.innerHTML = '';
	dojo.create("option", { innerHTML: that.nls.TOOL_ADDSERVICEONFLY_11, value:"-1" }, selectCartelle);
	//dojo.create("option", { innerHTML: ".\\", value:"root" }, selectCartelle);
	
	dojo.forEach(response.folders, function(item,idx){
		var html = item.replace(/-/g,' ');
		html = html.replace(/_/g,' ');
		dojo.create("option", { innerHTML: html.charAt(0).toUpperCase() + html.slice(1), value: item }, selectCartelle);
	});
	
	selectCartelle.onchange = function(){
		esri.show(that.imgLoader);
		var cartella = this.value;
		if(cartella != -1 && cartella != '.\\'){
			var requestHandle = esriRequest({
				url: that.urlTask+'/'+cartella,
				content: {f:'json'},
				callbackParamName: "callback",
				handleAs: 'json',
				timeout: that.timeoutValue,
				load: function(response, ioArgs) {
					that.handleServizi(that,response,ioArgs);
				},
				error: function(response, ioArgs) {
					that.handleServiziFailed(that,response,ioArgs);
				}
			}, {useProxy:false});
		}else{
			dojo.byId('AddServiceOnFly_SelectServizi').innerHTML = '-';
			dojo.byId('AddServiceOnFly_SelectServizi').disabled = true;
		}
	};
	selectCartelle.disabled = false;

	var selectTypeFilter = dojo.byId('AddServiceOnFly_SelectServiziForInput');
	selectTypeFilter.onchange = function(){
		var cartella = dojo.byId('AddServiceOnFly_SelectCartelle').value;
		var requestHandle = esriRequest({
			url: that.urlTask+'/'+cartella,
			content: {f:'json'},
			callbackParamName: "callback",
			handleAs: 'json',
			timeout: that.timeoutValue,
			load: function(response, ioArgs) {
				that.handleServizi(that,response,ioArgs);
			},
			error: function(response, ioArgs) {
				that.handleServiziFailed(that,response,ioArgs,url);
			}
		}, {useProxy:false});
	};
    },
    
    handleCatalogoFailed: function(that,response,ioArgs,url){
	    
	    switch(ioArgs.xhr.status){
		    case 404:
			    var err_msg = url + '<br>' + that.nls.TOOL_ADDSERVICEONFLY_12;
		    break;
		    case 500:
			    var err_msg = url + '<br>' + that.nls.TOOL_ADDSERVICEONFLY_13;
		    break;
		    case 407:
			    var err_msg = url + '<br>' + that.nls.TOOL_ADDSERVICEONFLY_14;
		    break;
		    default:
			    var err_msg = url + '<br>' + that.nls.TOOL_ADDSERVICEONFLY_9;
		    break;
	    };
	    esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,600,200);		
    },
    
    handleServizi: function(that,response,ioArgs){
	    var selectServizi = dojo.byId('AddServiceOnFly_SelectServizi');
	    dojo.byId('AddServiceOnFly_InfoServizio').style.display = 'none';
	    selectServizi.innerHTML = '';
	    //dojo.byId("AddServiceOnFly_ButtonAdd").innerHTML = '';
	    dojo.create("option", { innerHTML: that.nls.TOOL_ADDSERVICEONFLY_15, value:"-1" }, selectServizi);
	    var contatore = 0;
	    dojo.forEach(response.services,function(item,idx){
		    var name = item.name;
		    var type = item.type;
		    var split = name.split('/');
		    var correctName = split[split.length-1];
		    var html = correctName.replace(/-/g,' ');
		    var typeFilter = dojo.byId('AddServiceOnFly_SelectServiziForInput').value;
		    html = correctName.replace(/_/g,' ');
		    if(type==typeFilter || typeFilter=="Nessun Filtro"){
			    dojo.create("option", { innerHTML: html.charAt(0).toUpperCase() + html.slice(1) + ' ('+type+')', value: that.urlTask+'/'+name+'/'+type }, selectServizi);
			    contatore++;
		    }
	    });
	    
	    that = this;
	    selectServizi.onchange = function(){
		    var servizio = this.value;
		    esri.show(that.imgLoader);
		    if(this.value!=-1){
			    var splitServizio = servizio.split('/');
			    var urlServizio = servizio;
			    var typeService = splitServizio[splitServizio.length-1];
			    
			    dojo.byId('AddServiceOnFly_InputUrl').value = urlServizio;
			    that.getServices();
		    }else{
			    dojo.byId('AddServiceOnFly_InfoServizio').style.display = 'none';
		    }
		    
	    };
	    selectServizi.disabled = false;
    },
    
    handleServiziFailed: function(that,response,ioArgs,userUrl){
	    if(that.statusDebug){console.log(response);}
	    var err_msg = userUrl + '<br>' + that.nls.ERROR_MSG_UNSUCCESSFUL_ESRI_REQUEST;
	    esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,600,200);		
    },
    
    handleServiziInfo: function(that,response,ioArgs,urlServizio,typeService){
	    if(that.statusDebug){console.log(response);}
	    dojo.byId('AddServiceOnFly_InfoServizio').innerHTML = '';
	    //dojo.byId('AddServiceOnFly_ButtonAdd').innerHTML = '';
	    dojo.byId('AddServiceOnFly_InfoServizio').style.display = 'block';
	    var html =  '<div class="AddServiceOnFly-ContainerResult">';
	    var servizioOK = false;
	    
	    html += '<hr style="border-top: dotted 3px;" />'				
	    switch(typeService){
		    case 'MapServer':
			    servizioOK = true;
			    if(response.spatialReference.wkid){
	    /*			if(response.spatialReference.wkid != JsViewer.System.spatialReferenceRoot.wkid){
				      var html = dojo.create('u',{innerHTML:response.spatialReference.wkid}).outerHTML;
				      html += dojo.create('font',{color:'red', innerHTML: '(Root Basemap: '+JsViewer.System.spatialReferenceRoot.wkid+')'}).outerHTML;
				      
					    var sRef = dojo.create('span',{innerHTML: html});
				    }else{
	    */				var sRef = response.spatialReference.wkid;
	    /*			}
	    */
			    }else{
				    var sRef = '<span id="AddServiceOnFlyTooltipPROJ">PROJ</span>';
			    }
			    var resp = response.singleFusedMapCache == "true"? that.nls.TOOL_ADDSERVICEONFLY_28 : that.nls.TOOL_ADDSERVICEONFLY_29;
			    var geo = (sRef == "4326" || sRef == "102100")? sRef + " - WGS84" : sRef;
			    html += '<div>'+
						    '<legend>'+
							    '<div><div><b>'+that.nls.TOOL_ADDSERVICEONFLY_20+':</b>&nbsp;'+typeService+'</div></div>'+
							    '<div><div><b>'+that.nls.TOOL_ADDSERVICEONFLY_17+':</b>&nbsp;'+response.capabilities+'</div></div>'+
							    '<div><div><b>'+that.nls.TOOL_ADDSERVICEONFLY_18+':</b>&nbsp;'+resp+'</div></div>'+
							    '<div><div><b>'+that.nls.TOOL_ADDSERVICEONFLY_19+':</b>&nbsp;'+geo+'</div></div>'+
							    '<div><div><b>'+that.nls.TOOL_ADDSERVICEONFLY_16+':</b></div><div>'+response.description+'</div></div>'+
						    '</legend>'+
					    '</div>';
					    
			    html += '<div class="AddServiceOnFly-RadioButtonDiv">';
				    var checked;
				    if(response.singleFusedMapCache){
					    checked = '';
					    html += '<input type="radio" name="AddServiceOnFly_RadioButton" value="0" checked="checked" />&nbsp; Tyled &nbsp;';
				    }else{
					    checked = 'checked="checked"';
				    }
				    html += '<input type="radio" name="AddServiceOnFly_RadioButton" value="1" '+checked+' />&nbsp; Dynamic &nbsp;';
			    html += '</div>';
			    
		    break;
		    case 'FeatureServer':
		    case 'ImageServer':
			    servizioOK = true;
			    html += '<div>'+
						    '<legend>'+
							    '<div><div><b>'+that.nls.TOOL_ADDSERVICEONFLY_20+'</b>&nbsp;'+typeService+'</div></div>'+
						    '</legend>'+
					    '</div>';
		    break;
		    default:
		      html += dojo.create('div',{innerHTML: dojo.create('center',{innerHTML:dojo.create('font',{color:'red',innerHTML:that.nls.TOOL_ADDSERVICEONFLY_21}).outerHTML}).outerHTML}).outerHTML;
			    
		    break;
	    };	
	    html += '<hr style="border-top: dotted 3px;" />'				
	    html += '</div>';
	    dojo.place(html,dojo.byId('AddServiceOnFly_InfoServizio'),'last');
	    
	    if(servizioOK){
		    var button = new dijit.form.Button({
			    label: that.nls.TOOL_ADDSERVICEONFLY_10,
			    onClick: function(){
				    that.addService(that);
			    }
		    },dojo.create('div'));
		    dojo.place(button.domNode,"AddServiceOnFly_ButtonAdd",'only');
	    }
	    if(response.spatialReference && !response.spatialReference.wkid){
		    new dijit.Tooltip({ connectId: ["AddServiceOnFlyTooltipPROJ"], label: '<span>'+response.spatialReference.wkt+'</span>', style:'width: 400px;' });
	    }
    },
    
    handleServiziInfoFailed: function(that,response,ioArgs,userUrl){
	    if(that.statusDebug){console.log(response);}
	    var err_msg = userUrl + '<br>' + that.nls.ERROR_MSG_UNSUCCESSFUL_ESRI_REQUEST;
	    esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,600,200);
    },
    
    addService: function(that){
	    var layerName = null;
	    var check = 0;
	    
	    var urlService = dojo.byId('AddServiceOnFly_InputUrl').value;
	    if(urlService[urlService.length-1]=='/'){
		    urlService = urlService.substring(0,urlService.length-1);
	    }
	    layerName =  urlService.split("/")[urlService.split("/").length-2];
	    var validTypes = ["MapServer","FeatureServer","ImageServer"];
	    var typeService;
	    for(var j=0;j<validTypes.length;j++){
		    if(this.checkServicesURLwrtType(urlService,validTypes[j])) typeService = validTypes[j];
	    }
	    if(that.statusDebug){console.log('Servizio In Aggiunta: [Tipo]'+typeService+' - [Url]:'+urlService);}
	    
	    switch(typeService){
		    case 'MapServer':
			    var radioButton = dojo.query("[name = AddServiceOnFly_RadioButton]");
			    urlService = urlService.substr(0,urlService.indexOf('MapServer')+9);
			    dojo.forEach(radioButton,function(item,idx){
				    if(item.checked){
					    switch(parseInt(item.value)){
						    case 0:
							    that.layer.push( new esri.layers.ArcGISTiledMapServiceLayer(urlService, {
								    id: layerName,
								    visible: true
							    }) );
						    break;
						    case 1:
							    that.layer.push( new esri.layers.ArcGISDynamicMapServiceLayer(urlService, {
								    id: layerName,
								    visible: true
							    }) );
						    break;
					    }
				    }
			    });
			    
			    check++;
		    break;
		    case 'FeatureServer':
			    if(layerName == "FeatureServer") {  //case of single feature layer: .../FeatureServer/i
				    layerName = urlService.split("/")[urlService.split("/").length-3]+"-"+urlService.split("/")[urlService.split("/").length-1];
				    var template = new esri.InfoTemplate();
				    that.layer.push( new esri.layers.FeatureLayer(urlService,{
					    id: layerName,
					    mode: esri.layers.FeatureLayer.MODE_ONDEMAND, 
					    outFields: ["*"],
					    visible: true,
					    infoTemplate: template 
				    }) );							
			    } else {  //case of feature layer folder: .../FeatureServer
				    var requestHandle = esriRequest({
					    url: urlService,
					    content: {f:'json'},
					    callbackParamName: "callback",
					    handleAs: 'json',
					    timeout: that.timeoutValue
				    },{useProxy:true});
				    requestHandle.then( function(response, ioArgs) {
					    dojo.forEach(response.layers, function(item, idx){
						    var template = new esri.InfoTemplate();
						    that.layer.push( new esri.layers.FeatureLayer(urlService+"/"+idx.toString(),{
							    id: urlService.split("/")[urlService.split("/").length-2] + " - " + item.name,
							    mode: esri.layers.FeatureLayer.MODE_ONDEMAND, 
							    outFields: ["*"],
							    visible: true,
							    infoTemplate: template 
						    }) );
					    });
					    that.addServiceAndCleanup(that,that.layer,urlService,typeService);
					    return
				    });
			    } 
			    check++;
		    break;
		    case 'ImageServer':
			    var params = new esri.layers.ImageServiceParameters();
			    params.noData = 0;
			    that.layer.push( new esri.layers.ArcGISImageServiceLayer(urlService, {
				    id: layerName,
				    opacity: 1,
				    visible: true,
				    imageServiceParameters: params
			    }) );
			    check++;
		    break;
	    }
	    if(check>0) {
		    this.addServiceAndCleanup(that,that.layer,urlService,typeService)
	    }else{
		    if(that.statusDebug){console.log("Servizio non supportato");}
	    }
    },
    
    addServiceAndCleanup: function(that, layer, urlService, typeService) {	
	    for(var i=0;i<that.layer.length;i++){
		    that.layer[i].idService = "AddServiceOnFly_"+that.cntLayerAdd;
		    var positionRestService = urlService.indexOf('rest/services');
		    that.layer[i].tabNameId = urlService.substring(positionRestService+14);
		    that.layer[i].typeservice = typeService;
		    if(that.statusDebug){console.log("Aggiunta servizio"+that.layer[i].id);}
		    
		    //connect loading image to events: onLayerAdd and onUpdate
		    this.connectLayerEventsToLoader(that.layer[i]);
		    that.cntLayerAdd++;						
	    
		    //CODE for ADDING LAYER TO MAP AND ESRI TOC//
		    esriItutils.addOperationalLayerOnFlyTOC(that, that.layer[i], that.layer[i].id); 
	    }
	    
	    //clean up and close panel
	    that.layer = [];
	    //dojo.byId("AddServiceOnFly_InputCatalogo").value = "";		
	    //dojo.byId("AddServiceOnFly_SelectCartelle").innerHTML = '<option value="-1">-</option>';		
	    //dojo.byId("AddServiceOnFly_SelectCartelle").disabled = true;		
	    //dojo.byId("AddServiceOnFly_SelectServizi").innerHTML = '<option value="-1">-</option>';		
	    //dojo.byId("AddServiceOnFly_SelectServizi").disabled = true;		
	    dojo.byId("AddServiceOnFly_InputUrl").value = "";		
	    dojo.byId("AddServiceOnFly_InfoServizio").innerHTML = "";		
	    dojo.byId("AddServiceOnFly_ButtonAdd").innerHTML = "";		
	    var panelController = PanelManager.getInstance();
	    panelController.closePanel(panelController.panels[0]);
    },	
    
    validateURL: function (s) {
	    s = s.toLowerCase();
	    var checkHttp = s.indexOf('http');
	    if(s.indexOf('/rest/services')==-1) {
		    if(s.substr(s.length-5,s.length) == '/rest') {
			    s = s.replace('/rest','/rest/services');  //handle case URL contains /rest but not /services
		    } else if(s.substr(s.length-9,s.length) == '/services') {
			    s = s.replace('/services','/rest/services');  //handle case URL contains /services but not /services		
		    } else {
			    if(s[s.length-1]=='/') s = s.substring(0,s.length-1);
			    s += "/rest/services";  //all URLs have to terminate with /rest/services				
		    }
	    }
	    var checkFjson = s.indexOf('f=json');
	    if(checkFjson!=-1){
	      s = s.replace('?f=json','');
	    }
	    var pRestService = s.indexOf('rest/services');
	    if(s.length>(pRestService+13)){
	      s = s.substring(0,(pRestService+13));
	    }
	    
	    if(checkHttp!=-1 && s.split("http:").length<=2){
		    dojo.byId('AddServiceOnFly_InputCatalogo').value = s;
		    return s;
	    }else{
		    return false;
	    }
    },
    
    getServices: function(){
	    var that = this;
	    var typeService;
	    if(dijit.byId("tabContainer").controlNodes[1].attributes[0].textContent.split("-").indexOf("selected")!=-1){
		    var userUrl = dojo.byId('AddServiceOnFly_WMSInputUrl').value;
		    if(this.checkServicesURLwrtType(userUrl,"WMSServer")) typeService = "WMSServer";
		    //handle specific case of trying to add invalid Services Types which have "wms" in their path
		    var invalidTypes = ["WFS","WCS","WPS"];
		    for(var j=0;j<invalidTypes.length;j++){
			    if(this.checkServicesURLwrtType(userUrl.toUpperCase(),invalidTypes[j])) typeService = undefined;
		    }
	    } else {
		    var userUrl = dojo.byId('AddServiceOnFly_InputUrl').value;
		    var validTypes = ["MapServer","FeatureServer","ImageServer"];
		    for(var j=0;j<validTypes.length;j++){
			    if(this.checkServicesURLwrtType(userUrl,validTypes[j])) typeService = validTypes[j];
		    }
	    }
	    //handle error in userUrl
	    if(!typeService){
		    var err_msg = userUrl + '<br>' + that.nls.ERROR_MSG_UNCORRECT_URL;
		    esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,600,200);
		    return;
	    }
	    
	    var url = userUrl;
	    if(url[url.length-1]=='/'){
		    url = url.substring(0,url.length-1);
	    }
	    
	    //handle specific case of trying to add single child layers of Map Service
	    if(typeService == "MapServer" && url.split("/")[url.split("/").length-1] != "MapServer"){
		    var err_msg = userUrl + '<br>' + that.nls.ERROR_MSG_MAPSERVER_CHILD;
		    esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,600,200);
		    return;
	    }
	    
	    //CASE OF WMS SERVICES - TAB2
	    if(typeService=='WMSServer'){
		    if(url.indexOf('request=GetCapabilities')==-1){
			     if(url.indexOf('?')!=-1){
				    url += '&request=GetCapabilities&service=WMS'
			     }else{
				    url += '?request=GetCapabilities&service=WMS'
				    }
		    }
		    var requestHandle = esriRequest({
			    url: url,
			    callbackParamName: "callback",
			    handleAs: 'xml',
			    timeout: that.timeoutValue,
			    load: function(response, ioArgs) {
				    that.handleWMSGetCapabilitiesRequest(response, ioArgs,userUrl);
			    },
			    error: function(response, ioArgs) {
				    that.handleServiziInfoFailed(that,response,ioArgs,userUrl);
			    }
		    }, {useProxy:false});
	    }
	    //CASE OF ESRI ARCGIS SERVICES - TAB1
	    else {
		    var requestHandle = esriRequest({
			    url: url,
			    content: {f:'json'},
			    callbackParamName: "callback",
			    handleAs: 'json',
			    timeout: that.timeoutValue,
			    load: function(response, ioArgs) {
				    that.handleServiziInfo(that,response,ioArgs,url,typeService);
			    },
			    error: function(response, ioArgs) {
				    that.handleServiziInfoFailed(that,response,ioArgs,userUrl);
			    }
		    }, {useProxy:false});
	    }

    },

    handleWMSGetCapabilitiesRequest: function(response, ioArgs,userUrl){
        var that = this;
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
	    var name = esriItutils.getValue("Service > Title", response);	
	    if(version==null){version = '1.3.0';}
	    var option = {
		    version: version,
		    format: 'image/png',
		    visible: true
	    };						
	    var wmslayer = new WMSLayerCustom(userUrl,option);
	    wmslayer.typeservice = 'wms';

        var idServiceWMS = name ? "Service-"+name.replace(/ /g, "")+'-'+that.cntLayerAdd : 'AggiungiServizio-'+that.cntLayerAdd;

        /*wmslayer.idService = "AddServiceOnFly_"+that.cntLayerAdd;
         wmslayer.tabNameId = name ? name.replace(/ /g, "")+'-'+that.cntLayerAdd : 'AggiungiServizio-'+that.cntLayerAdd;
         wmslayer.id = "AddServiceOnFly_"+wmslayer.tabNameId;*/

        wmslayer.idService = idServiceWMS;
        wmslayer.tabNameId = idServiceWMS;
        wmslayer.id = idServiceWMS;

	    var lyrInfos = new Array();
	    // HTML parsing for BaseLayer CRS property retrieving
	    var basexmlLayer = esriItutils.getNodes("Capability", "Layer", response);
	    var nodeCRS = new Array();				
	    for (var k = 0; k < basexmlLayer[0].childNodes.length; k++) {
		    if (basexmlLayer[0].childNodes[k].nodeName=="CRS") {
			    nodeCRS.push( basexmlLayer[0].childNodes[k].textContent );
		    }
	    }
	    var equivalentCRSList = ["EPSG:900913","EPSG:3785","EPSG:3587","EPSG:3857"];
	    for( i=0; i < nodeCRS.length; i++ ){
		    for( j=0; j < equivalentCRSList.length; j++ ){
			    if( nodeCRS[i] == equivalentCRSList[j] ) wmslayer.myCRS = nodeCRS[i];
		    }
	    }												
	    // HTML parsing for layers properties retrieving
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
			    if (lyr.childNodes[k].nodeName=="Style") {
				    for (var z = 0; z < lyr.childNodes[k].childNodes.length; z++) {
					    if (lyr.childNodes[k].childNodes[z].nodeName=="Name") {
						    nodestyles.push( lyr.childNodes[k].childNodes[z].textContent );
					    }
				    }
			    }
			    if(idx == 0){
				    if (lyr.childNodes[k].nodeName=="CRS") {
					    nodeCRS.push( lyr.childNodes[k].textContent );
				    }
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
		    wmslayer.pushStyle(nodestyles);
		    wmslayer.addSelectedLayerStyle(nodename, nodestyles[0]);
		    wmslayer.visibleLayers.push(idx);
	    });
	    wmslayer.layerInfos = lyrInfos;				
	    wmslayer.declaredClass = "WMSLayerCustom";
        wmslayer = wmslayer.addResource(wmslayer,that.map);

	    that.createWMSInspectionPanel( that, wmslayer, "AddServiceOnFly_WMSInfoServizio" );
    },
				    
    addWMSonTOCandCleanupPanel: function( that, wmslayer ){

        var layer = wmslayer;
        var visible = dojo.clone(layer.visibleLayers);
        var layerInfos = dojo.clone(layer.layerInfos);
        var id = dojo.clone(layer.id);

        var arrayLayer = new Array();

        if(visible.length >0){
            for(var i=0;i<visible.length;i++){
                arrayLayer.push(new WMSLayerInfo({
                    name: visible[i],
                    title: layerInfos[i].title
                }))
            }
        }

        var resourceInfo = {
            extent: map.extent,
            layerInfos: arrayLayer
        };

        layer = new WMSLayer(layer.url, {
            resourceInfo: resourceInfo,
            visibleLayers: visible
        });

        layer.id = id;

        that.map.addLayers([layer]);

	    //esriItutils.addWMSLayerOnFlyTOC( that, wmslayer );
	    that.cntLayerAdd++;						
	    //clean up and close panel
	    that.operWMSlayer = null;
	    dojo.byId("AddServiceOnFly_WMSInputUrl").value = "";		
	    var treeToBeCleaned = dijit.byId("treeDiv-WMSInspect")
	    treeToBeCleaned.destroy();		
	    var buttonToBeCleaned = dijit.byId("addWMSButtonDiv")
	    buttonToBeCleaned.destroy();
	    var panelController = PanelManager.getInstance();
	    panelController.closePanel(panelController.panels[0]);		
    },
       
    createWMSInspectionPanel: function(that,wmslayer,paneldiv){


	    //dojo.byId("AddServiceOnFly_WMSInputUrl").value = "";
	    if(dijit.byId("treeDiv-WMSInspect")){
	    var treeToBeCleaned = dijit.byId("treeDiv-WMSInspect")
	    treeToBeCleaned.destroy();		
	    var buttonToBeCleaned = dijit.byId("addWMSButtonDiv")
	    buttonToBeCleaned.destroy();
	    }
	    //create TOC Tree	
	    var idService = wmslayer.idService;
	    var children = new Array();	
	    var listOfLayer = esriItutils.arrayListOfLayer(wmslayer);
	    wmslayer.mylayerInfos = listOfLayer;
	    var listOfStyles = wmslayer.myStyleList;
	    var storeItem = new Array();
	    
	    that.operWMSlayer = wmslayer;
	    //****************************************************************
	    count = 0;
	    dojo.forEach(listOfLayer,function(itemOfList,indexList){
	      count = count + 1;
	      var idStore = 'treeItemId'+'-'+count;
	      var chkId = idService+'-chk-'+itemOfList.id;
	      var chkName = idService+'-chk';  
	      if(itemOfList){		
		    if(itemOfList.parent == -1){
			    storeItem[indexList] = {id: idStore,
									    name: itemOfList.layerName,
									    type: 'mainLayer',
									    style: listOfStyles[indexList],
									    isParent: itemOfList.hasChildren,
									    chkId: chkId,											
									    chkName: chkName,
									    chkChecked: itemOfList.defaultVisibility ? itemOfList.defaultVisibility : false,
									    chkDisabled: false,
									    chkValue: (wmslayer.id+ '|' +itemOfList.id + '|'+itemOfList.parent+'|'+itemOfList.hasChildren),
									    layerId: wmslayer.id,
									    layerMaxScale: itemOfList.maxScale,
									    layerMinScale: itemOfList.minScale,
									    layerType: itemOfList.layerType
			    };	
		    }else{	  
			    storeItem[indexList] = {id: idStore,
									    name: itemOfList.layerName,
									    type: 'layer',
									    style: listOfStyles[indexList],
									    isParent: itemOfList.hasChildren,										
									    chkId: chkId,
									    chkName: chkName,
									    chkChecked: itemOfList.defaultVisibility,
									    chkDisabled: false,
									    chkValue: (wmslayer.id+ '|' + itemOfList.id+'|'+itemOfList.parent+'|'+itemOfList.hasChildren),
									    layerId: wmslayer.id,
									    layerMaxScale: itemOfList.maxScale,
									    layerMinScale: itemOfList.minScale,
									    layerType: itemOfList.layerType
			    };
			    if(storeItem[itemOfList.parent].children && storeItem[itemOfList.parent].children.length > 0){
				    storeItem[itemOfList.parent].children.push({_reference:idStore});
			    }else{
			       storeItem[itemOfList.parent].children = new Array({_reference:idStore});
			    }
		    }
	      }
	    });	    
	    /******* CREATION of WMS INSPECTION TREE *********/  
	    var store = new ItemFileWriteStore({data: {
										      identifier: 'id',
										      label: 'name',
										      items: storeItem
	    }});
	    var treeModel = new ForestStoreModel({
		    store: store,
		    query: {
			    "type": "mainLayer"
		    },
		    rootId: "root",
		    rootLabel: wmslayer.tabNameId,
		    childrenAttrs: ["children"]
	    });
	    
	    var tocTree = new Tree({
		    idService: idService,
		    persist: false,
		    autoExpand: true,
		    openOnClick: false,
		    model: treeModel,
		    showRoot: true,
		    getIconClass: function( item,  opened){
			    if(item == this.model.root){
			      return (opened ? "customFolderOpenedIconRoot" : "customFolderClosedIconRoot");
			    }else{
			      return (!item || this.model.mayHaveChildren(item)) ? (opened ? "customFolderOpenedIcon" : "customFolderClosedIcon") : "customFolderLayer"
			    }
		    },
		    _createTreeNode: function(args){
			    var tnode = new dijit._TreeNode(args);	
			    if((args.item.id=='root')||((args.item.type=='mainLayer')&&(args.item.isParent=="true"))){				  
			      tnode.labelNode.innerHTML = '<span>'+ args.label + '</span>'+
											    '<span class="treeNodeImg" >'+
											    '</span>'
			    }else{
				    if(args.item.style[0] != undefined){
				    tnode.labelNode.innerHTML = '<span>'+ args.label + '</span>'+
											    '<span class="treeNodeImg" >'+
											      '<img id="divStyle|'+args.item.chkValue+'|'+args.item.type+'|'+args.item.id+'" src="./widgets/AddServiceOnFly/images/layer_style.png" width="20" height="20" onclick="that.generateStylePanel(this);"/>'+
											    '</span>';
				    }else{
				    tnode.labelNode.innerHTML = '<span>'+ args.label + '</span>';
				    }
				    if(typeof args.item.chkName != undefined){
				      if(args.item.layerType=='WMSLayerCustom'){
					    var cba = new CheckBox({
						    name: args.item.chkName[0],
						    id: args.item.chkId[0]+'_WMSInspect',
						    checked: true,
						    value: args.item.chkValue[0],
						    reflyr: args.item,
						    onChange: function(status){ 
							    var lyrname = this.value.split("|")[1];
							    if(status==false) that.operWMSlayer.removeSelectedLayerStyle( lyrname );
							    if(status==true)  that.operWMSlayer.addSelectedLayerStyle( lyrname, this.reflyr.style[0] );
						    }
					    });
					    cba.placeAt(tnode.labelNode,"first");						
				      }
				    }
			    }
			    return tnode;
		    }				
	    }, dojo.create('div',{id:"treeDiv-WMSInspect"}));
	    dojo.place(tocTree.domNode,paneldiv,'first');
	    
	    //create ADD Button
	    var addButton = new dijit.form.Button({
		    label: this.nls.TOOL_ADDSERVICEONFLY_31,
		    onClick: function(){
			    that.addWMSonTOCandCleanupPanel( that, wmslayer );
		    }
	    },dojo.create('div',{id: "addWMSButtonDiv"}));
	    dojo.place(addButton.domNode,paneldiv,'last');

},

    generateStylePanel: function(img){	  
      var imgSplit = img.id.split('|');
      var layer = that.operWMSlayer;
      var sublayerName = imgSplit[2];
      var subLayerOrderInTree = imgSplit[6];
      var subLayerOrderNumber;
      
      //CODE FOR STYLES ASSOCIATION TO THE SUBLAYER
      var numberIndex = subLayerOrderInTree.indexOf("Id") + 3;
      if(numberIndex == subLayerOrderInTree.length - 1){
	    subLayerOrderNumber = parseInt( subLayerOrderInTree[numberIndex] ) - 1;
      }else{
	    subLayerOrderNumber = parseInt(subLayerOrderInTree.substring(numberIndex, subLayerOrderInTree.length)) - 1
      }
      var singleLyrStyles = layer.myStyleList[subLayerOrderNumber];

//	  var checkRootChecbox = imgSplit[2].indexOf('mainLayerRoot');
      var coords = dojo.coords(dojo.byId(img.id));
      var tp = new TitlePane({id:'panelStyleOption',
								    title: that.nls.SYS_STYLE_OPTION_1,
								    closable: true,
								    content: '<div id="panelStyleOptionContent"></div>',
								    baseClass: 'panelServiceOption',
//									style: 'position: absolute; z-index: 100; top: '+parseInt(coords.y)+'px; left: '+parseInt(coords.x+coords.w)+'px; '
								    style: 'position: absolute; z-index: 100; top: '+parseInt(coords.y+coords.h)+'px; left: '+parseInt(coords.x-coords.l)+'px; '
      });
      
      tp.toggle = function() {
	    if(tp.open){ tp.destroyRecursive(false); }
      };
      
      tp.placeAt(dojo.body(),"last");
      var table = dojo.create('table');  
      
      for (var k = 0; k < singleLyrStyles.length; k++){
	      var html = '<tr onclick="that.addStyleToSelectedList(\''+singleLyrStyles[k]+'\',\''+sublayerName+'\')">'+
				    '<td >'+'<img src="./widgets/AddServiceOnFly/images/layer_style.png" border=0 width="20px" height="20px" class="panelServiceOption"/>'+'</td>'+
				    '<td ><span class="panelServiceOption">'+singleLyrStyles[k]+'</span></td>'+
				    '</tr>';
	      dojo.place(html,table,'last');
      }
      dojo.place('<tr><td colspan="2"><hr></td></tr>',table,'last');
      dojo.place(table,'panelStyleOptionContent','last');	 
    },

    addStyleToSelectedList: function(style,lyr) {
      var layer = that.operWMSlayer;
      if(layer != null){
	    if(layer.declaredClass == "WMSLayerCustom"){
	      layer.updateSelectedStyle(style,lyr);
	    }
      }
      dijit.byId('panelStyleOption').destroyRecursive(false);
    },

    checkServicesURLwrtType: function(url, type) {
	    var validityFlag = false;
	    if(type!="WMSServer") {
		    if(url.indexOf(type)!=-1) validityFlag = true;
	    } else {
		    if(url.toLowerCase().indexOf("wms")!=-1) validityFlag = true;		
	    }
	    return validityFlag;
    },
    
    _initTabContainer:function(){
      this.tabContainer = new TabContainer({
	tabs: [{
	  title: this.nls.ArcGISServerTab,
	  content: this.tabNode1
	}, {
	  title: this.nls.WMSServerTab,
	  content: this.tabNode2
	}, {
	  title: this.nls.AGOLTab,
	  content: this.tabNode3
	}],
	selectedChildWidget: this.nls.ArcGISServerTab
      }, this.tabAddOnFly);
	      
      this.tabContainer.startup();
      //tab1 radio button startup
      var nodes = dojo.byId("ServiceContainer").getElementsByTagName('*');
      for(var i = 0; i < nodes.length; i++) nodes[i].disabled = true;
      dojo.byId("ServiceContainer").style.backgroundColor = "#666";
      dojo.byId("ServiceContainer").style.opacity = 0.5;
    },
    
  onChangeCatalogRadioButton:function(){
    var nodesCat = dojo.byId("CatalogContainer").getElementsByTagName('*');
    for(var i = 0; i < nodesCat.length; i++) nodesCat[i].disabled = false;
    dojo.byId("AddServiceOnFly_SelectServiziForInput_img").style.display = 'none';
    dojo.byId("CatalogContainer").style.backgroundColor = "";
    dojo.byId("CatalogContainer").style.opacity = 1.;

    var nodesServ = dojo.byId("ServiceContainer").getElementsByTagName('*');
    for(var i = 0; i < nodesServ.length; i++) nodesServ[i].disabled = true;
    dojo.byId("ServiceContainer").style.backgroundColor = "#666";
    dojo.byId("ServiceContainer").style.opacity = 0.5;
  },

  onChangeServiceRadioButton:function(){
    var nodesCat = dojo.byId("CatalogContainer").getElementsByTagName('*');
    for(var i = 0; i < nodesCat.length; i++) nodesCat[i].disabled = true;
    dojo.byId("AddServiceOnFly_SelectServiziForInput_img").style.display = 'block';
    dojo.byId("CatalogContainer").style.backgroundColor = "#666";
    dojo.byId("CatalogContainer").style.opacity = 0.5;

    var nodesServ = dojo.byId("ServiceContainer").getElementsByTagName('*');
    for(var i = 0; i < nodesServ.length; i++) nodesServ[i].disabled = false;
    dojo.byId("ServiceContainer").style.backgroundColor = "";
    dojo.byId("ServiceContainer").style.opacity = 1.;
  },
  
  connectLayerEventsToLoader: function(layer){
      var that = this;
    this.loading.show();
    that.handlerOnLayerAdd = dojo.connect(that.map,'onLayerAddResult', function(layer, error){
	    dojo.disconnect(that.handlerOnLayerAdd);
	    that.loading.hide();});	
    /*dojo.connect(layer,'onUpdateStart', function(l){
	    that.loading.show();
    });
    dojo.connect(layer,'onUpdateEnd', function(l){
	    that.loading.hide();
    });*/
  },
  
  getWebMap: function(){
    var webMapId = dojo.byId("AddServiceOnFly_AGOLInputID").value;	
    var mapDef = agolUtils.createMap(webMapId,dojo.create('div'));

    mapDef.then(lang.hitch(this, function(resp) {
      var webMap = resp.map;
      var itemInfo = resp.itemInfo;

      if (itemInfo && itemInfo.itemData){
	var webBasemaps = itemInfo.itemData.baseMap.baseMapLayers;
	dojo.forEach(webBasemaps, function(item){
		console.log(item.id);
		//TBD: insert here code to retrieve also basemap from AGOL WebMap
	});
	dojo.forEach(itemInfo.itemData.operationalLayers, function(item,idx){
		var layer = webMap.getLayer(item.id);
		layer.idService = that.id+'_'+item.id;
		layer.tabNameId = item.id;
		//layer.typeservice = 'AGOL';
		//obtain service type
		var validTypes = ["MapServer","FeatureServer","ImageServer", "WMSServer"];
		var typeService;
		for(var j=0;j<validTypes.length;j++){
			if(that.checkServicesURLwrtType(item.url,validTypes[j])) typeService = validTypes[j];
		}
		layer.typeservice = typeService;

		//connect loading image to events: onLayerAdd and onUpdate
		that.connectLayerEventsToLoader(layer);
	
		//CODE for ADDING LAYER TO ESRI TOC//
		if(layer.declaredClass != "esri.layers.WMSLayer") {
			esriItutils.addOperationalLayerOnFlyTOC(that, layer, layer.id); 
		} else {
			esriItutils.addWMSLayerOnFlyTOC(that, layer, layer.id); 					
		}
		that.cntLayerAdd++;						
	  });
	}
	//clean up and close panel
	dojo.byId("AddServiceOnFly_AGOLInputID").value = "";		
	var panelController = PanelManager.getInstance();
	panelController.closePanel(panelController.panels[0]);    
      }),
		
      function(){ //error callback
	    var err_msg = webMapId + '<br>' + that.nls.ERROR_MSG_UNCORRECT_WEBMAPID;
	    esriItutils.errorMessageAlert(that.nls.GENERIC_ERROR_MSG,err_msg,400,200);
      });	
    }
  });
});