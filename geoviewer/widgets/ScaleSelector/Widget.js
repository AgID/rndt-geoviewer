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
        'dojo/_base/html',
        'dijit/_WidgetsInTemplateMixin',
        "esri/geometry/Point",
        'esri/SpatialReference',
        'jimu/BaseWidget',
        'jimu/utils',
        'jimu/dijit/Message',
        'dojo/_base/lang',
        'dojo/on',
        "dojo/dom-class",
        "dijit/form/Select",
        "dojo/data/ObjectStore",
        "dojo/store/Memory"
    ],
    function (declare,
              html,
              _WidgetsInTemplateMixin,
              Point,
              SpatialReference,
              BaseWidget,
              utils,
              Message,
              lang,
              on,
              domClass,
              Select,
              ObjectStore,
              Memory) {

        var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {

            baseClass: 'jimu-widget-scale-selector',
            name: 'ScaleSelector',

            selectOptions: [],

            startup: function () {
                this.inherited(arguments);

                var that = this;

                if (this.getBaseMapLayer() != null) {
                    this.initSelectOptions();

                    var scaleSelect = this.initScalesSelect();

                    scaleSelect.on("change", lang.hitch(this, function (idx) {
                        var currentScale = this.getCurrentMapScale();
                        var option = this.getOptionByID(idx);
                        var newScale = option.scale;

                        if (currentScale != newScale) {
                            var extent = esri.geometry.getExtentForScale(this.map, newScale);
                            this.map.setExtent(extent)
                        }
                    }));

                    // On Zoom Change
                    this.map.on("zoom-end", lang.hitch(this, function (zoom) {

                        var option = this.getCurrentOption();
                        scaleSelect.setValue(option.id);
                    }));
                }
            },

            getCurrentOption: function ()
            {
                // var scale = esri.geometry.getScale(this.map).toFixed(0); //gestito errore: scala non corrisponde a label
                var scale = this.map.getScale();
                var label = this.scaleToLabel(scale);

                return this.getOptionByLabel(label);
            },

            getCurrentMapScale: function ()
            {
                // var scale = esri.geometry.getScale(this.map).toFixed(0); //gestito errore: scala non corrisponde a label
				var scale = this.map.getScale();
                var label = this.scaleToLabel(scale);

                return this.getOptionByLabel(label).scale;
            },

            getOptionByID: function (id)
            {
                for (var key in this.selectOptions) {
                    var option = this.selectOptions[key];

                    if (this.selectOptions[key].id == id) {
                        return this.selectOptions[key];
                    }
                }
            },

            getOptionByLabel: function (label)
            {
                for (var key in this.selectOptions) {
                    var option = this.selectOptions[key];
                    if (this.selectOptions[key].label == label) {
                        return this.selectOptions[key];
                    }
                }
            },

            getBaseMapLayer: function ()
            {
                if (!this.map.itemInfo.itemData.hasOwnProperty("baseMap")) {
                    return null;
                }

                if (this.map.itemInfo.itemData.baseMap.baseMapLayers.length == 0) {
                    return null;
                }

                return this.map.itemInfo.itemData.baseMap.baseMapLayers[0].layerObject;
            },

            labelToScale: function (label)
            {
                label = label.replace(/\./g,'').replace(/\,/g,'');
                return parseFloat(label);
            },

            scaleToLabel: function (value)
            {
                var roundedValue = Math.round(value);
                return dojo.number.format(roundedValue, {places: 0, pattern: "#,###;(#,###)"});
            },

            getScales: function ()
            {
                var mapService = this.getBaseMapLayer();

                var scales = [];
                var tileInfo = mapService.tileInfo;

                for (var j = 0, jl = tileInfo.lods.length; j < jl; j++) {
                    var level = tileInfo.lods[j].level;
                    var scale = tileInfo.lods[j].scale;
                    scales[level] = scale;
                }

                return scales;
            },

            initSelectOptions: function ()
            {
                var that = this;
                var scales = this.getScales();

                this.selectOptions = [];

                for (var i in scales) {
                    var choice = scales[i];
                    var name = that.scaleToLabel(choice);

                    this.selectOptions.push({
                        id: i,
                        label: name,
                        scale: this.labelToScale(name)
                    });
                }
            },

            initScalesSelect: function ()
            {
                var store = new Memory({
                    data: this.selectOptions
                });

                var objectStore = new ObjectStore({ objectStore: store });

                var scaleSelect = new Select({
                    store: objectStore,
                    sortByLabel: false,
                    value: this.getCurrentOption().id
                }, "ScaleSelectContainer");

                scaleSelect.startup();

                return scaleSelect;
            }
        });

        return clazz;
    });