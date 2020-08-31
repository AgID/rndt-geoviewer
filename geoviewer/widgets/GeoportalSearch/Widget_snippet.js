

		addResourceOnMap: function (resource, title) {
            var that = this;

            var layer = null;
            var parts = resource.split(":");

            if (parts.length < 2) {
                console.debug("Url dal layer da aggiungere alla mappa errato");
                console.debug("dovrebbe essere nella forma <catalogType>:<layerUrl>");
                console.debug(url);

                this._onQueryError(this.nls.urlFormatNotValid);
                return;
            }

            var catalogRestType = parts[0];
            var layerUrl = resource.replace(catalogRestType + ":", "");
			
			var addLayerFromUrl = new AddLayerFromUrl();			
			var def ;
			
			var mapType = catalogRestType;			
			if(catalogRestType=="ags") {
				mapType = /[^.]+$/.exec(layerUrl)[0];
				if (mapType != "kmz" || mapType != "kml") mapType=="";
				
			}else if(catalogRestType=="ARCGIS") {
				mapType = "ARCGIS";					
			}
			
			if(["agsrest","wms","wfs","ags"].indexOf(catalogRestType) > -1){			
					that.showLoader();
					addLayerFromUrl.add(this.map, mapType, layerUrl).then(function(value){
						that.hideLoader();   						
					}).then(function(error){
						that.hideLoader();
						that._onQueryError(error);
					});
                    //if(catalogRestType=="wfs" || catalogRestType=="ags" || catalogRestType=="agsrest") that.continueServiceSwicth(layer,title);								
			}else{
				this._onQueryError(this.nls.serviceTypeNotHandled + catalogRestType);
                return;				
			}

        },
