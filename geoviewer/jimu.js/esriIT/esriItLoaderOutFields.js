define(['dojo/_base/declare',
        'dijit/_WidgetBase'
    ],
    function ( declare, _WidgetBase ) {
        return declare([
            _WidgetBase
        ], {

            getByLayerUrlAndMap: function ( layerUrl, map ) {
                var outFields = ["*"];

                var serviceURL = layerUrl.substring(0, layerUrl.lastIndexOf('/'));
                var layerId = layerUrl.substring(layerUrl.lastIndexOf('/') + 1);

                var i;
                for ( i = 0; i < map.layerIds.length; i++ ) {
                    var serviceID = map.layerIds[i];
                    var service = map.getLayer(serviceID);
                    if ( service.url === serviceURL ) {
                        outFields = this.getByServiceAndLayerAndMap(serviceID, layerId, map);
                        break;
                    }
                }


                return outFields;
            },

            getByServiceAndLayerAndMap: function ( serviceID, layerId, map ) {
                var outFields = "";

                var esriItLayerInfos = map.getLayer(serviceID).esriItLayerInfos;
                if ( esriItLayerInfos !== undefined &&
                    esriItLayerInfos.layerFields !== undefined &&
                    esriItLayerInfos.layerFields[layerId] !== undefined
                ) {
                    var i;
                    for ( i = 0; i < esriItLayerInfos.layerFields[layerId].length; i++ ) {
                        var object = esriItLayerInfos.layerFields[layerId][i];
                        outFields += object.name + ",";
                    }
                    outFields = outFields.substring(0, outFields.lastIndexOf(','));//cancella l'ultima virgola
                    outFields = [outFields];
                }
                else {
                    outFields = ["*"];
                }


                return outFields;
            },


            getFieldsNameFromCurrentSelectedTab: function ( attributeTableThis ) {

                var currentSelectedTable = attributeTableThis.getCurrentTable();
                var columns = currentSelectedTable.layer.fields || //questo è per i tab aperti da queryBuilder
                    currentSelectedTable.layerInfo.layerObject.fields;

                var column, response = [];
                for ( column in columns )//per avere gli alias giusti
                {
                    if ( columns.hasOwnProperty(column) ) {
                        if ( columns[column].show === true ) {
                            response.push(columns[column].name);
                        }
                    }
                }

                return response;
            }

        });

    });