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
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/on',
  'dojo/mouse',
  'dojo/aspect',
  'dojo/string',
  'esri/SpatialReference',
  'esri/geometry/Extent',
  'jimu/BaseWidgetSetting',
  '../ImageNode',
  'jimu/dijit/ExtentChooser',
  'jimu/dijit/EditableDiv',
  'jimu/dijit/ImageChooser',
  'jimu/localStorage'
],
function(declare, lang, array, html, on, mouse, aspect, string,
  SpatialReference, Extent, BaseWidgetSetting, ImageNode, ExtentChooser, EditableDiv, ImageChooser, storage) {
  //for now, this setting page suports 2D map only
  return declare([BaseWidgetSetting], {
    //these two properties is defined in the BaseWidget
    baseClass: 'jimu-widget-bookmark-setting',

    //bookmarks: Object[]
    //    all of the bookmarks, the format is the same as the config.json
    bookmarks: [],

    startup: function(){
      this.inherited(arguments);
      this.extentChooser = new ExtentChooser({
        itemId: this.appConfig.map.itemId
      }, this.extentChooserNode);

      this.imageChooser = new ImageChooser({displayImg: this.chooseImgNode});
      this.imageChooser.placeAt(this.domNode);
      this.own(on(this.imageChooser, 'imageChange', lang.hitch(this, function(fileData){
        this.chooseImgNode.fileData = fileData;
      })));

      html.setAttr(this.chooseImgNode, 'src', this.folderUrl + 'images/thumbnail_default.png');

      this.own(on(this.extentChooser, 'extentChange', lang.hitch(this, this._onExtentChange)));

      this.setConfig(this.config);
    },


    setConfig: function(config){
      this.config = config;
      this.bookmarks = this.config.bookmarks2D;
      this.currentBookmark = null;
      this.displayBookmarks();
    },

    getConfig: function (isOk) {
      this.config.bookmarks2D = this.bookmarks;
      if(isOk){
        //clear local storage
        var key = this._getKeysKey();
        for(var p in storage.getAll()){
          if(p.startWith(key)){
            storage.remove(p);
          }
        }
      }
      return this.config;
    },

    displayBookmarks: function() {
      // summary:
      //    remove all and then add
      html.empty(this.bookmarkListNode);
      this._createAddBookMarkNode();
      array.forEach(this.bookmarks, function(bookmark) {
        this._createBookMarkNode(bookmark);
      }, this);
    },

    destroy: function(){
      this.extentChooser.destroy();
      this.imageChooser.destroy();
      this.inherited(arguments);
    },

    _getKeysKey: function(){
      // summary:
      //    we use className plus 2D/3D as the local storage key
      if(this.appConfig.map['3D']){
        return this.name + '.3D';
      }else{
        return this.name + '.2D';
      }
    },

    _onExtentChange: function(extent){
      this.currentExtent = extent;
    },

    _createAddBookMarkNode: function() {
      var thumbnail = this.folderUrl + '/setting/css/images/add.png';

      var node = html.create('div', {
        'class': 'bookmark-add'
      }, this.bookmarkListNode);
      var imgWrapper = html.create('div', {
        'class': 'img-wrapper'
      }, node);
      var imgNode = html.create('img', {
        'src': thumbnail
      }, imgWrapper);
      html.create('div', {
        'class': 'label',
        innerHTML: this.nls.addBookmark
      }, node);

      this.own(on(imgNode, 'click', lang.hitch(this, lang.partial(this._onAddBtnClick))));
      return node;
    },

    _onAddBtnClick: function(){
      this.currentBookmark = null;
      this.bookmarkNameNode.value = '';
      html.setAttr(this.chooseImgNode, 'src', this.folderUrl + 'images/thumbnail_default.png');
    },

    _createBookMarkNode: function(bookmark) {
      var thumbnail, dropNode;

      if(bookmark.thumbnail && bookmark.thumbnail.startWith('data:')){
        thumbnail = bookmark.thumbnail;
      }else if(bookmark.thumbnail){
        thumbnail = this.folderUrl + bookmark.thumbnail;
      }else{
        thumbnail = this.folderUrl + 'images/thumbnail_default.png';
      }

      var node = html.create('div', {
        'class': 'bookmark'
      }, this.bookmarkListNode);
      var imgWrapper = html.create('div', {
        'class': 'img-wrapper'
      }, node);
      var imgNode = html.create('img', {
        'src': thumbnail
      }, imgWrapper);
      html.create('div', {
        'class': 'label',
        innerHTML: bookmark.name,
        title: bookmark.name
      }, node);

      this.own(on(imgNode, 'click', lang.hitch(this, lang.partial(this._onBookmarkClick, bookmark))));

      this.own(on(node, mouse.enter, lang.hitch(this, function(){

        dropNode = html.create('div', {
          'class': 'drop-btn'
        }, imgWrapper);
        on(dropNode, 'click', (function(evt) {
          evt.stopPropagation();
          var index = this.bookmarks.indexOf(bookmark);
          this.bookmarks.splice(index, 1);
          this.displayBookmarks();
        }).bind(this));
      })));

      this.own(on(node, mouse.leave, (function() {
        if (dropNode) {
          html.destroy(dropNode);
        }
      }).bind(this)));

      return node;
    },

    _onOkBtnClicked: function() {
      if (string.trim(this.bookmarkNameNode.value).length === 0) {
        html.setStyle(this.errorNode, {visibility: 'visible'});
        this.errorNode.innerHTML = this.nls.errorNameNull;
        return;
      }

      if(!this.currentBookmark && array.some(this.bookmarks, function(b){
        if(b.name === this.bookmarkNameNode.value){
          return true;
        }
      }, this)){
        html.setStyle(this.errorNode, {visibility: 'visible'});
        this.errorNode.innerHTML = this.nls.errorNameExist;
        return;
      }

      if(this.currentBookmark){
        //update bookmark
        this.currentBookmark.name = this.bookmarkNameNode.value;
        if(this.chooseImgNode.fileData){
          this.currentBookmark.thumbnail = this.chooseImgNode.fileData;
        }
        this.currentBookmark.extent = this.currentExtent.toJson();
      }else{
        //create a new bookmark
        this.currentBookmark = this._createNewBookmark();
      }

      html.setStyle(this.errorNode, {visibility: 'hidden'});
      this.errorNode.innerHTML = '&nbsp;';

      this.displayBookmarks();
    },

    _onChooseImgClicked: function(){
      this.imageChooser.show();
    },

    _createNewBookmark: function(){
      var data, b;
      data = this.currentExtent;
      b = {
        name: this.bookmarkNameNode.value,
        extent: this.currentExtent.toJson()
      };

      if(this.chooseImgNode.fileData){
        b.thumbnail = this.chooseImgNode.fileData;
      }
      
      this.bookmarks.push(b);
      return b;
    },

    _onBookmarkClick: function(bookmark) {
      // summary:
      //    set the map extent

      var ext = bookmark.extent, sr, thumbnail;
      if(ext.spatialReference){
        sr = new SpatialReference(ext.spatialReference);
      }else{
        sr = new SpatialReference({ wkid:4326});
      }
      this.extentChooser.setExtent(new Extent(ext));

      this.bookmarkNameNode.value = bookmark.name;

      if(bookmark.thumbnail && bookmark.thumbnail.startWith('data:')){
        thumbnail = bookmark.thumbnail;
      }else if(bookmark.thumbnail){
        thumbnail = this.folderUrl + bookmark.thumbnail;
      }else{
        thumbnail = this.folderUrl + 'images/thumbnail_default.png';
      }

      html.setAttr(this.chooseImgNode, 'src', thumbnail);

      this.currentBookmark = bookmark;
    }

  });
});