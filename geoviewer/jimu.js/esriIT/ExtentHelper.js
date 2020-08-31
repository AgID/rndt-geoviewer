define([
        'dojo/_base/declare',
        'dojo/_base/array',
        "esri/geometry/geometryEngine",
        "esri/geometry/Point",
        'esri/geometry/Extent'
    ],
    function(declare, array, GeometryEngine, Point, Extent){

        var ClassObj = declare(null,{


            getUnitedExtent: function( geometries ){
                var key, geometry, geometriesByType = {};
                for (key in geometries) {
                    if ( geometries.hasOwnProperty(key) ){
                        geometry = geometries[key];
                        if ( geometry && geometry.type ){
                            geometriesByType[geometry.type] = geometriesByType[geometry.type] || [];
                            geometriesByType[geometry.type].push(geometry);
                        }
                    }
                }

                var i, geometriesUnitedByType = [];
                for( i in geometriesByType ){
                    if (geometriesByType.hasOwnProperty(i)){
                        geometriesUnitedByType.push( GeometryEngine.union( geometriesByType[i] ) );//All inputs must be of the same type of geometries and share one spatial reference.
                    }
                }

                var finalExtension;
                array.forEach(geometriesUnitedByType, function(geometry){

                    var extent;
                    if ( geometry instanceof Point )//There is no way to get the extent on a point geometry
                    {
                        var pt = geometry;
                        var factor = 1;
                        extent = new Extent(pt.x - factor, pt.y - factor, pt.x + factor, pt.y + factor, pt.spatialReference);
                    }
                    else{
                        extent = geometry.getExtent();
                    }

                    finalExtension = finalExtension || extent;//primo ciclo
                    finalExtension = finalExtension.union( extent );
                });


                return finalExtension;
            }


        });

        return new ClassObj();

    });
