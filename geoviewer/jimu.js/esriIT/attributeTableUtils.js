define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    'dojo/topic',
    'dijit/Destroyable',//non possiamo usare jimu/BaseWidget
    "dojo/Deferred",
    "esri/geometry/Point",
    "esri/geometry/Extent",
    "jimu/WidgetManager",
    "jimu/utils",
    'dojo/_base/array',
    "esri/geometry/Geometry",

    "dojo/dom-construct",
    "dijit/Menu",
    "dijit/MenuItem"

], function (
    declare,
    lang,
    topic,
    Destroyable,
    Deferred,
    Point,
    Extent,
    WidgetManager,
    jimuUtils,
    array,
    Geometry,

    domConstruct,
    Menu,
    MenuItem

) {


    //forse usare fetchDataByName

    var SingletonClass = declare("jimu/esriIT/attributeTableUtils", [Destroyable], {

        attributeTableLoaded: null,
        //name: "attributeTableUtils",
        //id: "IDattributeTableUtils",
        widgetThis : null,

        constructor: function ( widgetThis ) {//controlla se AttributeTable è caricato
            this.widgetThis = widgetThis;//widgetThis serve per poter fare topic.publish, in quanto serve il nome e l'id del widget che manda il messaggio
            this.attributeTableLoaded = new Deferred();


            //this.fetchDataByName('AttributeTable');
            var that = this;


            var checkAttributeTableLoaded = topic.subscribe('publishData', function ( widgetName, widgetId, data ) {
                if ( widgetName === 'AttributeTable' && data && data.widgetLoaded !== undefined && data.widgetLoaded === true ) {
                    that.attributeTableLoaded.resolve(true);

                    that.publishData({
                        'stopSignalingFinishedLoading': true
                    });// per far smettere attributeTable di segnalare

                    checkAttributeTableLoaded.remove();
                }
            });

            this.own(checkAttributeTableLoaded);

            var intervalPublishDataInAttributeTable = setInterval(lang.hitch(this, function () {

                this.attributeTableLoaded.then(function () {
                    clearInterval(intervalPublishDataInAttributeTable);//prima di publishData
                });

                if ( this.attributeTableLoaded.isResolved() === false ) {
                    this.publishData({
                        "attributeTableAreYouLoaded": true
                    });
                    // console.log('waiting for attributeTable to load');
                }
            }), 1000);
        },


        /*onReceiveData: function(widgetName, widgetId, data, historyData){
         if ( widgetName === 'AttributeTable' && data.widgetLoaded !== undefined && data.widgetLoaded === true ) {
         that.attributeTableLoaded.resolve(true);

         that.publishData({
         'stopSignalingFinishedLoading': true
         });// per far smettere attributeTable di segnalare

         checkAttributeTableLoaded.remove();
         }
         },*/

        getColumnsFromFeatureSet: function (featureSet)
        {
            var columns = {};

            for (var key in featureSet.fields) {
                var field = featureSet.fields[key];

                columns[field.name] = field.alias;
            }

            return columns;
        },

        getDataFromFeatureSet: function (featureSet)
        {
            var table = [];
            var dateFields = [];

            for (var key in featureSet.fields) {
                var field = featureSet.fields[key];

                if (field.type == "esriFieldTypeDate") {
                    dateFields.push(field.name);
                }
            }

            for (var key in featureSet.features) {
                var feature = featureSet.features[key];

                var row = [];

                for (var key in feature.attributes ) {
                    if ( feature.attributes.hasOwnProperty(key) ) {
                        row[key] = feature.attributes[key];

                        if (dateFields.indexOf(key) >= 0 && !isNaN(feature.attributes[key]) ) {
                            row[key] = jimuUtils.fieldFormatter.getFormattedDate(feature.attributes[key]);
                        }
                    }
                }

                if (feature.hasOwnProperty('geometry')) {
                    row.geometry = feature.geometry;
                }

                table.push(row);
            }

            return table;
        },

        apriNuovoTab: function ( tabData ) {
            var result = new Deferred();

            // Nuova versione: in questo modo non sarà più necessario di preoccuparsi della forma delle colonne,
            //                 della forma dei dati, e dalla formattazione degli stessi
            if (tabData.hasOwnProperty("featureSet")) {
                tabData.columns = this.getColumnsFromFeatureSet(tabData.featureSet);
                tabData.data = this.getDataFromFeatureSet(tabData.featureSet);
            }

            if ( tabData === undefined ||
                tabData.columns === undefined ||
                lang.isArray( tabData.data ) === false
            )
            {
                throw "Per aprire un tab in AttributeTable l'elenco delle colonne e l'array dei dati sono obbligatori.";
            }


            this.openAttributeTable();

            var righeHannoGeometrie = array.some( tabData.data, function(row){
                if ( row && row.geometry && row.geometry instanceof Geometry){
                    return true;
                }
            });

            if ( !righeHannoGeometrie ){
                console.warn('Il tab aperto non ha geometrie per far funzionare lo zoom sulle righe.');
            }

            this.attributeTableLoaded.then( lang.hitch(this, function () {
                this.publishData({
                    columns: tabData.columns,
                    data: tabData.data,
                    geometry: tabData.geometry,
                    tabTitle: tabData.tabTitle || "manca titolo tab",
                    layerURL: tabData.url || tabData.layerURL || "",//non undefined perchè AttributeTable controlla se è settato
                    tabInternalName: tabData.tabInternalName || "tab_aperto_manualmente" + new Date().getTime().toString(),
                    closable: tabData.closable === undefined ? true : tabData.closable,
                    where: tabData.where || undefined, //esriQuery.where, per filterQuerySpaziale se vorrà filtrare questo tab
                    otherParams: tabData.otherParams,
                    deferred: result
                });

            }));

            return result;
        },



        openAttributeTable: function(){
            var ok = array.some(this.widgetThis.appConfig.widgetOnScreen.widgets, function( widget ) {
                if ( widget.uri.indexOf("/AttributeTable/") !== -1 ){
                    var wm = WidgetManager.getInstance();
                    wm.loadWidget( widget).then( function( widgetInstance ) {

                        wm.openWidget( widgetInstance );

                    });//new AttributeTableWidget()...

                    return true;
                }

            });

            if (!ok){
                console.warn('Non ho ho trovato il widgetOnScreen attributeTable.');
            }
        },

        chiudiTabByInternalName: function ( tabInternalName ) {
            var result = new Deferred();

            this.attributeTableLoaded.then(lang.hitch(this, function () {
                this.publishData({deleteTabAggiuntiManualmente: true, tabInternalName: tabInternalName});

                var handler = topic.subscribe('publishData', function ( widgetName, widgetId, data ) {
                    if ( widgetName === 'AttributeTable' && data &&
                        data.deleteTabsCompletata === true && data.tabInternalName === tabInternalName ) {
                        result.resolve(true);
                        handler.remove();
                    }
                });
                this.own(handler);
            }));

            return result;
        },

        getGeometrieRigheSelezionate: function () {

            var result = new Deferred();

            var that = this;
            this.attributeTableLoaded.then(function () {

                var handler = topic.subscribe('publishData', function ( widgetName, widgetId, data ) {

                    if ( /*widgetName === 'AttributeTable' && */ //no! altrimenti rompi WidgetSelezione
                    data && lang.isArray(data.geometriesSelectedInAttributeTable) &&
                    data.geometriesSelectedInAttributeTable.length > 0 && data.geometriesSelectedInAttributeTable[0] !== undefined ) {
                        //se viene da geometriesForExtent ha .geometry, se viene da uniteGeometries non ha .geometry
                        var extent = data.geometriesSelectedInAttributeTable[0].geometry || data.geometriesSelectedInAttributeTable[0];
                        if ( extent instanceof Point )//siccome non si può fare map.setExtent su un point
                        {
                            var pt = extent;
                            var factor = 10;
                            extent = new Extent(pt.x - factor, pt.y - factor, pt.x + factor, pt.y + factor, pt.spatialReference);
                        }

                        result.resolve(extent);
                        handler.remove();
                    }

                });

                that.own(handler);

            });
            this.publishData({giveMeAttributeTableGeometriesSelectedInAttributeTable: true});

            return result;
        },


        publishData: function(data, keepHistory){
            //if set keepHistory = true, all published data will be stored in datamanager,
            //this may cause memory problem.
            if( keepHistory === undefined){
                //by default, we don't keep the history of the data.
                keepHistory = false;
            }
            topic.publish('publishData', this.widgetThis.name, this.widgetThis.id, data, keepHistory);
        },

        createContextualMenu: function (id) {
            var pMenu;

            var that = this;

            pMenu = new Menu({
                targetNodeIds: [id],
                selector: "td"
            });

            pMenu.addChild(new MenuItem({
                label: "Copy cell value",
                onClick: function( evt ){
                    var node = this.getParent().currentTarget;
                    that.copyToClipBoard(node.innerText,id);
                }
            }));

            pMenu.startup();
        },

        copyToClipBoard: function (aText, id)
        {
            var aParagraphForClipBoard = document.querySelector('.aParagraphForClipBoard');

            if (aParagraphForClipBoard) {
                dojo.destroy(aParagraphForClipBoard);
            }

            aParagraphForClipBoard = domConstruct.create("p",  { class: 'aParagraphForClipBoard' });
            domConstruct.place(aParagraphForClipBoard, id, "after");

            // Set the new innerText
            aParagraphForClipBoard.innerText = aText;

            // all browsers, except IE before version 9
            if (document.createRange) {

                // Remove the selections - NOTE: Should use
                // removeRange(range) when it is supported
                window.getSelection().removeAllRanges();

                //var elements = document.querySelector('.aParagraphForClipBoard');
                var rangeObj = document.createRange();

                rangeObj.selectNode(aParagraphForClipBoard);

                window.getSelection().addRange(rangeObj);

                try {
                    // Now that we've selected the anchor text, execute the copy command
                    var successful = document.execCommand('copy');
                } catch(err) {
                    console.error('Oops, unable to copy');
                }
            }
            else {      // Internet Explorer before version 9
                var rangeObj = document.body.createTextRange ();
                rangeObj.moveToElementText (aParagraphForClipBoard);
                rangeObj.select ();
                rangeObj.execCommand ('copy');
            }
        },

    });

    //non possiamo usare singleton, perchè topic.publish() deve provennire da un widget e quindi la classe ha bisogno di essere istanziata per ogni widget
   /* var _instance;
    if ( _instance === undefined ) {
        _instance = new SingletonClass();
        _instance.constructor = null;
    }
    return _instance;*/

    return SingletonClass;
});