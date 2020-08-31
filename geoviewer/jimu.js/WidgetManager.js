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
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/_base/html',
    './WidgetManagerOriginal',
  ],
  function(declare, lang, topic, html, WidgetManagerOriginal) {
    var instance = null,
      clazz = declare(WidgetManagerOriginal, {

        constructor: function() {
          //see panel manager
          topic.subscribe('/dnd/move/stop', lang.hitch(this, this._onMoveStop));
        },     
        
        _onMoveStop: function(mover){
          if(mover.node){            
            var top = html.getStyle(mover.node, 'top');
            if(top < 0){
              html.setStyle(mover.node, 'top', '0px');
            }  
          }
        },
           
      });

    clazz.getInstance = function(urlParams) {
      if (instance === null) {
        instance = new clazz(urlParams);
        window._widgetManager = instance;
      }
      return instance;
    };
    return clazz;
  });