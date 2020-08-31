define([
        'dojo/_base/declare'
    ],
    function (declare) {

        var ClassObj = declare(null, {

            queryWhereInIds: function ( idFieldName, ids)
            {
                var maxLength = 1000;
                var queryWhere = "";
                var OR = "";
                while ( ids.length > 0)
                {
                    queryWhere += OR + idFieldName + " IN(" + ids.slice(0, maxLength).join(",") +")";
                    OR = " OR ";
                    ids = ids.slice(maxLength);
                }
                return queryWhere;
            }
        });

        return new ClassObj();
    });
