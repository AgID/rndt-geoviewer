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
function (declare,lang,Query,QueryTask,esriLang,FeatureLayer,RelationshipQuery,ArrayUtils,esriRequest,
	configModelFile,json) {
    return declare(null, {
        configModel: null,
        baseClass: null,
        config: null,
        select: null,
        selectRun: null,
        selectParameter: null,
        countImpactsTime: null,
        timeoutValue: 10000,  //10s timeout for esriRequest calls

        constructor: function (params) {

            this.configModel = JSON.parse(configModelFile);

            if(params.baseClass){
                this.baseClass = params.baseClass;
                this.config = params.baseClass.config;
                this.selectedModel = this.configModel.selectedModel;
            }
            if(params.select) this.select = params.select;
            if(params.selectRun) this.selectRun = params.selectRun;
            if(params.selectParameter){
                this.selectParameter = params.selectParameter;
                this.selectParameter.disabled = true;
            }


            if(!params.control && this.configModel) this.requestModel();

        },

        showErrorModel: function(error) {
            if(this.selectRun) this.selectRun.disabled = true;
            if(this.selectParameter) this.selectParameter.disabled = true;

            this.baseClass.showError(error);
        },

        controlNameOption: function(str){
            if(str.indexOf("_") !=-1){
                str = str.replace("_","-");
                this.controlNameOption(str);
            }
            return str;
        },

        requestModel: function(){
            esriRequest({
                url: this.configModel.modelServiceFolder,
                content: {f:'json'},
                callbackParamName: "callback",
                timeout: this.timeoutValue,
                handleAs: 'json',
                load: lang.hitch(this, this.getModel),
                error: lang.hitch(this, this.showErrorModel)
            }, {useProxy:false});
        },

        getModel: function(response){

            var sourceNameArray = [];
            for(var i = 0; i < response.folders.length; i++){
                if(response.folders[i].indexOf(this.configModel.nameInitModel) != -1){
                    sourceNameArray.push(response.folders[i].replace(this.configModel.nameInitModel,"",response[i]));
                }
            }

            var urlTask = this.configModel.backendFolder+this.configModel.model.idLayer;

            var queryTask = new QueryTask(urlTask);
            var query = new Query(urlTask);
            query.returnGeometry = false;
            query.outFields = [this.configModel.model.relationship.outFields];
            query.where = this.configModel.model.relationship.fields.name+" in ('"+sourceNameArray.join("','")+"')";

            queryTask.execute(query,lang.hitch(this, this.getModelSuccess, sourceNameArray), lang.hitch(this, this.showErrorModel));

        },



        getModelSuccess: function(sourceNameArray, result){

            var that = this;
            if(this.baseClass) this.baseClass.caricamentoServiziInit();
            this.select.innerHTML = '';
            this.select.disabled = false;

            var relationShipFields = this.configModel.model.relationship.fields;
            for (var i=0;i<result.features.length; i++) {
                var item = result.features[i];

                var position = sourceNameArray.indexOf(item.attributes[relationShipFields.name]);

                if(position != -1 && sourceNameArray[position] == item.attributes[relationShipFields.name]){
                    dojo.create("option", {
                        innerHTML: this.controlNameOption(item.attributes[relationShipFields.name]),
                        value: this.configModel.nameInitModel+item.attributes[relationShipFields.name],
                        id: item.attributes[relationShipFields.id],
                        gridId: item.attributes[relationShipFields.gridId],
                        timestep_id: item.attributes[relationShipFields.timestep_id],
                        family: item.attributes[relationShipFields.family]
                    }, this.select);
                }

            }

            if(!this.select.options) return;

            ArrayUtils.forEach(this.configModel.arrayDisabledModel, function(item){
                if(that.select.options[item]) that.select.options[item].disabled="disabled";
            });

            if(!this.select.options[this.selectedModel]){

                ArrayUtils.forEach(this.select.options,function(item,idx){
                    if(item.disabled!="disabled" && that.selectedModel == that.configModel.selectedModel){
                        that.selectedModel = idx;
                    }
                });
            }

            if(this.select.options[this.selectedModel]){
                this.select.options[this.selectedModel].selected="selected";
                this.getTimeStep(this.select.options[this.selectedModel]);
            }
        },

        getTimeStepImpacts: function(configModel){
            //this.baseClass.feedback.showInfoLoading();
            var idModel = this.select.options[this.select.selectedIndex].attributes["id"].value;

            var result = configModel[idModel].items;

            this.baseClass.arrayTime = [];
            for(var key in result){
                this.countImpactsTime++;
                var urlTask = this.configModel.backendFolder+ this.configModel.timeStep.idLayer;
                var queryTask = new QueryTask(urlTask);
                var query = new Query();
                query.where =  esriLang.substitute({timestepId: result[key].timestep_id}, this.configModel.timeStep.where);
                query.outFields = this.configModel.timeStep.outFields;
                query.returnGeometry = false;
                queryTask.execute(query, lang.hitch(this, this.getTimeStepSuccessImpacts, result[key],key), lang.hitch(this.baseClass, this.baseClass.showError));
            }

        },

        getTimeStepSuccessImpacts: function (item,key,featureSet) {
            if(!this.baseClass) return;
            this.countImpactsTime--;

            var ctf = this.configModel.timeStep.field;
            var attr = featureSet.features[0].attributes;

            var params = {
                corsaTimeStops: attr[ctf.n_hours],
                supEnd: (Number(attr[ctf.gg])),
                startTimeStart: attr[ctf.start],
                stepTimeEnd: attr[ctf.end],
                numberStepTime: attr[ctf.step],
                n_days: attr[ctf.gg],
                configRun: this.configModel.run
            };

            item.corsaTimeStops = params.corsaTimeStops;

            item.item = key;
            item.n_days = (Number(params.supEnd)/24);
            item.n_step = Number(params.supEnd / this.baseClass.corsaTimeStops) +1;

            item.startTimeStart = params.startTimeStart;
            item.stepTimeEnd = params.stepTimeEnd;
            item.numberStepTime = params.numberStepTime;

            this.baseClass.arrayTime.push(item);
            if(this.countImpactsTime == 0){
                this.getCorseImpacts(this.configModel.run);
            }
        },

        getCorseImpacts: function(configRun){
            //todo array this.baseClass.arrayTime
            var where = "";
            var arraySupModelId = [];
            ArrayUtils.forEach(this.baseClass.arrayTime, function(item){
                arraySupModelId.push(item.model_id);
                if(where != "") where +=" OR ";
                where += esriLang.substitute({Model_id: item.model_id}, configRun.where);
            });
            var queryTask = new QueryTask(this.configModel.backendFolder+configRun.idLayer);
            var query = new Query();
            query.where =  where;
            query.outFields = configRun.outFields;
            query.orderByFields = [configRun.orderByFields];
            query.returnGeometry = false;
            queryTask.execute(query, lang.hitch(this, this.getCorseSuccessImpacts, arraySupModelId, configRun), lang.hitch(this, this.showError));
        },

        getCorseSuccessImpacts: function (arraySupModelId, configRun, featureSet) {
            var that = this;
            if(featureSet.features.length>0){
                var arraySup = [];
                ArrayUtils.forEach(featureSet.features, function(item){
                    if(arraySupModelId[0] == item.attributes[configRun.field.wego_model_id]){
                        arraySup.push(item.attributes[configRun.field.name]);
                    }
                });

                this.selectRun.innerHTML = '';
                this.selectRun.disabled = true;


                ArrayUtils.forEach(featureSet.features, function(item,idx){
                    if(item.attributes[configRun.field.wego_model_id] == arraySupModelId[0]) return;

                    var dt = that.baseClass.dateCustom.getDateUTC(item.attributes[configRun.field.name],'it');

                    if(arraySup.indexOf(item.attributes[configRun.field.name]) != -1){
                        dojo.create("option", {
                            innerHTML: dt,
                            run:dt,
                            runSelect:dt,
                            original:item.attributes[configRun.field.name]
                        }, that.selectRun);
                    }

                });
                if(this.selectRun) this.selectRun.disabled = false;
                if(this.selectParameter) this.selectParameter.disabled = false;
            }else{
                if(this.selectParameter) this.selectParameter.disabled = true;
            }
            //this.baseClass.caricamentoServiziInit();
            this.baseClass.feedback.hideLoader();
            this.baseClass._getTimeStepSuccess();

        },

        getTimeStep: function(optionModel){
            var urlTask = this.configModel.backendFolder+this.configModel.timeStep.idLayer;
            var queryTask = new QueryTask(urlTask);
            var query = new Query();
            query.where =  esriLang.substitute({timestepId: optionModel.attributes["timestep_Id"].value}, this.configModel.timeStep.where);
            query.outFields = this.configModel.timeStep.outFields;
            query.returnGeometry = false;
            queryTask.execute(query, lang.hitch(this, this.getTimeStepSuccess, optionModel), lang.hitch(this.baseClass, this.baseClass.showError));
        },

        getTimeStepSuccess: function (optionModel, featureSet) {
            if(!this.baseClass) return;

            var ctf = this.configModel.timeStep.field;
            var attr = featureSet.features[0].attributes;

            var params = {
                corsaTimeStops: attr[ctf.n_hours],
                supEnd: (Number(attr[ctf.gg])),
                startTimeStart: attr[ctf.start],
                stepTimeEnd: attr[ctf.end],
                numberStepTime: attr[ctf.step],
                n_days: attr[ctf.gg],
                configRun: this.configModel.run
            };

            this.baseClass.corsaTimeStops = params.corsaTimeStops;

            this.baseClass.n_days = (Number(params.supEnd)/24) - 1;
            this.baseClass.n_step = Number(params.supEnd / this.baseClass.corsaTimeStops) + 1;

            this.baseClass.startTimeStart = params.startTimeStart;
            this.baseClass.stepTimeEnd = params.stepTimeEnd;
            this.baseClass.numberStepTime = params.numberStepTime;

            if(this.selectRun){
                this.getCorse(optionModel,this.configModel.run);
            }else{
                this.baseClass._getTimeStepSuccess();
            }

        },

        getCorse: function(opt,configRun){
            var queryTask = new QueryTask(this.configModel.backendFolder+configRun.idLayer);
            var query = new Query();
            query.where =  esriLang.substitute({Model_id: opt.id}, configRun.where);
            query.outFields = configRun.outFields;
            query.orderByFields = [configRun.orderByFields];
            query.returnGeometry = false;
            queryTask.execute(query, lang.hitch(this, this.getCorseSuccess, opt, configRun), lang.hitch(this, this.showError));
        },

        getCorseSuccess: function (opt, configRun, featureSet) {

            var that = this;
            this.baseClass.optRun = opt;
            if(featureSet.features.length>0){
                var firstDate = this.baseClass.dateCustom.getDateUTC(featureSet.features[0].attributes[configRun.field.name]);

                this.baseClass.firstDate = firstDate;
                this.baseClass.timestepId = featureSet.features[0].attributes[configRun.field.id];

                this.objTime = {
                    model_id: opt.id,
                    modelSelect: opt.text,
                    gridId: opt.attributes["gridId"].value,
                    family: opt.attributes["family"].value,
                    timestep_id: opt.attributes["timestep_id"].value,
                    runSelect: firstDate,
                    timestepId: this.baseClass.timestepId,
                    n_days: this.baseClass.n_days,
                    corsaTimeStops: this.baseClass.corsaTimeStops,
                    selectRun: this.baseClass.objTime && this.baseClass.objTime.satTime,
                    satTime: false
                };

                this.baseClass.objTime = this.objTime;
                this.baseClass.dataTime = this.objTime;

                if(typeof this.baseClass._setGrid === 'function'){
                    this.baseClass._setGrid();
                }
                
                this.selectRun.innerHTML = '';
                this.selectRun.disabled = false;

                ArrayUtils.forEach(featureSet.features, function(item){
                    var dt = that.baseClass.dateCustom.getDateUTC(item.attributes[configRun.field.name],'it');
                    dojo.create("option", {
                        innerHTML: dt,
                        timestepId: item.attributes[configRun.field.id],
                        run:dt,
                        runSelect:dt,
                        original:item.attributes[configRun.field.name]
                    }, that.selectRun);
                });

                if(typeof this.baseClass.runVoiceSelector === 'function'){
                    this.baseClass.runVoiceSelector();
                }

                
                this.selectRun.disabled = false;
                this.selectParameter.disabled = false;
            }else{
                this.selectRun.disabled = true;
                this.selectParameter.disabled = true;
                this.selectRun.innerHTML = '<option value="-1">No run found</option>';
                this.selectParameter.innerHTML = '<option value="-1">No parameter found</option>';
            }
            this.baseClass.caricamentoServiziInit();
            this.baseClass._getTimeStepSuccess();

        }
    });

});
