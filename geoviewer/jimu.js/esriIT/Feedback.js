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
        "dojo/_base/declare",
        "dojo/dom-construct",
        "dojo/dom-style"
    ],
    function (
        declare,
        domConstruct,
        domStyle
    )
    {
        var instance = null, clazz;

        clazz = declare(null, {
            _widget: null,
            _cointainerAttachPoint: null,
            _errorIcon: null,
            _errorMessage: null,
            //_iconAttachPoint: null,
            //_messageAttacchPoint: null,

            _loaderAttachPoint: null,
            _jobInfoMessage: "",
            //_loadingMessageAttachPoint: null,

            constructor: function (
                widget,
                cointainerAttachPoint,
                loaderAttachPoint
            ) {
                this._widget = widget;
                this._cointainerAttachPoint = cointainerAttachPoint;
                //this._iconAttachPoint = iconAttachPoint;
                //this._messageAttacchPoint = messageAttacchPoint;


                /* Costruisci messageDiv */
                dojo.addClass(this._cointainerAttachPoint, "isa_info");

                this._errorIcon = domConstruct.toDom('<i class="error-icon" class=""></i>');
                domConstruct.place(this._errorIcon, this._cointainerAttachPoint);

                this._errorMessage = domConstruct.toDom('<span class="error-message">Replace this text with your own text.</span>');
                domConstruct.place(this._errorMessage, this._cointainerAttachPoint);

                /* Costruisci loaderDiv */
                this._loaderAttachPoint = loaderAttachPoint;

                var filename = window.location.protocol + "//" + window.location.host + require.toUrl("jimu") + "/images/loading_black.gif";
                this._loadingImg = domConstruct.toDom('<img src="' + filename + '" />&nbsp;');
                domConstruct.place(this._loadingImg, this._loaderAttachPoint);

                this._jobInfoMessage = domConstruct.toDom('<span class="job-info-message">Loading...</span>');
                domConstruct.place(this._jobInfoMessage, this._loaderAttachPoint);

                // @hack
                dojo.addClass(this._cointainerAttachPoint, "isa_feedback");
                dojo.addClass(this._cointainerAttachPoint, "clearfix");

                // Hyded by default
                this.hide();
                this.hideLoader();

                // Check and add "widget-common.css"
                if (!this._isLoadedCSS()) {
                    this._addCSS();
                }
            },

            _isLoadedCSS: function () {
                return document.getElementById("widget_common_css");
            },

            _addCSS: function () {
                var head  = document.getElementsByTagName('head')[0];

                var filename = window.location.protocol + "//" + window.location.host + require.toUrl("jimu") + "/esriIT/css/widget-common.css";
                var link = document.createElement("link")

                link.setAttribute("id", "widget_common_css");
                link.setAttribute("rel", "stylesheet");
                link.setAttribute("type", "text/css");
                link.setAttribute("href", filename);
                link.setAttribute("media", "all");

                head.appendChild(link);
            },

            showLoader: function () {
                this.hide();
                this.showInfoLoading();
                
              // esri.show(this._loaderAttachPoint);
								
                if(typeof this._widget.showLoader === 'function') {
                    this._widget.showLoader();
                }
            },

            hideLoader: function () {
                esri.hide(this._loaderAttachPoint);
                this._hideFeedbacks();

                if(typeof this._widget.showLoader === 'function') {
                    this._widget.hideLoader();
                }
            },

            setJobInfoMessage: function (message) {
                //this._loadingMessageAttachPoint.innerHTML = message + "...";
				if(!message || message.length==0)message="Loading";
                //this._jobInfoMessage.innerHTML = message + "...";
				
				//this._showFeedback("isa_info", "fa fa-info-circle", message + "...");
                this.showInfoLoading(message);
            },

            setJobInfo: function (jobInfo) {
                this.setJobInfoMessage(jobInfo.jobStatus);
            },

            _hideFeedbacks: function () {
                domStyle.set(this._cointainerAttachPoint, "display", "none");								
            },

            hide: function () {
                this._hideFeedbacks();
				//this._showFeedback("isa_info", "fa fa-info-circle", "Loading...");
				this._jobInfoMessage.innerHTML = "Loading...";
            },

            _showFeedback: function (container_class, icon_class, message) {
                this.hideLoader();

                domStyle.set(this._cointainerAttachPoint, "display", "block");

                dojo.removeClass(this._cointainerAttachPoint);
                dojo.addClass(this._cointainerAttachPoint, "isa_feedback");
                dojo.addClass(this._cointainerAttachPoint, "clearfix");
                dojo.addClass(this._cointainerAttachPoint, container_class);

                dojo.removeClass(this._errorIcon);
                dojo.addClass(this._errorIcon, icon_class);

                this._errorMessage.innerHTML = message;
            },

            showInfo: function (message) {
                this._showFeedback("isa_info", "fa fa-info-circle", message);
            },

            showSuccess: function (message) {
                this._showFeedback("isa_success", "fa fa-check", message);
            },

            showDownloadLink: function (label, url) {
                var linkHtml = "<a href='" + url + "'>" + label + "</a>";

                this._showFeedback("isa_info", "fa fa-download", linkHtml);
            },

            showWarning: function (message) {
                this._showFeedback("isa_warning", "fa fa-warning", message);
            },

            showError: function (message) {
                this._showFeedback("isa_error", "fa fa-times-circle", message);

                if(typeof this._widget.showError === 'function') {
                    this._widget.showError(message);
                }
            },
            
            showInfoLoading: function (message) {
                message = message ? message : "Loading"; 
  
                this._showFeedback("isa_active", "fa fa-refresh fa-spin", message);

                if(typeof this._widget.showError === 'function') {
                    this._widget.showError(message);
                }
            }

        });

        clazz.getInstance = function () {
            if (instance === null) {
                instance = new clazz();
            }
            return instance;
        };

        return clazz;
    });
