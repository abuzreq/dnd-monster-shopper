'use strict';
// Adapted from: http://bl.ocks.org/ganeshv/6a8e9ada3ab7f2d88022

var TreeMap = (function() {

  var opt, data;
  var $svg, svg, width, height;
  var treemap, count;
  var resizeTimeout, $reset;
  var subjectIndices = new Set([-1]);

  function TreeMap(config) {
    var defaults = {
      displaySubjects: 16,
      resizeDelay: 500
    };
    opt = $.extend({}, defaults, config);
    this.init();
  }

  function uid(name) {
    if (count === undefined) count = 0;
    count++;
    var id = name + "-" + count;
    var href = window.location.href + "#" + id;
    return {
      id: id,
      href: href,
      str: "url(" + href+ ")"
    }
  }

  TreeMap.prototype.init = function(){
    this.parseData();
    this.loadUI();
    this.loadListeners();
  };

  TreeMap.prototype.loadListeners = function(){
    var _this = this;

    $reset = $("#reset-subject-filter");
    $reset.on('click', function(e){
      _this.resetFilter();
    })

    $svg.on('click', 'g', function(e) {
      _this.onClick($(this), e);
    });
  };

  TreeMap.prototype.loadUI = function(){
    $svg = $('#treemap');
    svg = d3.select('#treemap');
    width = $svg.width();
    height = $svg.height();

    var color = d3.scaleOrdinal(d3.schemeTableau10);
    var format = d3.format(",d");

    var root = d3.hierarchy(data)
      .sum(function(d) { return d.value; })
      .sort(function(a, b) { return b.value - a.value; });

    treemap = d3.treemap()
      .size([width, height])

    var nodes = treemap(root).descendants();

    var leaf = svg.selectAll("g")
      .data(nodes)
      .join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    leaf.append("title")
      .text(d => `${d.ancestors().reverse().map(d => d.data.name).join("/")}\n${format(d.value)}`);

    leaf.append("rect")
      .attr("id", d => (d.leafUid = uid("leaf")).id)
      .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0);

    leaf.append("clipPath")
        .attr("id", d => (d.clipUid = uid("clip")).id)
      .append("use")
        .attr("xlink:href", d => d.leafUid.href);

    leaf.append("text")
        .attr("clip-path", d => d.clipUid.str)
      .selectAll("tspan")
      .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g).concat(format(d.value)))
      .join("tspan")
        .attr("x", 3)
        .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 1.2}em`)
        .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
        .text(d => d);

  };

  TreeMap.prototype.onClick = function($g, e) {

    var $gs = $svg.children(".node");
    var index = $gs.index($g) - 1;
    
    if ($g.hasClass("active")) {
      subjectIndices.delete(index);
      if(subjectIndices.size === 0)
      {
        subjectIndices = new Set([-1]);
      }
      index = -1;
      $gs.removeClass("inactive");
      $g.removeClass("active");
      $reset.removeClass("active");
    } else {
      if(!e.shiftKey)
      {
        $gs.removeClass("active").addClass("inactive");
        subjectIndices = new Set([index]);
      }
      else
      {
        subjectIndices = subjectIndices.has(-1)? new Set([index]) : new Set([index, ...subjectIndices]);
      }
      $g.removeClass("inactive").addClass("active");
      $reset.addClass("active");
    }

   
    $(document).trigger("subject.select", subjectIndices);
  };

  TreeMap.prototype.onResize = function(){
    var _this = this;
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function(){
      _this.reloadUI();
    }, opt.resizeDelay);
  };

  TreeMap.prototype.parseData = function(){
    var d = opt.data;
    var dlen = d.length;

    if (dlen > opt.displaySubjects) {
      d = d.slice(0, opt.displaySubjects);
    }

    var nodes = _.map(d, function(t){
      return {
        "name": t[0],
        "value": t[1]
      }
    });

    data = {
      "name": "Subjects",
      "children": nodes
    }
  };

  TreeMap.prototype.reloadUI = function(){
    if ($svg) {
      $svg.empty();
      this.loadUI();
    }
  };

  TreeMap.prototype.resetFilter = function(){
    $reset.removeClass("active");
    var $gs = $svg.children(".node");
    $gs.removeClass("active inactive");
    subjectIndices = new Set([-1]);
    $(document).trigger("subject.select", subjectIndices);
    
  };

  return TreeMap;

})();
