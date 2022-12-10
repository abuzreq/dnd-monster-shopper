"use strict";

var DatePicker = (function () {
  var opt,
    challengeFrequency,
    dataBySubject,
    challengeRange,
    uniqueChallengeValues;
  var svg, $svg, $dwindow, $dcontainer, $dragAndResize, $reset;
  var $challengeStart, $challengeEnd, $bgWest, $bgEast, resizeHelperWidth;
  var svgWidth, svgHeight, graphWidth, graphHeight;
  var xRange, yRange;
  var resizeTimeout;

  function DatePicker(config) {
    var defaults = {
      margin: { top: 40, right: 20, bottom: 30, left: 40 },
      resizeDelay: 500,
    };
    opt = $.extend({}, defaults, config);
    this.init();
  }

  DatePicker.prototype.init = function () {
    $dcontainer = $("#datepicker-container");
    $dwindow = $("#datepicker-window");
    $reset = $("#reset-date-filter");

    this.parseData();
    this.loadUI();
    this.loadDragAndResize();
    this.loadListeners();
  };

  DatePicker.prototype.loadDragAndResize = function () {
    var _this = this;

    $dragAndResize = $dwindow
      .draggable({
        containment: $dcontainer,
        drag: function (event, ui) {
          _this.onUIResizeOrDrag();
        },
      })
      .resizable({
        containment: $dcontainer,
        handles: "e, w",
        resize: function (event, ui) {
          _this.onUIResizeOrDrag();
        },
        create: function (event, ui) {
          _this.onUICreate();
        },
      })
      .on("resize", function (e) {
        e.stopPropagation();
      });
  };

  DatePicker.prototype.loadListeners = function () {
    var _this = this;

    $reset.on("click", function () {
      _this.resetFilter();
    });

    $(document).on("subject.select", function (e, subjectIndices) {
      const subjectFilterResults = new Array(opt.subjectsData.length).fill(1);

      if (subjectIndices !== undefined && !subjectIndices.has(-1)) {
        const indicesArr = Array.from(subjectIndices);

        for (var i = 0; i < opt.subjectsData.length; i++) {
          var subjects = opt.subjectsData[i];
          var result = 0;
          var slen = subjects.length;
          if (slen > 0 && containsAny(subjects, indicesArr)) result = 1;
          subjectFilterResults[i] = result;
        }
        const challengeDataFilteredBySubject = opt.challengeData.filter(
          (x, i) => subjectFilterResults[i]
        );
        const bySubjectFrequencyResult = _this.computeFrequences(
          challengeDataFilteredBySubject
        );
        dataBySubject = bySubjectFrequencyResult.frequency;
      } else {
        dataBySubject = [];
      }

      _this.loadUI();
    });
  };

  function containsAny(arr1, arr2) {
    for (let i = 0; i < arr2.length; i++) {
      if (arr1.indexOf(arr2[i]) !== -1) {
        return true;
      }
    }
    return false;
  }
  DatePicker.prototype.loadUI = function () {
    $svg = $("#datepicker");
    svg = d3.select("#datepicker");

    svgWidth = $svg.width();
    svgHeight = $svg.height();

    // set graph area
    var margin = opt.margin;
    graphWidth = svgWidth - margin.left - margin.right;
    graphHeight = svgHeight - margin.top - margin.bottom;

    // set the ranges
    xRange = d3.scaleBand().range([0, graphWidth]);
    yRange = d3.scaleLinear().range([graphHeight, 0]);

    svg = svg
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data in the domains
    xRange.domain(
      challengeFrequency.map(function (d) {
        return d.value;
      })
    );
    yRange.domain([
      0,
      d3.max(challengeFrequency, function (d) {
        return d.count;
      }),
    ]);

    // append the rectangles for the bar chart
    svg
      .selectAll(".bar1")
      .data(challengeFrequency)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "#4e79a7") //"#4e79a7","#f28e2c"  #666666
     // .attr("style","outline: thin solid red")
      .attr("x", function (d) {
        return xRange(d.value);
      })
      .attr("width", xRange.bandwidth())
      .attr("y", function (d) {
        return yRange(d.count);
      })
      .attr("height", function (d) {
        return graphHeight - yRange(d.count);
      });

    if (dataBySubject !== undefined && dataBySubject.length > 0) {
      svg
        .selectAll(".bar2")
        .data(dataBySubject)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("fill", "#f28e2c") //  ffff99
       
        .attr("x", function (d) {
          return xRange(d.value);
        })
        .attr("width", xRange.bandwidth())
        .attr("y", function (d) {
          return yRange(d.count);
        })
        .attr("height", function (d) {
          return graphHeight - yRange(d.count);
        });
    }

    // add the x Axis
    svg
      .append("g")
      .attr("transform", "translate(0," + graphHeight + ")")
      .attr("class", "xaxis")
      .call(d3.axisBottom(xRange));

    d3.selectAll(".xaxis .tick").each(function (d, i) {
      if (d >= 1 && d % 3 > 0) {
        this.remove();
      }
    });

    // add the y Axis
    svg.append("g").attr("class", "yaxis").call(d3.axisLeft(yRange));
    d3.selectAll(".yaxis .tick").each(function (d, i) {
      if (d % 3 > 0) {
        this.remove();
      }
    });

    // resize the datepicker window
    $dcontainer.css({
      width: graphWidth + "px",
      height: graphHeight + "px",
      top: margin.top + "px",
      left: margin.left + "px",
    });
  };

  DatePicker.prototype.onResize = function () {
    var _this = this;
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      _this.reloadUI();
    }, opt.resizeDelay);
  };

  DatePicker.prototype.onUICreate = function () {
    $challengeStart = $(
      '<div class="challenge" aria-live="polite" aria-label="Filtered start challenge" />'
    );
    $challengeEnd = $(
      '<div class="challenge" aria-live="polite" aria-label="Filtered end challenge" />'
    );
    
    $(".ui-resizable-w").append($challengeStart) 
    $(".ui-resizable-e").append($challengeEnd);

    $bgWest = $('<div class="resize-bg" />');
    $bgEast = $('<div class="resize-bg" />');
    $(".ui-resizable-w").append($bgWest);
    $(".ui-resizable-e").append($bgEast);

    resizeHelperWidth = $(".ui-resizable-w").width();

    this.updateDomain(challengeRange[0], challengeRange[1]);
  };

  DatePicker.prototype.onUIResizeOrDrag = function () {
    var cw = $dcontainer.width();
    var w = $dwindow.width();
    var nw = w / cw;
    var x = parseFloat($dwindow.css("left"));
    var nx = x / cw;

    var challengeStart =
      uniqueChallengeValues[parseInt(nx * uniqueChallengeValues.length)].value;
    var challengeEnd =
      uniqueChallengeValues[parseInt(nw * uniqueChallengeValues.length) - (nw === 1? 1: 0)].value;

    $bgWest.width(Math.max(x - resizeHelperWidth, 0));
    $bgEast.width(Math.max(cw - w - x - resizeHelperWidth, 0));

    this.updateDomain(challengeStart, challengeEnd);
  };

  DatePicker.prototype.parseData = function () {
    const result = this.computeFrequences(opt.challengeData);
    challengeFrequency = result.frequency;
    challengeRange = result.range;
    uniqueChallengeValues = result.frequency;
    console.log(
      "Found challenge range: [" +
        challengeRange[0] +
        " - " +
        challengeRange[1] +
        "]"
    );
  };

  DatePicker.prototype.computeFrequences = function (rawData) {
    //var rawData = opt.challengeData;
    var flatData = _.flatten(rawData, true);
    var min = 0; //_.min(flatData);
    var max = _.max(flatData);
    var uniqueValues = [...new Set(flatData)];
    uniqueValues.sort(function (a, b) {
      return a - b;
    });

    const range = [min, max];

    var frequencyData = _.times(uniqueValues.length, function (i) {
      var value = uniqueValues[i]; // min + i;
      var sum = _.reduce(
        flatData,
        function (memo, Cmp) {
          if (Cmp === value) return memo + 1;
          else return memo;
        },
        0
      );
      return {
        value: value,
        count: sum,
      };
    });

    return {
      frequency: frequencyData,
      range: range,
      uniqueValues: uniqueValues,
      min: min,
      max: max,
    };
  };

  DatePicker.prototype.reloadUI = function () {
    // console.log("Reloading...")
    $svg.empty();
    this.loadUI();
    if ($dragAndResize) {
      $dragAndResize.resizable("destroy").draggable("destroy").off("resize");
      $dwindow.remove();
      $dwindow = $(
        '<div id="datepicker-window" class="datepicker-window"></div>'
      );
      $dcontainer.append($dwindow);
      this.loadDragAndResize();
    }
    this.onUIResizeOrDrag();
  };

  DatePicker.prototype.resetFilter = function () {
    this.reloadUI();
  };

  DatePicker.prototype.updateDomain = function (challengeStart, challengeEnd) {
    $challengeStart.text(challengeStart);
    $challengeEnd.text(challengeEnd);
    if (
      challengeStart <= challengeRange[0] &&
      challengeEnd >= challengeRange[1]
    )
      $reset.removeClass("active");
    else $reset.addClass("active");
    $(document).trigger("domain.update", [challengeStart, challengeEnd]);
  };

  return DatePicker;
})();
