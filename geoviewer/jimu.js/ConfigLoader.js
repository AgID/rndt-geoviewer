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
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/_base/config',
  'dojo/cookie',
  'dojo/Deferred',
  'dojo/promise/all',
  'dojo/request/xhr',
  './utils',
  './WidgetManager',
  './shared/utils',
  './tokenUtils',
  './portalUtils',
  './portalUrlUtils',
  './AppStateManager',
  'esri/IdentityManager',
  'esri/config',
  'esri/urlUtils',
  'esri/arcgis/utils',
  './ConfigLoaderOriginal'
],
function (declare, lang, array, html, dojoConfig, cookie,
  Deferred, all, xhr, jimuUtils, WidgetManager, sharedUtils, tokenUtils,
  portalUtils, portalUrlUtils, AppStateManager, IdentityManager, esriConfig, esriUrlUtils,
  arcgisUtils,ConfigLoaderOriginal) {
  var instance = null, clazz;

  clazz = declare([ConfigLoaderOriginal], {
    
    loadConfig: function () {
      console.time('Load Config');
      return this._tryLoadConfig().then(lang.hitch(this, function(appConfig) {
        var err = this.checkConfig(appConfig);
        if (err) {
          throw Error(err);
        }
        this.rawAppConfig = lang.clone(appConfig);
        AppStateManager.getInstance().setRawAppConfig(this.rawAppConfig);
        appConfig = this._upgradeAppConfig(appConfig);
        this._processAfterTryLoad(appConfig);
        this.appConfig = appConfig;

        if(this.urlParams.id){
          return this.loadWidgetsManifest(appConfig).then(lang.hitch(this, function() {
            return this.loadAndUpgradeAllWidgetsConfig(appConfig);
          })).then(lang.hitch(this, function() {
            this._configLoaded = true;
            this._setDocumentTitle(appConfig);
            return this.getAppConfig();
          }));
        }else{
          tokenUtils.setPortalUrl(appConfig.portalUrl);
          arcgisUtils.arcgisUrl = portalUrlUtils.getBaseItemUrl(appConfig.portalUrl);
          
          //**************    ESRI ITALIA   *************************************************
          if(appConfig.noInternetConnection){
              window._esriItNoInternetConnection = true;
              return this.loadWidgetsManifest(appConfig);
          }
		  //***************************************************************
          
          return this._proesssWebTierAndSignin(appConfig).then(lang.hitch(this, function() {
            if(this.urlParams.appid){
              //url has appid parameter means open app as an app created from AGOL template
              if(!window.appInfo.isRunInPortal){
                return this._processNotInPortalAppProtocol(appConfig).
                then(lang.hitch(this, function(appConfig){
                  return this._getAppDataAddTemplateDataFromTemplateAppId
                  (appConfig.portalUrl, this.urlParams.appid).
                  then(lang.hitch(this, function(result){
                    if(result.appData.appConfig){
                      appConfig = result.appData.appConfig;
                    }
                    appConfig._appData = result.appData;
                    appConfig.templateConfig = result.templateData;
                    appConfig.isTemplateApp = true;
                    return appConfig;
                  }));
                }));
              }else{
                return this._getAppConfigFromTemplateAppId(appConfig.portalUrl,
                this.urlParams.appid).then(lang.hitch(this, function(appConfig){
                  this._tryUpdateAppConfigByLocationUrl(appConfig);
                  return this._processInPortalAppProtocol(appConfig);
                }));
              }
            }else{
              return this._processNotInPortalAppProtocol(appConfig);
            }
          })).then(lang.hitch(this, function(appConfig) {
            this._processAfterTryLoad(appConfig);
            this.appConfig = appConfig;
            if(appConfig.map.itemId){
              return appConfig;
            }else{
              var webmapDef;
              if(appConfig.map["3D"]) {
                webmapDef = portalUtils.getDefaultWebScene(appConfig.portalUrl);
              } else {
                webmapDef = portalUtils.getDefaultWebMap(appConfig.portalUrl);
              }

              return webmapDef.then(function(itemId){
                appConfig.map.itemId = itemId;
                return appConfig;
              });
            }
          })).then(lang.hitch(this, function(appConfig) {
            return this.loadWidgetsManifest(appConfig);
          })).then(lang.hitch(this, function(appConfig) {
            //if it's an AGOL template app, the appConfig will have one property:_appData
            //if it's an WAB template app, the appConfig will have one property:isTemplateApp
            if(appConfig._appData){
              if(appConfig._appData.values && appConfig._appData.values.webmap){
                return portalUtils.getPortal(appConfig.portalUrl)
                .getItemById(appConfig._appData.values.webmap)
                .then(lang.hitch(this, function(webmapInfo){
                  return jimuUtils.template
                    .mergeTemplateAppConfigToAppConfig(appConfig, appConfig._appData, webmapInfo);
                }));
              }else{
                return jimuUtils.template
                    .mergeTemplateAppConfigToAppConfig(appConfig, appConfig._appData);
              }
            }else {
              return appConfig;
            }
          })).then(lang.hitch(this, function(appConfig) {
            return this.loadAndUpgradeAllWidgetsConfig(appConfig);
          })).then(lang.hitch(this, function(appConfig) {
            this._configLoaded = true;
            this._setDocumentTitle(appConfig);
            return this.getAppConfig();
          }));
        }
      }), lang.hitch(this, function(err){
        this.showError(err);
      }));
    },
    
    _processAfterTryLoad: function(appConfig){
      this.inherited(arguments);
      this._setMapDefaults(appConfig);
    },
    
    _setMapDefaults: function(appConfig){
      if(appConfig.map.orderInfowindowTab && appConfig.map.orderInfowindowTab instanceof Array){
        esriConfig.defaults.map.orderInfowindowTab={};
        array.forEach(appConfig.map.orderInfowindowTab, lang.hitch(this, function(item) {
          if(item.layerUrl != null && item.fields != null && item.fields instanceof Array){
              layerUrl = item.layerUrl=="" ? "all" : item.layerUrl;
              if(esriConfig.defaults.map.orderInfowindowTab[layerUrl] && esriConfig.defaults.map.orderInfowindowTab[layerUrl] instanceof Array)
                esriConfig.defaults.map.orderInfowindowTab[layerUrl].concat(item.fields)
              else  
                esriConfig.defaults.map.orderInfowindowTab[layerUrl]=item.fields;            
          }
        }));      
      }
       // esriConfig.defaults.map.orderInfowindowTab = appConfig.map.orderInfowindowTab;
    },
    
    _tryLoadConfig: function() {
      //********************    ESRI ITALIA   *********************************************************
		var uri = location.href;
		if(uri.indexOf('?')!=-1){
		  var query = uri.substring(uri.indexOf("?") + 1, uri.length);
		  var queryObject = dojo.queryToObject(query);
		  if(queryObject.operation || queryObject.main || queryObject.sub || queryObject.web_id) {
			
			this.configFile = "WebLogin/WebAppLogin.ashx";
			if(queryObject.operation) {
			  if(this.configFile.indexOf('?')!=-1) this.configFile += '&' + 'operation='+queryObject.operation;
			  else this.configFile += '?' + 'operation='+queryObject.operation;
			}else{
			  if(this.configFile.indexOf('?')!=-1) this.configFile += '&' + 'operation=getjson';
			  else this.configFile += '?' + 'operation=getjson';
			}
			
			if(queryObject.main) {
			  if(this.configFile.indexOf('?')!=-1) this.configFile += '&' + 'main='+queryObject.main;
			  else this.configFile += '?' + 'main='+queryObject.main;
			}
			
			if(queryObject.sub) {
			  if(this.configFile.indexOf('?')!=-1) this.configFile += '&' + 'sub='+queryObject.sub;
			  else this.configFile += '?' + 'sub='+queryObject.sub;
			}
			
			if(queryObject.web_id) {
			  if(this.configFile.indexOf('?')!=-1) this.configFile += '&' + 'web_id='+queryObject.web_id;
			  else this.configFile += '?' + 'web_id='+queryObject.web_id;
			}
			
			
			return xhr(this.configFile, {handleAs: 'json', }).then(function(data){
			  if(data=="" || data==false || data.errore ){
				console.log(data.errore);
				window.location.href = 'Unauthorized.html';
			  }else{
				return data;
			  }
			  
			});
		  }
		}
		//*****************************************************************************
		
		if(this.urlParams.config) {
		  this.configFile = this.urlParams.config;
		  return xhr(this.configFile, {
			handleAs: 'json',
			headers: {
			  "X-Requested-With": null
			}
		  }).then(lang.hitch(this, function(appConfig){
			tokenUtils.setPortalUrl(appConfig.portalUrl);
  
			if(this.urlParams.token){
			  return tokenUtils.registerToken(this.urlParams.token).then(function(){
				return appConfig;
			  });
			}else{
			  return appConfig;
			}
		  }));
		}else if(this.urlParams.id){
		  //app is hosted in portal
		  window.appInfo.isRunInPortal = true;
		  var portalUrl = portalUrlUtils.getPortalUrlFromLocation();
		  var def = new Deferred();
		  tokenUtils.setPortalUrl(portalUrl);
		  arcgisUtils.arcgisUrl = portalUrlUtils.getBaseItemUrl(portalUrl);
  
		  var tokenDef;
		  if(this.urlParams.token){
			tokenDef = tokenUtils.registerToken(this.urlParams.token);
		  }else{
			tokenDef = new Deferred();
			tokenDef.resolve();
		  }
  
		  tokenDef.then(lang.hitch(this, function(){
			//we don't process webtier in portal because portal has processed.
			var portal = portalUtils.getPortal(portalUrl);
			portal.loadSelfInfo().then(lang.hitch(this, function(portalSelf){
			  this.portalSelf = portalSelf;
			  //if the portal uses web-tier authorization, we can get allSSL info here
			  if(portalSelf.allSSL && window.location.protocol === "http:"){
				console.log("redirect from http to https");
				window.location.href = portalUrlUtils.setHttpsProtocol(window.location.href);
				def.reject();
				return;
			  }
			  this._processSignIn(portalUrl).then(lang.hitch(this, function(){
				//integrated in portal, open as a WAB app
				this._getAppConfigFromAppId(portalUrl, this.urlParams.id)
				.then(lang.hitch(this, function(appConfig){
				  this._tryUpdateAppConfigByLocationUrl(appConfig);
				  return this._processInPortalAppProtocol(appConfig);
				})).then(function(appConfig){
				  def.resolve(appConfig);
				}, function(err){
				  def.reject(err);
				});
			  }));
			}));
		  }), lang.hitch(this, function(err){
			this.showError(err);
		  }));
		  return def;
		} else{
		  this.configFile = "config.json";
		  return xhr(this.configFile, {handleAs: 'json'}).then(lang.hitch(this, function(appConfig){
			tokenUtils.setPortalUrl(appConfig.portalUrl);
  
			if(this.urlParams.token){
			  return tokenUtils.registerToken(this.urlParams.token).then(function(){
				return appConfig;
			  });
			}else{
			  return appConfig;
			}
		  }));
		}
	  }
	  
	  
	});
	
	clazz.getInstance = function (urlParams, options) {
	  if(instance === null) {
		instance = new clazz(urlParams, options);
	  }else{
		instance.urlParams = urlParams;
		instance.options = options;
	  }
	  return instance;
	};
	
	return clazz;
	
});