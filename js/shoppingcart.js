"use strict";

var ShoppingCart = (function () {
  var opt;
  var $dcontainer;
  function ShoppingCart(config) {
    var defaults = {
      margin: { top: 40, right: 20, bottom: 30, left: 40 },
      resizeDelay: 500,
    };
    opt = $.extend({}, defaults, config);
    this.init();
  }

  ShoppingCart.prototype.init = function () {
    $dcontainer = $("#shoppingcart-content").load(
      "html/shoppingcart.html",
      function () {
        console.log($dcontainer);
        /* this.parseData();
        this.loadUI();
        this.loadDragAndResize();
        this.loadListeners(); */
      }
    );
  };
  ShoppingCart.prototype.updateCart = function () {};

  return ShoppingCart;
})();
