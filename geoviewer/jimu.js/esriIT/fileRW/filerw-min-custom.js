/*!
  FileRW Revamped - HTML5 & legacy file upload
  in public domain  | http://filedropjs.org
  by Proger_XP      | http://proger.me

  Supports IE 6+, FF 3.6+, Chrome 7+, Safari 5+, Opera 11+.
  Fork & report problems at https://github.com/ProgerXP/FileRW
*/
;
(function(e, t) {
    typeof define == "function" && define.amd ? define(["exports"],
        function(n) {
            t(e, n)
        }) : typeof exports != "undefined" ? t(e, exports) : t(e, e.fd = e.fd || {})
})(this, function(t, n) {
    n.randomID = function(e) {
        return (e || "fd") + "_" + (Math.random() * 1e4).toFixed()
    }, n.uniqueID = function(e) {
        do var t = n.randomID(e); while (n.byID(t));
        return t
    }, n.byID = function(e) {
        return n.isTag(e) ? e : document.getElementById(e)
    }, n.isTag = function(e, t) {
        return typeof e == "object" && e && e.nodeType == 1 && (!t || e.tagName.toUpperCase() == t.toUpperCase())
    }, n.newXHR = function() {
        try {
            return new XMLHttpRequest
        } catch (e) {
            var t = ["MSXML2.XMLHTTP.6.0", "MSXML2.XMLHTTP.5.0", "MSXML2.XMLHTTP.4.0", "MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP", "Microsoft.XMLHTTP"];
            for (var n = 0; n < t.length; n++) try {
                return new ActiveXObject(t[n])
            } catch (e) {}
        }
        throw "Cannot create XMLHttpRequest."
    }, n.isArray = function(e) {
        return Object.prototype.toString.call(e) === "[object Array]"
    }, n.toArray = function(e, t) {
        return e === null || typeof e == "undefined" ? [] : (!n.isArray(e) && (typeof e != "object" || !("callee" in e)) && (e = [e]), Array.prototype.slice.call(e, t || 0))
    }, n.addEvent = function(e, t, n) {
        return e && t && n && (e.attachEvent ? (e["e" + t + n] = n, e[t + n] = function() {
            e["e" + t + n](window.event)
        }, e.attachEvent("on" + t, e[t + n])) : e.addEventListener(t, n, !1)), e
    }, n.stopEvent = function(e) {
        return e.cancelBubble = !0, e.returnValue = !1, e.stopPropagation && e.stopPropagation(), e.preventDefault && e.preventDefault(), e
    }, n.setClass = function(e, t, r) {
        return (e = n.byID(e)) && t != null && (typeof r != "undefined" && !r ? e.className = e.className.replace(n.classRegExp(t), " ") : n.hasClass(e, t) || (e.className += " " + t)), e
    }, n.hasClass = function(e, t) {
        return n.classRegExp(t).test((n.byID(e) || {}).className)
    }, n.classRegExp = function(e) {
        return e == "" || typeof e == "object" ? /$o_O/ : new RegExp("(^|\\s+)" + e + "(\\s+|$)", "gi")
    }, n.extend = function(e, t, n) {
        e = e || {}, t = t || {};
        for (var r in t)
            if (n || typeof e[r] == "undefined") e[r] = t[r];
        return e
    }, n.callAll = function(e, t, r) {
        var i;
        t = n.toArray(t), typeof e == "function" && (e = [e]);
        if (n.isArray(e)) {
            for (var s = 0; s < e.length; s++)
                if (typeof e[s] == "function") {
                    i = e[s].apply(r || this, t);
                    if (i != null) break
                }
        } else if (e) throw "FileRW event list must be either an Array, Function, undefined or null but " + typeof e + " was given.";
        return i
    }, n.callAllOfObject = function(e, t, r) {
        if (n.logging && n.hasConsole) {
            var i = e.events[t] ? e.events[t].length || 0 : 0;
            console.info("FileRW " + t + " event (" + i + ") args:"), console.dir([r])
        }
        var s = [n.onObjectCall].concat(e.events.any),
            o = n.callAll(s, [t].concat(n.toArray(r)), e);
        return o != null ? o : n.callAll(e.events[t], r, e)
    }, n.appendEventsToObject = function(e, t) {
        if (n.addEventsToObject(this, !1, arguments)) return this;
        switch (arguments.length) {
            case 0:
                return n.extend({}, this.events);
            case 1:
                if (e === null) return this.events = {}, this;
                if (n.isArray(e)) {
                    var r = {};
                    for (var i = 0; i < e.length; i++) r[e[i]] = n.toArray(this.events[e[i]]);
                    return r
                }
                if (typeof e == "function") return n.funcNS(e);
                if (typeof e == "string") return n.toArray(this.events[e]);
            case 2:
                e = n.toArray(e);
                if (t === null) {
                    for (var i = 0; i < e.length; i++) {
                        var s = n.splitNS(e[i]);
                        if (!s[0])
                            for (var o in this.events) arguments.callee.call(this, [o + ":" + s[1]], null);
                        else if (!s[1]) this.events[s[0]] = [];
                        else if (this.events[s[0]])
                            for (var u = this.events[s[0]].length - 1; u >= 0; u--) n.funcNS(this.events[s[0]][u]) == s[1] && this.events[s[0]].splice(u, 1)
                    }
                    return this
                }
        }
        throw "Bad parameters for FileRW event()."
    }, n.previewToObject = function(e, t) {
        if (n.addEventsToObject(this, !0, arguments)) return this;
        throw "Bad parameters for FileRW preview()."
    }, n.addEventsToObject = function(e, t, r) {
        var i = r[0],
            s = r[1];
        switch (r.length) {
            case 1:
                if (i && typeof i == "object" && !n.isArray(i)) {
                    for (var o in i) arguments.callee(e, t, [o, i[o]]);
                    return !0
                };
            case 2:
                if (typeof s == "function" || n.isArray(s)) {
                    i = n.toArray(i), s = n.toArray(s);
                    var u = t ? "unshift" : "push";
                    for (var a = 0; a < i.length; a++) {
                        var f = n.splitNS(i[a]);
                        for (var l = 0; l < s.length; l++) n.funcNS(s[l], f[1]);
                        e.events[f[0]] = e.events[f[0]] || [], e.events[f[0]][u].apply(e.events[f[0]], s)
                    }
                    return !0
                }
        }
    }, n.funcNS = function(e, t) {
        return typeof e != "function" ? e : arguments.length == 1 ? (e[n.nsProp] || "").toString() : (e[n.nsProp] = (t || "").toString(), e)
    }, n.splitNS = function(e) {
        return (e || "").match(/^([^:]*):?(.*)$/).slice(1)
    }, n.extend(n, {
        logging: !0,
        hasConsole: "console" in window && console.log && console.dir,
        onObjectCall: null,
        all: [],
        isIE6: !1,
        isIE9: !1,
        isChrome: (navigator.vendor || "").indexOf("Google") != -1,
        nsProp: "_fdns"
    }), n.DropHandle = function(e, t) {
        var r = this;
        r.el = e = n.byID(e);
        if (!e) throw "Cannot locate DOM node given to new FileRW class.";
        r.opt = {
            zoneClass: "fd-zone",
            inputClass: "fd-file dijitReset dijitInline dijitButtonNode",
            iframe: {
                url: "",
                callbackParam: "fd-callback",
                fileParam: "fd-file"
            },
            labelButtonUpload:t.labelButtonUpload,
            input: null,
            recreateInput: !0,
            fullDocDragDetect: !1,
            multiple: !1,
            dropEffect: "copy"
        }, n.all.push(r), r.filerw = null;
        var i = r.opt.iframe;
        n.extend(r.opt, t, !0), n.extend(r.opt.iframe, i), n.isChrome && (r.opt.fullDocDragDetect = !0), r.events = {
            any: [],
            dragEnter: [],
            dragLeave: [],
            dragOver: [],
            dragEnd: [],
            dragExit: [],
            upload: [],
            uploadElsewhere: [],
            inputSetup: [],
            iframeSetup: [],
            iframeDone: []
        }, r.on = r.events, r.zone = r.el, r.hook = function(e) {
            r.opt.input != 0 && (r.opt.input = r.opt.input || r.prepareInput(e), r.opt.input && n.callAllOfObject(r, "inputSetup", r.opt.input)), r.hookDragOn(e), r.hookDropOn(e)
        }, r.hookDragOn = function(e) {
            r.opt.fullDocDragDetect ? (r.delegate(document.body, "dragEnter"), n.addEvent(document, "dragleave", function(e) {
                if (e.clientX == 0 && e.clientY == 0 || n.isTag(e.relatedTarget, "html")) n.stopEvent(e), n.callAllOfObject(r, "dragLeave", e)
            })) : (r.delegate(e, "dragEnter"), r.delegate(e, "dragLeave")), r.delegate(e, "dragOver"), r.delegate(e, "dragEnd"), r.delegate(e, "dragExit")
        }, r.hookDropOn = function(e) {
            n.isIE9 || r.delegate(e, "drop", "upload")
        }, r.delegate = function(e, t, i) {
            n.addEvent(e, t.toLowerCase(), function(e) {
                n.stopEvent(e), n.callAllOfObject(r, i || t, e)
            })
        }, r.prepareInput = function(e) {
            var t = r.findInputRecursive(e) || r.createInputAt(e);
            if (t) {
                var i = t.parentNode;
                while (i && !n.isTag(i, "form")) i = i.parentNode;
                if (!i) throw "FileRW file input has no parent form element.";
                var s = i ? i.getAttribute("target") : "";
                if (s && n.isTag(n.byID(s), "iframe")) return {
                    file: t,
                    form: i
                }
            }
            return !1
        }, r.findInputRecursive = function(e) {
            for (var t = 0; t < e.childNodes.length; t++) {
                var i = e.childNodes[t];
                if (n.isTag(i, "input") && i.getAttribute("type") == "file" && n.hasClass(i, r.opt.inputClass)) return i;
                if (i = arguments.callee(i)) return i
            }
        }, r.createInputAt = function(e) {
            do var t = n.randomID(); while (n.byID(t));
            var i = document.createElement("div");

            i.innerHTML = ''
            +'<iframe src="javascript:false" name="' + t + '"></iframe>' + '<form method="post" enctype="multipart/form-data">'
            +'<label for="' + r.opt.iframe.fileParam + t + '" >'
                +'<input type="hidden" name="operation" value="upload">'
                +'<img style="cursor:pointer; float:left" src="./jimu.js/esriIT/FileRW/images/i_upload.png" id="seachAddressLoadPoints" class="image-button" alt="'+ r.opt.labelButtonUpload +'" title="'+ r.opt.labelButtonUpload +'"/>'
	        +'  <div style="cursor:pointer;line-height: 30px;height: 30px; display: block;float:left"> '+ r.opt.labelButtonUpload +'</div>'
	        +'</label>'
            + '<input type="hidden" name="' + r.opt.iframe.callbackParam + '" />'
            + '<input data-dojo-type="dijit/form/Button" type="file" id="' + r.opt.iframe.fileParam + t + '" name="' + r.opt.iframe.fileParam + '" style="display:none;"/>'
            + "</form>",
            i.firstChild.setAttribute("id", t), i.firstChild.style.display = "none", i.lastChild.setAttribute("target", t);
            var s = e.firstChild;
            while (s && (!n.isTag(s) || n.isTag(s, "legend"))) s = s.nextSibling;
            return s ? e.insertBefore(i, s) : e.appendChild(i), i.lastChild.lastChild
        }, r.abortIFrame = function() {
            if (r.opt.input.form) {
                var e = n.byID(r.opt.input.form.getAttribute("target"));
                e && e.setAttribute("src", "javascript:false")
            }
        }, r.sendViaIFrame = function(e) {
            e = e || r.opt.iframe.url;
            var t = (r.opt.input || {}).form;
            if (e && t) {
                do var i = n.randomID(); while (i in window);
                window[i] = function(t, param2, param3, param4, param5) {
                    //t = t.replace(/^\uFEFF/, '');//fix per il BOM che rovina il parse JSON
                    param2 = param2.substring( param2.lastIndexOf('\\') + 1);// "C:\Users\maxim\Downloads\pippo.json" --> "pippo.json"
                    typeof t != "object" && (t = {
                        response: t,
                        responseXML: "",
                        responseText: (t || "").toString(),
                        readyState: 4,
                        status: 200,
                        statusText: "OK",
                        param2: param2,
                        param3: param3,
                        param4: param4,
                        param5: param5,
                        getAllResponseHeaders: function() {
                            return ""
                        },
                        getResponseHeader: function() {
                            return ""
                        },
                        setRequestHeader: function() {
                            return this
                        },
                        statusCode: function() {
                            return this
                        },
                        abort: function() {
                            return this
                        }
                    }), n.extend(t, {
                        iframe: !0,
                        url: e
                    }), n.callAllOfObject(r, "iframeDone", t)
                };
                var s = t.firstChild;
                while (s && (!n.isTag(s, "input") || s.name != r.opt.iframe.callbackParam)) s = s.nextSibling;
                return s ? s.value = i : e = e.replace(/[?&]+$/, "") + (e.indexOf("?") == -1 ? "?" : "&") + r.opt.iframe.callbackParam + "=" + i, t.setAttribute("action", e), n.callAllOfObject(r, "iframeSetup", t), t.submit(), setTimeout(r.resetForm, 300), !0
            }
        }, r.resetForm = function() {
            var e = r.opt.input && r.opt.input.file;
            if (e) {
                e.value = "";
                if (r.opt.recreateInput) {
                    var t = r.opt.input.file = e.cloneNode(!0);
                    e.parentNode.replaceChild(t, e), n.callAllOfObject(r, "inputSetup", [r.opt.input, e])
                }
            }
        }, r.multiple = function(e) {
            return r.opt.input && typeof e != "undefined" && (e ? r.opt.input.file.setAttribute("multiple", "multiple") : r.opt.input.file.removeAttribute("multiple")), r.opt.input && !!r.opt.input.file.getAttribute("multiple")
        }, r.event = function(e, t) {
            return n.appendEventsToObject.apply(r, arguments)
        }, r.preview = function(e, t) {
            return n.previewToObject.apply(r, arguments)
        }, r.onInputSetup = function(t, i) {
            i ? (t.file.clearAttributes && t.file.clearAttributes(), t.file.mergeAttributes && t.file.mergeAttributes(i)) : r.multiple(r.opt.multiple), n.setClass(t.file, r.opt.inputClass), r.delegate(t.file, "change", "upload");
            var s = t.file.parentNode;
            s && s.style.display.match(/^(static)?$/) && (s.style.position = "relative");
            if (n.isTag(e, "fieldset")) {
                var o = document.createElement("div");
                o.style.position = "relative", o.style.overflow = "hidden", e.parentNode.insertBefore(o, e), o.appendChild(e)
            }
        }, r.onDragOver = function(e) {
            n.stopEvent(e), e.dataTransfer && (e.dataTransfer.dropEffect = r.opt.dropEffect)
        }, r.onUpload = function() {
            for (var e = 0; e < n.all.length; e++) n.all[e] !== r && n.all[e].events && n.callAllOfObject(n.all[e], "uploadElsewhere", r)
        }, r.event({
            inputSetup: r.onInputSetup,
            dragOver: r.onDragOver,
            upload: r.onUpload
        }), n.setClass(e, r.opt.zoneClass), r.hook(e)
    }, n.FileRW = function(e, t) {
        function i(t) {
            return function() {
                n.setClass(e, r.opt.dragOverClass, t)
            }
        }
        var r = this;
        e = n.byID(e), r.handle = new n.DropHandle(e, t), r.handle.filerw = r, n.extend(r.handle.opt, {
            dragOverClass: "over"
        }), n.extend(r.handle.opt.iframe, {
            force: !1
        }), n.extend(r.handle.events, {
            send: [],
            fileSetup: []
        }), r.onUpload = function(e) {
            var t = !r.opt.iframe.force && r.eventFiles(e, !0);
            t ? t.length > 0 && n.callAllOfObject(r, "send", [t]) : !r.handle.sendViaIFrame() && n.hasConsole && console.warn("FileRW fallback upload triggered but iframe options were not configured - doing nothing.")
        }, r.eventFiles = function(e, t) {
            var i = new n.FileList(e);
            if (e.dataTransfer && (e.dataTransfer.length || e.dataTransfer.files)) var s = e.dataTransfer;
            else var s = e.target && e.target.files || e.srcElement && e.srcElement.files;
            if (s) {
                var o = s.items || [];
                s.files && (s = s.files);
                var u = {};
                for (var a = 0; a < s.length; a++) {
                    var f = new n.File(s[a]);
                    if (!u[f.name] || f.name == "image.jpg") u[f.name] = !0, f.setNativeEntry(o[a]), n.callAllOfObject(r, "fileSetup", f), (f.size > 0 || f.nativeEntry) && i.push(f)
                }
            } else t && (i = !1);
            return i
        }, n.extend(r, r.handle), r.event({
            upload: r.onUpload,
            send: r.resetForm,
            dragEnter: i(!0),
            dragLeave: i(!1),
            uploadElsewhere: i(!1)
        }), r.preview({
            upload: i(!1)
        })
    }, n.FileList = function(e) {
        var t = this;
        t.dropEffect = e && e.dropEffect || "", t.length = 0, e = null, t.push = function(e) {
            return t[t.length++] = e, t
        }, t.pop = function() {
            if (t.length > 0) {
                var e = t.last();
                return delete t[--t.length], e
            }
        }, t.first = function() {
            return t[0]
        }, t.last = function() {
            return t[t.length - 1]
        }, t.remove = function(e) {
            for (; e < t.length - 1; e++) t[e] = t[e + 1];
            return se.f.pop(), t
        }, t.clear = function() {
            for (var e = 0; e < t.length; e++) delete t[e];
            return t.length = 0, t
        }, t.reverse = function() {
            for (var e = 0; e < Math.floor(t.length / 2); e++) t[e] = t[t.length - e - 1];
            return t
        }, t.concat = function(e) {
            var r = new n.FileList;
            for (var i = 0; i < t.length; i++) r[i] = t[i];
            for (var i = 0; e && i < e.length; i++) r[t.length + i + 1] = e[i];
            return r.length = t.length + (e || []).length, t
        }, t.sort = function(e, n) {
            for (var r = 0; r < t.length; r++)
                for (var i = 0; i < t.length; i++)
                    if (e.call(n || this, t[r], t[i], r, i) < 0) {
                        var s = t[r];
                        t[r] = t[i], t[i] = s
                    }
            return t
        }, t.sortBy = function(e, n) {
            var r = [];
            for (var i = 0; i < t.length; i++) r.push([i, e.call(n || this, t[i], i)]);
            r.sort(function(e, t) {
                return e[1] > t[1] ? 1 : e[1] < t[1] ? -1 : 0
            });
            for (var i = 0; i < r.length; i++) t[i] = r[i][0];
            return t
        }, t.find = function(e, n) {
            for (var r = 0; r < t.length; r++) {
                var i = e.call(n || this, t[r], r);
                if (i != null) return t[r]
            }
        }, t.each = function(e, n) {
            return t.find(function() {
                e.apply(this, arguments)
            }, n), t
        }, t.invoke = function(e, t) {
            var r = n.toArray(arguments, 1);
            return this.each(function(t) {
                t[e].apply(t, r)
            })
        }, t.abort = function() {
            return this.invoke("abort")
        }, t.findCompare = function(e, n) {
            var r, i = null,
                s;
            return t.each(function(t) {
                if (i == null || i < (s = e.call(n, r))) r = t
            }, n), r
        }, t.filter = function(e, r) {
            var i = new n.FileList;
            return t.each(function(t) {
                e.apply(this, arguments) && i
                    .push(t)
            }, r), i
        }, t.largest = function() {
            return t.findCompare(function(e) {
                return e.size
            })
        }, t.smallest = function() {
            return t.findCompare(function(e) {
                return -e.size
            })
        }, t.oldest = function() {
            return t.findCompare(function(e) {
                return -e.modDate.getTime()
            })
        }, t.newest = function() {
            return t.findCompare(function(e) {
                return e.modDate
            })
        }, t.ofType = function(e) {
            return e += e.indexOf("/") == -1 ? "/" : "$", e = new RegExp("^" + e, "i"), t.filter(function(t) {
                return e.test(t.type)
            })
        }, t.images = function() {
            return t.ofType("image")
        }, t.named = function(e) {
            return typeof e == "string" ? t.find(function(t) {
                return t.name == e
            }) : t.filter(function(t) {
                return e.test(t.name)
            })
        }
    }, n.FileList.prototype.length = 0, n.FileList.prototype.splice = Array.prototype.splice, n.File = function(t) {
        var r = this;
        r.nativeFile = t, r.nativeEntry = null, r.name = t.fileName || t.name || "", r.size = t.fileSize || t.size || 0, r.type = r.mime = t.fileType || t.type || "", r.modDate = t.lastModifiedDate || new Date, r.xhr = null, r.opt = {
            extraHeaders: !0,
            xRequestedWith: !0,
            method: "POST"
        }, r.events = {
            any: [],
            xhrSetup: [],
            xhrSend: [],
            progress: [],
            done: [],
            error: []
        }, r.events.sendXHR = r.events.xhrSend, r.abort = function() {
            return r.xhr && r.xhr.abort && r.xhr.abort(), r
        }, r.sendTo = function(e, t) {
            t = n.extend(t, r.opt), t.url = e;
            if (!r.size) n.hasConsole && console.warn("Trying to send an empty FileRW.File.");
            else if (window.FileReader) {
                var i = new FileReader;
                i.onload = function(e) {
                    r.sendDataReadyTo(t, e)
                }, i.onerror = function(e) {
                    n.callAllOfObject(r, "error", [e])
                }, i.readAsArrayBuffer(r.nativeFile)
            } else r.sendDataReadyTo(t);
            return r
        }, r.sendDataReadyTo = function(e, t) {
            r.abort(), r.xhr = n.newXHR(), r.hookXHR(r.xhr), r.xhr.open(e.method, e.url, !0), r.xhr.overrideMimeType && r.xhr.overrideMimeType("application/octet-stream"), r.xhr.setRequestHeader("Content-Type", "application/octet-stream");
            if (e.extraHeaders) {
                r.xhr.setRequestHeader("X-File-Name", encodeURIComponent(r.name)), r.xhr.setRequestHeader("X-File-Size", r.size), r.xhr.setRequestHeader("X-File-Type", r.type), r.xhr.setRequestHeader("X-File-Date", r.modDate.toGMTString());
                var i = e.xRequestedWith;
                if (i === !0) {
                    var s = window.FileReader ? "FileAPI" : "Webkit";
                    i = "FileRW-XHR-" + s
                }
                i && r.xhr.setRequestHeader("X-Requested-With", i)
            }
            n.callAllOfObject(r, "xhrSetup", [r.xhr, e]);
            var o = t && t.target && t.target.result ? t.target.result : r.nativeFile;
            return n.callAllOfObject(r, "xhrSend", [r.xhr, o, e]), r.xhr
        }, r.hookXHR = function(e) {
            var t = e.upload || e;
            e.onreadystatechange = function(t) {
                if (e.readyState == 4) {
                    try {
                        var i = e.status == 200 ? "done" : "error"
                    } catch (t) {
                        var i = "error"
                    }
                    var s = i == "error" ? [t, e] : [e, t];
                    n.callAllOfObject(r, i, s)
                }
            }, t.onprogress = function(t) {
                var i = t.lengthComputable ? t.loaded : null;
                n.callAllOfObject(r, "progress", [i, t.total || null, e, t])
            }
        }, r.readData = function(e, t, n) {
            return r.read({
                onDone: e,
                onError: t,
                func: n
            })
        }, r.readDataURL = function(e, t) {
            return r.readData(e, t || !1, "uri")
        }, r.readDataURI = r.readDataURL, r.read = function(t) {
            function i(e, n) {
                typeof n == "object" || (n.message = n), n.fdError = e, t.onError !== !1 && (t.onError || t.onDone).apply(this, arguments)
            }
            n.extend(t, {
                onDone: new Function,
                onError: null,
                blob: r.nativeFile,
                func: "",
                start: 0,
                end: null,
                mime: ""
            });
            if (!window.FileReader) return i("support", e);
            if (t.start > 0 || t.end != null && t.end) t.blob.slice ? (t.end == null && (t.end = t.blob.size || t.blob.fileSize), t.blob = t.blob.slice(t.start, t.end, t.mime)) : n.hasConsole && console.warn("File Blob/slice() are unsupported - operating on entire File.");
            var s = new FileReader;
            s.onerror = function(e) {
                i("read", e)
            }, s.onload = function(e) {
                e.target && e.target.result ? (t.func == "readAsBinaryString" && (e.target.result = String.fromCharCode.apply(null, new Uint8Array(e.target.result))), t.onDone(e.target.result)) : s.onerror(e)
            };
            var o = t.func;
            if (n.isArray(o)) {
                var u = o[0];
                return o[0] = t.blob, s[u].apply(s, o)
            }
            if (!o || o == "bin") o = "readAsBinaryString";
            else if (o == "url" || o == "uri" || o == "src") o = "readAsDataURL";
            else if (o == "array") o = "readAsArrayBuffer";
            else if (o == "text") o = "readAsText";
            else if (o.substr(0, 4) != "read") return s.readAsText(t.blob, o);
            return o == "readAsBinaryString" && (o = "readAsArrayBuffer"), s[o](t.blob)
        }, r.listEntries = function(e, t) {
            if (r.nativeEntry && r.nativeEntry.isDirectory) {
                t = t || new Function;
                var i = r.nativeEntry.createReader(),
                    s = new n.FileList,
                    o = 0;

                function u(t) {
                    o -= t, o == 0 && e && (e(s), e = null)
                }
                return i.readEntries(function(e) {
                    for (var r = 0; r < e.length; r++) {
                        var a = e[r];
                        a.file ? (o++, a.file(function(e) {
                            var t = new n.File(e);
                            t.setNativeEntry(a), s.push(t), u(1)
                        }, function() {
                            s.push(n.File.fromEntry(a)), u(1), t.apply(this, arguments)
                        })) : s.push(n.File.fromEntry(a))
                    }
                    r ? i.readEntries(arguments.callee, t) : u(0)
                }, t), !0
            }
        }, r.setNativeEntry = function(e) {
            r.nativeEntry = e && e.webkitGetAsEntry && e.webkitGetAsEntry()
        }, r.event = function(e, t) {
            return n.appendEventsToObject.apply(r, arguments)
        }, r.preview = function(e, t) {
            return n.previewToObject.apply(r, arguments)
        }, r.onXhrSend = function(e, t) {
            e.send(t)
        }, r.event({
            xhrSend: r.onXhrSend
        })
    }, n.File.fromEntry = function(e) {
        var t = new n.File(e);
        return t.setNativeEntry(e), t.nativeFile = null, t
    }, n.jQuery = function(e) {
        e = e || jQuery || window.jQuery;
        if (!e) throw "No window.jQuery object to integrate FileRW into.";
        e.fn.filerw = function(t) {
            function r(e, t) {
                return function(r) {
                    var s = (t || []).concat(n.toArray(arguments, 1));
                    return i.triggerHandler((e + r).toLowerCase(), s)
                }
            }
            var i = this,
                s = this.data("filerw");
            if (typeof t == "string")
                if (!s) e.error("$.filerw('comment') needs an initialized FilrDrop on this element.");
                else {
                    if (typeof s[t] != "undefined") {
                        var o = s[t];
                        return typeof o == "function" ? o.apply(s, n.toArray(arguments, 1)) : o
                    }
                    e.error("There's no method or property FileRW." + t + ".")
                } else if (!t || typeof t == "object")
                if (!s) {
                    var u = new FileRW(this[0], t);
                    u.$el = e(this), this.first().data("filerw", u), u.event("any", r("fd")), u.on.fileSetup.push(function(e) {
                        e.event("any", r("file", [e]))
                    })
                } else {
                    if (!t) return s;
                    n.extend(s.opt, t, !0)
                } else e.error("Invalid $.filerw() parameter - expected nothing (creates new zone), a string (property to access) or an object (custom zone options).");
            return i
        }
    }, t.FileRW = n.FileRW
});