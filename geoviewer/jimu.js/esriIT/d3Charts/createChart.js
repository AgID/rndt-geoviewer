define([
        'dojo/_base/declare',
        './nls/strings',
        'dojo/window',
        'dojo/dom-style',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dijit/form/Button',
        './d3/d3.min',
        'dojo/dom-construct',
        'dojo/NodeList-manipulate',
    ],
    function (declare, nlsStrings, win, domStyle, arrayUtils, lang, Button, d3, domConstruct) {

        var classObj = declare(null, {

            _getChartSize: function (size) {
                var obj = {
                    width: (Math.floor(win.getBox().w / 5) * 4),
                    height: (Math.floor(win.getBox().h / 5) * 4)
                };
                if (size != null || (size != 1 && !isNaN(size))) {
                    obj.width = Math.floor(obj.width / size);
                    obj.height = Math.floor(obj.height / size);
                }
                if (obj.height < 500) {
                    obj.height = 500;
                }
                if (obj.width < 1200) {
                    obj.width = 1200;
                }
                return obj;
            },

            _getColors: function (num, scaleStyle) {
                if (!scaleStyle) scaleStyle = false;
                if (scaleStyle == true) {
                    var startColor = d3.hcl(this._getRandomColor());
                    var endColor = d3.hcl("#ffffff");
                    var values = d3.scale.linear()
                        .interpolate(d3.interpolateHcl)
                        .range([startColor.toString(), endColor.toString()])
                        .domain([0, num + 1]);
                    var valuesA = [];
                    for (var i = 0; i < num; i++) {
                        valuesA.push(values(i));
                    }
                    return valuesA;
                }
                if (num <= 10) {
                    return d3.scale.category10();
                } else if (num <= 20) {
                    return d3.scale.category20c();
                } else {
                    var colors = [];
                    for (var i = 0; i < num; i++) {
                        var col = this._getRandomColor();
                        if (colors.indexOf(col) == -1) {
                            colors.push(this._getRandomColor());
                        } else {
                            i = -1;
                        }
                    }
                    return d3.scale.ordinal().range(colors);
                }
            },

            _getRandomColor: function () {
                var letters = '0123456789ABCDEF'.split('');
                var color = '#';
                for (var i = 0; i < 6; i++) {
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color;
            },
            _centerDialogOnScreen: function (dNode, width, height) {
                width = width == null ? this._getChartSize().width : width;
                height = height == null ? this._getChartSize().height : height;
                domStyle.set(dNode, "position", "absolute");
                domStyle.set(dNode, "top", Math.floor(win.getBox().h / 2 - height / 2) + "px");
                domStyle.set(dNode, "left", Math.floor(win.getBox().w / 2 - width / 2) + "px");
            },

            /**elabora i dati (array di date) in un array di occorrenze per data*/
            _getOccurrencesForDate: function (data, years, fieldNameData, fieldNameValue, firstZero) {
                var yearso = {};
                var datas = [];
                var datao = {};
                var afieldNameValue = fieldNameValue;
                if (!fieldNameData) fieldNameData = "Data";
                if (!afieldNameValue) afieldNameValue = ["value"];

                if (!(data[0].constructor === Array)) {
                    data = [data];
                }

                data.forEach(function (datan, i) {
                    datan.forEach(function (d) {
                        fieldNameValue = afieldNameValue[i];
                        if (years.indexOf("all") > -1 || (years.indexOf(d.getFullYear()) > -1 || years.indexOf(d.getFullYear().toString()) > -1)) {
                            var m = (d.getMonth() + 1).toString();
                            var day = d.getDate().toString();
                            var sdate =
                                d.getFullYear().toString() + (m.length == 1 ? "0" + m : m) + (day.length == 1 ? "0" + day : day);
                            if (!datao[sdate]) {
                                datao[sdate] = {};
                                datao[sdate][fieldNameValue] = 1;
                            } else {
                                datao[sdate][fieldNameValue] = parseInt(datao[sdate][fieldNameValue]) + 1;
                            }
                            yearso[(parseInt(d.getFullYear()))] = true;
                        }
                    });
                    for (var o in datao) {
                        var obj = {};
                        
                        obj[fieldNameData] = o;
                        //obj[fieldNameValue]=datao[o];
                        afieldNameValue.forEach(function (n) {
                            obj[n] = (datao[o][n] ? datao[o][n] : 0);
                        });
                        datas.push(obj);
                    }
                });

                var yearsA = [];
                for (var s in yearso) {
                    yearsA.push(parseInt(s));
                }
                
                if (firstZero) {
                    var newDatas = new Array();

                    var firstVal = lang.clone(datas[0]);
                    dojo.forEach(datas, function (item, idx) {
                        if (item[fieldNameData] < firstVal[fieldNameData]) firstVal = lang.clone(item);
                    });

                    firstVal[afieldNameValue] = 0;
                    newDatas.push(firstVal);
                    newDatas = newDatas.concat(datas);
                    return {
                        "data": newDatas,
                        "years": yearsA
                    };

                } else {
                    return {
                        "data": datas,
                        "years": yearsA
                    };
                }
            },

            /*******************************/
            /* *** Public create chart *** */
            /*******************************/

            /*
             *** PARAMS ***
             data:Array[] = Array che rappresenta "scaleY" contenente gli array che rappresentano "scaleX". ES: [{"valore_x":10,"valore_y1":11,"valore_y2":115},{"valore_x":20,"valore_y1":21,,"valore_y2":211}]
             field:String = Nome dell'attributo dell'Object contenuto nell'array "scaleX". ES: ""
             buckets:Number = Numero di classi
             */
            createTruliaWeek: function (data, field, buckets) {
                if (!data || !field) {
                    alert("parameters required: data, field");
                    return;
                }
                var scaleY = nlsStrings.LABEL_DAY_OF_WEEK || ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
                var scaleX = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"];
                return this.createTrulia(data, field, buckets, scaleX, scaleY);
            },
            /*
             *** PARAMS ***
             data:Array[] = Array che rappresenta "scaleY" contenente gli array che rappresentano "scaleX". ES: [{"valore_x":10,"valore_y1":11,"valore_y2":115},{"valore_x":20,"valore_y1":21,,"valore_y2":211}]
             field:String = Nome dell'attributo dell'Object contenuto nell'array "scaleX". ES: ""
             buckets:Number = Numero di classi
             scaleX:Array = Array di stringhe che descrivono i valori dell'asse X
             scaleY:Array = Array di stringhe che descrivono i valori dell'asse Y
             */
            createTrulia: function (data, field, buckets, scaleX, scaleY) {
                var chartDivNode = domConstruct.toDom("<div id='createChart_trulia'></div>");

                if (!data || !field || !scaleX || scaleX.length <= 0 || !scaleY || scaleY.length <= 0) {
                    alert("parameters required: data,field,scaleX,scaleY");
                    return;
                }

                if (!buckets) buckets = 9;
                var that = this;

                var margin = {
                        top: 50,
                        right: 30,
                        bottom: 100,
                        left: 60
                    },
                    width = this._getChartSize(1).width - margin.left - margin.right,
                    height = this._getChartSize(1.2).height - margin.top - margin.bottom,
                //gridSize = Math.floor(width / scaleX.length),
                //legendElementWidth = gridSize*2,
                    gridSize = Math.floor(height / (scaleY.length + 1)),
                    legendElementWidth = (gridSize * scaleX.length) / (buckets + 1);
                if (buckets == 9)
                    colors = ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#253494", "#081d58"]; // alternatively colorbrewer.YlGnBu[9]
                if (buckets == 6)
                    colors = ["#0000FF", "#00FFFF", "#33FF00", "#FFFF00", "#FF9900", "#FF0000"];

                var datas = [];

                arrayUtils.forEach(data, function (rpt, idx) {
                    arrayUtils.forEach(rpt, function (rpt2, idx2) {
                        datas.push({
                            valy: idx + 1,
                            valx: idx2 + 1,
                            value: rpt2[field]
                        });
                    });
                });

                if (buckets > colors.length) {
                    colors = this._getColors(buckets, true);
                }

                var svg;

                var colorScale = d3.scale.quantile()
                    .domain([0, buckets - 1, d3.max(datas, function (d) {
                        return d.value;
                    })])
                    .range(colors);

                svg = d3.select(chartDivNode).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var dayLabels = svg.selectAll(".dayLabel")
                    .data(scaleY)
                    .enter().append("text")
                    .text(function (d) {
                        return d;
                    })
                    .attr("x", 0)
                    .attr("y", function (d, i) {
                        return i * gridSize;
                    })
                    .style("text-anchor", "end")
                    .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
                    .attr("class", function (d, i) {
                        return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis");
                    });

                var timeLabels = svg.selectAll(".timeLabel")
                    .data(scaleX)
                    .enter().append("text")
                    .text(function (d) {
                        return d;
                    })
                    .attr("x", function (d, i) {
                        return i * gridSize;
                    })
                    .attr("y", 0)
                    .style("text-anchor", "middle")
                    .attr("transform", "translate(" + gridSize / 2 + ", -6)")
                    .attr("class", function (d, i) {
                        return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis");
                    });

                var heatMap = svg.selectAll(".valx")
                    .data(datas)
                    .enter().append("rect")
                    .attr("x", function (d) {
                        return (d.valx - 1) * gridSize;
                    })
                    .attr("y", function (d) {
                        return (d.valy - 1) * gridSize;
                    })
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("class", "valx bordered")
                    .attr("width", gridSize)
                    .attr("height", gridSize)
                    .style("fill", colors[0]);

                heatMap.transition().duration(1000)
                    .style("fill", function (d) {
                        return (d.value == 0 ? "#E8E8E8" : colorScale(d.value));
                    });

                heatMap.append("title").text(function (d) {
                    return d.value;
                });

                var legend = svg.selectAll(".legend")
                    .data([0].concat(colorScale.quantiles()), function (d) {
                        return d;
                    })
                    .enter().append("g")
                    .attr("class", "legend");

                legend.append("rect")
                    .attr("x", function (d, i) {
                        return (legendElementWidth * i) + legendElementWidth;
                    })
                    .attr("y", height)
                    .attr("width", legendElementWidth)
                    .attr("height", gridSize / 2)
                    .style("fill", function (d, i) {
                        return colors[i];
                    });

                legend.append("text")
                    .attr("class", "mono")
                    .text(function (d) {
                        return (d === 0 ? ">0" : ">= " + Math.round(d).toString());
                    })
                    .attr("x", function (d, i) {
                        return (legendElementWidth * i) + legendElementWidth;
                    })
                    .attr("y", height + gridSize);

                legend.append("rect")
                    .attr("x", 0)
                    .attr("y", height)
                    .attr("width", legendElementWidth)
                    .attr("height", gridSize / 2)
                    .style("fill", function (d, i) {
                        return "#E8E8E8";
                    });

                legend.append("text")
                    .text("0")
                    .attr("x", 0)
                    .attr("y", height + gridSize)
                    .attr("class", "mono");

                /*
                 var check=[0];
                 arrayUtils.forEach(legend[0], function (rpt, idx) {
                 if (idx>0 ){
                 if (legend[0][idx-1].textContent == legend[0][idx].textContent){
                 if(check.length>0){
                 check.splice(0, 1);
                 }
                 }else{
                 check.push(idx-1);
                 }
                 }
                 });
                 arrayUtils.forEach(legend[0], function (rpt, idx) {
                 if (idx>0 && idx<check[0]){
                 legend[0][idx].textContent="nd"	;
                 }
                 });
                 */
                //}
                return chartDivNode;
            },
            /*
             *** PARAMS ***
             data:Array = Array che contiene gli Object contenenti i valori del grafico. ES: [{"valore_x":10,"valore_y1":11,"valore_y2":115},{"valore_x":20,"valore_y1":21,"valore_y2":211}]
             fieldX:String = Nome dell'attributo dell'Object contenuto in "data" che contiene il NOME del valore dellasse X. ES: "valore_x"
             labelY:String = Etichetta visualizzata sull'asse Y
             **************
             PS: tutti gli altri valori vengono letti in automatico ES: fieldY = "valore_y1", "valore_y2"
             */
            createStackedBarChart: function (data, fieldX, labelY) {
                var chartDivNode = domConstruct.toDom("<div id='createChart_bar'></div>");

                if (!fieldX || !data || !data.length || data.length == 0) return;
                //if(!dialog)dialog=true;
                if (!labelY) labelY = "";
                var that = this;

                var g, color, width, height, svg, legend, param;
                var columnCount = 0;

                var size = that._getChartSize();
                var margin = {
                        top: 20,
                        right: 50,
                        bottom: 30,
                        left: 50
                    },
                    width = size.width - margin.left - margin.right,
                    height = size.height - margin.top - margin.bottom;

                data.forEach(function (obj) {
                    var c = 0;
                    for (var s in obj) {
                        c++;
                    }
                    if (columnCount < c) columnCount = c;
                });

                var x = d3.scale.ordinal()
                    .rangeRoundBands([0, (width / 8) * 6], .1);

                var y = d3.scale.linear()
                    .rangeRound([height, 0]);

                color = this._getColors(columnCount);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left")
                //.tickFormat(d3.format(".2s"));

                svg = d3.select(chartDivNode).append("svg")
                    .attr("width", size.width)
                    .attr("height", size.height)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                color.domain(d3.keys(data[0]).filter(function (key) {
                    return key !== fieldX;
                })); // !!!!!!!!!!!

                data.forEach(function (d) {
                    var y0 = 0;
                    d.ages = color.domain().map(function (name) {
                        return {
                            name: name,
                            y0: y0,
                            y1: y0 += +d[name]
                        };
                    });
                    d.total = d.ages[d.ages.length - 1].y1;
                });

                //data.sort(function(a, b) { return b.total - a.total; });

                x.domain(data.map(function (d) {
                    return d[fieldX];
                }));
                y.domain([0, d3.max(data, function (d) {
                    return d.total;
                })]);

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text(labelY);

                param = svg.selectAll("." + fieldX)
                    .data(data)
                    .enter().append("g")
                    .attr("class", "g")
                    .attr("transform", function (d) {
                        return "translate(" + x(d[fieldX]) + ",0)";
                    });

                param.selectAll("rect")
                    .data(function (d) {
                        return d.ages;
                    })
                    .enter().append("rect")
                    .attr("width", x.rangeBand())
                    .attr("y", function (d) {
                        return y(d.y1);
                    })
                    .attr("height", function (d) {
                        return y(d.y0) - y(d.y1);
                    })
                    .style("fill", function (d) {
                        return color(d.name);
                    })
                    .append("title").text(function (d) {
                        return d.name + ":" + d.y1;
                    }); // tooltip

                //param.append("title").text(function(d) { return (x(d[fieldX])+ "/" + d.total); });

                legend = svg.selectAll(".legend")
                    .data(color.domain().slice().reverse())
                    .enter().append("g")
                    .attr("class", "legend")
                    .attr("transform", function (d, i) {
                        return "translate(0," + i * 20 + ")";
                    });

                legend.append("rect")
                    .attr("x", width - 18)
                    .attr('y', function (d, i) {
                        return (columnCount > 30 ? -(i * 7) : 9);
                    })
                    .attr("width", 20)
                    .attr("height", 12)
                    .style("fill", color);

                legend.append("text")
                    .attr("x", width - 24)
                    .attr('y', function (d, i) {
                        return (columnCount > 30 ? -(i * 7) : 15);
                    })
                    .attr("dy", function () {
                        return (columnCount > 30 ? ".70em" : ".35em")
                    })
                    .style("text-anchor", "end")
                    .text(function (d) {
                        return d;
                    });

                d3.select(chartDivNode).style("height", (height + margin.top + margin.bottom) + "px")
                    .style("width", (width + margin.left + margin.right) + "px");

                return chartDivNode;
            },

            /*
             *** PARAMS ***
             data:Array = Array che contiene gli Object contenenti i valori del grafico. ES: [{"valore_x":10,"valore_y1":11,"valore_y2":115},{"valore_x":20,"valore_y1":21,,"valore_y2":211}]
             fieldX:String = Nome dell'attributo dell'Object contenuto in "data" che contiene il NOME del valore dellasse X. ES: "valore_x"
             labelY:String = Etichetta visualizzata sull'asse Y
             timeStyle:Boolean = Stabilisce se i valori devono essere rappresentati come tempo. Il default è false.
             smoothingLines:Boolean = Stabilisce deve disegnare le linee con gli angoli smussati. Il default è true.
             **************
             PS: tutti gli altri valori vengono letti in automatico ES: fieldY = "valore_y1", "valore_y2"
             */
            createLineChart: function (datas, fieldX, labelY, timeStyle, smoothingLines) {

                var chartDivNode = domConstruct.toDom("<div id='createChart_line'></div>");

                if (!datas || !fieldX) return;
                //if(!dialog)dialog=true;
                if (timeStyle == null) timeStyle = false;
                if (smoothingLines == null) smoothingLines = true;
                var that = this;

                datas.sort(function (a, b) {
                    return a[fieldX] - b[fieldX]
                });

                var line, svg, cities, xValues;

                var size = that._getChartSize();
                var margin = {
                        top: 20,
                        right: 50,
                        bottom: 30,
                        left: 50
                    },
                    width = size.width - margin.left - margin.right,
                    height = size.height - margin.top - margin.bottom;

                var parseDate = d3.time.format("%Y%m%d").parse;

                var x;
                if (timeStyle) {
                    x = d3.time.scale()
                        .range([0, width]);
                } else {
                    x = d3.scale.linear()
                        .range([0, width]);
                }
                var y = d3.scale.linear()
                    .range([height, 0]);

                var columnCount = 0;
                for (var s in datas[0]) {
                    columnCount++;
                }

                var color = that._getColors(columnCount);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                var line = d3.svg.line()
                    //.interpolate("basis")
                    .x(function (d) {
                        return x(d.valx);
                    })
                    .y(function (d) {
                        return y(d.valy);
                    });

                if (smoothingLines == true)
                    line.interpolate("basis");

                var svg = d3.select(chartDivNode).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                color.domain(d3.keys(datas[0]).filter(function (key) {
                    return key !== fieldX;
                }));
                var newdata = [];
                if (timeStyle) {
                    datas.forEach(function (d) {
                        var dt = parseDate(d[fieldX]);
                        d[fieldX] = dt;
                    });
                }

                xValues = color.domain().map(function (name) {
                    return {
                        name: name,
                        values: datas.map(function (d) {
                            return {
                                valx: d[fieldX],
                                valy: +d[name]
                            };
                        })
                    };
                });

                x.domain(d3.extent(datas, function (d) {
                    return d[fieldX];
                }));

                y.domain([
                    d3.min(xValues, function (c) {
                        return d3.min(c.values, function (v) {
                            return v.valy;
                        });
                    }),
                    d3.max(xValues, function (c) {
                        return d3.max(c.values, function (v) {
                            return v.valy;
                        });
                    })
                ]);

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text(labelY);

                var city = svg.selectAll(".city")
                    .data(xValues)
                    .enter().append("g")
                    .attr("class", "city");

                city.append("path")
                    .attr("class", "line")
                    .attr("d", function (d) {
                        return line(d.values);
                    })
                    .style("stroke", function (d) {
                        return color(d.name);
                    });
                /*
                 city.append("text")
                 .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
                 .attr("transform", function(d) { return "translate(" + x(d.value.valx) + "," + y(d.value.valy) + ")"; })
                 .attr("x", 3)
                 .attr("dy", ".35em")
                 .text(function(d) { return d.name; });
                 */

                var bisectDate = d3.bisector(function (d) {
                        return d.valx;
                    }).left,
                    formatCurrency = function (d) {
                        return "$" + formatValue(d);
                    };

                var focuss = [];
                for (var i = 0; i < xValues.length; i++) {

                    var focus = svg.append("g")
                        .style("display", "none");

                    focus.append("circle")
                        .style("fill", "none")
                        .style("stroke-width", "2px")
                        .style("stroke", color(xValues[i].name))
                        .attr("r", 4.5);

                    focus.append("text")
                        .attr("x", 9)
                        .attr("dy", ".35em");

                    focuss.push(focus);
                }
                ;

                svg.append("rect")
                    .attr("width", width)
                    .attr("height", height)
                    .style("fill", "none")
                    .style("pointer-events", "all")
                    .on("mouseover", function () {
                        for (var n = 0; n < xValues.length; n++) {
                            focuss[n].style("display", null);
                        }
                    })
                    .on("mouseout", function () {
                        for (var n = 0; n < xValues.length; n++) {
                            focuss[n].style("display", "none");
                        }
                    })
                    .on("mousemove", function () {
                        for (var n = 0; n < xValues.length; n++) {
                            var x0 = x.invert(d3.mouse(this)[0]);
                            i = bisectDate(xValues[n].values, x0, 1),
                                d0 = xValues[n].values[i - 1],
                                d1 = xValues[n].values[i],
                                d = x0 - d0.valx > d1.valx - x0 ? d1 : d0;
                            focuss[n].attr("transform", "translate(" + x(d.valx) + "," + y(d.valy) + ")");
                            focuss[n].select("text").text(d.valy);
                        }
                    });

                legend = svg.selectAll(".legend")
                    .data(color.domain().slice().reverse())
                    .enter().append("g")
                    .attr("class", "legend")
                    .attr("transform", function (d, i) {
                        return "translate(0," + i * 20 + ")";
                    });

                legend.append("rect")
                    .attr("x", width - 18)
                    .attr('y', function (d, i) {
                        return (columnCount > 30 ? -(i * 8) : 9);
                    })
                    .attr("width", 20)
                    .attr("height", 4)
                    .style("fill", color);

                legend.append("text")
                    .attr("x", width - 24)
                    .attr('y', function (d, i) {
                        return (columnCount > 30 ? -(i * 8) : 11);
                    })
                    .attr("dy", function () {
                        return (columnCount > 30 ? ".70em" : ".35em")
                    })
                    .style("text-anchor", "end")
                    .text(function (d) {
                        return d;
                    });

                d3.select(chartDivNode).style("height", (height + margin.top + margin.bottom) + "px")
                    .style("width", (width + margin.left + margin.right) + "px");

                return chartDivNode;

            },

            /*
             *** PARAMS ***
             data:Array = Array che contiene gli Object contenenti i valori del grafico. ES: [{"date_0":123456789},{"date_1":123456789}]
             year:Number = Anno con cui filtrare l'array di dati "data"
             labelX:String
             labelY:String
             smoothingLines:Boolean = Stabilisce deve disegnare le linee con gli angoli smussati. Il default è true.
             */
            createLineChartTime: function (data, year, labelX, labelY, smoothingLines) {
                if (!data) return;
                //if(!dialog)dialog=true;
                if (!labelY) labelY = nlsStrings.LABEL_TIME || "Time";
                if (!labelX) labelX = "values";
                if (!year) year = "all";
                var that = this;

                var datas = [];
                var datao = {};

                data.forEach(function (d) {
                    if (year == "all" || year == d.getFullYear()) {
                        var m = (d.getMonth() + 1).toString();
                        var day = d.getDate().toString();
                        var sdate =
                            d.getFullYear().toString() + (m.length == 1 ? "0" + m : m) + (day.length == 1 ? "0" + day : day);
                        var stime = Number(d.getHours() + "." + d.getMinutes())
                        if (!datao[sdate]) {
                            datao[sdate] = {};
                        }
                        //datao[sdate][dataAttributePath] = stime;
                        datao[sdate][labelX] = stime;
                    }
                });

                for (var o in datao) {
                    var obj = {};
                    obj["date"] = o;
                    for (s in datao[o]) {
                        obj[s] = datao[o][s];
                    }
                    datas.push(obj);
                }

                return that.createLineChart(datas, "date", labelY, true, smoothingLines);
            },

            /*
             *** PARAMS ***
             data:Array = Array che contiene gli Object contenenti i valori del grafico. ES: [{"date_0":123456789},{"date_1":123456789}]
             years:Array = Anno con cui filtrare l'array di dati "data"
             labelX:String
             labelY:String
             */
            createCalendarViewDay: function (data, years, fieldValue, firstZero) {
                if (!data) return;
                if (!fieldValue) fieldValue = "values";
                if (!years) years = ["all"];
                var that = this;
                var fieldNameData = "Date";
                if (firstZero == null) firstZero = false;

                var datas = that._getOccurrencesForDate(data, years, fieldNameData, [fieldValue], firstZero);

                return that.createCalendarView(datas.data, fieldNameData, fieldValue, datas.years);
            },

            /*
             *** PARAMS ***
             data:Array = Array che contiene gli Object contenenti i valori del grafico. ES: [{"date_0":123456789},{"date_1":123456789}]
             years:Array = Anni con cui filtrare l'array di dati "data", array null=tutti gli anni
             labelX:String o Array di String
             labelY:String
             smoothingLines:Boolean = Stabilisce deve disegnare le linee con gli angoli smussati. Il default è true.
             */
            createLineChartDay: function (data, years, labelX, labelY, smoothingLines, firstZero) {
                if (!data) return;
                //if(!dialog)dialog=true;
                if (!labelY) labelY = nlsStrings.LABEL_DAY || "Day";
                if (!years) years = ["all"];
                var that = this;
                var fieldNameData = "Date";
                if (!(labelX.constructor === Array)) {
                    labelX = [labelX];
                }
                
                if (firstZero == null) firstZero = false;

                var datas = that._getOccurrencesForDate(data, years, fieldNameData, labelX, firstZero).data;

                return that.createLineChart(datas, fieldNameData, labelY, true, smoothingLines);
            },

            /*
             *** PARAMS ***
             data:Array = Array di Object contenente i valori del grafico. ES: [{"citta":"roma","valore":10},{"citta":"milano","valore":11}]
             fieldName:String = Nome dell'attributo dell'Object contenuto in "data" che contiene il NOME del valore da analizzare. ES: "citta"
             fieldValue:String = Nome dell'attributo dell'Object contenuto in "data" che contiene il VALORE da analizzare. ES: "valore"
             donutStyle:Boolean = Stabilisce se il grafico è di tipo ciambella/torta. Il default è false(torta).
             */
            createPieChart: function (data, fieldName, fieldValue, donutStyle) {
                var chartDivNode = domConstruct.toDom("<div id='createChart_pie'></div>");

                if (!fieldValue || !fieldName || !data || !data.length || data.length == 0) return;
                if (!donutStyle) donutStyle = false;

                var that = this;
                var size = this._getChartSize();
                var width = size.width;
                var height = size.height;
                var radius = Math.min(width, height) / 2.1;
                var g, color, arc, pie, svg;

                color = this._getColors(data.length);

                var columnCount = data.length;

                var label = fieldValue;
                arc = d3.svg.arc()
                    .outerRadius(radius - 10);
                if (donutStyle) {
                    arc.innerRadius(radius - 150);
                    // label = fieldValue; 
                } else {
                    arc.innerRadius(0);
                    //label = fieldName;
                }

                pie = d3.layout.pie()
                    .sort(null)
                    .value(function (d) {
                        return d[fieldValue];
                    });

                svg = d3.select(chartDivNode).append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

                g = svg.selectAll(".arc")
                    .data(pie(data))
                    .enter().append("g")
                    .attr("class", "arc");

                g.append("path")
                    .attr("d", arc)
                    .style("fill", function (d) {
                        return color(d.data[fieldName]);
                    });

                g.append("text")
                    .attr("transform", function (d) {
                        var c = arc.centroid(d),
                            x = c[0],
                            y = c[1],
                        // pythagorean theorem for hypotenuse
                            h = Math.sqrt(x * x + y * y);
                        return "translate(" + (x / h * radius) + ',' + (y / h * radius) + ")";
                    })
                    .attr("text-anchor", function (d) {
                        // are we past the center?
                        return (d.endAngle + d.startAngle) / 2 > Math.PI ?
                            "end" : "start";
                    })
                    .attr("dy", ".35em")
                    .attr("font-size", ".8em")
                    .text(function (d) {
                        return d.data[label];
                    });

                //if (donutStyle) {

                var legendRectSize = 18;
                var legendSpacing = 4;
                var legend = svg.selectAll('.legend')
                    .data(color.domain())
                    .enter()
                    .append('g')
                    .attr('class', 'legend')
                    .attr('transform', function (d, i) {
                        var lheight = legendRectSize + legendSpacing;
                        var offset = lheight * color.domain().length / 2;
                        //var horz = -2 * legendRectSize;					
                        //var vert = i * lheight - offset;
                        var horz = -1 * (width / 2) + 10;
                        var vert = (i * lheight) - (height / 2 - lheight * 2);
                        return 'translate(' + horz + ',' + vert + ')';
                    });

                legend.append('rect')
                    .attr('width', legendRectSize)
                    .attr('height', legendRectSize)
                    .style('fill', color)
                    .style('stroke', color);

                legend.append('text')
                    .attr('x', legendRectSize + legendSpacing)
                    .attr('y', legendRectSize - legendSpacing)
                    .text(function (d) {
                        return d.toUpperCase();
                    });

                //}
                d3.select(chartDivNode).style("height", height + "px")
                    .style("width", width + "px");

                return chartDivNode;
            },
            /*
             *** PARAMS ***
             data:Array = Array che contiene gli Object contenenti i valori del grafico. ES: [{"valore_x":10,"valore_y1":11,"valore_y2":115},{"valore_x":20,"valore_y1":21,,"valore_y2":211}]
             fieldX:String = Nome dell'attributo dell'Object contenuto in "data" che contiene il NOME del valore dellasse X. ES: "valore_x"
             labelY:String = Etichetta visualizzata sull'asse Y
             timeStyle:Boolean = Stabilisce se i valori devono essere rappresentati come tempo. Il default è false.
             **************
             PS: tutti gli altri valori vengono letti in automatico ES: fieldY = "valore_y1", "valore_y2"
             */
            createCalendarView: function (data, fieldDate, fieldValue, years) {
                var chartDivNode = domConstruct.toDom("<div id='createChart_calendarView'></div>");

                if (!data) return;

                if (!fieldDate) labelX = "Data";
                if (!fieldValue) labelX = "Values";
                var that = this;
                var svg, rect;
                /*			
                 var margin = {top: 20, right: 80, bottom: 30, left: 50},
                 width = that._getChartSize().width - margin.left - margin.right,
                 height = that._getChartSize().height - margin.top - margin.bottom;
                 var cellSize = 17; // cell size
                 */
                var width = 960,
                    height = 136,
                    cellSize = 17; // cell size			
                var maxValue = 0;
                data.forEach(function (d) {
                    if (maxValue < d[fieldValue]) {
                        maxValue = d[fieldValue];
                    }
                });

                var day = d3.time.format("%w"),
                    week = d3.time.format("%U"),
                    format = d3.time.format("%Y%m%d");

                var color = d3.scale.quantize()
                    .domain([0, maxValue])
                    .range(d3.range(11).map(function (d) {
                        return "q" + d + "-11";
                    }));

                svg = d3.select(chartDivNode).selectAll("svg")
                    .data(d3.range(years[0], years[years.length - 1] + 1))
                    .enter().append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("class", "RdYlGn")
                    .append("g")
                    .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");
                //.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                svg.append("text")
                    .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
                    .style("text-anchor", "middle")
                    .text(function (d) {
                        return d;
                    });

                rect = svg.selectAll(".day")
                    .data(function (d) {
                        return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1));
                    })
                    .enter().append("rect")
                    .attr("class", "day")
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .attr("x", function (d) {
                        return week(d) * cellSize;
                    })
                    .attr("y", function (d) {
                        return day(d) * cellSize;
                    })
                    .datum(format);

                rect.append("title")
                    .text(function (d) {
                        return d;
                    });

                svg.selectAll(".month")
                    .data(function (d) {
                        return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1));
                    })
                    .enter().append("path")
                    .attr("class", "month")
                    .attr("d", _monthPath);

                //d3.csv("dji.csv", function(error, csv) {
                var mydata = d3.nest()
                    .key(function (d) {
                        return d[fieldDate];
                    })
                    .rollup(function (d) {
                        return d[0][fieldValue];
                    })
                    .map(data);

                rect.filter(function (d) {
                    return d in mydata;
                })
                    .attr("class",
                    function (d) {
                        return "day " + color(mydata[d]);
                    })
                    .select("title")
                    .text(function (d) {
                        return d + ": " + mydata[d];
                    });

                d3.select(chartDivNode).style("height", that._getChartSize().height + "px")
                    .style("width", that._getChartSize().width + "px");

                return chartDivNode;

                function _monthPath(t0) {
                    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                        d0 = +day(t0),
                        w0 = +week(t0),
                        d1 = +day(t1),
                        w1 = +week(t1);
                    return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize + "H" + w0 * cellSize + "V" + 7 * cellSize + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize + "H" + (w1 + 1) * cellSize + "V" + 0 + "H" + (w0 + 1) * cellSize + "Z";
                }
            }
        });

        return new classObj();
    });