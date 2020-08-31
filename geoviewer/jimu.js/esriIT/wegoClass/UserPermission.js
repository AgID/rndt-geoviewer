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

///////////////////////////////////////////////////////////////////////////
// Permission
//
// group 900 ... 999 amministratore non ancora gestito
// group 1200 ... 1299 meteogrammi Point
// group 1300 ... 1399 Vertical Diagram Point
// group 1400 ... 1499 area mappe
// group 1500 ... 1599 flight path Point
// group 1600 ... 1699 nowcasting
// group 1700 ... 1799 message
///////////////////////////////////////////////////////////////////////////
define([
    "dojo/_base/declare","dojo/_base/lang","esri/tasks/query","esri/tasks/QueryTask","esri/lang",
    "esri/layers/FeatureLayer","esri/tasks/RelationshipQuery","dojo/_base/array"
],
function (
    declare,lang,Query,QueryTask,esriLang,FeatureLayer,RelationshipQuery,ArrayUtils,Model) {
    return declare(null, {
        userPerm:null,
        idWhereModels: null,
        baseClass: null,
        descName: null,
        configUser: null,
        config: null,
        feedback: null,

        constructor: function (baseClass) {
            if(baseClass) this.initBaseClassVar(baseClass);

            this.idWhereModels = [];
            this.modelsFolder = [];
            this.descName = [];

            if(!userPerm) userPerm = [];
            this.userPerm = userPerm;

        },

        /**==========================================
            INIT
         ==========================================**/

        getToken: function(){
            return null;
        },

        setWidget: function(widget){
            this.baseClass = widget;
        },

        setFeedback: function(feedback){
            this.feedback = feedback;
        },

        initBaseClassVar: function(baseClass){
            this.baseClass = baseClass;
            this.config = baseClass.config;
            this.configUser = baseClass.config.connectionUser;
        },

        /**==========================================
         UTILITY
         ==========================================**/

        hideNode: function(node){
            node.style.display = "none";
        },

        showNode: function(node){
            node.style.display = "block";
        },

        addValueToPath: function(value){
            var pathComplete = this.config.pathServer + value;
            if(debug) console.log("[Chiamata path: "+pathComplete+"]");
            return this.addTokenToPath(pathComplete);
        },

        addPathServer: function(path){
            var pathComplete = this.config.pathServer + this.config.pathService + path;
            if(debug) console.log("[Chiamata path: "+pathComplete+"]");
            return this.addTokenToPath(pathComplete);
        },

        addTokenToPath: function(path){
            var token = this.getToken();
            if(!token) return path;

            var separator = "?";
            if(path.indexOf(separator)!=-1) separator = "&";
            return path+separator+"token=" + token;
        },


        /**==========================================
            PERMISSION
         ==========================================**/

        addPermission: function(permName){
            userPerm.push(permName);
            this.userPerm.push(permName);
        },

        havePermissions: function(arrayPermName){
            var that = this;
            var countPerm = 0;
            dojo.forEach(arrayPermName, function(item){
                if(that.havePermission(item)) countPerm++;
            });

            return arrayPermName.length == countPerm;
        },

        havePermission: function(permName){
            if(!(this.userPerm && this.userPerm.length != 0)) return false;

            var filteredArr = dojo.filter(this.userPerm, function(item){
                return item.perm_name == permName;//okkio perm_name viene dai permessi settati
            });
            return filteredArr.length != 0;
        },

        hideNotPermissionNode: function(objParams){
            var that = this;
            if(lang.isArray(objParams.permName)){
                var filterPermission = dojo.filter(objParams.permName,function(item){
                    return !that.havePermission(item);
                });
                if(filterPermission.length == objParams.permName.length) this.hideNode(objParams.node)
            }else{
                if(!this.havePermission(objParams.permName)) this.hideNode(objParams.node);
            }
        },

        hideNotPermissionNodes: function(arrayPermObj){
            var that = this;
            dojo.forEach(arrayPermObj, function(item){
                that.hideNotPermissionNode(item);
            });
        },

        /**==========================================
            QUERY
         ==========================================**/

        getUser: function(){
            this.feedback.showInfoLoading();
            var urlQueryTask = this.addPathServer(this.configUser.nameUserRole.idLayer);
            var queryTask = new QueryTask(urlQueryTask);
            var query = new Query();
            query.returnGeometry = false;
            query.outFields = [this.configUser.nameUserRole.outFields];
            query.where = esriLang.substitute({userCrd: userCrd}, this.configUser.nameUserRole.where);
            queryTask.execute(query, lang.hitch(this, this.getUserSuccess), lang.hitch(this.baseClass, this.baseClass.showError));
        },

        getUserSuccess: function(result) {
            if(!(result.features.length>0)) window.location = locationProgect+"/WEGO-"+verWego+"/auth.html";

            if(result.features[0].attributes[this.configUser.nameUserRole.outFields]){
                userGroup = result.features[0].attributes[this.configUser.nameUserRole.outFields].trim();
                if(userGroup){
                    var urlQueryTask = this.addPathServer(this.configUser.groupPermission.idLayer);
                    var queryTask = new QueryTask(urlQueryTask);

                    var query = new Query();
                    query.returnGeometry = false;
                    query.outFields = [this.configUser.groupPermission.outFields];
                    query.where =  esriLang.substitute({Group_id: userGroup}, this.configUser.groupPermission.where);

                    queryTask.execute(query, lang.hitch(this, this.getGroupUserSuccess), lang.hitch(this.baseClass, this.baseClass.showError));
                }
            }
        },
        
        getGroupUserSuccess: function(result){
            var that = this;
            var arraySuppIds = [];
            ArrayUtils.forEach(result.features, function(item){
                arraySuppIds.push(item.attributes[that.configUser.groupPermission.outFields]);
            });

            var urlFeatureLayer = this.addPathServer(this.configUser.groupPermission.idLayer);
            var featureLayer = new FeatureLayer(urlFeatureLayer);

            var relatedQuery = new RelationshipQuery();
            relatedQuery.objectIds = arraySuppIds;
            relatedQuery.returnGeometry = false;
            relatedQuery.outFields = [this.configUser.groupPermission.relationship.outFields];
            relatedQuery.relationshipId = this.configUser.groupPermission.relationship.idLyrRel;

            featureLayer.queryRelatedFeatures(relatedQuery, lang.hitch(this, this.getGroupUserRelatedSuccess), lang.hitch(this, this.baseClass.showError));
        },

        getGroupUserRelatedSuccess: function(relatedRecords) {//todo pulire metodo
            var relationShipFields = this.configUser.groupPermission.relationship.fields;
            for (var i in relatedRecords) {//todo usare forEach
                var ftRel = relatedRecords[i].features[0];
                this.addPermission(ftRel.attributes);
                if(ftRel.attributes[relationShipFields.perm_name]=="service-wego-area-prod"){
                    this.idWhereModels.push(ftRel.attributes[relationShipFields.OBJECTID]);
                    var objId = ftRel.attributes[relationShipFields.wego_model_id];
                    this.modelsFolder[objId] = ftRel.attributes[relationShipFields.service_collection];
                }
                this.descName.push(ftRel.attributes[relationShipFields.perm_desc]);
            }

            this.feedback.hideLoader();
            if(this.baseClass) this.baseClass.openOtherWidget();
        }

    });

});
