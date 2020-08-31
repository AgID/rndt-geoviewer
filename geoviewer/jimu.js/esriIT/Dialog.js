define([
		'dojo/_base/declare',
		'dojox/widget/DialogSimple',			
		'./dialog/nls/strings',
		'dojo/window',
		'dojo/dom-style',		
		'dijit/form/Button',
		'dojo/text!./dialog/dialog.html',
		'dojo/NodeList-manipulate'
],
function(declare, Dialog, nlsStrings, win, domStyle, Button, dialogTemplate){	
	
	var classObj = declare([Dialog],{
		
		dialog:null,
		
		getDialog:function(title, showFun){				
			
			this.dialog = dojo.byId("jimu-esriIT-dialog");
			var that = this;
			that.Dialog = classObj.superclass;
			
			var size = that._getSize();
			
			if(that.dialog==null){
				that.dialog = new Dialog({
					title: title,
					'class': 'esriItDialog',
					hide: function(){that.dialog.destroyRecursive();},
					style: "width:"+(size.width+20)+"px; height:"+(size.height+50)+"px"
				});
				that._setContentDialog(that.dialog,title, size.height);				
				if(showFun!=null)
					that.dialog.show().then(showFun);
				//else	
					//dialog.show();
				that._centerDialogOnScreen(that.dialog.domNode, size.width, size.height);
			}else{
				if(showFun!=null)showFun();
			}
			return that;
		},
		
		append:function(node){
			this._hideLoading();
			dojo.place(node,dojo.byId("chart_graph_popup"),"last")
			return this;
		},
		show:function(){
			this.dialog.show();
			return this;
		},
		
		_hideLoading :function (dialog,title) { 
			dojo.style(dojo.byId("chart_graph_popup_loading"),"visibility","hidden");
		},
		_setContentDialog :function (dialog,title,height) { 
			var that = this;
			
			if(dojo.query("#jimu-esriIT-d3Charts-Style").length==0){
			/*
				dojo.query("head").append('<style id="jimu-esriIT-d3Charts-Style" type="text/css" >'
				+'.jimu-esriIT-d3Charts-buttonPrint{'
				+'background-image:url("./jimu.js/esriIT/d3Charts/images/print.png");'
				+'background-repeat: no-repeat;width: 16px;height: 16px;text-align: center;}'
				+'.jimu-esriIT-dialog{'
				+'background-color: #FFFFFF;'
				+'}<style>');			
				*/
			}

			dialog.set('content',dialogTemplate);
			
			var btn = dojo.byId("jimu-esriIT-d3Charts-chart_graph_popup_buttonPrint");				
			dojo.connect(btn,"click", function clickBt(){
				that._printChart(dojo.byId("chart_graph_popup").innerHTML,dialog.ownerDocument.styleSheets,title);
			});
			
			dojo.style(dojo.byId("chart_graph_popup"),"height",height+"px");	
			
			var bt = dojo.byId("jimu-esriIT-d3Charts-chart_graph_popup_buttonPrint");
			dojo.style(bt,"background-image","url('./jimu.js/esriIT/dialog/images/print.png')");
			dojo.style(bt,"background-repeat","no-repeat");		
			dojo.place("<span> "+  nlsStrings.LABEL_BUTTON_PRINT +"</span>",bt);
			
			dojo.attr(dojo.byId("chart_graph_popup_loading"),"src",dojo.config.baseUrl+"../dijit/icons/images/loadingAnimation.gif" );
		},		
		
		_printChart:function (html,styles,title) 
		{
			var popupContent = '<html><head><title>'+title+'</title>';     
			for(var s in styles) {
				if (styles[s].href && styles[s].href.length>0) {
					popupContent += '<link rel="stylesheet" type="text/css" href="'+styles[s].href+'" />'; 
				}				
			}
		
			popupContent += '<script>'            
			+'setTimeout(function print(){'
			+'window.document.close();'
			+'window.focus();'
			+'window.print();'
			+'window.close();'
			+'},1000);'			
			+'</script>';			
			popupContent += popupContent +='</head><body>';  
			popupContent += html;  			  			 
			popupContent +='</body></html>';  				
			var size=this._getSize(1);
			var myWindow = window.open("", "popupContent", "width="+size.width+", height="+size.height)
			.document.write(popupContent);		
		},
		
		_getSize : function (size){
			var obj={width:(Math.floor(win.getBox().w/5)*4),height:(Math.floor(win.getBox().h/5)*4)};
			if (size!=null || (size!=1 && !isNaN(size) )) {
				obj.width = Math.floor(obj.width/size);
				obj.height = Math.floor(obj.height/size);
			}
			if(obj.height<500){obj.height=500;}
			if(obj.width<1200){obj.width=1200;}
			return obj;
		},				
	
		_centerDialogOnScreen: function(dNode,width,height)
		{
			width = width==null ? this._getSize().width : width;
			height = height==null ? this._getSize().height : height;
			domStyle.set(dNode,"position","absolute");
			domStyle.set(dNode,"top",Math.floor(win.getBox().h/2 - height/2)+"px");
			domStyle.set(dNode,"left",Math.floor(win.getBox().w/2 - width/2)+"px");
		}
		
		
	});
	
	return new classObj();
});
	