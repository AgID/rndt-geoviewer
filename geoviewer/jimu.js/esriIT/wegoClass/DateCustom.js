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
define(["dojo/_base/declare"],
function (declare) {
    return declare(null, {

        baseWidget:null,

        getDate: function(date){
            return new Date(date);
        },

        getDateUTC: function(date,lng){//todo pulire

            var d = new Date(date);
            var gg = this.zeroPrefix(d.getUTCDate());
            var mm = d.getUTCMonth();
            mm = this.zeroPrefix(mm+1);
            var yy = d.getUTCFullYear();
            var h = this.zeroPrefix(d.getUTCHours());
            var m = this.zeroPrefix(d.getUTCMinutes());
            var s = this.zeroPrefix(d.getUTCSeconds());

            date = lng == 'it' ?  gg+'-'+mm+'-'+yy+' '+h+':'+m+':'+s : yy+'-'+mm+'-'+gg+' '+h+':'+m+':'+s;
            return date;
        },

        getDateFormat:function(date, lng, separator){

            var d = new Date(date);
            var gg = this.zeroPrefix(d.getDate());
            var mm = d.getMonth();
            mm = this.zeroPrefix(mm+1);
            var yy = d.getFullYear();
            var h = this.zeroPrefix(d.getHours());
            var m = this.zeroPrefix(d.getMinutes());
            var s = this.zeroPrefix(d.getSeconds());

            date = lng == 'it' ? gg+'-'+mm+'-'+yy+separator+h+':'+m+':'+s :  yy+'-'+mm+'-'+gg+separator+h+':'+m+':'+s;
            return date;
        },

        changeFormat: function(date, lng){
            return this.getDateFormat(date,lng,' ');
        },

        changeFormatPlus: function(date, lng){
            return this.getDateFormat(date,lng,'+');
        },

        zeroPrefix: function(str){
            if(str<10) str = '0'+str;
            return str;
        },

        getDateMoreDay: function(date, moreDay){
            var d = new Date(date);
            d.setDate(d.getDate() + moreDay);
            return d;
        },

        getTimeStamp: function(date){
            var d = date.split(" ");
            var dd = d[0];
            var hh = d[1];

            var d2 = dd.split("-");

            var fromTime = new Date(d2[1]+"/"+d2[0]+"/"+d2[2]+" "+hh) ;
            var timeSup = fromTime.getTime() - fromTime.getTimezoneOffset()*60*1000;

            return this.fixGetTime(timeSup);
        },

        fixGetTime: function(date, returnDate){
            if(date instanceof Date){
                date = date.getTime();
            }

            var timeSup = parseInt (parseInt(date/1000)+"000");

            if(returnDate){
                return new Date(timeSup);
            }

            return timeSup;
        },

        stampDate: function(date){
            var d = new Date(date);
            //d.setHours(d.getHours() + d.getTimezoneOffset()/60);
            return this.zeroPrefix(d.getUTCDate()) +
                '-' + this.zeroPrefix(d.getUTCMonth()+1) +
                '-' + this.zeroPrefix(d.getUTCFullYear()) +
                ' ' + this.zeroPrefix(d.getUTCHours()) +
                ':' + this.zeroPrefix(d.getUTCMinutes()) +
                ':' + this.zeroPrefix(d.getUTCSeconds());
        },

        getDateUTCFormatName: function(date, day, returnArray){
            var d = new Date(date);

            var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

            var str = day ? days[d.getUTCDay()]:"";

            str += ' ' + this.zeroPrefix(d.getUTCDate()) + ' ' + months[d.getUTCMonth()] + ' ' + this.zeroPrefix(d.getUTCFullYear());

            str += ' ' + this.zeroPrefix(d.getUTCHours());

            if(day){
                str += ':' + this.zeroPrefix(d.getUTCMinutes()) + ':' + this.zeroPrefix(d.getUTCSeconds());
            }


            return str;
        }



    });

});
