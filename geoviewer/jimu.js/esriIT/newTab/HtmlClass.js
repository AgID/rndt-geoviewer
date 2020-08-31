define([
		"dojo/_base/declare","dijit/layout/ContentPane","dijit/form/Button","dojo/_base/lang",
        "dojo/dom-construct"
	], function (
		declare,ContentPane,Button,lang,
       domConstruct  ) {
	return declare("jimu/esriIT/HtmlClass",null, {
        
        htmlTemplate:null,
        titleBar:null,
        titleHtmlPopup:null,
        contentHtmlPopup:null,
        idMap:null,
        idToolbar:null,
        idLayersContainer: null,
        constructor:function(params){
            
          
            this.idMap=  params.idMap || "ui-esri-mapNewWindow"; 
            this.idToolbar=params.idToolbar ||"toolbarNewWindow";
            this.htmlTemplate=  params.htmlTemplateCustom || this._getDefaultHtmlTemplate(); 
            this.titleBar=this._getTitleBarDefault() ; //params.titleBarCustom || 
           
            
          
            this.titleHtmlPopup=this._getTitleHtmlPopupDefault(); //params.titleHtmlPopupCustom || 
            this.contentHtmlPopup= this._getContentHtmlPopupDefault() ; //params.contentHtmlPopupCustom ||
            
            declare.safeMixin(this,params);
        },
        _getDefaultHtmlTemplate:function(){          
            var template = '<div id="containerToolbar" ';
            template += ' style="top: 20px;right: 20px; margin: 5px; padding: 10px; position: absolute; z-index: 40; border: solid 2px #666; border-radius: 4px; background-color: #fff;">';
           
            template += '<div id="'+this.idToolbar+'" data-dojo-attach-point="'+this.idToolbar+'" >';
            template += '</div>';
            template += '</div>';
            
            template += '<div id="'+this.idLayersContainer+'" data-dojo-attach-point="'+this.idLayersContainer+'" >';
            template += '</div>';
            
            template+='<div id="'+this.idMap+'" style=" width:   100%;  height:  100%; margin:  0; padding: 0;" ></div><div id="changeMode" style=" top: 20px; right: 20px; position: absolute; z-index: 400;"></div></div>';
            return template;
        },
        
        _getTitleBarDefault:function(){
            var titleBar="<b>Title Bar</b>";
            return titleBar;
            
        },
        
        _setHtmlTemplate:function(htmlTemplateCustom){
            this.htmlTemplate=htmlTemplateCustom;
            
        },
        
        
        
        
        getButtonToolbar:function(){
            
            
            
        },
        
        
        
       
        
        _setTitleBar:function(titleBarCustom){
            this.titleBar=titleBarCustom;
            
        },
        _getTitleHtmlPopupDefault:function(){
            return "<b>Prova</b>";
        },
        _getContentHtmlPopupDefault:function(){
            return "Content ......... ";
        }
  });
})