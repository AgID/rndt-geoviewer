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
define(["dojo/_base/declare","jimu/PanelManager","jimu/WidgetManager"],
function (declare,PanelManager,WidgetManager) {
    return declare(null, {

        openWidgetID: null,
        baseClass: null,
        nameOpen: null,
        nameClose: null,

        constructor: function (params) {
            if(params.id) this.openWidgetID = params.id;
            if(params.baseClass) this.baseClass = params.baseClass;
            if(params.nameOpen) this.nameOpen = params.nameOpen;
            if(params.nameClose) this.nameClose = params.nameClose;
        },

        openWidgetByMenu: function() {
            var topMenu = dojo.query("div.container-section.jimu-float-leading > div");

            if (!(topMenu && this.openWidgetID)) return false;

            var that = this;
            dojo.forEach(topMenu, function (item) {
                if (item.attributes.settingid.nodeValue == that.openWidgetID) {
                    item.click();
                }
            });

            return true;
        },

        openWidgetById: function(){
            if(!(this.baseClass && this.openWidgetID)) return false;

            this.baseClass.openWidgetById(this.openWidgetID).then(lang.hitch(this.baseClass, function(widget){
                WidgetManager.openWidget(widget);
            }));
            return true;
        },

        closeWidgetById: function(WidgetID){
            if(!WidgetID) WidgetID = this.openWidgetID;
            
            if(!(this.baseClass && WidgetID)) return false;

            var panelController = PanelManager.getInstance();

            var wB = this.appConfig.getConfigElementsByName(WidgetID);
            var wBId = wB[0].id;

            panelController.closePanel(wBId + '_panel');
            panelController.playClosePanelAnimation(wBId + '_panel');

            return true;
        }


        //todo metodo piu' pulito ma non selezional l'elemento sull'head menu
       /* openWidgetByInstance: function(){
            var panelController = PanelManager.getInstance();
            var widgetManager = WidgetManager.getInstance();
            var widgets = this.appConfig.getConfigElementsByName(this.nameOpen);
            var widgetId = widgets[0].id;

            var wB = this.appConfig.getConfigElementsByName(this.nameClose);
            var wBId = wB[0].id;

            this.openWidgetById(widgetId).then(lang.hitch(this, function(widget){
                panelController.closePanel(wBId + '_panel');
                panelController.playClosePanelAnimation(wBId + '_panel');
                widgetManager.openWidget(widget);
            }));
        }*/

    });

});
