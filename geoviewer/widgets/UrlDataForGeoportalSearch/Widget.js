define(['dojo/_base/declare',
  'jimu/BaseWidget',
  'jimu/esriIT/esriItGeoportal',
  'jimu/dijit/LoadingShelter',
],
function(declare, BaseWidget, esriItGeoportal,LoadingShelter) {
  var clazz = declare([BaseWidget], {    
    templateString: '<div></div>',
    that: null,
    handlerOnLayerAdd: null,
    
    postCreate: function(){
        this.loading = new LoadingShelter();
        this.loading.placeAt(this.map.root);
        this.loading.hide();
    },
        
    startup: function() {
      this.fncUtilityContent();
    },
    
    fncUtilityContent: function(){
      var that = this;
      var gp = new esriItGeoportal();
      gp.GPopenDataGeoPortal(that);   
    },
    
    connectLayerEventsToLoader: function(layer){
      this.loading.show();
      that = this;
      that.handlerOnLayerAdd = dojo.connect(that.map,'onLayerAddResult', function(layer, error){
        dojo.disconnect(that.handlerOnLayerAdd);
        that.loading.hide();
      });	
    }
  });
  return clazz;
});