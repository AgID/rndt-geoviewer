define(["dojo/_base/declare", "dojo/io-query", "dojo/_base/array", "dojo/dom-style", "dojo/string"], function (declare, ioQuery, arrayUtils, domStyle, string) {
	var sh = declare(null, {
			parseUrl : function (uri) {
				var query = {};
				if (uri) {
					var idxParameters = uri.indexOf("?");
					if (-1 != idxParameters) {
						query = uri.substring(idxParameters + 1, uri.length);
						query = ioQuery.queryToObject(query);
						uri = uri.substring(0, idxParameters);
					};
				}
				return {
					"uri" : uri,
					"query" : query
				};
			},
			getLayerByUrl : function (map, url, showmsg) {
				var that = this;
				var uriObj = {};
				var uri = '';
				url = (url || '##').trim().toLowerCase();
				var ids = arrayUtils.filter(map.layerIds, function (layerId, idx) {
						uri = map.getLayer(layerId).url;
						uriObj = that.parseUrl(uri);
						uri = (uriObj.uri || '??').trim().toLowerCase();
						return uri === url;
					});
				var res = ids.length === 0 ? null : map.getLayer(ids[0]);
				if (showmsg && !res)
					alert('layer non presente in mappa: ' + url);
				return res;
			},
			AddTS2Where : function () {
				var dt = new Date().getTime().toString();
				return string.substitute(' AND (${dt} = ${dt})', {
					"dt" : dt
				});
			},
			AddTS2WhereEx : function () {
				var dt = new Date().getTime().toString();
				return string.substitute('(1 = 1) AND (${dt} = ${dt})', {
					"dt" : dt
				});
			},
			showLoading : function (node) {
				node = node || "loading";
				domStyle.set(node, "visibility", "visible");
			},
			hideLoading : function (node) {
				node = node || "loading";
				domStyle.set(node, "visibility", "hidden");
			},
			addEqualsToArray : function () {
				Array.prototype.equals = function (array, strict) {
					if (!array)
						return false;
					if (arguments.length == 1)
						strict = true;
					if (this.length != array.length)
						return false;
					for (var i = 0; i < this.length; i++) {
						if (this[i]instanceof Array && array[i]instanceof Array) {
							if (!this[i].equals(array[i], strict))
								return false;
						} else if (strict && this[i] != array[i]) {
							return false;
						} else if (!strict) {
							return this.sort().equals(array.sort(), true);
						}
					}
					return true;
				}
			}
		});
	return new sh;
})
