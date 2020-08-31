/**
 * DOCUMENTAZIONE per new JSZip():
 * https://stuk.github.io/jszip/documentation/
 */

define([
        'dojo/_base/declare',
        "dojo/_base/array",
        "jimu/esriIT/downloadZip/lib/jszip.min",
        "jimu/esriIT/downloadZip/Saver"

    ],
    function(declare,
             arrayUtils,
             JSZip,
             Saver
    ){
        return declare(null, {
            zip:    '',

            constructor: function(){
                this.zip = new JSZip();
            },


            /**===================================================
                 ADD ARRAY FILE
                 request: arrayFileName (array nomi file),
                          fileExtension (estensione dei file),
                          arrayFile (array di file)
                 action: aggiunge ogni file all'oggetto zip
            ==================================================**/

            addArrayFile:function(arrayFileName,fileExtension,arrayFile){
                var count = 0;
                var that = this;
                arrayUtils.forEach(arrayFile, function(object){
                    that.zip.file(arrayFileName[count]+"."+fileExtension, object);
                    count++;
                });
            },


            /**===================================================
                 ADD FILE
                 request: fileName (nome file),
                          fileExtension (estensione file),
                          fileContent (contenuto del file)
                 action: aggiunge il file all'oggetto zip
            ===================================================**/

            addFile:function(fileName,fileExtension,fileContent){
                this.zip.file(fileName+"."+fileExtension, fileContent);
            },


            /**===================================================
                DOWNLOAD
                request: nameFile
                action: scarica file nameFile.zip
            ====================================================**/

            download: function(nameFile){

                //cancellare  anche
               // "jimu/esriIT/downloadZip/lib/FileSaver"

                var content = this.zip.generate({type:"blob"});
                new Saver(content, nameFile+".zip");
                 //saveAs(content, nameFile+".zip");

                /*var strData = this.zip;
                var strFileName = nameFile+'.zip';
                var strMimeType ="application/zip";

                var D = document, a = D.createElement("a");
                strMimeType = strMimeType || "application/octet-stream";
                if (strMimeType.toLowerCase().indexOf('charset') == -1){strMimeType += ';charset=UTF-8';}
                if (navigator.msSaveBlob) { // IE10
                    return navigator.msSaveBlob(new Blob([ strData ], {
                        type : strMimeType
                    }), strFileName);
                }
                if ('download' in a) { // html5 A[download]
                    if (Blob) {
                        var blobValue = new Blob([ "\ufeff", strData ], {
                            encoding : "UTF-8",
                            type : strMimeType
                        });
                        a.href = URL.createObjectURL(blobValue);
                    } else {a.href = "data:" + strMimeType + "," + strData;}
                    a.setAttribute("download", strFileName);
                    a.innerHTML = "downloading...";
                    D.body.appendChild(a);
                    setTimeout(function() {
                        a.click();
                        D.body.removeChild(a);
                    }, 66);
                    return true;
                } /* end if('download' in a) */
                /*if (dojo.isIE <= 9) {

                    var form = document.createElement('form');
                    form.action= location.pathname.replace(/\/[^/]+$/, '') + '/IE9Support/download.aspx';
                    form.method='POST';
                    form.target='downloadIframe';//'_blank';

                    var i=document.createElement('input');
                    i.type='hidden';
                    i.name='fileName';
                    i.value=strFileName;
                    form.appendChild(i);

                    var y=document.createElement('input');
                    y.type='hidden';
                    y.name='fileContent';
                    y.value= escape( strData.replace(/\./g, ",") );//escape per colpa di IIS .net 4.0 con la sua HttpRequestValidationException
                    form.appendChild(y);




                    var iframe = document.createElement('iframe');
                    iframe.name="downloadIframe";
                    iframe.style.display = 'none';
                    document.body.insertBefore(iframe, null);
                    iframe.appendChild(form);



                    // form.submit();

                    this.submitWithCallback( form, iframe, function() {
                        form.parentNode.removeChild(form);
                    } );
                    return true;
                }
                // do iframe dataURL download (old ch+FF):
                var f = D.createElement("iframe");
                if (dojo.isIE <= 9){document.body.appendChild(f);} else {D.body.appendChild(f);}
                f.src = "data:" + strMimeType + "," + strData;
                setTimeout(function() {
                    if (dojo.isIE <= 9){document.body.removeChild(f);} else {D.body.removeChild(f);}
                }, 333);
                return true;*/
            },
            submitWithCallback: function (form, frame, successFunction) {
                var callback = function () {
                    if(successFunction)
                        successFunction();
                    //frame.unbind('load', callback);
                    frame.onload = null;
                };


                frame.onload = callback;
                //frame.bind('load', callback);
                form.submit();
            }
        });
    });