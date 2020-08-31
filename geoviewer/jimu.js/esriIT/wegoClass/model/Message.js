///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define([
        "dojo/_base/declare","dojo/_base/lang","esri/tasks/query","esri/tasks/QueryTask","esri/lang",
        "esri/layers/FeatureLayer","esri/tasks/RelationshipQuery","dojo/_base/array","esri/request",
	'dojo/text!./configModel.json','dojo/json'
    ],
    function (
        declare,lang,Query,QueryTask,esriLang,FeatureLayer,RelationshipQuery,ArrayUtils,esriRequest,
	configModelFile,json) {
        return declare(null, {
            configModel: null,
            baseClass: null,
            config: null,
            feedback: null,
            select: null,

            constructor: function (params) {
                this.configModel = JSON.parse(configModelFile);
                if(params.baseClass) this.initBaseClassVar(params.baseClass);
                if(params.feedback) this.feedback = params.feedback;
                if(params.select) this.select = params.select;

                this.getSelectMessage();
            },

            initBaseClassVar: function(baseClass){
                this.baseClass = baseClass;
                this.config = baseClass.config;
                this.selectedModel = this.configModel.selectedModel;
            },

            showErrorModel: function(error) {
                if(this.select.run) this.select.run.disabled = true;
                if(this.select.parameter) this.select.parameter.disabled = true;

                this.baseClass.showError(error);
            },

            getSelectMessage: function(){
                esriRequest({
                    url: this.configModel.msg.path,
                    content: {f:'json'},
                    callbackParamName: "callback",
                    timeout: this.timeoutValue,
                    handleAs: 'json',
                    load: lang.hitch(this, this.getSelectMessageSuccess),
                    error: lang.hitch(this, this.showError)
                }, {useProxy:false});
            },

            getSelectMessageSuccess: function (response) {
                var that = this;

                var folder = response.services;
                if(folder.length>0){
                    this.baseClass.feedback.showInfoLoading();
                    this.select.disabled = true;
                    this.baseClass.controlServiceInit += folder.length;
                    var countLyrName = folder.length;
                    var arraySup = [];
                    this.select.innerHTML = '<option value="-1">Select messages</option>';

                    ArrayUtils.forEach(folder, function(item,idx){
                        var url = that.configModel.modelServiceFolder+"/services/"+item.name+'/'+item.type;
                        esriRequest({
                            url: url+"/info/iteminfo",
                            content: {f:'json'},
                            callbackParamName: "callback",
                            handleAs: 'json',
                            timeout: that.timeoutValue,
                            load: function(response) {
                                var title = response.title;
                                arraySup.push({ innerHTML:title, id:idx , path:item.name+'/'+item.type});
                                that.baseClass.caricamentoServiziInit();
                                countLyrName--;
                                if(countLyrName == 0){
                                    arraySup = that.baseClass.sortByKey(arraySup, "innerHTML");

                                    ArrayUtils.forEach(arraySup, function(item){
                                        dojo.create("option", item, that.select);
                                    });

                                    that.select.disabled = false;
                                }

                            },
                            error: function(response) {
                                that.baseClass.showError(response);
                                countLyrName--;
                            }
                        }, {useProxy:false});

                    });
                }
            }


        });

    });
