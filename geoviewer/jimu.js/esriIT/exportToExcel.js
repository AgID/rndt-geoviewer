define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "dojo/has", 'jimu/utils', "dojo/json", "dojo/_base/sniff" ],
    function ( declare, lang, array, has, jimuUtils, JSON ) {
    return declare(null, {

        csvSeparator: ';',

        constructor: function ( nomiFogliExcel, strData, strDelimiter, nomeFile ) {
            if ( strDelimiter ) {
                this.csvSeparator = strDelimiter;
            }

            if ( lang.isArray(nomiFogliExcel) && nomiFogliExcel.length > 0 && lang.isArray(strData) && strData.length > 0 ) {
                var fileContent = this.convertCSVArrayToXLS(nomiFogliExcel, strData);
                this.download(fileContent, nomeFile + this.__getDateForFilename() + ".xls", "application/vnd.ms-excel");
            }
        },

        setQueryResults: function(results)
        {
            var arrayPaginaUnica = [], rowId;
            arrayPaginaUnica[0] = [];

            var fieldTypes = {};

            array.forEach(results.fields, function( field ){//map name-> type
                fieldTypes[ field.name ] = field.type;
            });

            array.forEach( Object.keys(results.fieldAliases), function( fieldName ){//prima riga le colonne
                arrayPaginaUnica[0].push( results.fieldAliases[fieldName] );
            });


            array.forEach(results.features, function( row ){//prima riga le colonne
                arrayPaginaUnica.push([]);
                rowId = arrayPaginaUnica.length - 1;
                array.forEach( Object.keys(row.attributes), function( columnName ) {

                    var cell = row.attributes[columnName];
                    if ( fieldTypes[columnName] === "esriFieldTypeDate"){
                        cell = jimuUtils.fieldFormatter.getFormattedDate(cell);
                    }

                    arrayPaginaUnica[rowId].push(cell);
                });
            });


            return arrayPaginaUnica;
        },


        __getDateForFilename: function(){

            var date = new Date();
            var day = date.getDate();
            var monthIndex = date.getMonth() + 1;
            var year = date.getFullYear();

            return ' ' + day + '-' + monthIndex + '-' + year;
        },

        downloadArray: function( arrayData, paginaExcelName, fileName ){
            var fileContent = this.convertCSVArrayToXLS([ paginaExcelName ], [ arrayData ]);
            this.download(fileContent, fileName + this.__getDateForFilename() + ".xls", "application/vnd.ms-excel");
        },

        _CSVToArray: function ( strData, strDelimiter ) {
            // Check to see if the delimiter is defined. If not,
            // then default to comma.
            strDelimiter = (strDelimiter || ",");

            // Create a regular expression to parse the CSV values.
            var objPattern = new RegExp(
                (
                    // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                    // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                    // Standard fields.
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
                ),
                "gi"
            );


            // Create an array to hold our data. Give the array
            // a default empty first row.
            var arrData = [[]];

            // Create an array to hold our individual pattern
            // matching groups.
            var strMatchedValue = null, strMatchedDelimiter;


            // Keep looping over the regular expression matches
            // until we can no longer find a match.
            var arrMatches = objPattern.exec(strData);
            while ( arrMatches ) {

                // Get the delimiter that was found.
                strMatchedDelimiter = arrMatches[1];

                // Check to see if the given delimiter has a length
                // (is not the start of string) and if it matches
                // field delimiter. If id does not, then we know
                // that this delimiter is a row delimiter.
                if (
                    strMatchedDelimiter.length &&
                    (strMatchedDelimiter !== strDelimiter)
                ) {

                    // Since we have reached a new row of data,
                    // add an empty row to our data array.
                    arrData.push([]);

                }

                // Now that we have our delimiter out of the way,
                // let's check to see which kind of value we
                // captured (quoted or unquoted).
                strMatchedValue = null;
                if ( arrMatches[2] ) {

                    // We found a quoted value. When we capture
                    // this value, unescape any double quotes.
                    strMatchedValue = arrMatches[2].replace(
                        new RegExp("\"\"", "g"),
                        "\""
                    );

                } else {

                    // We found a non-quoted value.
                    strMatchedValue = arrMatches[3];

                }


                // Now that we have our value string, let's add
                // it to the data array.
                arrData[arrData.length - 1].push(strMatchedValue);

                arrMatches = objPattern.exec(strData);
            }

            // Return the parsed data.
            return arrData;
        },

        _LeftTrim: function ( value ) {
            var re = /s*((S+s*)*)/;
            return value.replace(re, "$1");
        },

        _RightTrim: function ( value ) {
            var re = /((s*S+)*)s*/;
            return value.replace(re, "$1");
        },

        _trim: function ( value ) {
            return this._LeftTrim(this._RightTrim(value));
        },

        _xml_encode: function ( input ) {

            if ( input === undefined ) {
                window.alert("(xml_encode) errore di codifica: input undefined");
                return;
            }

            if ( input === null )
            {
                input = "";
            }
            //input = this._trim(input.toString()).trim();
            input = input.trim();//SOLO IE9+

            input = input.replace(/&/g, '&amp;');
            input = input.replace(/</g, '&lt;');
            input = input.replace(/>/g, '&gt;');
            input = input.replace(/'/g, '&apos;');
            input = input.replace(/"/g, '&quot;');
            input = input.replace(/\n/g, '');
            input = input.replace(/\r/g, '');



            return input;
        },

        _xml_decode: function ( input ) {

            if ( input === undefined ) {
                window.alert("(xml_encode) errore di codifica: input undefined");
                return;
            }

            input = this._trim(input.toString());
            input = input.replace(/&amp;/g, '&');
            input = input.replace(/&lt;/g, '<');
            input = input.replace(/&gt;/g, '>');
            input = input.replace(/&apos;/g, "'");
            input = input.replace(/&quot;/g, '"');

            return input;
        },


        _isNumeric: function ( num ) {
            return !isNaN(num) && num !== ' ' && num !== null;
        },


        __IE9convertCSVArrayToXLS: function( nomiFogliExcel, csv_array ){

            var ie9Data = [];

            array.forEach( csv_array, function( pagina_csv, i ) {

                if ( typeof pagina_csv === "string" ) {
                    pagina_csv = this._CSVToArray(this._xml_decode(pagina_csv), this.csvSeparator);
                }


                var pagina = [], row = {}, j, y;
                var headers = pagina_csv[0];
                pagina.push(headers);

                for( j = 1; j < pagina_csv.length; j++) {
                    for( y = 0; y < headers.length; y++){
                        row[ headers[y] ] = pagina_csv[j][y];
                    }
                    pagina.push( row );
                }


                //var tabName = nomiFogliExcel[i] || ('Foglio' + (i + 1));
                var fileName = nomiFogliExcel[i];
                fileName = fileName.substring(0, fileName.lastIndexOf('.'));
                ie9Data.push({ nameFile: nomiFogliExcel[i], objData: pagina, tabs: [] });

            }, this);

            return ie9Data;

        },

        convertCSVArrayToXLS: function ( nomiFogliExcel, csv_array )
        {

            //passa sempre per FileService
            return this.__IE9convertCSVArrayToXLS( nomiFogliExcel, csv_array );


            if ( has("ie") <= 9 ){
                return this.__IE9convertCSVArrayToXLS( nomiFogliExcel, csv_array );
            }

            var xml = [];
            //xml.push('\ufeff<?xml version="1.0"?>');// per utf-8 \ufeff
            xml.push('<?xml version="1.0"?>');// per utf-8 \ufeff
            xml.push('<?mso-application progid="Excel.Sheet"?>');
            xml.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">');
            xml.push('<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">');
            xml.push('<Author>ESRI Italia S.p.A.</Author>');
            xml.push('<LastAuthor>ESRI Italia S.p.A.</LastAuthor>');
            xml.push('<Created>2014-01-01T12:00:00Z</Created>');
            xml.push('<Version>14.00</Version>');
            xml.push('</DocumentProperties>');


            xml.push('<OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">');
            xml.push('<AllowPNG/>');
            xml.push('</OfficeDocumentSettings>');
            xml.push('<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">');
            xml.push('<WindowHeight>6000</WindowHeight>');
            xml.push('<WindowWidth>6000</WindowWidth>');
            xml.push('<WindowTopX>255</WindowTopX>');
            xml.push('<WindowTopY>255</WindowTopY>');
            xml.push('<ProtectStructure>False</ProtectStructure>');
            xml.push('<ProtectWindows>False</ProtectWindows>');
            xml.push('</ExcelWorkbook>');
            xml.push('<Styles>');
            xml.push('<Style ss:ID="Default" ss:Name="Normal">');
            xml.push('<Alignment ss:Vertical="Bottom"/>');
            xml.push('<Borders/>');
            xml.push('<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>');
            xml.push('<Interior/>');
            xml.push('<NumberFormat/>');
            xml.push('<Protection/>');
            xml.push('</Style>');
            xml.push('</Styles>');

            var worksheetName, y, j;
            
            array.forEach( csv_array, function( pagina_csv, i ){

                if ( typeof pagina_csv === "string")
                {
                    pagina_csv = this._CSVToArray(this._xml_decode(pagina_csv), this.csvSeparator);
                }


                worksheetName = (nomiFogliExcel[i]) || ('Foglio' + (i + 1));
                xml.push('<Worksheet ss:Name="' + worksheetName + '">');

                xml.push('<Table ss:ExpandedColumnCount="' + pagina_csv[0].length + '" ss:ExpandedRowCount="' + pagina_csv.length + '" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">');
                //xml.push('<Table  x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">');//ss:ExpandedColumnCount ss:ExpandedRowCount rompono il file
                //xml.push('<Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">');


                for ( y = 0; y < pagina_csv.length; y++ )//per ogni riga
                {

                    xml.push('<Row ss:AutoFitHeight="0">');
                    for ( j = 0; j < pagina_csv[y].length; j++ )//per ogni cell
                    {
                        /*if (j >= 1663){
                         break;//libre office column limitation a quanto pare
                         }*/

                        if ( this._isNumeric(pagina_csv[y][j]) ) {
                            xml.push('<Cell><Data ss:Type="Number">' + (pagina_csv[y][j]) + '</Data></Cell>');//encode just in case
                        }
                        else {
                            xml.push('<Cell><Data ss:Type="String">' + this._xml_encode(pagina_csv[y][j]) + '</Data></Cell>');
                        }
                    }
                    xml.push('</Row>');

                }

                xml.push('</Table>');
                xml.push('<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">');
                xml.push('<PageSetup>');
                xml.push('<Header x:Margin="0.3"/>');
                xml.push('<Footer x:Margin="0.3"/>');
                xml.push('<PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>');
                xml.push('</PageSetup>');
                xml.push('<Unsynced/>');
                xml.push('<ProtectObjects>False</ProtectObjects>');
                xml.push('<ProtectScenarios>False</ProtectScenarios>');
                xml.push('</WorksheetOptions>');
                xml.push('</Worksheet>');
            }, this);


            xml.push('</Workbook>');

            return xml.join("\r\n");

        },

        //tutti i browser devono passare per il fileService
        download: function ( strData, strFileName, strMimeType ) {
            //var D = document, a = D.createElement("a");
            //strMimeType = strMimeType || "application/octet-stream";
            //if ( strMimeType.toLowerCase().indexOf('charset') === -1 ) {
            //    strMimeType += ';charset=UTF-8';
            //}
            //if ( navigator.msSaveBlob ) { // IE10
            //    return navigator.msSaveBlob(new Blob([strData], {
            //        type: strMimeType
            //    }), strFileName);
            //}
            //if ( 'download' in a ) { // html5 A[download]
            //    if ( Blob ) {
            //        var blobValue = new Blob(["\ufeff", strData], {
            //            encoding: "UTF-8",
            //            type: strMimeType
            //        });
            //        a.href = URL.createObjectURL(blobValue);
            //    } else {
            //        a.href = "data:" + strMimeType + "," + strData;
            //    }
            //    a.setAttribute("download", strFileName);
            //    a.innerHTML = "downloading...";
            //    D.body.appendChild(a);
            //    setTimeout(function () {
            //        a.click();
            //        D.body.removeChild(a);
            //    }, 66);
            //    return true;
            //}
            ///* end if('download' in a) */
            //if ( has("ie") <= 9 ) {

                var form = document.createElement('form');
                form.action = location.pathname.replace(/\/[^/]+$/, '') + '/FileService/ServiceFile.ashx';
                form.method = 'POST';
                form.target = 'downloadIframe';//'_blank';


                var jData = {
                        "nameZip": strFileName,
                        "directDownload": 0,
                        "isCSV": 0,
                        "convertData": "1",
                        "callToken": 0,
                        "queryParameter": {},
                        "parameterAttribute": {},
                        "files": strData, /*[{
                            "nameFile": "dati Prova",
                            "objData": [["OBJECTID", "NAME", "TYPE", "STATEFIPS", "COUNTYFIPS", "LOCALFIPS",
                                "SQUAREMILE", "REVISIONDA", "SHAPE_Length", "SHAPE_Area"],
                                {
                                "OBJECTID": 1,
                                "NAME": "Farmington",
                                "TYPE": "City",
                                "STATEFIPS": "26",
                                "COUNTYFIPS": "125",
                                "LOCALFIPS": "27380",
                                "SQUAREMILE": 2.66448482,
                                "REVISIONDA": 1146614400000,
                                "SHAPE_Length": 59188.91597934275,
                                "SHAPE_Area": 74281574.01680636
                            }, {
                                "OBJECTID": 2,
                                "NAME": "Farmington Hills",
                                "TYPE": "City",
                                "STATEFIPS": "26",
                                "COUNTYFIPS": "125",
                                "LOCALFIPS": "27440",
                                "SQUAREMILE": 33.29854028,
                                "REVISIONDA": 1146614400000,
                                "SHAPE_Length": 181859.09900748872,
                                "SHAPE_Area": 928309272.2392159
                            }, {
                                "OBJECTID": 13,
                                "NAME": "Southfield",
                                "TYPE": "City",
                                "STATEFIPS": "26",
                                "COUNTYFIPS": "125",
                                "LOCALFIPS": "74900",
                                "SQUAREMILE": 26.27247276,
                                "REVISIONDA": null,
                                "SHAPE_Length": 148327.82225335555,
                                "SHAPE_Area ": 732461035.2827194
                            }],
                            "tabs": []
                        }],*/
                        "forceZIP": true
                    };

             /*   var jsonObject = JSON.stringify({
                    "fileZipName": strFileName,
                    "elencoFiles": [
                        {"fileName": strFileName, "content": escape(strData.replace(/\./g, ",")) }
                    ]
                });*/



                var i = document.createElement('input');
                i.type = 'hidden';
                i.name = 'operation';
                i.value = 'excelfromdata';
                form.appendChild(i);



                var i = document.createElement('input');
                i.type = 'hidden';
                i.name = 'jData';
                i.value = JSON.stringify( jData );
                form.appendChild(i);


                var iframe = document.createElement('iframe');
                iframe.name = "downloadIframe";
                iframe.style.display = 'none';
                document.body.insertBefore(iframe, null);
                iframe.appendChild(form);


                // form.submit();

                this.submitWithCallback(form, iframe, function () {
                    form.parentNode.removeChild(form);
                });

                return true;
            //}
            //// do iframe dataURL download (old ch+FF):
            //var f = D.createElement("iframe");
            //if ( has("ie") <= 9 ) {
            //    document.body.appendChild(f);
            //} else {
            //    D.body.appendChild(f);
            //}
            //f.src = "data:" + strMimeType + "," + strData;
            //setTimeout(function () {
            //    if ( has("ie") <= 9 ) {
            //        document.body.removeChild(f);
            //    } else {
            //        D.body.removeChild(f);
            //    }
            //}, 333);
            //return true;
        },


        submitWithCallback: function ( form, frame, successFunction ) {
            var callback = function () {
                if ( successFunction ){
                    successFunction();
                }
                //frame.unbind('load', callback);
                frame.onload = null;
            };


            frame.onload = callback;
            //frame.bind('load', callback);
            form.submit();
        }

    });
});