define({
  root: ({
    _widgetLabel: "Add Data",

    noOptionsConfigured: "No options were configured.",

    tabs: {
      search: "Search",
      url: "URL",
      file: "File"
    },

    search: {
      featureLayerTitlePattern: "{serviceName} - {layerName}",
      layerInaccessible: "The layer is inaccessible.",
      loadError: "AddData, unable to load:",
      searchBox: {
        search: "Search",
        placeholder: "Search..."
      },
      bboxOption: {
        bbox: "Within map"
      },
      scopeOptions: {
        anonymousContent: "Content",
        myContent: "My Content",
        myOrganization: "My Organization",
        curated: "Curated",
        ArcGISOnline: "ArcGIS Online"
      },
      sortOptions: {
        prompt: "Sort By:",
        relevance: "Relevance",
        title: "Title",
        owner: "Owner",
        rating: "Rating",
        views: "Views",
        date: "Date",
        switchOrder: "Switch"
      },
      typeOptions: {
        prompt: "Type",
        mapService: "Map Service",
        featureService: "Feature Service",
        imageService: "Image Service",
        vectorTileService: "Vector Tile Service",
        kml: "KML",
        wms: "WMS"
      },
      resultsPane: {
        noMatch: "No results were found."
      },
      paging: {
        first: "<<",
        firstTip: "First",
        previous: "<",
        previousTip: "Previous",
        next: ">",
        nextTip: "Next",
        pagePattern: "{page}"
      },
      resultCount: {
        countPattern: "{count} {type}",
        itemSingular: "Item",
        itemPlural: "Items"
      },

      item: {
        actions: {
          add: "Add",
          close: "Close",
          remove: "Remove",
          details: "Details",
          done: "Done",
          editName: "Edit Name"
        },
        messages: {
          adding: "Adding...",
          removing: "Removing...",
          added: "Added",
          addFailed: "Add failed",
          unsupported: "Unsupported"
        },
        typeByOwnerPattern: "{type} by {owner}",
        dateFormat: "MMMM d, yyyy",
        datePattern: "{date}",
        ratingsCommentsViewsPattern: "{ratings} {ratingsIcon} {comments} {commentsIcon} {views} {viewsIcon}",
        ratingsCommentsViewsLabels: {"ratings": "ratings", "comments": "comments", "views": "views"},
        types: {
          "Map Service": "Map Service",
          "Feature Service": "Feature Service",
          "Image Service": "Image Service",
          "Vector Tile Service": "Vector Tile Service",
          "WMS": "WMS",
          "KML": "KML"
        }
      }
    },

    addFromUrl: {
      type: "Type",
      url: "URL",
      types: {
        "ArcGIS": "An ArcGIS Server Web Service",
        "WMS": "A WMS OGC Web Service",
        "WMTS": "A WMTS OGC Web Service",
        "WFS": "A WFS OGC Web Service",
        "KML": "A KML File",
        "GeoRSS": "A GeoRSS File",
        "CSV": "A CSV File"
      },
      samplesHint: "Sample URL(s)"
    },

    addFromFile: {
      intro: "You can drop or browse for one the following file types:",
      types: {
        "Shapefile": "A Shapefile (.zip, ZIP archive containing all shapefile files)",
        "CSV": "A CSV File (.csv, with address or latitude, longitude and comma, semi-colon or tab delimited)",
        "GPX": "A GPX File (.gpx, GPS Exchange Format)",
        "GeoJSON": "A GeoJSON File (.geo.json or .geojson)"
      },
      generalizeOn: "Generalize features for web display",
      dropOrBrowse: "Drop or Browse",
      browse: "Browse",
      invalidType: "This file type is not supported.",
      addingPattern: "{filename}: adding...",
      addFailedPattern: "{filename}: add failed",
      featureCountPattern: "{filename}: {count} feature(s)",
      invalidTypePattern: "{filename}: this type is not supported",
      maxFeaturesAllowedPattern: "A maximum of {count} features is allowed",
      layerNamePattern: "{filename} - {name}"
    },

    layerList: {
      caption: "Layers",
      noLayersAdded: "No layers have been added.",
      removeLayer: "Remove Layer",
      back: "Back"
    }

  }),
  "ar": 0,
  "bs": 0,
  "cs": 0,
  "da": 0,
  "de": 0,
  "el": 0,
  "es": 0,
  "et": 0,
  "fi": 0,
  "fr": 0,
  "he": 0,
  "hi": 0,
  "hr": 0,
  "it": 1,
  "id": 0,
  "ja": 0,
  "ko": 0,
  "lt": 0,
  "lv": 0,
  "nb": 0,
  "nl": 0,
  "pl": 0,
  "pt-br": 0,
  "pt-pt": 0,
  "ro": 0,
  "ru": 0,
  "sr": 0,
  "sv": 0,
  "th": 0,
  "tr": 0,
  "vi": 0,
  "zh-cn": 0,
  "zh-hk": 0,
  "zh-tw": 0
});
