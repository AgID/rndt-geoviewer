define([
        'dojo/_base/declare',
        'jimu/BaseWidget',
        "jimu/esriIT/fileRW/filerw-min-custom",//for IE9-
        'dojox/form/Uploader',
        "dojo/Deferred",
        "dijit/form/Button",
        "dojo/dom-construct",
        'dojo/_base/array',
        'dojo/_base/lang',
        "dojo/topic",
        "dojo/has",
        "dojo/sniff"
  ],
  function(declare, BaseWidget, Filerw, Uploader, Deferred, Button, domConstruct, array, lang, topic, has, sniff) {
    return declare([BaseWidget], {

      fileNameDomNode: null,

      download : function(strData, strFileName, strMimeType) {
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
                        }, 1500);
                        return true;
                    } /* end if('download' in a) */
                    if (has("ie") <= 9) {

              var form = document.createElement('form');
              form.action = location.pathname.replace(/\/[^/]+$/, '') + '/FileService/ServiceFile.ashx';
              form.method = 'POST';
              form.target = 'downloadIframe';//'_blank';


              //var jData = {
              //    fileZipName:"",
              //    elencoFiles:[{fileName:strFileName, content:escape(JSON.stringify(strData))}]
              //
              //};

               var jsonObject = {
               "fileZipName": strFileName,
               "elencoFiles": [
               {"fileName": strFileName, "content": escape(strData) }
               ]
               };



              var i = document.createElement('input');
              i.type = 'hidden';
              i.name = 'operation';
              i.value = 'download';
              form.appendChild(i);



              var i = document.createElement('input');
              i.type = 'hidden';
              i.name = 'jsonObject';
              i.value = JSON.stringify( jsonObject );
              form.appendChild(i);

              var i = document.createElement('input');
              i.type = 'hidden';
              i.name = 'forceZip';
              i.value = '0';
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
          }
            // do iframe dataURL download (old ch+FF):
            var f = D.createElement("iframe");
            if (has("ie")<= 9){document.body.appendChild(f);} else {D.body.appendChild(f);}
            f.src = "data:" + strMimeType + "," + strData;
            setTimeout(function() {
                if (has("ie")<= 9){document.body.removeChild(f);} else {D.body.removeChild(f);}
            }, 333);
            return true;
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
        },


      upload: function( domNode, options )
      {
        var that = this;

        var deferred = new Deferred();//siccome uno può caricare più file, usiamo deffered.progress per mandare i dati

          if(has("ie") == 9){
            // Tell FileRW we can deal with iframe uploads using this URL:
            //var options = {iframe: {url: '/uploadIE9/Upload.aspx'}};
            // Attach FileRW to an area ('zone' is an ID but you can also give a DOM node):
            var zone = new FileRW(domNode, options);
            zone.multiple(false);

            // Do something when a user chooses or drops a file:
            zone.event('send', function (files) {
              // Depending on browser support files (FileList) might contain multiple items.
              files.each(function (file) {
                 topic.publish('uploader/filename',file.name);
                if(that.fileNameDomNode)
                  that.fileNameDomNode.innerHTML = file.name;
                // React on successful AJAX upload:
                file.event('done', function (xhr) {
                  deferred.progress( xhr );
                  // 'this' here points to fd.File instance that has triggered the event.
                  //alert('Done uploading ' + this.name + ', response:\n\n' + xhr.responseText);
                });

                // Send the file:
                file.sendTo(options.iframe.url);
              });
            });

            // React on successful iframe fallback upload (this is separate mechanism
            // from proper AJAX upload hence another handler):
            zone.event('iframeDone', function (xhr) {
              deferred.progress( xhr.responseText );
               topic.publish('uploader/filename', xhr.param2);
              if(that.fileNameDomNode)
                that.fileNameDomNode.innerHTML = xhr.param2;
              //alert('Done uploading via <iframe>, response:\n\n' + xhr.responseText);
            });
          }
          else
          {

            //browser moderno che usa HTML5
              var zone = new FileRW(domNode, options);
              zone.multiple(false);

              zone.event('send', function (files) {
                files.each(function (file) {
                   topic.publish('uploader/filename',file.name);
                  file.readData(
                    function (str) { deferred.progress( str ) },
                    function (e) { alert('Terrible error!') },
                    'text'/* UTF-8 string,*/
                  );
                });
              });

          }

          return deferred;

      },

      // ************************************************************* //
      // insertDomNode : div node where you insert the control         //
      // urlUploadsApp : url dell'applicazione web che legge il file   //
      // labelButtonUpload : label of the button upload                //
      // buttonSave :  if false not Displayed the download button      //
      // labelFileName :  if false not Displayed the file Name         //
      // ************************************************************* //
      startMyWidget: function( insertDomNode, urlUploadsApp, labelButtonUpload, buttonSave, labelFileName)
      {
        var saveButton;
        if (buttonSave != false) {
          saveButton = new Button({
          label: "Salva configurazione",
          name: 'saveButton'
          });
          saveButton.placeAt( insertDomNode, 'last');
          saveButton.startup();
        }

        if (labelFileName != false) {
          this.fileNameDomNode = domConstruct.create("div", {"name": "fileName"}, insertDomNode, 'last' );
        }

        var nodeUpload = domConstruct.create("div", {}, insertDomNode, 'last' );
        var options = {iframe: {url: urlUploadsApp}, labelButtonUpload: labelButtonUpload};
        var defferedUpload = this.upload(nodeUpload, options);

        return { "saveButton" : saveButton, "uploadDeffered" : defferedUpload};
      },

      readCSVFileData: function(data,columns,separator,retFunctionError){
        var dataJson=[];
        try {
            var first=false;
            var columnOrder=[];

            array.forEach(data.split("\n"), lang.hitch(this, function(item, i){
              var elements = item!=null ? separator != null && separator != "" ? (item.trim().toUpperCase().trim() + separator).split(separator) : [item.toUpperCase().trim(),""] :[];
              if (elements.length>0) {
                if (first==false) {
                  first=true;
                  array.forEach(columns, lang.hitch(this, function(col, i){
                    col = col ? col.toUpperCase().trim() : "";
                    if(elements.indexOf(col) > -1) {
                      columnOrder.push( elements.indexOf(col) );
                    }
                  }));
                }else{
                  var elemJson=null;
                  array.forEach(columnOrder, lang.hitch(this, function(col, i){
                     if(elements[col] && elements[col].length>0) {
                      if (elemJson==null)
                        elemJson = {};
                      elemJson[ columns[i] ] = elements[col];
                      }
                  }));
                  if(elemJson!=null)dataJson.push(elemJson);
                }
              }
            }));
          return dataJson;

        } catch(e) {
          alert(e);
          return null;
        }

      }
    });
  });


