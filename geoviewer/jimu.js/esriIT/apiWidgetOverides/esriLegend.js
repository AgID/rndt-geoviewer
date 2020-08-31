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

define(["esri/dijit/Legend", "dojo/_base/kernel","dojo/_base/declare",
    "dojo/_base/lang","dojo/_base/array","dojo/_base/connect",
    "dojo/_base/json","dojo/_base/Color","dojo/debounce",
    "dojo/has","dojo/sniff","dojo/DeferredList",
    "dojo/json","dojo/dom","dojo/dom-construct",
    "dojo/dom-style","dojo/dom-class","dijit/_Widget",
    "dojox/gfx","dojox/gfx/matrix","dojox/html/entities"],
    function(Legend, y, F,
             n, f, m,
             u, B, p,
             k, da, W,
             S, t, h,
             r, J, H,
             z, P, x) {
        var clazz = F([Legend], {

            counterCustom: null,
            arraySupArrayId: null,

            _buildLegendItems: function(a, b, c) {
                var d = !1,
                    e = t.byId(this.id + "_" + a.id),
                    g = b.parentLayerId;
                if (b.subLayerIds) a = h.create("div", {
                    id: this.id + "_" + a.id + "_" + b.id + "_group",
                    style: {
                        display: "none"
                    },
                    "class": -1 == g ? 0 < c ? "esriLegendGroupLayer itemNotActiveCustom" : "" : this._legendAlign
                }, -1 == g ? e : t.byId(this.id + "_" + a.id + "_" + g + "_group")), h.create("td", {
                    innerHTML: x.encode(b.name),
                    align: this._align
                }, h.create("tr", {}, h.create("tbody", {}, h.create("table", {
                    width: "95%",
                    "class": "esriLegendLayerLabel"
                }, a))));
                else {
                    if (this._respectVisibility && a.visibleLayers && -1 == ("," + a.visibleLayers + ",").indexOf("," + b.id + ",")) return d;
                    c = h.create("div", {
                        id: this.id + "_" + a.id + "_" + b.id,
                        style: {
                            display: "none"
                        },
                        "class": -1 < g ? this._legendAlign : ""
                    }, -1 == g ? e : t.byId(this.id + "_" + a.id + "_" + g + "_group"));
                    h.create("td", {
                        innerHTML: x.encode(b.name) || "",
                        align: this._align
                    }, h.create("tr", {}, h.create("tbody", {}, h.create("table", {
                        width: "95%",
                        "class": "esriLegendLayerLabel"
                    }, c))));
                    a.legendResponse ? d = d || this._buildLegendItems_Tools(a, b, c) : a.renderer && (d = d || this._buildLegendItems_Renderer(a, b, c))
                }
                return d
            },

            _createLegend: function() {
                var a = !1;


                r.set(this.domNode, "position", "relative");
                h.create("div", {
                    id: this.id + "_msg",
                    className: "esriLegendMsg",
                    innerHTML: this.NLS_creatingLegend + "..."
                }, this.domNode);

                var b = [];
                f.forEach(this.layers, function(c) {
                    if ("esri.layers.KMLLayer" == c.declaredClass || "esri.layers.GeoRSSLayer" == c.declaredClass) {
                        var e;
                        c.loaded ? ("esri.layers.KMLLayer" == c.declaredClass ? e = c.getLayers() : "esri.layers.GeoRSSLayer" == c.declaredClass &&
                        (e = c.getFeatureLayers(), this.hideLayersInLegend[c.id] && (e = f.filter(e, function(a) {
                            return -1 == f.indexOf(this.hideLayersInLegend[c.id], a.id)
                        }, this))), f.forEach(e, function(a) {
                                "esri.layers.FeatureLayer" == a.declaredClass && c._titleForLegend && (a._titleForLegend = c._titleForLegend + " - ", "esriGeometryPoint" == a.geometryType ? a._titleForLegend += this.NLS_points : "esriGeometryPolyline" == a.geometryType ? a._titleForLegend += this.NLS_lines : "esriGeometryPolygon" == a.geometryType && (a._titleForLegend += this.NLS_polygons), b.push(a))
                            },
                            this)) : m.connect(c, "onLoad", n.hitch(this, function() {
                            this.refresh(this.layerInfos)
                        }))
                    } else if ("esri.layers.WMSLayer" === c.declaredClass)
                        if (c.loaded) {
                            if ((!this._respectVisibility || this._respectVisibility && c.visible) && 0 < c.layerInfos.length && f.some(c.layerInfos, function(a) {
                                    return a.legendURL
                                })) {
                                var g = !1;
                                f.forEach(c.layerInfos, function(b) {

                                    b.legendURL && -1 < f.indexOf(c.visibleLayers, b.name) && (g || (h.create("div", {
                                            innerHTML: "\x3cspan class\x3d'esriLegendServiceLabel'\x3e" + (c._titleForLegend || c.name || c.id) +"\x3c/span\x3e"
                                        },
                                        this.domNode), g = !0), h.create("div", {
                                        innerHTML: "\x3cimg src\x3d'" + b.legendURL + "'/\x3e"
                                    }, this.domNode), a = !0)
                                }, this)
                            }
                        } else m.connect(c, "onLoad", n.hitch(this, function() {
                            this.refresh(this.layerInfos)
                        }));
                    else b.push(c)
                }, this);
                var c = [];
                f.forEach(b, function(a) {
                    if (a.loaded) {
                        if ((!this._respectVisibility || this._respectVisibility && a.visible) && (a.layerInfos || a.renderer || "esri.layers.ArcGISImageServiceLayer" == a.declaredClass)) {
                            var b = h.create("div", {
                                id: this.id + "_" + a.id,
                                style: {
                                    display: "none"
                                },
                                "class": "esriLegendService"
                            });

                            h.create("span", {
                                innerHTML: this._getServiceTitle(a),
                                "class": "esriLegendServiceLabel"
                            }, h.create("td", {
                                align: this._align
                            }, h.create("tr", {}, h.create("tbody", {}, h.create("table", {
                                width: "95%"
                            }, b)))));

                            h.place(b, this.id, "first");

                            a.legendResponse || a.renderer ? this._createLegendForLayer(a) : c.push(this._legendRequest(a))
                        }
                    } else var g = m.connect(a, "onLoad", this, function(a) {
                        m.disconnect(g);
                        g = null;
                        this.refresh()
                    })
                }, this);

                //mod Collapse
                this.collapseLegend(a);

                0 === c.length && !a ? (t.byId(this.id + "_msg").innerHTML = this.NLS_noLegend, this._activate()) : (new W(c)).addCallback(n.hitch(this,
                    function(b) {
                        a ? t.byId(this.id + "_msg").innerHTML = "" : t.byId(this.id + "_msg").innerHTML = this.NLS_noLegend;
                        this._activate()
                    }))
            },

            collapseLegend: function(a){

                // Check and add "widget-common.css"
                if (!this._isLoadedCSS()) this._addCSS();

                var that = this;
                setTimeout(function(){
                    if(!that.arraySupArrayId) that.arraySupArrayId = [];
                    if(!that.counterCustom) that.counterCustom = 0;
                    var arraySupArrayId = that.arraySupArrayId;
                    var arraySup = dojo.query(".esriLegendService");

                    if(arraySup.length != 0) {f.forEach(arraySup, function(a) {
                        var buttonExpand, idCustomMy = that.counterCustom++ +"_button";
                        if(dojo.byId(idCustomMy)){
                            buttonExpand = dojo.byId(idCustomMy);
                        }else{
                            if(arraySup.indexOf(idCustomMy)!=-1) idCustomMy = that.counterCustom++ +"_button";
                            arraySupArrayId.push(idCustomMy);

                            buttonExpand = new dijit.form.Button({
                                label: "",
                                "id": idCustomMy,
                                "class": "esriLegendServiceCheck fa fa-plus-circle",
                                "oldClass": "esriLegendServiceCheck",
                                "check":false,
                                "pushOld":[],
                                onClick: function(){
                                    this.check = !this.check;

                                    if(a.childNodes.length == 0) return;

                                    for(var count = 1; count < a.childNodes.length; count++){
                                        var child = a.childNodes[count];

                                        if(child.length !=0){
                                            for(var countMore = 1; countMore < child.childNodes.length; countMore++){
                                                var childChild = child.childNodes[countMore];
                                                var attributesStyle = childChild.attributes.style;
                                                if(this.check){
                                                    if(!attributesStyle || (attributesStyle && attributesStyle.value.indexOf("none")==-1))
                                                        childChild.className = "checkDiv";
                                                    /*childChild.className = "checkDiv";*/
                                                    this.pushOld.push(child.className);
                                                }else{
                                                    child.childNodes[countMore].className = "";
                                                }
                                            }
                                        }

                                        if(this.check){
                                            dojo.byId(this.id).className = this.oldClass + " fa-minus-circle";
                                        }else{
                                            child.className = this.pushOld[count-1];

                                            dojo.byId(this.id).className = this.oldClass;
                                        }

                                    }
                                }
                            });
                        }

                        h.place(buttonExpand.domNode,a.childNodes[0]);
                    });}
                },100);
            },

            _isLoadedCSS: function () {
                return document.getElementById("widget_common_css");
            },

            _addCSS: function () {
                var head  = document.getElementsByTagName('head')[0];

                var filename = window.location.protocol + "//" + window.location.host + require.toUrl("jimu") + "/esriIT/css/widget-common.css";
                var link = document.createElement("link");

                link.setAttribute("id", "widget_common_css");
                link.setAttribute("rel", "stylesheet");
                link.setAttribute("type", "text/css");
                link.setAttribute("href", filename);
                link.setAttribute("media", "all");

                head.appendChild(link);
            }
        });

        return clazz;
    });