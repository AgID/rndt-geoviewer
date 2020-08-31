<?php

$file_name = "huge_document.pdf";
$content_type = "application/pdf";

function forceDownload($file_name, $content_type)
{
    header("Content-disposition: attachment; filename={$file_name}");
    header("Content-type: {$content_type}");
    readfile("{$file_name}");
    exit;
}

function getToken($username = "gest_sa", $password = "testtest1!", $expiration = 60)
{
    $url = sprintf("https://geoportale.comune.milano.it/arcgis/tokens/?username=%s&password=%s&expiration=%d", $username, $password, $expiration);

    return file_get_contents($url);
}

$jData = json_decode(stripcslashes($_REQUEST["jData"]));
$queryParameter = (array) $jData->queryParameter;

// Overwrite token, just to be safe
$token = getToken();
$queryParameter["token"] = $token;
$queryParameter["outFields"] = $jData->files[0]->outFields;



//$map_server = "https://geoportale.comune.milano.it/arcgis/rest/services/OperationalLayers/AggressioniDonne/MapServer";
$map_server = $jData->files[0]->url;
$layer_id = 0;

$query_url = sprintf("%s/%d/query?%s", $map_server, $layer_id, http_build_query($queryParameter));

$json = file_get_contents($query_url);

?>
<pre>
    <?php print_r(json_decode($json)); ?>
</pre>
